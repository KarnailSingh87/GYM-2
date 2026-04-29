import mongoose from 'mongoose';

const WALogSchema = new mongoose.Schema({
  event: { type: String, required: true }, // 'CONNECTED', 'DISCONNECTED', 'ERROR', 'MESSAGE_SENT'
  message: { type: String },
  timestamp: { type: Date, default: Date.now, expires: '7d' }
});

export default mongoose.model('WALog', WALogSchema);
