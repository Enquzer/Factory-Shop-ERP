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
import { useCustomerAuth } from "@/contexts/customer-auth-context";
import { useCart } from "@/hooks/use-cart";
import { Logo } from "@/components/logo";
import Image from "next/image";
import Link from "next/link";

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
  const { itemCount, totalPrice } = useCart();
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

  const handleAddToCart = (product: Product) => {
    // For now, add the first available variant
    const firstVariant = product.variants[0];
    if (firstVariant) {
      // In a real implementation, you'd want to let the user select variant
      // This is just a placeholder
      console.log("Add to cart:", product, firstVariant);
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
      {/* Header */}
      <header className="bg-gradient-to-r from-green-900 to-green-800 shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <Logo className="h-12" />
              <nav className="hidden md:flex space-x-6">
                <Link href="/public-website" className="text-white hover:text-green-200 font-medium transition-colors">
                  Home
                </Link>
                <Link href="/ecommerce/products" className="text-white hover:text-green-200 transition-colors">
                  Products
                </Link>
                {user && (
                  <Link href="/ecommerce/orders" className="text-white hover:text-green-200 transition-colors">
                    My Orders
                  </Link>
                )}
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Cart */}
              <Link href="/ecommerce/cart" className="relative p-2">
                <ShoppingCart className="h-6 w-6 text-gray-600" />
                {itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {itemCount}
                  </span>
                )}
              </Link>
              
              {/* User Menu */}
              {user ? (
                <div className="flex items-center space-x-3">
                  <span className="text-white font-medium">Hello, {user.firstName}</span>
                  <Button 
                    variant="default" 
                    size="sm" 
                    onClick={logout}
                    className="bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </div>
              ) : (
                <Link href="/ecommerce/login">
                  <Button 
                    variant="default"
                    className="bg-orange-500 hover:bg-orange-600 text-white transition-colors"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Login
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

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
                    ? "bg-orange-500 text-white hover:bg-orange-600" 
                    : "text-white border-white hover:bg-orange-500 hover:text-white"
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

      {/* Footer */}
      <footer className="bg-gradient-to-r from-green-900 to-green-800 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="mb-4">
                <Logo className="h-12" />
              </div>
              <p className="text-green-200">
                Premium fashion solutions connecting factories and retailers across Ethiopia.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-green-200">Quick Links</h4>
              <ul className="space-y-2 text-green-300">
                <li><Link href="/ecommerce" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link href="/ecommerce/products" className="hover:text-white transition-colors">Products</Link></li>
                <li><Link href="/ecommerce/about" className="hover:text-white transition-colors">About Us</Link></li>
                <li><Link href="/ecommerce/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-green-200">Customer Service</h4>
              <ul className="space-y-2 text-green-300">
                <li><Link href="/ecommerce/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/ecommerce/returns" className="hover:text-white transition-colors">Returns</Link></li>
                <li><Link href="/ecommerce/shipping" className="hover:text-white transition-colors">Shipping Info</Link></li>
                <li><Link href="/ecommerce/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4 text-green-200">Contact Info</h4>
              <div className="space-y-2 text-green-300">
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>123 Industrial Zone, Addis Ababa</span>
                </div>
                <div>+251 911 123 456</div>
                <div>contact@carement.com</div>
              </div>
            </div>
          </div>
          
          <div className="border-t border-green-700 mt-8 pt-8 text-center text-green-300">
            <p>&copy; {new Date().getFullYear()} Carement Fashion. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}