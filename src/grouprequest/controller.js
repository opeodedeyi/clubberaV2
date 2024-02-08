const pool = require('../../db');
const queries = require('./queries');


const acceptRequest = async (req, res) => {
    const { id } = req.params;
    const { user } = req;

    try {
        const request = await pool.query(queries.getRequestById, [id]);
        if (!request.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        if (request.rows[0].owner_id !== user.rows[0].id) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to accept this request'
            });
        }

        const result = await pool.query(queries.acceptRequest, [request.rows[0].group_id, request.rows[0].user_id]);
        await pool.query(queries.removeRequest, [id]);
        return res.status(200).json({
            success: true,
            request: result.rows[0]
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const rejectRequest = async (req, res) => {
    const { id } = req.params;
    const { user } = req;

    try {
        const request = await pool.query(queries.getRequestById, [id]);
        if (!request.rows[0]) {
            return res.status(404).json({
                success: false,
                message: 'Request not found'
            });
        }

        if (request.rows[0].owner_id !== user.rows[0].id) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to reject this request'
            });
        }

        await pool.query(queries.removeRequest, [id]);
        return res.status(200).json({
            success: true,
            message: 'Request rejected'
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

module.exports = {
    acceptRequest,
    rejectRequest
};
