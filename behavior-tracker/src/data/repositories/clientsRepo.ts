import { Client } from '../types';

export interface ClientsRepository {
  list(): Promise<Client[]>;
  get(id: string): Promise<Client | undefined>;
  create(data: Omit<Client, 'id'>): Promise<Client>;
  update(id: string, data: Partial<Client>): Promise<Client>;
  deactivate(id: string): Promise<boolean>;
}

export class ClientsRepositoryImpl implements ClientsRepository {
  constructor(private adapter: any) {}

  async list(): Promise<Client[]> {
    return this.adapter.clients.list();
  }

  async get(id: string): Promise<Client | undefined> {
    return this.adapter.clients.get(id);
  }

  async create(data: Omit<Client, 'id'>): Promise<Client> {
    return this.adapter.clients.create?.(data);
  }

  async update(id: string, data: Partial<Client>): Promise<Client> {
    return this.adapter.clients.update?.(id, data);
  }

  async deactivate(id: string): Promise<boolean> {
    return this.adapter.clients.deactivate?.(id) ?? false;
  }
}