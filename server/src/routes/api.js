import {Router} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {User,Skill,Evidence,Job,Application,Assessment,Attempt,Resource} from '../models/index.js';
import {protect,allow} from '../middleware/auth.js';

const router=Router();
const uploadDir=path.resolve('uploads'); fs.mkdirSync(uploadDir,{recursive:true});
const storage=multer.diskStorage({destination:uploadDir,filename:(req,file,cb)=>cb(null,Date.now()+'-'+Math.random().toString(36).slice(2)+path.extname(file.originalname))});
const upload=multer({storage,limits:{fileSize:5*1024*1024},fileFilter:(req,file,cb)=>{
  const ok=/\.(pdf|png|jpg|jpeg)$/i.test(file.originalname); cb(ok?null:new Error('Only PDF, PNG and JPG files are allowed'),ok);
}});
const safeUser=u=>({id:u._id,name:u.name,email:u.email,role:u.role,department:u.department,year:u.year,company:u.company,bio:u.bio,phone:u.phone});
router.post('/auth/login',async(req,res)=>{
  const {email,password}=req.body||{};
  const user=await User.findOne({email:(email||'').toLowerCase()});
  if(!user || !user.active || !(await bcrypt.compare(password||'',user.password))) return res.status(401).json({message:'Invalid email or password'});
  const token=jwt.sign({id:user._id},process.env.JWT_SECRET,{expiresIn:'8h'});
  res.json({token,user:safeUser(user)});
});
router.post('/auth/register',async(req,res)=>{
  const {name,email,password}=req.body||{};
  if(!name||!email||!password||password.length<8) return res.status(400).json({message:'Name, email and password (8+ characters) are required'});
  if(await User.exists({email:email.toLowerCase()})) return res.status(409).json({message:'Email already registered'});
  const user=await User.create({name,email,password:await bcrypt.hash(password,12),role:'STUDENT'});
  res.status(201).json({message:'Account created. You can sign in now.',user:safeUser(user)});
});
router.get('/me',protect,(req,res)=>res.json({user:safeUser(req.user)}));

router.get('/dashboard',protect,async(req,res)=>{
  const role=req.user.role, id=req.user._id;
  if(role==='STUDENT'){
    const [skills,evidence,apps,attempts,jobs]=await Promise.all([
      Skill.find({user:id}),Evidence.find({student:id}),Application.countDocuments({student:id}),
      Attempt.find({student:id}),Job.find({status:'APPROVED'})
    ]);
    const readiness=Math.min(100,Math.round((skills.reduce((a,s)=>a+s.score,0)/(Math.max(1,skills.length))) * .55 + Math.min(evidence.filter(e=>e.status==='APPROVED').length*8,24) + Math.min(attempts.length*5,15) + Math.min(apps*2,6)));
    return res.json({stats:{skills:skills.length,evidence:evidence.length,applications:apps,assessments:attempts.length,readiness},recentEvidence:evidence.slice(-4).reverse()});
  }
  if(role==='FACULTY'){
    const [pending,reviewed]=await Promise.all([Evidence.countDocuments({status:'PENDING'}),Evidence.countDocuments({reviewedBy:id})]);
    return res.json({stats:{pending,reviewed}});
  }
  if(role==='PLACEMENT'){
    const [students,jobs,pendingJobs,applications,selected]=await Promise.all([
      User.countDocuments({role:'STUDENT'}),Job.countDocuments(),Job.countDocuments({status:'PENDING'}),
      Application.countDocuments(),Application.countDocuments({status:'SELECTED'})
    ]);
    return res.json({stats:{students,jobs,pendingJobs,applications,selected}});
  }
  if(role==='RECRUITER'){
    const jobs=await Job.find({recruiter:id});
    const ids=jobs.map(j=>j._id);
    const [applicants,pending]=await Promise.all([Application.countDocuments({job:{$in:ids}}),Job.countDocuments({recruiter:id,status:'PENDING'})]);
    return res.json({stats:{jobs:jobs.length,applicants,pending}});
  }
  const [users,jobs,evidence,apps]=await Promise.all([User.countDocuments(),Job.countDocuments(),Evidence.countDocuments(),Application.countDocuments()]);
  res.json({stats:{users,jobs,evidence,applications:apps}});
});

