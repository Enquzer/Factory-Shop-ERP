
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Mail, MapPin, Phone } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";

const backgroundImages = [
    { src: "https://picsum.photos/seed/prod1/800/1000", alt: "Man wearing a classic tee", hint: "man t-shirt" },
    { src: "https://picsum.photos/seed/prod2/800/1000", alt: "Woman in a summer dress", hint: "woman dress" },
    { src: "https://picsum.photos/seed/prod3/800/1000", alt: "Kid wearing a graphic hoodie", hint: "kids hoodie" },
    { src: "https://picsum.photos/seed/prod4/800/1000", alt: "Unisex denim jacket", hint: "denim jacket" },
    { src: "https://picsum.photos/seed/prod5/800/1000", alt: "Man in a striped shirt", hint: "man shirt" },
    { src: "https://picsum.photos/seed/prod6/800/1000", alt: "Woman wearing a jumpsuit", hint: "woman jumpsuit" },
    { src: "https://picsum.photos/seed/garment1/800/1000", alt: "Close up of fabric texture", hint: "fabric texture" },
    { src: "https://picsum.photos/seed/garment2/800/1000", alt: "Stack of folded jeans", hint: "jeans stack" },
];

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

  return (
    <div className="relative flex flex-col min-h-screen w-full">
      <div className="absolute inset-0 h-full w-full">
         <Carousel
            opts={{ loop: true }}
            className="h-full w-full"
        >
            <CarouselContent className="-ml-0 h-full">
                {backgroundImages.map((image, index) => (
                    <CarouselItem key={index} className="pl-0 relative h-full w-full">
                         <Image
                            src={image.src}
                            alt={image.alt}
                            fill
                            priority={index === 0}
                            className="object-cover"
                            data-ai-hint={image.hint}
                        />
                    </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
        <div className="absolute inset-0 bg-black/50"></div>
      </div>
      
      <main className="relative z-10 flex-grow flex flex-col items-center justify-center p-4 text-center">
        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-widest uppercase mb-8" style={{ textShadow: '2px 2px 8px rgba(0,0,0,0.7)' }}>
            Welcome to Carement
        </h1>
        <Card className="mx-auto max-w-sm w-full bg-card/80 backdrop-blur-sm">
          <CardHeader className="space-y-4">
            <div className="flex justify-center">
              <Logo />
            </div>
            <CardTitle className="text-2xl text-center text-card-foreground">Login Portal</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button asChild size="lg">
              <Link href="/factory/login">Factory Login</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/shop/login">Shop Login</Link>
            </Button>
          </CardContent>
        </Card>
      </main>

      <footer className="relative z-10 bg-black/50 backdrop-blur-sm text-white p-6">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-center md:text-left">
            <div>
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
      </footer>
    </div>
  );
}
