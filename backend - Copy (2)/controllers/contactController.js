const logger = require('../utils/logger');
const nodemailer = require('nodemailer');

// Configure email transporter (using Gmail as example)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

exports.submitContactForm = async(req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Send email notification
        const mailOptions = {
            from: email,
            to: process.env.CONTACT_EMAIL || 'support@jobalert.com',
            subject: `Contact Form: ${subject}`,
            html: `
        New Contact Form Submission
        Name: ${name}
        Email: ${email}
        Subject: ${subject}
        Message:
        ${message}
      `
        };

        await transporter.sendMail(mailOptions);

        logger.info(`Contact form submitted by ${email}`);

        res.status(200).json({
            success: true,
            message: 'Your message has been sent successfully!'
        });
    } catch (error) {
        logger.error(`Contact form error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to send message. Please try again.',
            error: error.message
        });
    }
};