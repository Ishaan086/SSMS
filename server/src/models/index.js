import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name:{type:String,required:true}, email:{type:String,required:true,unique:true,lowercase:true},
  password:{type:String,required:true}, role:{type:String,enum:['STUDENT','FACULTY','PLACEMENT','RECRUITER','ADMIN'],required:true},
  department:{type:String,default:'Computer Science'}, year:{type:Number,default:3},
  company:{type:String,default:''}, active:{type:Boolean,default:true},
  bio:{type:String,default:''}, phone:{type:String,default:''}
},{timestamps:true});

const skillSchema = new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  name:{type:String,required:true},category:{type:String,default:'Technical'},
  level:{type:String,enum:['Beginner','Intermediate','Advanced'],default:'Beginner'},
  score:{type:Number,default:30,min:0,max:100}
},{timestamps:true});

const evidenceSchema = new mongoose.Schema({
  student:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true,index:true},
  skill:{type:mongoose.Schema.Types.ObjectId,ref:'Skill'},
  title:{type:String,required:true},description:String,filename:String,originalName:String,
  status:{type:String,enum:['PENDING','APPROVED','REJECTED'],default:'PENDING'},
  reviewedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},feedback:String
},{timestamps:true});

const jobSchema = new mongoose.Schema({
  recruiter:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  company:{type:String,required:true},title:{type:String,required:true},description:String,
  skills:[String],location:{type:String,default:'India'},type:{type:String,default:'Full-time'},
  minCgpa:{type:Number,default:0},status:{type:String,enum:['PENDING','APPROVED','REJECTED'],default:'PENDING'},
  deadline:Date
},{timestamps:true});

const applicationSchema = new mongoose.Schema({
  job:{type:mongoose.Schema.Types.ObjectId,ref:'Job',required:true},
  student:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  status:{type:String,enum:['APPLIED','SHORTLISTED','INTERVIEW','SELECTED','REJECTED'],default:'APPLIED'},
  note:String
},{timestamps:true});
applicationSchema.index({job:1,student:1},{unique:true});

const assessmentSchema = new mongoose.Schema({
  title:String,topic:String,description:String,
  questions:[{prompt:String,options:[String],answer:Number,explanation:String}]
},{timestamps:true});

const attemptSchema = new mongoose.Schema({
  student:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  assessment:{type:mongoose.Schema.Types.ObjectId,ref:'Assessment',required:true},
  score:Number,total:Number,answers:[Number]
},{timestamps:true});

const resourceSchema = new mongoose.Schema({title:String,category:String,description:String,url:String,level:String});
export const User=mongoose.model('User',userSchema);
export const Skill=mongoose.model('Skill',skillSchema);
export const Evidence=mongoose.model('Evidence',evidenceSchema);
export const Job=mongoose.model('Job',jobSchema);
export const Application=mongoose.model('Application',applicationSchema);
export const Assessment=mongoose.model('Assessment',assessmentSchema);
export const Attempt=mongoose.model('Attempt',attemptSchema);
export const Resource=mongoose.model('Resource',resourceSchema);
