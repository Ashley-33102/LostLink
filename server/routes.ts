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
  // Public route: check if admin exists
  app.get("/api/admin/exists", async (req, res) => {
    try {
      const users = await dbStorage.getAllUsers();
      const adminExists = false;
      res.json(adminExists);
    } catch (error) {
      res.status(500).json({ message: "Failed to check admin status" });
    }
  });

  // Admin registration
  app.post("/api/admin/register", async (req, res) => {
    try {
      const parseResult = insertUserSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json(parseResult.error);
      }

      const { cnic } = parseResult.data;
      const existingCnic = await dbStorage.getUserByCnic(cnic);

      if (existingCnic) {
        return res.status(400).json({ message: "CNIC already registered" });
      }

      const user = await dbStorage.createUser({ cnic });
      res.status(201).json({ ...user, password: undefined });
    } catch (error) {
      console.error('Admin registration error:', error);
      res.status(500).json({ message: "Failed to create admin account" });
    }
  });

  // Auth middleware
  setupAuth(app);

  // Serve uploaded images
  app.use("/uploads", express.static(uploadDir));

  // Upload image route
  app.post("/api/upload", upload.single("image"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No image provided" });
    }
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
  });

  // Get all items (optionally filtered)
  app.get("/api/items", async (req, res) => {
    const { type, category } = req.query;
    const filters = {
      type: type as string | undefined,
      category: category as string | undefined
    };
    const items = await dbStorage.getItems(filters);
    res.json(items);
  });

  // ✅ Get single item by ID (required for Edit)
  app.get("/api/items/:id", async (req, res) => {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID" });
    }

    try {
      const item = await dbStorage.getItem(id);
      if (!item) {
        return res.status(404).json({ error: "Item not found" });
      }
      res.json(item);
    } catch (err) {
      console.error("Error fetching item:", err);
      res.status(500).json({ message: "Failed to fetch item" });
    }
  });

  // Create new item
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

  // Update an item (Edit functionality)
  // app.put("/api/items/:id", async (req, res) => {
  //   if (!req.isAuthenticated()) return res.sendStatus(401);

  //   const itemId = parseInt(req.params.id);
  //   const updates = req.body;

  //   try {
  //     const existingItem = await dbStorage.getItem(itemId);
  //     if (!existingItem) {
  //       return res.status(404).json({ message: "Item not found" });
  //     }

  //     if (existingItem.userCnic !== req.user.cnic) {
  //       return res.status(403).json({ message: "You can only edit your own items" });
  //     }

  //     const updatedItem = await dbStorage.updateItem(itemId, updates);
  //     res.json(updatedItem);
  //   } catch (err) {
  //     console.error("Failed to update item:", err);
  //     res.status(500).json({ message: "Failed to update item" });
  //   }
  // });

  app.put("/api/items/:id", upload.single("picture"), async (req, res) => {
  if (!req.isAuthenticated()) return res.sendStatus(401)

  const itemId = parseInt(req.params.id)
  const {
    name,
    description,
    location,
    type,
    title,
    category,
    contactNumber,
  } = req.body

  console.log("Incoming update request:")
  console.log("ID:", itemId)
  console.log("Body:", req.body)
  console.log("File:", req.file)

  try {
    const existingItem = await dbStorage.getItem(itemId)
    if (!existingItem) return res.status(404).json({ message: "Item not found" })

    if (existingItem.userCnic !== req.user.cnic) {
      return res.status(403).json({ message: "Not allowed to update this item" })
    }

    // const imageUrl = req.file ? `/uploads/${req.file.filename}` : existingItem.imageUrl
    const imageUrl = req.file
  ? `/uploads/${req.file.filename}`
  : existingItem.imageUrl ?? undefined;

    const updatedItem = await dbStorage.updateItem(itemId, {
      // name,
      description,
      location,
      type,
      title,
      category,
      contactNumber,
      imageUrl,
    })

    console.log("Item updated:", updatedItem)

    res.json(updatedItem)
  } catch (err) {
    console.error("Update failed:", err)
    res.status(500).json({ message: "Failed to update item" })
  }
})

  // Update item status (mark open/closed)
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

  // Delete an item
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