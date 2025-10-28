import { z } from 'zod';

// Product validation schema
export const productSchema = z.object({
  productCode: z.string().min(1, 'Product code is required').max(50, 'Product code must be less than 50 characters'),
  name: z.string().min(1, 'Product name is required').max(100, 'Product name must be less than 100 characters'),
  category: z.string().min(1, 'Category is required').max(50, 'Category must be less than 50 characters'),
  price: z.number().positive('Price must be a positive number'),
  minimumStockLevel: z.number().min(0, 'Minimum stock level must be a non-negative number'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  readyToDeliver: z.number().min(0).max(1, 'Ready to deliver must be 0 or 1').optional(),
  variants: z.array(z.object({
    id: z.string().optional(),
    color: z.string().min(1, 'Color is required').max(30, 'Color must be less than 30 characters'),
    size: z.string().min(1, 'Size is required').max(20, 'Size must be less than 20 characters'),
    stock: z.number().min(0, 'Stock must be a non-negative number'),
    imageUrl: z.string().max(200, 'Image URL must be less than 200 characters').optional().nullable(),
  })).optional(),
  agePricing: z.array(z.object({
    id: z.number().optional(),
    ageMin: z.number().min(0, 'Minimum age must be a non-negative number'),
    ageMax: z.number().min(0, 'Maximum age must be a non-negative number'),
    price: z.number().positive('Price must be a positive number'),
  })).optional(),
});

// Shop validation schema
export const shopSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be less than 30 characters'),
  name: z.string().min(1, 'Shop name is required').max(100, 'Shop name must be less than 100 characters'),
  contactPerson: z.string().min(1, 'Contact person is required').max(50, 'Contact person must be less than 50 characters'),
  contactPhone: z.string().max(20, 'Contact phone must be less than 20 characters').optional().nullable(),
  city: z.string().min(1, 'City is required').max(50, 'City must be less than 50 characters'),
  exactLocation: z.string().min(1, 'Exact location is required').max(200, 'Exact location must be less than 200 characters'),
  tradeLicenseNumber: z.string().max(50, 'Trade license number must be less than 50 characters').optional().nullable(),
  tinNumber: z.string().max(50, 'TIN number must be less than 50 characters').optional().nullable(),
  discount: z.number().min(0, 'Discount must be a non-negative number').max(100, 'Discount must be less than or equal to 100'),
  monthlySalesTarget: z.number().min(0, 'Monthly sales target must be a non-negative number'),
  status: z.enum(['Active', 'Pending', 'Suspended']).optional(),
});

// Order validation schema
export const orderSchema = z.object({
  shopId: z.string().min(1, 'Shop ID is required'),
  shopName: z.string().min(1, 'Shop name is required').max(100, 'Shop name must be less than 100 characters'),
  date: z.string().min(1, 'Date is required'),
  status: z.enum(['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled']),
  amount: z.number().positive('Amount must be a positive number'),
  items: z.string().min(1, 'Items are required'),
  paymentSlipUrl: z.string().max(200, 'Payment slip URL must be less than 200 characters').optional().nullable(),
  dispatchInfo: z.string().max(200, 'Dispatch info must be less than 200 characters').optional().nullable(),
  deliveryDate: z.string().max(20, 'Delivery date must be less than 20 characters').optional().nullable(),
  isClosed: z.number().min(0).max(1, 'Is closed must be 0 or 1').optional(),
  feedback: z.string().max(500, 'Feedback must be less than 500 characters').optional().nullable(),
});

// Marketing order validation schema
export const marketingOrderSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required').max(50, 'Order number must be less than 50 characters'),
  productName: z.string().min(1, 'Product name is required').max(100, 'Product name must be less than 100 characters'),
  productCode: z.string().min(1, 'Product code is required').max(50, 'Product code must be less than 50 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional().nullable(),
  quantity: z.number().positive('Quantity must be a positive number'),
  status: z.enum(['Placed Order', 'Cutting', 'Production', 'Packing', 'Delivery', 'Completed']).optional(),
  cuttingStatus: z.string().max(50, 'Cutting status must be less than 50 characters').optional().nullable(),
  productionStatus: z.string().max(50, 'Production status must be less than 50 characters').optional().nullable(),
  packingStatus: z.string().max(50, 'Packing status must be less than 50 characters').optional().nullable(),
  deliveryStatus: z.string().max(50, 'Delivery status must be less than 50 characters').optional().nullable(),
  assignedTo: z.string().max(50, 'Assigned to must be less than 50 characters').optional().nullable(),
  dueDate: z.string().max(20, 'Due date must be less than 20 characters').optional().nullable(),
  completedDate: z.string().max(20, 'Completed date must be less than 20 characters').optional().nullable(),
  pdfUrl: z.string().max(200, 'PDF URL must be less than 200 characters').optional().nullable(),
  imageUrl: z.string().max(200, 'Image URL must be less than 200 characters').optional().nullable(),
  isCompleted: z.number().min(0).max(1, 'Is completed must be 0 or 1').optional(),
  createdBy: z.string().min(1, 'Created by is required').max(50, 'Created by must be less than 50 characters'),
  orderPlacementDate: z.string().max(20, 'Order placement date must be less than 20 characters').optional().nullable(),
  plannedDeliveryDate: z.string().max(20, 'Planned delivery date must be less than 20 characters').optional().nullable(),
  sizeSetSampleApproved: z.string().max(50, 'Size set sample approved must be less than 50 characters').optional().nullable(),
  productionStartDate: z.string().max(20, 'Production start date must be less than 20 characters').optional().nullable(),
  productionFinishedDate: z.string().max(20, 'Production finished date must be less than 20 characters').optional().nullable(),
});

// User validation schema
export const userSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be less than 30 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password must be less than 100 characters'),
  role: z.enum(['factory', 'shop']),
});

// Notification validation schema
export const notificationSchema = z.object({
  userType: z.enum(['factory', 'shop']),
  shopId: z.string().max(50, 'Shop ID must be less than 50 characters').optional().nullable(),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be less than 100 characters'),
  description: z.string().min(1, 'Description is required').max(500, 'Description must be less than 500 characters'),
  href: z.string().min(1, 'Href is required').max(200, 'Href must be less than 200 characters'),
  isRead: z.number().min(0).max(1, 'Is read must be 0 or 1').optional(),
});

// Helper function to sanitize strings (remove potentially dangerous characters)
export function sanitizeString(str: string): string {
  if (!str) return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// Helper function to sanitize input data
export function sanitizeInput<T extends Record<string, any>>(data: T): T {
  const sanitized: any = {};
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeInput(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}