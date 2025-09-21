import { LogEntry, FilterOptions } from '../types';

export interface LogsRepository {
  create(data: Omit<LogEntry, 'id' | 'org_id' | 'timestamp'>): Promise<LogEntry>;
  list(filters?: FilterOptions): Promise<LogEntry[]>;
  get(id: string): Promise<LogEntry | undefined>;
  update(id: string, data: Partial<LogEntry>): Promise<LogEntry>;
  delete(id: string): Promise<boolean>;
}

export class LogsRepositoryImpl implements LogsRepository {
  constructor(private adapter: any) {}

  async create(data: Omit<LogEntry, 'id' | 'org_id' | 'timestamp'>): Promise<LogEntry> {
    return this.adapter.logs.create(data);
  }

  async list(filters?: FilterOptions): Promise<LogEntry[]> {
    return this.adapter.logs.list(filters);
  }

  async get(id: string): Promise<LogEntry | undefined> {
    return this.adapter.logs.get?.(id);
  }

  async update(id: string, data: Partial<LogEntry>): Promise<LogEntry> {
    return this.adapter.logs.update?.(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.adapter.logs.delete?.(id) ?? false;
  }
}