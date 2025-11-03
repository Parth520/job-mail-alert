const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const JobListing = require('../models/JobListing');
const descriptionGenerator = require('../utils/descriptionGenerator');
const logger = require('../utils/logger'); // ← MAKE SURE THIS LINE EXISTS

class JobScraper {
    constructor() {
        this.browser = null;

        // Country detection keywords
        this.countryKeywords = {
            'India': ['india', 'mumbai', 'delhi', 'bangalore', 'bengaluru', 'hyderabad', 'chennai', 'pune', 'kolkata', 'ahmedabad', 'jaipur', 'noida', 'gurugram', 'gurgaon'],
            'USA': ['usa', 'united states', 'america', 'new york', 'san francisco', 'los angeles', 'chicago', 'boston', 'seattle', 'austin', 'dallas', 'miami', 'california', 'texas'],
            'UK': ['uk', 'united kingdom', 'london', 'manchester', 'birmingham', 'edinburgh', 'glasgow', 'liverpool', 'bristol'],
            'Canada': ['canada', 'toronto', 'vancouver', 'montreal', 'ottawa', 'calgary', 'edmonton'],
            'Australia': ['australia', 'sydney', 'melbourne', 'brisbane', 'perth', 'adelaide'],
            'Germany': ['germany', 'berlin', 'munich', 'hamburg', 'frankfurt', 'cologne'],
            'Singapore': ['singapore'],
            'UAE': ['uae', 'dubai', 'abu dhabi', 'emirates'],
            'Remote': ['remote', 'work from home', 'wfh', 'anywhere']
        };

        // Government sector keywords
        this.governmentKeywords = [
            'government', 'govt', 'public sector', 'psu', 'state government',
            'central government', 'ministry', 'department', 'municipal', 'federal',
            'civil service', 'public service', 'defense', 'defence', 'military',
            'police', 'railway', 'postal', 'ongc', 'bhel', 'ntpc', 'sail', 'gail',
            'coal india', 'iocl', 'bpcl', 'hpcl', 'upsc', 'ssc', 'bank of india',
            'state bank', 'canara bank', 'union bank', 'punjab national bank',
            'council', 'authority', 'commission', 'board', 'corporation',
            'aiims', 'iit', 'nit', 'central university'
        ];

        // Private sector indicators
        this.privateSectorKeywords = [
            'private', 'pvt ltd', 'limited', 'inc', 'corp', 'llc', 'llp',
            'technologies', 'solutions', 'consulting', 'services', 'systems',
            'software', 'tech', 'digital', 'innovation', 'startup'
        ];
    }

