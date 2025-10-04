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
  protected static override tableName = 'sessions';

  static async findByRefreshToken(refreshToken: string): Promise<SessionModel | null> {
    return this.findOne<SessionModel>({ refresh_token: refreshToken });
  }

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

  static async updateLastUsed(sessionId: string, ipAddress?: string): Promise<SessionModel | null> {
    return this.updateById<SessionModel>(sessionId, {
      last_used_at: new Date(),
      ...(ipAddress && { ip_address: ipAddress })
    });
  }

  static async deactivateSession(sessionId: string): Promise<SessionModel | null> {
    return this.updateById<SessionModel>(sessionId, { is_active: false });
  }

  static async deactivateUserSessions(userId: string): Promise<number> {
    return this.updateWhere({ user_id: userId }, { is_active: false });
  }

  static async getUserSessions(userId: string, activeOnly: boolean = true): Promise<SessionModel[]> {
    const conditions: any = { user_id: userId };
    if (activeOnly) conditions.is_active = true;
    return this.findAll<SessionModel>(conditions, { orderBy: 'last_used_at', orderDirection: 'desc' });
  }
}

