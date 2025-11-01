import { useState, useEffect } from "react";
import { getShopInventory } from "@/lib/shop-inventory";
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
      const data = await getShopInventory(shopId);
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