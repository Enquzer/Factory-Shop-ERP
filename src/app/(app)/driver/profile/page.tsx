'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { User, Phone, Briefcase, Mail, Shield, UserCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export default function DriverProfilePage() {
  const { user } = useAuth();
  const [driverInfo, setDriverInfo] = useState<any>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (token && user?.username) {
      fetch(`/api/drivers/${user.username}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => setDriverInfo(data.driver))
      .catch(err => console.error(err));
    }
  }, [token, user]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Driver Profile</h1>
        <p className="text-muted-foreground">Manage your personal and professional information</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <Card className="md:col-span-1">
          <CardContent className="pt-8 pb-6 text-center space-y-4">
            <div className="mx-auto w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
              <UserCircle className="h-16 w-16 text-indigo-600" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{driverInfo?.name || user?.username}</h3>
              <p className="text-sm text-muted-foreground">Professional Driver</p>
            </div>
            <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">Active Status</Badge>
          </CardContent>
        </Card>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="bg-slate-100 p-2 rounded-lg">
                  <User className="h-4 w-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Username</p>
                  <p className="text-sm font-medium">{user?.username || 'N/A'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="bg-slate-100 p-2 rounded-lg">
                  <Briefcase className="h-4 w-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Vehicle Type</p>
                  <p className="text-sm font-medium capitalize">{driverInfo?.vehicleType || 'Car'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="bg-slate-100 p-2 rounded-lg">
                  <Phone className="h-4 w-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase">Phone Number</p>
                  <p className="text-sm font-medium">{driverInfo?.phone || 'Not Registered'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="bg-slate-100 p-2 rounded-lg">
                  <Shield className="h-4 w-4 text-slate-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-muted-foreground uppercase">License Plate</p>
                  <p className="text-sm font-medium">{driverInfo?.licensePlate || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-100 bg-indigo-50/50">
            <CardHeader>
              <CardTitle className="text-sm">Account Security</CardTitle>
              <CardDescription>Update your password or change login settings</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full justify-start gap-2 border-indigo-200 text-indigo-700">
                Change Password
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
