import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';
import { Feedback, FeedbackModel, FeedbackCreationData } from '../models/Feedback';
import { User } from '../models/User';

export interface FeedbackSubmissionResult {
  success: boolean;
  message: string;
  feedbackId?: string;
  emailSent?: boolean;
}

export class FeedbackService {
  private transporter: nodemailer.Transporter;
  private screenshotDir: string;

  constructor() {
    // Initialize email transporter
    this.transporter = nodemailer.createTransporter({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass
      }
    });

    // Create screenshots directory
    this.screenshotDir = path.join(process.cwd(), 'uploads', 'screenshots');
    this.ensureScreenshotDir();
  }

  private async ensureScreenshotDir(): Promise<void> {
    try {
      await fs.mkdir(this.screenshotDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create screenshot directory:', error);
    }
  }

  /**
   * Submit feedback with screenshot
   */
  async submitFeedback(data: FeedbackCreationData): Promise<FeedbackSubmissionResult> {
    try {
      // Create feedback record
      const feedback = await Feedback.createFeedback(data);

      // Save screenshot if provided
      let screenshotPath: string | undefined;
      if (data.screenshot_base64) {
        screenshotPath = await this.saveScreenshot(feedback.id, data.screenshot_base64);
        
        // Update feedback with screenshot path
        await Feedback.updateById(feedback.id, {
          screenshot_path: screenshotPath
        });
      }

      // Send email notification
      const emailSent = await this.sendFeedbackEmail(feedback, screenshotPath);

      // Update feedback status
      await Feedback.updateStatus(
        feedback.id,
        emailSent ? 'sent' : 'failed',
        emailSent ? undefined : 'Failed to send email notification'
      );

      return {
        success: true,
        message: 'Feedback submitted successfully',
        feedbackId: feedback.id,
        emailSent
      };

    } catch (error) {
      console.error('Feedback submission error:', error);
      return {
        success: false,
        message: 'Failed to submit feedback'
      };
    }
  }

  /**
   * Save screenshot from base64 data
   */
  private async saveScreenshot(feedbackId: string, base64Data: string): Promise<string> {
    try {
      // Remove data URL prefix if present
      const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Generate filename
      const filename = `feedback_${feedbackId}_${Date.now()}.png`;
      const filepath = path.join(this.screenshotDir, filename);

      // Save file
      await fs.writeFile(filepath, base64Image, 'base64');

      return filepath;
    } catch (error) {
      console.error('Screenshot save error:', error);
      throw new Error('Failed to save screenshot');
    }
  }

  /**
   * Send feedback email with screenshot attachment
   */
  private async sendFeedbackEmail(feedback: FeedbackModel, screenshotPath?: string): Promise<boolean> {
    try {
      // Get user details
      const user = await User.findById(feedback.user_id);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate star rating display
      const starRating = '★'.repeat(feedback.rating) + '☆'.repeat(5 - feedback.rating);

      // Prepare email content
      const emailSubject = `Finora App Feedback - ${feedback.rating} Star${feedback.rating !== 1 ? 's' : ''} from ${user.first_name} ${user.last_name}`;
      
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">New Feedback Received</h2>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1e40af;">User Information</h3>
            <p><strong>Name:</strong> ${user.first_name} ${user.last_name}</p>
            <p><strong>Email:</strong> ${user.email}</p>
            <p><strong>User ID:</strong> ${user.id}</p>
          </div>

          <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #d97706;">Feedback Details</h3>
            <p><strong>Rating:</strong> ${starRating} (${feedback.rating}/5)</p>
            ${feedback.feedback_text ? `<p><strong>Comments:</strong></p><p style="background: white; padding: 15px; border-radius: 4px; border-left: 4px solid #d97706;">${feedback.feedback_text}</p>` : ''}
          </div>

          <div style="background: #ecfdf5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #059669;">Technical Information</h3>
            <p><strong>Platform:</strong> ${feedback.platform}</p>
            ${feedback.page_url ? `<p><strong>Page URL:</strong> ${feedback.page_url}</p>` : ''}
            ${feedback.user_agent ? `<p><strong>User Agent:</strong> ${feedback.user_agent}</p>` : ''}
            ${feedback.app_version ? `<p><strong>App Version:</strong> ${feedback.app_version}</p>` : ''}
            <p><strong>Submitted:</strong> ${feedback.created_at}</p>
          </div>

          ${feedback.device_info ? `
          <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Device Information</h3>
            <pre style="background: white; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 12px;">${JSON.stringify(feedback.device_info, null, 2)}</pre>
          </div>
          ` : ''}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
            <p>This feedback was automatically generated by the Finora application feedback system.</p>
            <p>Feedback ID: ${feedback.id}</p>
          </div>
        </div>
      `;

      // Prepare email options
      const mailOptions: nodemailer.SendMailOptions = {
        from: `"Finora Feedback System" <${config.email.from}>`,
        to: config.feedback.email,
        subject: emailSubject,
        html: emailHtml,
        attachments: []
      };

      // Add screenshot attachment if available
      if (screenshotPath) {
        try {
          await fs.access(screenshotPath);
          mailOptions.attachments!.push({
            filename: `feedback_screenshot_${feedback.id}.png`,
            path: screenshotPath,
            contentType: 'image/png'
          });
        } catch (error) {
          console.warn('Screenshot file not found, sending email without attachment:', error);
        }
      }

      // Send email
      await this.transporter.sendMail(mailOptions);
      console.log(`✅ Feedback email sent successfully for feedback ID: ${feedback.id}`);
      
      return true;

    } catch (error) {
      console.error('Failed to send feedback email:', error);
      return false;
    }
  }

  /**
   * Get feedback statistics
   */
  async getFeedbackStatistics(): Promise<any> {
    return Feedback.getStatistics();
  }

  /**
   * Get recent feedback
   */
  async getRecentFeedback(limit: number = 10): Promise<FeedbackModel[]> {
    return Feedback.getRecent(limit);
  }

  /**
   * Resend failed feedback emails
   */
  async resendFailedEmails(): Promise<{ success: number; failed: number }> {
    const pendingFeedback = await Feedback.findPending();
    let successCount = 0;
    let failedCount = 0;

    for (const feedback of pendingFeedback) {
      const emailSent = await this.sendFeedbackEmail(feedback, feedback.screenshot_path);
      
      if (emailSent) {
        await Feedback.updateStatus(feedback.id, 'sent');
        successCount++;
      } else {
        await Feedback.updateStatus(feedback.id, 'failed', 'Retry failed');
        failedCount++;
      }
    }

    return { success: successCount, failed: failedCount };
  }
}
