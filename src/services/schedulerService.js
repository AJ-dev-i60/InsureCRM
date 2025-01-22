const cron = require('node-cron');
const notificationController = require('../controllers/notificationController');

class SchedulerService {
    constructor() {
        // Schedule policy expiry notifications to run daily at 9 AM
        cron.schedule('0 9 * * *', async () => {
            console.log('Running scheduled policy expiry notifications check...');
            try {
                const result = await notificationController.handlePolicyExpiryNotifications();
                console.log(`Processed ${result.count} policy expiry notifications`);
            } catch (error) {
                console.error('Failed to process policy expiry notifications:', error);
            }
        });

        // Schedule task reminders to run every 4 hours
        cron.schedule('0 */4 * * *', async () => {
            console.log('Running scheduled task reminders check...');
            try {
                const result = await notificationController.handleTaskReminders();
                console.log(`Processed ${result.count} task reminders`);
            } catch (error) {
                console.error('Failed to process task reminders:', error);
            }
        });
    }
}

module.exports = new SchedulerService();
