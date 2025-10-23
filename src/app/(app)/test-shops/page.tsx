import { getShops } from "@/lib/shops";

export default async function TestShopsPage() {
    const shops = await getShops();
    
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">Test Shops Data</h1>
            <p>Shops count: {shops.length}</p>
            <pre className="bg-gray-100 p-4 mt-4 rounded">
                {JSON.stringify(shops, null, 2)}
            </pre>
        </div>
    );
}