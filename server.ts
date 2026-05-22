import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from "url";
import crypto from "crypto";
import "dotenv/config";
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============= AUTHENTICATION SYSTEM =============
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "@@admin";
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const activeSessions = new Map<string, { expiresAt: number }>();

function generateSessionToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

function createAdminSession(): { token: string; expiresIn: number } {
  const token = generateSessionToken();
  const expiresAt = Date.now() + SESSION_TIMEOUT;
  activeSessions.set(token, { expiresAt });
  return { token, expiresIn: SESSION_TIMEOUT };
}

function verifyAdminSession(token: string | undefined): boolean {
  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

function invalidateAdminSession(token: string): void {
  activeSessions.delete(token);
}

// Middleware to protect admin routes
function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.adminToken || req.headers.authorization?.replace("Bearer ", "");
  if (!verifyAdminSession(token as string)) {
    res.status(401).json({ error: "Unauthorized. Please login to admin panel." });
    return;
  }
  next();
}

// Clean up expired sessions every hour
setInterval(() => {
  const now = Date.now();
  for (const [token, session] of activeSessions.entries()) {
    if (now > session.expiresAt) {
      activeSessions.delete(token);
    }
  }
}, 60 * 60 * 1000);

// ============= DATABASE CONFIGURATION =============
const PORT = 3000;
const UPLOADS_DIR = path.join(process.cwd(), "data", "uploads");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables.');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define interface matching src/types.ts
interface ProductVariant {
  label: string;
  price: number;
  costPrice: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  featured: boolean;
  images: string[];
  variants: ProductVariant[];
  stock: number;
  otherExpenses: number;
  videoUrl?: string;
}

interface Order {
  id: string;
  createdAt: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  productId: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  salePrice: number;
  costPrice: number;
  otherExpenses: number;
  totalPrice: number;
  profit: number;
  status: 'New' | 'Delivered' | 'Cancelled';
  notes?: string;
}

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

