"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Sparkles, Upload, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link";
import { useCustomerAuth } from "@/contexts/customer-auth-context";
import Image from "next/image";

export default function RareRequestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useCustomerAuth();
  
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    productName: "",
    description: "",
    budget: "",
    urgency: "normal"
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image under 5MB.",
          variant: "destructive"
        });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Login Required",
        description: "Please login to submit a request.",
        variant: "destructive"
      });
      router.push("/ecommerce/login");
      return;
    }

    setLoading(true);
    try {
      // Prepare image as base64 if exists
      let imageUrl = null;
      if (imagePreview) {
        imageUrl = imagePreview;
      }

      const response = await fetch("/api/ecommerce/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("customerAuthToken")}`
        },
        body: JSON.stringify({
          ...formData,
          imageUrl
        })
      });

      if (response.ok) {
        toast({
          title: "Request Sent!",
          description: "We'll check our inventory and networks for this item.",
          className: "bg-green-600 text-white"
        });
        setFormData({ productName: "", description: "", budget: "", urgency: "normal" });
        setTimeout(() => router.push("/ecommerce"), 2000);
      } else {
        throw new Error("Failed to submit request");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <Card className="max-w-2xl w-full border-none shadow-2xl overflow-hidden rounded-3xl">
        <div className="bg-gradient-to-r from-purple-900 to-indigo-800 p-8 text-white relative">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Sparkles className="h-32 w-32" />
          </div>
          <Link href="/ecommerce" className="inline-flex items-center text-purple-200 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2 text-orange-500" />
            Back to Store
          </Link>
          <CardTitle className="text-3xl font-black mb-2">Rare Find Request</CardTitle>
          <CardDescription className="text-purple-200 text-lg">
            Looking for something specific? Let us hunt it down for you.
          </CardDescription>
        </div>
        
        <CardContent className="p-8 bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="productName" className="text-gray-900 font-bold">Product Name / Style</Label>
              <Input
                id="productName"
                name="productName"
                placeholder="e.g. Vintage Denim Jacket 1990s"
                value={formData.productName}
                onChange={handleChange}
                required
                className="h-12 bg-gray-50 border-gray-200 focus:border-purple-500 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-gray-900 font-bold">Detailed Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Describe color, material, brand, size, and any specific details..."
                value={formData.description}
                onChange={handleChange}
                required
                className="min-h-[120px] bg-gray-50 border-gray-200 focus:border-purple-500 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="budget" className="text-gray-900 font-bold">Budget Range (ETB)</Label>
                <Input
                  id="budget"
                  name="budget"
                  placeholder="e.g. 5000 - 8000"
                  value={formData.budget}
                  onChange={handleChange}
                  className="h-12 bg-gray-50 border-gray-200 focus:border-purple-500 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgency" className="text-gray-900 font-bold">Urgency</Label>
                <Select 
                  value={formData.urgency} 
                  onValueChange={(val) => handleSelectChange("urgency", val)}
                >
                  <SelectTrigger className="h-12 bg-gray-50 border-gray-200 focus:border-purple-500 rounded-xl">
                    <SelectValue placeholder="Select urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low - Take your time</SelectItem>
                    <SelectItem value="normal">Normal - Within 2 weeks</SelectItem>
                    <SelectItem value="high">High - Need it ASAP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-gray-900 font-bold">Attach Reference Image (Optional)</Label>
                <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:border-purple-300 transition-colors bg-gray-50">
                   <input 
                     type="file" 
                     ref={fileInputRef}
                     accept="image/*" 
                     className="hidden" 
                     onChange={handleImageChange}
                   />
                   
                   {imagePreview ? (
                     <div className="relative w-full aspect-video md:aspect-[3/1] rounded-lg overflow-hidden bg-white">
                        <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                        <button 
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full shadow-md hover:bg-red-700 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                     </div>
                   ) : (
                     <div className="py-6 flex flex-col items-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 mb-2">
                            <Upload className="h-6 w-6" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">Click to upload image</p>
                        <p className="text-xs text-gray-400 mt-1">JPG, PNG up to 5MB</p>
                     </div>
                   )}
                </div>
              </div>

            </div>

            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full h-14 text-lg font-bold bg-gray-900 hover:bg-gray-800 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                disabled={loading}
              >
                {loading ? "Sending Request..." : (
                  <span className="flex items-center justify-center gap-2">
                    Submit Request <Send className="h-5 w-5" />
                  </span>
                )}
              </Button>
            </div>
            
            <p className="text-center text-xs text-gray-400 mt-4">
              Our fashion experts will review your request and get back to you within 48 hours.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
