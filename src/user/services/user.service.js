const UserModel = require('../models/user.model');
const LocationModel = require('../models/location.model');
const ImageModel = require('../models/image.model');
const TagModel = require('../models/tag.model');
const AuthService = require('./auth.service');
const emailService = require('../../services/email.service');
const db = require('../../config/db');
const ApiError = require('../../utils/ApiError');


class UserService {
    static async createUser(userData, locationData) {
        try {
            await AuthService.validateEmailUniqueness(userData.email);
            
            const passwordHash = await AuthService.hashPassword(userData.password);
            
            const operations = [];
            
            operations.push(UserModel.createUserOperation({
                ...userData,
                passwordHash
            }));
            
            const results = await db.executeTransaction(operations);
            const user = results[0].rows[0];
            
            if (locationData && (locationData.lat || locationData.lng || locationData.city)) {
                try {
                    const locationOp = LocationModel.createLocationOperation(locationData, 'user', user.id);
                    await db.query(locationOp.text, locationOp.values);
                } catch (locErr) {
                    console.error('Failed to save location data:', locErr);
                }
            }
            
            const confirmationToken = await AuthService.generateEmailConfirmationToken(user.id);
            
            try {
                await emailService.sendWelcomeEmail({
                    email: user.email,
                    name: user.full_name,
                    confirmationToken: confirmationToken.token
                });
            } catch (emailErr) {
                console.error('Failed to send welcome email:', emailErr);
            }
            
            return this.getUserFullProfile(user.id);
        } catch (error) {
            if (error.code === '23505' && error.constraint === 'users_email_key') {
                throw new ApiError('Email already registered', 409);
            }
            throw error;
        }
    }
    
    static async getUserById(userId) {
        const user = await UserModel.findById(userId);
        
        if (!user) {
            throw new ApiError('User not found', 404);
        }
        
        return user;
    }

    static async getUserFullProfile(userId) {
        const user = await this.getUserById(userId);
        
        const location = await LocationModel.findByEntity('user', userId, 'primary');
        
        const profileImage = await ImageModel.findByEntity('user', userId, 'profile');
        const bannerImage = await ImageModel.findByEntity('user', userId, 'banner');
        
        const userTags = await TagModel.findTagsByEntityGrouped('user', userId);
        
        const profile = {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            uniqueUrl: user.unique_url,
            isEmailConfirmed: user.is_email_confirmed,
            createdAt: user.created_at
        };
        
        if (user.bio) profile.bio = user.bio;
        if (user.gender) profile.gender = user.gender;
        if (user.birthday) profile.birthday = user.birthday;
        if (user.preferences && Object.keys(user.preferences).length > 0) {
            profile.preferences = user.preferences;
        }
        
        if (location) profile.location = location;
        if (profileImage) profile.profileImage = profileImage;
        if (bannerImage) profile.bannerImage = bannerImage;
        
        if (userTags.interest) profile.interests = userTags.interest;
        if (userTags.skill) profile.skills = userTags.skill;
        
        return profile;
    }

    static async getUserWithProfile(userId) {
        return this.getUserFullProfile(userId);
    }

    static async loginUser(email, password) {
        const user = await UserModel.findByEmail(email);
        
        if (!user) {
            throw new ApiError('Invalid email or password', 401);
        }
        
        const isPasswordValid = await AuthService.verifyPassword(
            password, 
            user.password_hash
        );
        
        if (!isPasswordValid) {
          throw new ApiError('Invalid email or password', 401);
        }
        
        const token = await AuthService.generateAuthToken(user.id);
        
        const userProfile = await this.getUserFullProfile(user.id);
        
        return {
            user: userProfile,
            token: token.token
        };
    }
}

module.exports = UserService;