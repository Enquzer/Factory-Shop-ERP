'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function DriverLoginDebug() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authResult, setAuthResult] = useState<any>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const { toast } = useToast();

  const testLogin = async () => {
    setIsLoading(true);
    setAuthResult(null);
    setUserDetails(null);
    
    try {
      // Test 1: Basic authentication
      console.log('Testing authentication with:', username);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      const authData = await response.json();
      setAuthResult(authData);
      
      if (authData.success) {
        toast({
          title: "Authentication Successful",
          description: `Logged in as ${authData.user?.username} with role ${authData.user?.role}`,
          className: "bg-green-600 text-white"
        });
        
        // Test 2: Get user details
        try {
          const userResponse = await fetch(`/api/auth?username=${username}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUserDetails(userData);
          }
        } catch (error) {
          console.error('Error fetching user details:', error);
        }
      } else {
        toast({
          title: "Authentication Failed",
          description: authData.message || 'Invalid credentials',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: "An error occurred during login test",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testAuthMiddleware = async () => {
    if (!authResult?.token) {
      toast({
        title: "No Token",
        description: "Please login first to get a token",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch('/api/debug-auth', {
        headers: {
          'Authorization': `Bearer ${authResult.token}`
        }
      });
      
      const data = await response.json();
      console.log('Auth middleware test result:', data);
      
      toast({
        title: "Auth Middleware Test",
        description: data.authenticated ? 'Token is valid' : 'Token is invalid',
        className: data.authenticated ? "bg-green-600 text-white" : "bg-red-600 text-white"
      });
    } catch (error) {
      console.error('Auth middleware test error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Driver Login Debug</h1>
          <p className="text-gray-600">Test driver authentication and diagnose login issues</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Login Test Section */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Authentication Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                />
              </div>
              
              <Button 
                onClick={testLogin}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Testing...' : 'Test Login'}
              </Button>
            </CardContent>
          </Card>

          {/* Token Test Section */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Token Validation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button 
                onClick={testAuthMiddleware}
                disabled={!authResult?.token}
                className="w-full"
                variant="outline"
              >
                Test Auth Token
              </Button>
              
              {authResult && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium mb-2">Auth Result:</h3>
                  <pre className="text-xs overflow-auto max-h-32">
                    {JSON.stringify(authResult, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {userDetails && (
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>User Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <pre className="text-xs overflow-auto max-h-64">
                    {JSON.stringify(userDetails, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm">
                <p><strong>Current Status:</strong> {authResult?.success ? 'Authenticated' : 'Not Authenticated'}</p>
                <p><strong>Role:</strong> {authResult?.user?.role || 'Unknown'}</p>
                <p><strong>Token Present:</strong> {authResult?.token ? 'Yes' : 'No'}</p>
              </div>
              
              <div className="text-xs text-gray-500">
                <p>Use this page to test driver credentials and diagnose authentication issues.</p>
                <p>Check the console for detailed logs.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}