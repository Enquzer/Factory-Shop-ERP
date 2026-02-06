'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, BarChart3, Users } from 'lucide-react';

export default function ReportsPage() {
  return (
    <div className="space-y-6 animate-in slide-in-from-bottom duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">IE Reports</h1>
          <p className="text-muted-foreground">
            Industrial Engineering analytics and reporting
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export Reports
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Efficiency Reports
            </CardTitle>
            <CardDescription>
              Production efficiency analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 border rounded-lg">
              <p className="text-muted-foreground">No data available</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              SAM Analysis
            </CardTitle>
            <CardDescription>
              Standard Allowed Minutes reports
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 border rounded-lg">
              <p className="text-muted-foreground">No data available</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Line Performance
            </CardTitle>
            <CardDescription>
              Workstation and line performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 border rounded-lg">
              <p className="text-muted-foreground">No data available</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}