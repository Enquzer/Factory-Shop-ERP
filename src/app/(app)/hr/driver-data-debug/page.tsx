'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';

export default function DriverDataDebug() {
  const [driverUsername, setDriverUsername] = useState('Motor1');
  const [isLoading, setIsLoading] = useState(false);
  const [debugResults, setDebugResults] = useState<any>(null);
  const { token, user } = useAuth();
  const { toast } = useToast();

  const checkDriverData = async () => {
    setIsLoading(true);
    setDebugResults(null);
    
    try {
      console.log('Checking driver data for:', driverUsername);
      
      // Test 1: Check if driver exists in drivers table
      const driverResponse = await fetch(`/api/drivers/${driverUsername}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      const driverData = await driverResponse.json();
      console.log('Driver API response:', { status: driverResponse.status, data: driverData });
      
      // Test 2: Check user data
      const userResponse = await fetch('/api/debug-user', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      const userData = await userResponse.json();
      console.log('User data:', userData);
      
      // Test 3: Check all drivers
      const allDriversResponse = await fetch('/api/drivers', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      const allDriversData = await allDriversResponse.json();
      console.log('All drivers:', allDriversData);
      
      setDebugResults({
        driverCheck: {
          status: driverResponse.status,
          statusText: driverResponse.statusText,
          data: driverData
        },
        userData,
        allDrivers: allDriversData,
        currentAuth: {
          username: user?.username,
          role: user?.role,
          id: user?.id
        }
      });
      
      toast({
        title: "Debug Complete",
        description: `Driver check status: ${driverResponse.status}`,
        className: driverResponse.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"
      });
      
    } catch (error) {
      console.error('Debug error:', error);
      toast({
        title: "Error",
        description: "Failed to run debug checks",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createDriverRecord = async () => {
    if (!driverUsername) {
      toast({
        title: "Error",
        description: "Please enter a driver username",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create driver record using ecommerce/admin endpoint
      const response = await fetch('/api/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: `Driver ${driverUsername}`,
          phone: '+251900000000',
          licensePlate: 'DRV001',
          vehicleType: 'motorbike'
        })
      });
      
      const result = await response.json();
      console.log('Create driver result:', result);
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Driver record created successfully",
          className: "bg-green-600 text-white"
        });
        
        // Refresh debug data
        setTimeout(() => checkDriverData(), 1000);
      } else {
        toast({
          title: "Error",
          description: result.error || 'Failed to create driver record',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Create driver error:', error);
      toast({
        title: "Error",
        description: "Failed to create driver record",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Driver Data Synchronization Debug</h1>
          <p className="text-gray-600">Diagnose and fix driver data missing issues</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Debug Controls */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Debug Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="driverUsername">Driver Username</Label>
                <Input
                  id="driverUsername"
                  value={driverUsername}
                  onChange={(e) => setDriverUsername(e.target.value)}
                  placeholder="Enter driver username"
                />
              </div>
              
              <Button 
                onClick={checkDriverData}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Checking...' : 'Check Driver Data'}
              </Button>
              
              <Button 
                onClick={createDriverRecord}
                disabled={isLoading}
                variant="outline"
                className="w-full"
              >
                Create Driver Record
              </Button>
            </CardContent>
          </Card>

          {/* Current Auth Info */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Current Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm space-y-2">
                <p><strong>Username:</strong> {user?.username || 'Not logged in'}</p>
                <p><strong>Role:</strong> {user?.role || 'Unknown'}</p>
                <p><strong>User ID:</strong> {user?.id || 'N/A'}</p>
                <p><strong>Token:</strong> {token ? 'Present' : 'Missing'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                onClick={() => setDriverUsername(user?.username || '')}
                variant="outline"
                className="w-full"
                size="sm"
              >
                Use Current User
              </Button>
              
              <Button 
                onClick={() => setDriverUsername('Motor1')}
                variant="outline"
                className="w-full"
                size="sm"
              >
                Test with Motor1
              </Button>
              
              <div className="text-xs text-gray-500 mt-4">
                <p className="font-medium mb-1">Common Issues:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Driver user exists but no driver record</li>
                  <li>Username mismatch between auth and drivers table</li>
                  <li>Driver table not populated</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Debug Results */}
        {debugResults && (
          <Card className="mt-8 bg-white/80 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Debug Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium mb-2">Driver Check Results:</h3>
                  <div className="text-sm mb-2">
                    <p><strong>Status:</strong> {debugResults.driverCheck.status}</p>
                    <p><strong>Status Text:</strong> {debugResults.driverCheck.statusText}</p>
                  </div>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48">
                    {JSON.stringify(debugResults.driverCheck.data, null, 2)}
                  </pre>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">User Information:</h3>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48">
                    {JSON.stringify(debugResults.userData, null, 2)}
                  </pre>
                  
                  <h3 className="font-medium mt-4 mb-2">All Drivers:</h3>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto max-h-48">
                    {JSON.stringify(debugResults.allDrivers, null, 2)}
                  </pre>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Analysis:</h3>
                <div className="text-sm text-blue-700">
                  {debugResults.driverCheck.status === 404 ? (
                    <p>❌ Driver record not found. The user exists but there's no corresponding driver record in the database.</p>
                  ) : debugResults.driverCheck.status === 200 ? (
                    <p>✅ Driver record found successfully!</p>
                  ) : (
                    <p>⚠️ Unexpected status code: {debugResults.driverCheck.status}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="mt-8 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Fix Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm">
              <p className="mb-2"><strong>If driver record is missing (404 error):</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Use the "Create Driver Record" button to create a driver entry</li>
                <li>Ensure the username matches exactly (case-sensitive)</li>
                <li>Refresh the driver dashboard after creation</li>
              </ol>
              
              <p className="mt-4 mb-2"><strong>If still having issues:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Check that you're logged in as the correct driver user</li>
                <li>Verify the username in HR credential assignment matches the driver record</li>
                <li>Check browser console for detailed error messages</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}