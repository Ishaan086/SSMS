import dns from "node:dns";

dns.setServers(["8.8.8.8", "1.1.1.1"]);
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import {User,Skill,Evidence,Job,Application,Assessment,Resource} from './models/index.js';

const run=async()=>{
 await mongoose.connect(process.env.MONGO_URI);
 const pass=await bcrypt.hash('Demo@123',12);
 const accounts=[
  ['Demo Student','student@ssms.demo','STUDENT',{department:'Computer Science',year:3}],
  ['Demo Faculty','faculty@ssms.demo','FACULTY',{department:'Computer Science'}],
  ['Placement Officer','placement@ssms.demo','PLACEMENT',{}],
  ['Demo Recruiter','recruiter@ssms.demo','RECRUITER',{company:'TechNova Solutions'}],
  ['System Administrator','admin@ssms.demo','ADMIN',{}]
 ];
 const users={};
 for(const [name,email,role,extra] of accounts){
  users[role]=await User.findOneAndUpdate({email},{ $setOnInsert:{name,email,password:pass,role,...extra,active:true}},{upsert:true,new:true});
 }
 const student=users.STUDENT;
 const skills=[
  ['JavaScript','Programming','Intermediate',72],['React','Frontend','Intermediate',68],
  ['Node.js','Backend','Beginner',48],['MongoDB','Database','Beginner',42],['Data Structures','Core CS','Intermediate',65]
 ];
 for(const [name,category,level,score] of skills) await Skill.updateOne({user:student._id,name},{$setOnInsert:{user:student._id,name,category,level,score}},{upsert:true});
 const assessmentData=[
  {title:'JavaScript Fundamentals',topic:'Programming',description:'Core JavaScript concepts',questions:[
   {prompt:'Which keyword declares a block-scoped variable?',options:['var','let','define','static'],answer:1},
   {prompt:'What does === compare?',options:['Values only','Types only','Value and type','References only'],answer:2},
   {prompt:'Which array method creates a new array by transforming items?',options:['forEach','map','pop','push'],answer:1}]},
  {title:'Web Development Basics',topic:'Web',description:'HTML, CSS and browser fundamentals',questions:[
   {prompt:'What does CSS stand for?',options:['Computer Style Sheets','Cascading Style Sheets','Creative Styling System','Colorful Style Syntax'],answer:1},
   {prompt:'Which HTTP method is commonly used to create a resource?',options:['GET','POST','TRACE','HEAD'],answer:1}]},
  {title:'Database Fundamentals',topic:'Database',description:'Introductory database concepts',questions:[
   {prompt:'Which is a document database?',options:['MongoDB','MySQL','SQLite','PostgreSQL'],answer:0},
   {prompt:'What does CRUD stand for?',options:['Create Read Update Delete','Copy Run Undo Deploy','Create Replace Upload Download','Connect Read Use Disconnect'],answer:0}]}
 ];
 const assessments=[];
 for(const a of assessmentData){let doc=await Assessment.findOneAndUpdate({title:a.title},{$setOnInsert:a},{upsert:true,new:true});assessments.push(doc);}
 const resources=[
  ['React Documentation','Frontend','Official React learning documentation','https://react.dev/learn','Beginner'],
  ['Node.js Learn','Backend','Node.js guides and concepts','https://nodejs.org/en/learn','Beginner'],
  ['MongoDB University','Database','Free MongoDB learning paths','https://learn.mongodb.com/','Beginner'],
  ['MDN Web Docs','Web','Reference for HTML, CSS and JavaScript','https://developer.mozilla.org/','All levels'],
  ['LeetCode','DSA','Practice coding interview problems','https://leetcode.com/','Intermediate']
 ];
 for(const [title,category,description,url,level] of resources) await Resource.updateOne({title},{$setOnInsert:{title,category,description,url,level}},{upsert:true});
 const jobData=[
  ['Frontend Developer Intern','React, JavaScript, CSS','Bengaluru','Internship'],
  ['Graduate Software Engineer','DSA, JavaScript, Node.js','Remote','Full-time'],
  ['Backend Developer Intern','Node.js, MongoDB, REST APIs','Hyderabad','Internship'],
  ['Associate QA Engineer','Testing, JavaScript, API Testing','Pune','Full-time']
 ];
 const jobs=[];
 for(const [title,skills,location,type] of jobData){
  let j=await Job.findOneAndUpdate({recruiter:users.RECRUITER._id,title},{$setOnInsert:{recruiter:users.RECRUITER._id,company:'TechNova Solutions',title,description:`Join our team as ${title}. Work with mentors on real product features.`,skills:skills.split(', '),location,type,minCgpa:6.5,status:'APPROVED'}},{upsert:true,new:true});
  jobs.push(j);
 }
 const sampleEvidence=[['React Portfolio Project','React'],['JavaScript Skill Certificate','JavaScript']];
 for(const [title] of sampleEvidence) await Evidence.updateOne({student:student._id,title},{$setOnInsert:{student:student._id,title,description:'Demo evidence record. Upload a real document to test file handling.',status:'PENDING'}},{upsert:true});
 for(const j of jobs.slice(0,2)) await Application.updateOne({job:j._id,student:student._id},{$setOnInsert:{job:j._id,student:student._id,status:'APPLIED'}},{upsert:true});
 console.log('Seed complete. Demo password for all accounts: Demo@123');
 await mongoose.disconnect();
};
run().catch(e=>{console.error(e);process.exit(1)});
