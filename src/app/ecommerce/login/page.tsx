"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCustomerAuth } from "@/contexts/customer-auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { Eye, EyeOff, User, ArrowLeft } from "lucide-react";

export default function CustomerLoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [city, setCity] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const { login, register, isLoggingIn } = useCustomerAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isLogin) {
      // Login
      const result = await login(username, password);
      if (result.success) {
        router.push("/ecommerce");
      } else {
        setError(result.message || "Login failed");
      }
    } else {
      // Register
      if (!agreeToTerms) {
        setError("You must agree to the Terms and Conditions and Privacy Policy");
        return;
      }
      const result = await register({
        username,
        email,
        password,
        firstName,
        lastName,
        phone,
        deliveryAddress,
        city
      });
      
      if (result.success) {
        router.push("/ecommerce");
      } else {
        setError(result.message || "Registration failed");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mb-4">
            <Logo className="mx-auto h-16" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Carement Fashion</h1>
          <p className="text-green-200">
            {isLogin ? "Welcome back! Please sign in to your account" : "Create your account to start shopping"}
          </p>
        </div>

        <Card className="bg-white/95 backdrop-blur-sm border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-gray-800">
              {isLogin ? "Sign In" : "Create Account"}
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              {isLogin 
                ? "Enter your credentials to access your account" 
                : "Fill in your details to create an account"}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-md text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoggingIn}
                  />
                </div>
              </div>

              {!isLogin && (
                <>
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoggingIn}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        disabled={isLoggingIn}
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        disabled={isLoggingIn}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      disabled={isLoggingIn}
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                      disabled={isLoggingIn}
                    />
                  </div>

                  <div>
                    <Label htmlFor="deliveryAddress">Delivery Address</Label>
                    <Input
                      id="deliveryAddress"
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      required
                      disabled={isLoggingIn}
                    />
                  </div>
                </>
              )}

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoggingIn}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div className="flex items-start space-x-3 py-2 bg-orange-50/50 p-4 rounded-xl border border-orange-100/50">
                  <input
                    id="terms"
                    type="checkbox"
                    checked={agreeToTerms}
                    onChange={(e) => setAgreeToTerms(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
                    required
                  />
                  <Label htmlFor="terms" className="text-xs text-gray-700 font-medium leading-relaxed cursor-pointer italic">
                    I have read and understood the{" "}
                    <Link href="/ecommerce/terms" target="_blank" className="text-orange-600 hover:text-orange-700 underline font-black">
                      Terms and Conditions
                    </Link>{" "}
                    and{" "}
                    <Link href="/ecommerce/privacy" target="_blank" className="text-orange-600 hover:text-orange-700 underline font-black">
                      Privacy Policy
                    </Link>
                  </Label>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white" 
                disabled={isLoggingIn}
                size="lg"
              >
                {isLoggingIn 
                  ? "Processing..." 
                  : isLogin 
                    ? "Sign In" 
                    : "Create Account"
                }
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                className="text-blue-600 hover:text-blue-800 font-medium"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError("");
                }}
                disabled={isLoggingIn}
              >
                {isLogin 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </button>
            </div>

            <div className="mt-4 text-center">
              <Link href="/ecommerce" className="text-green-700 hover:text-green-900 text-sm font-medium flex items-center justify-center">
                <ArrowLeft className="h-4 w-4 mr-2 text-orange-500" /> Back to Store
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}