import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getWhatsAppStatus, logoutWhatsApp, initWhatsApp, sendText } from '../utils/whatsappBot.js';
import Member from '../models/Member.js';
import WALog from '../models/WALog.js';
import WAConfig from '../models/WAConfig.js';
import { verifyBusinessApi } from '../utils/whatsappBusinessApi.js';

const router = express.Router();

router.get('/status', requireAuth, async (req, res) => {
  const botStatus = getWhatsAppStatus();
  const config = await WAConfig.findOne({ id: 'primary' });
  res.json({
    ...botStatus,
    config: config || { connectionMethod: 'qr' }
  });
});

router.get('/config', requireAuth, async (req, res) => {
  try {
    const config = await WAConfig.findOne({ id: 'primary' });
    res.json(config || { connectionMethod: 'qr' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch config' });
  }
});

router.post('/config', requireAuth, async (req, res) => {
  try {
    const { connectionMethod, pairingPhone, businessApi } = req.body;
    
    await WAConfig.findOneAndUpdate(
      { id: 'primary' },
      { 
        connectionMethod, 
        pairingPhone, 
        businessApi, 
      },
      { upsert: true, new: true }
    );

    // If changing method, trigger a fresh initialization
    await initWhatsApp(undefined, true);
    
    res.json({ success: true, message: 'Configuration updated and engine restarted.' });
  } catch (err) {
    console.error('Config update error:', err);
    res.status(500).json({ success: false, message: 'Failed to update configuration.' });
  }
});

router.post('/verify-business', requireAuth, async (req, res) => {
  try {
    const { accessToken, phoneNumberId } = req.body;
    const result = await verifyBusinessApi(accessToken, phoneNumberId);
    
    if (result.success) {
      await WAConfig.findOneAndUpdate(
        { id: 'primary' },
        { 
          'businessApi.accessToken': accessToken,
          'businessApi.phoneNumberId': phoneNumberId,
          'businessApi.verified': true
        },
        { upsert: true }
      );
    }
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Verification failed due to server error.' });
  }
});

router.get('/logs', requireAuth, async (req, res) => {
  try {
    const logs = await WALog.find().sort({ timestamp: -1 }).limit(15);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch logs' });
  }
});

router.post('/refresh', requireAuth, async (req, res) => {
  try {
    await initWhatsApp(undefined, true);
    res.json({ success: true, message: 'Re-initializing WhatsApp Engine...' });
  } catch (err) {
    console.error('Error refreshing WhatsApp:', err);
    res.status(500).json({ success: false, message: 'Failed to re-initialize WhatsApp.' });
  }
});

router.post('/logout', requireAuth, async (req, res) => {
  const success = await logoutWhatsApp();
  if (success) {
    res.json({ success: true, message: 'Logged out successfully.' });
  } else {
    res.status(500).json({ success: false, message: 'Failed to logout.' });
  }
});

router.post('/broadcast', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const { connected } = getWhatsAppStatus();
    if (!connected) {
      return res.status(400).json({ success: false, message: 'WhatsApp is not connected' });
    }

    // Get Active members
    const today = new Date();
    const activeMembers = await Member.find({ expiryDate: { $gt: today } });

    if (activeMembers.length === 0) {
      return res.status(400).json({ success: false, message: 'No active members found to send messages to.' });
    }

    // We don't want to block the request since broadcasting to a large number of members could take long.
    // Respond immediately and process in background.
    res.json({ success: true, message: `Broadcasting started to ${activeMembers.length} active members.` });

    const sendBroadcast = async () => {
      let successCount = 0;
      let failCount = 0;
      
      console.log(`🚀 Starting broadcast to ${activeMembers.length} members...`);
      
      for (const member of activeMembers) {
        if (!member.phone) {
          console.log(`⏩ Skipping member ${member.name}: No phone number provided.`);
          continue;
        }
        
        try {
          console.log(`➡️ Sending broadcast to: ${member.name} (${member.phone})`);
          const formattedMsg = `🔔 *RFC GYM ANNOUNCEMENT* 🔔\n\nHi *${member.name}*,\n\n${message}\n\n_Stay Fit, Stay Strong! 💪_`;
          const result = await sendText(member.phone, formattedMsg);
          
          if (result) {
            successCount++;
            console.log(`✅ Success: ${member.name}`);
          } else {
            failCount++;
            console.log(`❌ Failed: ${member.name} - Check if WhatsApp is connected or number is valid.`);
          }
          
          // Small delay to avoid WhatsApp rate limits
          await new Promise(r => setTimeout(r, 2000));
        } catch (err) {
          console.error(`❌ Critical error for ${member.name}:`, err.message);
          failCount++;
        }
      }
      console.log(`📢 Broadcast complete: ${successCount} successful, ${failCount} failed.`);
    };

    // Run in background
    sendBroadcast();

  } catch (err) {
    console.error('Error in broadcast route:', err);
    res.status(500).json({ success: false, message: 'Server error during broadcast' });
  }
});

router.post('/test-message', requireAuth, async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'Phone number is required' });
    
    const result = await sendText(phone, '✅ *RFC Gym Connection Test*\n\nIf you are reading this, your WhatsApp integration is active and working correctly! 💪');
    
    if (result) {
      res.json({ success: true, message: 'Test message sent successfully!' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to send test message. Check your connection status.' });
    }
  } catch (err) {
    console.error('Test message error:', err);
    res.status(500).json({ success: false, message: 'Server error during test' });
  }
});

export default router;
