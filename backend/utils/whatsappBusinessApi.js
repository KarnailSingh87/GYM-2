/**
 * WhatsApp Business API (Cloud API) Integration
 * Uses Meta's official Graph API to send messages.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

import WAConfig from '../models/WAConfig.js';
import WALog from '../models/WALog.js';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

let cachedConfig = null;

async function getConfig() {
  if (cachedConfig) return cachedConfig;
  cachedConfig = await WAConfig.findOne({ id: 'primary' });
  // Cache expires after 60s so admin changes propagate quickly
  setTimeout(() => { cachedConfig = null; }, 60_000);
  return cachedConfig;
}

/**
 * Check if Business API is configured and verified
 */
export async function isBusinessApiConfigured() {
  const config = await getConfig();
  return !!(config?.businessApi?.accessToken && config?.businessApi?.phoneNumberId && config?.businessApi?.verified);
}

/**
 * Verify Business API credentials by making a test call
 */
export async function verifyBusinessApi(accessToken, phoneNumberId) {
  try {
    const url = `${GRAPH_API_BASE}/${phoneNumberId}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, message: err.error?.message || `API returned ${res.status}` };
    }
    
    const data = await res.json();
    return { 
      success: true, 
      message: 'API credentials verified!',
      phoneNumber: data.display_phone_number || data.verified_name || phoneNumberId
    };
  } catch (err) {
    return { success: false, message: `Connection failed: ${err.message}` };
  }
}

/**
 * Send a text message via the WhatsApp Business Cloud API
 */
export async function sendBusinessApiMessage(phone, text) {
  const config = await getConfig();
  if (!config?.businessApi?.accessToken || !config?.businessApi?.phoneNumberId) {
    console.error('❌ [Business API] Not configured.');
    return false;
  }

  const { accessToken, phoneNumberId } = config.businessApi;

  // Format phone: ensure it starts with country code, no + sign
  let formattedPhone = phone.replace(/[^0-9]/g, '');
  if (formattedPhone.length === 10) {
    formattedPhone = '91' + formattedPhone; // Default: India
  }

  try {
    const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'text',
        text: { 
          preview_url: false,
          body: text 
        }
      })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('❌ [Business API] Send failed:', errData.error?.message || res.status);
      try { await WALog.create({ event: 'API_ERROR', message: `Send to ${phone}: ${errData.error?.message || res.status}` }); } catch(_) {}
      return false;
    }

    const result = await res.json();
    console.log(`✅ [Business API] Message sent to ${formattedPhone}. ID: ${result.messages?.[0]?.id}`);
    try { await WALog.create({ event: 'MESSAGE_SENT', message: `Business API → ${formattedPhone}` }); } catch(_) {}
    return true;
  } catch (err) {
    console.error('❌ [Business API] Error:', err.message);
    return false;
  }
}

/**
 * Get Business API connection status
 */
export async function getBusinessApiStatus() {
  const config = await getConfig();
  if (!config?.businessApi?.accessToken) {
    return { configured: false, verified: false };
  }
  return {
    configured: true,
    verified: config.businessApi.verified,
    phoneNumberId: config.businessApi.phoneNumberId,
    businessAccountId: config.businessApi.businessAccountId
  };
}
