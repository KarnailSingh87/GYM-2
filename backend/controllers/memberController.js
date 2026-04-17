import Member from '../models/Member.js';
import { sendWelcome } from '../utils/whatsappBot.js';

export async function createMember(req, res){
  try{
    const { name, phone, address, dob, membershipType, timeSlot, joinDate: customJoinDate, customMessage, paymentStatus, amountReceived } = req.body;
    if(!name || !phone) return res.status(400).json({ message: 'Missing fields' });

    // Member record creation
    let joinDate = customJoinDate ? new Date(customJoinDate) : new Date();
    if(isNaN(joinDate.getTime())) joinDate = new Date();
    
    // Expiry calculation depending on membershipType
    let expiry = new Date(joinDate);
    if(membershipType === 'monthly') expiry.setMonth(expiry.getMonth() + 1);
    else if(membershipType === 'quarterly') expiry.setMonth(expiry.getMonth() + 3);
    else if(membershipType === 'sixmonth') expiry.setMonth(expiry.getMonth() + 6);
    else if(membershipType === 'yearly') expiry.setFullYear(expiry.getFullYear() + 1);

    const member = new Member({ 
      name, 
      phone, 
      address,
      dob,
      joinDate, 
      membershipType, 
      expiryDate: expiry, 
      timeSlot,
      paymentStatus: paymentStatus || 'pending',
      amountReceived: amountReceived || 0
    });
    await member.save();

    // Directly send professional welcome/confirmation message
    await sendWelcome(phone, { 
      name, 
      joinDate, 
      expiryDate: expiry, 
      timeSlot, 
      paymentStatus: paymentStatus || 'pending',
      amountReceived: amountReceived || 0,
      address
    }).catch(err => console.error('Welcome send failed', err));

    res.status(201).json({ member, messageSent: true });
  } catch(err){
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}

export async function listMembers(req, res){
  try{
    const members = await Member.find().sort({ createdAt: -1 });
    res.json({ members });
  } catch(err){
    res.status(500).json({ message: 'Server error' });
  }
}

export async function updateMember(req, res){
  try{
    const { id } = req.params;
    const updates = req.body;
    const member = await Member.findByIdAndUpdate(id, updates, { new: true });
    res.json({ member });
  } catch(err){
    res.status(500).json({ message: 'Server error' });
  }
}

export async function deleteMember(req, res){
  try{
    const { id } = req.params;
    await Member.findByIdAndDelete(id);
    res.json({ ok: true });
  } catch(err){
    res.status(500).json({ message: 'Server error' });
  }
}
