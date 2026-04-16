import cron from 'node-cron';
import Member from '../models/Member.js';
import { sendText, getWhatsAppStatus } from './whatsappBot.js';

export function startCronJobs() {
  console.log('⏰ Starting background cron jobs...');

  // Running every day at 10:00 AM for Expiry Alerts
  cron.schedule('0 10 * * *', async () => {
    console.log('🔄 Running daily Expiry Alerts check...');
    const status = getWhatsAppStatus();
    if (!status.connected) {
      console.log('⚠️ WhatsApp not connected. Skipping expiry alerts.');
      return;
    }

    try {
      const today = new Date();
      // Look for members expiring in exactly 3 days
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + 3);
      targetDate.setHours(0, 0, 0, 0);

      const targetEnd = new Date(targetDate);
      targetEnd.setHours(23, 59, 59, 999);

      const expiringMembers = await Member.find({
        expiryDate: { $gte: targetDate, $lte: targetEnd }
      });

      console.log(`Found ${expiringMembers.length} members expiring in 3 days.`);

      for (const member of expiringMembers) {
        if (!member.phone) continue;
        const msg = `Hi *${member.name}*,\n\nFriendly reminder: Your RFC Gym membership expires in *3 days* (on ${new Date(member.expiryDate).toLocaleDateString()}). ⏳\n\nPlease renew now to keep crushing your goals! 💪\n\n_Stay Fit, Stay Strong!_`;
        await sendText(member.phone, msg);
        // Small delay to avoid WhatsApp rate limits
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error('Error in Expiry Alerts cron job:', err);
    }
  });

  // Running every Monday at 11:00 AM for Pending Fees Chasers
  cron.schedule('0 11 * * 1', async () => {
    console.log('🔄 Running weekly Pending Fees check...');
    const status = getWhatsAppStatus();
    if (!status.connected) {
      console.log('⚠️ WhatsApp not connected. Skipping pending fee alerts.');
      return;
    }

    try {
      const pendingMembers = await Member.find({ paymentStatus: 'pending' });
      console.log(`Found ${pendingMembers.length} members with pending fees.`);

      for (const member of pendingMembers) {
        if (!member.phone) continue;
        const msg = `Hi *${member.name}*,\n\nWe noticed your RFC Gym membership fee is still marked as *Pending*. ⌛\n\nPlease clear your dues at the earliest so there is no interruption to your fitness journey! 💪\n\n_Stay Fit, Stay Strong!_`;
        await sendText(member.phone, msg);
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error('Error in Pending Fees cron job:', err);
    }
  });
}