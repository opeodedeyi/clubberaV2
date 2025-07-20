// src/user/services/user.service.js

const UrlGenerator = require("../utils/UrlGenerator");
const UserModel = require("../models/user.model");
const LocationModel = require("../models/location.model");
const ImageModel = require("../models/image.model");
const TagModel = require("../models/tag.model");
const AuthService = require("./auth.service");
const emailService = require("../../services/email.service");
const db = require("../../config/db");
const ApiError = require("../../utils/ApiError");

class UserService {
    static async createUser(userData, locationData) {
        try {
            await AuthService.validateEmailUniqueness(userData.email);

            const passwordHash = await AuthService.hashPassword(
                userData.password
            );

            const uniqueUrl = await UrlGenerator.generateUniqueUserUrl(
                userData.fullName
            );

            const operations = [];

            operations.push(
                UserModel.createUserOperation({
                    ...userData,
                    passwordHash,
                    uniqueUrl,
                })
            );

            const results = await db.executeTransaction(operations);
            const user = results[0].rows[0];

            if (
                locationData &&
                (locationData.lat || locationData.lng || locationData.city)
            ) {
                try {
                    const locationOp = LocationModel.createLocationOperation(
                        locationData,
                        "user",
                        user.id
                    );
                    await db.query(locationOp.text, locationOp.values);
                } catch (locErr) {
                    console.error("Failed to save location data:", locErr);
                }
            }

            const confirmationToken =
                await AuthService.generateEmailConfirmationToken(user.id);

            try {
                await emailService.sendWelcomeEmail({
                    email: user.email,
                    name: user.full_name,
                    confirmationToken: confirmationToken.token,
                });
            } catch (emailErr) {
                console.error("Failed to send welcome email:", emailErr);
            }

            const authToken = await AuthService.generateAuthToken(user.id);
            const userProfile = await this.getUserFullProfile(user.id);

            return {
                user: userProfile,
                token: authToken.token,
            };
        } catch (error) {
            if (
                error.code === "23505" &&
                error.constraint === "users_email_key"
            ) {
                throw new ApiError("Email already registered", 409);
            }
            throw error;
        }
    }

    static async getUserById(userId) {
        const user = await UserModel.findById(userId);

        if (!user) {
            throw new ApiError("User not found", 404);
        }

        return user;
    }

    static async getUserFullProfile(userId) {
        const user = await this.getUserById(userId);

        const location = await LocationModel.findByEntity(
            "user",
            userId,
            "primary"
        );

        const profileImage = await ImageModel.findByEntity(
            "user",
            userId,
            "profile"
        );
        const bannerImage = await ImageModel.findByEntity(
            "user",
            userId,
            "banner"
        );

        const userTags = await TagModel.findTagsByEntityGrouped("user", userId);

        const profile = {
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            uniqueUrl: user.unique_url,
            isEmailConfirmed: user.is_email_confirmed,
            role: user.role || "user",
            isActive: user.is_active,
            createdAt: user.created_at,
            updatedAt: user.updated_at,
            createdAt: user.created_at,
        };

        if (user.bio) profile.bio = user.bio;
        if (user.gender) profile.gender = user.gender;
        if (user.birthday) profile.birthday = user.birthday;
        if (user.preferences && Object.keys(user.preferences).length > 0) {
            profile.preferences = user.preferences;
        }

        if (location) {
            profile.location = {
                city: location.name,
                lat: location.lat,
                lng: location.lng,
                address: location.address,
            };
        } else {
            profile.location = null;
        }

        if (profileImage) {
            profile.profileImage = {
                id: profileImage.id,
                key: profileImage.key,
                altText: profileImage.alt_text,
                provider: profileImage.provider,
                // Add URL if you have S3 base URL configured
                url:
                    profileImage.provider === "aws-s3" &&
                    process.env.S3_BASE_URL
                        ? `${process.env.S3_BASE_URL}/${profileImage.key}`
                        : profileImage.key,
            };
        } else {
            profile.profileImage = null;
        }

        if (bannerImage) {
            profile.bannerImage = {
                id: bannerImage.id,
                key: bannerImage.key,
                altText: bannerImage.alt_text,
                provider: bannerImage.provider,
                url:
                    bannerImage.provider === "aws-s3" && process.env.S3_BASE_URL
                        ? `${process.env.S3_BASE_URL}/${bannerImage.key}`
                        : bannerImage.key,
            };
        } else {
            profile.bannerImage = null;
        }

        if (userTags.interest) {
            profile.interests = userTags.interest.map(
                (interest) => interest.name
            );
        } else {
            profile.interests = [];
        }

        if (userTags.skill) {
            profile.skills = userTags.skill.map((skill) => skill.name);
        } else {
            profile.skills = [];
        }

        return profile;
    }

