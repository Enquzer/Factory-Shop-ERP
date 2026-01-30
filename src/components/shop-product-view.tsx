"use client";

import { useState, useEffect } from "react";
import { Product } from "@/lib/products";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Search, Package, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { StockDistributionChart } from "@/components/stock-distribution-chart";
import { useShopInventory } from "@/hooks/use-shop-inventory";
import { useAuth } from "@/contexts/auth-context";
import { SimplifiedOrderDialog } from "@/components/simplified-order-dialog";
import { getShopById } from "@/lib/shops";
import Image from "next/image";
import { ProductFeedbackSummary } from "@/components/product-feedback-summary";

interface ShopProductViewProps {
  shopId: string;
  onAddToOrder: (productCode: string, quantities: Map<string, number>) => void;
}

export function ShopProductView({ shopId, onAddToOrder }: ShopProductViewProps) {
  const { user } = useAuth();
  const { inventory: shopInventory } = useShopInventory(shopId);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [shop, setShop] = useState<any>(null);
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<Product | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchProducts();
    fetchShopDetails();
  }, [shopId]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/view?shopId=${shopId}`);
      if (!response.ok) throw new Error("Failed to fetch products");
      
      const data = await response.json();
      setProducts(data.products);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to load products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchShopDetails = async () => {
    try {
      const response = await fetch(`/api/shops?id=${shopId}`);
      if (!response.ok) throw new Error("Failed to fetch shop details");
      
      const shopData = await response.json();
      setShop(shopData);
    } catch (error) {
      console.error("Error fetching shop details:", error);
    }
  };

  const filteredProducts = products.filter(product => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      product.productCode.toLowerCase().includes(term) ||
      product.name.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term)
    );
  });

  const handleAddToOrder = (product: any) => {
    if (shop?.showVariantDetails) {
      // Detailed view - shop can select specific variants
      setSelectedProduct(product);
    } else {
      // Aggregated view - show simplified order dialog
      // First, get the full product details
      const fullProduct = products.find((p: any) => p.id === product.id) || product;
      setSelectedProductForOrder(fullProduct);
    }
  };

  const handleVariantSelection = (variantId: string, quantity: number) => {
    if (!selectedProduct) return;
    
    const quantities = new Map<string, number>();
    quantities.set(variantId, quantity);
    onAddToOrder(selectedProduct.productCode, quantities);
    
    setSelectedProduct(null);
    
    toast({
      title: "Product Added",
      description: `Added ${quantity} units to your order.`,
    });
  };

  const handleSimplifiedOrderPlaced = (productCode: string, quantities: Map<string, number>) => {
    onAddToOrder(productCode, quantities);
    
    toast({
      title: "Order Placed",
      description: `Your order for ${productCode} has been placed. AI will distribute across variants.`,
    });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading products...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products by code, name, or category..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {selectedProduct ? (
        <Card>
          <CardHeader>
            <CardTitle>{selectedProduct.name} Variants</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Stock Distribution Chart for detailed view */}
            {selectedProduct.variants && (
              <div className="mb-6">
                <StockDistributionChart 
                  product={selectedProduct}
                  shopInventory={shopInventory}
                  viewType="shop"
                />
              </div>
            )}
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Color</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedProduct.variants.map((variant: any) => (
                  <VariantRow 
                    key={variant.id} 
                    variant={variant} 
                    onAdd={handleVariantSelection} 
                  />
                ))}
              </TableBody>
            </Table>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={() => setSelectedProduct(null)}
            >
              Back to Products
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.productCode} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{product.name}</CardTitle>
                <div className="flex justify-between items-center">
                  <Badge variant="secondary">{product.category}</Badge>
                  <span className="text-sm font-medium">ETB {product.price.toLocaleString()}</span>
                </div>
                <ProductFeedbackSummary 
                  product={product} 
                  className="mt-2" 
                  showButton={false}
                />
              </CardHeader>
              <CardContent>
                <div className="relative w-12 h-12 rounded-md overflow-hidden">
                  <Image 
                    src={product.imageUrl || '/placeholder-product.png'} 
                    alt={product.name} 
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      // Only set fallback if not already set to avoid infinite loop
                      if (target.src !== window.location.origin + '/placeholder-product.png') {
                        target.src = '/placeholder-product.png';
                      }
                    }}
                    // Add loading strategy
                    loading="lazy"
                    // Add key to force re-render when src changes
                    key={product.imageUrl || 'placeholder'}
                  />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Package className="mr-1 h-4 w-4" />
                    <span>Code: {product.productCode}</span>
                  </div>
                </div>
                
                {shop?.showVariantDetails ? (
                  // Detailed view with variants
                  <div className="space-y-2">
                    <div className="flex items-center text-sm">
                      <Tag className="mr-1 h-4 w-4" />
                      <span>{product.variants.length} variants</span>
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      <Table>
                        <TableBody>
                          {product.variants.slice(0, 3).map((variant: any) => (
                            <TableRow key={variant.id}>
                              <TableCell className="p-1 text-xs">{variant.color}, {variant.size}</TableCell>
                              <TableCell className="p-1 text-right text-xs">
                                <Badge variant={variant.stock > 0 ? "default" : "destructive"}>
                                  {variant.stock}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                          {product.variants.length > 3 && (
                            <TableRow>
                              <TableCell colSpan={2} className="p-1 text-xs text-center">
                                +{product.variants.length - 3} more variants
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ) : (
                  // Aggregated view (Simplified) - BUT showing availability as read-only
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Available</span>
                      <Badge variant={product.totalAvailable > 0 ? "default" : "destructive"}>
                        {product.totalAvailable}
                      </Badge>
                    </div>
                    
                    {/* Read-only variant breakdown */}
                    <div className="mt-2 border rounded-md p-2 bg-muted/20">
                      <p className="text-xs font-medium mb-1 text-muted-foreground">Available Stock:</p>
                      <div className="max-h-24 overflow-y-auto text-xs space-y-1">
                        {product.variants.map((v: any) => (
                          <div key={v.id} className="flex justify-between">
                            <span>{v.color} - {v.size}</span>
                            <span className={v.stock > 0 ? "text-green-600 font-medium" : "text-red-500"}>
                              {v.stock}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      Order in packs of 12. Variants are automatically distributed based on availability.
                    </p>
                  </div>
                )}
                
                {/* Stock Distribution Chart Toggle */}
                {shop?.showVariantDetails && (
                  <div className="mt-4">
                    <StockDistributionChart 
                      product={product}
                      shopInventory={shopInventory}
                      viewType="shop"
                    />
                  </div>
                )}
                
                <Button 
                  className="w-full mt-4" 
                  onClick={() => handleAddToOrder(product)}
                  disabled={shop?.showVariantDetails ? product.variants.some((v: any) => v.stock > 0) === false : product.totalAvailable <= 0}
                >
                  Add to Order
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Simplified Order Dialog */}
      {selectedProductForOrder && (
        <SimplifiedOrderDialog
          product={selectedProductForOrder}
          open={!!selectedProductForOrder}
          onOpenChange={(open) => !open && setSelectedProductForOrder(null)}
          onOrderPlaced={handleSimplifiedOrderPlaced}
          shopId={shopId}
        />
      )}
    </div>
  );
}

function VariantRow({ variant, onAdd }: { variant: any; onAdd: (variantId: string, quantity: number) => void }) {
  const [quantity, setQuantity] = useState(1);
  
  const handleAddClick = () => {
    if (quantity > 0 && quantity <= variant.stock) {
      onAdd(variant.id, quantity);
    }
  };
  
  return (
    <TableRow>
      <TableCell>{variant.color}</TableCell>
      <TableCell>{variant.size}</TableCell>
      <TableCell>
        <Badge variant={variant.stock > 0 ? "default" : "destructive"}>
          {variant.stock}
        </Badge>
      </TableCell>
      <TableCell>
        <Input
          type="number"
          min="1"
          max={variant.stock}
          value={quantity}
          onChange={(e) => setQuantity(Math.min(Math.max(1, parseInt(e.target.value) || 1), variant.stock))}
          className="w-20"
          disabled={variant.stock === 0}
        />
      </TableCell>
      <TableCell>
        <Button 
          size="sm" 
          onClick={handleAddClick}
          disabled={variant.stock === 0 || quantity <= 0 || quantity > variant.stock}
        >
          Add
        </Button>
      </TableCell>
    </TableRow>
  );
}