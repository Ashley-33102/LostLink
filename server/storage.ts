import { User, InsertUser, Item, InsertItem, AuthorizedCnic } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
import { users, items, authorizedCnics } from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByCnic(cnic: string): Promise<User | undefined>;
  // getUserByUsername(username: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;

  createItem(item: InsertItem & { userCnic: string }): Promise<Item>;
  getItem(id: number): Promise<Item | undefined>;
  getItems(filters?: { type?: string; category?: string }): Promise<Item[]>;
  updateItemStatus(id: number, status: string): Promise<Item>;
  deleteItem(id: number): Promise<void>;

  getAuthorizedCnic(cnic: string): Promise<AuthorizedCnic | undefined>;
  listAuthorizedCnics(): Promise<AuthorizedCnic[]>;

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

  async getUserByCnic(cnic: string): Promise<User | undefined> {
    console.log('Getting user by CNIC:', cnic);
    const [user] = await db.select().from(users).where(eq(users.cnic, cnic));
    console.log('Found user:', user ? 'yes' : 'no');
    return user;
  }

  // async getUserByUsername(username: string): Promise<User | undefined> {
  //   console.log("Getting user by username:", username);
  //   // const [user] = await db.select().from(users).where(eq(users.username, username));
  //   return user;
  // }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async createUser({ cnic }: { cnic: string }): Promise<User> {
    const [newUser] = await db
      .insert(users)
      .values({ cnic })
      .returning();
  
    return newUser;
  }

  async getAuthorizedCnic(cnic: string): Promise<AuthorizedCnic | undefined> {
    const [authorized] = await db
      .select()
      .from(authorizedCnics)
      .where(eq(authorizedCnics.cnic, cnic));
    return authorized;
  }

  async listAuthorizedCnics(): Promise<AuthorizedCnic[]> {
    return db.select().from(authorizedCnics);
  }

  async createItem(insertItem: InsertItem & { userCnic: string }): Promise<Item> {
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
    let results: Item[];
  
    if (filters?.type && filters?.category) {
      results = await db
        .select()
        .from(items)
        .where(
          and(
            eq(items.type, filters.type),
            eq(items.category, filters.category)
          )
        )
        .orderBy(items.date);
    } else if (filters?.type) {
      results = await db
        .select()
        .from(items)
        .where(eq(items.type, filters.type))
        .orderBy(items.date);
    } else if (filters?.category) {
      results = await db
        .select()
        .from(items)
        .where(eq(items.category, filters.category))
        .orderBy(items.date);
    } else {
      results = await db
        .select()
        .from(items)
        .orderBy(items.date);
    }
  
    return results;
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