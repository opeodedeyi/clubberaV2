const pool = require('../../db');
const jwt = require('jsonwebtoken');
const userQueries = require('../user/queries');
const tokenQueries = require('../token/queries');
require('dotenv').config();


const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        console.log('token', token);
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        console.log('decoded', decoded);
        const user = await pool.query(userQueries.getUserById, [decoded.id]);
        console.log('user', user.rows[0]);
        const tokenExists = await pool.query(tokenQueries.checkTokenExists, [token]);

        if (tokenExists.rows.length === 0) {
            throw new Error();
        }

        req.token = token;
        req.user = user;
        next();
    } catch (e) {
        return res.status(401).json({
            success: false,
            message: 'Please login first.',
        });
    }
};

const isLoggedIn = (req, res) => {
    try {

    } catch (e) {
        
    }
}


module.exports = {
    auth,
};
