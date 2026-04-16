import mongoose from 'mongoose';
import app from './app.js';
import { initWhatsApp } from './utils/whatsappBot.js';

const PORT = process.env.PORT || 5001;

async function start(){
  try{
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'gymdb' });
    console.log('Connected to MongoDB');
    // Initialize WhatsApp session in background (best-effort)
    initWhatsApp(process.env.WA_SESSION_ID || 'gymwa').catch(err => console.error('WA init failed', err));
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  } catch(err){
    console.error('Startup error', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') start();

export { start };
