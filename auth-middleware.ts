import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

// Session storage (in production, use a proper database or Redis)
const activeSessions = new Map<string, { expiresAt: number }>();

// Configuration - Load from environment variables
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

// Hash password using SHA256 (basic, for production use bcrypt)
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Generate secure session token
function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Validate admin credentials
export function validateAdminLogin(password: string): boolean {
  return password === ADMIN_PASSWORD;
}

// Create admin session
export function createAdminSession(): { token: string; expiresIn: number } {
  const token = generateSessionToken();
  const expiresAt = Date.now() + SESSION_TIMEOUT;
  activeSessions.set(token, { expiresAt });
  return { token, expiresIn: SESSION_TIMEOUT };
}

// Verify session token
export function verifyAdminSession(token: string | undefined): boolean {
  if (!token) return false;

  const session = activeSessions.get(token);
  if (!session) return false;

  // Check if session expired
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return false;
  }

  return true;
}

// Invalidate session
export function invalidateAdminSession(token: string): void {
  activeSessions.delete(token);
}

// Express middleware to protect admin routes
export function adminAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Get token from cookies or Authorization header
  const token =
    req.cookies?.adminToken ||
    req.headers.authorization?.replace("Bearer ", "");

  if (!verifyAdminSession(token)) {
    res.status(401).json({ error: "Unauthorized. Please login to admin panel." });
    return;
  }

  // Token is valid, continue
  next();
}

// Clean up expired sessions periodically
export function startSessionCleanup(): void {
  setInterval(() => {
    const now = Date.now();
    for (const [token, session] of activeSessions.entries()) {
      if (now > session.expiresAt) {
        activeSessions.delete(token);
      }
    }
  }, 60 * 60 * 1000); // Run every hour
}
