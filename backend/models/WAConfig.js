import mongoose from 'mongoose';

const WAConfigSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true, default: 'primary' },
  
  // 'qr' | 'pairing'
  connectionMethod: { type: String, default: 'qr', enum: ['qr', 'pairing'] },

  // Pairing code phone number
  pairingPhone: { type: String, default: '' },
  
}, { timestamps: true });

export default mongoose.model('WAConfig', WAConfigSchema);
