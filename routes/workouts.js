const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();


//create workout
router.post('/workouts', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const { startedAt, endedAt, exercises } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO workouts (user_id, started_at, ended_at, exercises) VALUES ($1, $2, $3, $4) RETURNING *',
      [userId, startedAt, endedAt, exercises]
    );
    res.status(201).json({ message: 'Workout created!', workout: result.rows[0] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

//get all workouts
router.get('/workouts', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const workouts = await pool.query('SELECT * FROM workouts WHERE user_id = $1', [userId]);

  res.json(workouts.rows);
});

//get one workout
router.get('/workouts/:id', authenticateToken, async (req, res) => {
  const userId = req.user.userId;
  const workoutId = req.params.id;
  const workout = await pool.query(
    'SELECT * FROM workouts WHERE id = $1 AND user_id = $2',
    [workoutId, userId]
  );

  if (workout.rows.length === 0) {
    return res.status(404).json({ error: 'Workout not found' });
  }

  res.json(workout.rows[0]);
});


module.exports = workoutRoutes;