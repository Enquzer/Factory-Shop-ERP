"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ShoppingCart,
  Search,
  Filter,
  User,
  LogOut,
  Package,
  MapPin,
  Star
} from "lucide-react";
import { EcommerceFooter } from "@/components/ecommerce-footer";
import { useCustomerAuth } from "@/contexts/customer-auth-context";
import { useCart } from "@/hooks/use-cart";
import { Logo } from "@/components/logo";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { EcommerceHeader } from "@/components/ecommerce-header";

type Product = {
  id: string;
  productCode: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  imageUrl?: string;
  variants: Array<{
    id: string;
    color: string;
    size: string;
    stock: number;
    imageUrl?: string;
  }>;
  readyToDeliver: number;
};

export default function EcommercePage() {
  const { user, logout } = useCustomerAuth();
  const { itemCount, totalPrice, addItem } = useCart();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/products?for=shop');
        const data = await response.json();
        setProducts(data);
        
        // Extract unique categories
        const uniqueCategories = Array.from(new Set(data.map((p: Product) => p.category))) as string[];
        setCategories(['all', ...uniqueCategories]);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Filter products
  useEffect(() => {
    let filtered = products.filter(product => product.readyToDeliver === 1);
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Apply category filter
    if (selectedCategory !== "all") {
      filtered = filtered.filter(product => product.category === selectedCategory);
    }
    
    setFilteredProducts(filtered);
  }, [products, searchTerm, selectedCategory]);


  const handleAddToCart = async (product: Product) => {
    // For now, add the first available variant
    const firstVariant = product.variants[0];
    if (firstVariant) {
      try {
        await addItem({
          productId: product.id,
          productVariantId: firstVariant.id,
          name: product.name,
          price: product.price,
          quantity: 1,
          color: firstVariant.color,
          size: firstVariant.size,
          imageUrl: firstVariant.imageUrl || product.imageUrl
        });
        
        toast({
          title: "Added to Bag!",
          description: `${product.name} has been added successfully.`,
          duration: 2000,
        });
      } catch (err) {
        // Error occurred
        toast({
          title: "Error",
          description: "Login required to add items to bag.",
          variant: "destructive",
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EcommerceHeader />

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-green-800 via-green-700 to-green-900 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-6">
            <Logo className="mx-auto h-16" />
          </div>
          <h2 className="text-4xl font-bold mb-4">Discover Our Latest Collection</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Shop the finest fashion products from Carement Fashion. Quality you can trust, style you'll love.
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search products..."
              className="pl-10 py-3 text-gray-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Category Filter */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                className={`${
                  selectedCategory === category 
                    ? "bg-green-600 text-white hover:bg-green-700" 
                    : "bg-orange-500 text-white hover:bg-orange-600 border-none"
                } transition-colors`}
                onClick={() => setSelectedCategory(category)}
              >
                {category === "all" ? "All Categories" : category}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <div className="relative aspect-square">
                <Image
                  src={product.imageUrl || "/placeholder-product.png"}
                  alt={product.name}
                  fill
                  className="object-cover rounded-t-lg"
                  style={{ objectFit: 'cover' }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/placeholder-product.png";
                  }}
                />
                {product.variants.length > 0 && (
                  <div className="absolute top-2 right-2 bg-white rounded-full p-1">
                    <span className="text-xs font-medium">
                      {product.variants.length} {product.variants.length === 1 ? 'variant' : 'variants'}
                    </span>
                  </div>
                )}
              </div>
              
              <CardHeader className="p-4">
                <CardTitle className="text-lg line-clamp-1">{product.name}</CardTitle>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-primary">
                    ETB {product.price?.toFixed(2)}
                  </span>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current" />
                    <span className="text-sm text-gray-600 ml-1">4.8</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="px-4 pb-4">
                <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                  {product.description || "High quality fashion product from Carement Fashion."}
                </p>
                
                <div className="flex gap-2">
                  <Button 
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white" 
                    onClick={() => handleAddToCart(product)}
                    disabled={product.variants.length === 0}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Add to Cart
                  </Button>
                  <Link href={`/ecommerce/products/${product.id}`}>
                    <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">View</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">
              {searchTerm || selectedCategory !== "all" 
                ? "Try adjusting your search or filter criteria" 
                : "No products available at the moment"}
            </p>
          </div>
        )}
      </section>

      <EcommerceFooter />
    </div>
  );
}