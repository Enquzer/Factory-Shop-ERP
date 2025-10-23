"use client";

import { useState } from "react";
import { authenticateUser } from "@/lib/auth";

export default function DebugFactoryLogin() {
  const [username, setUsername] = useState("factory");
  const [password, setPassword] = useState("factory123");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    setLoading(true);
    try {
      const authResult = await authenticateUser(username, password);
      setResult(authResult);
      console.log("Auth result:", authResult);
    } catch (error: any) {
      setResult({ error: error.message });
      console.error("Auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Debug Factory Login</h1>
      
      <div className="mb-4">
        <label className="block mb-2">Username:</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border p-2 w-full max-w-xs"
        />
      </div>
      
      <div className="mb-4">
        <label className="block mb-2">Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 w-full max-w-xs"
        />
      </div>
      
      <button
        onClick={handleTest}
        disabled={loading}
        className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-gray-400"
      >
        {loading ? "Testing..." : "Test Login"}
      </button>
      
      {result && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="text-lg font-semibold mb-2">Result:</h2>
          <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}