// api/index.js
const express = require('express');
const app = express();

// Middleware
app.use(express.json());

// Routes
app.get('/api', (req, res) => {
  res.json({ message: 'API is running' });
});

app.get('/api/modules', (req, res) => {
  // Example response - replace with your actual data
  res.json([
    { id: 'mod1', name: 'Module 1', context: 'context1' },
    { id: 'mod2', name: 'Module 2', context: 'context2' }
  ]);
});

app.get('/api/modules/:context/:id', (req, res) => {
  const { context, id } = req.params;
  // Example response - replace with your actual data
  res.json({
    id,
    context,
    name: `Module ${id}`,
    content: 'This is the module content.'
  });
});

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel
module.exports = app;
