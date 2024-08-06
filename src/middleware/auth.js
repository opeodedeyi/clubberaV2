const pool = require('../../db');
const jwt = require('jsonwebtoken');
const userQueries = require('../user/queries');
const tokenQueries = require('../token/queries');
require('dotenv').config();


const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        const user = await pool.query(userQueries.getUserById, [decoded.id]);
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

const optauth = async (req, res, next) => {
    try {
        const token = req.header('Authorization').replace('Bearer ', '');
        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
            const userResult = await pool.query(userQueries.getUserById, [decoded.id]);

            if (userResult.rows.length > 0) {
                const user = userResult.rows[0];
                const tokenExists = await pool.query(tokenQueries.checkTokenExists, [token]);

                if (tokenExists.rows.length > 0) {
                    req.token = token;
                    req.user = user;
                }
            }
        }
    } catch (e) {
        console.log('Authentication/Authorization failed:', e.message);
    }
    next();
}


module.exports = {
    auth,
    optauth
};
