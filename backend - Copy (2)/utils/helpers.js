// Format phone number to E.164 format
exports.formatPhoneNumber = (phoneNumber) => {
    // Remove all non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');

    // Add country code if missing (assuming US)
    if (cleaned.length === 10) {
        return `+1${cleaned}`;
    }

    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
    }

    return `+${cleaned}`;
};

// Sanitize string for database storage
exports.sanitizeString = (str) => {
    return str.trim().replace(/[<>]/g, '');
};

// Calculate match score between job and user preferences
exports.calculateMatchScore = (job, preferences) => {
    let score = 0;
    let maxScore = 0;

    if (preferences.jobTitles && preferences.jobTitles.length > 0) {
        maxScore += 40;
        const titleMatch = preferences.jobTitles.some(title =>
            job.title.toLowerCase().includes(title.toLowerCase())
        );
        if (titleMatch) score += 40;
    }

    if (preferences.locations && preferences.locations.length > 0) {
        maxScore += 30;
        const locationMatch = preferences.locations.some(loc =>
            job.location.toLowerCase().includes(loc.toLowerCase())
        );
        if (locationMatch) score += 30;
    }

    if (preferences.salaryMin && job.salary && job.salary.min) {
        maxScore += 30;
        if (job.salary.min >= preferences.salaryMin) {
            score += 30;
        }
    }

    return maxScore > 0 ? (score / maxScore) * 100 : 100;
};