import sgMail from '@sendgrid/mail';
import jwt from 'jsonwebtoken'
import { ApiError } from './ApiError.js';

console.log(process.env.SENDGRID_API_KEY);
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async (email, fullname) => {

    const { FRONTEND_URL, JWT_SECRET_KEY,SENDGRID_API_KEY } = process.env

    if (!FRONTEND_URL || !JWT_SECRET_KEY)
        throw new ApiError(400, "missing environment variables")

    const token = jwt.sign({ email, fullname }, JWT_SECRET_KEY, { expiresIn: 1800 })

    const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;
console.log('going to send email');

    const msg = {
        to: email,
        from: 'BanarasMart123@gmail.com', // Use your verified sender
        subject: 'Password Reset Request',
        text: `Hi ${fullname} you or someone on your behalf requested a password reset. Click the link below to reset your password:\n\n${resetLink}`,
        html: `<p>Hi ${fullname} you or someone on your behalf requested a password reset. Click the link below to reset your password:</p><a href="${resetLink}">Reset Password</a>`,
    };

    return await sgMail.send(msg)
};
