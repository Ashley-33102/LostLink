import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertItemSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  app.get("/api/items", async (req, res) => {
    const { type, category } = req.query;
    const filters = {
      type: type as string | undefined,
      category: category as string | undefined
    };
    const items = await storage.getItems(filters);
    res.json(items);
  });

  app.post("/api/items", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const parseResult = insertItemSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json(parseResult.error);
    }

    const item = await storage.createItem({
      ...parseResult.data,
      userId: req.user.id,
    });
    res.status(201).json(item);
  });

  app.patch("/api/items/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['open', 'closed'].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    try {
      const item = await storage.updateItemStatus(Number(id), status);
      res.json(item);
    } catch (err) {
      res.status(404).json({ message: "Item not found" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
