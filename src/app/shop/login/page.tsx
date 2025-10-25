"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from '@/contexts/auth-context';

export default function ShopLoginPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Redirect authenticated users to the dashboard
  useEffect(() => {
    if (!isLoading && user && user.role === 'shop') {
      router.replace("/shop/dashboard");
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
  if (user && user.role === 'shop') {
    return null;
  }

  // Redirect to homepage for non-authenticated users
  useEffect(() => {
    router.replace("/");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4">Redirecting to homepage...</p>
      </div>
    </div>
  );
}
