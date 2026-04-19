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
import WAConfig from '../models/WAConfig.js';
import { sendBusinessApiMessage } from './whatsappBusinessApi.js';

async function logWAEvent(event, message) {
  try {
    await WALog.create({ event, message });
  } catch (err) {
    // Non-blocking
  }
}

let sock = null;
let isInitializing = false;
let waState = { status: 'INITIALIZING', qr: null, user: null, pairingCode: null };
const SESSION_ID = process.env.WA_SESSION_ID || 'rfc_gym_session';

// Reconnection management
const MAX_RECONNECT_ATTEMPTS = 10000; // Effectively forever
let reconnectAttempts = 0;
let reconnectTimer = null;

export function getWhatsAppStatus() {
  // If we have a socket but the connection isn't literally 'open', status should be initializing/pending
  const isActuallyConnected = sock?.user && waState.status === 'CONNECTED';
  return {
    ...waState,
    connected: isActuallyConnected
  };
}

/**
 * Safely close and clean up the current socket without sending 
 * a logout message to WhatsApp servers (preserves ability to reconnect).
 */
function destroySocket() {
  if (!sock) return;
  
  const oldSock = sock;
  sock = null; // Clear reference first to prevent stale usage
  
  try {
    // Remove all event listeners to prevent memory leaks and ghost handlers
    oldSock.ev.removeAllListeners('connection.update');
    oldSock.ev.removeAllListeners('creds.update');
    
    // Close the connection with a proper error object
    oldSock.end(new Boom('Socket replaced', { statusCode: DisconnectReason.connectionClosed }));
  } catch (e) {
    // Socket may already be closed
    console.log('Socket cleanup (non-critical):', e.message);
  }
}

export async function logoutWhatsApp() {
  try {
    if (sock) {
      const oldSock = sock;
      sock = null; // Immediately clear to prevent usage during cleanup
      
      try {
        // logout() sends a logout message to WA servers AND internally calls end()
        // so we should NOT call end() separately afterwards
        await oldSock.logout();
      } catch (e) {
        // If logout fails (e.g., already disconnected), just force-close
        try {
          oldSock.ev.removeAllListeners('connection.update');
          oldSock.ev.removeAllListeners('creds.update');
          oldSock.end(new Boom('Force close after logout failure', { 
            statusCode: DisconnectReason.loggedOut 
          }));
        } catch (_) {
          // Already fully closed
        }
        console.log('Socket logout skipped (already disconnected):', e.message);
      }
    }

    // Reset state
    isInitializing = false;
    reconnectAttempts = 0;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    waState = { status: 'DISCONNECTED', qr: null, user: null };

    // CLOUD SYNC: Remove the saved session from MongoDB so it doesn't restore bad credentials
    try {
      await WAState.deleteOne({ id: SESSION_ID });
      console.log('☁️ Removed WhatsApp session from MongoDB.');
    } catch (e) {
      console.error('Failed to remove from Mongo', e);
    }

    const sessionsDir = path.resolve(process.cwd(), 'sessions', SESSION_ID);
    if (fs.existsSync(sessionsDir)) {
      try {
        fs.rmSync(sessionsDir, { recursive: true, force: true });
      } catch (e) {
        console.log('File cleanup delayed, will retry on next init');
      }
    }
    
    // Reset state so UI shows initializing instead of stuck disconnected
    waState = { status: 'INITIALIZING', qr: null, user: null };

    // Auto initiate a completely fresh unlinked session instantly to immediately bring up a QR Code
    setTimeout(() => {
      initWhatsApp(SESSION_ID, true);
    }, 1000);

    return true;
  } catch (err) {
    console.error('Critical Logout error', err);
    return true; // Return true anyway to unblock the UI
  }
}

