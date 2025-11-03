const cron = require('node-cron');
const scraper = require('./scraper');
const emailService = require('./emailService');
const User = require('../models/User');
const JobListing = require('../models/JobListing');
const logger = require('../utils/logger');

class Scheduler {
    // Enhanced matching logic with new categories
    matchJobWithUser(job, user) {
        if (!user.preferences) return true;

        const { countries, sectors, jobTypes, jobTitles, salaryMin, salaryMax } = user.preferences;

        // Check country match
        if (countries && countries.length > 0) {
            const countryMatch = countries.some(country =>
                job.country.toLowerCase().includes(country.toLowerCase()) ||
                job.location.toLowerCase().includes(country.toLowerCase())
            );
            if (!countryMatch) return false;
        }

        // Check sector match
        if (sectors && sectors.length > 0) {
            if (!sectors.includes('Both') && !sectors.includes(job.sector)) {
                return false;
            }
        }

        // Check job type match
        if (jobTypes && jobTypes.length > 0) {
            if (!jobTypes.includes(job.jobType)) {
                return false;
            }
        }

        // Check job title match
        if (jobTitles && jobTitles.length > 0) {
            const titleMatch = jobTitles.some(title =>
                job.title.toLowerCase().includes(title.toLowerCase())
            );
            if (!titleMatch) return false;
        }

        // Check salary range
        if (salaryMin && job.salary && job.salary.min) {
            if (job.salary.min < salaryMin) return false;
        }

        if (salaryMax && job.salary && job.salary.max) {
            if (job.salary.max > salaryMax) return false;
        }

        return true;
    }

    // Process and notify users about new jobs
    async processNewJobs() {
        try {
            logger.info('Processing new jobs for notifications...');

            // Get all active PAID users
            const users = await User.find({
                isActive: true,
                isPaid: true // Only notify paid subscribers
            });

            // Get jobs from the last hour
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const newJobs = await JobListing.find({
                scrapedAt: { $gte: oneHourAgo },
                isActive: true
            });

            logger.info(`Found ${newJobs.length} new jobs to process for ${users.length} users`);

            let notificationsSent = 0;

            for (const job of newJobs) {
                const matchedUsers = users.filter(user =>
                    this.matchJobWithUser(job, user) &&
                    !job.notifiedUsers.includes(user._id)
                );

                if (matchedUsers.length > 0) {
                    logger.info(`Sending job "${job.title}" to ${matchedUsers.length} users`);

                    const results = await emailService.sendBulkAlerts(matchedUsers, job);

                    const notifiedUserIds = results
                        .filter(r => r.success)
                        .map(r => r.userId);

                    await JobListing.findByIdAndUpdate(job._id, {
                        $push: { notifiedUsers: { $each: notifiedUserIds } }
                    });

                    for (const userId of notifiedUserIds) {
                        await User.findByIdAndUpdate(userId, {
                            $inc: { notificationCount: 1 },
                            lastNotificationSent: new Date()
                        });
                    }

                    notificationsSent += notifiedUserIds.length;
                }
            }

            logger.info(`Sent ${notificationsSent} notifications`);
        } catch (error) {
            logger.error(`Error processing jobs: ${error.message}`);
        }
    }

    // Start job scraping scheduler
    startJobScraping() {
        const interval = process.env.SCRAPE_INTERVAL_MINUTES || 60;

        cron.schedule(`*/${interval} * * * *`, async() => {
            logger.info('Starting scheduled job scraping...');

            try {
                await scraper.scrapeAllSources();
                await this.processNewJobs();
            } catch (error) {
                logger.error(`Scheduled scraping error: ${error.message}`);
            }
        });

        logger.info(`Job scraping scheduler started (every ${interval} minutes)`);

        // Run immediately on startup
        setTimeout(async() => {
            logger.info('Running initial scrape...');
            await scraper.scrapeAllSources();
            await this.processNewJobs();
        }, 5000);
    }
}

module.exports = new Scheduler();