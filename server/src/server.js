
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import api from './routes/api.js';

const app = express();
const BUILD_ID = 'ssms-render-fix-2026-11-13';

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Student Skill Management System API',
    status: 'Running',
    build: BUILD_ID,
    health: '/api/health'
  });
});

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173'
}));

app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));

app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 60
}));

app.get('/api/health', (req, res) =>
  res.status(200).json({ ok: true, service: 'SSMS API', build: BUILD_ID })
);

app.use('/api', api);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || 'Server error'
  });
});

const PORT = process.env.PORT || 5000;

if (!process.env.MONGO_URI || !process.env.JWT_SECRET) {
  console.error('Set MONGO_URI and JWT_SECRET');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`SSMS API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err);
    process.exit(1);
  });
