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
}

module.exports = new EmailService();
