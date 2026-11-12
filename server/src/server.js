import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import api from './routes/api.js';

const app=express();
app.use(helmet({crossOriginResourcePolicy:{policy:'cross-origin'}}));
app.use(cors({origin:process.env.CLIENT_URL||'http://localhost:5173'}));
app.use(express.json({limit:'1mb'}));
app.use(morgan('dev'));
app.use('/api/auth',rateLimit({windowMs:15*60*1000,limit:60}));
app.get('/api/health',(req,res)=>res.json({ok:true,service:'SSMS API'}));
app.use('/api',api);
app.use((err,req,res,next)=>{console.error(err);res.status(err.status||500).json({message:err.message||'Server error'});});
const port=process.env.PORT||5000;
if(!process.env.MONGO_URI||!process.env.JWT_SECRET){console.error('Set MONGO_URI and JWT_SECRET in server/.env');process.exit(1);}
mongoose.connect(process.env.MONGO_URI).then(()=>app.listen(port,()=>console.log(`SSMS API running on http://localhost:${port}`))).catch(e=>{console.error('MongoDB connection failed:',e.message);process.exit(1);});
