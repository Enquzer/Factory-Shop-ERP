'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, MapPin, Truck, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DriverAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { token, user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      fetchAssignments();
    }
  }, [token]);

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      const driverId = user?.username;
      if (!driverId) return;

      const response = await fetch(`/api/drivers/${driverId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const { assignments: driverAssignments } = await response.json();
        setAssignments(driverAssignments);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      case 'in_transit': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">My Assignments</h1>
          <p className="text-muted-foreground">Detailed history of all your delivery tasks</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : assignments.length === 0 ? (
        <Card className="text-center py-12 border-dashed">
          <CardContent>
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <h3 className="font-semibold text-lg">No Assignments Found</h3>
            <p className="text-muted-foreground">You haven't been assigned any orders yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => (
            <Card key={assignment.id} className="overflow-hidden border-l-4 border-l-indigo-500">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="h-4 w-4 text-indigo-500" />
                      Order #{assignment.orderId}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Assigned on {new Date(assignment.assignedAt).toLocaleDateString()} at {new Date(assignment.assignedAt).toLocaleTimeString()}
                    </p>
                  </div>
                  <Badge variant="outline" className={getStatusColor(assignment.status)}>
                    {assignment.status.replace('_', ' ').toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <MapPin className="h-4 w-4 text-red-500 mt-1 shrink-0" />
                      <div>
                        <p className="text-xs font-bold uppercase text-muted-foreground">Pickup</p>
                        <p className="text-sm font-medium">{assignment.pickupLocation?.name || 'Standard Shop Pickup'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Truck className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                      <div>
                        <p className="text-xs font-bold uppercase text-muted-foreground">Delivery</p>
                        <p className="text-sm font-medium">{assignment.deliveryLocation?.name || 'Customer Address'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Order Summary</h4>
                    {assignment.orderDetails ? (
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{assignment.orderDetails.customerName}</p>
                        <p className="text-xs text-muted-foreground">{assignment.orderDetails.items.length} items • ETB {assignment.orderDetails.totalAmount.toLocaleString()}</p>
                      </div>
                    ) : (
                      <p className="text-sm italic text-muted-foreground">Details unavailable</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
