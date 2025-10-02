let admin: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  admin = require('firebase-admin');
} catch {
  admin = null as any;
}
import { BaseModel } from '../models/BaseModel';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  imageUrl?: string;
}

export interface NotificationPreferences {
  pushNotifications: boolean;
  emailNotifications: boolean;
  priceAlerts: boolean;
  portfolioUpdates: boolean;
  marketNews: boolean;
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:MM format
    endTime: string;   // HH:MM format
  };
}

export class NotificationService {
  private static instance: NotificationService;
  private firebaseApp: any = null;

  constructor() {
    this.initializeFirebase();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  private initializeFirebase(): void {
    try {
      if (!admin) {
        console.warn('Firebase Admin SDK not available; push notifications disabled');
        this.firebaseApp = null;
        return;
      }
      if (!admin.apps || !admin.apps.length) {
        this.firebaseApp = admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          }),
        });
      } else {
        this.firebaseApp = admin.app();
      }
    } catch (error) {
      console.error('Failed to initialize Firebase:', error);
      this.firebaseApp = null;
    }
  }

  // Send push notification to a specific user
  async sendPushNotification(
    userId: string,
    payload: PushNotificationPayload
  ): Promise<boolean> {
    try {
      if (!this.firebaseApp || !admin) {
        console.error('Firebase not initialized or Admin SDK unavailable');
        return false;
      }

      // Get user's FCM tokens
      const tokens = await this.getUserFCMTokens(userId);
      if (tokens.length === 0) {
        console.log(`No FCM tokens found for user ${userId}`);
        return false;
      }

      // Check if user has notifications enabled and not in quiet hours
      const canSend = await this.canSendNotification(userId);
      if (!canSend) {
        console.log(`Notifications disabled or in quiet hours for user ${userId}`);
        return false;
      }

      const message: any = {
        tokens,
        notification: {
          title: payload.title,
          body: payload.body,
          imageUrl: payload.imageUrl,
        },
        data: payload.data ? this.stringifyData(payload.data) : undefined,
        android: {
          notification: {
            channelId: 'finora-alerts',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              alert: {
                title: payload.title,
                body: payload.body,
              },
              sound: 'default',
              badge: 1,
            },
          },
        },
      };

      const response = await admin.messaging().sendMulticast(message);
      
      // Handle failed tokens
      if (response.failureCount > 0) {
        await this.handleFailedTokens(tokens, response.responses);
      }

      // Log notification
      await this.logNotification(userId, payload, response.successCount > 0);

      return response.successCount > 0;
    } catch (error) {
      console.error('Error sending push notification:', error);
      return false;
    }
  }

  // Send push notification to multiple users
  async sendBulkPushNotifications(
    userIds: string[],
    payload: PushNotificationPayload
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    const promises = userIds.map(async (userId) => {
      const sent = await this.sendPushNotification(userId, payload);
      if (sent) {
        success++;
      } else {
        failed++;
      }
    });

    await Promise.all(promises);

    return { success, failed };
  }

  // Register FCM token for a user
  async registerFCMToken(userId: string, token: string, deviceInfo?: {
    platform: 'ios' | 'android' | 'web';
    deviceId: string;
    deviceName?: string;
  }): Promise<void> {
    try {
      // Check if token already exists
      const existingToken = await BaseModel.db('user_fcm_tokens')
        .where('user_id', userId)
        .where('token', token)
        .first();

      if (existingToken) {
        // Update last used timestamp
        await BaseModel.db('user_fcm_tokens')
          .where('id', existingToken.id)
          .update({
            last_used_at: new Date(),
            updated_at: new Date(),
          });
      } else {
        // Insert new token
        await BaseModel.db('user_fcm_tokens').insert({
          user_id: userId,
          token,
          platform: deviceInfo?.platform || 'web',
          device_id: deviceInfo?.deviceId,
          device_name: deviceInfo?.deviceName,
          is_active: true,
          last_used_at: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
    } catch (error) {
      console.error('Error registering FCM token:', error);
    }
  }

  // Remove FCM token
  async removeFCMToken(userId: string, token: string): Promise<void> {
    try {
      await BaseModel.db('user_fcm_tokens')
        .where('user_id', userId)
        .where('token', token)
        .update({
          is_active: false,
          updated_at: new Date(),
        });
    } catch (error) {
      console.error('Error removing FCM token:', error);
    }
  }

  // Get user's notification preferences
  async getNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const preferences = await BaseModel.db('user_notification_preferences')
        .where('user_id', userId)
        .first();

      if (!preferences) {
        // Return default preferences
        return {
          pushNotifications: true,
          emailNotifications: true,
          priceAlerts: true,
          portfolioUpdates: true,
          marketNews: false,
          quietHours: {
            enabled: false,
            startTime: '22:00',
            endTime: '08:00',
          },
        };
      }

      return {
        pushNotifications: preferences.push_notifications,
        emailNotifications: preferences.email_notifications,
        priceAlerts: preferences.price_alerts,
        portfolioUpdates: preferences.portfolio_updates,
        marketNews: preferences.market_news,
        quietHours: {
          enabled: preferences.quiet_hours_enabled,
          startTime: preferences.quiet_hours_start,
          endTime: preferences.quiet_hours_end,
        },
      };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      throw error;
    }
  }

  // Update user's notification preferences
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    try {
      const updateData: any = {
        updated_at: new Date(),
      };

      if (preferences.pushNotifications !== undefined) {
        updateData.push_notifications = preferences.pushNotifications;
      }
      if (preferences.emailNotifications !== undefined) {
        updateData.email_notifications = preferences.emailNotifications;
      }
      if (preferences.priceAlerts !== undefined) {
        updateData.price_alerts = preferences.priceAlerts;
      }
      if (preferences.portfolioUpdates !== undefined) {
        updateData.portfolio_updates = preferences.portfolioUpdates;
      }
      if (preferences.marketNews !== undefined) {
        updateData.market_news = preferences.marketNews;
      }
      if (preferences.quietHours) {
        updateData.quiet_hours_enabled = preferences.quietHours.enabled;
        updateData.quiet_hours_start = preferences.quietHours.startTime;
        updateData.quiet_hours_end = preferences.quietHours.endTime;
      }

      // Upsert preferences
      const existing = await BaseModel.db('user_notification_preferences')
        .where('user_id', userId)
        .first();

      if (existing) {
        await BaseModel.db('user_notification_preferences')
          .where('user_id', userId)
          .update(updateData);
      } else {
        await BaseModel.db('user_notification_preferences').insert({
          user_id: userId,
          ...updateData,
          created_at: new Date(),
        });
      }
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  }

  // Send test notification
  async sendTestNotification(userId: string): Promise<boolean> {
    return this.sendPushNotification(userId, {
      title: 'Test Notification',
      body: 'This is a test notification from Finora. Your notifications are working correctly!',
      data: {
        type: 'test',
        timestamp: Date.now().toString(),
      },
    });
  }

  // Private helper methods
  private async getUserFCMTokens(userId: string): Promise<string[]> {
    try {
      const tokens = await BaseModel.db('user_fcm_tokens')
        .select('token')
        .where('user_id', userId)
        .where('is_active', true)
        .where('last_used_at', '>', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // Active in last 30 days

      return tokens.map(t => t.token);
    } catch (error) {
      console.error('Error getting FCM tokens:', error);
      return [];
    }
  }

  private async canSendNotification(userId: string): Promise<boolean> {
    try {
      const preferences = await this.getNotificationPreferences(userId);
      
      if (!preferences.pushNotifications) {
        return false;
      }

      // Check quiet hours
      if (preferences.quietHours.enabled) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        
        const startTime = preferences.quietHours.startTime;
        const endTime = preferences.quietHours.endTime;
        
        // Handle quiet hours that span midnight
        if (startTime > endTime) {
          if (currentTime >= startTime || currentTime <= endTime) {
            return false;
          }
        } else {
          if (currentTime >= startTime && currentTime <= endTime) {
            return false;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      return false;
    }
  }

  private stringifyData(data: Record<string, any>): Record<string, string> {
    const stringified: Record<string, string> = {};
    for (const [key, value] of Object.entries(data)) {
      stringified[key] = typeof value === 'string' ? value : JSON.stringify(value);
    }
    return stringified;
  }

  private async handleFailedTokens(
    tokens: string[],
    responses: any[]
  ): Promise<void> {
    const failedTokens: string[] = [];
    
    responses.forEach((response, index) => {
      if (!response.success && response.error) {
        const errorCode = response.error.code;
        
        // Remove invalid tokens
        if (errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered') {
          const t = tokens[index];
          if (t) failedTokens.push(t);
        }
      }
    });

    if (failedTokens.length > 0) {
      await BaseModel.db('user_fcm_tokens')
        .whereIn('token', failedTokens)
        .update({
          is_active: false,
          updated_at: new Date(),
        });
    }
  }

  private async logNotification(
    userId: string,
    payload: PushNotificationPayload,
    success: boolean
  ): Promise<void> {
    try {
      await BaseModel.db('notification_logs').insert({
        user_id: userId,
        title: payload.title,
        body: payload.body,
        data: payload.data ? JSON.stringify(payload.data) : null,
        success,
        created_at: new Date(),
      });
    } catch (error) {
      console.error('Error logging notification:', error);
    }
  }
}
