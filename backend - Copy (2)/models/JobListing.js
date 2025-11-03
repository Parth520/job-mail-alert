const mongoose = require('mongoose');

const jobListingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    company: {
        type: String,
        required: true,
        trim: true
    },
    location: {
        type: String,
        required: true
    },
    country: { // ADD THIS
        type: String,
        default: 'Not specified'
    },
    sector: { // ADD THIS
        type: String,
        enum: ['Government', 'Private', 'Unknown'],
        default: 'Unknown'
    },
    description: {
        type: String,
        required: true
    },
    salary: {
        min: Number,
        max: Number,
        currency: String
    },
    jobType: {
        type: String,
        enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'],
        default: 'Full-time'
    },
    experienceLevel: {
        type: String,
        enum: ['Entry', 'Mid', 'Senior', 'Lead', 'Executive']
    },
    applyUrl: {
        type: String,
        required: true
    },
    source: {
        type: String,
        required: true
    },
    postedDate: {
        type: Date,
        required: true
    },
    scrapedAt: {
        type: Date,
        default: Date.now
    },
    notifiedUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    isActive: {
        type: Boolean,
        default: true
    }
});

// Index for efficient querying
jobListingSchema.index({ title: 'text', description: 'text', company: 'text' });
jobListingSchema.index({ postedDate: -1 });
jobListingSchema.index({ source: 1, applyUrl: 1 }, { unique: true });
jobListingSchema.index({ country: 1 });
jobListingSchema.index({ sector: 1 });
jobListingSchema.index({ jobType: 1 });

module.exports = mongoose.model('JobListing', jobListingSchema);