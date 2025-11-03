const express = require('express');
const router = express.Router();
const alertController = require('../controllers/alertController');
const contactController = require('../controllers/contactController');
const paymentController = require('../controllers/paymentController');
const jobController = require('../controllers/jobController');
const { validateSubscription, validateContact } = require('../middleware/validator');

router.post('/create-order', validateSubscription, paymentController.createSubscriptionOrder);
router.post('/verify-payment', paymentController.verifyPayment);
router.post('/payment-failed', paymentController.paymentFailed);

// Job Alert Routes
router.post('/subscribe', validateSubscription, alertController.subscribeToAlerts);
router.post('/unsubscribe', alertController.unsubscribe);
router.put('/preferences', alertController.updatePreferences);

// Job Listing Routes
router.get('/jobs', jobController.getAllJobs);
router.get('/jobs/:id', jobController.getJobById);
router.get('/filter-options', jobController.getFilterOptions);

// Contact Form Route
router.post('/contact', validateContact, contactController.submitContactForm);

// Health check
router.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date() });
});

module.exports = router;