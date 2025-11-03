const User = require('../models/User');
const paymentService = require('../services/paymentService');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

// Step 1: Create order when user submits email
exports.createSubscriptionOrder = async(req, res) => {
    try {
        console.log('📝 Received payment request:', { email: req.body.email, preferences: req.body.preferences });

        const { email, preferences } = req.body;

        // Check if user already exists and is paid
        let user = await User.findOne({ email });
        console.log('👤 User lookup result:', user ? 'Found existing user' : 'New user');

        if (user && user.isPaid && user.isActive) {
            console.log('⚠️ User already subscribed');
            return res.status(400).json({
                success: false,
                message: 'This email is already subscribed with an active subscription'
            });
        }

        // Validate preferences structure
        const validatedPreferences = {
            countries: (preferences && preferences.countries) || [],
            sectors: (preferences && preferences.sectors) || [],
            jobTypes: (preferences && preferences.jobTypes) || [],
            jobTitles: (preferences && preferences.jobTitles) || [],
            salaryMin: (preferences && preferences.salaryMin) || 0,
            salaryMax: (preferences && preferences.salaryMax) || null
        };

        console.log('✅ Validated preferences:', validatedPreferences);

        // Create or update user with pending status
        if (user) {
            user.preferences = validatedPreferences;
            user.paymentStatus = 'pending';
            await user.save();
            console.log('📝 Updated existing user');
        } else {
            user = await User.create({
                email,
                preferences: validatedPreferences,
                isPaid: false,
                paymentStatus: 'pending',
                isActive: false
            });
            console.log('✨ Created new user:', user._id);
        }

        // Create Razorpay order
        console.log('💳 Creating Razorpay order...');
        const orderResult = await paymentService.createOrder(email, user._id);
        console.log('💳 Razorpay order result:', orderResult);

        if (!orderResult.success) {
            console.error('❌ Razorpay order creation failed:', orderResult.error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create payment order',
                error: orderResult.error
            });
        }

        // Save order ID to user
        user.razorpayOrderId = orderResult.order.id;
        await user.save();

        console.log('✅ Payment order created successfully:', orderResult.order.id);

        res.status(200).json({
            success: true,
            message: 'Order created successfully',
            data: {
                orderId: orderResult.order.id,
                amount: orderResult.order.amount,
                currency: orderResult.order.currency,
                keyId: process.env.RAZORPAY_KEY_ID,
                email: email,
                userId: user._id
            }
        });
    } catch (error) {
        console.error('❌ Create order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order',
            error: error.message
        });
    }
};

// Step 2: Verify payment after user completes payment
exports.verifyPayment = async(req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            email
        } = req.body;

        // Verify signature
        const isValid = paymentService.verifyPaymentSignature(
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        );

        if (!isValid) {
            logger.error(`Invalid payment signature for order ${razorpay_order_id}`);
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed'
            });
        }

        // Find user and update payment status
        const user = await User.findOne({
            email,
            razorpayOrderId: razorpay_order_id
        });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Update user with payment details
        user.isPaid = true;
        user.isActive = true;
        user.paymentStatus = 'completed';
        user.razorpayPaymentId = razorpay_payment_id;
        user.razorpaySignature = razorpay_signature;
        user.amountPaid = parseInt(process.env.SUBSCRIPTION_AMOUNT) || 4900;
        user.paymentDate = new Date();

        // Set subscription expiry (1 year from now)
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        user.subscriptionExpiryDate = expiryDate;

        await user.save();

        logger.info(`Payment verified for ${email}: ${razorpay_payment_id}`);

        // Send welcome email
        await emailService.sendWelcomeEmail(email);

        res.status(200).json({
            success: true,
            message: 'Payment successful! You are now subscribed to job alerts.',
            data: {
                subscriptionActive: true,
                expiryDate: expiryDate
            }
        });
    } catch (error) {
        logger.error(`Payment verification error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Payment verification failed',
            error: error.message
        });
    }
};

// Handle payment failure
exports.paymentFailed = async(req, res) => {
    try {
        const { email, orderId } = req.body;

        const user = await User.findOne({
            email,
            razorpayOrderId: orderId
        });

        if (user) {
            user.paymentStatus = 'failed';
            await user.save();
            logger.info(`Payment failed for ${email}`);
        }

        res.status(200).json({
            success: true,
            message: 'Payment status updated'
        });
    } catch (error) {
        logger.error(`Payment failure handler error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to update payment status'
        });
    }
};