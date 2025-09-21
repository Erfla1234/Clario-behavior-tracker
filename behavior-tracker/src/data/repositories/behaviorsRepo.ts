import { Behavior } from '../types';

export interface BehaviorsRepository {
  list(): Promise<Behavior[]>;
  get(id: string): Promise<Behavior | undefined>;
  create(data: Omit<Behavior, 'id'>): Promise<Behavior>;
  update(id: string, data: Partial<Behavior>): Promise<Behavior>;
  delete(id: string): Promise<boolean>;
}

export class BehaviorsRepositoryImpl implements BehaviorsRepository {
  constructor(private adapter: any) {}

  async list(): Promise<Behavior[]> {
    return this.adapter.behaviors.list();
  }

  async get(id: string): Promise<Behavior | undefined> {
    return this.adapter.behaviors.get(id);
  }

  async create(data: Omit<Behavior, 'id'>): Promise<Behavior> {
    return this.adapter.behaviors.create?.(data);
  }

  async update(id: string, data: Partial<Behavior>): Promise<Behavior> {
    return this.adapter.behaviors.update?.(id, data);
  }

  async delete(id: string): Promise<boolean> {
    return this.adapter.behaviors.delete?.(id) ?? false;
  }
}