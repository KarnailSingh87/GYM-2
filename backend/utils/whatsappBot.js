import {
  makeWASocket,
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import fs from 'fs';
import path from 'path';
import P from 'pino';
import qrcode from 'qrcode-terminal';
import WAState from '../models/WAState.js';
import WALog from '../models/WALog.js';

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
async function logWAEvent(event, message) {
  try {
    await WALog.create({ event, message });
  } catch (_) { /* non-blocking */ }
}

// ─────────────────────────────────────────────
//  Module-level state
// ─────────────────────────────────────────────
let sock = null;
let isInitializing = false;
let waState = { status: 'INITIALIZING', qr: null, user: null, pairingCode: null };

/** Timestamp (ms) of the last time we entered INITIALIZING state, used by the watchdog */
let initStartedAt = null;

const SESSION_ID = process.env.WA_SESSION_ID || 'rfc_gym_session';

// Reconnection management
const MAX_RECONNECT_ATTEMPTS = 99999; // effectively infinite
let reconnectAttempts = 0;
let reconnectTimer = null;

// ─────────────────────────────────────────────
//  Public: status
// ─────────────────────────────────────────────
export function getWhatsAppStatus() {
  const isActuallyConnected = !!(sock?.user && waState.status === 'CONNECTED');
  return {
    ...waState,
    connected: isActuallyConnected,
    initStartedAt
  };
}

// ─────────────────────────────────────────────
//  Internal: clean up a socket without server-side logout
// ─────────────────────────────────────────────
function destroySocket() {
  if (!sock) return;
  const old = sock;
  sock = null;
  try {
    old.ev.removeAllListeners('connection.update');
    old.ev.removeAllListeners('creds.update');
    old.end(new Boom('Socket replaced', { statusCode: DisconnectReason.connectionClosed }));
  } catch (e) {
    console.log('[WA] Socket cleanup (non-critical):', e.message);
  }
}

// ─────────────────────────────────────────────
//  Public: full logout + fresh QR
// ─────────────────────────────────────────────
export async function logoutWhatsApp() {
  try {
    if (sock) {
      const old = sock;
      sock = null;
      try {
        await old.logout();
      } catch (e) {
        try {
          old.ev.removeAllListeners('connection.update');
          old.ev.removeAllListeners('creds.update');
          old.end(new Boom('Force close', { statusCode: DisconnectReason.loggedOut }));
        } catch (_) {}
        console.log('[WA] Logout skipped (already disconnected):', e.message);
      }
    }

    // Reset all state
    isInitializing = false;
    reconnectAttempts = 0;
    initStartedAt = null;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    waState = { status: 'DISCONNECTED', qr: null, user: null };

    // Remove cloud session so old creds don't restore
    try {
      await WAState.deleteOne({ id: SESSION_ID });
      console.log('☁️ [Logout] Cloud session removed.');
    } catch (e) {
      console.error('[Logout] Failed to remove MongoDB session:', e.message);
    }

    // Wipe local session files
    const sessionsDir = path.resolve(process.cwd(), 'sessions', SESSION_ID);
    if (fs.existsSync(sessionsDir)) {
      try { fs.rmSync(sessionsDir, { recursive: true, force: true }); } catch (_) {}
    }

    // Immediately show INITIALIZING in the UI, then spin up a fresh QR
    waState = { status: 'INITIALIZING', qr: null, user: null };
    initStartedAt = Date.now();
    setTimeout(() => initWhatsApp(SESSION_ID, true), 1500);

    return true;
  } catch (err) {
    console.error('[WA] Critical logout error:', err);
    return true; // Always unblock the UI
  }
}

// ─────────────────────────────────────────────
//  Schedules a reconnect with exponential back-off + jitter
// ─────────────────────────────────────────────
function scheduleReconnect(sessionId) {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

  reconnectAttempts++;
  if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
    console.error(`[WA] ❌ Max reconnect attempts exceeded.`);
    waState = { status: 'DISCONNECTED', qr: null, user: null };
    reconnectAttempts = 0;
    return;
  }

  // Cap at 30 s + up to 5 s jitter so parallel reconnects de-sync
  const base = Math.min(2000 * Math.pow(2, Math.min(reconnectAttempts - 1, 5)), 30000);
  const delay = base + Math.random() * 5000;
  console.log(`🔄 [WA] Reconnecting in ${(delay / 1000).toFixed(1)}s (attempt ${reconnectAttempts})…`);

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    initWhatsApp(sessionId);
  }, delay);
}

