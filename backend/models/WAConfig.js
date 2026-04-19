import mongoose from 'mongoose';

const WAConfigSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: 'primary' },
  
  // 'qr' | 'pairing' | 'business_api'
  connectionMethod: { type: String, default: 'qr', enum: ['qr', 'pairing', 'business_api'] },
  
  // Business API credentials (only used when connectionMethod === 'business_api')
  businessApi: {
    accessToken: { type: String, default: '' },
    phoneNumberId: { type: String, default: '' },
    businessAccountId: { type: String, default: '' },
    verified: { type: Boolean, default: false }
  },

  // Pairing code phone number
  pairingPhone: { type: String, default: '' },
  
}, { timestamps: true });

export default mongoose.model('WAConfig', WAConfigSchema);
