import { insertUserSchema } from "@shared/schema";
import { User } from "@shared/schema";
import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage as dbStorage } from "./storage";
import { insertItemSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

// Configure multer for image uploads
const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const multerStorage = multer.diskStorage({
  destination: uploadDir,
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: multerStorage });

export async function registerRoutes(app: Express): Promise<Server> {
  // These routes should be available before auth setup
  // Check if admin exists
  app.get("/api/admin/exists", async (req, res) => {
    try {
      const users = await dbStorage.getAllUsers();
      const adminExists = false;
      res.json(adminExists);
    } catch (error) {
      res.status(500).json({ message: "Failed to check admin status" });
    }
  });

  // Admin registration (only allowed if no admin exists)
  app.post("/api/admin/register", async (req, res) => {
    try {
      // Check if admin already exists
      // const users = await dbStorage.getAllUsers();
      // if (users.some(user => user.isAdmin)) {
      //   return res.status(400).json({ message: "Admin already exists" });
      // }

      const parseResult = insertUserSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json(parseResult.error);
      }

      const { cnic } = parseResult.data;

      // Check if username or CNIC already exists
      // const existingUser = await dbStorage.getUserByUsername(username);
      const existingCnic = await dbStorage.getUserByCnic(cnic);

      // if (existingUser) {
      //   return res.status(400).json({ message: "Username already exists" });
      // }
      if (existingCnic) {
        return res.status(400).json({ message: "CNIC already registered" });
      }

      const user = await dbStorage.createUser({cnic});
      res.status(201).json({ ...user, password: undefined });
    } catch (error) {
      console.error('Admin registration error:', error);
      res.status(500).json({ message: "Failed to create admin account" });
    }
  });

  // Setup auth after public routes
  setupAuth(app);

  // Serve uploaded files statically
  app.use("/uploads", express.static(uploadDir));

  // Image upload endpoint
  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image provided" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
  });

  app.get("/api/items", async (req, res) => {
    const { type, category } = req.query;
    const filters = {
      type: type as string | undefined,
      category: category as string | undefined
    };
    const items = await dbStorage.getItems(filters);
    res.json(items);
  });

  app.post("/api/items", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const parseResult = insertItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid item data", errors: parseResult.error });
    }

    try {
      const item = await dbStorage.createItem({
        ...parseResult.data,
        userCnic: req.user.cnic,
      });
      res.status(201).json(item);
    } catch (error) {
      console.error('Failed to create item:', error);
      res.status(500).json({ message: "Failed to create item" });
    }
  });

  app.patch("/api/items/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { id } = req.params;
    const { status } = req.body;

    if (!['open', 'closed'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    try {
      const item = await dbStorage.getItem(Number(id));
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      if (item.userCnic !== req.user.cnic) {
        return res.status(403).json({ message: "You can only update your own items" });
      }

      const updatedItem = await dbStorage.updateItemStatus(Number(id), status);
      res.json(updatedItem);
    } catch (err) {
      res.status(500).json({ message: "Failed to update item status" });
    }
  });

  app.delete("/api/items/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const { id } = req.params;

    try {
      const item = await dbStorage.getItem(Number(id));
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      if (item.userCnic !== req.user.cnic) {
        return res.status(403).json({ message: "You can only delete your own items" });
      }

      await dbStorage.deleteItem(Number(id));
      res.sendStatus(204);
    } catch (err) {
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

const scryptAsync = promisify(scrypt);
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";