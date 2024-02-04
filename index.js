const express = require('express');
const userRoutes = require('./src/user/routes');
const app = express();
require('dotenv').config();

const port = process.env.PORT || 4000;

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    "message": "Hello World!",
  })
});

app.use('/api/user', userRoutes);

app.listen(port, () => console.log(`app listening on port ${port}`));