    static formatProfileWithOwnership(
        profile,
        isOwner = false,
        viewerId = null
    ) {
        const baseProfile = {
            id: profile.id,
            fullName: profile.fullName,
            uniqueUrl: profile.uniqueUrl,
            bio: profile.bio || null,
            gender: profile.gender || null, // Include gender
            profileImage: profile.profileImage,
            bannerImage: profile.bannerImage,
            location: profile.location,
            interests: profile.interests || [],
            skills: profile.skills || [],
            dateJoined: profile.createdAt, // Add date joined
            isOwner: isOwner, // Whether the viewer owns this profile
            isLoggedIn: !!viewerId, // Whether someone is logged in viewing this
        };

        // If the viewer owns the profile, include private information
        if (isOwner) {
            baseProfile.email = profile.email;
            baseProfile.isEmailConfirmed = profile.isEmailConfirmed;
            baseProfile.preferences = profile.preferences;
            baseProfile.birthday = profile.birthday; // Include birthday for owner
            baseProfile.role = profile.role;
            baseProfile.isActive = profile.isActive;
        }

        return baseProfile;
    }

    static async getUserProfileByUrl(uniqueUrl, viewerId = null) {
        const user = await UserModel.findByUniqueUrl(uniqueUrl);

        console.log("Found user:", user); // Debug log

        if (!user) {
            throw new ApiError("User not found", 404);
        }

        console.log("User is_active status:", user.is_active); // Debug log

        if (!user.is_active) {
            throw new ApiError("User profile not available", 404);
        }

        const fullProfile = await this.getUserFullProfile(user.id);
        const isOwner = viewerId && viewerId === user.id;
        return this.formatProfileWithOwnership(fullProfile, isOwner, viewerId);
    }

    static async getUserWithProfile(userId) {
        return this.getUserFullProfile(userId);
    }

    static async loginUser(email, password) {
        const user = await UserModel.findByEmail(email);

        if (!user) {
            throw new ApiError("Invalid email or password", 401);
        }

        const isPasswordValid = await AuthService.verifyPassword(
            password,
            user.password_hash
        );

        if (!isPasswordValid) {
            throw new ApiError("Invalid email or password", 401);
        }

        const token = await AuthService.generateAuthToken(user.id);

        const userProfile = await this.getUserFullProfile(user.id);

        return {
            user: userProfile,
            token: token.token,
        };
    }

    static async updateUserProfile(userId, profileData) {
        await this.getUserById(userId);

        await UserModel.updateProfile(userId, profileData);

        if (profileData.location) {
            try {
                const existingLocation = await LocationModel.findByEntity(
                    "user",
                    userId,
                    "primary"
                );

                if (existingLocation) {
                    const updateLocationOp = {
                        text: `
                            UPDATE locations
                            SET name = $1, lat = $2, lng = $3, address = $4, updated_at = NOW()
                            WHERE entity_type = $5 AND entity_id = $6 AND location_type = $7
                            RETURNING *
                            `,
                        values: [
                            profileData.location.city || existingLocation.name,
                            profileData.location.lat !== undefined
                                ? profileData.location.lat
                                : existingLocation.lat,
                            profileData.location.lng !== undefined
                                ? profileData.location.lng
                                : existingLocation.lng,
                            profileData.location.address ||
                                existingLocation.address,
                            "user",
                            userId,
                            "primary",
                        ],
                    };

                    await db.query(
                        updateLocationOp.text,
                        updateLocationOp.values
                    );
                } else {
                    const locationOp = LocationModel.createLocationOperation(
                        profileData.location,
                        "user",
                        userId
                    );
                    await db.query(locationOp.text, locationOp.values);
                }
            } catch (locErr) {
                console.error("Failed to update location data:", locErr);
            }
        }

        return this.getUserFullProfile(userId);
    }

    static async updateUserInterests(userId, interests) {
        await this.getUserById(userId);

        await TagModel.updateEntityTags("user", userId, interests, "interest");

        return this.getUserFullProfile(userId);
    }

    static async changeUserPassword(userId, currentPassword, newPassword) {
        const user = await UserModel.findById(userId);

        if (!user) {
            throw new ApiError("User not found", 404);
        }

        const isPasswordValid = await AuthService.verifyPassword(
            currentPassword,
            user.password_hash
        );

        if (!isPasswordValid) {
            throw new ApiError("Current password is incorrect", 401);
        }

        const newPasswordHash = await AuthService.hashPassword(newPassword);

        await UserModel.updatePassword(userId, newPasswordHash);

        return { message: "Password updated successfully" };
    }
}

module.exports = UserService;
