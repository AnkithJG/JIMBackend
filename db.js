const { Pool } = require('pg');


const pool = new Pool({
  user: 'postgres', 
  password: 'Ankith09262006*', 
  host: 'localhost',
  port: 5432,
  database: 'gym_app'
});


module.exports = pool;