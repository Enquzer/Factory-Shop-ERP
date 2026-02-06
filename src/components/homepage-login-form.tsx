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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export function HomepageLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isAttemptingLogin, setIsAttemptingLogin] = useState(false);
  const router = useRouter();
  const { login: factoryLogin, isLoggingIn, user: currentUser } = useAuth();
  const { toast } = useToast();

  // Forgot Password State
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [resetUsername, setResetUsername] = useState("");
  const [isResetting, setIsResetting] = useState(false);

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
      // If successful, redirection will be handled in the useEffect
      // Keep isAttemptingLogin true until redirect happens
    } catch (err) {
      setError("An error occurred during login");
      setIsAttemptingLogin(false);
    }
  };

  const handleForgotPasswordSubmit = async () => {
    if (!resetUsername) return;
    
    setIsResetting(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: resetUsername }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
            title: "Request Sent",
            description: data.message || "If the account exists, a reset request has been sent.",
        });
        setIsForgotPasswordOpen(false);
        setResetUsername("");
      } else {
        toast({
            title: "Error",
            description: data.error || "Failed to send request",
            variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };
  
  // Effect to handle redirect after successful login
  useEffect(() => {
    if (currentUser && isAttemptingLogin) {
      // Small delay to ensure state is properly set
      setTimeout(() => {
        redirectToDashboard(currentUser.role);
      }, 100);
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
      case 'hr':
        router.push("/hr");
        break;
      case 'ecommerce':
        router.push("/ecommerce-manager");
        break;
      case 'ie_admin':
      case 'ie_user':
        router.push("/ie");
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
              <div className="flex justify-center">
                <Button 
                  type="button" 
                  variant="link" 
                  className="text-sm text-primary hover:underline px-0"
                  onClick={() => setIsForgotPasswordOpen(true)}
                >
                  Forgot Password?
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      <Dialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Enter your username to request a password reset from the administrator.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reset-username">Username</Label>
              <Input
                id="reset-username"
                value={resetUsername}
                onChange={(e) => setResetUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>
          </div>
          <DialogFooter className="sm:justify-start">
            <Button 
              type="button" 
              onClick={handleForgotPasswordSubmit} 
              disabled={isResetting || !resetUsername}
            >
              {isResetting ? "Sending..." : "Request Reset"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsForgotPasswordOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}