import { NextRequest, NextResponse } from 'next/server';
import { getCartItems, addCartItem, updateCartItemQuantity, removeCartItem, clearCart } from '@/lib/customers-sqlite';
import { authenticateRequest } from '@/lib/auth-middleware';

// GET /api/cart - Get cart items for authenticated customer
export async function GET(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || authResult.role !== 'customer') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const cartItems = await getCartItems(authResult.username); // Using username as customerId for now
    
    return NextResponse.json({ items: cartItems });
  } catch (error) {
    console.error('Error fetching cart items:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/cart - Add item to cart
export async function POST(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || authResult.role !== 'customer') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { productId, productVariantId, name, price, color, size, quantity, imageUrl } = body;
    
    // Validate required fields
    if (!productId || !productVariantId || !name || price === undefined || !color || !size || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const cartItem = await addCartItem(authResult.username, {
      productId,
      productVariantId,
      name,
      price,
      color,
      size,
      quantity,
      imageUrl
    });
    
    return NextResponse.json({ item: cartItem }, { status: 201 });
  } catch (error) {
    console.error('Error adding item to cart:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/cart/:id - Update cart item quantity
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || authResult.role !== 'customer') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    const { quantity } = body;
    
    if (quantity === undefined || quantity < 0) {
      return NextResponse.json(
        { error: 'Invalid quantity' },
        { status: 400 }
      );
    }
    
    const success = await updateCartItemQuantity(params.id, quantity);
    
    if (success) {
      return NextResponse.json({ message: 'Cart item updated successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to update cart item' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating cart item:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/cart/:id - Remove item from cart
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || authResult.role !== 'customer') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const success = await removeCartItem(params.id);
    
    if (success) {
      return NextResponse.json({ message: 'Item removed from cart successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to remove item from cart' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error removing item from cart:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Additional endpoint to clear entire cart
// POST /api/cart/clear
export async function POST_CLEAR(request: NextRequest) {
  try {
    const authResult = await authenticateRequest(request);
    
    if (!authResult || authResult.role !== 'customer') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const success = await clearCart(authResult.username);
    
    if (success) {
      return NextResponse.json({ message: 'Cart cleared successfully' });
    } else {
      return NextResponse.json(
        { error: 'Failed to clear cart' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error clearing cart:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}