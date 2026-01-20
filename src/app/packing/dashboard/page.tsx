"use client";

import { useAuth } from '../../../contexts/auth-context';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PackingDashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // Check if user has packing role, otherwise redirect
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'packing')) {
      router.push('/');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || user.role !== 'packing') {
    return null; // Will redirect via effect
  }

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Packing Department Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Packing Orders</h2>
          <p className="text-3xl font-bold text-primary">0</p>
          <p className="text-sm text-muted-foreground">Ready for packing</p>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Packed Today</h2>
          <p className="text-3xl font-bold text-primary">0</p>
          <p className="text-sm text-muted-foreground">Items packed</p>
        </div>
        
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-2">Pending Review</h2>
          <p className="text-3xl font-bold text-primary">0</p>
          <p className="text-sm text-muted-foreground">Quality checks</p>
        </div>
      </div>

      <div className="bg-card p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Recent Packing Activities</h2>
        <p className="text-muted-foreground">No recent activities</p>
      </div>
    </div>
  );
}