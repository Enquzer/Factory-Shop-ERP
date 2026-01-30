import { NextRequest, NextResponse } from 'next/server';
import { getShopProductFeedback, upsertProductFeedback, getProductFeedback, getProductAverageRating } from '@/lib/product-feedback';
import { authenticateRequest } from '@/lib/auth-middleware';
import { getShopByUsername } from '@/lib/shops-sqlite';

// GET /api/product-feedback?productId=... - Get all feedback for a product
// GET /api/product-feedback?productId=...&shopId=... - Get specific shop's feedback for a product
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const shopId = searchParams.get('shopId');
    
    if (!productId) {
      return NextResponse.json(
        { error: 'Product ID is required' },
        { status: 400 }
      );
    }

    if (shopId) {
      // Get specific shop's feedback for this product
      const feedback = await getShopProductFeedback(productId, shopId);
      return NextResponse.json(feedback);
    } else {
      // Get all feedback for this product
      const feedback = await getProductFeedback(productId);
      const ratingStats = await getProductAverageRating(productId);
      
      return NextResponse.json({
        feedback,
        stats: ratingStats
      });
    }
  } catch (error: any) {
    console.error('Error fetching product feedback:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch product feedback' },
      { status: 500 }
    );
  }
}

// POST /api/product-feedback - Create or update feedback
export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const user = await authenticateRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Only shops can give feedback
    if (user.role !== 'shop') {
      return NextResponse.json(
        { error: 'Only shops can provide feedback' },
        { status: 403 }
      );
    }

    // Get shop details to get shopId
    const shop = await getShopByUsername(user.username);
    if (!shop) {
      return NextResponse.json(
        { error: 'Shop not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { productId, rating, comment } = body;

    // Validate required fields
    if (!productId || rating === undefined) {
      return NextResponse.json(
        { error: 'Product ID and rating are required' },
        { status: 400 }
      );
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5 stars' },
        { status: 400 }
      );
    }

    // Validate comment length
    if (comment && comment.length > 500) {
      return NextResponse.json(
        { error: 'Comment must be less than 500 characters' },
        { status: 400 }
      );
    }

    // Create or update feedback
    const feedback = await upsertProductFeedback({
      productId,
      shopId: shop.id,
      rating,
      comment: comment || undefined
    });

    return NextResponse.json(feedback, { status: 201 });
  } catch (error: any) {
    console.error('Error creating product feedback:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create product feedback' },
      { status: 500 }
    );
  }
}