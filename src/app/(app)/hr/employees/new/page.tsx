
"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-context';
import { 
  User, 
  Briefcase, 
  History, 
  ShieldCheck, 
  ArrowLeft, 
  Save, 
  Loader2, 
  Camera,
  Target,
  PlusCircle
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import Link from 'next/link';



export default function NewEmployeePage() {
  const { token } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("personal");
  const [jobCenters, setJobCenters] = useState<string[]>([]);
  const [isNewCenterDialogOpen, setIsNewCenterDialogOpen] = useState(false);
  const [newCenterName, setNewCenterName] = useState("");


  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    phone: '',
    address: '',
    profilePicture: '',
    jobCenter: 'Sewing machine operator',
    joinedDate: new Date().toISOString().split('T')[0],
    baseSalary: 0,
    status: 'Active',
    promotionTrack: '',
    trainingHistory: '',
    examHistory: '',
    pensionOptOut: false,
    loyaltyStatus: 'New',
    departmentId: undefined as number | undefined,
    managerId: '',
    skills: []
  });

  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  useState(() => {
    fetch('/api/hr/departments').then(res => res.json()).then(setDepartments);
    fetch('/api/hr/employees').then(res => res.json()).then(setEmployees);
    fetch('/api/hr/employees?nextId=true').then(res => res.json()).then(data => {
      setFormData(prev => ({ ...prev, employeeId: data.id }));
    });
    fetch('/api/hr/employees?jobCenters=true').then(res => res.json()).then(setJobCenters);
  });




  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: uploadFormData,
      });

      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, profilePicture: data.url }));
        toast({ title: "Success", description: "Image uploaded successfully" });
      } else {
        const err = await res.json();
        toast({ title: "Error", description: err.error || "Failed to upload image", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "Upload failed", variant: "destructive" });
    }
  };

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSelectChange = (name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };


  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async () => {
    if (!formData.employeeId || !formData.name) {
      toast({
        title: "Missing Information",
        description: "Employee ID and Name are required.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/hr/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Employee created successfully."
        });
        router.push('/hr/employees');
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to create employee");
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/hr">
            <Button variant="outline" size="icon" className="rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add New Employee</h1>
            <p className="text-muted-foreground">Onboard a new workforce member to the CAREMENT ecosystem.</p>
          </div>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={loading}
          className="rounded-full px-8 shadow-lg shadow-primary/20"
        >
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Register Employee
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-xl p-1 bg-secondary/50 backdrop-blur-md">
          <TabsTrigger value="personal" className="rounded-lg gap-2">
            <User className="h-4 w-4" /> Personal
          </TabsTrigger>
          <TabsTrigger value="employment" className="rounded-lg gap-2">
            <Briefcase className="h-4 w-4" /> Employment
          </TabsTrigger>
          <TabsTrigger value="skills" className="rounded-lg gap-2">
            <Target className="h-4 w-4" /> Skills & History
          </TabsTrigger>
          <TabsTrigger value="payroll" className="rounded-lg gap-2">
            <ShieldCheck className="h-4 w-4" /> Payroll & Legal
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="personal" className="space-y-6">
            <Card className="border-none shadow-xl bg-gradient-to-br from-card to-secondary/10">
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Core identity and contact details.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="employeeId">System ID / Clock Number</Label>
                  <Input 
                    id="employeeId" 
                    name="employeeId" 
                    placeholder="e.g., EMP-001" 
                    value={formData.employeeId}
                    onChange={handleChange}
                    className="bg-background/50 border-primary/20 focus:border-primary"
                  />
                  <p className="text-[10px] text-muted-foreground">Auto-generated. You can overwrite this for manual entry.</p>

                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    placeholder="Enter full name" 
                    value={formData.name}
                    onChange={handleChange}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input 
                    id="phone" 
                    name="phone" 
                    placeholder="+251 ..." 
                    value={formData.phone}
                    onChange={handleChange}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profilePicture">Profile Picture</Label>
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-background/50 border border-dashed border-primary/20">
                    <div className="h-20 w-20 rounded-full bg-secondary/50 flex items-center justify-center overflow-hidden border-2 border-primary/10">
                      {formData.profilePicture ? (
                        <img src={formData.profilePicture} alt="Preview" className="h-full w-full object-cover" />
                      ) : (
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <Input 
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileUpload}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full gap-2"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera className="h-4 w-4" />
                        {formData.profilePicture ? "Change Photo" : "Upload Photo"}
                      </Button>
                      <p className="text-[10px] text-muted-foreground uppercase text-center">Allowed: JPG, PNG, GIF</p>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address">Residential Address</Label>
                  <Textarea 
                    id="address" 
                    name="address" 
                    placeholder="Full street address, City, Country" 
                    value={formData.address}
                    onChange={handleChange}
                    className="bg-background/50 min-h-[100px]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employment" className="space-y-6">
            <Card className="border-none shadow-xl bg-gradient-to-br from-card to-secondary/10">
              <CardHeader>
                <CardTitle>Employment Details</CardTitle>
                <CardDescription>Job center, salary, and status.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="jobCenter">Job Center / Designation</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={formData.jobCenter} 
                      onValueChange={(val) => {
                        if (val === 'ADD_NEW') {
                          setIsNewCenterDialogOpen(true);
                        } else {
                          handleSelectChange('jobCenter', val);
                        }
                      }}
                    >
                      <SelectTrigger className="bg-background/50 flex-1">
                        <SelectValue placeholder="Select job center" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobCenters.map(center => (
                          <SelectItem key={center} value={center}>{center}</SelectItem>
                        ))}
                        <div className="border-t my-1" />
                        <SelectItem value="ADD_NEW" className="text-primary font-bold">
                          <PlusCircle className="mr-2 h-4 w-4 inline" /> Add New Designation
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="departmentId">Department</Label>
                  <Select 
                    value={formData.departmentId?.toString() || ""} 
                    onValueChange={(val) => handleSelectChange('departmentId', val === "" ? undefined : parseInt(val))}
                  >

                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map(dept => (
                        <SelectItem key={dept.id} value={dept.id.toString()}>{dept.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="managerId">Reporting Manager</Label>
                  <Select 
                    value={formData.managerId} 
                    onValueChange={(val) => handleSelectChange('managerId', val)}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select manager" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Manager (Top Level)</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.employeeId} value={emp.employeeId}>{emp.name} ({emp.employeeId})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="joinedDate">Date of Joining</Label>
                  <Input 
                    id="joinedDate" 
                    name="joinedDate" 
                    type="date" 
                    value={formData.joinedDate}
                    onChange={handleChange}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseSalary">Monthly Base Salary (Br)</Label>
                  <Input 
                    id="baseSalary" 
                    name="baseSalary" 
                    type="number" 
                    placeholder="0.00" 
                    value={formData.baseSalary}
                    onChange={handleChange}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Employment Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(val) => handleSelectChange('status', val)}
                  >
                    <SelectTrigger className="bg-background/50">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Inactive">Inactive</SelectItem>
                      <SelectItem value="On Leave">On Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skills" className="space-y-6">
            <Card className="border-none shadow-xl bg-gradient-to-br from-card to-secondary/10">
              <CardHeader>
                <CardTitle>Skill Matrix & Performance History</CardTitle>
                <CardDescription>Historical data for training and promotions.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="promotionTrack">Promotion & Advancement Track</Label>
                  <Textarea 
                    id="promotionTrack" 
                    name="promotionTrack" 
                    placeholder="e.g., Junior -> Senior (2025), Certified Trainer (2026)" 
                    value={formData.promotionTrack}
                    onChange={handleChange}
                    className="bg-background/50 min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trainingHistory">Training Modules Completed</Label>
                  <Textarea 
                    id="trainingHistory" 
                    name="trainingHistory" 
                    placeholder="e.g., Lean Manufacturing 101, Advanced Overlock Techniques" 
                    value={formData.trainingHistory}
                    onChange={handleChange}
                    className="bg-background/50 min-h-[80px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="examHistory">Internal Exam Performance</Label>
                  <Textarea 
                    id="examHistory" 
                    name="examHistory" 
                    placeholder="e.g., Q1 Technical Exam: 94%, Safety Certification: Passed" 
                    value={formData.examHistory}
                    onChange={handleChange}
                    className="bg-background/50 min-h-[80px]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payroll" className="space-y-6">
            <Card className="border-none shadow-xl bg-gradient-to-br from-card to-secondary/10">
              <CardHeader>
                <CardTitle>Payroll & Statutory Compliance</CardTitle>
                <CardDescription>Pension and tax configurations.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-xl bg-background/50 border border-primary/10">
                  <div className="space-y-0.5">
                    <Label className="text-base">Pension Participation</Label>
                    <p className="text-sm text-muted-foreground">Enable the 7% employee contribution scheme.</p>
                  </div>
                  <Switch 
                    checked={!formData.pensionOptOut} 
                    onCheckedChange={(checked) => handleSwitchChange('pensionOptOut', !checked)} 
                  />
                </div>
                
                <div className="grid gap-6 md:grid-cols-2">
                   <div className="space-y-2">
                    <Label htmlFor="loyaltyStatus">Loyalty Tier</Label>
                    <Select 
                      value={formData.loyaltyStatus} 
                      onValueChange={(val) => handleSelectChange('loyaltyStatus', val)}
                    >
                      <SelectTrigger className="bg-background/50">
                        <SelectValue placeholder="Select tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="New">New Member</SelectItem>
                        <SelectItem value="Good">Good Standing</SelectItem>
                        <SelectItem value="Silver">Silver Tier (2+ Years)</SelectItem>
                        <SelectItem value="Gold">Gold Tier (5+ Years)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-sm text-blue-600">
                   <strong>Note:</strong> Gross salary calculations include base salary, overtime (1.5x), and monthly incentive piece-rates.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      <CardFooter className="flex justify-center border-t pt-10">
         <div className="flex gap-4">
             <Button variant="ghost" onClick={() => router.push('/hr')}>Cancel</Button>
             <Button 
              onClick={handleSubmit} 
              disabled={loading}
              className="px-10 rounded-full"
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Finalize Registration"}
            </Button>
         </div>
      </CardFooter>
      <Dialog open={isNewCenterDialogOpen} onOpenChange={setIsNewCenterDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Designation</DialogTitle>
            <DialogDescription>
              Enter the name of the new Job Center/Designation to add it to the factory registry.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="e.g., Quality Inspector" 
              value={newCenterName} 
              onChange={(e) => setNewCenterName(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewCenterDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => {
              if (newCenterName.trim()) {
                setJobCenters(prev => Array.from(new Set([...prev, newCenterName.trim()])));
                handleSelectChange('jobCenter', newCenterName.trim());
                setNewCenterName("");
                setIsNewCenterDialogOpen(false);
              }
            }}>Add Designation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
