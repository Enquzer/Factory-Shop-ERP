
"use client";

import { useOrder } from "@/hooks/use-order";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

export function OrderButton() {
    const { items } = useOrder();

    if (items.length === 0) {
        return null;
    }

    return (
        <Button asChild>
            <Link href="/shop/orders/create">
                <ShoppingCart className="mr-2 h-4 w-4" />
                View Order
            </Link>
        </Button>
    );
}
