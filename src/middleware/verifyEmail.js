const ApiError = require("../utils/ApiError");

const verifyEmail = (req, res, next) => {
    try {
        // auth middleware should have already set the user object
        if (!req.user) {
            return next(new ApiError("Authentication required", 401));
        }

        if (!req.user.isEmailConfirmed) {
            return next(
                new ApiError(
                    "Email verification required. Please verify your email before proceeding.",
                    403
                )
            );
        }

        next();
    } catch (error) {
        next(error);
    }
};

module.exports = {
    verifyEmail,
};
