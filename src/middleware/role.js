const ApiError = require("../utils/ApiError");

const requireRole = (roles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    status: "error",
                    message: "Authentication required",
                });
            }

            const requiredRoles = Array.isArray(roles) ? roles : [roles];

            if (!req.user.role || !requiredRoles.includes(req.user.role)) {
                return res.status(403).json({
                    status: "error",
                    message:
                        "You do not have permission to access this resource",
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

const requireActiveAccount = (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                status: "error",
                message: "Authentication required",
            });
        }

        if (!req.user.isActive) {
            return res.status(403).json({
                status: "error",
                message:
                    "Account is deactivated. Please reactivate your account to continue.",
            });
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    requireRole,
    requireActiveAccount,
};
