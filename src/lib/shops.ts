import { registerUser } from './auth';
import { getDb } from './db';
import { getShops as getShopsFromSQLite, getAllShops as getAllShopsFromSQLite, getShopById as getShopByIdFromSQLite, getShopByUsername as getShopByUsernameFromSQLite } from './shops-sqlite';

export type Shop = {
  id: string;
  username: string;
  name: string;
  contactPerson: string;
  contactPhone: string;
  city: string;
  exactLocation: string;
  tradeLicenseNumber: string;
  tinNumber: string;
  discount: number;
  status: 'Active' | 'Inactive' | 'Pending';
  monthlySalesTarget: number;
  // New fields for variant visibility control
  showVariantDetails: boolean;
  maxVisibleVariants: number;
  // Timestamp fields
  createdAt?: Date | string;
  updatedAt?: Date | string;
  // Removed aiDistributionMode field
};

// Updated type for paginated results
export type PaginatedShops = {
  shops: Shop[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export async function getShops(forceRefresh = false): Promise<Shop[]> {
  // If on client side, fetch from API
  if (typeof window !== 'undefined') {
    try {
      const response = await fetch('/api/shops');
      if (!response.ok) return [];
      return await response.json();
    } catch (error) {
      console.error('Error fetching shops from API:', error);
      return [];
    }
  }

  // Always use the SQLite implementation directly to avoid SSR issues
  try {
    // Use the new getAllShops function to get all shops without pagination
    return await getAllShopsFromSQLite();
  } catch (error) {
    console.error('Error fetching shops from SQLite:', error);
    return [];
  }
}

// New function to get paginated shops
export async function getPaginatedShops(page: number = 1, limit: number = 10): Promise<PaginatedShops> {
  try {
    const offset = (page - 1) * limit;
    const { shops, totalCount } = await getShopsFromSQLite(limit, offset);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      shops,
      totalCount,
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    };
  } catch (error) {
    console.error('Error fetching paginated shops from SQLite:', error);
    return {
      shops: [],
      totalCount: 0,
      currentPage: 1,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false
    };
  }
}

export async function getShopById(shopId: string): Promise<Shop | null> {
  // Use the SQLite implementation for now
  return await getShopByIdFromSQLite(shopId);
}

export async function getShopByUsername(username: string): Promise<Shop | null> {
  // Use the SQLite implementation directly to avoid circular dependency
  return await getShopByUsernameFromSQLite(username);
}

export async function addShop(shopData: Omit<Shop, 'id'> & { password: string }): Promise<Shop> {
  try {
    // Get auth token from localStorage
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

    // Call the API endpoint to register the shop
    const response = await fetch('/api/shops', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      body: JSON.stringify(shopData),
    });

    if (!response.ok) {
      // Try to parse error response as JSON, but handle cases where it's not JSON
      let errorMessage = 'Failed to register shop';
      let errorDetails = '';
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
        errorDetails = errorData.details ? `: ${errorData.details}` : '';
      } catch (jsonError) {
        // If JSON parsing fails, use the status text or a generic message
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(`${errorMessage}${errorDetails} (Status: ${response.status})`);
    }

    // Try to parse the successful response as JSON
    try {
      const newShop = await response.json();
      return newShop;
    } catch (jsonError) {
      throw new Error('Failed to parse response from server');
    }
  } catch (error: any) {
    console.error("Error registering shop:", error);
    throw error;
  }
}

export async function updateShop(shopId: string, dataToUpdate: Partial<Omit<Shop, 'id' | 'username'>>): Promise<boolean> {
  try {
    // Use absolute URL for server-side requests, relative for client-side
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const url = typeof window === 'undefined'
      ? `${baseUrl}/api/shops?id=${shopId}`
      : `/api/shops?id=${shopId}`;

    const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
      body: JSON.stringify(dataToUpdate),
    });

    return response.ok;
  } catch (error) {
    console.error("Error updating shop:", error);
    return false;
  }
}

// Add deleteShop function
export async function deleteShop(shopId: string): Promise<boolean> {
  try {
    const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    const response = await fetch(`/api/shops?id=${shopId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken && { 'Authorization': `Bearer ${authToken}` })
      },
    });

    return response.ok;
  } catch (error) {
    console.error("Error deleting shop:", error);
    return false;
  }
}