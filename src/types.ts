/**
 * Types & Interfaces for Tayyab Computers Hub
 */

export interface ProductVariant {
  label: string;      // e.g., "16GB DDR4 RAM", "32GB DDR4 RAM"
  price: number;      // sales price in PKR
  costPrice: number;  // cost price in PKR
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  featured: boolean;
  images: string[];          // List of image URLs or base64 strings
  variants: ProductVariant[];
  stock: number;
  otherExpenses: number;     // Estimated extra expenses per unit (default value)
  videoUrl?: string;         // YouTube URL for product video
}

export type OrderStatus = 'New' | 'Delivered' | 'Cancelled';

export interface Order {
  id: string;               // e.g. "TC-1001"
  createdAt: string;        // ISO Date String
  customerName: string;
  customerPhone: string;    // WhatsApp Number
  customerAddress: string;
  productId: string;
  productName: string;
  variantLabel: string;
  quantity: number;
  salePrice: number;        // Captured sales price
  costPrice: number;        // Captured cost price
  otherExpenses: number;    // Added expenses for shipping/handling for this order
  totalPrice: number;       // (salePrice * quantity)
  profit: number;           // (salePrice - costPrice) * quantity - otherExpenses
  status: OrderStatus;
  notes?: string;
}

export interface FinancialStats {
  totalRevenue: number;
  totalCost: number;
  totalExpenses: number;
  totalProfit: number;
  deliveredCount: number;
  cancelledCount: number;
  newCount: number;
}
