import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { FeedbackService } from '../services/FeedbackService';
import { Feedback } from '../models/Feedback';

export class FeedbackController {
  private static feedbackService = new FeedbackService();

  // Serverless-safe: ensure feedback table exists before any operation
  private static schemaReady: Promise<void> | null = null;
  private static ensureSchema(): Promise<void> {
    if (this.schemaReady) return this.schemaReady;
    this.schemaReady = (async () => {
      try {
        const knex = (Feedback as any).db as import('knex').Knex;
        const has = await knex.schema.hasTable('feedback');
        if (!has) {
          console.log('ℹ️ [Controller] Creating feedback table');
          await knex.schema.createTable('feedback', (t: any) => {
            t.uuid('id').primary();
            t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
            t.integer('rating').notNullable();
            t.text('feedback_text');
            t.text('page_url');
            t.text('user_agent');
            t.text('screenshot_path');
            t.jsonb('device_info');
            t.string('app_version');
            t.enu('platform', ['web','mobile','desktop']).notNullable();
            t.enu('status', ['pending','sent','failed']).notNullable().defaultTo('pending');
            t.timestamp('email_sent_at');
            t.text('error_message');
            t.timestamps(true, true);
            t.index(['user_id']);
            t.index(['created_at']);
            t.index(['platform']);
            t.index(['status']);
          });
          console.log('✅ [Controller] Feedback table created');
        }
      } catch (e) {
        const msg = (e && (e as any).message) || String(e);
        if (!msg.includes('already exists')) {
          console.error('⚠️ [Controller] ensureSchema error:', e);
        }
      }
    })();
    return this.schemaReady;
  }

  /**
   * Submit feedback with screenshot
   */
  static async submitFeedback(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Ensure schema exists before proceeding
      await FeedbackController.ensureSchema();

      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const {
        rating,
        feedback_text,
        page_url,
        screenshot_base64,
        device_info,
        app_version,
        platform
      } = req.body;

      // Validate required fields
      if (!rating || rating < 1 || rating > 5) {
        res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5 stars'
        });
        return;
      }

      if (!platform || !['web', 'mobile', 'desktop'].includes(platform)) {
        res.status(400).json({
          success: false,
          message: 'Platform must be web, mobile, or desktop'
        });
        return;
      }

      // Submit feedback
      const result = await FeedbackController.feedbackService.submitFeedback({
        user_id: userId,
        rating: parseInt(rating),
        feedback_text,
        page_url,
        user_agent: req.get('User-Agent'),
        screenshot_base64,
        device_info,
        app_version,
        platform
      });

      if (result.success) {
        res.status(201).json({
          success: true,
          message: 'Thank you for your feedback! We appreciate your input.',
          data: {
            feedbackId: result.feedbackId,
            emailSent: result.emailSent,
            rating: parseInt(rating)
          }
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message
        });
      }

    } catch (error) {
      console.error('Submit feedback error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get user's feedback history
   */
  static async getUserFeedback(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await FeedbackController.ensureSchema();

      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
        return;
      }

      const feedback = await Feedback.findByUser(userId);

      res.json({
        success: true,
        data: {
          feedback: feedback.map(f => ({
            id: f.id,
            rating: f.rating,
            feedback_text: f.feedback_text,
            page_url: f.page_url,
            platform: f.platform,
            status: f.status,
            created_at: f.created_at,
            email_sent_at: f.email_sent_at
          })),
          totalFeedback: feedback.length,
          averageRating: feedback.length > 0
            ? feedback.reduce((sum, f) => sum + f.rating, 0) / feedback.length
            : 0
        }
      });

    } catch (error) {
      console.error('Get user feedback error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get feedback statistics (admin)
   */
  static async getFeedbackStatistics(req: Request, res: Response): Promise<void> {
    try {
      await FeedbackController.ensureSchema();
      const stats = await FeedbackController.feedbackService.getFeedbackStatistics();

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get feedback statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get recent feedback (admin)
   */
  static async getRecentFeedback(req: Request, res: Response): Promise<void> {
    try {
      await FeedbackController.ensureSchema();
      const limit = parseInt(req.query.limit as string) || 10;
      const feedback = await FeedbackController.feedbackService.getRecentFeedback(limit);

      res.json({
        success: true,
        data: {
          feedback: feedback.map(f => ({
            id: f.id,
            user_id: f.user_id,
            rating: f.rating,
            feedback_text: f.feedback_text,
            page_url: f.page_url,
            platform: f.platform,
            status: f.status,
            created_at: f.created_at,
            email_sent_at: f.email_sent_at,
            has_screenshot: !!f.screenshot_path
          })),
          total: feedback.length
        }
      });

    } catch (error) {
      console.error('Get recent feedback error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Resend failed feedback emails (admin)
   */
  static async resendFailedEmails(req: Request, res: Response): Promise<void> {
    try {
      await FeedbackController.ensureSchema();
      const result = await FeedbackController.feedbackService.resendFailedEmails();

      res.json({
        success: true,
        message: `Resend completed: ${result.success} successful, ${result.failed} failed`,
        data: result
      });

    } catch (error) {
      console.error('Resend failed emails error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  /**
   * Get feedback by rating (admin)
   */
  static async getFeedbackByRating(req: Request, res: Response): Promise<void> {
    try {
      await FeedbackController.ensureSchema();
      const rating = parseInt((req.params.rating as string) || '0');

      if (!rating || rating < 1 || rating > 5) {
        res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
        return;
      }

      const feedback = await Feedback.findByRating(rating);

      res.json({
        success: true,
        data: {
          rating,
          feedback: feedback.map(f => ({
            id: f.id,
            user_id: f.user_id,
            feedback_text: f.feedback_text,
            page_url: f.page_url,
            platform: f.platform,
            status: f.status,
            created_at: f.created_at,
            has_screenshot: !!f.screenshot_path
          })),
          total: feedback.length
        }
      });

    } catch (error) {
      console.error('Get feedback by rating error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}
