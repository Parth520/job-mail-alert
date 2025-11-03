const sgMail = require('@sendgrid/mail');
const logger = require('../utils/logger');

class EmailService {
    constructor() {
        if (process.env.SENDGRID_API_KEY) {
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'alerts@jobalert.com';
            this.fromName = process.env.SENDGRID_FROM_NAME || 'JobAlert';
            this.enabled = true;
            logger.info('Email Service enabled with SendGrid');
        } else {
            this.enabled = false;
            logger.warn('Email Service disabled - SendGrid API key not found');
        }
    }

    // Format job alert email HTML
    formatJobAlertHTML(job) {
            const jobUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/#jobs?id=${job._id}`;

            return `
    
    
    
      
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #4A90E2, #7BB8F5); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .job-title { font-size: 24px; color: #4A90E2; margin-bottom: 10px; }
        .job-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .info-row { margin: 10px 0; }
        .label { font-weight: bold; color: #666; }
        .btn { display: inline-block; background: #4A90E2; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 10px 5px; }
        .btn-secondary { background: #7BB8F5; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
      
    
    
      
        
          🎯 New Job Alert!
        
        
          ${job.title}
          
            
              Company: ${job.company}
            
            
              Location: ${job.location}
            
            ${job.country ? `
            
              Country: ${job.country}
            
            ` : ''}
            ${job.sector && job.sector !== 'Unknown' ? `
            
              Sector: ${job.sector}
            
            ` : ''}
            ${job.salary ? `
            
              Salary: ${job.salary.currency || '$'}${job.salary.min.toLocaleString()} - ${job.salary.currency || '$'}${job.salary.max.toLocaleString()}
            
            ` : ''}
            
              Type: ${job.jobType}
            
            
              Posted: ${new Date(job.postedDate).toLocaleDateString()}
            
          
          
            Apply on ${job.source} →
            View All Jobs →
          
        
        
          You're receiving this because you subscribed to JobAlert
          Unsubscribe
        
      
    
    
  `;
}

  // Send email
  async sendEmail(to, subject, html) {
    if (!this.enabled) {
      logger.info(`[MOCK EMAIL] Would send to ${to}: ${subject}`);
      console.log(`📧 MOCK EMAIL to ${to}:\nSubject: ${subject}\n`);
      return { success: true, messageId: 'mock-' + Date.now(), mock: true };
    }

    try {
      const msg = {
        to: to,
        from: {
          email: this.fromEmail,
          name: this.fromName
        },
        subject: subject,
        html: html
      };

      const result = await sgMail.send(msg);
      logger.info(`Email sent to ${to}`);
      return { success: true, messageId: result[0].headers['x-message-id'] };
    } catch (error) {
      logger.error(`Email sending error to ${to}: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Send job alert
  async sendJobAlert(email, job) {
    const subject = `🎯 New Job: ${job.title} at ${job.company}`;
    const html = this.formatJobAlertHTML(job);
    return await this.sendEmail(email, subject, html);
  }

  // Send welcome email
  async sendWelcomeEmail(email) {
    const subject = 'Welcome to JobAlert! 🎉';
    const html = `
      
      
      
        
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4A90E2, #7BB8F5); color: white; padding: 30px; text-align: center; border-radius: 10px; }
          .content { padding: 30px; }
        
      
      
        
          
            Welcome to JobAlert! 🎉
          
          
            Thank you for subscribing to JobAlert!
            You'll now receive email notifications whenever we find job opportunities that match your preferences.
            What happens next?
            
              Our bot continuously scans job boards
              When a matching job is found, we'll email you immediately
              Click "Apply Now" to submit your application
            
            Happy job hunting! 🚀
          
        
      
      
    `;
    
    return await this.sendEmail(email, subject, html);
  }

  // Send bulk alerts
  async sendBulkAlerts(users, job) {
    const results = [];
    
    for (const user of users) {
      const result = await this.sendJobAlert(user.email, job);
      results.push({
        userId: user._id,
        email: user.email,
        ...result
      });
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return results;
  }
}

module.exports = new EmailService();