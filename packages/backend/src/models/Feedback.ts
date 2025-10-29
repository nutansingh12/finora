import { BaseModel } from './BaseModel';
import { randomUUID } from 'crypto';

export interface FeedbackModel {
  id: string;
  user_id: string;
  rating: number; // 1-5 stars
  feedback_text?: string;
  page_url?: string;
  user_agent?: string;
  screenshot_path?: string;
  device_info?: any; // JSON field for device/browser info
  app_version?: string;
  platform: 'web' | 'mobile' | 'desktop';
  status: 'pending' | 'sent' | 'failed';
  email_sent_at?: Date;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
}

export interface FeedbackCreationData {
  user_id: string;
  rating: number;
  feedback_text?: string;
  page_url?: string;
  user_agent?: string;
  screenshot_base64?: string;
  device_info?: any;
  app_version?: string;
  platform: 'web' | 'mobile' | 'desktop';
}

export class Feedback extends BaseModel {
  protected static override tableName = 'feedback';

  /**
   * Create new feedback entry
   */
  static async createFeedback(data: FeedbackCreationData): Promise<FeedbackModel> {
    const feedbackData: Partial<FeedbackModel> = {
      id: randomUUID(),
      user_id: data.user_id,
      rating: data.rating,
      feedback_text: data.feedback_text,
      page_url: data.page_url,
      user_agent: data.user_agent,
      device_info: data.device_info,
      app_version: data.app_version,
      platform: data.platform,
      status: 'pending'
    };

    return this.create<FeedbackModel>(feedbackData);
  }

  /**
   * Find feedback by user
   */
  static async findByUser(userId: string): Promise<FeedbackModel[]> {
    return this.findAll<FeedbackModel>({
      user_id: userId
    });
  }

  /**
   * Find pending feedback (not yet sent via email)
   */
  static async findPending(): Promise<FeedbackModel[]> {
    return this.findAll<FeedbackModel>({
      status: 'pending'
    });
  }

  /**
   * Update feedback status
   */
  static async updateStatus(
    feedbackId: string, 
    status: 'pending' | 'sent' | 'failed',
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date()
    };

    if (status === 'sent') {
      updateData.email_sent_at = new Date();
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    await this.updateById(feedbackId, updateData);
  }

  /**
   * Get feedback statistics
   */
  static async getStatistics(): Promise<any> {
    // This would need to be implemented with proper SQL queries
    // For now, return basic structure
    return {
      totalFeedback: 0,
      averageRating: 0,
      ratingDistribution: {
        1: 0, 2: 0, 3: 0, 4: 0, 5: 0
      },
      platformBreakdown: {
        web: 0,
        mobile: 0,
        desktop: 0
      },
      statusBreakdown: {
        pending: 0,
        sent: 0,
        failed: 0
      }
    };
  }

  /**
   * Get recent feedback
   */
  static async getRecent(limit: number = 10): Promise<FeedbackModel[]> {
    // This would need proper SQL with ORDER BY and LIMIT
    // For now, return basic findAll
    return this.findAll<FeedbackModel>({}, { limit });
  }

  /**
   * Search feedback by rating
   */
  static async findByRating(rating: number): Promise<FeedbackModel[]> {
    return this.findAll<FeedbackModel>({
      rating
    });
  }

  /**
   * Find feedback by date range
   */
  static async findByDateRange(startDate: Date, endDate: Date): Promise<FeedbackModel[]> {
    // This would need proper SQL with date range queries
    // For now, return basic structure
    return this.findAll<FeedbackModel>({});
  }
}