async function startServer() {
  const app = express();

  // Handle larger file uploads (base64 image data from products dashboard)
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ limit: "25mb", extended: true }));

  // Serve static uploads
  app.use("/uploads", express.static(UPLOADS_DIR));

  // ============= AUTHENTICATION ENDPOINTS =============

  // Login endpoint - POST /api/auth/login
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password are required." });
      return;
    }
    if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
      res.status(401).json({ error: "Invalid username or password." });
      return;
    }
    const { token, expiresIn } = createAdminSession();
    res.json({ success: true, token, expiresIn, message: "Login successful. Token valid for 24 hours." });
  });

  // Logout endpoint - POST /api/auth/logout
  app.post("/api/auth/logout", (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token) {
      invalidateAdminSession(token);
    }
    res.json({ success: true, message: "Logged out successfully." });
  });

  // Verify token endpoint - GET /api/auth/verify
  app.get("/api/auth/verify", (req, res) => {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (verifyAdminSession(token as string)) {
      res.json({ authenticated: true });
    } else {
      res.status(401).json({ authenticated: false });
    }
  });

  // ============= PROTECTED ADMIN API ENDPOINTS =============

  // 1. GET ALL PRODUCTS
  app.get('/api/products', async (req, res) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const products = data.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      category: p.category,
      featured: p.featured,
      images: p.images,
      variants: p.variants,
      stock: p.stock,
      otherExpenses: p.other_expenses,
      videoUrl: p.video_url,
    }));

    res.json(products);
  });

  // 2. CREATE OR UPDATE PRODUCT (ADMIN ONLY)
  app.post('/api/products', adminAuthMiddleware, async (req, res) => {
    const input = req.body;

    const productPayload = {
      name: input.name,
      description: input.description || '',
      category: input.category || '',
      featured: Boolean(input.featured),
      images: input.images || [],
      variants: input.variants || [],
      stock: Number(input.stock) || 0,
      other_expenses: Number(input.otherExpenses) || 0,
      video_url: input.videoUrl || null,
    };

    if (input.id) {
      const { data, error } = await supabase
        .from('products')
        .update(productPayload)
        .eq('id', input.id)
        .select()
        .single();

      if (error) return res.status(500).json({ error: error.message });
      if (!data) return res.status(404).json({ error: 'Product not found.' });
      return res.json(data);
    }

    const newProduct = {
      id: `prod-${Date.now()}`,
      ...productPayload,
    };

    const { data, error } = await supabase
      .from('products')
      .insert(newProduct)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  });

  // 3. DELETE PRODUCT (ADMIN ONLY)
  app.delete('/api/products/:id', adminAuthMiddleware, async (req, res) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // 4. GET ALL ORDERS
  app.get('/api/orders', async (req, res) => {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const orders = data.map(o => ({
      id: o.id,
      createdAt: o.created_at,
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      customerAddress: o.customer_address,
      productId: o.product_id,
      productName: o.product_name,
      variantLabel: o.variant_label,
      quantity: o.quantity,
      salePrice: o.sale_price,
      costPrice: o.cost_price,
      otherExpenses: o.other_expenses,
      totalPrice: o.total_price,
      profit: o.profit,
      status: o.status,
      notes: o.notes,
    }));

    res.json(orders);
  });

  // 5. PLACE A NEW ORDER
  app.post('/api/orders', async (req, res) => {
    const input = req.body;

    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', input.productId)
      .single();

    if (productError) return res.status(500).json({ error: productError.message });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const variant = product.variants.find((v: any) => v.label === input.variantLabel);
    if (!variant) return res.status(400).json({ error: 'Variant not found' });

    const qty = Number(input.quantity) || 1;
    const salePrice = variant.price;
    const costPrice = variant.costPrice;
    const expenses = product.other_expenses || 0;
    const totalPrice = salePrice * qty;
    const profit = (salePrice - costPrice) * qty - expenses;

    const { count, error: countError } = await supabase.from('orders').select('*', { count: 'exact', head: true });
    if (countError) return res.status(500).json({ error: countError.message });
    const orderId = `TC-${1001 + (count || 0)}`;

    const newOrder = {
      id: orderId,
      customer_name: input.customerName,
      customer_phone: input.customerPhone,
      customer_address: input.customerAddress,
      product_id: input.productId,
      product_name: product.name,
      variant_label: input.variantLabel,
      quantity: qty,
      sale_price: salePrice,
      cost_price: costPrice,
      other_expenses: expenses,
      total_price: totalPrice,
      profit: profit,
      status: 'New',
      notes: input.notes || null,
    };

    const { data, error } = await supabase
      .from('orders')
      .insert(newOrder)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  });

  // 6. UPDATE ORDER (ADMIN ONLY)
  app.put('/api/orders/:id', adminAuthMiddleware, async (req, res) => {
    const updates = req.body;
    const updateData: any = {};

    if (updates.status !== undefined)       updateData.status = updates.status;
    if (updates.notes !== undefined)        updateData.notes = updates.notes;
    if (updates.quantity !== undefined)     updateData.quantity = Number(updates.quantity);
    if (updates.otherExpenses !== undefined) updateData.other_expenses = Number(updates.otherExpenses);

    if (updateData.quantity || updateData.other_expenses) {
      const { data: existing, error: existingError } = await supabase.from('orders').select('*').eq('id', req.params.id).single();
      if (existingError) return res.status(500).json({ error: existingError.message });
      if (existing) {
        const qty = updateData.quantity ?? existing.quantity;
        const expenses = updateData.other_expenses ?? existing.other_expenses;
        updateData.total_price = existing.sale_price * qty;
        updateData.profit = (existing.sale_price - existing.cost_price) * qty - expenses;
      }
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  });

  // 7. DELETE ORDER (ADMIN ONLY)
  app.delete('/api/orders/:id', adminAuthMiddleware, async (req, res) => {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', req.params.id);

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  });

  // 8. FILE/IMAGE UPLOAD (ADMIN ONLY)
  app.post("/api/upload", adminAuthMiddleware, (req, res) => {
    try {
      const { fileName, fileContent } = req.body;
      if (!fileName || !fileContent) {
        res.status(400).json({ error: "File name and file content payload are required." });
        return;
      }

      // Parse the base64 content
      const base64Parts = fileContent.split(";base64,");
      const mimeType = base64Parts[0].split(":")[1];
      const rawBase64 = base64Parts[1] || base64Parts[0];

      // Convert to binary buffer
      const buffer = Buffer.from(rawBase64, "base64");

      // Verify file extension
      const ext = path.extname(fileName).toLowerCase() || ".png";
      const sanitizedName = `img-${Date.now()}-${Math.floor(Math.random() * 1000)}${ext}`;
      const filePath = path.join(UPLOADS_DIR, sanitizedName);

      fs.writeFileSync(filePath, buffer);

      // Return static URL
      const relativeUrl = `/uploads/${sanitizedName}`;
      res.json({ success: true, url: relativeUrl });
    } catch (err: any) {
      console.error("Upload error:", err);
      res.status(500).json({ error: err.message || "Failed to upload image file." });
    }
  });

  // --- VITE MIDDLEWARE DEVELOPMENT SYSTEM ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving static files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[OK] Server booting is successful. Host 0.0.0.0 mapped on port ${PORT}`);
  });
}

startServer();
