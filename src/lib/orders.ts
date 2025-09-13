
'use client';

import { reactive, subscribe } from 'valtio';
import { type Product, type ProductVariant } from './products';

export type OrderItem = { 
  productId: string;
  name: string;
  price: number;
  imageUrl: string;
  variant: ProductVariant;
  quantity: number;
};

export type OrderStatus = 'Pending' | 'Awaiting Payment' | 'Paid' | 'Dispatched' | 'Delivered' | 'Cancelled';

export type Order = {
    id: string;
    shopId: string;
    shopName: string;
    date: string;
    status: OrderStatus;
    amount: number;
    items: OrderItem[];
}

const getInitialOrders = (): Order[] => {
    if (typeof window !== 'undefined') {
        const storedOrders = localStorage.getItem('carement_orders');
        return storedOrders ? JSON.parse(storedOrders) : [];
    }
    return [];
};


const state = reactive<{
    orders: Order[];
}>({
    orders: getInitialOrders(),
});

subscribe(state, () => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('carement_orders', JSON.stringify(state.orders));
    }
});


export const ordersStore = {
    get allOrders() {
        return state.orders;
    },
    
    getShopOrders(shopId: string) {
        return state.orders.filter(order => order.shopId === shopId);
    },

    addOrder(order: Omit<Order, 'id' | 'date' | 'status'>) {
        const newOrder: Order = {
            ...order,
            id: `ORD-${Math.random().toString(36).substr(2, 7).toUpperCase()}`,
            date: new Date().toISOString().split('T')[0],
            status: 'Pending',
        };
        state.orders = [newOrder, ...state.orders];
        return newOrder;
    },

    updateOrderStatus(orderId: string, newStatus: OrderStatus) {
        const orderIndex = state.orders.findIndex(order => order.id === orderId);
        if (orderIndex > -1) {
            state.orders[orderIndex].status = newStatus;
            // Create a new array to trigger re-render
            state.orders = [...state.orders];
        }
    }
};

// Example initial data for demonstration if local storage is empty
if (typeof window !== 'undefined' && !localStorage.getItem('carement_orders')) {
    const firstOrder = ordersStore.addOrder({
        shopId: 'SHP-001',
        shopName: 'Bole Boutique',
        amount: 25000,
        items: [],
    });
     ordersStore.updateOrderStatus(firstOrder.id, 'Awaiting Payment');
     
     const secondOrder = ordersStore.addOrder({
        shopId: 'SHP-002',
        shopName: 'Hawassa Habesha',
        amount: 15000,
        items: [],
    });
    ordersStore.updateOrderStatus(secondOrder.id, 'Paid');

    const thirdOrder = ordersStore.addOrder({
        shopId: 'SHP-001',
        shopName: 'Bole Boutique',
        amount: 8000,
        items: [],
    });
     ordersStore.updateOrderStatus(thirdOrder.id, 'Dispatched');
}
