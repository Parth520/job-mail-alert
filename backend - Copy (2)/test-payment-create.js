require('dotenv').config();
const mongoose = require('mongoose');
const paymentService = require('./services/paymentService');
const User = require('./models/User');

async function testPaymentCreate() {
    console.log('🧪 Testing Payment Order Creation...\n');

    try {
        // Connect to database
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB connected\n');

        // Test email
        const testEmail = 'test' + Date.now() + '@example.com';
        console.log('📧 Test email:', testEmail);

        // Create test user
        console.log('\n1. Creating test user...');
        const user = await User.create({
            email: testEmail,
            preferences: {
                countries: ['India'],
                sectors: ['Private'],
                jobTypes: ['Full-time']
            },
            isPaid: false,
            paymentStatus: 'pending',
            isActive: false
        });
        console.log('✅ User created:', user._id);

        // Create Razorpay order
        console.log('\n2. Creating Razorpay order...');
        const orderResult = await paymentService.createOrder(testEmail, user._id);

        if (orderResult.success) {
            console.log('✅ Order created successfully!');
            console.log('   Order ID:', orderResult.order.id);
            console.log('   Amount:', orderResult.order.amount / 100, 'INR');
            console.log('   Currency:', orderResult.order.currency);
            console.log('\n🎉 Payment system is working!\n');
        } else {
            console.log('❌ Order creation failed:', orderResult.error);
        }

        // Cleanup
        await User.deleteOne({ _id: user._id });
        console.log('🧹 Test user deleted');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await mongoose.connection.close();
    }
}

testPaymentCreate();