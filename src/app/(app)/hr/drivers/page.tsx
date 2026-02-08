"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { createAuthHeaders } from "@/lib/auth-helpers";
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Truck, 
  Search,
  Phone,
  CreditCard,
  User
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface Driver {
  id: number;
  name: string;
  contact: string;
  license_plate: string;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  
  // Form states
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  
  const { toast } = useToast();

  interface Employee {
    id: number;
    employeeId: string;
    name: string;
    phone: string;
    userId?: string;
  }

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [vehicleType, setVehicleType] = useState<'motorbike' | 'car' | 'van' | 'truck'>('car');

  useEffect(() => {
    fetchDrivers();
    fetchEmployees();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await fetch('/api/hr/drivers');
      if (response.ok) {
        const data = await response.json();
        setDrivers(data);
      }
    } catch (error) {
      // Error fetching drivers
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await fetch('/api/hr/employees');
      if (response.ok) {
        const data = await response.json();
        // Filter employees who are not already drivers
        const nonDrivers = data.filter((emp: any) => 
          !drivers.some((driver: any) => driver.employeeId === emp.employeeId)
        );
        setEmployees(nonDrivers);
      }
    } catch (error) {
      // Error fetching employees
    }
  };

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployeeId(employeeId);
    const emp = employees.find(e => e.employeeId === employeeId);
    if (emp) {
      setName(emp.name);
      setContact(emp.phone);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editingDriver ? "PUT" : "POST";
    const url = editingDriver ? `/api/hr/drivers/${editingDriver.id}` : "/api/hr/drivers";

    const emp = employees.find(e => e.employeeId === selectedEmployeeId);

    try {
      const response = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          ...createAuthHeaders()
        },
        body: JSON.stringify({
          name,
          contact,
          license_plate: licensePlate,
          employeeId: selectedEmployeeId,
          userId: emp?.userId,
          vehicleType
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: editingDriver ? "Driver updated successfully." : "Driver registered successfully.",
        });
        setIsDialogOpen(false);
        resetForm();
        fetchDrivers();
      } else {
        const error = await response.json();
        toast({
          title: "Error",
          description: error.error || "Failed to save driver.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Error saving driver
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this driver?")) return;

    try {
      const response = await fetch(`/api/hr/drivers/${id}`, {
        method: "DELETE",
        headers: createAuthHeaders()
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Driver deleted successfully.",
        });
        fetchDrivers(); // Refresh the list
      } else {
        toast({
          title: "Error",
          description: "Failed to delete driver.",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Error deleting driver
    }
  };

  const openAddDialog = () => {
    setEditingDriver(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (driver: Driver) => {
    setEditingDriver(driver);
    setName(driver.name);
    setContact(driver.contact);
    setLicensePlate(driver.license_plate || "");
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setName("");
    setContact("");
    setLicensePlate("");
  };

  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.contact.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.license_plate?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Drivers Management</h1>
          <p className="text-muted-foreground">Register and manage logistics personnel for shop dispatches.</p>
        </div>
        <Button onClick={openAddDialog} className="shadow-lg">
          <Plus className="mr-2 h-4 w-4" /> Register Driver
        </Button>
      </div>

      <div className="flex items-center space-x-2 bg-card p-4 rounded-lg border">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search by name, contact, or license plate..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md border-none focus-visible:ring-0"
        />
      </div>

      <Card className="border-none shadow-md overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="w-[300px]">Driver Details</TableHead>
                <TableHead>Contact Info</TableHead>
                <TableHead>License Plate</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    Loading drivers...
                  </TableCell>
                </TableRow>
              ) : filteredDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    No drivers found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDrivers.map((driver) => (
                  <TableRow key={driver.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-2 rounded-full">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <span className="font-medium">{driver.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        {driver.contact}
                      </div>
                    </TableCell>
                    <TableCell>
                      {driver.license_plate ? (
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-3 w-3 text-muted-foreground" />
                          <span className="bg-secondary/50 px-2 py-0.5 rounded text-xs">
                            {driver.license_plate}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm italic">Not provided</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(driver)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(driver.id)}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{editingDriver ? "Edit Driver" : "Register New Driver"}</DialogTitle>
              <DialogDescription>
                Enter the driver's details below. Name and contact are required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="employee">Link to Employee</Label>
                <select 
                  id="employee"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedEmployeeId}
                  onChange={(e) => handleEmployeeChange(e.target.value)}
                >
                  <option value="">-- Select Employee (Optional) --</option>
                  {employees.map(emp => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.name} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Abebe Bikila"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact">Contact Number</Label>
                <Input
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. +251 911 223344"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="vehicleType">Vehicle Type</Label>
                <select 
                  id="vehicleType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={vehicleType}
                  onChange={(e) => setVehicleType(e.target.value as any)}
                >
                  <option value="motorbike">Motorbike</option>
                  <option value="car">Car</option>
                  <option value="van">Van</option>
                  <option value="truck">Truck</option>
                </select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="license">License Plate (Optional)</Label>
                <Input
                  id="license"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  placeholder="e.g. AA 2-12345"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingDriver ? "Update Driver" : "Register Driver"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