// ─────────────────────────────────────────────
//  Core: init / reconnect
// ─────────────────────────────────────────────
export async function initWhatsApp(sessionId = SESSION_ID, force = false) {
  // ── Guard: avoid duplicate concurrent inits ──
  if (force) {
    destroySocket();
    isInitializing = false;
    reconnectAttempts = 0;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

    // Wipe local session on forced restart
    const dir = path.resolve(process.cwd(), 'sessions', sessionId);
    if (fs.existsSync(dir)) {
      try { fs.rmSync(dir, { recursive: true, force: true }); console.log('🧹 [WA] Session files wiped.'); } catch (_) {}
    }
    // Wipe cloud session so it can't restore stale creds
    try { await WAState.deleteOne({ id: sessionId }); console.log('☁️ [WA] Cloud session cleared.'); } catch (_) {}
  }

  if (sock?.user && !force) return sock;   // Already connected, nothing to do
  if (isInitializing && !force) return null;  // Already starting up

  isInitializing = true;
  initStartedAt = Date.now();
  waState = { status: 'INITIALIZING', qr: null, user: null };

  const sessionsDir = path.resolve(process.cwd(), 'sessions', sessionId);
  if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });

  const credsFile = path.join(sessionsDir, 'creds.json');

  // Restore credentials from MongoDB if missing locally (cloud deployment)
  if (!fs.existsSync(credsFile) && !force) {
    try {
      const saved = await WAState.findOne({ id: sessionId });
      if (saved) {
        console.log('☁️ [WA] Restoring session from MongoDB…');
        fs.writeFileSync(credsFile, saved.data);
      }
    } catch (err) {
      console.error('[WA] Failed to restore from MongoDB:', err.message);
    }
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);
    const { version } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307] }));
    const logger = P({ level: 'silent' }); // Suppress noisy baileys logs

    sock = makeWASocket({
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      },
      logger,
      version,
      printQRInTerminal: false,   // We QR via API, not terminal
      browser: ['RFC Gym Bot', 'Chrome', '124.0.0'],
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      keepAliveIntervalMs: 10_000,  // Ping WA servers every 10s to prevent drops
      retryRequestDelayMs: 250,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 0,    // No timeout for queries (messages, etc.)
    });

    // Capture reference for closure safety
    const thisSock = sock;

    // ── Connection lifecycle ──
    thisSock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        // Show QR in terminal for development convenience
        qrcode.generate(qr, { small: true });
        waState = { ...waState, status: 'QR_READY', qr };
        console.log('📱 [WA] QR code ready — scan with WhatsApp!');
      }

      if (connection === 'close') {
        // Ignore events from replaced (stale) sockets
        if (thisSock !== sock && sock !== null) return;

        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const isLoggedOut = statusCode === DisconnectReason.loggedOut;
        const shouldReconnect = !isLoggedOut;

        console.log(`🔌 [WA] Connection closed. Code: ${statusCode}, Reconnect: ${shouldReconnect}`);
        logWAEvent('DISCONNECTED', `Code: ${statusCode}`);

        isInitializing = false;

        if (shouldReconnect) {
          waState = { status: 'RECONNECTING', qr: null, user: null };
          scheduleReconnect(sessionId);
        } else {
          // Logged out — stop reconnecting until user scans QR again
          // BUG FIX: Sometimes Baileys reports 'loggedOut' (401) due to stale keys on ephemeral storage (Render).
          // If this happens, we try ONE forced restart to see if we can restore from the cloud (MongoDB)
          // before completely giving up.
          if (reconnectAttempts < 3) {
             console.warn('🚪 [WA] Logged out detected. Attempting ONE clean restart to check cloud session persistence…');
             reconnectAttempts++;
             setTimeout(() => initWhatsApp(sessionId, true), 5000); 
          } else {
            waState = { status: 'DISCONNECTED', qr: null, user: null };
            reconnectAttempts = 0;
            console.log('🚪 [WA] Logged out from WhatsApp. Scan QR to reconnect.');
          }
        }
      }

      if (connection === 'open') {
        waState = { status: 'CONNECTED', qr: null, user: thisSock.user };
        isInitializing = false;
        initStartedAt = null;
        reconnectAttempts = 0;
        console.log('✅ [WA] Connected! User:', thisSock.user?.id);
        logWAEvent('CONNECTED', `User: ${thisSock.user?.id}`);
      }
    });

    // ── Persist credentials on every update ──
    thisSock.ev.on('creds.update', async () => {
      await saveCreds();
      // Cloud sync: push to MongoDB so Render restarts restore the session
      try {
        if (fs.existsSync(credsFile)) {
          const data = fs.readFileSync(credsFile, 'utf-8');
          await WAState.findOneAndUpdate(
            { id: sessionId },
            { data },
            { upsert: true }
          );
        }
      } catch (err) {
        console.error('❌ [WA] Creds cloud sync failed:', err.message);
      }
    });

    return thisSock;
  } catch (err) {
    console.error('❌ [WA] initWhatsApp error:', err.message);
    isInitializing = false;
    waState = { status: 'DISCONNECTED', qr: null, user: null };

    // Auto-retry after a short delay so a transient error doesn't kill connectivity
    scheduleReconnect(sessionId);
    return null;
  }
}

