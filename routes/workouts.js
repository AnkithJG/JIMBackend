const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();

// Create a new workout
router.post('/workout', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { started_at, preset_id } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO workouts (user_id, started_at, preset_id)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, started_at || new Date(), preset_id || null]
    );

    res.status(201).json({ workout: result.rows[0] });
  } catch (err) {
    console.error('Error creating workout:', err);
    res.status(500).json({ error: 'Failed to create workout' });
  }
});

// End a workout (set ended_at)
router.put('/workout/:id/end', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { ended_at } = req.body;

  try {
    const result = await pool.query(
      `UPDATE workouts SET ended_at = $1 WHERE id = $2 RETURNING *`,
      [ended_at || new Date(), id]
    );

    res.json({ workout: result.rows[0] });
  } catch (err) {
    console.error('Error ending workout:', err);
    res.status(500).json({ error: 'Failed to end workout' });
  }
});

// Get a specific workout
router.get('/workout/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM workouts WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workout not found' });
    }

    res.json({ workout: result.rows[0] });
  } catch (err) {
    console.error('Error fetching workout:', err);
    res.status(500).json({ error: 'Failed to get workout' });
  }
});

// Get all workouts for user
router.get('/workouts', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT * FROM workouts WHERE user_id = $1 ORDER BY started_at DESC`,
      [userId]
    );

    res.json({ workouts: result.rows });
  } catch (err) {
    console.error('Error fetching workouts:', err);
    res.status(500).json({ error: 'Failed to get workouts' });
  }
});

// Delete a workout
router.delete('/workout/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(`DELETE FROM workouts WHERE id = $1`, [id]);
    res.json({ message: 'Workout deleted' });
  } catch (err) {
    console.error('Error deleting workout:', err);
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

// (Optional) Update a workout (started_at, ended_at, preset_id)
router.put('/workout/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { started_at, ended_at, preset_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE workouts
       SET started_at = COALESCE($1, started_at),
           ended_at = COALESCE($2, ended_at),
           preset_id = COALESCE($3, preset_id)
       WHERE id = $4
       RETURNING *`,
      [started_at, ended_at, preset_id, id]
    );

    res.json({ workout: result.rows[0] });
  } catch (err) {
    console.error('Error updating workout:', err);
    res.status(500).json({ error: 'Failed to update workout' });
  }
});

// Create a new preset
router.post('/presets', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { title, workout_id } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO presets (user_id, title, workout_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, title, workout_id || null]
    );

    res.status(201).json({ preset: result.rows[0] });
  } catch (err) {
    console.error('Error creating preset:', err);
    res.status(500).json({ error: 'Failed to create preset' });
  }
});

// Get all presets for the authenticated user
router.get('/presets', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT * FROM presets WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    res.json({ presets: result.rows });
  } catch (err) {
    console.error('Error fetching presets:', err);
    res.status(500).json({ error: 'Failed to fetch presets' });
  }
});

// Get a specific preset by id (only if belongs to user)
router.get('/presets/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT * FROM presets WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Preset not found' });
    }

    res.json({ preset: result.rows[0] });
  } catch (err) {
    console.error('Error fetching preset:', err);
    res.status(500).json({ error: 'Failed to fetch preset' });
  }
});

// Update a preset by id (only if belongs to user)
router.put('/presets/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { title, workout_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE presets
       SET title = COALESCE($1, title),
           workout_id = COALESCE($2, workout_id)
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [title, workout_id, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Preset not found or not authorized' });
    }

    res.json({ preset: result.rows[0] });
  } catch (err) {
    console.error('Error updating preset:', err);
    res.status(500).json({ error: 'Failed to update preset' });
  }
});

// Delete a preset by id (only if belongs to user)
router.delete('/presets/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM presets WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Preset not found or not authorized' });
    }

    res.json({ message: 'Preset deleted', preset: result.rows[0] });
  } catch (err) {
    console.error('Error deleting preset:', err);
    res.status(500).json({ error: 'Failed to delete preset' });
  }
});

module.exports = router;