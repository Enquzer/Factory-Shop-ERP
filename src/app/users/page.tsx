'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Users, 
  Factory,
  Package,
  DollarSign,
  Building2,
  Plus,
  Edit,
  Trash2
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveTable } from '@/components/responsive-table';
import { useAuth } from '@/contexts/auth-context';

// Define the User type
type UserType = {
  id: number;
  username: string;
  role: string;
  createdAt: Date;
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [factoryUsers, setFactoryUsers] = useState<UserType[]>([]);
  const [shopUsers, setShopUsers] = useState<UserType[]>([]);
  const [storeUsers, setStoreUsers] = useState<UserType[]>([]);
  const [financeUsers, setFinanceUsers] = useState<UserType[]>([]);
  const [productionUsers, setProductionUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const usersData: UserType[] = await response.json();
        setUsers(usersData);
        
        // Filter users by role
        setFactoryUsers(usersData.filter(u => u.role === 'factory'));
        setShopUsers(usersData.filter(u => u.role === 'shop'));
        setStoreUsers(usersData.filter(u => u.role === 'store'));
        setFinanceUsers(usersData.filter(u => u.role === 'finance'));
        setProductionUsers(usersData.filter(u => ['planning', 'sample_maker', 'cutting', 'sewing', 'finishing', 'packing', 'quality_inspection'].includes(u.role)));
      } else {
        console.error('Failed to fetch users:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  // Prepare table data for factory users
  const factoryUserRows = factoryUsers.map(user => ({
    id: user.id,
    username: user.username,
    role: (
      <Badge className="bg-blue-100 text-blue-800">
        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
      </Badge>
    ),
    createdAt: new Date(user.createdAt).toLocaleDateString(),
    actions: (
      <div className="flex space-x-2">
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
    )
  }));

  // Prepare table data for shop users
  const shopUserRows = shopUsers.map(user => ({
    id: user.id,
    username: user.username,
    role: (
      <Badge className="bg-purple-100 text-purple-800">
        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
      </Badge>
    ),
    createdAt: new Date(user.createdAt).toLocaleDateString(),
    actions: (
      <div className="flex space-x-2">
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
    )
  }));

  // Prepare table data for store users
  const storeUserRows = storeUsers.map(user => ({
    id: user.id,
    username: user.username,
    role: (
      <Badge className="bg-green-100 text-green-800">
        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
      </Badge>
    ),
    createdAt: new Date(user.createdAt).toLocaleDateString(),
    actions: (
      <div className="flex space-x-2">
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
    )
  }));

  // Prepare table data for finance users
  const financeUserRows = financeUsers.map(user => ({
    id: user.id,
    username: user.username,
    role: (
      <Badge className="bg-yellow-100 text-yellow-800">
        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
      </Badge>
    ),
    createdAt: new Date(user.createdAt).toLocaleDateString(),
    actions: (
      <div className="flex space-x-2">
        <Button variant="outline" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
    )
  }));

  const userHeaders = [
    { key: 'username', title: 'Username', mobileTitle: 'User' },
    { key: 'role', title: 'Role', mobileTitle: 'Role' },
    { key: 'createdAt', title: 'Created', mobileTitle: 'Created' },
    { key: 'actions', title: 'Actions', mobileTitle: 'Actions' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Management</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">All user accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Factory Users</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{factoryUsers.length}</div>
            <p className="text-xs text-muted-foreground">Factory admins</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Shop Users</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shopUsers.length}</div>
            <p className="text-xs text-muted-foreground">Shop accounts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Store & Finance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{storeUsers.length + financeUsers.length}</div>
            <p className="text-xs text-muted-foreground">Store & Finance users</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Tabs */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Users</TabsTrigger>
          <TabsTrigger value="factory">Factory</TabsTrigger>
          <TabsTrigger value="shop">Shop</TabsTrigger>
          <TabsTrigger value="store">Store</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveTable 
                headers={userHeaders} 
                data={users.map(user => ({
                  id: user.id,
                  username: user.username,
                  role: (
                    <Badge 
                      className={
                        user.role === 'factory' ? 'bg-blue-100 text-blue-800' :
                        user.role === 'shop' ? 'bg-purple-100 text-purple-800' :
                        user.role === 'store' ? 'bg-green-100 text-green-800' :
                        user.role === 'finance' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-orange-100 text-orange-800'
                      }
                    >
                      {user.role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </Badge>
                  ),
                  createdAt: new Date(user.createdAt).toLocaleDateString(),
                  actions: (
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  )
                }))}
                className="w-full"
              />
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="factory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Factory Users</CardTitle>
            </CardHeader>
            <CardContent>
              {factoryUsers.length > 0 ? (
                <ResponsiveTable 
                  headers={userHeaders} 
                  data={factoryUserRows} 
                  className="w-full"
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Factory className="mx-auto h-12 w-12 mb-4" />
                  <p>No factory users found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="shop" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Shop Users</CardTitle>
            </CardHeader>
            <CardContent>
              {shopUsers.length > 0 ? (
                <ResponsiveTable 
                  headers={userHeaders} 
                  data={shopUserRows} 
                  className="w-full"
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building2 className="mx-auto h-12 w-12 mb-4" />
                  <p>No shop users found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="store" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Store Users</CardTitle>
            </CardHeader>
            <CardContent>
              {storeUsers.length > 0 ? (
                <ResponsiveTable 
                  headers={userHeaders} 
                  data={storeUserRows} 
                  className="w-full"
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="mx-auto h-12 w-12 mb-4" />
                  <p>No store users found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="finance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Finance Users</CardTitle>
            </CardHeader>
            <CardContent>
              {financeUsers.length > 0 ? (
                <ResponsiveTable 
                  headers={userHeaders} 
                  data={financeUserRows} 
                  className="w-full"
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <DollarSign className="mx-auto h-12 w-12 mb-4" />
                  <p>No finance users found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="production" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Production Users</CardTitle>
            </CardHeader>
            <CardContent>
              {productionUsers.length > 0 ? (
                <ResponsiveTable 
                  headers={userHeaders} 
                  data={productionUsers.map(user => ({
                    id: user.id,
                    username: user.username,
                    role: (
                      <Badge className="bg-orange-100 text-orange-800">
                        {user.role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                      </Badge>
                    ),
                    createdAt: new Date(user.createdAt).toLocaleDateString(),
                    actions: (
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    )
                  }))} 
                  className="w-full"
                />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Factory className="mx-auto h-12 w-12 mb-4" />
                  <p>No production users found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}