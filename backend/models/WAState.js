import mongoose from 'mongoose';

const WAStateSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  data: { type: String, required: true } // JSON stringified state
}, { timestamps: true });

export default mongoose.model('WAState', WAStateSchema);
