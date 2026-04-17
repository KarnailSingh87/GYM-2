import mongoose from 'mongoose';

const MemberSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String },
  joinDate: { type: Date, default: Date.now },
  expiryDate: { type: Date },
  dob: { type: Date },
  membershipType: { type: String, enum: ['monthly','quarterly','sixmonth','yearly','other'], default: 'monthly' },
  timeSlot: { type: String },
  paymentStatus: { type: String, enum: ['paid','pending','overdue','online','cash'], default: 'pending' },
  amountReceived: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model('Member', MemberSchema);
