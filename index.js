const express = require('express');
const userRoutes = require('./src/user/routes');
const groupRoutes = require('./src/group/routes');
const groupRequestRoutes = require('./src/grouprequest/routes');
const app = express();
require('dotenv').config();
var cors = require('cors');


const port = process.env.PORT || 4000;


app.use(cors())
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    "message": "Hello World!",
  })
});

app.use('/api/user', userRoutes);
app.use('/api/group', groupRoutes);
app.use('/api/grouprequest', groupRequestRoutes);

app.listen(port, () => console.log(`app listening on port ${port}`));