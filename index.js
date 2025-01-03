const express = require('express');
const userRoutes = require('./src/user/routes');
const groupRoutes = require('./src/group/routes');
const groupRequestRoutes = require('./src/grouprequest/routes');
const announcementRoutes = require('./src/announcement/routes');
const discussionRoutes = require('./src/discussion/routes');
const meetingRoutes = require('./src/meeting/routes');
const meetingActionRoutes = require('./src/meetingaction/routes');
const searchRoutes = require('./src/search/routes');
const searchGroupsRoutes = require('./src/groupsearch/routes');
const feedRoutes = require('./src/feed/routes');
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
app.use('/api/announcement', announcementRoutes);
app.use('/api/discussion', discussionRoutes);
app.use('/api/meeting', meetingRoutes);
app.use('/api/meetingaction', meetingActionRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/search', searchGroupsRoutes);
app.use('/api/feed', feedRoutes);


app.listen(port, () => console.log(`app listening on port ${port}`));