// ─────────────────────────────────────────────
//  Internal: format phone number for Baileys JID
// ─────────────────────────────────────────────
function formatPhoneForBaileys(phone) {
  let cleaned = phone.replace(/[^0-9]/g, '');

  // Remove leading STD zero (e.g. 09876543210 → 9876543210)
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // Remove double country code (e.g. 91919876543210 → 919876543210)
  if (cleaned.startsWith('9191')) {
    cleaned = cleaned.substring(2);
  }

  // Already includes India country code
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned;
  }

  // Straight 10-digit Indian number — prepend 91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }

  return cleaned;
}

// ─────────────────────────────────────────────
//  Public: send a text message
// ─────────────────────────────────────────────
export async function sendText(phone, text) {
  console.log(`📤 [WA] Sending to ${phone}…`);
  try {
    // If not connected, trigger init and wait up to 45 s
    if (!sock?.user) {
      console.log('[WA] Not connected — initializing…');
      initWhatsApp(SESSION_ID).catch(() => {});

      let waited = 0;
      while (!sock?.user && waited < 45) {
        await new Promise(r => setTimeout(r, 1000));
        waited++;
      }
    }

    if (!sock?.user) {
      console.error('❌ [WA] Connection unavailable after 45s wait.');
      throw new Error('WhatsApp not connected');
    }

    // Capture current socket to prevent stale-socket race
    const activeSock = sock;
    if (!activeSock?.user) throw new Error('Socket became unavailable immediately before send');

    const jid = formatPhoneForBaileys(phone) + '@s.whatsapp.net';
    console.log(`🔗 [WA] JID: ${jid}`);
    await activeSock.sendMessage(jid, { text });
    console.log(`✅ [WA] Delivered → ${jid}`);
    return true;
  } catch (err) {
    console.error('❌ [WA] sendText error:', err.message);
    return false;
  }
}

// ─────────────────────────────────────────────
//  Public: send welcome message on member registration
// ─────────────────────────────────────────────
export async function sendWelcome(phone, { name, joinDate, expiryDate, timeSlot, paymentStatus, amountReceived, address, customMessage }) {
  const start = new Date(joinDate).toLocaleDateString('en-IN');
  const end   = new Date(expiryDate).toLocaleDateString('en-IN');

  let paymentText = '';
  if (paymentStatus === 'online') paymentText = 'Online Payment Received ✅';
  else if (paymentStatus === 'cash') paymentText = 'Cash Payment Received ✅';
  else paymentText = 'Payment Pending ⌛';

  const customNote = customMessage ? `\n\n📝 *Note from RFC Gym:* ${customMessage}` : '';

  const text = `🔥 *WELCOME TO RFC GYM* 🔥\n\nHello *${name}*,\n\nWelcome to the family! Your registration is complete. Here are your details:\n\n*Address:* ${address || 'Not Provided'}\n*Joining Date:* ${start}\n*Expiry Date:* ${end}\n*Time Slot:* ${timeSlot || 'Anytime'}\n*Payment Status:* ${paymentText}${customNote}\n\nWe are excited to see you crush your goals at *RFC Gym*! 💪\n\n_Stay Fit, Stay Strong!_`;
  return sendText(phone, text);
}

