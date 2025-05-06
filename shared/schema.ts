import { pgTable, text, serial, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  cnic: text("cnic").notNull().unique(),
});

export const authorizedCnics = pgTable("authorized_cnics", {
  id: serial("id").primaryKey(),
  cnic: text("cnic").notNull().unique(),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const items = pgTable("items", {
  id: serial("id").primaryKey(),
  userCnic: text("user_cnic").notNull(),
  type: text("type").notNull(), // 'lost' or 'found'
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  location: text("location").notNull(),
  contactNumber: text("contact_number").notNull(),
  status: text("status").notNull(), // 'open' or 'closed'
  date: timestamp("date").notNull(),
  imageUrl: text("image_url"), // Optional image URL
});

export const insertUserSchema = createInsertSchema(users)
  .extend({
    cnic: z.string()
      .regex(/^\d{13}$/, "CNIC must be exactly 13 digits"),
  });

export const insertAuthorizedCnicSchema = createInsertSchema(authorizedCnics)
  .pick({
    cnic: true,
  })
  .extend({
    cnic: z.string()
      .regex(/^\d{13}$/, "CNIC must be exactly 13 digits"),
  });

export const insertItemSchema = createInsertSchema(items)
  .pick({
    type: true,
    title: true,
    description: true,
    category: true,
    location: true,
    contactNumber: true,
    imageUrl: true,
  })
  .extend({
    type: z.enum(['lost', 'found']),
    category: z.enum(['electronics', 'clothing', 'accessories', 'documents', 'other']),
    contactNumber: z.string()
      .min(10, "Contact number must be at least 10 digits")
      .max(15, "Contact number must be less than 15 digits")
      .regex(/^\+?[\d\s-]+$/, "Please enter a valid contact number"),
    imageUrl: z.string().optional(),
  });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAuthorizedCnic = z.infer<typeof insertAuthorizedCnicSchema>;
export type AuthorizedCnic = typeof authorizedCnics.$inferSelect;
export type InsertItem = z.infer<typeof insertItemSchema>;
export type Item = typeof items.$inferSelect;