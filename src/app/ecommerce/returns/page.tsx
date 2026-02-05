"use client";

import { EcommerceHeader } from "@/components/ecommerce-header";
import { EcommerceFooter } from "@/components/ecommerce-footer";
import { Card, CardContent } from "@/components/ui/card";
import { RotateCcw, Package, Clock, CheckCircle2, AlertTriangle, Truck } from "lucide-react";

export default function ReturnPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <EcommerceHeader />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <RotateCcw className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-4xl font-black text-gray-900 mb-4">Return & Exchange Policy</h1>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We want you to love your purchase. If a garment doesn't fit or meet your expectations, our policy is designed to be fair and transparent.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <Card className="border-none shadow-md overflow-hidden bg-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                    <Clock className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">Return Window</h3>
                </div>
                <ul className="space-y-4 text-gray-700">
                  <li className="flex gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span><strong>Standard Returns:</strong> 15 days from delivery (per Trade Competition & Consumer Protection Proclamation).</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span><strong>Immediate Inspection:</strong> Inspect items upon delivery to return immediately with personnel if damaged.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-none shadow-md overflow-hidden bg-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
                    <Package className="h-6 w-6" />
                  </div>
                  <h3 className="text-xl font-bold">Conditions for Return</h3>
                </div>
                <ul className="space-y-4 text-gray-700 font-medium">
                  <li className="p-3 bg-gray-50 rounded-lg border-l-4 border-orange-500">Unworn, unwashed, and undamaged.</li>
                  <li className="p-3 bg-gray-50 rounded-lg border-l-4 border-orange-500">All original tags and packaging intact.</li>
                  <li className="p-3 bg-gray-50 rounded-lg border-l-4 border-orange-500"> disertai valid digital or physical receipt.</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-xl rounded-3xl overflow-hidden mb-12">
            <CardContent className="p-8 md:p-12 prose max-w-none">
              <div className="space-y-12 text-gray-700">
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <AlertTriangle className="h-6 w-6 text-red-500" />
                    <h2 className="text-2xl font-bold text-gray-900 m-0">Non-Returnable Items</h2>
                  </div>
                  <p className="mb-4 font-medium">For hygiene and customization reasons, the following cannot be returned:</p>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 list-none pl-0">
                    <li className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-xl border border-red-100">
                      <div className="h-2 w-2 rounded-full bg-red-500" /> Intimate apparel (lingerie, swimwear)
                    </li>
                    <li className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-xl border border-red-100">
                      <div className="h-2 w-2 rounded-full bg-red-500" /> Custom-made or tailored garments
                    </li>
                    <li className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-xl border border-red-100">
                      <div className="h-2 w-2 rounded-full bg-red-500" /> Items marked as "Final Sale"
                    </li>
                  </ul>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 mb-6">Refund Process</h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <div className="font-bold text-gray-900">1. Verification</div>
                      <p className="text-sm">Inspection within 2–3 business days after receiving item.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="font-bold text-gray-900">2. Payment</div>
                      <p className="text-sm">Refunds sent to original method (Telebirr, CBE, Bank).</p>
                    </div>
                    <div className="space-y-2">
                      <div className="font-bold text-gray-900">3. Timeline</div>
                      <p className="text-sm">Allow 7–10 business days for credit to appear.</p>
                    </div>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <Truck className="h-6 w-6 text-blue-600" />
                    <h2 className="text-2xl font-bold text-gray-900 m-0">Shipping Costs</h2>
                  </div>
                  <p><strong>Our Error:</strong> (Wrong size/Defective) Carement Fashion covers shipping.</p>
                  <p><strong>Change of Mind:</strong> Customer is responsible for the return delivery fee.</p>
                </section>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <EcommerceFooter />
    </div>
  );
}
