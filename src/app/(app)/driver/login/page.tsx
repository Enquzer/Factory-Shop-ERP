'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { toast } from '@/hooks/use-toast';
import { Truck } from 'lucide-react';

export default function DriverLoginPage() {
  const [driverId, setDriverId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // In a real implementation, you'd verify driver credentials against your database
      // For now, we'll simulate driver login
      const success = await login(driverId, password);
      
      if (success) {
        toast({
          title: "Login Successful",
          description: "Welcome to the driver dashboard!",
          className: "bg-green-600 text-white"
        });
        router.push('/driver/dashboard');
      } else {
        toast({
          title: "Login Failed",
          description: "Invalid driver ID or password",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An error occurred during login",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto bg-blue-600 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
            <Truck className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">Driver Login</CardTitle>
          <CardDescription>
            Enter your driver credentials to access your dashboard
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="driverId">Driver ID</Label>
              <Input
                id="driverId"
                type="text"
                placeholder="Enter your driver ID"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                required
                className="bg-white/50 border-gray-300"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/50 border-gray-300"
              />
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login as Driver'}
            </Button>
            
            <Button 
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push('/')}
            >
              Back to Main Site
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}