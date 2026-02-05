"use client";

import { EcommerceHeader } from "@/components/ecommerce-header";
import { EcommerceFooter } from "@/components/ecommerce-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ShieldCheck, Scale, Info } from "lucide-react";

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <EcommerceHeader />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <Scale className="h-16 w-16 text-orange-500 mx-auto mb-4" />
            <h1 className="text-4xl font-black text-gray-900 mb-4">Terms & Conditions</h1>
            <p className="text-gray-600">Last updated: {new Date().toLocaleDateString()}</p>
          </div>

          <Card className="border-none shadow-xl rounded-3xl overflow-hidden">
            <CardContent className="p-8 md:p-12 prose prose-orange max-w-none">
              <p className="text-lg font-medium text-gray-800 mb-8 leading-relaxed">
                Welcome to Carement Fashion. By registering an account or using our services, you agree to be bound by the following Terms and Conditions. Please read them carefully.
              </p>

              <div className="space-y-10">
                <section>
                  <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 mb-4">1. Account Registration and Eligibility</h2>
                  <div className="space-y-4">
                    <p><strong>Legal Age:</strong> By registering, you affirm that you are at least 18 years old or possess legal parental or guardian consent.</p>
                    <p><strong>Accuracy:</strong> You agree to provide accurate, current, and complete information during the registration process.</p>
                    <p><strong>Security:</strong> You are responsible for maintaining the confidentiality of your password and account. Carement Fashion is not liable for any loss resulting from unauthorized use of your account.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 mb-4">2. Intellectual Property</h2>
                  <div className="space-y-4">
                    <p>All content on this site, including garment designs, logos, images, and text, is the property of Carement Fashion and is protected by Ethiopian copyright and trademark laws.</p>
                    <p>Users may not reproduce, modify, or distribute any content without express written permission.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 mb-4">3. Terms of Sale & Pricing</h2>
                  <div className="space-y-4">
                    <p><strong>Product Descriptions:</strong> We strive for 100% accuracy in color and texture representation. However, since screen displays vary, we cannot guarantee that your monitor’s display of any color will be accurate.</p>
                    <p><strong>Pricing:</strong> All prices are listed in Ethiopian Birr (ETB) and are inclusive of VAT unless stated otherwise.</p>
                    <p><strong>Availability:</strong> We reserve the right to limit the quantities of any products or services that we offer.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 mb-4">4. Payment and Electronic Transactions</h2>
                  <div className="space-y-4">
                    <p>In accordance with the Ethiopian Electronic Trade Proclamation, all digital receipts and confirmations provided by us constitute valid proof of transaction.</p>
                    <p>We accept Telebirr, CBE Birr, Bank Transfer, and Credit Cards.</p>
                    <p>Payment must be received in full before orders are dispatched.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 mb-4">5. Delivery and Shipping</h2>
                  <div className="space-y-4">
                    <p><strong>Risk of Loss:</strong> The risk of loss and title for items pass to you upon our delivery to the carrier.</p>
                    <p><strong>Timelines:</strong> Delivery dates are estimates. Carement Fashion is not liable for delays caused by third-party logistics or customs clearance for international orders.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 mb-4">6. Returns, Refunds, and Exchanges</h2>
                  <div className="space-y-4">
                    <p><strong>Policy:</strong> Customers have 7 days from the date of delivery to request a return if the garment is defective or the wrong size.</p>
                    <p><strong>Condition:</strong> Items must be unworn, unwashed, and have original tags attached.</p>
                    <p><strong>Refunds:</strong> Approved refunds will be processed via the original payment method or store credit.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 mb-4">7. Limitation of Liability</h2>
                  <div className="space-y-4">
                    <p>To the maximum extent permitted by Ethiopian law, Carement Fashion shall not be liable for any indirect, incidental, or consequential damages resulting from the use of our products or the inability to use our website.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 mb-4">8. Privacy and Data Protection</h2>
                  <div className="space-y-4">
                    <p>We collect and process your data in accordance with our Privacy Policy.</p>
                    <p>We do not sell your personal data to third parties. We use industry-standard encryption to protect your transaction details.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 mb-4">9. Governing Law and Dispute Resolution</h2>
                  <div className="space-y-4">
                    <p><strong>Jurisdiction:</strong> These terms are governed by the laws of the Federal Democratic Republic of Ethiopia.</p>
                    <p><strong>Arbitration:</strong> Any disputes arising from these terms shall first be attempted to be settled through mediation. If unsuccessful, the dispute shall be submitted to the competent courts in Addis Ababa.</p>
                  </div>
                </section>

                <section>
                  <h2 className="text-2xl font-bold text-gray-900 border-b pb-2 mb-4">10. Modifications to Terms</h2>
                  <div className="space-y-4">
                    <p>We reserve the right to update these terms at any time. Continued use of the site after changes are posted constitutes your acceptance of the new terms.</p>
                  </div>
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
