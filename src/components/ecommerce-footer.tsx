"use client";

import { Logo } from "@/components/logo";
import { MapPin } from "lucide-react";
import Link from "next/link";

export function EcommerceFooter() {
  return (
    <footer className="bg-gradient-to-r from-green-900 to-green-800 text-white py-12 mt-auto">
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
              <li><Link href="/public-website" className="hover:text-white transition-colors font-medium text-orange-400">Public Landing Page</Link></li>
              <li><Link href="/ecommerce" className="hover:text-white transition-colors">E-Commerce Home</Link></li>
              <li><Link href="/ecommerce/products" className="hover:text-white transition-colors">Products</Link></li>
              <li><Link href="/ecommerce/terms" className="hover:text-white transition-colors">Terms & Conditions</Link></li>
              <li><Link href="/ecommerce/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/ecommerce/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold mb-4 text-green-200">Customer Service</h4>
            <ul className="space-y-2 text-green-300">
              <li><Link href="/ecommerce/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/ecommerce/returns" className="hover:text-white transition-colors">Return Policy</Link></li>
              <li><Link href="/ecommerce/shipping" className="hover:text-white transition-colors">Shipping Info</Link></li>
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
  );
}
