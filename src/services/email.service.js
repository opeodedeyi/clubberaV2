const nodemailer = require("nodemailer");
const ApiError = require("../utils/ApiError");

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT,
            secure: process.env.EMAIL_SECURE === "true",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });
    }

    async sendWelcomeEmail(userData) {
        const { email, name, confirmationToken } = userData;

        const baseUrl = process.env.FRONTEND_URL || "http://localhost:4000";
        const confirmationUrl = `${baseUrl}/confirm-email?token=${confirmationToken}`;

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: email,
            subject: "Welcome to Our Platform - Please Confirm Your Email",
            html: `
                <div>
                    <h1>Welcome, ${name}!</h1>
                    <p>Thank you for joining our platform. To complete your registration, please confirm your email address.</p>
                    <p>
                        <a href="${confirmationUrl}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">
                        Confirm Email
                        </a>
                    </p>
                    <p>This link will expire in 24 hours.</p>
                    <p>If you didn't create an account, please ignore this email.</p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            console.error("Email sending failed:", error);
            throw new ApiError("Failed to send email", 500);
        }
    }

    async sendPasswordlessLoginEmail(userData) {
        const { email, name, loginLink } = userData;

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: email,
            subject: "Your Login Link",
            html: `
                <div>
                    <h1>Login Link</h1>
                    <p>Hello ${name},</p>
                    <p>Here is your secure login link:</p>
                    <p>
                        <a href="${loginLink}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">
                        Log In Now
                        </a>
                    </p>
                    <p>This link will expire in 15 minutes.</p>
                    <p>If you didn't request this login link, please ignore this email.</p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            throw new ApiError("Failed to send login email", 500);
        }
    }

    async sendPasswordResetEmail(userData) {
        const { email, name, resetToken } = userData;

        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: email,
            subject: "Password Reset Request",
            html: `
                <div>
                    <h1>Password Reset</h1>
                    <p>Hello ${name},</p>
                    <p>We received a request to reset your password. Click the button below to set a new password:</p>
                    <p>
                        <a href="${resetUrl}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">
                        Reset Password
                        </a>
                    </p>
                    <p>This link will expire in 1 hour.</p>
                    <p>If you didn't request a password reset, please ignore this email.</p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            throw new ApiError("Failed to send password reset email", 500);
        }
    }

    async sendVerificationCodeEmail(userData) {
        const { email, name, verificationCode } = userData;

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: email,
            subject: "Verify Your Email",
            html: `
                <div>
                    <h1>Email Verification</h1>
                    <p>Hello ${name},</p>
                    <p>Your verification code is:</p>
                    <div style="padding: 10px; background-color: #f5f5f5; font-size: 24px; text-align: center; letter-spacing: 5px; font-family: monospace; margin: 20px 0;">
                        <strong>${verificationCode}</strong>
                    </div>
                    <p>This code will expire in 1 hour.</p>
                    <p>If you didn't request this code, please ignore this email.</p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            throw new ApiError("Failed to send verification code email", 500);
        }
    }

    async sendVerificationLinkEmail(userData) {
        const { email, name, verificationToken } = userData;

        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const verificationUrl = `${baseUrl}/api/users/verify-email?token=${verificationToken}`;

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: email,
            subject: "Verify Your Email",
            html: `
                <div>
                    <h1>Email Verification</h1>
                    <p>Hello ${name},</p>
                    <p>Please click the button below to verify your email address:</p>
                    <p>
                        <a href="${verificationUrl}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">
                        Verify Email
                        </a>
                    </p>
                    <p>This link will expire in 24 hours.</p>
                    <p>If you didn't create an account, please ignore this email.</p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            throw new ApiError("Failed to send verification email", 500);
        }
    }

    // Add these methods to your EmailService class

    async sendRoleUpdateEmail(userData) {
        const {
            email,
            name,
            communityName,
            previousRole,
            newRole,
            communityUrl,
        } = userData;

        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const communityLink = `${baseUrl}/communities/${communityUrl}`;

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: email,
            subject: `Your Role in ${communityName} Has Been Updated`,
            html: `
                <div>
                    <h1>Role Update</h1>
                    <p>Hello ${name},</p>
                    <p>Your role in the community "${communityName}" has been updated from <strong>${previousRole}</strong> to <strong>${newRole}</strong>.</p>
                    <p>
                        <a href="${communityLink}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px;">
                        Visit Community
                        </a>
                    </p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            throw new ApiError("Failed to send role update email", 500);
        }
    }

    async sendOwnershipTransferInitiatedEmail(userData) {
        const {
            email,
            name,
            communityName,
            targetUserName,
            expiresAt,
            cancelUrl,
            communityUrl,
        } = userData;

        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const communityLink = `${baseUrl}/communities/${communityUrl}`;

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: email,
            subject: `Ownership Transfer Initiated for ${communityName}`,
            html: `
                <div>
                    <h1>Ownership Transfer Initiated</h1>
                    <p>Hello ${name},</p>
                    <p>You have initiated a transfer of ownership for the community "${communityName}" to ${targetUserName}.</p>
                    <p>This transfer will expire on ${new Date(
                        expiresAt
                    ).toLocaleString()}.</p>
                    <p>If you wish to cancel this transfer, please click the button below:</p>
                    <p>
                        <a href="${cancelUrl}" style="padding: 10px 15px; background-color: #e74c3c; color: white; text-decoration: none; border-radius: 4px;">
                        Cancel Transfer
                        </a>
                    </p>
                    <p>
                        <a href="${communityLink}" style="padding: 10px 15px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px;">
                        Visit Community
                        </a>
                    </p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            throw new ApiError(
                "Failed to send ownership transfer notification",
                500
            );
        }
    }

    async sendOwnershipTransferOfferEmail(userData) {
        const {
            email,
            name,
            communityName,
            ownerName,
            expiresAt,
            acceptUrl,
            rejectUrl,
            communityUrl,
        } = userData;

        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const communityLink = `${baseUrl}/communities/${communityUrl}`;

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: email,
            subject: `You've Been Offered Ownership of ${communityName}`,
            html: `
                <div>
                    <h1>Ownership Transfer Offer</h1>
                    <p>Hello ${name},</p>
                    <p>${ownerName} has offered to transfer ownership of the community "${communityName}" to you.</p>
                    <p>This offer will expire on ${new Date(
                        expiresAt
                    ).toLocaleString()}.</p>
                    <p>Please respond to this offer by selecting one of the options below:</p>
                    <p>
                        <a href="${acceptUrl}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin-right: 10px;">
                        Accept Ownership
                        </a>
                        <a href="${rejectUrl}" style="padding: 10px 15px; background-color: #e74c3c; color: white; text-decoration: none; border-radius: 4px;">
                        Decline Offer
                        </a>
                    </p>
                    <p>
                        <a href="${communityLink}" style="padding: 10px 15px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px;">
                        Visit Community
                        </a>
                    </p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            throw new ApiError("Failed to send ownership transfer offer", 500);
        }
    }

    async sendOwnershipTransferCompletedEmail(userData) {
        const { email, name, communityName, newOwnerName, communityUrl } =
            userData;

        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const communityLink = `${baseUrl}/communities/${communityUrl}`;

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: email,
            subject: `Ownership of ${communityName} Has Been Transferred`,
            html: `
                <div>
                    <h1>Ownership Transfer Complete</h1>
                    <p>Hello ${name},</p>
                    <p>${newOwnerName} has accepted your offer to transfer ownership of the community "${communityName}".</p>
                    <p>You are now an organizer in this community.</p>
                    <p>
                        <a href="${communityLink}" style="padding: 10px 15px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px;">
                        Visit Community
                        </a>
                    </p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            throw new ApiError(
                "Failed to send ownership transfer completion email",
                500
            );
        }
    }

    async sendOwnershipConfirmationEmail(userData) {
        const { email, name, communityName, communityUrl } = userData;

        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const communityLink = `${baseUrl}/communities/${communityUrl}`;
        const adminLink = `${baseUrl}/communities/${communityUrl}/admin`;

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: email,
            subject: `You Are Now the Owner of ${communityName}`,
            html: `
                <div>
                    <h1>Ownership Confirmed</h1>
                    <p>Hello ${name},</p>
                    <p>You have successfully accepted ownership of the community "${communityName}".</p>
                    <p>You now have full administrative privileges for this community.</p>
                    <p>
                        <a href="${adminLink}" style="padding: 10px 15px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 4px; margin-right: 10px;">
                        Go to Admin Panel
                        </a>
                        <a href="${communityLink}" style="padding: 10px 15px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px;">
                        Visit Community
                        </a>
                    </p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            throw new ApiError(
                "Failed to send ownership confirmation email",
                500
            );
        }
    }

    async sendOwnershipTransferRejectedEmail(userData) {
        const { email, name, communityName, targetUserName, communityUrl } =
            userData;

        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const communityLink = `${baseUrl}/communities/${communityUrl}`;

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: email,
            subject: `Ownership Transfer for ${communityName} Was Declined`,
            html: `
                <div>
                    <h1>Ownership Transfer Declined</h1>
                    <p>Hello ${name},</p>
                    <p>${targetUserName} has declined your offer to transfer ownership of the community "${communityName}".</p>
                    <p>You remain the owner of this community.</p>
                    <p>
                        <a href="${communityLink}" style="padding: 10px 15px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px;">
                        Visit Community
                        </a>
                    </p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            throw new ApiError(
                "Failed to send ownership rejection notification",
                500
            );
        }
    }

    async sendOwnershipTransferCanceledEmail(userData) {
        const { email, name, communityName, ownerName, communityUrl } =
            userData;

        const baseUrl = process.env.FRONTEND_URL || "http://localhost:3000";
        const communityLink = `${baseUrl}/communities/${communityUrl}`;

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
            to: email,
            subject: `Ownership Transfer for ${communityName} Has Been Canceled`,
            html: `
                <div>
                    <h1>Ownership Transfer Canceled</h1>
                    <p>Hello ${name},</p>
                    <p>${ownerName} has canceled the ownership transfer of the community "${communityName}".</p>
                    <p>
                        <a href="${communityLink}" style="padding: 10px 15px; background-color: #3498db; color: white; text-decoration: none; border-radius: 4px;">
                        Visit Community
                        </a>
                    </p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
        } catch (error) {
            throw new ApiError(
                "Failed to send ownership cancellation notification",
                500
            );
        }
    }
}

module.exports = new EmailService();
