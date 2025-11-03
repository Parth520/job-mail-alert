require('dotenv').config();

console.log('=== Razorpay Configuration Test ===\n');

// Step 1: Check .env file is loading
console.log('Step 1: Checking .env file...');
const envLoaded = process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_SECRET;
if (envLoaded) {
    console.log('✅ .env file loaded\n');
} else {
    console.log('❌ .env file NOT loaded\n');
    console.log('Make sure you have a .env file in the backend folder!\n');
    process.exit(1);
}

// Step 2: Check Key ID
console.log('Step 2: Checking RAZORPAY_KEY_ID...');
const keyId = process.env.RAZORPAY_KEY_ID;
if (keyId) {
    console.log('✅ Key ID found:', keyId);

    if (keyId.startsWith('rzp_test_')) {
        console.log('✅ Test mode key (Good for testing)\n');
    } else if (keyId.startsWith('rzp_live_')) {
        console.log('⚠️  Live mode key (Need KYC approval)\n');
    } else {
        console.log('❌ Invalid key format!\n');
    }
} else {
    console.log('❌ Key ID NOT FOUND');
    console.log('Add this to your .env file:');
    console.log('RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx\n');
}

// Step 3: Check Key Secret
console.log('Step 3: Checking RAZORPAY_KEY_SECRET...');
const keySecret = process.env.RAZORPAY_KEY_SECRET;
if (keySecret) {
    console.log('✅ Key Secret found:', keySecret.substring(0, 10) + '...');
    console.log('Length:', keySecret.length, 'characters\n');
} else {
    console.log('❌ Key Secret NOT FOUND');
    console.log('Add this to your .env file:');
    console.log('RAZORPAY_KEY_SECRET=your_secret_key_here\n');
}

// Step 4: Test Razorpay package
console.log('Step 4: Testing Razorpay package...');
try {
    const Razorpay = require('razorpay');
    console.log('✅ Razorpay package installed\n');

    if (keyId && keySecret) {
        console.log('Step 5: Creating Razorpay instance...');
        const instance = new Razorpay({
            key_id: keyId,
            key_secret: keySecret
        });
        console.log('✅ Razorpay instance created successfully!\n');

        console.log('Step 6: Testing API connection...');
        instance.orders.create({
                amount: 4900,
                currency: 'INR',
                receipt: 'test_' + Date.now()
            })
            .then(order => {
                console.log('✅ SUCCESS! Razorpay is working perfectly!\n');
                console.log('Test Order Details:');
                console.log('  Order ID:', order.id);
                console.log('  Amount:', order.amount / 100, 'INR');
                console.log('  Status:', order.status);
                console.log('\n🎉 Your Razorpay setup is complete and working!\n');
                process.exit(0);
            })
            .catch(error => {
                console.log('❌ API Connection Failed!');
                console.log('Error:', error.error ? error.error.description : error.message);
                console.log('\nPossible reasons:');
                console.log('  - Wrong API keys');
                console.log('  - KYC not approved (for live mode)');
                console.log('  - Internet connection issue\n');
                process.exit(1);
            });
    } else {
        console.log('❌ Cannot test API - Missing keys\n');
        process.exit(1);
    }
} catch (error) {
    console.log('❌ Razorpay package NOT installed!');
    console.log('Run: npm install razorpay\n');
    process.exit(1);
}