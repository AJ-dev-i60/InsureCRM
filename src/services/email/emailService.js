const nodemailer = require('nodemailer');
const Email = require('email-templates');
const path = require('path');
const { google } = require('googleapis');

class EmailService {
    constructor() {
        this.initializeTransporter();
    }

    async initializeTransporter() {
        try {
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                process.env.GOOGLE_REDIRECT_URI
            );

            oauth2Client.setCredentials({
                refresh_token: process.env.GOOGLE_REFRESH_TOKEN
            });

            const accessToken = await oauth2Client.getAccessToken();

            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    type: 'OAuth2',
                    user: process.env.EMAIL_FROM,
                    clientId: process.env.GOOGLE_CLIENT_ID,
                    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
                    accessToken: accessToken.token
                }
            });

            this.emailClient = new Email({
                message: {
                    from: process.env.EMAIL_FROM
                },
                transport: this.transporter,
                views: {
                    root: path.join(__dirname, 'templates'),
                    options: {
                        extension: 'ejs'
                    }
                },
                juice: true,
                juiceResources: {
                    preserveImportant: true,
                    webResources: {
                        relativeTo: path.join(__dirname, 'templates')
                    }
                }
            });

            // Verify the connection
            await this.transporter.verify();
            console.log('Email service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize email service:', error);
            // Retry initialization after 5 minutes
            setTimeout(() => this.initializeTransporter(), 5 * 60 * 1000);
        }
    }

    async sendPolicyExpiryNotification(broker, client, policy) {
        try {
            await this.emailClient.send({
                template: 'policy-expiry',
                message: {
                    to: client.email,
                    cc: broker.email
                },
                locals: {
                    broker: broker,
                    client: client,
                    policy: policy,
                    expiryDate: new Date(policy.expiryDate).toLocaleDateString()
                }
            });
            return true;
        } catch (error) {
            console.error('Failed to send policy expiry notification:', error);
            throw error;
        }
    }

    async sendTaskReminder(broker, task) {
        try {
            await this.emailClient.send({
                template: 'task-reminder',
                message: {
                    to: broker.email
                },
                locals: {
                    broker: broker,
                    task: task,
                    dueDate: new Date(task.dueDate).toLocaleDateString()
                }
            });
            return true;
        } catch (error) {
            console.error('Failed to send task reminder:', error);
            throw error;
        }
    }

    async sendDocumentUploadNotification(broker, client, document) {
        try {
            await this.emailClient.send({
                template: 'document-upload',
                message: {
                    to: client.email,
                    cc: broker.email
                },
                locals: {
                    broker: broker,
                    client: client,
                    document: document
                }
            });
            return true;
        } catch (error) {
            console.error('Failed to send document upload notification:', error);
            throw error;
        }
    }
}

module.exports = new EmailService();
