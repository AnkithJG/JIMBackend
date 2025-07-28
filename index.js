// const app = require('./app');

// const PORT = 3000;

// app.listen(PORT, () => {
//   console.log(`Server is running on http://localhost:${PORT}`);
// });



const app = require('./app');

// Use PORT from environment (Render provides this) or fallback to 3000 for local
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});