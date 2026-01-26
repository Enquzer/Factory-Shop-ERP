"use client";
/** POS Page - Fixed Module Resolution */


import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ShoppingCart, Plus, Minus, Trash2, Users, TrendingUp, DollarSign, Package, Search, Calendar, ChevronDown, X, Check, Square, User, BarChart3, ShoppingCart as CartIcon, Award } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VisitorCounterUpdated from '@/components/visitor-counter-updated';
import { toast } from '@/hooks/use-toast';

// Use shop inventory item type
type POSProduct = {
  id: number;
  shopId: string;
  productId: string;
  productCode: string;
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
  productCode: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  color: string;
  size: string;
};

type BestSellingProduct = {
  name: string;
  productId: string;
  color: string;
  size: string;
  category: string;
  quantity: number;
  totalSales: number;
  imageUrl?: string;
};

type POSStats = {
  totalSales: number;
  itemsSold: number;
  transactions: number;
  visitors: number;
  uniqueProductsSold: number;
  atv: number;
  upt: number;
  footTrafficConversion: number;
  bestSellingProducts: BestSellingProduct[];
};

export default function POSPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<POSProduct[]>([]);
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
  const [scannedProductCode, setScannedProductCode] = useState('');
  const [productVariants, setProductVariants] = useState<POSProduct[]>([]);
  const [showVariantsTable, setShowVariantsTable] = useState(false);
  const [stats, setStats] = useState<POSStats>({
    totalSales: 0,
    itemsSold: 0,
    transactions: 0,
    visitors: 0,
    uniqueProductsSold: 0,
    atv: 0,
    upt: 0,
    footTrafficConversion: 0,
    bestSellingProducts: []
  });
  const [activeTab, setActiveTab] = useState('shop');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get shopId for the current user
  useEffect(() => {
    if (!user) return;

    const fetchShopId = async () => {
      try {
        // Try to fetch shop by username
        const response = await fetch(`/api/shops/${user.username}`);
        if (response.ok) {
          const shop = await response.json();
          if (shop && shop.id) {
            setShopId(shop.id);
            return;
          }
        }
        
        // If not found by username or user is admin, fetch all and take the first one
        const allShopsRes = await fetch('/api/shops?limit=10');
        if (allShopsRes.ok) {
          const data = await allShopsRes.json();
          // The API returns { shops: [], totalCount: ... } or []
          const shops = Array.isArray(data) ? data : (data.shops || []);
          if (shops.length > 0) {
            // Priority to a certain shop if needed, or just the first
            setShopId(shops[0].id);
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

  // Fetch POS stats
  useEffect(() => {
    if (shopId) {
      fetchStats();
    }
  }, [shopId, selectedDate]);

  const fetchProducts = async () => {
    if (!shopId) return;
    
    try {
      // Fetch from shop inventory using shopId for better reliability
      const res = await fetch(`/api/shop-inventory?shopId=${shopId}`);
      if (res.ok) {
        const data = await res.json();
        // Transform shop inventory data to POSProduct format
        const posProducts = data.map((item: any) => ({
          id: item.id,
          shopId: item.shopId,
          productId: item.productId,
          productCode: item.productCode,
          productVariantId: item.productVariantId,
          name: item.name,
          price: item.price,
          color: item.color,
          size: item.size,
          stock: item.stock,
          imageUrl: item.imageUrl
        }));
        setProducts(posProducts);
        setSelectedProduct(null);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch from POS sales API
      const res = await fetch(`/api/pos/sales/stats?shopId=${shopId}&date=${selectedDate}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Create a memoized list of filtered unique products for the catalog search
  const filteredProducts = useMemo(() => {
    // 1. Group variants into unique products (prioritize variants with stock)
    const unique = products.reduce((acc: POSProduct[], current) => {
      const existing = acc.find(p => p.productId === current.productId);
      if (!existing) {
        acc.push(current);
      } else if (current.stock > 0 && (existing.stock === 0)) {
        const index = acc.indexOf(existing);
        acc[index] = current;
      }
      return acc;
    }, []).filter((p: POSProduct) => products.some((v: POSProduct) => v.productId === p.productId && v.stock > 0));

    // 2. Apply search filter
    if (searchQuery.trim() === '') {
      return unique;
    } else {
      const query = searchQuery.toLowerCase();
      return unique.filter((product: POSProduct) => 
        product.name.toLowerCase().includes(query) ||
        product.productCode.toLowerCase().includes(query) ||
        // Also check if any of its variants match color/size
        products.some((v: POSProduct) => v.productId === product.productId && (
          v.color.toLowerCase().includes(query) || 
          v.size.toLowerCase().includes(query)
        ))
      );
    }
  }, [products, searchQuery]);

  // Handle product selection from dropdown - Now shows variants matrix
  const handleProductSelect = (selected: POSProduct) => {
    setSelectedProduct(selected);
    const variants = products.filter(p => p.productId === selected.productId);
    if (variants.length > 0) {
      setProductVariants(variants);
      setShowVariantsTable(true);
      setIsDropdownOpen(false);
      setSearchQuery('');
    }
  };

  // Add selected product to cart
  const addSelectedProductToCart = () => {
    if (selectedProduct) {
      addProductToCart(selectedProduct);
      setSelectedProduct(null);
    }
  };

  // Add product to cart by scanning code
  const addProductToCart = (product: POSProduct, silent = false) => {
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
          productCode: product.productCode,
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
    
    if (!silent) {
      toast({
        title: "Added to cart",
        description: `${product.name} added to cart`,
      });
    }
  };

  // Handle product code input for scanning
  const handleProductCodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scannedProductCode.trim()) {
      const query = scannedProductCode.trim().toLowerCase();
      
      // Try exact match first
      const exactMatch = products.filter(p => 
        p.productCode.toLowerCase() === query || 
        p.productVariantId.toLowerCase() === query
      );

      const matchedVariants = exactMatch.length > 0 ? exactMatch : products.filter(p => 
        p.productCode.toLowerCase().includes(query)
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
        if (productIds.length > 0) {
          // If we matched multiple products, but one is an exact code match, pick that
          let variantsToDisplay = productMap.get(productIds[0])!;
          
          if (productIds.length > 1) {
            const exactProductMatch = Array.from(productMap.entries()).find(([id, items]) => 
              items.some(v => v.productCode.toLowerCase() === query)
            );
            if (exactProductMatch) {
              variantsToDisplay = exactProductMatch[1];
            }
          }

          setProductVariants(variantsToDisplay);
          setShowVariantsTable(true);
          setScannedProductCode('');
          setSelectedProduct(variantsToDisplay[0]);
          toast({
            title: "Product Found",
            description: `Showing variants for ${variantsToDisplay[0]?.name}`,
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

  // Toggle product in cart (add/remove) - Used by matrix
  const handleVariantToggle = (variant: POSProduct) => {
    const isInCart = cart.some(item => item.productVariantId === variant.productVariantId);
    
    if (isInCart) {
      // Remove from cart
      setCart(prev => prev.filter(item => item.productVariantId !== variant.productVariantId));
    } else {
      // Add to cart
      if (variant.stock <= 0) {
        toast({
          title: "Out of stock",
          description: "This variant is currently out of stock",
          variant: "destructive"
        });
        return;
      }
      addProductToCart(variant, true); // Silent add
    }
  };


  // Cancel variant selection
  const cancelVariantSelection = () => {
    setProductVariants([]);
    setShowVariantsTable(false);
    setScannedProductCode('');
    setSelectedProduct(null);
  };

  // Update cart item quantity
  const updateQuantity = (productVariantId: string, change: number) => {
    setCart(prev => prev.map(item =>
      item.productVariantId === productVariantId
        ? { ...item, quantity: Math.max(0, item.quantity + change) }
        : item
    ).filter(item => item.quantity > 0));
  };

  // Remove item from cart
  const removeItem = (productVariantId: string) => {
    setCart(prev => prev.filter(item => item.productVariantId !== productVariantId));
  };

  // Calculate total
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discount = 0;
  const total = subtotal - discount;
  const tax = total * (0.15 / 1.15); // Derived 15% tax (inclusive)

  // Process sale
  const processSale = async () => {
    if (cart.length === 0) return;
    
    setIsProcessing(true);
    try {
      const res = await fetch('/api/pos/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shopId,
          items: cart.map(item => ({
            productVariantId: item.productVariantId,
            productCode: item.productCode,
            quantity: item.quantity,
            price: item.price
          })),
          customerName: customerName || null,
          isSameCustomer,
          total,
          date: selectedDate
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
    <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-screen bg-slate-50/50 pb-20 lg:pb-6">
      {/* Top Navigation / Header */}
      <div className="bg-white border-b sticky top-0 z-30 px-4 py-3 shadow-sm">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center justify-between w-full md:w-auto">
            <h1 className="text-xl font-black tracking-tight text-primary flex items-center gap-2">
              <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
                <ShoppingCart className="h-5 w-5" />
              </div>
              Carement POS
            </h1>
            <div className="md:hidden flex items-center gap-2">
               <Input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-28 h-8 text-[10px] bg-slate-50 border-none font-bold"
              />
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
              <Calendar className="h-4 w-4 text-slate-500" />
              <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-sm font-bold focus:outline-none"
              />
            </div>
          </div>

          <div className="w-full md:w-auto">
            <TabsList className="grid grid-cols-3 w-full h-10 p-1 bg-slate-100 rounded-xl">
              <TabsTrigger value="shop" className="rounded-lg text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <Package className="h-3.5 w-3.5 mr-1.5" /> Shop
              </TabsTrigger>
              <TabsTrigger value="cart" className="relative rounded-lg text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <CartIcon className="h-3.5 w-3.5 mr-1.5" /> Cart
                {cart.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="stats" className="rounded-lg text-xs font-bold transition-all data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">
                <TrendingUp className="h-3.5 w-3.5 mr-1.5" /> Stats
              </TabsTrigger>
            </TabsList>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 max-w-7xl">
          {/* TAB 1: SHOP (Product Search & Selection) */}
          <TabsContent value="shop" className="mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-12 space-y-4">
                {/* Search Bar Group */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="border-none shadow-md overflow-hidden bg-white">
                    <CardContent className="p-4">
                      <Label htmlFor="productCode" className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Quick Scan / Entry</Label>
                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                        <Input
                          id="productCode"
                          value={scannedProductCode}
                          onChange={(e) => setScannedProductCode(e.target.value)}
                          onKeyDown={handleProductCodeScan}
                          placeholder="Scan barcode or type code..."
                          className="pl-10 text-base h-12 bg-slate-50 border-none rounded-xl focus-visible:ring-2 focus-visible:ring-primary/20 transition-all font-medium"
                          autoFocus
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-none shadow-md overflow-hidden bg-white">
                    <CardContent className="p-4">
                      <Label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 block">Catalog Search</Label>
                      <div className="relative" ref={dropdownRef}>
                        <div 
                          className="flex items-center justify-between w-full h-12 px-4 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors group"
                          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            {selectedProduct ? (
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="bg-primary/10 text-primary border-none pointer-events-none">
                                  {selectedProduct?.productCode}
                                </Badge>
                                <span className="text-sm font-bold truncate">{selectedProduct?.name}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm font-medium">Browse products...</span>
                            )}
                          </div>
                          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                        
                        {isDropdownOpen && (
                          <div className="absolute z-40 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-3 bg-slate-50">
                              <Input
                                placeholder="Filter by name, color, code..."
                                className="h-10 bg-white border-slate-200 rounded-lg text-sm focus-visible:ring-primary/10"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                              />
                            </div>
                            <div className="max-h-64 overflow-y-auto">
                              {filteredProducts.length > 0 ? (
                                filteredProducts.map(product => (
                                  <div
                                    key={product.id}
                                    className="flex items-center gap-3 p-3 hover:bg-primary/5 cursor-pointer border-b border-slate-50 last:border-b-0 transition-colors"
                                    onClick={() => handleProductSelect(product)}
                                  >
                                    <div className="w-12 h-12 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden shadow-inner">
                                      {product.imageUrl ? (
                                        <img 
                                          src={product.imageUrl} 
                                          alt={product.name} 
                                          className="w-full h-full object-cover" 
                                          loading="eager"
                                          decoding="async"
                                        />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                          <Package className="h-5 w-5" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="text-sm font-black text-slate-800 truncate leading-tight">{product.name}</div>
                                      <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1 mt-1 uppercase tracking-tighter">
                                        {product.productCode}
                                      </div>
                                      <div className="flex items-center justify-between mt-1">
                                        <span className="text-xs font-black text-primary">From ETB {product.price}</span>
                                        <Badge variant="secondary" className="text-[9px] h-4 py-0 bg-primary/5 text-primary border-none">
                                          {products.filter(v => v.productId === product.productId).length} Variants
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div className="p-8 text-center">
                                  <div className="mb-2 flex justify-center"><Search className="h-8 w-8 text-slate-200" /></div>
                                  <p className="text-sm text-slate-400 font-medium">No matches found</p>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {selectedProduct && (
                        <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                          <Button 
                            onClick={addSelectedProductToCart}
                            className="w-full bg-primary font-bold shadow-lg shadow-primary/20 rounded-xl h-10 hover:scale-[1.01] active:scale-[0.98] transition-all"
                          >
                            Add to Cart
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Variants Matrix */}
                {showVariantsTable && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
                      <CardHeader className="bg-slate-50/50 pb-4 border-b">
                        <div className="flex justify-between items-center sm:flex-row gap-4">
                          <div className="flex items-center gap-3">
                             <div className="p-2 bg-white rounded-xl shadow-sm">
                               <Package className="h-6 w-6 text-primary" />
                             </div>
                             <div>
                               <h3 className="font-black text-slate-900 leading-tight">{productVariants[0]?.name}</h3>
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Catalog Reference: {productVariants[0]?.productCode}</span>
                             </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            <Button size="sm" variant="ghost" onClick={cancelVariantSelection} className="text-slate-500 font-bold hover:bg-slate-100">Close Matrix</Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="overflow-x-auto custom-scrollbar">
                          {(() => {
                            const colors = Array.from(new Set(productVariants.map(v => v.color)));
                            const sizes = Array.from(new Set(productVariants.map(v => v.size)));
                            const sizeOrder = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL', '4XL', '5XL'];
                            sizes.sort((a, b) => {
                              const indexA = sizeOrder.indexOf(a.toUpperCase());
                              const indexB = sizeOrder.indexOf(b.toUpperCase());
                              if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                              const numA = parseFloat(a);
                              const numB = parseFloat(b);
                              if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                              return a.localeCompare(b);
                            });

                            const matrix: Record<string, Record<string, POSProduct>> = {};
                            const colorImages: Record<string, string | undefined> = {};
                            productVariants.forEach(v => {
                              if (!matrix[v.color]) matrix[v.color] = {};
                              matrix[v.color][v.size] = v;
                              if (v.imageUrl) colorImages[v.color] = v.imageUrl;
                            });

                            return (
                              <table className="w-full border-collapse">
                                <thead>
                                  <tr className="bg-slate-50/80">
                                    <th className="p-4 border-b border-slate-100 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest min-w-[160px]">Available Styles</th>
                                    {sizes.map(size => (
                                      <th key={size} className="p-4 border-b border-slate-100 text-center text-xs font-black text-slate-800 uppercase tracking-tighter w-24">
                                        {size}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {colors.map(color => (
                                    <tr key={color} className="group/row">
                                      <td className="p-4 bg-white font-medium border-b border-slate-50">
                                        <div className="flex items-center gap-3">
                                          <div className="w-12 h-12 bg-slate-100 rounded-xl overflow-hidden shadow-inner group-hover/row:scale-105 transition-transform duration-300 border border-slate-100">
                                            {colorImages[color] ? (
                                              <img 
                                                src={colorImages[color]} 
                                                alt={color} 
                                                className="w-full h-full object-cover" 
                                                loading="eager"
                                                decoding="async"
                                              />
                                            ) : (
                                              <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                <Package className="h-6 w-6" />
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-800">{color}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">Style Variant</span>
                                          </div>
                                        </div>
                                      </td>
                                      {sizes.map(size => {
                                        const variant = matrix[color]?.[size];
                                        const isInCart = variant ? cart.some(item => item.productVariantId === variant.productVariantId) : false;
                                        if (!variant) return <td key={size} className="p-1 border-b border-slate-50 bg-slate-50/20"></td>;

                                        return (
                                          <td 
                                            key={size} 
                                            className={`p-1 border-b border-slate-50 transition-all cursor-pointer relative group-cell ${
                                              isInCart ? 'bg-primary/5' : 'hover:bg-slate-50'
                                            }`}
                                            onClick={() => handleVariantToggle(variant)}
                                          >
                                            <div className={`m-1 p-2 rounded-xl flex flex-col items-center justify-center min-h-[64px] border-2 transition-all ${
                                              isInCart ? 'bg-white border-primary shadow-lg ring-4 ring-primary/5' : 'bg-white border-transparent shadow-sm'
                                            }`}>
                                              {isInCart && (
                                                <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-0.5 shadow-md scale-110 animate-in zoom-in duration-300">
                                                  <Check className="h-3 w-3" />
                                                </div>
                                              )}
                                              <div className="text-xs font-black text-slate-900">ETB {Math.round(variant.price)}</div>
                                              <div className={`mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                variant.stock > 10 ? 'bg-emerald-50 text-emerald-600' :
                                                variant.stock > 0 ? 'bg-amber-50 text-amber-600' :
                                                'bg-rose-50 text-rose-600'
                                              }`}>
                                                {variant.stock > 0 ? `${variant.stock} left` : 'Out'}
                                              </div>
                                            </div>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            );
                          })()}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: CART (Order Items & Checkout) */}
          <TabsContent value="cart" className="mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              
              {/* Cart Items List */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
                  <CardHeader className="bg-slate-50/50 pb-4 border-b">
                     <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-black flex items-center gap-2">
                          <ShoppingCart className="h-5 w-5 text-primary" />
                          Order Items
                        </CardTitle>
                        <Badge variant="secondary" className="bg-primary/10 text-primary border-none pointer-events-none font-black px-3 py-1">
                          {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
                        </Badge>
                     </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {cart.length > 0 ? (
                      <div className="divide-y divide-slate-100">
                        {cart.map(item => (
                          <div key={item.productVariantId} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-slate-50/50 transition-colors group">
                            <div className="flex items-center gap-4 flex-1">
                              <div className="w-16 h-16 bg-slate-100 rounded-2xl overflow-hidden border border-slate-100 shadow-sm flex-shrink-0">
                                {item.imageUrl ? (
                                  <img 
                                    src={item.imageUrl} 
                                    alt={item.name} 
                                    className="w-full h-full object-cover" 
                                    loading="eager"
                                    decoding="async"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                                    <Package className="h-8 w-8" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-black text-slate-900 group-hover:text-primary transition-colors">{item.name}</h4>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">
                                  {item.productCode} • {item.color} • {item.size}
                                </p>
                                <div className="text-sm font-black text-primary mt-1">ETB {item.price.toFixed(2)}</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between sm:justify-end gap-6 sm:w-auto">
                              <div className="flex items-center bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-50"
                                  onClick={() => updateQuantity(item.productVariantId, -1)}
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </Button>
                                <span className="w-10 text-center text-sm font-black">{item.quantity}</span>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-lg text-slate-500 hover:text-emerald-500 hover:bg-emerald-50"
                                  onClick={() => updateQuantity(item.productVariantId, 1)}
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right hidden sm:block">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Subtotal</div>
                                  <div className="text-sm font-black text-slate-800">ETB {(item.price * item.quantity).toFixed(0)}</div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-9 w-9 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                                  onClick={() => removeItem(item.productVariantId)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-20 text-center">
                        <div className="mx-auto w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-slate-200">
                          <ShoppingCart className="h-10 w-10 text-slate-200" />
                        </div>
                        <h3 className="text-lg font-black text-slate-800">Cart is empty</h3>
                        <p className="text-sm text-slate-400 font-medium max-w-xs mx-auto mt-2">Add items from the Shop tab to start processing a new transaction.</p>
                        <Button className="mt-8 rounded-xl font-bold bg-primary px-8 shadow-lg shadow-primary/20" onClick={() => setActiveTab('shop')}>Go to Shop</Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Summary & Checkout Column */}
              <div className="space-y-6">
                <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-2xl">
                  <div className="bg-primary/5 p-6 border-b border-primary/10">
                    <h3 className="text-sm font-black text-primary uppercase tracking-widest mb-1">Current Balance</h3>
                    <div className="flex items-baseline gap-2">
                       <span className="text-[10px] font-black text-primary">ETB</span>
                       <span className="text-4xl font-black text-slate-900 tracking-tighter">{total.toFixed(0)}</span>
                       <span className="text-xs font-bold text-slate-400">.{total.toFixed(2).split('.')[1]}</span>
                    </div>
                  </div>
                  <CardContent className="p-6 space-y-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="customerName" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 px-1">Customer Profile (Optional)</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                          <Input
                            id="customerName"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="Type customer name..."
                            className="pl-10 bg-slate-50 border-none rounded-xl text-sm font-medium focus-visible:ring-primary/10"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 bg-slate-50 p-3 rounded-xl border border-slate-100 group transition-all hover:bg-slate-100/50">
                        <input
                          type="checkbox"
                          id="sameCustomer"
                          checked={isSameCustomer}
                          onChange={(e) => setIsSameCustomer(e.target.checked)}
                          className="h-5 w-5 rounded-md border-slate-300 text-primary focus:ring-primary/20 cursor-pointer"
                        />
                        <Label htmlFor="sameCustomer" className="text-xs font-bold text-slate-600 cursor-pointer select-none">Same customer as previous</Label>
                      </div>
                    </div>

                    <div className="pt-2">
                      <Button
                        className="w-full bg-primary py-7 rounded-2xl text-lg font-black shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:shadow-none disabled:grayscale"
                        size="lg"
                        onClick={processSale}
                        disabled={cart.length === 0 || isProcessing}
                      >
                        {isProcessing ? 'Verifying...' : 'Finalize Sale'}
                      </Button>
                      <p className="text-[9px] text-center text-slate-400 font-bold uppercase tracking-tighter mt-4 flex items-center justify-center gap-2">
                        <Check className="h-3 w-3 text-emerald-500" /> Secure Point of Sale Receipt Generated
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* TAB 3: PERFORMANCE (Stats & Dashboard) */}
          <TabsContent value="stats" className="mt-0 focus-visible:outline-none">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Traffic Tracker */}
              <div className="lg:col-span-1">
                <VisitorCounterUpdated selectedDate={selectedDate} />
              </div>

              {/* Performance Cards */}
              <div className="lg:col-span-2 space-y-6">
                 {/* Today's Stats Card */}
                 <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white overflow-hidden rounded-2xl">
                    <CardHeader className="pb-2 border-b border-white/10 bg-black/20">
                      <div className="flex justify-between items-center">
                        <CardTitle className="text-lg font-black flex items-center gap-2 uppercase tracking-widest text-indigo-300">
                          <TrendingUp className="h-5 w-5" />
                          Market Pulse
                        </CardTitle>
                        <Badge variant="outline" className="border-indigo-500/50 text-indigo-400 font-black animate-pulse">
                          LIVE
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-8">
                       <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                          <div>
                             <p className="text-xs font-bold text-indigo-300 uppercase tracking-widest opacity-80">Accumulated Revenue</p>
                             <div className="flex items-baseline gap-2 mt-1">
                                <span className="text-lg font-bold text-indigo-200">ETB</span>
                                <h3 className="text-5xl font-black tracking-tight">{stats.totalSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</h3>
                                <span className="text-sm font-bold text-indigo-400">.{stats.totalSales.toFixed(2).split('.')[1]}</span>
                             </div>
                          </div>
                          <div className="flex items-center gap-4 bg-white/5 p-3 rounded-2xl border border-white/5 backdrop-blur-md">
                             <div className="text-center px-4 border-r border-white/10">
                                <div className="text-[10px] font-black text-indigo-300 uppercase tracking-tighter opacity-70">Orders</div>
                                <div className="text-xl font-black">{stats.transactions}</div>
                             </div>
                             <div className="text-center px-4">
                                <div className="text-[10px] font-black text-indigo-300 uppercase tracking-tighter opacity-70">Items</div>
                                <div className="text-xl font-black">{stats.itemsSold}</div>
                             </div>
                          </div>
                       </div>

                       <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-center">
                             <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest mb-1 opacity-60 italic">ATV</span>
                             <span className="text-lg font-black leading-tight">ETB {Math.round(stats.atv)}</span>
                             <span className="text-[8px] text-white/40 mt-1">Avg Transaction</span>
                          </div>
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-center">
                             <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest mb-1 opacity-60 italic">UPT</span>
                             <span className="text-lg font-black leading-tight">{stats.upt.toFixed(1)}</span>
                             <span className="text-[8px] text-white/40 mt-1">Units Per Txn</span>
                          </div>
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-center">
                             <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest mb-1 opacity-60 italic">CR %</span>
                             <span className="text-lg font-black leading-tight">{stats.footTrafficConversion.toFixed(1)}%</span>
                             <span className="text-[8px] text-white/40 mt-1">Convert Rate</span>
                          </div>
                          <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col justify-center">
                             <span className="text-[8px] font-black text-indigo-300 uppercase tracking-widest mb-1 opacity-60 italic">SKUs</span>
                             <span className="text-lg font-black leading-tight">{stats.uniqueProductsSold}</span>
                             <span className="text-[8px] text-white/40 mt-1">Uniq Products</span>
                          </div>
                       </div>
                    </CardContent>
                 </Card>

                 {/* Top Products View */}
                 {stats.bestSellingProducts.length > 0 && (
                   <Card className="border-none shadow-xl bg-white overflow-hidden rounded-2xl">
                      <CardHeader className="bg-slate-50/50 pb-4 border-b">
                        <CardTitle className="text-sm font-black flex items-center gap-2 uppercase tracking-widest text-slate-500">
                          <Award className="h-4 w-4 text-amber-500" />
                          Bestsellers of the day
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <div className="divide-y divide-slate-100">
                          {stats.bestSellingProducts.map((product, index) => (
                            <div key={index} className="flex items-center gap-4 p-4 hover:bg-slate-50 transition-colors">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${
                                index === 0 ? 'bg-amber-100 text-amber-600' : 
                                index === 1 ? 'bg-slate-100 text-slate-600' : 
                                'bg-orange-100 text-orange-600'
                              }`}>
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-black text-slate-800 leading-tight truncate">{product.name}</div>
                                <div className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase">
                                  {product.color} • {product.size}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-black text-primary">ETB {Math.round(product.totalSales)}</div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{product.quantity} units</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                   </Card>
                 )}
              </div>
            </div>
          </TabsContent>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </Tabs>
  );
}
