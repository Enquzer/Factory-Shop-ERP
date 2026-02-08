'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

export default function DriverAuthDebug() {
  const [driverId, setDriverId] = useState('140204');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authResults, setAuthResults] = useState<any>(null);
  const [apiResults, setApiResults] = useState<any>(null);
  const { login, user, token } = useAuth();
  const { toast } = useToast();

  const testDriverLogin = async () => {
    setIsLoading(true);
    setAuthResults(null);
    setApiResults(null);
    
    try {
      // Test 1: Login
      const loginResult = await login(driverId, password);
      setAuthResults(loginResult);
      
      if (loginResult.success) {
        toast({
          title: "Login Successful",
          description: `Logged in as ${user?.username} with role ${user?.role}`,
          className: "bg-green-600 text-white"
        });
        
        // Test 2: Fetch user info
        try {
          const userResponse = await fetch('/api/debug-user', {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          const userInfo = await userResponse.json();
          
          // Test 3: Fetch driver data
          const driverResponse = await fetch(`/api/drivers/${driverId}`, {
            headers: token ? { 'Authorization': `Bearer ${token}` } : {}
          });
          const driverData = await driverResponse.json();
          
          setApiResults({
            userInfo,
            driverResponse: {
              status: driverResponse.status,
              statusText: driverResponse.statusText,
              data: driverData
            }
          });
          
        } catch (error) {
          // API test error
        }
      } else {
        toast({
          title: "Login Failed",
          description: loginResult.message || 'Invalid credentials',
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during testing",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const checkCurrentAuth = async () => {
    try {
      const userResponse = await fetch('/api/debug-user', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const userInfo = await userResponse.json();
      
      const driverResponse = await fetch(`/api/drivers/${driverId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const driverData = await driverResponse.json();
      
      setApiResults({
        userInfo,
        driverResponse: {
          status: driverResponse.status,
          statusText: driverResponse.statusText,
          data: driverData
        }
      });
      
      toast({
        title: "Auth Check Complete",
        description: `Status: ${driverResponse.status}`,
        className: driverResponse.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
      });
    } catch (error) {
      // Auth check error
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Driver Authentication Debug</h1>
          <p className="text-gray-600">Comprehensive debugging for driver login and API access</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Login Test Section */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Driver Login Test</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="driverId">Driver ID/Username</Label>
                <Input
                  id="driverId"
                  value={driverId}
                  onChange={(e) => setDriverId(e.target.value)}
                  placeholder="Enter driver ID"
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
                onClick={testDriverLogin}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Testing...' : 'Test Driver Login'}
              </Button>
              
              {authResults && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <h3 className="font-medium text-sm mb-2">Login Results:</h3>
                  <pre className="text-xs overflow-auto max-h-32">
                    {JSON.stringify(authResults, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Auth Check Section */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Current Auth Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-2">
                <p><strong>Current User:</strong> {user?.username || 'Not logged in'}</p>
                <p><strong>Current Role:</strong> {user?.role || 'Unknown'}</p>
                <p><strong>Token Present:</strong> {token ? 'Yes' : 'No'}</p>
              </div>
              
              <Button 
                onClick={checkCurrentAuth}
                variant="outline"
                className="w-full"
              >
                Check Current Auth
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* API Results Section */}
        {apiResults && (
          <Card className="mt-8 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>API Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2">User Info:</h3>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48">
                    {JSON.stringify(apiResults.userInfo, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Driver API Response:</h3>
                  <div className="text-sm mb-2">
                    <p><strong>Status:</strong> {apiResults.driverResponse.status}</p>
                    <p><strong>Status Text:</strong> {apiResults.driverResponse.statusText}</p>
                  </div>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48">
                    {JSON.stringify(apiResults.driverResponse.data, null, 2)}
                  </pre>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Debug Info Section */}
        <Card className="mt-8 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <p className="mb-2"><strong>Debug Steps:</strong></p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Enter driver credentials and click "Test Driver Login"</li>
                <li>Check if login is successful</li>
                <li>Verify API response status and data</li>
                <li>If 401 error persists, check console for detailed logs</li>
              </ol>
            </div>
            
            <div className="text-xs text-gray-500">
              <p>This page helps diagnose authentication issues by testing the complete login flow and API access.</p>
              <p>Check browser console for detailed logging information.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}