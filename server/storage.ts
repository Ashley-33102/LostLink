import { User, InsertUser, Item, InsertItem } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
import { users, items } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

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

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    console.log('Getting user by id:', id);
    const [user] = await db.select().from(users).where(eq(users.id, id));
    console.log('Found user:', user ? 'yes' : 'no');
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    console.log('Getting user by username:', username);
    const [user] = await db.select().from(users).where(eq(users.username, username));
    console.log('Found user:', user ? 'yes' : 'no');
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    console.log('Creating user:', insertUser.username);
    const [user] = await db.insert(users).values(insertUser).returning();
    console.log('User created with id:', user.id);
    return user;
  }

  async createItem(insertItem: InsertItem & { userId: number }): Promise<Item> {
    console.log('Creating item:', insertItem);
    const [item] = await db.insert(items).values({
      ...insertItem,
      status: 'open',
      date: new Date(),
    }).returning();
    console.log('Item created with id:', item.id);
    return item;
  }

  async getItem(id: number): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item;
  }

  async getItems(filters?: { type?: string; category?: string }): Promise<Item[]> {
    let query = db.select().from(items);

    if (filters?.type) {
      query = query.where(eq(items.type, filters.type));
    }
    if (filters?.category) {
      query = query.where(eq(items.category, filters.category));
    }

    const result = await query.orderBy(items.date);
    return result;
  }

  async updateItemStatus(id: number, status: string): Promise<Item> {
    const [item] = await db
      .update(items)
      .set({ status })
      .where(eq(items.id, id))
      .returning();

    if (!item) throw new Error('Item not found');
    return item;
  }

  async deleteItem(id: number): Promise<void> {
    await db.delete(items).where(eq(items.id, id));
  }
}

export const storage = new DatabaseStorage();