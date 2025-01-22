const emailService = require('../services/email/emailService');
const { supabase } = require('../config/supabase');

class NotificationController {
    async handlePolicyExpiryNotifications() {
        try {
            // Get policies expiring in the next 30 days
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
            
            const { data: expiringPolicies, error } = await supabase
                .from('policies')
                .select(`
                    *,
                    clients (*),
                    brokers (*)
                `)
                .lte('expiryDate', thirtyDaysFromNow.toISOString())
                .gte('expiryDate', new Date().toISOString())
                .eq('notificationSent', false);

            if (error) throw error;

            for (const policy of expiringPolicies) {
                await emailService.sendPolicyExpiryNotification(
                    policy.brokers,
                    policy.clients,
                    policy
                );

                // Update notification status
                await supabase
                    .from('policies')
                    .update({ notificationSent: true })
                    .eq('id', policy.id);
            }

            return { success: true, count: expiringPolicies.length };
        } catch (error) {
            console.error('Failed to process policy expiry notifications:', error);
            throw error;
        }
    }

    async handleTaskReminders() {
        try {
            // Get tasks due in the next 24 hours
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            const { data: dueTasks, error } = await supabase
                .from('tasks')
                .select(`
                    *,
                    brokers (*)
                `)
                .lte('dueDate', tomorrow.toISOString())
                .gte('dueDate', new Date().toISOString())
                .eq('reminderSent', false)
                .not('status', 'eq', 'completed');

            if (error) throw error;

            for (const task of dueTasks) {
                await emailService.sendTaskReminder(
                    task.brokers,
                    task
                );

                // Update reminder status
                await supabase
                    .from('tasks')
                    .update({ reminderSent: true })
                    .eq('id', task.id);
            }

            return { success: true, count: dueTasks.length };
        } catch (error) {
            console.error('Failed to process task reminders:', error);
            throw error;
        }
    }

    async handleDocumentUploadNotification(document, brokerId, clientId) {
        try {
            const { data: broker, error: brokerError } = await supabase
                .from('brokers')
                .select('*')
                .eq('id', brokerId)
                .single();

            if (brokerError) throw brokerError;

            const { data: client, error: clientError } = await supabase
                .from('clients')
                .select('*')
                .eq('id', clientId)
                .single();

            if (clientError) throw clientError;

            await emailService.sendDocumentUploadNotification(
                broker,
                client,
                document
            );

            return { success: true };
        } catch (error) {
            console.error('Failed to send document upload notification:', error);
            throw error;
        }
    }
}

module.exports = new NotificationController();
