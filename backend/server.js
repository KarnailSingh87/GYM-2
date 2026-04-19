import mongoose from 'mongoose';
import app from './app.js';
import { initWhatsApp } from './utils/whatsappBot.js';
import { startCronJobs } from './utils/cronJobs.js';

const PORT = process.env.PORT || 5005;

let server = null;

async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'gymdb' });
    console.log('✅ [DB] Connected to MongoDB');

    // Start HTTP server first so keep-alive pings don't fail on cold start
    server = app.listen(PORT, () => console.log(`🚀 [Server] Running on port ${PORT}`));

    // Initialize WhatsApp in background — never blocks startup
    initWhatsApp().catch(err => console.error('❌ [WA] Initial connection failed:', err));

    // Start automated background tasks (cron jobs + watchdog)
    startCronJobs();
  } catch (err) {
    console.error('❌ [Startup] Fatal error:', err);
    process.exit(1);
  }
}

// ─────────────────────────────────────────────
//  Graceful shutdown — critical on Render/cloud
//  so existing WA messages/sessions are flushed
// ─────────────────────────────────────────────
async function shutdown(signal) {
  console.log(`\n🛑 [Server] ${signal} received — shutting down gracefully…`);

  if (server) {
    server.close(() => console.log('🔌 [Server] HTTP server closed.'));
  }

  try {
    await mongoose.connection.close();
    console.log('🔌 [DB] MongoDB connection closed.');
  } catch (e) {
    console.error('[Shutdown] MongoDB close error:', e.message);
  }

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

if (process.env.NODE_ENV !== 'test') start();

export { start };
