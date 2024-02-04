const pool = require('../../db');
const queries = require('./queries');
const tokenQueries = require('../token/queries');
const { securePassword, comparePasswords } = require('../services/passwordservice');
const { generateAuthToken, generateEmailConfirmToken, generatePasswordResetToken } = require('../services/tokenservice');
const { sendConfirmationEmail, sendPasswordResetEmail } = require('../services/emailservice');


const getUsers = async (req, res) => {
    await pool.query(queries.getUsers, (error, results) => {
        if (error) throw error;

        res.status(200).json({
            success: true,
            data: results.rows,
        });
    });
};

const getUserByUniqueURL = async (req, res) => {
    const { uniqueURL } = req.params;

    await pool.query(queries.getUserByUniqueURL, [uniqueURL], (error, results) => {
        if (error) throw error;

        if (results.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        };

        res.status(200).json({
            success: true,
            user: results.rows[0],
        });
    });
};

const createUser = async (req, res) => {
    const { email, fullName, password, city, latitude, longitude } = req.body;
    const unique_url = fullName.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();

    try {
        const emailExistsResult = await pool.query(queries.checkEmailExists, [email]);

        if (emailExistsResult.rows.length) {
            return res.status(409).json({
                success: false,
                message: 'User already exists',
            });
        };
        
        const hashedPassword = await securePassword(password);
        const createdUser = await pool.query(queries.createUser, [email, fullName, hashedPassword, city, latitude, longitude, unique_url]);
        const token = await generateAuthToken(createdUser.rows[0]);
        const createdToken = await pool.query(tokenQueries.createToken, [createdUser.rows[0].id, token]);
        const emailConfirmToken = await generateEmailConfirmToken(createdUser.rows[0]);
        const updatedUser = await pool.query(queries.addEmailConfirmTokenToUserProfile, [emailConfirmToken, createdUser.rows[0].id]);
        await sendConfirmationEmail(email, emailConfirmToken);

        res.status(201).json({
            success: true,
            message: 'User created',
            user: updatedUser.rows[0],
            token: createdToken.rows[0].token,
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    };
};

const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await pool.query(queries.getUserByEmail, [email]);
        if (user.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        };

        const isPasswordValid = await comparePasswords(user.rows[0], password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid password',
            });
        };

        const token = await generateAuthToken(user.rows[0]);
        const createdToken = await pool.query(tokenQueries.createToken, [user.rows[0].id, token]);
        const returnedUser = await pool.query(queries.getUserByUniqueURL, [user.rows[0].unique_url]);

        res.status(200).json({
            success: true,
            message: 'User logged in',
            user: returnedUser.rows[0],
            token: createdToken.rows[0].token,
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    };
}

const getLoggedInUser = async (req, res) => {
    const { user } = req;

    try {
        res.status(200).json({
            success: true,
            user: user.rows[0],
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    };
};

const resetPassword = async (req, res) => {
    const { email } = req.body;

    try {
        const user = await pool.query(queries.getUserByEmail, [email]);
        if (user.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        };

        const token = await generatePasswordResetToken(user.rows[0]);
        const updatedUser = await pool.query(queries.addPasswordResetTokenToUserProfile, [token, user.rows[0].id]);
        await sendPasswordResetEmail(email, token);

        res.status(200).json({
            success: true,
            message: 'Password reset email sent',
            user: updatedUser.rows[0],
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    };
};

const resetPasswordSetPassword = async (req, res) => {
    const { password } = req.body;
    const token = req.params.id;

    try {
        const user = await pool.query(queries.getUserFromPasswordResetToken, [token]);
        if (user.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        };

        // check token is valid
        const hashedPassword = await securePassword(password);
        const updatedUser = await pool.query(queries.updatePasswordFromId, [hashedPassword, user.rows[0].id]);
        await pool.query(tokenQueries.deleteAllUserTokens, [user.rows[0].id]);
        const newToken = await generateAuthToken(updatedUser.rows[0]);
        const createdToken = await pool.query(tokenQueries.createToken, [updatedUser.rows[0].id, newToken]);

        res.status(200).json({
            success: true,
            message: 'Password reset',
            user: updatedUser.rows[0],
            token: createdToken.rows[0].token,
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    };
};

const logout = async (req, res) => {
    try {
        pool.query(tokenQueries.deleteCurrentUserTokens, [req.token], (error, results) => {
            if (error) throw error;

            res.status(200).json({
                success: true,
                message: 'User logged out',
            });
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const logoutAll = (req, res) => {
    try {
        pool.query(tokenQueries.deleteAllUserTokens, [req.user.rows[0].id], (error, results) => {
            if (error) throw error;

            res.status(200).json({
                success: true,
                message: 'User logged out of all devices',
            });
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const confirmEmail = async (req, res) => {
    const confirmEmailToken = req.params.id;

    try {
        const user = await pool.query(queries.getUserFromEmailConfirmToken, [confirmEmailToken]);
        if (user.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        };

        // check token is valid
        const updatedUser = await pool.query(queries.confirmEmail, [user.rows[0].id]);

        res.status(200).json({
            success: true,
            message: 'Email confirmed',
            user: updatedUser.rows[0],
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    };
}

const updateUser = async (req, res) => {
    const { user } = req;
    const { fullName, bio, gender, city, latitude, longitude, birthday } = req.body;

    try {
        const updatedUser = await pool.query(queries.updateUser, [user.rows[0].id, fullName, bio, gender, city, latitude, longitude, birthday]);
        res.status(200).json({
            success: true,
            message: 'User updated',
            user: updatedUser.rows[0],
        });
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const changePassword = async (req, res) => {
    const { user } = req;
    const { oldPassword, newPassword } = req.body;
    const userWithPassword = await pool.query(queries.getUserByEmail, [user.rows[0].email]);

    try {
        const isPasswordValid = await comparePasswords(userWithPassword.rows[0], oldPassword);
        
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid password',
            });
        };

        const hashedPassword = await securePassword(newPassword);
        const updatedUser = await pool.query(queries.updatePasswordFromId, [hashedPassword, user.rows[0].id]);

        res.status(200).json({
            success: true,
            message: 'Password changed',
            user: updatedUser.rows[0],
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
    getUsers,
    getUserByUniqueURL,
    createUser,
    loginUser,
    getLoggedInUser,
    resetPassword,
    resetPasswordSetPassword,
    logout,
    logoutAll,
    confirmEmail,
    updateUser,
    changePassword,
};
