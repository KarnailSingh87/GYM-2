import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next){
  const auth = req.headers.authorization;
  if(!auth) return res.status(401).json({ message: 'No auth token' });
  const parts = auth.split(' ');
  if(parts.length !== 2) return res.status(401).json({ message: 'Invalid auth format' });
  const token = parts[1];
  try{
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch(err){
    return res.status(401).json({ message: 'Invalid token' });
  }
}