    async initialize() {
        this.browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
        }
    }

    // Detect country from location string
    detectCountry(location, title = '', description = '') {
        const searchText = `${location} ${title} ${description}`.toLowerCase();

        // Check each country's keywords
        for (const [country, keywords] of Object.entries(this.countryKeywords)) {
            for (const keyword of keywords) {
                if (searchText.includes(keyword)) {
                    return country;
                }
            }
        }

        // Default to location if no match
        return location.split(',')[0] || 'Not specified';
    }

    // Detect sector (Government or Private)
    detectSector(company, title = '', description = '') {
        const searchText = `${company} ${title} ${description}`.toLowerCase();

        // Check for government keywords
        for (const keyword of this.governmentKeywords) {
            if (searchText.includes(keyword)) {
                return 'Government';
            }
        }

        // Check for private sector indicators
        for (const keyword of this.privateSectorKeywords) {
            if (searchText.includes(keyword)) {
                return 'Private';
            }
        }

        // Default to Private if uncertain
        return 'Private';
    }

    // Extract salary from text
    extractSalary(text) {
        if (!text) return null;

        const salaryPatterns = [
            // Indian format: ₹5,00,000 - ₹10,00,000
            /₹\s*(\d+(?:,\d+)*)\s*(?:-|to)\s*₹?\s*(\d+(?:,\d+)*)/i,
            // Dollar format: $50,000 - $100,000
            /\$\s*(\d+(?:,\d+)*)\s*(?:-|to)\s*\$?\s*(\d+(?:,\d+)*)/i,
            // LPA format: 5-10 LPA
            /(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lakhs?)/i,
            // K format: 50K - 100K
            /(\d+)\s*k\s*(?:-|to)\s*(\d+)\s*k/i
        ];

        for (const pattern of salaryPatterns) {
            const match = text.match(pattern);
            if (match) {
                let min = parseInt(match[1].replace(/,/g, ''));
                let max = parseInt(match[2].replace(/,/g, ''));

                // Convert LPA to actual amount
                if (text.toLowerCase().includes('lpa') || text.toLowerCase().includes('lakh')) {
                    min *= 100000;
                    max *= 100000;
                }

                // Convert K to thousands
                if (text.toLowerCase().includes('k')) {
                    min *= 1000;
                    max *= 1000;
                }

                return {
                    min,
                    max,
                    currency: text.includes('₹') ? '₹' : '$'
                };
            }
        }

        return null;
    }

    // Scrape Indeed Jobs (Enhanced)
    async scrapeIndeed(searchQuery = 'software developer', location = 'India') {
        const jobs = [];

        try {
            const page = await this.browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(searchQuery)}&l=${encodeURIComponent(location)}`;
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

            const content = await page.content();
            const $ = cheerio.load(content);

            $('.job_seen_beacon').each((index, element) => {
                const $element = $(element);

                const title = $element.find('.jobTitle').text().trim();
                const company = $element.find('[data-testid="company-name"]').text().trim();
                const locationText = $element.find('[data-testid="text-location"]').text().trim();
                const description = $element.find('.job-snippet').text().trim();
                const salaryText = $element.find('.salary-snippet').text().trim();

                if (title && company) {
                    // Detect country and sector
                    const country = this.detectCountry(locationText, title, description);
                    const sector = this.detectSector(company, title, description);
                    const salary = this.extractSalary(salaryText);

                    const job = {
                        title,
                        company,
                        location: locationText,
                        country,
                        sector,
                        description,
                        salary,
                        applyUrl: 'https://www.indeed.com' + $element.find('.jcs-JobTitle').attr('href'),
                        source: 'Indeed',
                        postedDate: new Date(),
                        jobType: this.detectJobType(title, description)
                    };

                    jobs.push(job);
                }
            });

            await page.close();
            logger.info(`Scraped ${jobs.length} jobs from Indeed`);
        } catch (error) {
            logger.error(`Indeed scraping error: ${error.message}`);
        }

        return jobs;
    }

    // Detect job type from title and description
    detectJobType(title, description) {
        const text = `${title} ${description}`.toLowerCase();

        if (text.includes('remote') || text.includes('work from home') || text.includes('wfh')) {
            return 'Remote';
        }
        if (text.includes('intern') || text.includes('internship')) {
            return 'Internship';
        }
        if (text.includes('contract') || text.includes('freelance') || text.includes('temporary')) {
            return 'Contract';
        }
        if (text.includes('part time') || text.includes('part-time')) {
            return 'Part-time';
        }

        return 'Full-time';
    }

    // Scrape LinkedIn Jobs (Enhanced)
    async scrapeLinkedIn(searchQuery = 'developer', location = 'India') {
        const jobs = [];

        try {
            const page = await this.browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(searchQuery)}&location=${encodeURIComponent(location)}`;
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

            await page.waitForSelector('.jobs-search__results-list', { timeout: 5000 });

            const content = await page.content();
            const $ = cheerio.load(content);

            $('.base-card').each((index, element) => {
                const $element = $(element);

                const title = $element.find('.base-search-card__title').text().trim();
                const company = $element.find('.base-search-card__subtitle').text().trim();
                const locationText = $element.find('.job-search-card__location').text().trim();
                const description = $element.find('.base-search-card__info').text().trim();
                const applyUrl = $element.find('a.base-card__full-link').attr('href');

                if (title && company && applyUrl) {
                    // Detect country and sector
                    const country = this.detectCountry(locationText, title, description);
                    const sector = this.detectSector(company, title, description);
                    const salary = this.extractSalary(description);

                    const job = {
                        title,
                        company,
                        location: locationText,
                        country,
                        sector,
                        description,
                        salary,
                        applyUrl,
                        source: 'LinkedIn',
                        postedDate: new Date(),
                        jobType: this.detectJobType(title, description)
                    };

                    jobs.push(job);
                }
            });

            await page.close();
            logger.info(`Scraped ${jobs.length} jobs from LinkedIn`);
        } catch (error) {
            logger.error(`LinkedIn scraping error: ${error.message}`);
        }

        return jobs;
    }

    // Scrape Remote OK (Enhanced)
    async scrapeRemoteOK() {
        const jobs = [];

        try {
            const response = await axios.get('https://remoteok.com/api', {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            const listings = response.data.slice(1, 51);

            listings.forEach(item => {
                const locationText = item.location || 'Remote';
                const company = item.company || 'Not specified';
                const description = item.description || 'No description available';

                // Detect country and sector
                const country = this.detectCountry(locationText, item.position, description);
                const sector = this.detectSector(company, item.position, description);

                jobs.push({
                    title: item.position,
                    company,
                    location: locationText,
                    country,
                    sector,
                    description,
                    salary: {
                        min: item.salary_min || 0,
                        max: item.salary_max || 0,
                        currency: 'USD'
                    },
                    applyUrl: item.url,
                    source: 'RemoteOK',
                    postedDate: new Date(item.date),
                    jobType: 'Remote'
                });
            });

            logger.info(`Scraped ${jobs.length} jobs from RemoteOK`);
        } catch (error) {
            logger.error(`RemoteOK scraping error: ${error.message}`);
        }

        return jobs;
    }

    // Scrape Naukri.com (India-specific)
    async scrapeNaukri(searchQuery = 'software engineer') {
        const jobs = [];

        try {
            const page = await this.browser.newPage();
            await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

            const url = `https://www.naukri.com/${encodeURIComponent(searchQuery)}-jobs`;
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

            await page.waitForSelector('.srp-jobtuple-wrapper', { timeout: 5000 });

            const content = await page.content();
            const $ = cheerio.load(content);

            $('.srp-jobtuple-wrapper').each((index, element) => {
                const $element = $(element);

                const title = $element.find('.title').text().trim();
                const company = $element.find('.comp-name').text().trim();
                const locationText = $element.find('.locWdth').text().trim();
                const description = $element.find('.job-description').text().trim();
                const salaryText = $element.find('.sal').text().trim();
                const experienceText = $element.find('.exp').text().trim();
                const applyUrl = $element.find('.title').attr('href');

                if (title && company) {
                    // Detect country (mostly India for Naukri)
                    const country = this.detectCountry(locationText, title, description);
                    const sector = this.detectSector(company, title, description);
                    const salary = this.extractSalary(salaryText);

                    const job = {
                        title,
                        company,
                        location: locationText,
                        country,
                        sector,
                        description,
                        salary,
                        experienceLevel: this.detectExperienceLevel(experienceText),
                        applyUrl: applyUrl ? `https://www.naukri.com${applyUrl}` : '#',
                        source: 'Naukri',
                        postedDate: new Date(),
                        jobType: this.detectJobType(title, description)
                    };

                    jobs.push(job);
                }
            });

            await page.close();
            logger.info(`Scraped ${jobs.length} jobs from Naukri`);
        } catch (error) {
            logger.error(`Naukri scraping error: ${error.message}`);
        }

        return jobs;
    }

    // Detect experience level
    detectExperienceLevel(text) {
        if (!text) return null;

        const lowerText = text.toLowerCase();

        if (lowerText.includes('0-1') || lowerText.includes('fresher') || lowerText.includes('entry')) {
            return 'Entry';
        }
        if (lowerText.includes('1-3') || lowerText.includes('2-4')) {
            return 'Mid';
        }
        if (lowerText.includes('5-8') || lowerText.includes('senior')) {
            return 'Senior';
        }
        if (lowerText.includes('8+') || lowerText.includes('lead') || lowerText.includes('principal')) {
            return 'Lead';
        }
        if (lowerText.includes('manager') || lowerText.includes('director') || lowerText.includes('vp')) {
            return 'Executive';
        }

        return null;
    }

    // Save jobs to database
    // Save jobs to database
    async saveJobs(jobs) {
        let savedCount = 0;
        let duplicateCount = 0;

        for (const jobData of jobs) {
            try {
                // Check if job already exists (prevent duplicates)
                const existingJob = await JobListing.findOne({
                    source: jobData.source,
                    applyUrl: jobData.applyUrl
                });

                if (!existingJob) {
                    // Generate unique description
                    jobData.description = descriptionGenerator.generate(jobData);

                    await JobListing.create(jobData);
                    savedCount++;
                    logger.info(`Saved: ${jobData.title} at ${jobData.company} (${jobData.country}, ${jobData.sector})`);
                } else {
                    duplicateCount++;
                }
            } catch (error) {
                logger.error(`Error saving job: ${error.message}`);
            }
        }

        logger.info(`Saved ${savedCount} new jobs, ${duplicateCount} duplicates skipped`);
        return savedCount;
    }

    // Main scraping function with all sources
    async scrapeAllSources() {
        await this.initialize();

        try {
            logger.info('Starting job scraping from all sources...');

            // Scrape multiple queries for better coverage
            const queries = [
                'software developer',
                'data analyst',
                'product manager',
                'business analyst',
                'marketing manager',
                'sales executive',
                'hr manager'
            ];

            const locations = ['India', 'United States', 'Remote'];

            let allJobs = [];

            // Scrape Indeed for multiple queries
            for (const query of queries) {
                for (const location of locations) {
                    const indeedJobs = await this.scrapeIndeed(query, location);
                    allJobs = allJobs.concat(indeedJobs);

                    // Add delay to avoid rate limiting
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // Scrape LinkedIn
            const linkedInJobs = await this.scrapeLinkedIn('software developer', 'India');
            allJobs = allJobs.concat(linkedInJobs);

            // Scrape RemoteOK
            const remoteOKJobs = await this.scrapeRemoteOK();
            allJobs = allJobs.concat(remoteOKJobs);

            // Scrape Naukri (India-specific)
            const naukriJobs = await this.scrapeNaukri('software engineer');
            allJobs = allJobs.concat(naukriJobs);

            const savedCount = await this.saveJobs(allJobs);

            logger.info(`Scraping complete. Total jobs found: ${allJobs.length}, Saved: ${savedCount}`);

            return allJobs;
        } catch (error) {
            logger.error(`Scraping error: ${error.message}`);
            throw error;
        } finally {
            await this.close();
        }
    }
}

module.exports = new JobScraper();