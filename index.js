const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json()); 
const cors = require('cors');
app.use(cors());

const pool = new Pool({
  user: 'postgres', 
  password: 'Ankith09262006*', 
  host: 'localhost',
  port: 5432,
  database: 'gym_app'
});

console.log('PostgreSQL connection configured.'); 

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});


//signup route post
app.post('/signup', async (req, res) => {
  try {
    const { username, phoneNumber, email, password, birthdate } = req.body;
    console.log('Signup request body:', req.body); 

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, phone_number, email, password, birthdate) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [username, phoneNumber, email, hashedPassword, birthdate]
    );
    
    console.log('User created:', result.rows[0]);
    res.status(201).json({ message: 'User created!', user: result.rows[0] });
  } catch (err) {
    console.error('SIGNUP ERROR:', err.stack); 
    res.status(400).json({ error: err.message }); 
  }
});

// login route post
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const isMatch = await bcrypt.compare(password, user.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user.rows[0].id }, 'your_jwt_secret', { expiresIn: '1h' });
    console.log('Token generated:', token);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.rows[0].id,
        username: user.rows[0].username,
        email: user.rows[0].email,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

