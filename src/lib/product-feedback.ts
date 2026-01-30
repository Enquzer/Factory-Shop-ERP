import { getDB } from './db';

export type ProductFeedback = {
  id: string;
  productId: string;
  shopId: string;
  rating: number; // 1-5 stars
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductFeedbackWithDetails = ProductFeedback & {
  shopName: string;
  productName: string;
  productCode: string;
};

// Get all feedback for a product
export async function getProductFeedback(productId: string): Promise<ProductFeedbackWithDetails[]> {
  try {
    const db = await getDB();
    const feedback = await db.all(`
      SELECT 
        pf.*,
        s.name as shopName,
        p.name as productName,
        p.productCode as productCode
      FROM product_feedback pf
      JOIN shops s ON pf.shopId = s.id
      JOIN products p ON pf.productId = p.id
      WHERE pf.productId = ?
      ORDER BY pf.createdAt DESC
    `, [productId]);
    
    return feedback.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      shopId: item.shopId,
      rating: item.rating,
      comment: item.comment,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      shopName: item.shopName,
      productName: item.productName,
      productCode: item.productCode
    }));
  } catch (error) {
    console.error('Error fetching product feedback:', error);
    throw error;
  }
}

// Get feedback for a specific shop and product
export async function getShopProductFeedback(productId: string, shopId: string): Promise<ProductFeedback | null> {
  try {
    const db = await getDB();
    const feedback = await db.get(`
      SELECT * FROM product_feedback 
      WHERE productId = ? AND shopId = ?
    `, [productId, shopId]);
    
    if (!feedback) return null;
    
    return {
      id: feedback.id,
      productId: feedback.productId,
      shopId: feedback.shopId,
      rating: feedback.rating,
      comment: feedback.comment,
      createdAt: new Date(feedback.createdAt),
      updatedAt: new Date(feedback.updatedAt)
    };
  } catch (error) {
    console.error('Error fetching shop product feedback:', error);
    throw error;
  }
}

// Create or update feedback
export async function upsertProductFeedback(feedback: Omit<ProductFeedback, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductFeedback> {
  try {
    const db = await getDB();
    
    // Check if feedback already exists
    const existing = await db.get(`
      SELECT id FROM product_feedback 
      WHERE productId = ? AND shopId = ?
    `, [feedback.productId, feedback.shopId]);
    
    const feedbackId = existing?.id || `FB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    if (existing) {
      // Update existing feedback
      await db.run(`
        UPDATE product_feedback 
        SET rating = ?, comment = ?, updatedAt = ?
        WHERE id = ?
      `, [feedback.rating, feedback.comment, timestamp, existing.id]);
    } else {
      // Create new feedback
      await db.run(`
        INSERT INTO product_feedback (id, productId, shopId, rating, comment, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [feedbackId, feedback.productId, feedback.shopId, feedback.rating, feedback.comment, timestamp, timestamp]);
    }
    
    return {
      id: feedbackId,
      productId: feedback.productId,
      shopId: feedback.shopId,
      rating: feedback.rating,
      comment: feedback.comment,
      createdAt: new Date(timestamp),
      updatedAt: new Date(timestamp)
    };
  } catch (error) {
    console.error('Error upserting product feedback:', error);
    throw error;
  }
}

// Delete feedback
export async function deleteProductFeedback(feedbackId: string): Promise<void> {
  try {
    const db = await getDB();
    await db.run(`
      DELETE FROM product_feedback WHERE id = ?
    `, [feedbackId]);
  } catch (error) {
    console.error('Error deleting product feedback:', error);
    throw error;
  }
}

// Get average rating for a product
export async function getProductAverageRating(productId: string): Promise<{ averageRating: number; totalFeedbacks: number }> {
  try {
    const db = await getDB();
    const result = await db.get(`
      SELECT 
        AVG(rating) as averageRating,
        COUNT(*) as totalFeedbacks
      FROM product_feedback 
      WHERE productId = ?
    `, [productId]);
    
    return {
      averageRating: result.averageRating ? parseFloat(result.averageRating.toFixed(1)) : 0,
      totalFeedbacks: result.totalFeedbacks || 0
    };
  } catch (error) {
    console.error('Error fetching product average rating:', error);
    throw error;
  }
}

// Get all feedback given by a shop
export async function getShopFeedback(shopId: string): Promise<ProductFeedbackWithDetails[]> {
  try {
    const db = await getDB();
    const feedback = await db.all(`
      SELECT 
        pf.*,
        s.name as shopName,
        p.name as productName,
        p.productCode as productCode
      FROM product_feedback pf
      JOIN shops s ON pf.shopId = s.id
      JOIN products p ON pf.productId = p.id
      WHERE pf.shopId = ?
      ORDER BY pf.createdAt DESC
    `, [shopId]);
    
    return feedback.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      shopId: item.shopId,
      rating: item.rating,
      comment: item.comment,
      createdAt: new Date(item.createdAt),
      updatedAt: new Date(item.updatedAt),
      shopName: item.shopName,
      productName: item.productName,
      productCode: item.productCode
    }));
  } catch (error) {
    console.error('Error fetching shop feedback:', error);
    throw error;
  }
}