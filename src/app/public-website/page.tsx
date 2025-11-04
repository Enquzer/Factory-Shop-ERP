"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Mail, MapPin, Phone, ChevronLeft, ChevronRight, X } from "lucide-react";
import { getShops } from "@/lib/shops";
import { Shop } from "@/lib/shops";
import { PublicWebsiteHeader } from "@/components/public-website-header";
import { LoadingBar } from "@/components/loading-bar"; // Import the loading bar
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    {...props}
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.23.16 1.66.51.68 1.36.92 2.2.91.8.03 1.59-.14 2.3-.5.82-.4 1.49-1.08 1.89-1.96.24-.58.4-1.25.46-1.93.02-2.65.01-5.3-.01-7.94z" />
  </svg>
);

// Function to get the first available image URL from a product
const getProductImageUrl = (product: any): string => {
  // Use product's own image if available
  if (product?.imageUrl) {
    return product.imageUrl;
  }
  
  // Fallback to first variant's image if available
  if (product?.variants && product.variants.length > 0 && product.variants[0]?.imageUrl) {
    return product.variants[0].imageUrl;
  }
  
  // Default placeholder
  return '/placeholder-product.png';
};

// Function to group products by category
const groupProductsByCategory = (products: any[]) => {
  const categories: Record<string, any[]> = {};
  
  products.forEach(product => {
    const category = product?.category || 'Uncategorized';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(product);
  });
  
  return categories;
};

