import jwt from 'jsonwebtoken';
import {User} from '../models/index.js';

export async function protect(req,res,next){
  try{
    const token=(req.headers.authorization||'').replace(/^Bearer\s+/,'');
    if(!token) return res.status(401).json({message:'Authentication required'});
    const payload=jwt.verify(token,process.env.JWT_SECRET);
    const user=await User.findById(payload.id).select('-password');
    if(!user || !user.active) return res.status(401).json({message:'Account unavailable'});
    req.user=user; next();
  }catch(e){return res.status(401).json({message:'Invalid or expired token'});}
}
export const allow=(...roles)=>(req,res,next)=>{
  if(!req.user || !roles.includes(req.user.role)) return res.status(403).json({message:'You do not have permission for this action'});
  next();
};
