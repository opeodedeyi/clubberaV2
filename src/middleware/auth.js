const jwt = require('jsonwebtoken');
const UserModel = require('../user/models/user.model');
const ApiError = require('../utils/ApiError');

const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                status: 'error',
                message: 'Authentication required'
            });
        }
        
        const token = authHeader.substring(7);
        
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            const user = await UserModel.findById(decoded.userId);
            
            if (!user) {
                return res.status(401).json({
                    status: 'error',
                    message: 'User not found'
                });
            }
            
            // Attach user to request object
            req.user = {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                isEmailConfirmed: user.is_email_confirmed
            };
            
            next();
        } catch (err) {
            return res.status(401).json({
                status: 'error',
                message: 'Invalid or expired token'
            });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    authenticate
};