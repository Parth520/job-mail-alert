const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('../utils/logger');

class PaymentService {
    constructor() {
        if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
            this.razorpay = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET
            });
            this.enabled = true;
            logger.info('Razorpay Payment Service enabled');
            console.log('✅ Razorpay enabled:', process.env.RAZORPAY_KEY_ID.substring(0, 15) + '...');
        } else {
            this.razorpay = null;
            this.enabled = false;
            logger.warn('Razorpay disabled - credentials not found');
            console.log('⚠️ Razorpay disabled - Add credentials to .env');
        }

        this.amount = parseInt(process.env.SUBSCRIPTION_AMOUNT) || 4900;
        this.currency = process.env.CURRENCY || 'INR';
    }

    // Create Razorpay order
    async createOrder(email, userId) {
        console.log('📝 PaymentService.createOrder called with:', { email, userId, amount: this.amount });

        if (!this.enabled) {
            console.log('⚠️ Razorpay is disabled - returning mock order');
            return {
                success: true,
                order: {
                    id: 'mock_order_' + Date.now(),
                    amount: this.amount,
                    currency: this.currency,
                    mock: true
                }
            };
        }

        try {
            const options = {
                amount: this.amount,
                currency: this.currency,
                receipt: `rcpt_${Date.now().toString().slice(-10)}`,
                notes: {
                    email: email,
                    userId: userId.toString(),
                    purpose: 'Job Alert Subscription'
                }
            };

            console.log('💳 Calling Razorpay API with options:', options);
            const order = await this.razorpay.orders.create(options);

            console.log('✅ Razorpay order created:', order.id);
            logger.info(`Razorpay order created: ${order.id} for ${email}`);

            return {
                success: true,
                order: order
            };
        } catch (error) {
            // Detailed error logging
            console.error('❌ Razorpay API error details:');
            console.error('   Error message:', error.message);
            console.error('   Error name:', error.name);
            console.error('   Error code:', error.statusCode || error.code);

            // Check if it's a Razorpay specific error
            if (error.error) {
                console.error('   Razorpay error object:', JSON.stringify(error.error, null, 2));
            }

            // Full error stack
            console.error('   Full error:', error);

            logger.error(`Razorpay order creation failed: ${error.message || 'Unknown error'}`);

            return {
                success: false,
                error: error.message || error.description || 'Razorpay API error',
                details: error.error || null
            };
        }
    }

    // Verify payment signature
    verifyPaymentSignature(orderId, paymentId, signature) {
        if (!this.enabled) {
            // Auto-verify for testing
            return true;
        }

        try {
            const generatedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(`${orderId}|${paymentId}`)
                .digest('hex');

            return generatedSignature === signature;
        } catch (error) {
            logger.error(`Signature verification failed: ${error.message}`);
            return false;
        }
    }

    // Get payment details
    async getPaymentDetails(paymentId) {
        if (!this.enabled) {
            return { mock: true };
        }

        try {
            const payment = await this.razorpay.payments.fetch(paymentId);
            return payment;
        } catch (error) {
            logger.error(`Failed to fetch payment: ${error.message}`);
            return null;
        }
    }
}

module.exports = new PaymentService();