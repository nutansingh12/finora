import { BaseModel } from './BaseModel';

export interface SessionModel {
  id: string;
  user_id: string;
  refresh_token: string;
  device_type?: string;
  device_name?: string;
  user_agent?: string;
  ip_address?: string;
  location?: string;
  is_active: boolean;
  expires_at: Date;
  last_used_at: Date;
  created_at: Date;
  updated_at: Date;
}

export class Session extends BaseModel {
  protected static tableName = 'sessions';

  // Find session by refresh token
  static async findByRefreshToken(refreshToken: string): Promise<SessionModel | null> {
    return this.findOne<SessionModel>({ refresh_token: refreshToken });
  }

  // Create new session
  static async createSession(sessionData: {
    user_id: string;
    refresh_token: string;
    device_type?: string;
    device_name?: string;
    user_agent?: string;
    ip_address?: string;
    location?: string;
    expires_at: Date;
  }): Promise<SessionModel> {
    return this.create<SessionModel>(sessionData);
  }

  // Update last used timestamp
  static async updateLastUsed(sessionId: string, ipAddress?: string): Promise<SessionModel | null> {
    return this.updateById<SessionModel>(sessionId, {
      last_used_at: new Date(),
      ...(ipAddress && { ip_address: ipAddress })
    });
  }

  // Deactivate session
  static async deactivateSession(sessionId: string): Promise<SessionModel | null> {
    return this.updateById<SessionModel>(sessionId, { is_active: false });
  }

  // Deactivate all user sessions
  static async deactivateUserSessions(userId: string): Promise<number> {
    return this.updateWhere({ user_id: userId }, { is_active: false });
  }

  // Get user sessions
  static async getUserSessions(userId: string, activeOnly: boolean = true): Promise<SessionModel[]> {
    const conditions: any = { user_id: userId };
    if (activeOnly) {
      conditions.is_active = true;
    }

    return this.findAll<SessionModel>(conditions, {
      orderBy: 'last_used_at',
      orderDirection: 'desc'
    });
  }

  // Clean expired sessions
  static async cleanExpiredSessions(): Promise<number> {
    return this.updateWhere(
      { is_active: true },
      { is_active: false }
    ).whereRaw('expires_at < NOW()');
  }

  // Get session statistics
  static async getSessionStats(userId?: string): Promise<{
    total: number;
    active: number;
    expired: number;
    byDeviceType: Record<string, number>;
  }> {
    const baseConditions = userId ? { user_id: userId } : {};
    
    const total = await this.count(baseConditions);
    const active = await this.count({ ...baseConditions, is_active: true });
    
    const expiredCount = await this.db(this.tableName)
      .where(baseConditions)
      .where('expires_at', '<', new Date())
      .count('* as count')
      .first();
    
    const expired = parseInt(expiredCount?.count as string) || 0;

    const deviceTypes = await this.db(this.tableName)
      .select('device_type')
      .count('* as count')
      .where({ ...baseConditions, is_active: true })
      .groupBy('device_type');

    const byDeviceType = deviceTypes.reduce((acc, item) => {
      acc[item.device_type || 'unknown'] = parseInt(item.count as string);
      return acc;
    }, {} as Record<string, number>);

    return {
      total,
      active,
      expired,
      byDeviceType
    };
  }
}
