const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const workoutRoutes = require('./routes/workouts');
const exerciseRoutes = require('./routes/exercises');

const app = express();

app.use(cors());
app.use(express.json());

// Register routes
app.use('/', authRoutes);
app.use('/', workoutRoutes);
app.use('/', exerciseRoutes);

module.exports = app;
