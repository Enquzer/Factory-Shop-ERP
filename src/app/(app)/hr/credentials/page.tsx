'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { UserPlus, Key, Users, CheckCircle, AlertCircle } from 'lucide-react';

type Employee = {
  id: number;
  employeeId: string;
  name: string;
  phone: string;
  departmentId: string;
  jobCenter: string;
  userId?: number;
  username?: string;
};

export default function HRCredentialsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      fetchPendingEmployees();
    }
  }, [token]);

  const fetchPendingEmployees = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/hr/credentials', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (response.ok) {
        const { employees: data } = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAssignCredentials = async () => {
    if (!selectedEmployee) return;
    
    if (!username || !password || !confirmPassword) {
      toast({
        title: "Missing Information",
        description: "Please fill all fields",
        variant: "destructive"
      });
      return;
    }
    
    if (password !== confirmPassword) {
      toast({
        title: "Password Mismatch",
        description: "Passwords do not match",
        variant: "destructive"
      });
      return;
    }
    
    if (password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setAssigning(true);
      
      const response = await fetch('/api/hr/credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          employeeId: selectedEmployee.employeeId,
          username,
          password
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Credentials assigned to ${selectedEmployee.name}`,
          className: "bg-green-600 text-white"
        });
        
        // Reset form and refresh list
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setSelectedEmployee(null);
        fetchPendingEmployees();
      } else {
        throw new Error(result.error || 'Failed to assign credentials');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAssigning(false);
    }
  };

  const getInitialUsername = (name: string) => {
    const cleanName = name.replace(/[^a-zA-Z\s]/g, '').trim();
    const parts = cleanName.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].toLowerCase()}.${parts[1].toLowerCase()}`;
    }
    return cleanName.toLowerCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employee data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Assign System Credentials</h1>
          <p className="text-gray-600">Set up login access for HR registered employees</p>
        </div>

        {/* Stats Card */}
        <Card className="mb-8 bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Pending Credential Assignments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                <span className="font-medium">{employees.length} employees</span>
                <span className="text-gray-500">need credentials</span>
              </div>
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Drivers Department
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Employees Table */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Employees Requiring Credentials
            </CardTitle>
          </CardHeader>
          <CardContent>
            {employees.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">All Set!</h3>
                <p className="text-gray-500">No pending credential assignments</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employees.map((employee) => (
                    <TableRow key={employee.employeeId}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.employeeId}</Badge>
                      </TableCell>
                      <TableCell>{employee.jobCenter}</TableCell>
                      <TableCell>{employee.phone}</TableCell>
                      <TableCell className="text-right">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setSelectedEmployee(employee);
                                setUsername(getInitialUsername(employee.name));
                              }}
                            >
                              <Key className="h-4 w-4 mr-2" />
                              Assign Credentials
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Assign Credentials</DialogTitle>
                            </DialogHeader>
                            
                            {selectedEmployee && (
                              <div className="space-y-4 py-4">
                                <div className="bg-gray-50 p-4 rounded-lg">
                                  <h4 className="font-medium text-gray-900">{selectedEmployee.name}</h4>
                                  <p className="text-sm text-gray-600">{selectedEmployee.jobCenter}</p>
                                  <p className="text-sm text-gray-500">ID: {selectedEmployee.employeeId}</p>
                                </div>
                                
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                      id="username"
                                      value={username}
                                      onChange={(e) => setUsername(e.target.value)}
                                      placeholder="e.g., john.doe"
                                    />
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                      id="password"
                                      type="password"
                                      value={password}
                                      onChange={(e) => setPassword(e.target.value)}
                                      placeholder="Minimum 6 characters"
                                    />
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <Input
                                      id="confirmPassword"
                                      type="password"
                                      value={confirmPassword}
                                      onChange={(e) => setConfirmPassword(e.target.value)}
                                      placeholder="Re-enter password"
                                    />
                                  </div>
                                </div>
                                
                                <div className="flex gap-2">
                                  <Button 
                                    onClick={handleAssignCredentials}
                                    disabled={assigning}
                                    className="flex-1"
                                  >
                                    {assigning ? 'Assigning...' : 'Assign Credentials'}
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    onClick={() => {
                                      setSelectedEmployee(null);
                                      setUsername('');
                                      setPassword('');
                                      setConfirmPassword('');
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}