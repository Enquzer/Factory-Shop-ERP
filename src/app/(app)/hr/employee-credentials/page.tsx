'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { 
  Search, 
  Key, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  UserPlus,
  Pencil,
  Trash2,
  Users
} from 'lucide-react';

type Employee = {
  id: number;
  employeeId: string;
  name: string;
  phone: string;
  departmentId: string;
  jobCenter: string;
  status: string;
  userId?: number;
  username?: string;
};

type User = {
  id: number;
  username: string;
  role: string;
};

export default function EmployeeCredentialsPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('driver');
  const { token } = useAuth();

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch employees
      const empResponse = await fetch('/api/hr/employees', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      // Fetch users to map userId to usernames
      const userResponse = await fetch('/api/users', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (empResponse.ok) {
        const empData = await empResponse.json();
        setEmployees(empData);
      }
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        setUsers(userData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
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
          password,
          role
        })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        toast({
          title: "Success",
          description: `Credentials assigned to ${selectedEmployee.name}`,
          className: "bg-green-600 text-white"
        });
        
        // Reset form and refresh data
        setUsername('');
        setPassword('');
        setConfirmPassword('');
        setSelectedEmployee(null);
        fetchData();
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

  const handleRemoveCredentials = async (employeeId: string) => {
    if (!confirm('Are you sure you want to remove credentials for this employee?')) return;
    
    try {
      const response = await fetch(`/api/hr/credentials/${employeeId}`, {
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Credentials removed successfully",
          className: "bg-green-600 text-white"
        });
        fetchData();
      } else {
        throw new Error('Failed to remove credentials');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
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

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(search.toLowerCase()) || 
    emp.employeeId.toLowerCase().includes(search.toLowerCase()) ||
    emp.jobCenter.toLowerCase().includes(search.toLowerCase()) ||
    (emp.departmentId && emp.departmentId.toLowerCase().includes(search.toLowerCase()))
  );

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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Employee Credential Management</h1>
          <p className="text-gray-600">Manage system access for all registered employees</p>
        </div>

        {/* Search and Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search employees by name, ID, job, or department..." 
                className="pl-10" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="text-sm text-gray-500 mb-1">Total Employees</div>
              <div className="text-2xl font-bold text-blue-600">{employees.length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="text-sm text-gray-500 mb-1">With Credentials</div>
              <div className="text-2xl font-bold text-green-600">
                {employees.filter(e => e.userId).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Employee Table */}
        <Card className="bg-white/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Employee Credential Matrix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credentials</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((employee) => {
                  const user = users.find(u => u.id === employee.userId);
                  
                  return (
                    <TableRow key={employee.employeeId} className="hover:bg-gray-50">
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{employee.employeeId}</Badge>
                      </TableCell>
                      <TableCell>{employee.jobCenter}</TableCell>
                      <TableCell>
                        <Badge variant={employee.departmentId === 'Drivers' ? 'default' : 'secondary'}>
                          {employee.departmentId || 'Not Assigned'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${employee.status === 'Active' ? 'bg-green-500' : 'bg-red-500'}`} />
                          <span className="text-sm">{employee.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {employee.userId ? (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-600">Assigned</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 text-red-500" />
                              <span className="text-sm text-red-600">None</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {user ? (
                          <span className="text-sm font-mono text-blue-600">{user.username}</span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {employee.userId ? (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                              onClick={() => handleRemoveCredentials(employee.employeeId)}
                            >
                              <EyeOff className="h-4 w-4 mr-1" />
                              Remove
                            </Button>
                          ) : (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  className="bg-blue-600 hover:bg-blue-700"
                                  onClick={() => {
                                    setSelectedEmployee(employee);
                                    setUsername(getInitialUsername(employee.name));
                                  }}
                                >
                                  <Key className="h-4 w-4 mr-1" />
                                  Assign
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
                                        <Label htmlFor="role">Role/Access Level</Label>
                                        <Select value={role} onValueChange={setRole}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select role" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="driver">Driver (Delivery & Tracking Only)</SelectItem>
                                            <SelectItem value="factory">Factory Staff (Full Production Access)</SelectItem>
                                            <SelectItem value="shop">Shop Manager (Shop Operations)</SelectItem>
                                            <SelectItem value="store">Store Keeper (Inventory Management)</SelectItem>
                                            <SelectItem value="finance">Finance (Financial Operations)</SelectItem>
                                            <SelectItem value="hr">HR Manager (HR Functions)</SelectItem>
                                          </SelectContent>
                                        </Select>
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
                                        setRole('driver');
                                      }}
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                          )}
                          
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="text-blue-600 border-blue-600 hover:bg-blue-600 hover:text-white"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            
            {filteredEmployees.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No employees found matching your search</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}