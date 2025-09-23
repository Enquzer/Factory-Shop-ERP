
'use client';

import { db } from './firebase';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, getDocs, writeBatch } from 'firebase/firestore';

export type Notification = {
    id: string;
    userType: 'factory' | 'shop';
    shopId?: string; // only for shop users
    title: string;
    description: string;
    href: string;
    isRead: boolean;
    createdAt: Date;
}

// Create a notification
export const createNotification = async (notification: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
    try {
        await addDoc(collection(db, 'notifications'), {
            ...notification,
            isRead: false,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error creating notification: ", error);
    }
}

// Get notifications for a user type (and optional shopId)
export const getNotifications = (userType: 'factory' | 'shop', shopId: string | null, callback: (notifications: Notification[]) => void) => {
    let q;
    if (userType === 'factory') {
        q = query(collection(db, 'notifications'), where('userType', '==', 'factory'));
    } else {
        if (!shopId) return () => {};
        q = query(collection(db, 'notifications'), where('userType', '==', 'shop'), where('shopId', '==', shopId));
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const notifications = querySnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate() || new Date(),
            } as Notification;
        }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        callback(notifications);
    });

    return unsubscribe;
}

// Mark notifications as read
export const markNotificationsAsRead = async (userType: 'factory' | 'shop', shopId: string | null) => {
    let q;
     if (userType === 'factory') {
        q = query(collection(db, 'notifications'), where('userType', '==', 'factory'), where('isRead', '==', false));
    } else {
        if (!shopId) return;
        q = query(collection(db, 'notifications'), where('userType', '==', 'shop'), where('shopId', '==', shopId), where('isRead', '==', false));
    }

    try {
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        querySnapshot.docs.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });
        await batch.commit();
    } catch(error) {
        console.error("Error marking notifications as read: ", error);
    }
}
