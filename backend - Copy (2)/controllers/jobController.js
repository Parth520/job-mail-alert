const JobListing = require('../models/JobListing');
const logger = require('../utils/logger');

// Get all jobs (public - last 7 days only)
exports.getAllJobs = async(req, res) => {
    try {
        const {
            page = 1,
                limit = 20,
                search = '',
                country = '',
                sector = '',
                jobType = '',
                salaryMin = 0,
                salaryMax = '',
                sortBy = 'postedDate',
                sortOrder = 'desc'
        } = req.query;

        // Calculate date 7 days ago
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        // Build query
        const query = {
            isActive: true,
            postedDate: { $gte: sevenDaysAgo } // Only last 7 days
        };

        // Search filter (title, company, description)
        if (search) {
            query.$text = { $search: search };
        }

        // Country filter
        if (country) {
            query.country = { $regex: country, $options: 'i' };
        }

        // Sector filter
        if (sector && sector !== 'All') {
            query.sector = sector;
        }

        // Job type filter
        if (jobType && jobType !== 'All') {
            query.jobType = jobType;
        }

        // Salary filter
        if (salaryMin || salaryMax) {
            query['salary.min'] = {};
            if (salaryMin) {
                query['salary.min'].$gte = parseInt(salaryMin);
            }
            if (salaryMax) {
                query['salary.max'] = { $lte: parseInt(salaryMax) };
            }
        }

        // Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Sort
        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // Execute query
        const jobs = await JobListing.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit))
            .select('-notifiedUsers'); // Don't send notified users array

        // Get total count for pagination
        const total = await JobListing.countDocuments(query);

        logger.info(`Jobs fetched: ${jobs.length} of ${total}`);

        res.status(200).json({
            success: true,
            data: {
                jobs,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            }
        });
    } catch (error) {
        logger.error(`Get jobs error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch jobs',
            error: error.message
        });
    }
};

// Get single job by ID
exports.getJobById = async(req, res) => {
    try {
        const { id } = req.params;

        const job = await JobListing.findById(id).select('-notifiedUsers');

        if (!job) {
            return res.status(404).json({
                success: false,
                message: 'Job not found'
            });
        }

        res.status(200).json({
            success: true,
            data: job
        });
    } catch (error) {
        logger.error(`Get job by ID error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch job',
            error: error.message
        });
    }
};

// Get filter options (countries, sectors, job types)
exports.getFilterOptions = async(req, res) => {
    try {
        // Get last 7 days only
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const countries = await JobListing.distinct('country', {
            isActive: true,
            postedDate: { $gte: sevenDaysAgo }
        });

        const sectors = await JobListing.distinct('sector', {
            isActive: true,
            postedDate: { $gte: sevenDaysAgo }
        });

        const jobTypes = await JobListing.distinct('jobType', {
            isActive: true,
            postedDate: { $gte: sevenDaysAgo }
        });

        res.status(200).json({
            success: true,
            data: {
                countries: countries.filter(c => c && c !== 'Not specified'),
                sectors: sectors.filter(s => s && s !== 'Unknown'),
                jobTypes: jobTypes.filter(j => j)
            }
        });
    } catch (error) {
        logger.error(`Get filter options error: ${error.message}`);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch filter options'
        });
    }
};