import mongoose from 'mongoose';

const OTPSendSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  ts: { type: Date, default: Date.now }
});

export default mongoose.model('OTPSend', OTPSendSchema);
