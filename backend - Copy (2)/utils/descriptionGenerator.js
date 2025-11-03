// ============================================
// FILE: backend/utils/descriptionGenerator.js
// Template-Based Unique Description Generator
// ============================================

class DescriptionGenerator {
    constructor() {
        // Opening templates
        this.openings = [
            "Exciting opportunity for a {title} position at {company}!",
            "Join {company} as a {title} and take your career to the next level!",
            "We're looking for a talented {title} to join our team at {company}.",
            "{company} is hiring a {title} for an exciting new role.",
            "Great opportunity available for a {title} at {company}.",
            "Looking for a challenging role? {company} is seeking a {title}.",
            "Your dream job awaits! {company} needs a skilled {title}.",
            "Career opportunity alert! {title} position open at {company}."
        ];

        // Middle section templates (job details)
        this.middleSections = [
            "This {jobType} position in the {sector} sector is located in {location}.",
            "Based in {location}, this {jobType} role offers great career growth in the {sector} industry.",
            "Work from {location} in a {jobType} capacity within the {sector} sector.",
            "This {jobType} opportunity in {location} is perfect for professionals in the {sector} field.",
            "Located in {location}, this {jobType} position offers exciting challenges in the {sector} domain.",
            "Join our {location} office for this {jobType} role in the {sector} industry.",
            "This {jobType} position based in {location} provides excellent exposure in the {sector} sector.",
            "Be part of {company}'s {location} team in this {jobType} {sector} sector role."
        ];

        // Salary templates
        this.salaryTemplates = [
            "The position offers a competitive salary package of {salary}.",
            "Attractive compensation ranging from {salary} is offered for this role.",
            "Earn between {salary} in this rewarding position.",
            "This role comes with an excellent salary package of {salary}.",
            "Competitive pay scale of {salary} for the right candidate.",
            "The compensation for this position ranges from {salary}.",
            "Expect a salary between {salary} for this opportunity.",
            "This position offers competitive remuneration of {salary}."
        ];

        // Experience level templates
        this.experienceTemplates = [
            "We're looking for {experienceLevel} level professionals with relevant expertise.",
            "Ideal for {experienceLevel} level candidates ready to make an impact.",
            "This role is suited for {experienceLevel} level talent with strong skills.",
            "Seeking {experienceLevel} level professionals passionate about their work.",
            "{experienceLevel} level candidates with the right skills are encouraged to apply.",
            "Perfect opportunity for {experienceLevel} level professionals looking to grow.",
            "We need {experienceLevel} level experts who can contribute immediately.",
            "Great fit for {experienceLevel} level professionals seeking new challenges."
        ];

        // Call-to-action templates
        this.closingTemplates = [
            "Apply now to join a leading company in {country}!",
            "Don't miss this opportunity - submit your application today!",
            "Take the next step in your career and apply now!",
            "Ready to make a difference? Apply today and join our team!",
            "Submit your application now and start your journey with {company}!",
            "Be part of something great - apply for this position today!",
            "Your next career move starts here - apply now!",
            "Join {company} and advance your career in {country}!"
        ];

        // Additional skill-based templates
        this.skillTemplates = [
            "Strong technical skills and problem-solving abilities are essential.",
            "Excellent communication and teamwork skills required.",
            "Looking for candidates with passion for innovation and excellence.",
            "The ideal candidate should have strong analytical capabilities.",
            "We value creativity, dedication, and professional excellence.",
            "Seeking individuals with strong work ethic and leadership potential.",
            "Must have good interpersonal skills and ability to work independently.",
            "Looking for self-motivated professionals with attention to detail."
        ];
    }

    // Get random item from array
    getRandom(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    // Format salary
    formatSalary(salary) {
        if (!salary || !salary.min || !salary.max) {
            return "competitive compensation";
        }

        const currency = salary.currency || '₹';
        const min = this.formatNumber(salary.min);
        const max = this.formatNumber(salary.max);

        return `${currency}${min} - ${currency}${max}`;
    }

    // Format large numbers
    formatNumber(num) {
        if (num >= 100000) {
            return (num / 100000).toFixed(1) + ' Lakhs';
        }
        return num.toLocaleString();
    }

    // Generate unique description
    generate(job) {
        try {
            // Select random templates
            const opening = this.getRandom(this.openings);
            const middle = this.getRandom(this.middleSections);
            const salaryText = job.salary ? this.getRandom(this.salaryTemplates) : '';
            const experienceText = job.experienceLevel ? this.getRandom(this.experienceTemplates) : '';
            const skillText = this.getRandom(this.skillTemplates);
            const closing = this.getRandom(this.closingTemplates);

            // Replace placeholders
            let description = opening
                .replace(/{title}/g, job.title)
                .replace(/{company}/g, job.company);

            description += ' ' + middle
                .replace(/{jobType}/g, job.jobType || 'Full-time')
                .replace(/{sector}/g, job.sector || 'Private')
                .replace(/{location}/g, job.location)
                .replace(/{company}/g, job.company);

            if (job.salary) {
                description += ' ' + salaryText
                    .replace(/{salary}/g, this.formatSalary(job.salary));
            }

            if (job.experienceLevel) {
                description += ' ' + experienceText
                    .replace(/{experienceLevel}/g, job.experienceLevel);
            }

            description += ' ' + skillText;

            description += ' ' + closing
                .replace(/{company}/g, job.company)
                .replace(/{country}/g, job.country || 'India');

            return description;
        } catch (error) {
            // Fallback description
            return `Exciting ${job.jobType || 'Full-time'} opportunity for ${job.title} at ${job.company} in ${job.location}. Join a dynamic team and advance your career. Apply now!`;
        }
    }

    // Generate short description (for cards - 150 chars)
    generateShort(job) {
        const full = this.generate(job);
        if (full.length <= 150) return full;

        return full.substring(0, 147) + '...';
    }

    // Generate medium description (for expanded cards - 300 chars)
    generateMedium(job) {
        const full = this.generate(job);
        if (full.length <= 300) return full;

        return full.substring(0, 297) + '...';
    }
}

module.exports = new DescriptionGenerator();