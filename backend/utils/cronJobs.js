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
      const targetDate3Days = new Date(today);
      targetDate3Days.setDate(targetDate3Days.getDate() + 3);
      targetDate3Days.setHours(0, 0, 0, 0);

      const targetEnd3Days = new Date(targetDate3Days);
      targetEnd3Days.setHours(23, 59, 59, 999);

      const expiringMembers3Days = await Member.find({
        expiryDate: { $gte: targetDate3Days, $lte: targetEnd3Days }
      });

      console.log(`Found ${expiringMembers3Days.length} members expiring in 3 days.`);

      for (const member of expiringMembers3Days) {
        if (!member.phone) continue;
        const msg = `Hi *${member.name}*,\n\nFriendly reminder: Your RFC Gym membership expires in *3 days* (on ${new Date(member.expiryDate).toLocaleDateString()}). ⏳\n\nPlease renew now to keep crushing your goals! 💪\n\n_Stay Fit, Stay Strong!_`;
        await sendText(member.phone, msg);
        // Small delay to avoid WhatsApp rate limits
        await new Promise(r => setTimeout(r, 2000));
      }

      // Look for members expiring today
      const targetDateToday = new Date(today);
      targetDateToday.setHours(0, 0, 0, 0);

      const targetEndToday = new Date(targetDateToday);
      targetEndToday.setHours(23, 59, 59, 999);

      const expiringMembersToday = await Member.find({
        expiryDate: { $gte: targetDateToday, $lte: targetEndToday }
      });

      console.log(`Found ${expiringMembersToday.length} members expiring today.`);

      for (const member of expiringMembersToday) {
        if (!member.phone) continue;
        const msg = `Hi *${member.name}*,\n\nGentle reminder: Your RFC Gym membership expires *today*. ⌛\n\nPlease renew now so your fitness journey is not interrupted! 💪\n\n_Stay Fit, Stay Strong!_`;
        await sendText(member.phone, msg);
        await new Promise(r => setTimeout(r, 2000));
      }

    } catch (err) {
      console.error('Error in Expiry Alerts cron job:', err);
    }
  });

  // Running every morning at 09:00 AM for Birthdays
  cron.schedule('0 9 * * *', async () => {
    console.log('🔄 Running daily Birthday check...');
    const status = getWhatsAppStatus();
    if (!status.connected) {
      console.log('⚠️ WhatsApp not connected. Skipping birthday greetings.');
      return;
    }

    try {
      const today = new Date();
      const monthDay = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      
      const allMembers = await Member.find({});
      let bdays = 0;

      for (const member of allMembers) {
        if (!member.phone) continue;

        if (member.dob) {
          const mDate = new Date(member.dob);
          const mMonthDay = `${(mDate.getMonth() + 1).toString().padStart(2, '0')}-${mDate.getDate().toString().padStart(2, '0')}`;
          
          if (mMonthDay === monthDay) {
            bdays++;
            const msg = `Happy Birthday *${member.name}*! 🎉🎂\n\nWishing you a fantastic day filled with joy and gains! 💪\n\n_From your family at RFC Gym_`;
            await sendText(member.phone, msg);
            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }

      console.log(`Sent ${bdays} birthday wishes.`);

    } catch (err) {
      console.error('Error in Birthday cron job:', err);
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