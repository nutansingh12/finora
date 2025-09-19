import { Knex } from 'knex';
import db from '../config/database';

export interface BaseModelInterface {
  id: string;
  created_at: Date;
  updated_at: Date;
}

export abstract class BaseModel {
  protected static tableName: string;
  protected static db: Knex = db;

  // Get table name for the model
  static getTableName(): string {
    return this.tableName;
  }

  // Find by ID
  static async findById<T = any>(id: string): Promise<T | null> {
    const result = await this.db(this.tableName)
      .where('id', id)
      .first();
    return result || null;
  }

  // Find all records with optional conditions
  static async findAll<T = any>(
    conditions: Record<string, any> = {},
    options: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
      select?: string[];
    } = {}
  ): Promise<T[]> {
    let query = this.db(this.tableName);

    // Apply conditions
    Object.entries(conditions).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.where(key, value);
      }
    });

    // Apply select
    if (options.select && options.select.length > 0) {
      query = query.select(options.select);
    }

    // Apply ordering
    if (options.orderBy) {
      query = query.orderBy(options.orderBy, options.orderDirection || 'asc');
    }

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.offset(options.offset);
    }

    return query;
  }

  // Find one record with conditions
  static async findOne<T = any>(conditions: Record<string, any>): Promise<T | null> {
    const result = await this.db(this.tableName)
      .where(conditions)
      .first();
    return result || null;
  }

  // Create a new record
  static async create<T = any>(data: Partial<T>): Promise<T> {
    const [result] = await this.db(this.tableName)
      .insert(data)
      .returning('*');
    return result;
  }

  // Update records by ID
  static async updateById<T = any>(id: string, data: Partial<T>): Promise<T | null> {
    const [result] = await this.db(this.tableName)
      .where('id', id)
      .update({
        ...data,
        updated_at: new Date()
      })
      .returning('*');
    return result || null;
  }

  // Update records with conditions
  static async updateWhere<T = any>(
    conditions: Record<string, any>,
    data: Partial<T>
  ): Promise<number> {
    return this.db(this.tableName)
      .where(conditions)
      .update({
        ...data,
        updated_at: new Date()
      });
  }

  // Delete by ID
  static async deleteById(id: string): Promise<boolean> {
    const deletedCount = await this.db(this.tableName)
      .where('id', id)
      .del();
    return deletedCount > 0;
  }

  // Delete with conditions
  static async deleteWhere(conditions: Record<string, any>): Promise<number> {
    return this.db(this.tableName)
      .where(conditions)
      .del();
  }

  // Count records with conditions
  static async count(conditions: Record<string, any> = {}): Promise<number> {
    const result = await this.db(this.tableName)
      .where(conditions)
      .count('* as count')
      .first();
    return parseInt(result?.count as string) || 0;
  }

  // Check if record exists
  static async exists(conditions: Record<string, any>): Promise<boolean> {
    const count = await this.count(conditions);
    return count > 0;
  }

  // Paginate results
  static async paginate<T = any>(
    conditions: Record<string, any> = {},
    page: number = 1,
    limit: number = 10,
    orderBy: string = 'created_at',
    orderDirection: 'asc' | 'desc' = 'desc'
  ): Promise<{
    data: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const offset = (page - 1) * limit;
    const total = await this.count(conditions);
    const totalPages = Math.ceil(total / limit);

    const data = await this.findAll<T>(conditions, {
      limit,
      offset,
      orderBy,
      orderDirection
    });

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  // Begin transaction
  static async transaction<T>(callback: (trx: Knex.Transaction) => Promise<T>): Promise<T> {
    return this.db.transaction(callback);
  }

  // Raw query
  static async raw(query: string, bindings?: any[]): Promise<any> {
    return this.db.raw(query, bindings || []);
  }
}
