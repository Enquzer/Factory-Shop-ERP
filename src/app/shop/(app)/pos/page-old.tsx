"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus, Trash2, Users, TrendingUp, DollarSign, Package, Search, Calendar, ChevronDown, X, Check, Square } from 'lucide-react';
import VisitorCounterUpdated from '@/components/visitor-counter-updated';
import { toast } from '@/hooks/use-toast';

// Use shop inventory item type
type POSProduct = {
  id: number;
  shopId: string;
  productId: string;
  productVariantId: string;
  name: string;
  price: number;
  color: string;
  size: string;
  stock: number;
  imageUrl?: string;
};

type CartItem = {
  productVariantId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  color: string;
  size: string;
};

export default function POSPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<POSProduct[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productCode, setProductCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [isSameCustomer, setIsSameCustomer] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [shopId, setShopId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<POSProduct | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<POSProduct[]>([]);
  const [scannedProductCode, setScannedProductCode] = useState('');
  const [productVariants, setProductVariants] = useState<POSProduct[]>([]);
  const [showVariantsTable, setShowVariantsTable] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get shopId for the current user
  useEffect(() => {
    if (!user || user.role !== 'shop') return;

    const fetchShopId = async () => {
      try {
        const response = await fetch(`/api/shops/${user.username}`);
        if (response.ok) {
          const shop = await response.json();
          if (shop) {
            setShopId(shop.id);
          }
        }
      } catch (error) {
        console.error('Error fetching shop ID:', error);
      }
    };

    fetchShopId();
  }, [user?.username]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fetch POS products
  useEffect(() => {
    if (shopId) {
      fetchProducts();
    }
  }, [shopId]);

  const fetchProducts = async () => {
    try {
      // Fetch from shop inventory instead of POS products
      const res = await fetch(`/api/shop-inventory?username=${user?.username}`);
      if (res.ok) {
        const data = await res.json();
        // Transform shop inventory data to POSProduct format
        const posProducts = data.map((item: any) => ({
          id: item.id,
          shopId: item.shopId,
          productId: item.productId,
          productVariantId: item.productVariantId,
          name: item.name,
          price: item.price,
          color: item.color,
          size: item.size,
          stock: item.stock,
          imageUrl: item.imageUrl
        }));
        setProducts(posProducts);
        setFilteredProducts(posProducts);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Filter products based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(products);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredProducts(products.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.color.toLowerCase().includes(query) ||
        product.size.toLowerCase().includes(query) ||
        product.productId.toLowerCase().includes(query)
      ));
    }
  }, [searchQuery, products]);

  // Handle product selection from dropdown
  const handleProductSelect = (product: POSProduct) => {
    setSelectedProduct(product);
    setIsDropdownOpen(false);
    setSearchQuery('');
    toast({
      title: "Product Selected",
      description: `${product.name} (${product.color}/${product.size}) selected`,
    });
  };

  // Add selected product to cart
  const addSelectedProductToCart = () => {
    if (selectedProduct) {
      addProductToCart(selectedProduct);
      setSelectedProduct(null);
    }
  };

  // Add product to cart by scanning code
  const addProductToCart = (product: POSProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.productVariantId === product.productVariantId);
      if (existing) {
        return prev.map(item =>
          item.productVariantId === product.productVariantId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prev, {
          productVariantId: product.productVariantId,
          name: product.name,
          price: product.price,
          quantity: 1,
          imageUrl: product.imageUrl,
          color: product.color,
          size: product.size
        }];
      }
    });
    setProductCode('');
    setSearchQuery('');
    toast({
      title: "Added to cart",
      description: `${product.name} added to cart`,
    });
  };

  // Handle product code input for scanning
  const handleProductCodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scannedProductCode.trim()) {
      const matchedVariants = products.filter(p => 
        p.productId.toLowerCase().includes(scannedProductCode.trim().toLowerCase())
      );
        
      if (matchedVariants.length > 0) {
        // Group variants by product ID
        const productMap = new Map<string, POSProduct[]>();
        matchedVariants.forEach(variant => {
          if (!productMap.has(variant.productId)) {
            productMap.set(variant.productId, []);
          }
          productMap.get(variant.productId)!.push(variant);
        });
          
        const productIds = Array.from(productMap.keys());
        if (productIds.length === 1) {
          const variants = productMap.get(productIds[0])!;
          setProductVariants(variants);
          setSelectedVariants([]);
          setShowVariantsTable(true);
          setProductCode('');
          toast({
            title: "Product Variants Found",
            description: `Found ${variants.length} variants for this product`},
          });
        } else {
          toast({
            title: "Multiple Products Found",
            description: `Please select one product from the ${productIds.length} products found`,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Product not found",
          description: "No products found with this code",
          variant: "destructive"
        });
      }
    }
  };
  
  // Handle product code input for existing functionality
  const handleProductCodeInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && productCode.trim()) {
      const product = products.find(p => p.productId === productCode.trim() || p.name.toLowerCase().includes(productCode.trim().toLowerCase()));
      if (product) {
        addProductToCart(product);
      } else {
        toast({
          title: "Product not found",
          description: "Please check the product code",
          variant: "destructive"
        });
      }
    }
  };
  
  // Handle variant selection
  const handleVariantToggle = (variant: POSProduct) => {
    setSelectedVariants(prev => {
      const isSelected = prev.find(v => v.productVariantId === variant.productVariantId);
      if (isSelected) {
        return prev.filter(v => v.productVariantId !== variant.productVariantId);
      } else {
        return [...prev, variant];
      }
    });
  };
  
  // Add selected variants to cart
  const addVariantsToCart = () => {
    selectedVariants.forEach(variant => {
      addProductToCart({
        ...variant,
        quantity: 1
      });
    });
    setProductVariants([]);
    setSelectedVariants([]);
    setShowVariantsTable(false);
    setScannedProductCode('');
    toast({
      title: "Added to Cart",
      description: `${selectedVariants.length} variant(s) added to cart`,
    });
  };
  
  // Cancel variant selection
  const cancelVariantSelection = () => {
    setProductVariants([]);
    setSelectedVariants([]);
    setShowVariantsTable(false);
    setScannedProductCode('');
  };

  // Update cart item quantity
  const updateQuantity = (productVariantId: string, delta: number) => {
    setCart(prev => prev.map(item =>
      item.productVariantId === productVariantId
        ? { ...item, quantity: Math.max(0, item.quantity + delta) }
        : item
    ).filter(item => item.quantity > 0));
  };

  // Remove item from cart
  const removeItem = (productVariantId: string) => {
    setCart(prev => prev.filter(item => item.productVariantId !== productVariantId));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const tax = 0; // Can be configured
  const discount = 0; // Can be configured
  const total = subtotal + tax - discount;

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to cart",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    try {
      const res = await fetch('/api/pos/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId: shopId,
          customerName: customerName || null,
          items: cart,
          paymentMethod: 'cash',
          isSameCustomer
        })
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Sale completed",
          description: `Transaction ID: ${data.transactionId}`,
        });
        setCart([]);
        setCustomerName('');
        setIsSameCustomer(false);
      } else {
        const error = await res.json();
        toast({
          title: "Sale failed",
          description: error.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error processing sale:', error);
      toast({
        title: "Error",
        description: "Failed to process sale",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Point of Sale</h1>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShoppingCart className="h-4 w-4" />
              <span>Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-32 text-sm"
              />
            </div>
          </div>
        </div>
        <div className="w-80">
          <VisitorCounterUpdated />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Scanner */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Scan Product</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="productCode">Product Code (Scan or Enter)</Label>
                  <Input
                    id="productCode"
                    value={productCode}
                    onChange={(e) => setProductCode(e.target.value)}
                    onKeyDown={handleProductCodeInput}
                    placeholder="Enter product code or scan barcode"
                    className="text-lg"
                  />
                </div>

                <div>
                  <Label htmlFor="search">Search Products</Label>
                  <div className="relative" ref={dropdownRef}>
                    <div 
                      className="flex items-center justify-between w-full px-3 py-2 border rounded-md bg-white cursor-pointer hover:bg-gray-50"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      <div className="flex items-center gap-2">
                        {selectedProduct ? (
                          <>
                            {selectedProduct.imageUrl && (
                              <img 
                                src={selectedProduct.imageUrl} 
                                alt={selectedProduct.name} 
                                className="w-8 h-8 object-cover rounded"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium">{selectedProduct.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {selectedProduct.productId} | {selectedProduct.color} / {selectedProduct.size} | Stock: {selectedProduct.stock}
                              </div>
                            </div>
                          </>
                        ) : (
                          <span className="text-muted-foreground">
                            {searchQuery || "Select a product..."}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {selectedProduct && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-6 w-6 p-0" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedProduct(null);
                              setSearchQuery('');
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        <ChevronDown className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>
                    
                    {isDropdownOpen && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        <Input
                          placeholder="Search products..."
                          className="border-0 rounded-none focus-visible:ring-0"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          autoFocus
                        />
                        <div className="border-t">
                          {filteredProducts.length > 0 ? (
                            filteredProducts.map(product => (
                              <div
                                key={product.id}
                                className="flex items-center gap-3 p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                                onClick={() => handleProductSelect(product)}
                              >
                                {product.imageUrl && (
                                  <img 
                                    src={product.imageUrl} 
                                    alt={product.name} 
                                    className="w-12 h-12 object-cover rounded"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium truncate">{product.name}</div>
                                  <div className="text-sm text-muted-foreground">
                                    Code: {product.productId} | {product.color} / {product.size}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    Stock: {product.stock} | ETB {product.price.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-4 text-center text-muted-foreground">
                              {searchQuery ? `No products found for "${searchQuery}"` : "No products available"}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {selectedProduct && (
                    <div className="mt-3 flex gap-2">
                      <Button 
                        onClick={addSelectedProductToCart}
                        className="flex-1"
                      >
                        Add to Cart
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>


        </div>

        {/* Payment Panel */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customerName">Customer Name (Optional)</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="sameCustomer"
                  checked={isSameCustomer}
                  onChange={(e) => setIsSameCustomer(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="sameCustomer">Same customer as previous</Label>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Items:</span>
                  <span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>ETB {total.toFixed(2)}</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={processSale}
                disabled={cart.length === 0 || isProcessing}
              >
                {isProcessing ? 'Processing...' : 'Complete Sale'}
              </Button>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Today's Sales</span>
                </div>
                <Badge variant="secondary">ETB 0.00</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Items Sold</span>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Transactions</span>
                </div>
                <Badge variant="secondary">0</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}