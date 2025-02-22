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
  deleteItem(id: number): Promise<void>;

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
      checkPeriod: 86400000, // 24 hours
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    console.log('Getting user by id:', id);
    const user = this.users.get(id);
    console.log('Found user:', user ? 'yes' : 'no');
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log('Getting user by username:', username);
    const user = Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
    console.log('Found user:', user ? 'yes' : 'no');
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log('Creating user:', insertUser.username);
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    console.log('User created with id:', id);
    return user;
  }

  async createItem(insertItem: InsertItem & { userId: number }): Promise<Item> {
    console.log('Creating item:', insertItem);
    const id = this.currentItemId++;
    const item: Item = {
      ...insertItem,
      id,
      status: 'open',
      date: new Date(),
    };
    this.items.set(id, item);
    console.log('Item created with id:', id);
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

  async deleteItem(id: number): Promise<void> {
    this.items.delete(id);
  }
}

export const storage = new MemStorage();