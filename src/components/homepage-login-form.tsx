"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/auth-context";
import { authenticateUser } from "@/lib/auth";
import { LoadingBar } from "@/components/loading-bar";

export function HomepageLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isAttemptingLogin, setIsAttemptingLogin] = useState(false);
  const router = useRouter();
  const { login: factoryLogin, isLoggingIn, user: currentUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsAttemptingLogin(true);

    try {
      // Try login with the auth context first (handles all users)
      const result = await factoryLogin(username, password);
      
      if (!result.success) {
        setError(result.message || "Invalid credentials");
        setIsAttemptingLogin(false);
      }
      // If successful, we'll handle redirection in the useEffect below
    } catch (err) {
      setError("An error occurred during login");
      setIsAttemptingLogin(false);
    }
  };
  
  // Effect to handle redirect after successful login
  useEffect(() => {
    if (isAttemptingLogin && currentUser) {
      // Redirect based on user role
      redirectToDashboard(currentUser.role);
    }
  }, [currentUser, isAttemptingLogin]);
  
  const redirectToDashboard = (role: string) => {
    switch (role) {
      case 'factory':
        router.push("/dashboard");
        break;
      case 'shop':
        router.push("/shop/dashboard");
        break;
      case 'store':
        router.push("/store/dashboard");
        break;
      case 'finance':
        router.push("/finance/dashboard");
        break;
      case 'packing':
        router.push("/packing");
        break;
      case 'cutting':
        router.push("/cutting");
        break;
      case 'sewing':
        router.push("/sewing");
        break;
      case 'planning':
        router.push("/order-planning");
        break;
      case 'marketing':
        router.push("/marketing-orders");
        break;
      case 'quality_inspection':
        router.push("/quality-inspection");
        break;
      case 'finishing':
        // Assuming finishing might share a dashboard or has a different path if created later
        router.push("/production-dashboard"); 
        break;
      case 'sample_maker':
        router.push("/sample-management");
        break;
      case 'designer':
        router.push("/designer");
        break;
      default:
        router.push("/");
        break;
    }
  };

  return (
    <>
      <LoadingBar isLoading={isLoggingIn} message="Authenticating..." />
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoggingIn}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                disabled={isLoggingIn}
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm">{error}</div>
            )}
            <Button type="submit" className="w-full" disabled={isLoggingIn}>
              {isLoggingIn ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}