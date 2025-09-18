import express from 'express';
import cors from 'cors';
import morgan from 'morgan';

import './config/firebase.js';
import { apiKeyMiddleware } from './middlewares/apiKey.js';
import exerciseClassRoutes from './routes/exerciseClassRoutes.js';
import exerciseRoutes from './routes/exerciseRoutes.js';
import healthRoutes from './routes/healthRoutes.js';
import sessionRoutes from './routes/sessionRoutes.js';
import workoutRoutes from './routes/workoutRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use(healthRoutes);

app.use(apiKeyMiddleware);
app.use('/exercise-classes', exerciseClassRoutes);
app.use('/exercises', exerciseRoutes);
app.use('/workouts', workoutRoutes);
app.use('/sessions', sessionRoutes);

export { app };
