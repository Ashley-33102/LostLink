import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { User as SelectUser } from "@shared/schema";
import { storage } from "./storage";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
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
    new LocalStrategy(
      { usernameField: 'cnic' }, // Use CNIC as the username field
      async (cnic, password, done) => {
        try {
          console.log('Login attempt with CNIC:', cnic);

          // Check if CNIC is authorized
          const authorized = await storage.getAuthorizedCnic(cnic);
          if (!authorized) {
            console.log('CNIC not authorized');
            return done(null, false, { message: "Your CNIC is not authorized" });
          }

          // Get or create user
          let user = await storage.getUserByCnic(cnic);
          if (!user) {
            user = await storage.createUser({ cnic });
          }

          console.log('Login successful');
          return done(null, user);
        } catch (error) {
          console.error('Login error:', error);
          return done(error);
        }
      }
    )
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
}