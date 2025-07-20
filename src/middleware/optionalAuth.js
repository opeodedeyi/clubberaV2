const jwt = require("jsonwebtoken");
const UserModel = require("../user/models/user.model");

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next();
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return next();
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const user = await UserModel.findById(decoded.userId);

            if (!user) {
                return next();
            }

            if (!user.is_active) {
                return next();
            }

            req.user = user;
            next();
        } catch (error) {
            next();
        }
    } catch (error) {
        next();
    }
};

module.exports = optionalAuth;
