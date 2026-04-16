import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getWhatsAppStatus, logoutWhatsApp, initWhatsApp } from '../utils/whatsappBot.js';

const router = express.Router();

router.get('/status', requireAuth, (req, res) => {
  res.json(getWhatsAppStatus());
});

router.post('/refresh', requireAuth, async (req, res) => {
  await initWhatsApp('default', true);
  res.json({ success: true, message: 'Re-initializing WhatsApp Engine...' });
});

router.post('/logout', requireAuth, async (req, res) => {
  const success = await logoutWhatsApp();
  if (success) {
    res.json({ success: true, message: 'Logged out successfully.' });
  } else {
    res.status(500).json({ success: false, message: 'Failed to logout.' });
  }
});

export default router;
