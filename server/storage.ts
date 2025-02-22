import { User, InsertUser, Item, InsertItem } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createItem(item: InsertItem & { userId: number }): Promise<Item>;
  getItem(id: number): Promise<Item | undefined>;
  getItems(filters?: { type?: string; category?: string }): Promise<Item[]>;
  updateItemStatus(id: number, status: string): Promise<Item>;
  
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private items: Map<number, Item>;
  private currentUserId: number;
  private currentItemId: number;
  sessionStore: session.Store;

  constructor() {
    this.users = new Map();
    this.items = new Map();
    this.currentUserId = 1;
    this.currentItemId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createItem(insertItem: InsertItem & { userId: number }): Promise<Item> {
    const id = this.currentItemId++;
    const item: Item = {
      ...insertItem,
      id,
      status: 'open',
      date: new Date(),
    };
    this.items.set(id, item);
    return item;
  }

  async getItem(id: number): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async getItems(filters?: { type?: string; category?: string }): Promise<Item[]> {
    let items = Array.from(this.items.values());
    
    if (filters?.type) {
      items = items.filter(item => item.type === filters.type);
    }
    if (filters?.category) {
      items = items.filter(item => item.category === filters.category);
    }
    
    return items.sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  async updateItemStatus(id: number, status: string): Promise<Item> {
    const item = await this.getItem(id);
    if (!item) throw new Error('Item not found');
    
    const updatedItem = { ...item, status };
    this.items.set(id, updatedItem);
    return updatedItem;
  }
}

export const storage = new MemStorage();
