import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import supabase from './config/supabase.js';

import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import expenseRoutes from './routes/expenses.js';
import photoRoutes from './routes/photos.js';

dotenv.config();

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());


// 🔥 Root Route (Professional Touch)
app.get('/', (req, res) => {
  res.json({
    message: 'Home Renovation Tracker API is running',
    version: '1.0.0'
  });
});


// 🔥 Health Check
app.get('/health', async (req, res) => {
  try {
    const { error } = await supabase
      .from('projects')
      .select('id')
      .limit(1);

    if (error) {
      return res.status(500).json({
        status: 'ERROR',
        database: 'disconnected',
        message: error.message
      });
    }

    return res.json({
      status: 'OK',
      database: 'connected'
    });

  } catch (err) {
    return res.status(500).json({
      status: 'ERROR',
      database: 'disconnected',
      message: err.message
    });
  }
});


// API Routes
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/photos', photoRoutes);


// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error'
  });
});


const PORT = process.env.PORT || 9000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});