export async function initWhatsApp(sessionId = SESSION_ID, force = false){
  // If force, clean up old socket properly first
  if (force) {
    destroySocket();
    isInitializing = false;
    reconnectAttempts = 0;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    // CRITICAL: Wipe local session files on force-init to prevent "Could not link device" errors.
    // Pairing codes only work correctly on a completely fresh session.
    const sessionsDir = path.resolve(process.cwd(), 'sessions', sessionId);
    if (fs.existsSync(sessionsDir)) {
      try {
        fs.rmSync(sessionsDir, { recursive: true, force: true });
        console.log('🧹 Session directory wiped for a clean start.');
      } catch (e) {
        console.warn('⚠️ Session wipe in-progress or failed:', e.message);
      }
    }
    
    // ALSO WIPE CLOUD STATE on force-init to prevent polluted credentials
    try {
      await WAState.deleteOne({ id: sessionId });
      console.log('☁️ Cloud session state cleared for a fresh start.');
    } catch (e) {
      // Ignore errors
    }
  }

  // Already connected and not forcing
  if (sock?.user && !isInitializing) return sock;
  // Already initializing and not forcing
  if (isInitializing && !force) return null;
  
  isInitializing = true;
  waState = { status: 'INITIALIZING', qr: null, user: null };
  const sessionsDir = path.resolve(process.cwd(), 'sessions', sessionId);
  if(!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });
  
  const credsFile = path.join(sessionsDir, 'creds.json');
  
  // CLOUD SYNC: Restore from MongoDB if local file is missing (For Render/Deployment)
  // But ONLY if we are not forcing a clean restart.
  if (!fs.existsSync(credsFile) && !force) {
    try {
      const savedState = await WAState.findOne({ id: sessionId });
      if (savedState) {
        console.log('☁️ Restoring WhatsApp session from MongoDB...');
        fs.writeFileSync(credsFile, savedState.data);
      }
    } catch (err) {
      console.error('Failed to restore from Mongo', err);
    }
  }

  try {
    const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);
    const { version } = await fetchLatestBaileysVersion();
    
    const logger = P({ level: 'warn' });
    
    // Check configuration for connection method
    const config = await WAConfig.findOne({ id: 'primary' });
    const connectionMethod = config?.connectionMethod || 'qr';

    sock = makeWASocket({ 
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger)
      }, 
      logger, 
      version,
      printQRInTerminal: false,
      browser: ['Chrome (Linux)', '', ''],
      syncFullHistory: false,
      shouldSyncHistoryMessage: () => false,
      keepAliveIntervalMs: 15_000,
      retryRequestDelayMs: 500,
      connectTimeoutMs: 60_000,
      defaultQueryTimeoutMs: 0, 
    });

    // Automatic Pairing is removed here; we will use a dedicated endpoint instead

    // Store the sessionId in a closure-safe way for this socket instance
    const currentSock = sock;

    currentSock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      
      if(qr) {
        waState = { ...waState, status: 'QR_READY', qr };
      }

      if(connection === 'close'){
        // Only handle if this is still the active socket
        if (currentSock !== sock && sock !== null) {
          return; // This handler is from an old socket; ignore
        }
        
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
          console.log(`🔌 Connection closed. Status: ${statusCode}, Reconnect: ${shouldReconnect}`);
          logWAEvent('DISCONNECTED', `Reason: ${statusCode}, Will Reconnect: ${shouldReconnect}`);
          
          isInitializing = false;
        
        if(shouldReconnect){
          reconnectAttempts++;
          
          if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
            console.error(`❌ Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) exceeded. Giving up.`);
            waState = { status: 'DISCONNECTED', qr: null, user: null };
            reconnectAttempts = 0;
            return;
          }
          
          // Exponential backoff: 2s, 4s, 8s, 16s, 32s + random jitter
          const delay = Math.min(2000 * Math.pow(2, reconnectAttempts - 1), 32000) + (Math.random() * 2000);
          console.log(`🔄 [${SESSION_ID}] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})...`);
          
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            initWhatsApp(sessionId);
          }, delay);
        } else {
          // Logged out — don't auto reconnect
          waState = { status: 'DISCONNECTED', qr: null, user: null };
          reconnectAttempts = 0;
        }
      }
      
      if(connection === 'open'){
        waState = { status: 'CONNECTED', qr: null, user: currentSock.user };
        isInitializing = false;
        reconnectAttempts = 0; // Reset on successful connection
        console.log('✅ WhatsApp connected successfully!');
        logWAEvent('CONNECTED', `User: ${currentSock.user.id}`);
      }
    });

    currentSock.ev.on('creds.update', async () => {
      await saveCreds();
      // CLOUD SYNC: Save to MongoDB for persistence
      try {
        if (fs.existsSync(credsFile)) {
          const credsData = fs.readFileSync(credsFile, 'utf-8');
          await WAState.findOneAndUpdate(
            { id: sessionId },
            { data: credsData },
            { upsert: true }
          );
          console.log('☁️ [Sync] Credentials synchronized to MongoDB.');
        }
      } catch (err) {
        console.error('❌ [Sync] Failed to sync creds to Mongo:', err.message);
      }
    });

    return currentSock;
  } catch (err) {
    console.error('❌ initWhatsApp error:', err.message);
    isInitializing = false;
    waState = { status: 'DISCONNECTED', qr: null, user: null };
    return null;
  }
}

function formatPhoneForBaileys(phone){
  let cleaned = phone.replace(/[^0-9]/g, '');
  
  // 1. Remove leading 0 if present (e.g. 09876543210 -> 9876543210)
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }

  // 2. Fix double country code (e.g. 91919876543210 -> 919876543210)
  if (cleaned.startsWith('9191')) {
    cleaned = cleaned.substring(2);
  }
  
  // 3. If it's 12 digits and starts with 91, it's correct.
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return cleaned;
  }

  // 4. If it's 10 digits starting with 91, it's a truncated number (e.g. 9198765432)
  // This was caused by the previous UI's 10-char limit being applied to numbers including '91'
  if (cleaned.length === 10 && cleaned.startsWith('91')) {
    console.warn(`⚠️ Warning: Phone number ${phone} seems truncated (matches 10 digits starting with 91). It might not work.`);
    // We can't perfectly repair truncation, but we don't want to add ANOTHER 91.
    // However, Baileys needs a full JID. 10 digits isn't a full Indian JID.
    // We'll return it as is + '91' which is still wrong but let Baileys try.
    return '91' + cleaned;
  }

  // 5. If it's 10 digits, assume India and prepend 91
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  return cleaned;
}

