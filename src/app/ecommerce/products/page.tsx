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
  Star,
  ChevronLeft,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import { useCustomerAuth } from "@/contexts/customer-auth-context";
import { useCart } from "@/hooks/use-cart";
import { Logo } from "@/components/logo";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { EcommerceHeader } from "@/components/ecommerce-header";
import { EcommerceFooter } from "@/components/ecommerce-footer";

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

export default function ProductsPage() {
  const { user, logout } = useCustomerAuth();
  const { itemCount, totalPrice, addItem } = useCart();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const productsPerPage = 12;

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/products?for=shop');
        const data = await response.json();
        setProducts(data);
        
        // Extract unique categories
        const uniqueCategories = Array.from(new Set((data as Product[]).map(p => String(p.category ?? ''))));
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
    setCurrentPage(1); // Reset to first page when filters change
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
        console.error("Failed to add to cart:", err);
        toast({
          title: "Error",
          description: "Login required to add items to bag.",
          variant: "destructive",
        });
      }
    }
  };

  // Pagination
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage);

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <EcommerceHeader />

      {/* Products Section */}
      <section className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Our Products</h1>
          <p className="text-gray-600">Discover our latest fashion collection</p>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                type="text"
                placeholder="Search products..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Category Filter */}
            <div className="md:col-span-2 flex flex-wrap gap-2">
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
            
            {/* Results Count */}
            <div className="flex items-center text-gray-600">
              <Package className="h-5 w-5 mr-2" />
              <span>{filteredProducts.length} products found</span>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="text-center py-16">
              <Package className="h-20 w-20 text-gray-300 mx-auto mb-6" />
              <h2 className="text-2xl font-semibold mb-2">No products found</h2>
              <p className="text-gray-600 mb-8">
                {searchTerm || selectedCategory !== "all" 
                  ? "Try adjusting your search or filter criteria" 
                  : "No products available at the moment"}
              </p>
              <Link href="/ecommerce">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  <ArrowLeft className="h-4 w-4 mr-2 text-white" />
                  Back to Store
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {currentProducts.map((product) => (
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
                        <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white">
                          View
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2">
                <Button
                  variant="outline"
                  onClick={prevPage}
                  disabled={currentPage === 1}
                  className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <div className="flex space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      onClick={() => setCurrentPage(page)}
                      className={currentPage === page 
                        ? "bg-orange-500 hover:bg-orange-600 text-white" 
                        : "border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                      }
                    >
                      {page}
                    </Button>
                  ))}
                </div>
                
                <Button
                  variant="outline"
                  onClick={nextPage}
                  disabled={currentPage === totalPages}
                  className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </section>
      <EcommerceFooter />
    </div>
  );
}