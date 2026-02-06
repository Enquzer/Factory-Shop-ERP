'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ClipboardList, Plus, Calendar } from 'lucide-react';

export default function ResourcePlanningPage() {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resource Planning</h1>
          <p className="text-muted-foreground">
            Machine and resource availability planning
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Plan Resources
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Resource Schedule
          </CardTitle>
          <CardDescription>
            Plan and track machine and operator availability
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 border-2 border-dashed rounded-lg">
            <div className="text-center">
              <Calendar className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No Resource Plans</h3>
              <p className="text-muted-foreground">
                Create your first resource planning schedule
              </p>
              <Button className="mt-4">
                <ClipboardList className="mr-2 h-4 w-4" />
                Create Plan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}