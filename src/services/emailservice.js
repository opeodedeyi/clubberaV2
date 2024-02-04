const nodemailer = require('nodemailer')
require('dotenv').config()


const {
    COMPANY_NAME,
    NODEMAILER_EMAIL,
    NODEMAILER_PASS,
    COMPANY_WEBSITE,
} = process.env;

const transporter = nodemailer.createTransport({
    host: 'mail.privateemail.com',
    port: 465,
    secure: true,
    auth: {
        user: NODEMAILER_EMAIL,
        pass: NODEMAILER_PASS
    }
});


const sendEmail = async (to, subject, html) => {
    try {
        await transporter.sendMail({
            from: `${COMPANY_NAME} <${NODEMAILER_EMAIL}>`,
            to,
            subject,
            html
        });
        console.log('Email Sent');
    } catch (error) {
        console.log('Email not sent', error);
    }
};

function sendConfirmationEmail(email, token) {
    const emailOptions = {
        to: email,
        subject: 'Email Confirmation',
        text: `Click on this link to confirm your email: ${COMPANY_WEBSITE}/confirmemail/${token}`
    };

    sendEmail(emailOptions.to, emailOptions.subject, emailOptions.text);
}

function sendPasswordResetEmail(email, token) {
    const emailOptions = {
        to: email,
        subject: 'Password Reset',
        text: `Click on this link to reset your password: ${COMPANY_WEBSITE}/resetpassword/${token}`
    };

    sendEmail(emailOptions.to, emailOptions.subject, emailOptions.text);
}


module.exports = {
    sendEmail,
    sendConfirmationEmail,
    sendPasswordResetEmail,
};