// Student profile and skills
router.get('/profile',protect,async(req,res)=>res.json({profile:safeUser(await User.findById(req.user._id))}));
router.patch('/profile',protect,allow('STUDENT'),async(req,res)=>{
  const fields=['name','department','year','bio','phone']; const update={};
  fields.forEach(k=>{if(req.body[k]!==undefined)update[k]=req.body[k]});
  const user=await User.findByIdAndUpdate(req.user._id,update,{new:true});res.json({profile:safeUser(user)});
});
router.get('/skills',protect,async(req,res)=>{
  const query=req.user.role==='STUDENT'?{user:req.user._id}:{};
  res.json({skills:await Skill.find(query).populate('user','name email').sort({createdAt:-1})});
});
router.post('/skills',protect,allow('STUDENT'),async(req,res)=>{
  const {name,category,level,score}=req.body;
  if(!name) return res.status(400).json({message:'Skill name required'});
  const skill=await Skill.create({user:req.user._id,name,category,level,score});
  res.status(201).json({skill});
});
router.delete('/skills/:id',protect,allow('STUDENT'),async(req,res)=>{
  const s=await Skill.findOneAndDelete({_id:req.params.id,user:req.user._id});if(!s)return res.status(404).json({message:'Skill not found'});res.json({message:'Skill removed'});
});

// Evidence
router.get('/evidence',protect,async(req,res)=>{
  const query=req.user.role==='STUDENT'?{student:req.user._id}:req.user.role==='FACULTY'?{status:'PENDING'}:{};
  res.json({evidence:await Evidence.find(query).populate('student','name email department year').populate('skill','name').populate('reviewedBy','name').sort({createdAt:-1})});
});
router.post('/evidence',protect,allow('STUDENT'),upload.single('file'),async(req,res)=>{
  if(!req.file)return res.status(400).json({message:'Choose a PDF, PNG or JPG file'});
  if(!req.body.title)return res.status(400).json({message:'Evidence title is required'});
  const evidence=await Evidence.create({student:req.user._id,title:req.body.title,description:req.body.description,skill:req.body.skill||undefined,filename:req.file.filename,originalName:req.file.originalname});
  res.status(201).json({evidence,message:'Evidence submitted for faculty review'});
});
router.patch('/evidence/:id/review',protect,allow('FACULTY','ADMIN'),async(req,res)=>{
  const {status,feedback}=req.body;
  if(!['APPROVED','REJECTED'].includes(status))return res.status(400).json({message:'Invalid review status'});
  const item=await Evidence.findByIdAndUpdate(req.params.id,{status,feedback,reviewedBy:req.user._id},{new:true}).populate('student','name email');
  if(!item)return res.status(404).json({message:'Evidence not found'});res.json({evidence:item});
});
router.get('/evidence/:id/file',protect,async(req,res)=>{
  const item=await Evidence.findById(req.params.id);if(!item)return res.sendStatus(404);
  const permitted=req.user.role==='ADMIN'||req.user.role==='FACULTY'||(req.user.role==='STUDENT'&&String(item.student)===String(req.user._id));
  if(!permitted)return res.sendStatus(403);
  res.sendFile(path.join(uploadDir,item.filename));
});

