import mongoose from 'mongoose';

const MemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String },
  joinDate: { type: Date, default: Date.now },
  expiryDate: { type: Date },
  membershipType: { type: String, enum: ['monthly','quarterly','sixmonth','yearly','other'], default: 'monthly' },
  timeSlot: { type: String },
  paymentStatus: { type: String, enum: ['paid','pending','overdue'], default: 'pending' }
}, { timestamps: true });

export default mongoose.model('Member', MemberSchema);
