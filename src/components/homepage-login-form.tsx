"use client";

import { useState } from "react";
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
  const router = useRouter();
  const { login: factoryLogin, isLoggingIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      // Try factory login first
      const factoryResult = await factoryLogin(username, password);
      
      if (factoryResult.success) {
        // Redirect to factory dashboard
        router.push("/dashboard");
        return;
      }
      
      // If factory login fails, try shop login
      const shopResult = await authenticateUser(username, password);
      
      if (shopResult.success && shopResult.user?.role === "shop") {
        // Store user in localStorage for shop users as well
        localStorage.setItem('user', JSON.stringify(shopResult.user));
        // Redirect to shop dashboard
        router.push("/shop/dashboard");
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      setError("An error occurred during login");
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