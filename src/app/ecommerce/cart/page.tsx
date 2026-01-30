"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useCustomerAuth } from "@/contexts/customer-auth-context";
import { Logo } from "@/components/logo";
import { Minus, Plus, Trash2, ShoppingCart, Package } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function CartPage() {
  const { user } = useCustomerAuth();
  const { 
    items, 
    itemCount, 
    totalPrice, 
    isLoading, 
    error, 
    updateQuantity, 
    removeItem, 
    clearCart 
  } = useCart();

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 bg-white/90 backdrop-blur-sm">
          <CardContent className="text-center py-12">
            <ShoppingCart className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2 text-gray-800">Please Sign In</h2>
            <p className="text-gray-600 mb-6">
              You need to be logged in to view your cart
            </p>
            <Link href="/ecommerce/login">
              <Button className="bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900">
                Sign In
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="text-center py-12">
            <div className="text-red-500 mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2">Error</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-900 to-green-800 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Logo className="h-10" />
              <h1 className="text-2xl font-bold text-white">Your Shopping Cart</h1>
            </div>
            <Link href="/ecommerce">
              <Button 
                variant="outline" 
                className="border-white text-white hover:bg-white hover:text-green-900 transition-colors"
              >
                ← Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {items.length === 0 ? (
          <Card className="max-w-2xl mx-auto bg-white/80 backdrop-blur-sm">
            <CardContent className="text-center py-16">
              <ShoppingCart className="h-20 w-20 text-green-600 mx-auto mb-6" />
              <h2 className="text-2xl font-semibold mb-2 text-gray-800">Your cart is empty</h2>
              <p className="text-gray-600 mb-8">
                Looks like you haven't added any items to your cart yet
              </p>
              <Link href="/ecommerce">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-green-700 to-green-800 hover:from-green-800 hover:to-green-900"
                >
                  Start Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle>Cart Items ({itemCount} items)</CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={clearCart}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Cart
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {items.map((item) => (
                      <div key={item.id} className="p-6 flex items-center gap-4">
                        <div className="relative w-20 h-20 flex-shrink-0">
                          <Image
                            src={item.imageUrl || "/placeholder-product.png"}
                            alt={item.name}
                            width={80}
                            height={80}
                            className="object-cover rounded-lg w-full h-full"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder-product.png";
                            }}
                          />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                          <p className="text-sm text-gray-500">
                            {item.color} / {item.size}
                          </p>
                          <p className="text-lg font-semibold text-primary">
                            ETB {item.price.toFixed(2)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={isLoading}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-12 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={isLoading}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="text-right w-24">
                          <p className="font-semibold">
                            ETB {(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                        
                        <Button 
                          variant="ghost"
                          size="icon"
                          onClick={() => removeItem(item.id)}
                          disabled={isLoading}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Order Summary */}
            <div>
              <Card className="sticky top-8">
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal ({itemCount} items)</span>
                    <span className="font-semibold">ETB {totalPrice.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="font-semibold">ETB 50.00</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Tax</span>
                    <span className="font-semibold">ETB {(totalPrice * 0.15).toFixed(2)}</span>
                  </div>
                  
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>ETB {(totalPrice + 50 + (totalPrice * 0.15)).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white" size="lg" disabled={items.length === 0}>
                    Proceed to Checkout
                  </Button>
                  
                  <div className="text-center text-sm text-gray-500">
                    <p>Secure checkout with multiple payment options</p>
                  </div>
                </CardContent>
              </Card>
              
              {/* Payment Methods Placeholder */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">Payment Methods</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="border rounded-lg p-3 text-center text-sm text-gray-500">
                      CBE
                    </div>
                    <div className="border rounded-lg p-3 text-center text-sm text-gray-500">
                      TeleBirr
                    </div>
                    <div className="border rounded-lg p-3 text-center text-sm text-gray-500">
                      Bank
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-3 text-center">
                    Payment gateway integration coming soon
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}