export default function PublicWebsite() {
    const [products, setProducts] = useState<any[]>([]);
    const [shops, setShops] = useState<Shop[]>([]);
    const [companyInfo, setCompanyInfo] = useState<any>(null);
    const [businessInsights, setBusinessInsights] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'products' | 'locations'>('products');
    const [zoomedImage, setZoomedImage] = useState<{url: string, name: string, index?: number, category?: string} | null>(null);
    const [expandedCategory, setExpandedCategory] = useState<{name: string, products: any[]} | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch public data from API
                const response = await fetch('/api/public-data');
                const data = await response.json();
                
                // Update state with fetched data
                if (data.companyInfo) {
                    setCompanyInfo(data.companyInfo);
                }
                
                // Fetch products directly from the products API
                const productsResponse = await fetch('/api/products');
                if (productsResponse.ok) {
                    const productsData = await productsResponse.json();
                    // Filter only ready-to-deliver products for public display
                    const publicProducts = productsData.filter((product: any) => product.readyToDeliver === 1);
                    setProducts(publicProducts);
                }
                
                // Fetch only active shops for public display
                const shopsData = await getShops();
                const activeShops = shopsData.filter(shop => shop.status === 'Active');
                setShops(activeShops);
                
                // Fetch business insights
                const insightsResponse = await fetch('/api/reports?type=owner-kpis');
                if (insightsResponse.ok) {
                    const insightsData = await insightsResponse.json();
                    setBusinessInsights(insightsData);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // Always render the same number of background images to prevent hydration issues
    const backgroundImages = useMemo(() => {
        return Array(8).fill(null).map((_, index) => {
            if (products && products[index]) {
                return products[index];
            }
            return { 
                id: `placeholder-${index}`, 
                name: 'Product', 
                imageUrl: '/placeholder-product.png',
                variants: []
            };
        });
    }, [products]);

    const productsByCategory = useMemo(() => {
        return groupProductsByCategory(products || []);
    }, [products]);

    // Create a flattened list of displayed products for navigation (with default empty array to prevent hydration issues)
    const displayedProducts = useMemo(() => {
        if (!products || Object.keys(groupProductsByCategory(products)).length === 0) {
            return [];
        }
        
        const categories = groupProductsByCategory(products);
        const result: any[] = [];
        Object.entries(categories).forEach(([category, categoryProducts]) => {
            result.push(...categoryProducts.slice(0, 4));
        });
        return result;
    }, [products]);

    

    // Function to navigate to next/previous image
    const navigateImage = (direction: 'next' | 'prev') => {
        if (!zoomedImage) return;
        
        // If we're in expanded category view
        if (zoomedImage.category && expandedCategory?.products) {
            const currentIndex = expandedCategory.products.findIndex((p: any) => 
                getProductImageUrl(p) === zoomedImage.url
            );
            
            if (currentIndex !== -1) {
                let newIndex;
                if (direction === 'next') {
                    newIndex = (currentIndex + 1) % expandedCategory.products.length;
                } else {
                    newIndex = (currentIndex - 1 + expandedCategory.products.length) % expandedCategory.products.length;
                }
                
                const newProduct = expandedCategory.products[newIndex];
                setZoomedImage({
                    url: getProductImageUrl(newProduct),
                    name: newProduct.name,
                    index: newIndex,
                    category: zoomedImage.category
                });
            }
        }
        // If we're in category grid view
        else if (zoomedImage.index !== undefined && displayedProducts.length > 0) {
            const currentIndex = zoomedImage.index;
            let newIndex;
            if (direction === 'next') {
                newIndex = (currentIndex + 1) % displayedProducts.length;
            } else {
                newIndex = (currentIndex - 1 + displayedProducts.length) % displayedProducts.length;
            }
            
            if (displayedProducts[newIndex]) {
                setZoomedImage({
                    url: getProductImageUrl(displayedProducts[newIndex]),
                    name: displayedProducts[newIndex].name,
                    index: newIndex
                });
            }
        }
    };

    return (
        <div className="flex flex-col min-h-screen" suppressHydrationWarning>
            {/* Add the image zoom dialog - always rendered but controlled by open state */}
            <Dialog open={zoomedImage !== null} onOpenChange={() => setZoomedImage(null)}>
                <DialogContent className="max-w-3xl p-0">
                    {/* Custom header with navigation controls */}
                    <div className="flex items-center justify-between p-4 border-b">
                        <DialogTitle className="text-lg font-medium">{zoomedImage?.name || "Product Image"}</DialogTitle>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => setZoomedImage(null)}
                            className="h-6 w-6"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    <div className="relative w-full h-[70vh]">
                        {zoomedImage && (
                            <>
                                <Image
                                    src={zoomedImage.url}
                                    alt={zoomedImage.name}
                                    fill
                                    className="object-contain"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = '/placeholder-product.png';
                                    }}
                                />
                                {/* Navigation buttons */}
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigateImage('prev');
                                    }}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigateImage('next');
                                    }}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
            
            {/* Add the expanded category dialog - always rendered but controlled by open state */}
            <Dialog open={expandedCategory !== null} onOpenChange={() => {
                setExpandedCategory(null);
                setZoomedImage(null);
            }}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto p-0">
                    <div className="flex items-center justify-between p-4 border-b">
                        <DialogTitle className="text-lg font-medium">
                            {expandedCategory?.name ? `${expandedCategory.name} Products` : "Category Products"}
                        </DialogTitle>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                                setExpandedCategory(null);
                                setZoomedImage(null);
                            }}
                            className="h-6 w-6"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 p-4">
                        {expandedCategory?.products?.map((product, index) => (
                            <div key={`expanded-${product.id}`} className="border rounded-lg overflow-hidden">
                                <div className="relative aspect-square">
                                    <Image
                                        src={getProductImageUrl(product)}
                                        alt={product.name}
                                        fill
                                        sizes="(max-width: 768px) 50vw, 25vw"
                                        className="object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                        onClick={() => setZoomedImage({
                                            url: getProductImageUrl(product),
                                            name: product.name,
                                            index: index,
                                            category: expandedCategory.name
                                        })}
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = '/placeholder-product.png';
                                        }}
                                    />
                                </div>
                                <div className="p-2">
                                    <h3 className="font-medium text-sm truncate">{product.name}</h3>
                                    <p className="text-xs text-muted-foreground">ETB {product.price?.toFixed(2) || '0.00'}</p>
                                </div>
                            </div>
                        )) || <div className="col-span-full text-center py-8 text-muted-foreground">No products available</div>}
                    </div>
                </DialogContent>
            </Dialog>
            
            <LoadingBar isLoading={isLoading} variant="public" message="Loading website..." />
            <PublicWebsiteHeader />
            
            {/* Hero Section */}
            <div className="relative">
                <div className="absolute inset-0 h-full w-full grid grid-cols-2 md:grid-cols-4">
                    {backgroundImages.map((product, index) => (
                        <div key={`bg-${product.id}-${index}`} className="relative h-full w-full">
                            <Image
                                src={getProductImageUrl(product)}
                                alt={product.name}
                                fill
                                sizes="(max-width: 768px) 50vw, 25vw"
                                priority={index < 4}
                                className="object-cover"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder-product.png';
                                }}
                            />
                        </div>
                    ))}
                    <div className="absolute inset-0 bg-black/50"></div>
                </div>
                
                <div className="relative z-10 flex flex-col items-center justify-center min-h-[70vh] p-4 text-center">
                    <Logo />
                    <h1 className="text-4xl md:text-6xl font-bold text-white tracking-widest uppercase my-8" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}>
                        Carement Fashion
                    </h1>
                    <p className="text-xl text-white max-w-2xl mb-8">
                        Premium fashion solutions connecting factories and retailers across Ethiopia
                    </p>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-grow container mx-auto px-4 py-8">
                {/* Company Overview */}
                <section className="mb-16">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-3xl text-center">About Carement Fashion</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-lg text-center mb-6">
                                Carement Fashion is a leading Ethiopian fashion company specializing in high-quality apparel for men, women, and children. 
                                We connect our state-of-the-art manufacturing facilities with a growing network of retail partners across the country.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                                <div className="text-center p-4">
                                    <div className="text-4xl font-bold text-primary">{companyInfo?.totalProducts || 0}+</div>
                                    <div className="text-lg">Product Designs</div>
                                </div>
                                <div className="text-center p-4">
                                    <div className="text-4xl font-bold text-primary">{companyInfo?.totalShops || 0}+</div>
                                    <div className="text-lg">Retail Locations</div>
                                </div>
                                <div className="text-center p-4">
                                    <div className="text-4xl font-bold text-primary">{companyInfo?.totalOrders || 0}+</div>
                                    <div className="text-lg">Orders Delivered</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* Data Dashboard */}
                <section className="mb-16">
                    <h2 className="text-3xl font-bold text-center mb-8">Our Product Collections</h2>
                    
                    <div className="flex justify-center mb-6">
                        <div className="inline-flex rounded-md shadow-sm" role="group">
                            <button
                                type="button"
                                className={`px-4 py-2 text-sm font-medium rounded-l-lg ${
                                    activeTab === 'products' 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                }`}
                                onClick={() => setActiveTab('products')}
                            >
                                Product Categories
                            </button>
                            <button
                                type="button"
                                className={`px-4 py-2 text-sm font-medium rounded-r-lg ${
                                    activeTab === 'locations' 
                                        ? 'bg-primary text-primary-foreground' 
                                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                }`}
                                onClick={() => setActiveTab('locations')}
                            >
                                Shop Locations
                            </button>
                        </div>
                    </div>

                    <div className="tab-content">
                        {activeTab === 'products' && (
                            <Card key="products-tab">
                                <CardHeader>
                                    <CardTitle>Product Categories</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isLoading ? (
                                        <div className="flex justify-center items-center h-32">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {Object.entries(productsByCategory).map(([category, categoryProducts]) => (
                                                <div key={`category-${category}`} className="border rounded-lg overflow-hidden">
                                                    <div className="p-4 bg-muted">
                                                        <h3 className="font-bold text-lg mb-2">{category}</h3>
                                                        <p className="text-sm text-muted-foreground">
                                                            {categoryProducts.length} {categoryProducts.length === 1 ? 'Product' : 'Products'}
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-2 p-2">
                                                        {categoryProducts.slice(0, 4).map((product, index) => {
                                                            // Find the index in the flattened list
                                                            const globalIndex = displayedProducts.findIndex((p: any) => p.id === product.id);
                                                            
                                                            return (
                                                                <div 
                                                                    key={`product-${product.id}`} 
                                                                    className="aspect-square relative cursor-pointer"
                                                                    onClick={() => setZoomedImage({
                                                                        url: getProductImageUrl(product),
                                                                        name: product.name,
                                                                        index: globalIndex >= 0 ? globalIndex : index
                                                                    })}
                                                                >
                                                                    <Image
                                                                        src={getProductImageUrl(product)}
                                                                        alt={product.name}
                                                                        fill
                                                                        sizes="(max-width: 768px) 25vw, 12vw"
                                                                        className="object-cover rounded hover:opacity-80 transition-opacity"
                                                                        onError={(e) => {
                                                                            const target = e.target as HTMLImageElement;
                                                                            target.src = '/placeholder-product.png';
                                                                        }}
                                                                    />
                                                                </div>
                                                            );
                                                        })}
                                                        {categoryProducts.length > 4 && (
                                                            <div 
                                                                key={`more-${category}`} 
                                                                className="aspect-square flex flex-col items-center justify-center bg-muted rounded cursor-pointer hover:bg-muted/80 transition-colors p-2"
                                                                onClick={() => setExpandedCategory({
                                                                    name: category,
                                                                    products: categoryProducts
                                                                })}
                                                            >
                                                                <span className="text-sm font-medium text-center">
                                                                    +{categoryProducts.length - 4} more
                                                                </span>
                                                                <Button variant="link" size="sm" className="text-xs p-0 h-auto mt-1">
                                                                    View All
                                                                </Button>
                                                            </div>
                                                        )}
                                                        {categoryProducts.length === 0 && (
                                                            <div key={`empty-${category}`} className="aspect-square flex items-center justify-center col-span-2">
                                                                <span className="text-muted-foreground">No products available</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                            {Object.keys(productsByCategory).length === 0 && !isLoading && (
                                                <div className="col-span-full text-center py-8 text-muted-foreground">
                                                    No products available
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                        
                        {activeTab === 'locations' && (
                            <Card key="locations-tab">
                                <CardHeader>
                                    <CardTitle>Shop Locations</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {isLoading ? (
                                        <div className="flex justify-center items-center h-32">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* Google Maps Embed */}
                                            <div className="relative h-96 w-full rounded-lg overflow-hidden border">
                                                <iframe
                                                    src={`https://www.google.com/maps/embed/v1/place?key=AIzaSyC2VKJw55Q4j291lg8T2wM1E9d5J6YdJ5Y&q=Addis+Ababa,Ethiopia&maptype=satellite`}
                                                    width="100%"
                                                    height="100%"
                                                    style={{ border: 0 }}
                                                    allowFullScreen
                                                    loading="lazy"
                                                    referrerPolicy="no-referrer-when-downgrade"
                                                ></iframe>
                                            </div>
                                            
                                            {/* Shop List */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                                {shops.map((shop) => (
                                                    <div key={`shop-${shop.id}`} className="border rounded-lg p-4">
                                                        <h3 className="font-bold text-lg mb-2">{shop.name}</h3>
                                                        <div className="space-y-1 text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                                <span>
                                                                    {shop.exactLocation}, {shop.city}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                                <span>{shop.contactPhone || 'N/A'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                                <span>{shop.username}</span>
                                                            </div>
                                                            <Button 
                                                                variant="link" 
                                                                size="sm" 
                                                                className="p-0 h-auto mt-2"
                                                                onClick={() => {
                                                                    const query = `${encodeURIComponent(shop.exactLocation)}, ${encodeURIComponent(shop.city)}`;
                                                                    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                                                                }}
                                                            >
                                                                View on Google Maps
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {shops.length === 0 && (
                                                    <div className="col-span-full text-center py-8 text-muted-foreground">
                                                        No shop locations available
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </section>

                {/* Analytics Section */}
                <section className="mb-16">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">Business Insights</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="mb-4">
                                Our company continues to grow with strong performance across all key metrics. 
                                We maintain high inventory turnover rates while ensuring consistent product quality.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border rounded-lg p-4">
                                    <h3 className="font-bold mb-2">On-Time Delivery Rate</h3>
                                    <div className="text-3xl font-bold text-primary">
                                        {businessInsights?.onTimeDeliveryRate ? `${businessInsights.onTimeDeliveryRate.toFixed(1)}%` : '92%'}
                                    </div>
                                    <p className="text-sm text-muted-foreground">Percentage of orders delivered on time</p>
                                </div>
                                <div className="border rounded-lg p-4">
                                    <h3 className="font-bold mb-2">Order Fulfillment Rate</h3>
                                    <div className="text-3xl font-bold text-primary">
                                        {businessInsights?.orderFulfillmentRate ? `${businessInsights.orderFulfillmentRate.toFixed(1)}%` : '95%'}
                                    </div>
                                    <p className="text-sm text-muted-foreground">Percentage of orders successfully completed</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-black/90 text-white p-6">
                <div className="container mx-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
                        <div className="md:col-span-2">
                            <h3 className="font-bold text-lg mb-2">Contact Us</h3>
                            <ul className="space-y-2 text-sm">
                                <li className="flex items-center justify-center md:justify-start gap-2">
                                    <MapPin className="h-4 w-4"/> 123 Industrial Zone, Addis Ababa
                                </li>
                                <li className="flex items-center justify-center md:justify-start gap-2">
                                    <Phone className="h-4 w-4"/> +251 911 123 456
                                </li>
                                <li className="flex items-center justify-center md:justify-start gap-2">
                                    <Mail className="h-4 w-4"/> contact@carement.com
                                </li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg mb-2">Website</h3>
                            <ul className="space-y-2 text-sm">
                                <li><Link href="#" className="hover:underline">www.carement.com</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold text-lg mb-2">Follow Us</h3>
                            <div className="flex justify-center md:justify-start space-x-4">
                                <Link href="#" className="hover:text-accent transition-colors">
                                    <Facebook className="h-6 w-6"/>
                                </Link>
                                <Link href="#" className="hover:text-accent transition-colors">
                                    <Instagram className="h-6 w-6"/>
                                </Link>
                                <Link href="#" className="hover:text-accent transition-colors">
                                    <TikTokIcon className="h-6 w-6"/>
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="text-center text-xs text-gray-400 pt-6 mt-6 border-t border-gray-600">
                        &copy; {new Date().getFullYear()} Carement Fashion. All Rights Reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}