// Assessments
router.get('/assessments',protect,async(req,res)=>{
  const rows=await Assessment.find().lean();
  res.json({assessments:rows.map(a=>({...a,questions:a.questions.map(({prompt,options})=>({prompt,options}))}))});
});
router.post('/assessments/:id/submit',protect,allow('STUDENT'),async(req,res)=>{
  const a=await Assessment.findById(req.params.id);if(!a)return res.sendStatus(404);
  const answers=req.body.answers||[];
  const score=a.questions.reduce((n,q,i)=>n+(Number(answers[i])===q.answer?1:0),0);
  const attempt=await Attempt.create({student:req.user._id,assessment:a._id,score,total:a.questions.length,answers});
  res.json({attempt:{score,total:a.questions.length,percentage:Math.round(score/a.questions.length*100)}});
});
router.get('/attempts',protect,async(req,res)=>{
  const query=req.user.role==='STUDENT'?{student:req.user._id}:{};
  res.json({attempts:await Attempt.find(query).populate('student','name').populate('assessment','title topic').sort({createdAt:-1})});
});
router.get('/resources',protect,async(req,res)=>res.json({resources:await Resource.find()}));

// Jobs and applications
router.get('/jobs',protect,async(req,res)=>{
  const query=req.user.role==='RECRUITER'?{recruiter:req.user._id}:req.user.role==='STUDENT'?{status:'APPROVED'}:{};
  res.json({jobs:await Job.find(query).populate('recruiter','name company').sort({createdAt:-1})});
});
router.post('/jobs',protect,allow('RECRUITER'),async(req,res)=>{
  const {title,description,skills,location,type,minCgpa,deadline}=req.body;
  if(!title)return res.status(400).json({message:'Job title required'});
  const job=await Job.create({recruiter:req.user._id,company:req.user.company||req.user.name,title,description,skills:skills||[],location,type,minCgpa,deadline,status:'PENDING'});
  res.status(201).json({job,message:'Job sent to placement office for approval'});
});
router.patch('/jobs/:id/decision',protect,allow('PLACEMENT','ADMIN'),async(req,res)=>{
  const status=req.body.status;if(!['APPROVED','REJECTED'].includes(status))return res.status(400).json({message:'Invalid decision'});
  const job=await Job.findByIdAndUpdate(req.params.id,{status},{new:true});if(!job)return res.sendStatus(404);res.json({job});
});
router.post('/jobs/:id/apply',protect,allow('STUDENT'),async(req,res)=>{
  const job=await Job.findOne({_id:req.params.id,status:'APPROVED'});if(!job)return res.status(404).json({message:'Job unavailable'});
  try{const application=await Application.create({job:job._id,student:req.user._id});res.status(201).json({application});}
  catch(e){res.status(409).json({message:'You have already applied'});}
});
router.get('/applications',protect,async(req,res)=>{
  let query={};
  if(req.user.role==='STUDENT')query.student=req.user._id;
  if(req.user.role==='RECRUITER'){const jobs=await Job.find({recruiter:req.user._id}).select('_id');query.job={$in:jobs};}
  res.json({applications:await Application.find(query).populate('student','name email department year').populate('job','title company skills').sort({createdAt:-1})});
});
router.patch('/applications/:id/status',protect,allow('RECRUITER','PLACEMENT','ADMIN'),async(req,res)=>{
  const app=await Application.findById(req.params.id).populate('job');
  if(!app)return res.sendStatus(404);
  if(req.user.role==='RECRUITER'&&String(app.job.recruiter)!==String(req.user._id))return res.sendStatus(403);
  const allowed=['SHORTLISTED','INTERVIEW','SELECTED','REJECTED'];
  if(!allowed.includes(req.body.status))return res.status(400).json({message:'Invalid status'});
  app.status=req.body.status;await app.save();res.json({application:app});
});

// Directory and administration
router.get('/students',protect,allow('FACULTY','PLACEMENT','ADMIN'),async(req,res)=>{
  res.json({students:await User.find({role:'STUDENT'}).select('-password').sort({name:1})});
});
router.get('/users',protect,allow('ADMIN'),async(req,res)=>res.json({users:(await User.find().select('-password')).map(safeUser)}));
router.patch('/users/:id/active',protect,allow('ADMIN'),async(req,res)=>{
  const user=await User.findByIdAndUpdate(req.params.id,{active:!!req.body.active},{new:true}).select('-password');
  if(!user)return res.sendStatus(404);res.json({user:safeUser(user)});
});
export default router;
