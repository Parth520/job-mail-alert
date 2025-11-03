// ==========================================
// FILE: backend/routes/index.js
// ==========================================
// This file is the main router that combines all route modules
// It's optional - you can use api.js directly instead

const express = require('express');
const router = express.Router();
const apiRoutes = require('./api');

// Mount API routes
router.use('/api', apiRoutes);

// Root endpoint
router.get('/', (req, res) => {
    res.json({
        message: 'Welcome to JobAlert API',
        version: '1.0.0',
        endpoints: {
            subscribe: 'POST /api/subscribe',
            unsubscribe: 'POST /api/unsubscribe',
            updatePreferences: 'PUT /api/preferences',
            contact: 'POST /api/contact',
            health: 'GET /api/health'
        },
        documentation: 'https://github.com/yourusername/jobalert-api',
        status: 'operational'
    });
});

// 404 handler
router.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl
    });
});

module.exports = router;


// ==========================================
// ALTERNATIVE: If you don't want index.js
// ==========================================
// You can skip this file and use api.js directly in server.js
// Just change server.js line:
// 
// FROM:  const routes = require('./routes/index');
//        app.use('/', routes);
//
// TO:    const apiRoutes = require('./routes/api');
//        app.use('/api', apiRoutes);
//
// This is simpler and works just as well!