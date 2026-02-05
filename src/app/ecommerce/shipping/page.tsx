"use client";

import { EcommerceHeader } from "@/components/ecommerce-header";
import { EcommerceFooter } from "@/components/ecommerce-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, MapPin, Clock, ShieldCheck, Info, Globe } from "lucide-react";

export default function ShippingInfoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <EcommerceHeader />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Truck className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
            <h1 className="text-4xl font-black text-gray-900 mb-4">Shipping & Delivery Information</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We are committed to delivering your fashion choices quickly and safely. Here is everything you need to know about our logistics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <Card className="border-none shadow-md bg-white text-center p-6">
              <Clock className="h-8 w-8 text-indigo-500 mx-auto mb-3" />
              <h3 className="font-bold mb-2">Fast Dispatch</h3>
              <p className="text-sm text-gray-500">Orders processed within 24 hours of payment verification.</p>
            </Card>
            <Card className="border-none shadow-md bg-white text-center p-6">
              <MapPin className="h-8 w-8 text-indigo-500 mx-auto mb-3" />
              <h3 className="font-bold mb-2">Real-time Pins</h3>
              <p className="text-sm text-gray-500">Precision delivery using interactive map coordinates.</p>
            </Card>
            <Card className="border-none shadow-md bg-white text-center p-6">
              <ShieldCheck className="h-8 w-8 text-indigo-500 mx-auto mb-3" />
              <h3 className="font-bold mb-2">Insured Transit</h3>
              <p className="text-sm text-gray-500">All packages are protected against damage during transit.</p>
            </Card>
          </div>

          <Card className="border-none shadow-xl rounded-3xl overflow-hidden mb-12">
            <CardContent className="p-8 md:p-12 space-y-12">
              <section>
                <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 mb-6 flex items-center gap-3">
                  <Globe className="h-6 w-6 text-indigo-600" /> Delivery Areas & Timelines
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                    <h4 className="font-black text-gray-900 mb-2 uppercase text-xs tracking-widest">Addis Ababa</h4>
                    <p className="text-sm text-gray-700 mb-4">Express: Same day or Next Day</p>
                    <p className="text-sm text-gray-700">Standard: 1–2 business days</p>
                  </div>
                  <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100">
                    <h4 className="font-black text-gray-900 mb-2 uppercase text-xs tracking-widest">Regional Cities</h4>
                    <p className="text-sm text-gray-700 mb-4">Standard: 3–5 business days</p>
                    <p className="text-xs text-gray-500 italic">Includes Hawassa, Dire Dawa, Bahir Dar, Mekelle, and more.</p>
                  </div>
                </div>
              </section>

              <section className="bg-indigo-50 -mx-8 md:-mx-12 p-8 md:p-12">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <Info className="h-6 w-6 text-indigo-600" /> Shipping Costs
                </h2>
                <div className="prose prose-indigo max-w-none text-gray-700">
                  <p>Our delivery fees are calculated dynamically based on the distance between our primary shop and your pinpointed delivery location.</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><strong>Standard Rate:</strong> Fees start from a base rate per kilometer.</li>
                    <li><strong>Free Delivery:</strong> Enjoy FREE delivery on all orders over ETB 5,000 within Addis Ababa.</li>
                    <li><strong>Express Surcharge:</strong> A small premium is applied for guaranteed next-day delivery.</li>
                  </ul>
                  <div className="mt-6 p-4 bg-white rounded-xl border border-indigo-100 text-xs font-medium text-indigo-800">
                    Note: The exact fee will be displayed in your cart during the checkout process before you finalize your payment.
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 mb-6">Customer Responsibilities</h2>
                <div className="space-y-4 text-gray-700">
                  <p className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs mt-0.5">1</span>
                    <span>Ensure someone is available at the provided delivery address to receive the package and sign the proof of delivery.</span>
                  </p>
                  <p className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs mt-0.5">2</span>
                    <span>Keep your registered phone number active. Our delivery partners will call you to coordinate the exact drop-off.</span>
                  </p>
                  <p className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs mt-0.5">3</span>
                    <span>Use the "Auto-Pin" or interactive map in our checkout to provide the most accurate delivery coordinates.</span>
                  </p>
                </div>
              </section>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <EcommerceFooter />
    </div>
  );
}
