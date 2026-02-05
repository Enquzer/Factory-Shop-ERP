import { NextRequest, NextResponse } from 'next/server';
import { createProductReview, getProductReviews } from '@/lib/customers-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';
import { createNotification } from '@/lib/notifications';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code: productId } = params;
    const reviews = await getProductReviews(productId);
    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const authResult = await authenticateRequest(request);
    if (!authResult || authResult.role !== 'customer') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code: productId } = params;
    const { rating, comment } = await request.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Invalid rating' }, { status: 400 });
    }

    const review = await createProductReview({
      productId,
      customerId: authResult.username, // Using username as ID for now based on customers-sqlite logic
      customerName: authResult.username, // Or fetch real name if available
      rating,
      comment
    });

    // Notify Ecommerce Manager
    await createNotification({
      userType: 'factory',
      title: 'New Product Review',
      description: `Customer ${authResult.username} rated product ${productId} ${rating} stars.`,
      href: `/ecommerce-manager/products` // Ideally deep link
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