export async function sendText(phone, text){
  console.log(`📤 Attempting to send message to ${phone}...`);
  try{
    // Check if we should use Business API instead of Baileys
    const config = await WAConfig.findOne({ id: 'primary' });
    if (config?.connectionMethod === 'business_api') {
      console.log('🌐 Routing message through WhatsApp Business API...');
      return await sendBusinessApiMessage(phone, text);
    }

    if(!sock?.user) {
      console.log('📡 WhatsApp not connected. Attempting to initialize...');
      await initWhatsApp(SESSION_ID);
      // Wait up to 30s for connection (essential for slow Render cold starts)
      let attempts = 0;
      while(!sock?.user && attempts < 30) {
        attempts++;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
    
    if(!sock?.user) {
      console.error('❌ WhatsApp connection failed after 30 seconds.');
      throw new Error('WhatsApp not connected');
    }

    const jid = formatPhoneForBaileys(phone) + '@s.whatsapp.net';
    console.log(`🔗 Target JID: ${jid}`);
    
    // Capture current socket reference to avoid sending on a stale socket
    const currentSock = sock;
    if (!currentSock?.user) {
      console.error('❌ Socket became unavailable before sending.');
      throw new Error('WhatsApp socket became unavailable');
    }
    
    console.log(`📝 Message Content: "${text.substring(0, 50)}..."`);
    await currentSock.sendMessage(jid, { text });
    console.log(`✅ Message successfully delivered to ${jid}`);
    return true;
  } catch(err){
    console.error('❌ sendText error detailed:', err);
    return false;
  }
}

export async function sendWelcome(phone, { name, joinDate, expiryDate, timeSlot, paymentStatus, amountReceived, address, customMessage }){
  const start = new Date(joinDate).toLocaleDateString();
  const end = new Date(expiryDate).toLocaleDateString();
  
  let paymentText = '';
  if (paymentStatus === 'online') paymentText = 'Online Payment Received ✅';
  else if (paymentStatus === 'cash') paymentText = 'Cash Payment Received ✅';
  else paymentText = 'Payment Pending ⌛';

  let text = `🔥 *WELCOME TO RFC GYM* 🔥\n\nHello *${name}*,\n\nWelcome to the family! Your registration is complete. Here are your details:\n\n*Address:* ${address || 'Not Provided'}\n*Joining Date:* ${start}\n*Expiry Date:* ${end}\n*Time Slot:* ${timeSlot || 'Anytime'}\n*Payment Status:* ${paymentText}\n\nWe are excited to see you crush your goals at *RFC Gym*! 💪`;

  if (customMessage && customMessage.trim()) {
    text += `\n\n*Message from Owner:* ${customMessage.trim()}`;
  }

  text += `\n\n_Stay Fit, Stay Strong!_`;
  
  return sendText(phone, text);
}

/**
 * Manually request a pairing code.
 * This is more stable than requesting on init because we can ensure
 * the socket event listeners are already registered.
 */
export async function requestPairingCodeManual(phone) {
  try {
    // If socket is connected or already registered, we can't pairing
    if (sock?.authState?.creds?.registered) {
      throw new Error('Device already registered. Logout first.');
    }

    if (!sock) {
      await initWhatsApp(SESSION_ID, true);
      // Wait for socket to initialize filesystem
      await new Promise(r => setTimeout(r, 4000));
    }

    const cleanPhone = phone.replace(/\D/g, '');
    console.log(`📲 [Manual] Requesting pairing code for ${cleanPhone}...`);
    
    // We must call it on the active socket
    const code = await sock.requestPairingCode(cleanPhone);
    
    // Update state so UI can see it
    waState = { ...waState, status: 'PAIRING_CODE_READY', pairingCode: code };
    
    // Trigger immediate credential sync to persist the pairing handshake
    if (sock.ev) {
       // We can't easily trigger the 'creds.update' event manually, 
       // but we know Baileys updates them internally after requestPairingCode.
       // We'll trust Baileys' internal event loop here.
    }

    logWAEvent('PAIRING_CODE', `Manual request for ${cleanPhone}`);
    return { success: true, code };
  } catch (err) {
    console.error('❌ Manual pairing request failed:', err.message);
    logWAEvent('PAIRING_ERROR', `Manual request failed: ${err.message}`);
    return { success: false, message: err.message };
  }
}
