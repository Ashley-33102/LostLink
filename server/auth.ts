import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log('Login attempt for:', username);
        const user = await storage.getUserByUsername(username);
        console.log('User found:', user ? 'yes' : 'no');

        if (!user) {
          console.log('User not found');
          return done(null, false, { message: "Invalid credentials" });
        }

        const isValid = await comparePasswords(password, user.password);
        console.log('Password valid:', isValid);

        if (!isValid) {
          console.log('Invalid password');
          return done(null, false, { message: "Invalid credentials" });
        }

        // Check if user's CNIC is authorized (skip for admins)
        if (!user.isAdmin) {
          const authorized = await storage.getAuthorizedCnic(user.cnic);
          if (!authorized) {
            console.log('CNIC not authorized');
            return done(null, false, { message: "Your CNIC is not authorized" });
          }
        }

        console.log('Login successful');
        return done(null, user);
      } catch (error) {
        console.error('Login error:', error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    console.log('Serializing user:', user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log('Deserializing user:', id);
      const user = await storage.getUser(id);
      console.log('User found:', user ? 'yes' : 'no');
      done(null, user);
    } catch (error) {
      console.error('Deserialization error:', error);
      done(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Admin routes for managing authorized CNICs
  app.use("/api/admin/*", (req, res, next) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (!req.user.isAdmin) return res.sendStatus(403);
    next();
  });

  app.get("/api/admin/authorized-cnics", async (req, res) => {
    const cnics = await storage.listAuthorizedCnics();
    res.json(cnics);
  });

  app.post("/api/admin/authorized-cnics", async (req, res) => {
    const { cnic } = req.body;
    try {
      const authorized = await storage.addAuthorizedCnic({
        cnic,
        addedBy: req.user.id,
      });
      res.status(201).json(authorized);
    } catch (error) {
      res.status(400).json({ message: "Failed to add CNIC" });
    }
  });

  app.delete("/api/admin/authorized-cnics/:cnic", async (req, res) => {
    try {
      await storage.removeAuthorizedCnic(req.params.cnic);
      res.sendStatus(204);
    } catch (error) {
      res.status(400).json({ message: "Failed to remove CNIC" });
    }
  });
}