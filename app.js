const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const workoutRoutes = require('./routes/workouts');

const app = express();

app.use(cors());
app.use(express.json());

// Register routes
app.use('/', authRoutes);
app.use('/', workoutRoutes);

module.exports = app;
