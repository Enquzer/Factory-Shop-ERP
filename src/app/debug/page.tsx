'use client';

import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';

export default function DebugPage() {
    const { user, isLoading } = useAuth();
    const [apiResponse, setApiResponse] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (user && user.username) {
                try {
                    console.log('Fetching shop data for user:', user.username);
                    const response = await fetch(`/api/shops/${user.username}`);
                    console.log('API Response status:', response.status);
                    
                    if (response.ok) {
                        const data = await response.json();
                        console.log('API Response data:', data);
                        setApiResponse(data);
                    } else {
                        const errorText = await response.text();
                        console.error('API Error response:', errorText);
                        setError(`API Error: ${response.status} - ${errorText}`);
                    }
                } catch (err) {
                    console.error('Fetch error:', err);
                    setError(`Fetch error: ${err}`);
                }
            }
        };

        fetchData();
    }, [user]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Debug Page</h1>
            
            <div className="mb-4">
                <h2 className="text-xl font-semibold">Auth State</h2>
                <pre>{JSON.stringify(user, null, 2)}</pre>
            </div>
            
            <div className="mb-4">
                <h2 className="text-xl font-semibold">API Response</h2>
                {error ? (
                    <div className="text-red-500">Error: {error}</div>
                ) : apiResponse ? (
                    <pre>{JSON.stringify(apiResponse, null, 2)}</pre>
                ) : (
                    <div>No API response yet</div>
                )}
            </div>
        </div>
    );
}