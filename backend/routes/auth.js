import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Admin login using email and password. Admin credentials are stored in env.
router.post('/login', async (req, res) =>{
  const { email, password } = req.body;
  const cleanEmail = email?.trim();
  const cleanPassword = password?.trim();
  

  if(!cleanEmail || !cleanPassword) return res.status(400).json({ message: 'Missing email or password' });
  
  const expectedEmail = process.env.ADMIN_EMAIL?.trim();

  if(cleanEmail !== expectedEmail) return res.status(401).json({ message: 'Invalid credentials' });
  
  const expectedPassword = process.env.ADMIN_PASSWORD?.trim();

  if(cleanPassword !== expectedPassword) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: '12h' });
  res.json({ token });
});

export default router;
