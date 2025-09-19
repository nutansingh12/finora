import { BaseModel } from './BaseModel';
import { UserPreferences } from '../../../../shared/types';

export interface UserModel {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  email_verified: boolean;
  email_verification_token?: string | null;
  email_verified_at?: Date;
  password_reset_token?: string | null;
  password_reset_expires?: Date | null;
  preferences: UserPreferences;
  last_login_at?: Date;
  last_login_ip?: string;
  created_at: Date;
  updated_at: Date;
}

export class User extends BaseModel {
  protected static override tableName = 'users';

  // Find user by email
  static async findByEmail(email: string): Promise<UserModel | null> {
    return this.findOne<UserModel>({ email: email.toLowerCase() });
  }

  // Create user with hashed password
  static async createUser(userData: {
    email: string;
    password_hash: string;
    first_name: string;
    last_name: string;
    preferences?: Partial<UserPreferences>;
  }): Promise<UserModel> {
    const defaultPreferences: UserPreferences = {
      defaultTargetPriceStrategy: '52w_low',
      alertsEnabled: true,
      emailNotifications: true,
      pushNotifications: true,
      theme: 'auto',
      currency: 'USD',
      timezone: 'America/New_York'
    };

    return this.create<UserModel>({
      ...userData,
      email: userData.email.toLowerCase(),
      preferences: { ...defaultPreferences, ...userData.preferences }
    });
  }

  // Update user preferences
  static async updatePreferences(
    userId: string,
    preferences: Partial<UserPreferences>
  ): Promise<UserModel | null> {
    const user = await this.findById<UserModel>(userId);
    if (!user) return null;

    const updatedPreferences = { ...user.preferences, ...preferences };
    return this.updateById<UserModel>(userId, { preferences: updatedPreferences });
  }

  // Update last login
  static async updateLastLogin(userId: string, ipAddress: string): Promise<void> {
    await this.updateById(userId, {
      last_login_at: new Date(),
      last_login_ip: ipAddress
    });
  }

  // Set email verification token
  static async setEmailVerificationToken(
    userId: string,
    token: string
  ): Promise<UserModel | null> {
    return this.updateById<UserModel>(userId, {
      email_verification_token: token
    });
  }

  // Verify email
  static async verifyEmail(token: string): Promise<UserModel | null> {
    const user = await this.findOne<UserModel>({
      email_verification_token: token
    });

    if (!user) return null;

    return this.updateById<UserModel>(user.id, {
      email_verified: true,
      email_verified_at: new Date(),
      email_verification_token: null
    });
  }

  // Set password reset token
  static async setPasswordResetToken(
    email: string,
    token: string,
    expiresAt: Date
  ): Promise<UserModel | null> {
    const user = await this.findByEmail(email);
    if (!user) return null;

    return this.updateById<UserModel>(user.id, {
      password_reset_token: token,
      password_reset_expires: expiresAt
    });
  }

  // Reset password
  static async resetPassword(
    token: string,
    newPasswordHash: string
  ): Promise<UserModel | null> {
    const user = await this.findOne<UserModel>({
      password_reset_token: token
    });

    if (!user || !user.password_reset_expires) return null;

    // Check if token is expired
    if (new Date() > user.password_reset_expires) return null;

    return this.updateById<UserModel>(user.id, {
      password_hash: newPasswordHash,
      password_reset_token: null,
      password_reset_expires: null
    });
  }

  // Deactivate user
  static async deactivateUser(userId: string): Promise<UserModel | null> {
    return this.updateById<UserModel>(userId, { is_active: false });
  }

  // Activate user
  static async activateUser(userId: string): Promise<UserModel | null> {
    return this.updateById<UserModel>(userId, { is_active: true });
  }

  // Get active users count
  static async getActiveUsersCount(): Promise<number> {
    return this.count({ is_active: true });
  }

  // Get users with pagination and search
  static async searchUsers(
    searchTerm?: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: UserModel[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    let query = this.db(this.tableName).select([
      'id',
      'email',
      'first_name',
      'last_name',
      'is_active',
      'email_verified',
      'last_login_at',
      'created_at',
      'updated_at'
    ]);

    if (searchTerm) {
      query = query.where(function() {
        this.where('email', 'ilike', `%${searchTerm}%`)
          .orWhere('first_name', 'ilike', `%${searchTerm}%`)
          .orWhere('last_name', 'ilike', `%${searchTerm}%`);
      });
    }

    const total = await query.clone().count('* as count').first();
    const totalCount = parseInt(total?.count as string) || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const offset = (page - 1) * limit;

    const data = await query
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    return {
      data,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }
}
