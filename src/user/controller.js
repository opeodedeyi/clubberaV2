const pool = require('../../db');
const queries = require('./queries');
const tokenQueries = require('../token/queries');
const locationdb = require('../utils/location');
const bannerdb = require('../utils/banner');
const { uploadToS3, deleteFromS3 } = require('../services/s3service');
const { securePassword, comparePasswords, generateRandomPassword } = require('../services/passwordservice');
const { verifyGoogleToken } = require('../services/googleLoginService');
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

const getUserCreatedGroups = async (req, res) => {
    const { uniqueURL } = req.params;
    const { page = 1, limit = 10 } = req.query; // Default to page 1 with 10 items per page

    try {
        const userResult = await pool.query(queries.getUserByUniqueURL, [uniqueURL]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        const userId = userResult.rows[0].id;

        // Calculate the offset
        const offset = (page - 1) * limit;

        // Get the groups
        const groupsResult = await pool.query(queries.getUserCreatedGroups, [userId, limit, offset]);

        // Get the total count of groups
        const countResult = await pool.query(queries.getUserCreatedGroupsCount, [userId]);
        const totalGroups = parseInt(countResult.rows[0].count);

        res.status(200).json({
            success: true,
            data: groupsResult.rows,
            pagination: {
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit),
                totalItems: totalGroups,
                totalPages: Math.ceil(totalGroups / limit)
            }
        });
    } catch (error) {
        console.error('Error in getUserCreatedGroups:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching user's created groups"
        });
    }
}

const getUserJoinedGroups = async (req, res) => {
    const { uniqueURL } = req.params;
    const { page = 1, limit = 10 } = req.query; // Default to page 1 with 10 items per page
    
    try {
        const userResult = await pool.query(queries.getUserByUniqueURL, [uniqueURL]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }
        const userId = userResult.rows[0].id;
        
        // Calculate the offset
        const offset = (page - 1) * limit;
        
        // Get the groups
        const groupsResult = await pool.query(queries.getUserJoinedGroups, [userId, limit, offset]);
        
        // Get the total count of groups
        const countResult = await pool.query(queries.getUserJoinedGroupsCount, [userId]);
        const totalGroups = parseInt(countResult.rows[0].count);
        
        res.status(200).json({
            success: true,
            data: groupsResult.rows,
            pagination: {
                currentPage: parseInt(page),
                itemsPerPage: parseInt(limit),
                totalItems: totalGroups,
                totalPages: Math.ceil(totalGroups / limit)
            }
        });
    } catch (error) {
        console.error('Error in getUserJoinedGroups:', error);
        res.status(500).json({
            success: false,
            message: "An error occurred while fetching user's joined groups"
        });
    }
}

const createUser = async (req, res) => {
    const { email, fullName, password, city, lat, lng } = req.body;
    const unique_url = fullName.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();

    try {
        const emailExistsResult = await pool.query(queries.checkEmailExists, [email]);
        let createdLocation = null;

        if (emailExistsResult.rows.length) {
            return res.status(409).json({
                success: false,
                message: 'User already exists',
            });
        };
        
        const hashedPassword = await securePassword(password);
        const createdUser = await pool.query(queries.createUser, [email, fullName, hashedPassword, unique_url]);

        if (city) {
            createdLocation = await locationdb.createLocation('user', createdUser.rows[0].id, city, lat, lng);
        }

        const token = await generateAuthToken(createdUser.rows[0]);
        const createdToken = await pool.query(tokenQueries.createToken, [createdUser.rows[0].id, token]);
        const emailConfirmToken = await generateEmailConfirmToken(createdUser.rows[0]);
        const updatedUser = await pool.query(queries.addEmailConfirmTokenToUserProfile, [emailConfirmToken, createdUser.rows[0].id]);
        await sendConfirmationEmail(email, emailConfirmToken);

        const responseObject = {
            success: true,
            message: 'User created',
            user: updatedUser.rows[0],
            token: createdToken.rows[0].token,
        };

        if (createdLocation?.rows[0]) {
            responseObject.user.location = createdLocation.rows[0].address;
        }

        res.status(201).json(responseObject);
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
                message: 'User does not exist',
            });
        };

        console.log('user', user.rows[0]);

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
        await pool.query(queries.addPasswordResetTokenToUserProfile, [token, user.rows[0].id]);
        await sendPasswordResetEmail(email, token);

        res.status(200).json({
            success: true,
            message: 'Password reset email sent'
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
    const { fullName, bio, gender, city, lat, lng, birthday } = req.body;

    try {
        const updatedUser = await pool.query(queries.updateUser, [user.rows[0].id, fullName, bio, gender, birthday]);
        let updatedLocation = null;

        if (city) {
            updatedLocation = await locationdb.findThenUpdateOrCreateLocation('user', user.rows[0].id, city, lat, lng);
        }

        const responseObject = {
            success: true,
            user: updatedUser.rows[0],
        };

        if (updatedLocation?.rows[0]) {
            responseObject.user.city = updatedLocation.rows[0].address;
        }

        res.status(200).json(responseObject);
    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error',
        });
    }
}

const updateUserAvatar = async (req, res) => {
    const { user } = req;
    const { avatar } = req.body;

    console.log(user.rows[0]);
    
    try {
        await deleteFromS3(user.rows[0].banner_key);
        const data = await uploadToS3(avatar, `${user.rows[0].unique_url}-banner.jpg`);
        await bannerdb.createOrUpdateBanner('user', user.rows[0].id, data.key, data.location);

        res.status(200).json({
            success: true,
            message: 'User avatar updated',
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

const googleAuth = async (req, res) => {
    try {
        const idToken = req.body.code
        const payload = await verifyGoogleToken(idToken);
        const { email, name, picture } = payload;
        
        let user = await pool.query(queries.checkEmailExists, [email]);
        let avatar = null;

        if (user.rows.length === 0) {
            const password = generateRandomPassword(16);
            const hashedPassword = await securePassword(password);
            const unique_url = name.replace(/\s+/g, '-').toLowerCase() + '-' + Date.now();

            user = await pool.query(queries.createGoogleUser, [email, name, hashedPassword, unique_url]);
            
            if (picture) {
                avatar = await bannerdb.createBanner('user', user.rows[0].id, 'google', picture, picture);
            }

            // send welcome email to user
        }

        if (user.rows[0].is_email_confirmed === false) {
            const confirmUser = await pool.query(queries.confirmEmail, [user.rows[0].id]);
            user.rows[0] = confirmUser.rows[0];
        }
        

        const token = await generateAuthToken(user.rows[0]);
        const createdToken = await pool.query(tokenQueries.createToken, [user.rows[0].id, token]);

        const responseObject = {
            success: true,
            message: 'User logged in with Google',
            user: user.rows[0],
            token: createdToken.rows[0].token,
        };
        
        if (avatar) {
            responseObject.user.avatar = avatar.rows[0].banner;
        }

        res.status(200).json(responseObject);
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
    getUserCreatedGroups,
    getUserJoinedGroups,
    createUser,
    loginUser,
    getLoggedInUser,
    resetPassword,
    resetPasswordSetPassword,
    logout,
    logoutAll,
    confirmEmail,
    updateUser,
    updateUserAvatar,
    changePassword,
    googleAuth
};
