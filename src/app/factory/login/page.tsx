"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from '@/contexts/auth-context';

export default function FactoryLoginPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Redirect authenticated users to the dashboard
  useEffect(() => {
    if (!isLoading && user && user.role === 'factory') {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If user is already authenticated, don't show the login page
  if (user && user.role === 'factory') {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <Logo />
          </div>
          <CardTitle className="text-2xl text-center">Factory Login</CardTitle>
          <CardDescription className="text-center">
            Please log in to access the factory dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button onClick={() => router.push("/")}>
            Go to Home Page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
