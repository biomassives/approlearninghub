const express = require('express');
const app = express();
const port = 3000;

app.get('/api/modules', (req, res) => {
  const { context, mod } = req.query;
  let data = {};

  if (context === 'techskills' && mod === 'deployment') {
    data = {
      title: 'Deployment Techniques',
      content: '<p>Learn how to deploy web applications to various platforms.</p><ul><li>Vercel</li><li>Netlify</li><li>AWS</li></ul>'
    };
  } else if (context === 'water-security' && mod === 'water-purification') {
    data = {
      title: 'Water Purification Methods',
      content: '<p>Explore different methods for purifying water.</p><img src="water.jpg" alt="water purification image"> '
    };
  } else if (context === 'ai' && mod === 'prompting') {
        data = {
            title: 'Prompt Engineering Basics',
            content: '<p>Learn how to write effective prompts for AI models.</p><video src="prompting.mp4" controls></video>'
        };
    } else {
    data = {
      title: 'Module Not Found',
      content: '<p>The requested module could not be found.</p>'
    };
  }

  res.json(data);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
