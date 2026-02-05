"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  ShoppingCart, 
  ArrowLeft, 
  ChevronRight, 
  Star, 
  Plus, 
  Minus, 
  Package, 
  Truck, 
  ShieldCheck,
  User as UserIcon
} from "lucide-react";
import { useCustomerAuth } from "@/contexts/customer-auth-context";
import { useCart } from "@/hooks/use-cart";
import { Logo } from "@/components/logo";
import Image from "next/image";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { EcommerceHeader } from "@/components/ecommerce-header";
import { EcommerceFooter } from "@/components/ecommerce-footer";

type Review = {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
};

type ProductVariant = {
  id: string;
  color: string;
  size: string;
  stock: number;
  imageUrl?: string;
};

type Product = {
  id: string;
  productCode: string;
  name: string;
  category: string;
  price: number;
  description?: string;
  imageUrl?: string;
  variants: ProductVariant[];
};

export default function ProductDetailPage() {
  const params = useParams();
  const productId = params.productId as string;
  const router = useRouter();
  const { user } = useCustomerAuth();
  const { itemCount, addItem } = useCart();
  const { toast } = useToast();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  
  // Review state
  const [userRating, setUserRating] = useState(5);
  const [userComment, setUserComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  
  // Selection state
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);

  // Fetch product and related products
  useEffect(() => {
    const fetchProductData = async () => {
      if (!productId) return;
      
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) throw new Error("Product not found");
        
        const data = await response.json();
        setProduct(data);
        
        // Auto-select first available options
        if (data.variants && data.variants.length > 0) {
          const firstInStock = data.variants.find((v: ProductVariant) => v.stock > 0) || data.variants[0];
          setSelectedColor(firstInStock.color);
          setSelectedSize(firstInStock.size);
        }
        
        // Fetch related products (same category)
        const productsRes = await fetch('/api/products?for=shop');
        if (productsRes.ok) {
          const allProducts = await productsRes.json();
          const related = allProducts
            .filter((p: Product) => p.category === data.category && p.id !== data.id)
            .slice(0, 4);
          setRelatedProducts(related);
        }
        
      } catch (error) {
        console.error("Error fetching product:", error);
        toast({
          title: "Error",
          description: "Could not load product details.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };



    const fetchReviews = async () => {
      try {
        setReviewsLoading(true);
        const response = await fetch(`/api/products/${productId}/reviews`);
        if (response.ok) {
          const data = await response.json();
          setReviews(data);
        }
      } catch (error) {
        console.error("Error fetching reviews:", error);
      } finally {
        setReviewsLoading(false);
      }
    };

    if (productId) {
      fetchProductData();
      fetchReviews();
    }
  }, [productId, toast]);

  // Derived state
  const colors = useMemo(() => {
    if (!product) return [];
    return Array.from(new Set(product.variants.map(v => v.color)));
  }, [product]);

  const sizes = useMemo(() => {
    if (!product || !selectedColor) return [];
    return product.variants
      .filter(v => v.color === selectedColor)
      .map(v => v.size);
  }, [product, selectedColor]);

  const currentVariant = useMemo(() => {
    if (!product || !selectedColor || !selectedSize) return null;
    return product.variants.find(v => v.color === selectedColor && v.size === selectedSize);
  }, [product, selectedColor, selectedSize]);

  const displayImage = useMemo(() => {
    return currentVariant?.imageUrl || product?.imageUrl || "/placeholder-product.png";
  }, [currentVariant, product]);

  const handleAddToCart = async () => {
    if (!product || !currentVariant) return;
    
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please sign in to add items to your bag.",
        variant: "destructive",
      });
      router.push("/ecommerce/login");
      return;
    }

    setIsAdding(true);
    try {
      await addItem({
        productId: product.id,
        productVariantId: currentVariant.id,
        name: product.name,
        price: product.price,
        quantity: quantity,
        color: currentVariant.color,
        size: currentVariant.size,
        imageUrl: displayImage
      });
      
      toast({
        title: "Added to Bag!",
        description: `${product.name} (${selectedColor}, ${selectedSize}) has been added.`,
        className: "bg-green-600 text-white border-none",
      });
    } catch (error) {
       toast({
        title: "Error",
        description: "Failed to add item to bag.",
        variant: "destructive",
      });
    } finally {
      setIsAdding(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast({
         title: "Login Required",
         description: "Please login to submit a review.",
         variant: "destructive" 
      });
      router.push('/ecommerce/login');
      return;
    }

    if (!userComment.trim()) {
      toast({
        title: "Comment Required",
        description: "Please share your thoughts about the product.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingReview(true);
    try {
      const response = await fetch(`/api/products/${productId}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('customerAuthToken')}`
        },
        body: JSON.stringify({
          rating: userRating,
          comment: userComment
        })
      });

      if (response.ok) {
        const newReview = await response.json();
        setReviews([newReview, ...reviews]);
        setUserComment("");
        setUserRating(5);
        toast({
          title: "Review Submitted",
          description: "Thank you for your feedback!",
          className: "bg-green-600 text-white"
        });
      } else {
        throw new Error('Failed to submit review');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit review. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
          <p className="text-gray-500 font-medium">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full text-center p-8">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Product Not Found</h2>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist or is no longer available.</p>
          <Link href="/ecommerce/products">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white">Back to Products</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <EcommerceHeader />

      <main className="container mx-auto px-4 py-8">
        {/* Navigation / Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link href="/ecommerce" className="hover:text-orange-600 transition-colors">Store</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/ecommerce/products" className="hover:text-orange-600 transition-colors">Products</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-gray-900 font-medium truncate">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          {/* Left: Image Gallery */}
          <div className="space-y-4">
            <div className="relative aspect-[4/5] rounded-3xl overflow-hidden bg-gray-100 shadow-xl group">
              <Image 
                src={displayImage} 
                alt={product.name} 
                fill 
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                priority
              />
              <Badge className="absolute top-6 left-6 bg-white/90 backdrop-blur-md text-gray-900 border-none px-4 py-2 text-sm font-bold shadow-sm">
                {product.category}
              </Badge>
            </div>
          </div>

          {/* Right: Product Info & Selection */}
          <div className="flex flex-col">
            <div className="mb-8">
              <h1 className="text-4xl font-extrabold text-gray-900 mb-2 leading-tight">{product.name}</h1>
              <p className="text-gray-400 text-sm font-medium uppercase tracking-widest mb-4">Code: {product.productCode}</p>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="flex bg-orange-50 px-3 py-1 rounded-full items-center">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="h-3 w-3 text-orange-500 fill-current" />
                  ))}
                  <span className="ml-2 text-xs font-bold text-orange-700">
                    {reviews.length > 0 
                      ? `${(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)} (${reviews.length} reviews)`
                      : "New Arrival"}
                  </span>
                </div>
                <div className="h-1 w-1 rounded-full bg-gray-300"></div>
                <Badge variant="outline" className="border-green-100 text-green-700 bg-green-50 font-medium">In Stock</Badge>
              </div>

              <div className="text-4xl font-black text-gray-900 flex items-baseline gap-2">
                <span className="text-xl font-bold text-orange-600 uppercase">ETB</span>
                {product.price?.toLocaleString()}
              </div>
            </div>

            <div className="space-y-8 mb-10">
              {/* Color Selection */}
              <div>
                <Label className="text-sm font-bold text-gray-900 mb-4 block">SELECT COLOR</Label>
                <div className="flex flex-wrap gap-3">
                  {colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${
                        selectedColor === color 
                          ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm" 
                          : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size Selection */}
              <div>
                <Label className="text-sm font-bold text-gray-900 mb-4 block">SELECT SIZE</Label>
                <div className="flex flex-wrap gap-3">
                  {sizes.length > 0 ? sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={`min-w-[50px] h-12 rounded-xl text-sm font-black transition-all border-2 ${
                        selectedSize === size 
                          ? "border-orange-500 bg-orange-50 text-orange-700 shadow-sm" 
                          : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200"
                      }`}
                    >
                      {size}
                    </button>
                  )) : (
                    <p className="text-sm text-rose-500 italic">No sizes available for selected color</p>
                  )}
                </div>
              </div>

              {/* Quantity Selection */}
              <div>
                <Label className="text-sm font-bold text-gray-900 mb-4 block">QUANTITY</Label>
                <div className="flex items-center gap-4 bg-gray-50 h-14 w-fit px-2 rounded-2xl border border-gray-100">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 text-gray-600 hover:bg-white rounded-xl shadow-sm hover:text-orange-600"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-black text-lg">{quantity}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 text-gray-600 hover:bg-white rounded-xl shadow-sm hover:text-orange-600"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                className="flex-1 h-16 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-orange-200"
                onClick={handleAddToCart}
                disabled={isAdding || !currentVariant || currentVariant.stock === 0}
              >
                {isAdding ? "Adding..." : currentVariant?.stock === 0 ? "Out of Stock" : "ADD TO BAG"}
                <ShoppingCart className="ml-3 h-5 w-5" />
              </Button>
              <Link href="/ecommerce/cart">
                <Button variant="outline" className="h-16 px-8 border-gray-200 rounded-2xl font-bold text-gray-500 hover:bg-gray-50">
                  CART
                </Button>
              </Link>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100 grid grid-cols-2 gap-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Fast Delivery</h4>
                  <p className="text-xs text-gray-500">Express Shipping</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-2xl text-green-600">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">Quality Assured</h4>
                  <p className="text-xs text-gray-500">Factory Direct</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Description */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Product Description</h2>
          <div className="prose prose-orange max-w-none text-gray-600 leading-relaxed bg-gray-50 p-8 rounded-3xl border border-gray-100">
            {product.description || "Indulge in the perfect blend of style and comfort with this premium Carement Fashion piece. Designed for the modern individual, this product features high-quality materials and meticulous craftsmanship, ensuring both durability and a sophisticated aesthetic. Whether you're heading to a formal event or keeping it casual, this versatile addition to your wardrobe will make a lasting impression."}
          </div>

        </section>

        {/* Reviews Section */}
        <section className="mb-20">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Reviews List */}
            <div className="lg:col-span-2 space-y-6">
              {reviewsLoading ? (
                <div className="text-center py-10 text-gray-400">Loading reviews...</div>
              ) : reviews.length > 0 ? (
                reviews.map((review) => (
                  <div key={review.id} className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 font-bold">
                          {review.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{review.customerName}</p>
                          <p className="text-xs text-gray-400">{new Date(review.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star 
                            key={star} 
                            className={`h-4 w-4 ${star <= review.rating ? "text-orange-500 fill-current" : "text-gray-300"}`} 
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                  <Star className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No reviews yet. Be the first to review!</p>
                </div>
              )}
            </div>

            {/* Write Review */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-lg top-24 sticky">
                <h3 className="font-bold text-lg text-gray-900 mb-4">Write a Review</h3>
                
                {!user ? (
                  <div className="text-center py-6">
                    <p className="text-gray-500 text-sm mb-4">Please login to share your experience.</p>
                    <Link href="/ecommerce/login">
                      <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">Login to Review</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Your Rating</Label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setUserRating(star)}
                            type="button"
                            className="focus:outline-none transition-transform hover:scale-110"
                          >
                            <Star 
                              className={`h-8 w-8 ${star <= userRating ? "text-orange-500 fill-current" : "text-gray-300"}`} 
                            />
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium mb-2 block">Your Feedback</Label>
                      <Textarea 
                        placeholder="What did you like or dislike?" 
                        className="bg-gray-50 border-gray-200 focus:border-orange-500 min-h-[120px]"
                        value={userComment}
                        onChange={(e) => setUserComment(e.target.value)}
                      />
                    </div>

                    <Button 
                      className="w-full bg-gray-900 hover:bg-gray-800 text-white h-12 rounded-xl font-bold"
                      onClick={handleSubmitReview}
                      disabled={isSubmittingReview}
                    >
                      {isSubmittingReview ? "Submitting..." : "Submit Review"}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="pt-10 border-t border-gray-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900 italic">Recommended for You</h2>
              <Link href="/ecommerce/products" className="text-orange-600 font-bold text-sm flex items-center hover:underline">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <Link key={p.id} href={`/ecommerce/products/${p.id}`} className="group">
                  <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-100 mb-4">
                    <Image 
                      src={p.imageUrl || "/placeholder-product.png"} 
                      alt={p.name} 
                      fill 
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <h3 className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1">{p.name}</h3>
                  <p className="text-sm font-black text-gray-500 mt-1">ETB {p.price.toLocaleString()}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Navigation Footer */}
        <div className="flex justify-center mt-20 mb-10">
          <Link href="/ecommerce/products">
            <Button variant="outline" className="border-gray-200 text-gray-500 h-14 px-8 rounded-2xl font-bold group hover:border-orange-500 hover:text-orange-600">
              <ArrowLeft className="h-4 w-4 mr-3 text-orange-500" />
              BACK TO STORE
            </Button>
          </Link>
        </div>
      </main>
      <EcommerceFooter />
    </div>
  );
}