// ─────────────────────────────────────────────
//  Public: send payment receipt
// ─────────────────────────────────────────────
export async function sendPaymentReceipt(phone, { name, amountReceived, paymentMethod, expiryDate }){
  const end = new Date(expiryDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  const method = paymentMethod === 'online' ? 'Online/UPI' : 'Cash';
  const text = `🎉 *PAYMENT RECEIVED* 🎉\n\nHi *${name}*,\n\nThank you for your payment! We have successfully received *₹${amountReceived}* via ${method}.\n\nYour membership is currently active and will expire on *${end}*.\n\nKeep up the great work at *RFC Gym*! 💪🔥`;
  return sendText(phone, text);
}

// ─────────────────────────────────────────────
//  Public: send payment reminder
// ─────────────────────────────────────────────
export async function sendPaymentReminder(phone, { name, amount }){
  const amountText = amount && amount > 0 ? ` of *₹${amount}*` : '';
  const text = `⚠️ *PAYMENT REMINDER* ⚠️\n\nHi *${name}*,\n\nThis is a gentle reminder that your gym fee${amountText} is currently pending.\n\nPlease clear your dues at your earliest convenience to enjoy uninterrupted access to *RFC Gym*.\n\nIf you have already paid, please ignore this message. Thank you! 💪`;
  return sendText(phone, text);
}

// ─────────────────────────────────────────────
//  Public: manually request a pairing code
// ─────────────────────────────────────────────
export async function requestPairingCodeManual(phone) {
  try {
    if (sock?.authState?.creds?.registered) {
      throw new Error('Device already registered. Logout first.');
    }

    if (!sock) {
      await initWhatsApp(SESSION_ID, true);
      await new Promise(r => setTimeout(r, 4000));
    }

    const cleanPhone = phone.replace(/\D/g, '');
    console.log(`📲 [WA] Requesting pairing code for ${cleanPhone}…`);

    const code = await sock.requestPairingCode(cleanPhone);
    waState = { ...waState, status: 'PAIRING_CODE_READY', pairingCode: code };

    logWAEvent('PAIRING_CODE', `Requested for ${cleanPhone}`);
    return { success: true, code };
  } catch (err) {
    console.error('❌ [WA] Pairing code request failed:', err.message);
    logWAEvent('PAIRING_ERROR', err.message);
    return { success: false, message: err.message };
  }
}

/**
 * Public: watchdog — called by cronJobs.js
 * Returns true if it triggered a restart
 */
export async function runWatchdog() {
  const status = getWhatsAppStatus();
  console.log(`🔍 [Watchdog] Status: ${status.status} | Connected: ${status.connected}`);

  // ── Case 1: Already connected ──
  if (status.connected && sock) {
    // Perform a real health-check ping to WhatsApp servers every few minutes via the watchdog
    try {
      // Small query to verify the socket is actually "alive" and not a zombie
      // We use a timeout to avoid hanging the watchdog
      const pingPromise = sock.query({
        tag: 'iq',
        attrs: {
          type: 'get',
          xmlns: 'w:p',
          to: '@s.whatsapp.net',
        },
        content: [{ tag: 'ping', attrs: {} }]
      });

      // If ping doesn't respond in 15s, it's a zombie
      await Promise.race([
        pingPromise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Ping Timeout')), 15000))
      ]);
      
      console.log('✅ [Watchdog] Health-check: Socket is alive.');
      return false;
    } catch (err) {
      console.warn(`⚠️ [Watchdog] Health-check FAILED: ${err.message}. Forcing restart.`);
      initWhatsApp(SESSION_ID, true).catch(e => console.error('[Watchdog] Restart error:', e));
      return true;
    }
  }

  // ── Case 2: Stuck in INITIALIZING for > 3 minutes ──
  if (status.status === 'INITIALIZING' && initStartedAt) {
    const stuckMs = Date.now() - initStartedAt;
    if (stuckMs > 3 * 60 * 1000) {
      console.warn(`⚠️ [Watchdog] Stuck in INITIALIZING for ${Math.round(stuckMs / 1000)}s — forcing restart.`);
      initWhatsApp(SESSION_ID, true).catch(err => console.error('[Watchdog] Force restart error:', err));
      return true;
    }
    return false; // Still within grace period
  }

  // ── Case 3: Disconnected and no reconnect timer running ──
  if ((status.status === 'DISCONNECTED' || status.status === 'RECONNECTING') && !reconnectTimer && !isInitializing) {
    console.warn(`⚠️ [Watchdog] Dead socket detected (${status.status}) with no pending reconnect — restarting.`);
    initWhatsApp(SESSION_ID).catch(err => console.error('[Watchdog] Reconnect error:', err));
    return true;
  }

  return false;
}
