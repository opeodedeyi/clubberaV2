const jwt = require('jsonwebtoken');
require('dotenv').config()


async function generateAuthToken(user) {
    const payload = { id: user.id.toString()};
    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY);
    return token;
}

const generateEmailConfirmToken = (user) => {
    const payload = { id: user.id.toString()};
    const options = { expiresIn: '1h' };
    const token = jwt.sign(payload, process.env.EMAIL_CONFIRM_SECRET_KEY, options);
    return token;
};

function generatePasswordResetToken(user) {
    const payload = { id: user.id.toString()};
    const options = { expiresIn: '1h' };
    const token = jwt.sign(payload, process.env.JWT_SECRET_KEY, options);
    return token;
}

const verifyPasswordResetToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
        return decoded;
    } catch (e) {
        throw new Error('Invalid or expired password reset token');
    }
};

const verifyEmailConfirmToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.EMAIL_CONFIRM_SECRET_KEY);
        return decoded;
    } catch (e) {
        throw new Error('Invalid or expired email confirmation token');
    }
};


module.exports = {
    generateAuthToken,
    generateEmailConfirmToken,
    generatePasswordResetToken,
    verifyPasswordResetToken,
    verifyEmailConfirmToken,
};
