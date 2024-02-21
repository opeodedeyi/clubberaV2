const pool = require('../../db');
const groupQueries = require('../group/queries');
require('dotenv').config();


const hasPostPermission = async (req, res, next) => {
    try {
        const { uniqueURL } = req.params;
        const group = req.group

        next();
    } catch (e) {
        return res.status(401).json({
            success: false,
            message: 'Someting went wrong with permissions',
        });
    }
};


module.exports = {
    hasPostPermission,
};
