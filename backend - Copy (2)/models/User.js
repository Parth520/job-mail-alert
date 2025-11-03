const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
    },
    preferences: {
        countries: [String],
        sectors: [String],
        jobTypes: [String],
        jobTitles: [String],
        salaryMin: { type: Number, default: 0 },
        salaryMax: { type: Number, default: null }
    },

    // Payment fields
    isPaid: {
        type: Boolean,
        default: false
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'completed', 'failed'],
        default: 'pending'
    },
    razorpayOrderId: {
        type: String,
        default: null
    },
    razorpayPaymentId: {
        type: String,
        default: null
    },
    razorpaySignature: {
        type: String,
        default: null
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    paymentDate: {
        type: Date,
        default: null
    },
    subscriptionExpiryDate: {
        type: Date,
        default: null
    },

    isActive: {
        type: Boolean,
        default: false
    },
    lastNotificationSent: {
        type: Date,
        default: null
    },
    notificationCount: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

userSchema.index({ email: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ isPaid: 1 });

module.exports = mongoose.model('User', userSchema);