const express = require('express');
const pool = require('../db');
const authenticateToken = require('../middleware/authMiddleware');
const router = express.Router();

// ---- DEFAULT EXERCISES ----

// GET all default exercises (public or protected? We'll do protected)
router.get('/exercises', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM exercises ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching exercises' });
  }
});

// GET one default exercise by id
router.get('/exercises/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM exercises WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Exercise not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching exercise' });
  }
});

// POST create a new default exercise
// (Optional — you may want only admins to do this)
router.post('/exercises', authenticateToken, async (req, res) => {
  const { title, sets } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO exercises (title, sets) VALUES ($1, $2) RETURNING *',
      [title, sets]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating exercise' });
  }
});

// PUT update an existing exercise
router.put('/exercises/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { title, sets } = req.body;
  try {
    const result = await pool.query(
      'UPDATE exercises SET title = $1, sets = $2 WHERE id = $3 RETURNING *',
      [title, sets, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Exercise not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating exercise' });
  }
});

// DELETE an exercise by id
router.delete('/exercises/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM exercises WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Exercise not found' });
    res.json({ message: 'Exercise deleted', exercise: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting exercise' });
  }
});

// ---- CUSTOM EXERCISES ----

// GET all custom exercises for the logged-in user
router.get('/custom-exercises', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      'SELECT * FROM custom_exercises WHERE user_id = $1 ORDER BY id',
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching custom exercises' });
  }
});

// GET a single custom exercise by id for the logged-in user
router.get('/custom-exercises/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT * FROM custom_exercises WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Custom exercise not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching custom exercise' });
  }
});

// POST create a new custom exercise for logged-in user
router.post('/custom-exercises', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { title, sets } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO custom_exercises (user_id, title, sets) VALUES ($1, $2, $3) RETURNING *',
      [userId, title, sets]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating custom exercise' });
  }
});

// PUT update a custom exercise owned by user
router.put('/custom-exercises/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { title, sets } = req.body;
  try {
    // Make sure the exercise belongs to the user
    const check = await pool.query(
      'SELECT * FROM custom_exercises WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Custom exercise not found' });

    const result = await pool.query(
      'UPDATE custom_exercises SET title = $1, sets = $2 WHERE id = $3 RETURNING *',
      [title, sets, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating custom exercise' });
  }
});

// DELETE a custom exercise owned by user
router.delete('/custom-exercises/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const check = await pool.query(
      'SELECT * FROM custom_exercises WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Custom exercise not found' });

    const result = await pool.query(
      'DELETE FROM custom_exercises WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    res.json({ message: 'Custom exercise deleted', exercise: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting custom exercise' });
  }
});

// ---- EXERCISE CONTENT (exercises done in workouts) ----

// GET all exercise_content entries for a given workout (only owned by user)
router.get('/workouts/:workoutId/exercise-content', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { workoutId } = req.params;
  try {
    // Verify workout belongs to user
    const workoutCheck = await pool.query(
      'SELECT * FROM workouts WHERE id = $1 AND user_id = $2',
      [workoutId, userId]
    );
    if (workoutCheck.rows.length === 0) return res.status(404).json({ error: 'Workout not found' });

    const result = await pool.query(
      `SELECT ec.*, e.title AS exercise_title, ce.title AS custom_exercise_title
       FROM exercise_content ec
       LEFT JOIN exercises e ON ec.exercise_id = e.id
       LEFT JOIN custom_exercises ce ON ec.custom_exercise_id = ce.id
       WHERE ec.workout_id = $1`,
      [workoutId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching exercise content' });
  }
});

// GET one exercise_content by id (only if belongs to user)
router.get('/exercise-content/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT ec.*, w.user_id,
              e.title AS exercise_title, ce.title AS custom_exercise_title
       FROM exercise_content ec
       JOIN workouts w ON ec.workout_id = w.id
       LEFT JOIN exercises e ON ec.exercise_id = e.id
       LEFT JOIN custom_exercises ce ON ec.custom_exercise_id = ce.id
       WHERE ec.id = $1 AND w.user_id = $2`,
      [id, userId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Exercise content not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error fetching exercise content' });
  }
});

// POST create new exercise_content entry (must belong to user's workout)
router.post('/exercise-content', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const {
    workout_id,
    exercise_id,
    custom_exercise_id,
    reps,
    sets,
    weight,
    duration,
    type_of_duration
  } = req.body;

  try {
    // Check workout ownership
    const workoutCheck = await pool.query(
      'SELECT * FROM workouts WHERE id = $1 AND user_id = $2',
      [workout_id, userId]
    );
    if (workoutCheck.rows.length === 0) return res.status(400).json({ error: 'Invalid workout ID' });

    // Check only one of exercise_id or custom_exercise_id is set
    if ((exercise_id && custom_exercise_id) || (!exercise_id && !custom_exercise_id)) {
      return res.status(400).json({ error: 'Either exercise_id or custom_exercise_id must be provided, but not both' });
    }

    const result = await pool.query(
      `INSERT INTO exercise_content 
        (workout_id, exercise_id, custom_exercise_id, reps, sets, weight, duration, type_of_duration)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [workout_id, exercise_id, custom_exercise_id, reps, sets, weight, duration, type_of_duration]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error creating exercise content' });
  }
});

// PUT update an existing exercise_content (only if belongs to user's workout)
router.put('/exercise-content/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const {
    reps,
    sets,
    weight,
    duration,
    type_of_duration
  } = req.body;

  try {
    // Verify exercise_content belongs to user
    const check = await pool.query(
      `SELECT ec.*, w.user_id FROM exercise_content ec
       JOIN workouts w ON ec.workout_id = w.id
       WHERE ec.id = $1 AND w.user_id = $2`,
      [id, userId]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Exercise content not found' });

    const result = await pool.query(
      `UPDATE exercise_content
       SET reps = $1, sets = $2, weight = $3, duration = $4, type_of_duration = $5
       WHERE id = $6
       RETURNING *`,
      [reps, sets, weight, duration, type_of_duration, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error updating exercise content' });
  }
});

// DELETE an exercise_content entry (only if belongs to user)
router.delete('/exercise-content/:id', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  try {
    // Verify ownership
    const check = await pool.query(
      `SELECT ec.*, w.user_id FROM exercise_content ec
       JOIN workouts w ON ec.workout_id = w.id
       WHERE ec.id = $1 AND w.user_id = $2`,
      [id, userId]
    );
    if (check.rows.length === 0) return res.status(404).json({ error: 'Exercise content not found' });

    const result = await pool.query('DELETE FROM exercise_content WHERE id = $1 RETURNING *', [id]);
    res.json({ message: 'Exercise content deleted', deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error deleting exercise content' });
  }
});

module.exports = router;
