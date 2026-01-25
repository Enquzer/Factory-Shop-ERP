import { useState, useEffect } from "react";
import { ShopInventoryItem } from "@/lib/shop-inventory-sqlite";

interface UseShopInventoryResult {
  inventory: ShopInventoryItem[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useShopInventory(shopId: string): UseShopInventoryResult {
  const [inventory, setInventory] = useState<ShopInventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInventory = async () => {
    if (!shopId) {
      setInventory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Determine if shopId is a SHP-ID or username
      const param = shopId.startsWith('SHP-') ? `shopId=${shopId}` : `username=${shopId}`;
      const response = await fetch(`/api/shop-inventory?${param}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch inventory: ${response.statusText}`);
      }
      
      const data = await response.json();
      setInventory(data);
    } catch (err) {
      console.error("Error fetching shop inventory:", err);
      setError("Failed to load inventory data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [shopId]);

  return {
    inventory,
    loading,
    error,
    refresh: fetchInventory,
  };
}