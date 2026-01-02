require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./models');


// Import routes
const routes = require('./routes');
const importRoutes = require('./routes/import'); // Keep this import
const autoSyncService = require('./services/BiometricAutoSyncService');

const app = express();

// Middleware
app.use(cors());

// Global JSON parser for all routes
app.use(express.json());

// API Routes
app.use('/api', routes);
app.use('/api/import', importRoutes); // This is now clean and simple

// Simple health check route
app.get('/', (req, res) => res.send('Payroll API is running...'));



// Sync database models and start server
const PORT = process.env.PORT || 5000;



db.sequelize.sync({ force: false })
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
            console.log('🔄 Starting Biometric Auto-Sync Service...');
            autoSyncService.start();
            console.log('✅ Auto-sync service started - Will sync every 5 minutes');
            console.log(`📡 Next sync will run in approximately 5 minutes`);
        });
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
        
    });

// ============================================
// GRACEFUL SHUTDOWN - Stop auto-sync on server shutdown
// ============================================
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    
    // Stop auto-sync service
    autoSyncService.stop();
    console.log('✅ Auto-sync service stopped');
    
    server.close(() => {
        console.log('HTTP server closed');
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    
    // Stop auto-sync service
    autoSyncService.stop();
    console.log('✅ Auto-sync service stopped');
    
    server.close(() => {
        console.log('HTTP server closed');
        process.exit(0);
    });
});