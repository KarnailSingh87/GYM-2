import { 
  makeWASocket, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion, 
  DisconnectReason 
} from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import P from 'pino';
import qrcode from 'qrcode-terminal';

let sock = null;
let isInitializing = false;
let waState = { status: 'INITIALIZING', qr: null, user: null };
const SESSION_ID = 'rfc_gym_session';

export function getWhatsAppStatus() {
  return {
    ...waState,
    connected: !!sock?.user
  };
}

export async function logoutWhatsApp() {
  try {
    isInitializing = false;
    waState = { status: 'DISCONNECTED', qr: null, user: null };
    
    if (sock) {
      try {
        sock.ev.removeAllListeners();
        await sock.logout().catch(() => {});
        sock.end();
      } catch (e) {
        console.log('Socket already dead, continuing cleanup...');
      }
      sock = null;
    }

    const sessionsDir = path.resolve(process.cwd(), 'sessions');
    if (fs.existsSync(sessionsDir)) {
      try {
        fs.rmSync(sessionsDir, { recursive: true, force: true });
      } catch (e) {
        console.log('File cleanup delayed, will retry on next init');
      }
    }
    
    return true;
  } catch (err) {
    console.error('Critical Logout error', err);
    return true; // Return true anyway to unblock the UI
  }
}

export async function initWhatsApp(sessionId = SESSION_ID, force = false){
  if (force) {
    if (sock) {
      try { sock.end(); } catch(e) {}
    }
    sock = null;
    isInitializing = false;
  }

  if (sock?.user && !isInitializing) return sock;
  if (isInitializing && !force) return null;
  
  isInitializing = true;
  const sessionsDir = path.resolve(process.cwd(), 'sessions', sessionId);
  if(!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir, { recursive: true });
  
  const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);
  const { version } = await fetchLatestBaileysVersion();
  
  sock = makeWASocket({ 
    auth: state, 
    logger: P({ level: 'silent' }), 
    version,
    printQRInTerminal: false,
    browser: ['RFC Gym Admin', 'Chrome', '4.0.0']
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    
    if(qr) {
      waState = { ...waState, status: 'QR_READY', qr };
    }

    if(connection === 'close'){
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      
      if(shouldReconnect){
        isInitializing = false;
        setTimeout(() => initWhatsApp(sessionId), 5000);
      } else {
        isInitializing = false;
        waState = { status: 'DISCONNECTED', qr: null, user: null };
      }
    }
    
    if(connection === 'open'){
      waState = { status: 'CONNECTED', qr: null, user: sock.user };
      isInitializing = false;
    }
  });

  sock.ev.on('creds.update', saveCreds);
  return sock;
}

function formatPhoneForBaileys(phone){
  let cleaned = phone.replace(/[^0-9]/g, '');
  // If it's a 10 digit Indian number without country code, add 91
  if (cleaned.length === 10) cleaned = '91' + cleaned;
  return cleaned;
}

export async function sendText(phone, text){
  console.log(`📤 Attempting to send message to ${phone}...`);
  try{
    if(!sock?.user) {
      console.log('📡 WhatsApp not connected. Attempting to initialize...');
      await initWhatsApp(SESSION_ID);
      // Wait up to 5s if connecting
      let attempts = 0;
      while(!sock?.user && attempts < 5) {
        await new Promise(r => setTimeout(r, 1000));
        attempts++;
      }
    }
    
    if(!sock?.user) {
      console.error('❌ WhatsApp connection failed after 5 seconds.');
      throw new Error('WhatsApp not connected');
    }

    const jid = formatPhoneForBaileys(phone) + '@s.whatsapp.net';
    console.log(`🔗 Target JID: ${jid}`);
    
    await sock.sendMessage(jid, { text });
    console.log('✅ Message sent successfully!');
    return true;
  } catch(err){
    console.error('❌ sendText error', err.message);
    return false;
  }
}

export async function sendWelcome(phone, { name, joinDate, expiryDate, timeSlot }){
  const start = new Date(joinDate).toLocaleDateString();
  const end = new Date(expiryDate).toLocaleDateString();
  
  const text = `🔥 *WELCOME TO RFC GYM* 🔥\n\nHello *${name}*,\n\nWelcome to the family! Your registration is complete. Here are your details:\n\n📅 *Joining Date:* ${start}\n⏳ *Expiry Date:* ${end}\n⏰ *Time Slot:* ${timeSlot || 'Anytime'}\n\nWe are excited to see you crush your goals at *RFC Gym*! 💪\n\n_Stay Fit, Stay Strong!_`;
  return sendText(phone, text);
}
