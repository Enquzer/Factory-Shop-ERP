"use client";

import { EcommerceHeader } from "@/components/ecommerce-header";
import { EcommerceFooter } from "@/components/ecommerce-footer";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldCheck, Lock, Fingerprint, Database } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <EcommerceHeader />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <ShieldCheck className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h1 className="text-4xl font-black text-gray-900 mb-4">Privacy Policy</h1>
            <p className="text-gray-600 font-medium">Effective Date: February 5, 2026</p>
            <p className="text-sm text-gray-500 mt-2">Data Controller: Carement Fashion, 123 Industrial Zone, Addis Ababa, Ethiopia</p>
          </div>

          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardContent className="p-8 md:p-12 prose prose-green max-w-none">
              <p className="text-lg text-gray-800 mb-10 leading-relaxed">
                At Carement Fashion, we value your privacy. This policy explains how we collect, use, and protect your personal data in compliance with Ethiopian Law and international best practices (GDPR).
              </p>

              <div className="space-y-12">
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <Database className="h-6 w-6 text-green-600" />
                    <h2 className="text-2xl font-bold text-gray-900 m-0">Information We Collect</h2>
                  </div>
                  <div className="space-y-4 text-gray-700">
                    <p><strong>Identity Data:</strong> Name, gender, and date of birth (for age verification).</p>
                    <p><strong>Contact Data:</strong> Delivery address, email address, and phone number.</p>
                    <p><strong>Financial Data:</strong> Payment details (processed via secure encrypted gateways; we do not store full card/wallet details on our servers).</p>
                    <p><strong>Technical Data:</strong> IP address, browser type, and usage patterns on our website.</p>
                  </div>
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <Fingerprint className="h-6 w-6 text-green-600" />
                    <h2 className="text-2xl font-bold text-gray-900 m-0">How We Use Your Data</h2>
                  </div>
                  <p className="mb-4">We process your data to:</p>
                  <ul className="list-disc pl-6 space-y-2 text-gray-700">
                    <li>Manage your registration and fulfill your orders.</li>
                    <li>Send delivery updates via SMS or Email.</li>
                    <li>Improve our garment collections based on your preferences.</li>
                    <li>Comply with Ethiopian tax and commercial reporting requirements.</li>
                  </ul>
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <Lock className="h-6 w-6 text-green-600" />
                    <h2 className="text-2xl font-bold text-gray-900 m-0">Data Sovereignty & Storage</h2>
                  </div>
                  <p className="text-gray-700">
                    In accordance with Proclamation 1321/2024, your personal data is primarily stored on secure servers located within Ethiopia. Cross-border transfer of data only occurs with your explicit consent or where necessary for international payment processing.
                  </p>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 mb-4">Your Rights</h2>
                  <p className="mb-4 font-medium">You have the right to:</p>
                  <ul className="list-disc pl-6 space-y-3 text-gray-700">
                    <li><strong>Access:</strong> Request a copy of the data we hold about you.</li>
                    <li><strong>Correction:</strong> Ask us to fix inaccurate information.</li>
                    <li><strong>Erasure:</strong> Request the deletion of your account and data (subject to tax record retention laws).</li>
                    <li><strong>Withdraw Consent:</strong> Opt-out of marketing communications at any time.</li>
                  </ul>
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
