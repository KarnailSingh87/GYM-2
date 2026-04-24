import cron from 'node-cron';
import Member from '../models/Member.js';
import { sendText, getWhatsAppStatus, runWatchdog } from './whatsappBot.js';

export function startCronJobs() {
  console.log('⏰ [Cron] Starting background cron jobs…');

  // ─────────────────────────────────────────────
  //  Daily Expiry Alerts — 10:00 AM every day
  // ─────────────────────────────────────────────
  cron.schedule('0 10 * * *', async () => {
    console.log('🔄 [Cron] Running daily Expiry Alerts…');
    const status = getWhatsAppStatus();
    if (!status.connected) {
      console.log('⚠️ [Cron] WhatsApp not connected — skipping expiry alerts.');
      return;
    }

    try {
      const today = new Date();

      // Members expiring in exactly 3 days
      const t3Start = new Date(today); t3Start.setDate(t3Start.getDate() + 3); t3Start.setHours(0, 0, 0, 0);
      const t3End   = new Date(t3Start); t3End.setHours(23, 59, 59, 999);
      const exp3 = await Member.find({ expiryDate: { $gte: t3Start, $lte: t3End } });
      console.log(`[Cron] ${exp3.length} members expiring in 3 days.`);

      for (const m of exp3) {
        if (!m.phone) continue;
        const msg = `Hi *${m.name}*,\n\nFriendly reminder: Your RFC Gym membership expires in *3 days* (on ${new Date(m.expiryDate).toLocaleDateString('en-IN')}). ⏳\n\nPlease renew now to keep crushing your goals! 💪\n\n_Stay Fit, Stay Strong!_`;
        await sendText(m.phone, msg);
        await new Promise(r => setTimeout(r, 2000));
      }

      // Members expiring today
      const todayStart = new Date(today); todayStart.setHours(0, 0, 0, 0);
      const todayEnd   = new Date(todayStart); todayEnd.setHours(23, 59, 59, 999);
      const expToday = await Member.find({ expiryDate: { $gte: todayStart, $lte: todayEnd } });
      console.log(`[Cron] ${expToday.length} members expiring today.`);

      for (const m of expToday) {
        if (!m.phone) continue;
        const msg = `Hi *${m.name}*,\n\nGentle reminder: Your RFC Gym membership expires *today*. ⌛\n\nPlease renew now so your fitness journey is not interrupted! 💪\n\n_Stay Fit, Stay Strong!_`;
        await sendText(m.phone, msg);
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error('[Cron] Expiry Alerts error:', err);
    }
  });

  // ─────────────────────────────────────────────
  //  Birthday Greetings — 9:00 AM every day
  // ─────────────────────────────────────────────
  cron.schedule('0 9 * * *', async () => {
    console.log('🎂 [Cron] Running Birthday check…');
    const status = getWhatsAppStatus();
    if (!status.connected) {
      console.log('⚠️ [Cron] WhatsApp not connected — skipping birthday greetings.');
      return;
    }

    try {
      const today = new Date();
      const monthDay = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

      const allMembers = await Member.find({});
      let bdays = 0;

      for (const m of allMembers) {
        if (!m.phone || !m.dob) continue;
        const d = new Date(m.dob);
        const mMonthDay = `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

        if (mMonthDay === monthDay) {
          bdays++;
          const msg = `🎉 *HAPPY BIRTHDAY ${m.name.toUpperCase()}!* 🎂\n\nOn behalf of the entire team at *RFC Gym*, we wish you a fantastic day filled with joy, health, and massive gains! 💪🔥\n\nKeep pushing your limits and stay legendary! 🏋️‍♂️✨\n\n_Stay Fit, Stay Strong!_`;
          await sendText(m.phone, msg);
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      console.log(`[Cron] Sent ${bdays} birthday wish(es).`);
    } catch (err) {
      console.error('[Cron] Birthday check error:', err);
    }
  });

  // ─────────────────────────────────────────────
  //  Pending Fees Reminders — 11:00 AM every Monday
  // ─────────────────────────────────────────────
  cron.schedule('0 11 * * 1', async () => {
    console.log('💸 [Cron] Running Pending Fees check…');
    const status = getWhatsAppStatus();
    if (!status.connected) {
      console.log('⚠️ [Cron] WhatsApp not connected — skipping pending fee alerts.');
      return;
    }

    try {
      const pending = await Member.find({ paymentStatus: 'pending' });
      console.log(`[Cron] ${pending.length} members with pending fees.`);

      for (const m of pending) {
        if (!m.phone) continue;
        const msg = `Hi *${m.name}*,\n\nWe noticed your RFC Gym membership fee is still marked as *Pending*. ⌛\n\nPlease clear your dues at the earliest so there is no interruption to your fitness journey! 💪\n\n_Stay Fit, Stay Strong!_`;
        await sendText(m.phone, msg);
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error('[Cron] Pending Fees error:', err);
    }
  });

  // ─────────────────────────────────────────────
  //  WhatsApp Health Watchdog — every 2 minutes
  //  Detects zombie/stuck sockets and forces restart
  // ─────────────────────────────────────────────
  cron.schedule('*/2 * * * *', async () => {
    try {
      await runWatchdog();
    } catch (e) {
      console.error('❌ [Watchdog] Error:', e.message);
    }
  });

  // ─────────────────────────────────────────────
  //  Self-Ping Keep-Alive — every 8 minutes
  //  Prevents Render free-tier from sleeping and
  //  keeps the HTTP + WA connection warm
  // ─────────────────────────────────────────────
  cron.schedule('*/8 * * * *', async () => {
    try {
      // 1. Prioritize RENDER_EXTERNAL_URL (automatic on Render)
      // 2. Fallback to BACKEND_URL
      // 3. Fallback to localhost (only for local dev)
      let selfUrl = process.env.RENDER_EXTERNAL_URL || process.env.BACKEND_URL;
      
      if (!selfUrl) {
        selfUrl = `http://localhost:${process.env.PORT || 5005}`;
      }
      
      selfUrl = selfUrl.replace(/\/$/, '');

      console.log(`📡 [Keep-Alive] Pinging self at ${selfUrl}/api/ping…`);

      const response = await fetch(`${selfUrl}/api/ping`, {
        signal: AbortSignal.timeout(15_000) // 15-second hard timeout
      }).catch(err => {
        return { ok: false, statusText: err.message };
      });

      if (response?.ok) {
        console.log(`✅ [Keep-Alive] SUCCESS — server is awake.`);
      } else {
        console.warn(`⚠️ [Keep-Alive] FAILED (${response?.statusText}) — server might sleep soon.`);
      }
    } catch (e) {
      console.error('❌ [Keep-Alive] Critical Error:', e.message);
    }
  });

  console.log('✅ [Cron] All jobs scheduled.');
}