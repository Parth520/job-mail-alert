const User = require('../models/User');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

exports.subscribeToAlerts = async(req, res) => {
    try {
        const { email, preferences } = req.body;

        // Check if user already exists
        let user = await User.findOne({ email });

        if (user) {
            // Update existing user
            user.isActive = true;
            user.preferences = preferences || user.preferences;
            await user.save();

            return res.status(200).json({
                success: true,
                message: 'Your subscription has been reactivated!',
                user: {
                    email: user.email,
                    notificationCount: user.notificationCount
                }
            });
        }

        // Create new user
        user = await User.create({
            email,
            preferences,
            isActive: true
        });

        // Send welcome SMS
        await emailService.sendWelcomeEmail(email);

        logger.info(`New user subscribed: ${email}`);

        res.status(201).json({
            success: true,
            message: 'Successfully subscribed to job alerts!',
            user: {
                email: user.email,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        logger.error(`Subscription error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to subscribe. Please try again.',
            error: error.message
        });
    }
};

exports.unsubscribe = async(req, res) => {
    try {
        const { email } = req.body;

        const user = await User.findOneAndUpdate({ email }, { isActive: false }, { new: true });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'email number not found'
            });
        }

        logger.info(`User unsubscribed: ${email}`);

        res.status(200).json({
            success: true,
            message: 'Successfully unsubscribed from job alerts'
        });
    } catch (error) {
        logger.error(`Unsubscribe error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to unsubscribe',
            error: error.message
        });
    }
};

exports.updatePreferences = async(req, res) => {
    try {
        const { email, preferences } = req.body;

        const user = await User.findOneAndUpdate({ email }, { preferences }, { new: true });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'email number not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Preferences updated successfully',
            preferences: user.preferences
        });
    } catch (error) {
        logger.error(`Update preferences error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to update preferences',
            error: error.message
        });
    }
};