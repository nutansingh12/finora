import { Response } from 'express';
import { AuthenticatedRequest } from '../types/express';
import { User } from '../models/User';

export class UsersController {
  static async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const user = await User.findById(userId);
      if (!user) {
        res.status(404).json({ success: false, message: 'User not found' });
        return;
      }
      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.first_name,
            lastName: user.last_name,
            isVerified: user.email_verified,
            preferences: user.preferences,
            createdAt: user.created_at
          }
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const { firstName, lastName } = req.body as { firstName?: string; lastName?: string };
      const updates: any = {};
      if (firstName) updates.first_name = firstName;
      if (lastName) updates.last_name = lastName;
      if (Object.keys(updates).length === 0) {
        res.status(400).json({ success: false, message: 'No changes provided' });
        return;
      }
      const updated = await User.updateById(userId, updates);
      res.json({ success: true, data: { user: updated } });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  static async updatePreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ success: false, message: 'Unauthorized' });
        return;
      }
      const prefs = req.body as any;
      const updated = await User.updatePreferences(userId, prefs);
      res.json({ success: true, data: { user: updated } });
    } catch (error) {
      console.error('Update preferences error:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

