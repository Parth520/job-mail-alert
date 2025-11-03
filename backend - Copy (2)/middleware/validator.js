const Joi = require('joi');

exports.validateSubscription = (req, res, next) => {
    const schema = Joi.object({
        email: Joi.string()
            .email()
            .required()
            .messages({
                'string.email': 'Please provide a valid email address',
                'any.required': 'Email is required'
            }),
        preferences: Joi.object({
            countries: Joi.array().items(Joi.string()).optional(),
            sectors: Joi.array().items(Joi.string().valid('Government', 'Private', 'Both')).optional(),
            jobTypes: Joi.array().items(Joi.string().valid('Full-time', 'Part-time', 'Contract', 'Internship', 'Remote')).optional(),
            jobTitles: Joi.array().items(Joi.string()).optional(),
            salaryMin: Joi.number().min(0).optional(),
            salaryMax: Joi.number().min(0).optional()
        }).optional()
    });

    const { error } = schema.validate(req.body);

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }

    next();
};

exports.validateContact = (req, res, next) => {
    const schema = Joi.object({
        name: Joi.string().min(2).max(100).required().messages({
            'string.min': 'Name must be at least 2 characters',
            'any.required': 'Name is required'
        }),
        email: Joi.string().email().required().messages({
            'string.email': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
        subject: Joi.string().min(3).max(200).required().messages({
            'string.min': 'Subject must be at least 3 characters',
            'any.required': 'Subject is required'
        }),
        message: Joi.string().min(10).max(2000).required().messages({
            'string.min': 'Message must be at least 10 characters',
            'any.required': 'Message is required'
        })
    });

    const { error } = schema.validate(req.body);

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.details[0].message
        });
    }

    next();
};