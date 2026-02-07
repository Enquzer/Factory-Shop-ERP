'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';

export default function DebugHRPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
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
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load employee data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">HR Debug Information</h1>
        
        {/* Summary Cards */}
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

        {/* All Employees */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>All Employees ({employees.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {employees.map((emp) => (
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

        <div className="mt-6 text-center">
          <Button onClick={fetchData} variant="outline">
            Refresh Data
          </Button>
        </div>
      </div>
    </div>
  );
}