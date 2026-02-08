'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { Badge } from '@/components/ui/badge';

export default function UnifiedHRDebugPage() {
  const [driverUsername, setDriverUsername] = useState('Motor1');
  const [driverId, setDriverId] = useState('140204');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [usernamePassword, setPasswordForLogin] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [authResult, setAuthResult] = useState<any>(null);
  const [userDetails, setUserDetails] = useState<any>(null);
  const [debugResults, setDebugResults] = useState<any>(null);
  const [apiResults, setApiResults] = useState<any>(null);
  const { token, user, login } = useAuth();
  const { toast } = useToast();

  // Driver Login Debug Functions
  const testDriverLogin = async () => {
    setIsLoading(true);
    setAuthResult(null);
    setApiResults(null);
    
    try {
      const loginResult = await login(driverId, password);
      setAuthResult(loginResult);
      
      if (loginResult.success) {
        toast({
          title: "Login Successful",
          description: `Logged in as ${user?.username} with role ${user?.role}`,
          className: "bg-green-600 text-white"
        });
        
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

  // Driver Data Debug Functions
  const checkDriverData = async () => {
    setIsLoading(true);
    setDebugResults(null);
    
    try {
      const driverResponse = await fetch(`/api/drivers/${driverUsername}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      const driverData = await driverResponse.json();
      
      const userResponse = await fetch('/api/debug-user', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      const userData = await userResponse.json();
      
      const allDriversResponse = await fetch('/api/drivers', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      const allDriversData = await allDriversResponse.json();
      
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
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Driver record created successfully",
          className: "bg-green-600 text-white"
        });
        
        setTimeout(() => checkDriverData(), 1000);
      } else {
        toast({
          title: "Error",
          description: result.error || 'Failed to create driver record',
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create driver record",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Original Driver Debug Functions
  const testLogin = async () => {
    setIsLoading(true);
    setAuthResult(null);
    setUserDetails(null);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password: usernamePassword }),
      });
      
      const authData = await response.json();
      setAuthResult(authData);
      
      if (authData.success) {
        toast({
          title: "Authentication Successful",
          description: `Logged in as ${authData.user?.username} with role ${authData.user?.role}`,
          className: "bg-green-600 text-white"
        });
        
        try {
          const userResponse = await fetch(`/api/auth?username=${username}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUserDetails(userData);
          }
        } catch (error) {
          // Error fetching user details
        }
      } else {
        toast({
          title: "Authentication Failed",
          description: authData.message || 'Invalid credentials',
          variant: "destructive"
        });
      }
    } catch (error) {
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
      
      toast({
        title: "Auth Middleware Test",
        description: data.authenticated ? 'Token is valid' : 'Token is invalid',
        className: data.authenticated ? "bg-green-600 text-white" : "bg-red-600 text-white"
      });
    } catch (error) {
      // Auth middleware test error
    }
  };

  // All Employees Debug
  const [employees, setEmployees] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch all employees
      const empResponse = await fetch('/api/hr/employees', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (empResponse.ok) {
        const empData = await empResponse.json();
        setEmployees(empData);
        
        // Filter drivers
        const driverList = empData.filter((emp: any) => emp.departmentId === 'Drivers');
        setDrivers(driverList);
      }
    } catch (error) {
      // Error fetching data
      toast({
        title: "Error",
        description: "Failed to load employee data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Unified HR Debug Dashboard</h1>
          <p className="text-gray-600">Comprehensive debugging tools for HR and driver authentication</p>
        </div>

        <Tabs defaultValue="driver-login" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="driver-login">Driver Login</TabsTrigger>
            <TabsTrigger value="driver-data">Driver Data</TabsTrigger>
            <TabsTrigger value="driver-orig">Driver Original</TabsTrigger>
            <TabsTrigger value="hr-data">HR Data</TabsTrigger>
          </TabsList>

          {/* Driver Login Tab */}
          <TabsContent value="driver-login">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Driver Authentication Debug</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
                      
                      {authResult && (
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <h3 className="font-medium text-sm mb-2">Login Results:</h3>
                          <pre className="text-xs overflow-auto max-h-32">
                            {JSON.stringify(authResult, null, 2)}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Driver Data Tab */}
          <TabsContent value="driver-data">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Driver Data Synchronization Debug</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* Original Driver Debug Tab */}
          <TabsContent value="driver-orig">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Driver Login Debug</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
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
                        <Label htmlFor="passwordOrig">Password</Label>
                        <Input
                          id="passwordOrig"
                          type="password"
                          value={usernamePassword}
                          onChange={(e) => setPasswordForLogin(e.target.value)}
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
              </CardContent>
            </Card>
          </TabsContent>

          {/* HR Data Tab */}
          <TabsContent value="hr-data">
            <Card className="bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>HR Debug Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Total Employees</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-blue-600">{employees.length}</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Drivers Department</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">{drivers.length}</div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white/80 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle>Need Credentials</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-orange-600">
                        {drivers.filter(d => !d.userId).length}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex justify-center mb-6">
                  <Button onClick={fetchAllData} variant="outline">
                    Refresh Data
                  </Button>
                </div>

                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading data...</p>
                  </div>
                ) : (
                  <>
                    {/* All Employees */}
                    <Card className="mb-8 bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle>All Employees ({employees.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {employees.slice(0, 10).map((emp) => (
                            <div key={emp.employeeId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div>
                                <div className="font-medium">{emp.name}</div>
                                <div className="text-sm text-gray-600">
                                  ID: {emp.employeeId} • Dept: {emp.departmentId || 'Not set'}
                                </div>
                              </div>
                              <Badge variant={emp.departmentId === 'Drivers' ? 'default' : 'secondary'}>
                                {emp.departmentId || 'No Department'}
                              </Badge>
                            </div>
                          ))}
                          {employees.length > 10 && (
                            <div className="text-center text-gray-500 py-2">
                              ... and {employees.length - 10} more employees
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Drivers Only */}
                    <Card className="bg-white/80 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle>Drivers Department ({drivers.length})</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {drivers.length === 0 ? (
                          <div className="text-center py-8 text-gray-500">
                            <p>No employees found in Drivers department</p>
                            <p className="text-sm mt-2">Check if department is set to exactly "Drivers"</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {drivers.map((driver) => (
                              <div key={driver.employeeId} className="flex items-center justify-between p-4 border rounded-lg">
                                <div>
                                  <div className="font-semibold text-lg">{driver.name}</div>
                                  <div className="text-sm text-gray-600 mt-1">
                                    Employee ID: {driver.employeeId}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Position: {driver.jobCenter}
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Phone: {driver.phone}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <Badge variant={driver.userId ? 'secondary' : 'destructive'}>
                                    {driver.userId ? 'Has Credentials' : 'Needs Credentials'}
                                  </Badge>
                                  {driver.userId && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      User ID: {driver.userId}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}