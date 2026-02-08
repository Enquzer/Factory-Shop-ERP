'use client'

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, MapPin, Truck, CheckCircle2, XCircle, Clock, Navigation } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Helper function for status color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'assigned': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'accepted': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'picked_up': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'in_transit': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'delivered': return 'bg-green-100 text-green-800 border-green-200';
    case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Refactored AssignmentSection component
interface AssignmentSectionProps {
  title: string;
  items: any[];
  showActions?: boolean;
  onUpdateStatus: (id: string, status: 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled') => void;
  isUpdating: string | null;
}

function AssignmentSection({ 
  title, 
  items, 
  showActions = false,
  onUpdateStatus,
  isUpdating
}: AssignmentSectionProps) {
  return (
    <div className="space-y-4 mb-8">
        <h2 className="text-xl font-semibold flex items-center gap-2">
            {title} 
            <Badge variant="outline" className="ml-2">{items.length}</Badge>
        </h2>
        {items.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No orders in this section.</p>
        ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {items.map((assignment) => (
                    <Card key={assignment.id} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3 bg-gray-50/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <Package className="h-4 w-4 text-primary" />
                                        Order #{assignment.orderId}
                                    </CardTitle>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                        <Clock className="h-3 w-3" />
                                        <span>{new Date(assignment.assignedAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <Badge variant="outline" className={getStatusColor(assignment.status)}>
                                    {assignment.status.replace('_', ' ').toUpperCase()}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 text-sm">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <div className="flex items-start gap-2">
                                        <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-muted-foreground uppercase">Pickup</p>
                                            <p className="font-medium leading-tight">{assignment.pickupLocation?.name}</p>
                                        </div>
                                    </div>
                                    <div className="ml-1 pl-4 border-l-2 border-dashed border-gray-200 h-2" />
                                    <div className="flex items-start gap-2">
                                        <div className="mt-0.5 h-2 w-2 rounded-full bg-orange-500 shrink-0" />
                                        <div>
                                            <p className="text-xs font-bold text-muted-foreground uppercase">Delivery</p>
                                            <p className="font-medium leading-tight">{assignment.deliveryLocation?.name}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-1">{assignment.deliveryLocation?.deliveryAddress}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        
                        {showActions && assignment.status !== 'delivered' && assignment.status !== 'cancelled' && (
                            <CardFooter className="bg-gray-50/30 pt-3 border-t">
                                <div className="w-full space-y-2">
                                    {assignment.status === 'assigned' && (
                                        <div className="flex gap-2">
                                            <Button 
                                                variant="outline" 
                                                className="w-1/2 border-red-200 hover:bg-red-50 text-red-700"
                                                onClick={() => onUpdateStatus(assignment.id, 'cancelled')}
                                                disabled={!!isUpdating}
                                            >
                                                <XCircle className="w-4 h-4 mr-2" /> Reject
                                            </Button>
                                            <Button 
                                                className="w-1/2 bg-green-600 hover:bg-green-700"
                                                onClick={() => onUpdateStatus(assignment.id, 'accepted')}
                                                disabled={!!isUpdating}
                                            >
                                                <CheckCircle2 className="w-4 h-4 mr-2" /> Accept
                                            </Button>
                                        </div>
                                    )}
                                    
                                    {assignment.status === 'accepted' && (
                                        <Button 
                                            className="w-full bg-blue-600 hover:bg-blue-700"
                                            onClick={() => onUpdateStatus(assignment.id, 'picked_up')}
                                            disabled={!!isUpdating}
                                        >
                                            <Package className="w-4 h-4 mr-2" /> Confirm Pickup
                                        </Button>
                                    )}

                                    {assignment.status === 'picked_up' && (
                                        <Button 
                                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                                            onClick={() => onUpdateStatus(assignment.id, 'in_transit')}
                                            disabled={!!isUpdating}
                                        >
                                            <Navigation className="w-4 h-4 mr-2" /> Start Delivery
                                        </Button>
                                    )}
                                    
                                    {assignment.status === 'in_transit' && (
                                        <Button 
                                            className="w-full bg-green-600 hover:bg-green-700"
                                            onClick={() => onUpdateStatus(assignment.id, 'delivered')}
                                            disabled={!!isUpdating}
                                        >
                                            <CheckCircle2 className="w-4 h-4 mr-2" /> Complete Delivery
                                        </Button>
                                    )}
                                </div>
                            </CardFooter>
                        )}
                    </Card>
                ))}
            </div>
        )}
    </div>
  );
}

export default function DriverAssignmentsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
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

  const updateAssignmentStatus = async (assignmentId: string, newStatus: 'accepted' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled') => {
    try {
      setUpdatingStatus(assignmentId);
      
      const response = await fetch(`/api/driver-assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      
      // Refresh list
      await fetchAssignments();

      const statusMessages = {
          accepted: 'Order Accepted! Navigate to pickup.',
          picked_up: 'Order Picked Up! Head to delivery location.',
          in_transit: 'Delivery Started!',
          delivered: 'Order Delivered! Great job.',
          cancelled: 'Assignment Rejected/Cancelled.'
      };

      toast({
        title: newStatus === 'cancelled' ? "Assignment Rejected" : "Status Updated",
        description: statusMessages[newStatus] || `Order status updated to ${newStatus}`,
        className: newStatus === 'cancelled' ? "bg-red-600 text-white" : "bg-green-600 text-white"
      });
    } catch (error) {
      console.error('Error updating assignment status:', error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive"
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const pendingAssignments = assignments.filter(a => a.status === 'assigned');
  const activeAssignments = assignments.filter(a => ['accepted', 'picked_up', 'in_transit'].includes(a.status));
  const completedAssignments = assignments.filter(a => ['delivered', 'cancelled'].includes(a.status));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
          <h1 className="text-3xl font-bold tracking-tight">My Assignments</h1>
          <p className="text-muted-foreground">Manage your delivery tasks and view history.</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <>
            <AssignmentSection 
              title="New Requests" 
              items={pendingAssignments} 
              showActions={true} 
              onUpdateStatus={updateAssignmentStatus}
              isUpdating={updatingStatus}
            />
            
            <AssignmentSection 
              title="Active Deliveries" 
              items={activeAssignments} 
              showActions={true} 
              onUpdateStatus={updateAssignmentStatus}
              isUpdating={updatingStatus}
            />
            
            <div className="pt-8 border-t">
                <AssignmentSection 
                  title="Completed History" 
                  items={completedAssignments} 
                  showActions={false} 
                  onUpdateStatus={updateAssignmentStatus}
                  isUpdating={updatingStatus}
                />
            </div>
        </>
      )}
    </div>
  );
}
