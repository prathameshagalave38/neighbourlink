import express, { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../../../database/client.ts";
import { UserRole } from "../../../../../frontend/src/types/index.ts";

export const authRouter = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || "neighbourlink_super_secret_key_123!";

/**
 * Middleware to authenticate requests via JWT
 */
export async function authenticateToken(req: Request, res: Response, next: NextFunction): Promise<any> {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, error: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; role: string };
    const db = await getDb();
    const user = await db.collection("users").findOne({ _id: decoded.id });

    if (!user) {
      return res.status(401).json({ success: false, error: "User no longer exists." });
    }

    if (user.status === "Inactive") {
      return res.status(403).json({ success: false, error: "Your account is inactive. Please contact the administrator." });
    }

    // Attach user to request
    (req as any).user = user;
    next();
  } catch (err) {
    return res.status(403).json({ success: false, error: "Invalid or expired session token." });
  }
}

/**
 * @route   POST /api/v1/auth/register
 * @desc    Register a new community user
 */
authRouter.post("/register", async (req: Request, res: Response): Promise<any> => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Basic Input Validations
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, error: "Please enter all required fields: name, email, password, and role." });
    }

    const emailRegex = /\S+@\S+\.\S+/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: "Please provide a valid email address." });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters." });
    }

    const allowedRoles: UserRole[] = ["SuperAdmin", "Admin", "Resident", "Security"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, error: `Invalid role. Allowed roles are: ${allowedRoles.join(", ")}` });
    }

    const db = await getDb();
    const usersCollection = db.collection("users");

    // Check if user already exists
    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await usersCollection.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, error: "Email is already registered with an account." });
    }

    // Hash Password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create User Document
    const newUserDoc = {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
      phone: phone ? phone.trim() : undefined,
      status: "Active" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await usersCollection.insertOne(newUserDoc);
    const insertedUser = await usersCollection.findOne({ _id: result.insertedId });

    if (!insertedUser) {
      throw new Error("Failed to retrieve created user profile.");
    }

    // Generate JWT Token
    const token = jwt.sign(
      { id: insertedUser._id, email: insertedUser.email, role: insertedUser.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Extract passwordHash from response
    const { passwordHash: _, ...safeUser } = insertedUser;

    return res.status(201).json({
      success: true,
      message: "Account created successfully!",
      token,
      user: safeUser
    });

  } catch (err: any) {
    console.error("Register Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error." });
  }
});

/**
 * @route   POST /api/v1/auth/login
 * @desc    Authenticate user & return token
 */
authRouter.post("/login", async (req: Request, res: Response): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Please enter email and password." });
    }

    const db = await getDb();
    const usersCollection = db.collection("users");

    const normalizedEmail = email.toLowerCase().trim();
    const user = await usersCollection.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(400).json({ success: false, error: "Invalid email credentials." });
    }

    if (user.status === "Inactive") {
      return res.status(403).json({ success: false, error: "Your account is inactive. Please contact your society administrator." });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: "Invalid password credentials." });
    }

    // Generate Token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { passwordHash: _, ...safeUser } = user;

    return res.json({
      success: true,
      message: "Signed in successfully!",
      token,
      user: safeUser
    });

  } catch (err: any) {
    console.error("Login Error:", err);
    return res.status(500).json({ success: false, error: err.message || "Internal server error." });
  }
});

/**
 * @route   GET /api/v1/auth/me
 * @desc    Get current authenticated user profile
 */
authRouter.get("/me", authenticateToken, async (req: Request, res: Response): Promise<any> => {
  const user = (req as any).user;
  const { passwordHash: _, ...safeUser } = user;
  return res.json({
    success: true,
    user: safeUser
  });
});
