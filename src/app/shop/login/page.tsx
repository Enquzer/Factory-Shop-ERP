"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from '@/contexts/auth-context';

export default function ShopLoginPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Handle redirects based on authentication status
  useEffect(() => {
    if (!isLoading) {
      if (user && user.role === 'shop') {
        router.replace("/shop/dashboard");
      } else {
        router.replace("/");
      }
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

  // If user is authenticated as shop, show loading while redirecting
  if (user && user.role === 'shop') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // For non-authenticated users, show loading while redirecting to homepage
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4">Redirecting to homepage...</p>
      </div>
    </div>
  );
}
