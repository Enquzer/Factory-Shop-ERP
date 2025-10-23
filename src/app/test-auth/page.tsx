"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";

export default function TestAuthPage() {
  const [username, setUsername] = useState("factory");
  const [password, setPassword] = useState("factory123");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const { login } = useAuth();

  const handleTestLogin = async () => {
    try {
      setError("");
      const res = await login(username, password);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
      
      <div className="mb-4">
        <label className="block mb-2">Username:</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border p-2 rounded"
        />
      </div>
      
      <div className="mb-4">
        <label className="block mb-2">Password:</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded"
        />
      </div>
      
      <Button onClick={handleTestLogin}>Test Login</Button>
      
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-800 rounded">
          <h2 className="font-bold">Error:</h2>
          <p>{error}</p>
        </div>
      )}
      
      {result && (
        <div className="mt-4 p-4 bg-green-100 text-green-800 rounded">
          <h2 className="font-bold">Result:</h2>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}