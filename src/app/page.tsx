"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Mail, MapPin, Phone, HomeIcon, ShoppingBag } from "lucide-react";
import { getProducts } from "@/lib/products";
import { HomepageLoginForm } from "@/components/homepage-login-form";
import { LoadingBar } from "@/components/loading-bar"; // Import the loading bar

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

export default function Home() {
    const [products, setProducts] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = async () => {
            // Use API to fetch products instead of direct database access
            const productsData = await getProducts();
            setProducts(productsData);
            setIsLoading(false);
        };
        fetchProducts();
    }, []);

  const backgroundImages = products.slice(0, 8);

  return (
    <div className="flex flex-col min-h-screen theme-ecommerce">
      <LoadingBar isLoading={isLoading} variant="erp" message="Loading..." />
       <div className="absolute inset-0 h-full w-full grid grid-cols-2 md:grid-cols-4">
        {isLoading ? (
             Array.from({ length: 8 }).map((_, index) => (
                <div key={`loading-${index}`} className="relative h-full w-full bg-muted animate-pulse"></div>
             ))
        ) : (
            backgroundImages.map((product, index) => (
              <div key={`bg-${product.id}-${index}`} className="relative h-full w-full">
                <Image
                  src={product.imageUrl || '/placeholder-product.png'}
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
            ))
        )}
        <div className="absolute inset-0 bg-black/50"></div>
      </div>
      
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center p-4 text-center">
        <Logo />
        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-widest uppercase my-8" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}>
            Welcome to Carement
        </h1>
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
          <Card className="flex-1 bg-card/90 backdrop-blur-sm">
            <CardHeader className="space-y-4">
              <CardTitle className="text-2xl text-center text-card-foreground">Login</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              {/* Show the login form directly */}
              <HomepageLoginForm />
              <div className="flex justify-center gap-4 mt-4 pt-4 border-t">
                <Link href="/public-website" title="Home Page">
                  <HomeIcon className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors" />
                </Link>
                <Link href="/ecommerce" title="Shop Online">
                  <ShoppingBag className="h-6 w-6 text-muted-foreground hover:text-orange-600 transition-colors" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="relative z-10 bg-black/50 backdrop-blur-sm text-white p-6">
        <div className="container mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-center md:text-left">
                <div className="md:col-span-2">
                    <h3 className="font-bold text-lg mb-2">Contact Us</h3>
                    <ul className="space-y-2 text-sm">
                        <li className="flex items-center justify-center md:justify-start gap-2"><MapPin className="h-4 w-4"/> 123 Industrial Zone, Addis Ababa</li>
                        <li className="flex items-center justify-center md:justify-start gap-2"><Phone className="h-4 w-4"/> +251 911 123 456</li>
                        <li className="flex items-center justify-center md:justify-start gap-2"><Mail className="h-4 w-4"/> contact@carement.com</li>
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
                        <Link href="#" className="hover:text-accent transition-colors"><Facebook className="h-6 w-6"/></Link>
                        <Link href="#" className="hover:text-accent transition-colors"><Instagram className="h-6 w-6"/></Link>
                        <Link href="#" className="hover:text-accent transition-colors"><TikTokIcon className="h-6 w-6"/></Link>
                    </div>
                </div>
            </div>
            <div className="text-center text-xs text-gray-400 pt-6 mt-6 border-t border-gray-600">
                &copy; {new Date().getFullYear()} Carement. All Rights Reserved.
            </div>
        </div>
      </footer>
    </div>
  );
}