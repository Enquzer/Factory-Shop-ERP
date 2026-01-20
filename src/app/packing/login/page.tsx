"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from '@/contexts/auth-context';

export default function PackingLoginPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Redirect authenticated users to the dashboard
  useEffect(() => {
    if (!isLoading && user && user.role === 'packing') {
      router.replace("/packing");
    } else if (!isLoading && user) {
      // If user is logged in but not packing, redirect appropriately
      switch (user.role) {
        case 'factory':
          router.replace("/dashboard");
          break;
        case 'shop':
          router.replace("/shop/dashboard");
          break;
        case 'store':
          router.replace("/store/dashboard");
          break;
        case 'finance':
          router.replace("/finance/dashboard");
          break;
        case 'planning':
        case 'sample_maker':
        case 'cutting':
        case 'sewing':
        case 'finishing':
        case 'packing':
        case 'quality_inspection':
          router.replace("/production-dashboard");
          break;
        default:
          router.replace("/");
          break;
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

  // If user is already authenticated as packing, don't show the login page
  if (user && user.role === 'packing') {
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