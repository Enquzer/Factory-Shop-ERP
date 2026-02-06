
"use client";

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  GraduationCap, 
  BookOpen, 
  Award, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  User, 
  FileCheck,
  Trophy,
  AlertCircle,
  Download,
  CalendarDays,
  MapPin,
  Users
} from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { exportCertificateToPDF, exportTrainingCertificateToPDF } from '@/lib/pdf-export-utils';

export default function TrainingExamsPage() {
  const [modules, setModules] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [trainingProgress, setTrainingProgress] = useState<any[]>([]);
  const [examResults, setExamResults] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  
  // New States for Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [isCreateModuleModalOpen, setIsCreateModuleModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [sessionAttendees, setSessionAttendees] = useState<any[]>([]);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);

  const { toast } = useToast();

  // Form States
  const [enrollForm, setEnrollForm] = useState({
    employeeIds: [] as string[],
    moduleId: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    instructor: ''
  });

  const [examForm, setExamForm] = useState({
    employeeId: '',
    examId: '',
    examDate: format(new Date(), 'yyyy-MM-dd'),
    score: 0,
    certificateUrl: ''
  });

  const [sessionForm, setSessionForm] = useState({
    moduleId: '',
    startDateTime: '',
    endDateTime: '',
    location: 'Training Room A',
    instructor: '',
    capacity: 20
  });

  const [newModuleForm, setNewModuleForm] = useState({
    title: '',
    description: '',
    department: 'General',
    durationDays: 1,
    category: 'Technical'
  });


  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [modRes, examRes, progRes, resRes, empRes, sessionsRes] = await Promise.all([
        fetch('/api/hr/training?type=modules'),
        fetch('/api/hr/exams?type=exams'),
        fetch('/api/hr/training?type=progress'),
        fetch('/api/hr/exams?type=results'),
        fetch('/api/hr/employees'),
        fetch('/api/hr/training/sessions')
      ]);

      if (modRes.ok) setModules(await modRes.json());
      if (examRes.ok) setExams(await examRes.json());
      if (progRes.ok) setTrainingProgress(await progRes.json());
      if (resRes.ok) setExamResults(await resRes.json());
      if (empRes.ok) setEmployees(await empRes.json());
      if (sessionsRes.ok) setSessions(await sessionsRes.json());

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionAttendees = async (sessionId: number) => {
    const res = await fetch(`/api/hr/training/sessions?id=${sessionId}`);
    if (res.ok) setSessionAttendees(await res.json());
  };

  const handleCreateModule = async () => {
    try {
      const res = await fetch('/api/hr/training/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newModuleForm)
      });
      if (res.ok) {
        toast({ title: "Success", description: "New Training Module Created" });
        setIsCreateModuleModalOpen(false);
        fetchData();
      }
    } catch (err) {
      toast({ title: "Error", variant: "destructive", description: "Failed to create module" });
    }
  };

  const handleCreateSession = async () => {
    try {
      const res = await fetch('/api/hr/training/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionForm)
      });
      if (res.ok) {
        toast({ title: "Success", description: "Training Session Scheduled" });
        setIsSessionModalOpen(false);
        fetchData();
      }
    } catch (err) {
      toast({ title: "Error", variant: "destructive", description: "Failed to schedule session" });
    }
  };

  const handeRegisterAttendee = async (employeeId: string) => {
    if (!selectedSession) return;
    try {
      const res = await fetch('/api/hr/training/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'register_attendee', sessionId: selectedSession.id, employeeId })
      });
      if (res.ok) {
         toast({ title: "Registered", description: "Employee added to session" });
         fetchSessionAttendees(selectedSession.id);
      }
    } catch (err) {
       toast({ title: "Error", variant: "destructive", description: "Failed to register" });
    }
  };

  const handleMarkAttendance = async (id: number, status: string) => {
    try {
      const res = await fetch('/api/hr/training/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'mark_attendance', id, status, remarks: '' })
      }); 
      if (res.ok) {
        if (selectedSession) fetchSessionAttendees(selectedSession.id);
      }
    } catch(err) {
        console.error(err);
    }
  };

  const handleEnroll = async () => {
    try {
      const res = await fetch('/api/hr/training', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrollForm)
      });
      if (res.ok) {
        toast({ title: "Success", description: "Employee enrolled in training" });
        setIsEnrollModalOpen(false);
        fetchData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Enrollment failed", variant: "destructive" });
    }
  };

  const handleRecordExam = async () => {
    try {
      const res = await fetch('/api/hr/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examForm)
      });
      if (res.ok) {
        toast({ title: "Success", description: "Exam result recorded" });
        setIsExamModalOpen(false);
        fetchData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Failed to record result", variant: "destructive" });
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      const res = await fetch('/api/hr/training', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          status, 
          completionDate: status === 'Completed' ? format(new Date(), 'yyyy-MM-dd') : null 
        })
      });
      if (res.ok) {
        toast({ title: "Updated", description: `Status changed to ${status}` });
        fetchData();
      }
    } catch (err) {
      toast({ title: "Error", description: "Update failed", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Training & Certifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Upskill your workforce and manage formal certifications.
          </p>
        </div>
        
        <div className="flex gap-2">
          {/* Create Module Dialog */}
          <Dialog open={isCreateModuleModalOpen} onOpenChange={setIsCreateModuleModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full shadow-lg gap-2">
                <Plus className="h-4 w-4" /> New Module
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Training Module</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input 
                    value={newModuleForm.title}
                    onChange={(e) => setNewModuleForm({...newModuleForm, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <Input 
                    value={newModuleForm.description}
                    onChange={(e) => setNewModuleForm({...newModuleForm, description: e.target.value})}
                  />
                </div>
                <div className="flex gap-4">
                  <div className="space-y-2 flex-1">
                    <label className="text-sm font-medium">Department</label>
                    <Select onValueChange={(v) => setNewModuleForm({...newModuleForm, department: v})} defaultValue={newModuleForm.department}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="General">General</SelectItem>
                          <SelectItem value="Production">Production</SelectItem>
                          <SelectItem value="HR">HR</SelectItem>
                          <SelectItem value="Sewing">Sewing</SelectItem>
                          <SelectItem value="Safety">Safety</SelectItem>
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 flex-1">
                    <label className="text-sm font-medium">Duration (Days)</label>
                    <Input 
                      type="number"
                      value={newModuleForm.durationDays}
                      onChange={(e) => setNewModuleForm({...newModuleForm, durationDays: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateModuleModalOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateModule}>Create Module</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Schedule Session Dialog */}
          <Dialog open={isSessionModalOpen} onOpenChange={setIsSessionModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-full shadow-lg gap-2">
                <CalendarDays className="h-4 w-4" /> Schedule Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule Training Session</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Module</label>
                  <Select onValueChange={(v) => setSessionForm({...sessionForm, moduleId: v})}>
                    <SelectTrigger><SelectValue placeholder="Select Module" /></SelectTrigger>
                    <SelectContent>
                      {modules.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-4">
                  <div className="space-y-2 flex-1">
                    <label className="text-sm font-medium">Start Date & Time</label>
                    <Input 
                      type="datetime-local"
                      value={sessionForm.startDateTime}
                      onChange={(e) => setSessionForm({...sessionForm, startDateTime: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <label className="text-sm font-medium">End Date & Time</label>
                    <Input 
                      type="datetime-local"
                      value={sessionForm.endDateTime}
                      onChange={(e) => setSessionForm({...sessionForm, endDateTime: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Input 
                    value={sessionForm.location}
                    onChange={(e) => setSessionForm({...sessionForm, location: e.target.value})}
                  />
                </div>
                <div className="flex gap-4">
                   <div className="space-y-2 flex-1">
                    <label className="text-sm font-medium">Instructor</label>
                    <Input 
                        value={sessionForm.instructor}
                        onChange={(e) => setSessionForm({...sessionForm, instructor: e.target.value})}
                    />
                   </div>
                   <div className="space-y-2 flex-1">
                    <label className="text-sm font-medium">Capacity</label>
                    <Input 
                        type="number"
                        value={sessionForm.capacity}
                        onChange={(e) => setSessionForm({...sessionForm, capacity: parseInt(e.target.value)})}
                    />
                   </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSessionModalOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateSession}>Schedule Session</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={isEnrollModalOpen} onOpenChange={setIsEnrollModalOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-full shadow-lg gap-2">
                <Plus className="h-4 w-4" /> Enroll in Training
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enroll Employee in Module</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Employees (Select Multiple)</label>
                  <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                    {employees.map(e => (
                      <div key={e.employeeId} className="flex items-center space-x-2">
                        <Checkbox 
                          id={`emp-${e.employeeId}`}
                          checked={enrollForm.employeeIds.includes(e.employeeId)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setEnrollForm({...enrollForm, employeeIds: [...enrollForm.employeeIds, e.employeeId]});
                            } else {
                              setEnrollForm({...enrollForm, employeeIds: enrollForm.employeeIds.filter(id => id !== e.employeeId)});
                            }
                          }}
                        />
                        <label htmlFor={`emp-${e.employeeId}`} className="text-sm cursor-pointer">
                          {e.name} ({e.employeeId})
                        </label>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{enrollForm.employeeIds.length} employee(s) selected</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Module</label>
                  <Select onValueChange={(v) => setEnrollForm({...enrollForm, moduleId: v})}>
                    <SelectTrigger><SelectValue placeholder="Select Module" /></SelectTrigger>
                    <SelectContent>
                      {modules.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Instructor / Source</label>
                  <Input 
                    placeholder="e.g. Internal Training Team" 
                    value={enrollForm.instructor}
                    onChange={(e) => setEnrollForm({...enrollForm, instructor: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsEnrollModalOpen(false)}>Cancel</Button>
                <Button onClick={handleEnroll}>Start Training</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isExamModalOpen} onOpenChange={setIsExamModalOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" className="rounded-full shadow-lg gap-2">
                <FileCheck className="h-4 w-4" /> Record Exam Score
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Record Exam Result</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Employee</label>
                  <Select onValueChange={(v) => setExamForm({...examForm, employeeId: v})}>
                    <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.map(e => <SelectItem key={e.employeeId} value={e.employeeId}>{e.name} ({e.employeeId})</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Exam</label>
                  <Select onValueChange={(v) => setExamForm({...examForm, examId: v})}>
                    <SelectTrigger><SelectValue placeholder="Select Exam" /></SelectTrigger>
                    <SelectContent>
                      {exams.map(ex => <SelectItem key={ex.id} value={ex.id.toString()}>{ex.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Score (%)</label>
                  <Input 
                    type="number" 
                    value={examForm.score}
                    onChange={(e) => setExamForm({...examForm, score: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsExamModalOpen(false)}>Cancel</Button>
                <Button onClick={handleRecordExam}>Record Result</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="grid w-full grid-cols-5 rounded-xl bg-secondary/50 p-1">
          <TabsTrigger value="sessions" className="gap-2"><CalendarDays className="h-4 w-4" /> Sessions</TabsTrigger>
          <TabsTrigger value="progress" className="gap-2"><Clock className="h-4 w-4" /> Training Progress</TabsTrigger>
          <TabsTrigger value="exams" className="gap-2"><Trophy className="h-4 w-4" /> Exam Results</TabsTrigger>
          <TabsTrigger value="catalog" className="gap-2"><BookOpen className="h-4 w-4" /> Modules Catalog</TabsTrigger>
          <TabsTrigger value="certifications" className="gap-2"><Award className="h-4 w-4" /> Legal Certs</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="mt-6">
          <Card className="border-none shadow-xl bg-card/40 backdrop-blur-md">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-secondary/10">
                  <TableRow>
                    <TableHead className="pl-6">Employee</TableHead>
                    <TableHead>Training Module</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead className="text-right pr-6">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trainingProgress.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="pl-6 font-medium">{p.employeeName}</TableCell>
                      <TableCell>{p.moduleTitle}</TableCell>
                      <TableCell><Badge variant="outline">{p.category}</Badge></TableCell>
                      <TableCell>
                        <Badge variant={p.status === 'Completed' ? 'default' : 'secondary'} className={p.status === 'Completed' ? 'bg-green-500' : ''}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.startDate}</TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex justify-end gap-2">
                          {p.status === 'Completed' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-green-600 gap-1"
                              onClick={() => exportTrainingCertificateToPDF(p)}
                            >
                              <Download className="h-4 w-4" /> Cert
                            </Button>
                          )}
                          {p.status !== 'Completed' ? (
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => updateStatus(p.id, 'Completed')}>Mark Done</Button>
                              <Button variant="ghost" size="sm" className="text-red-500" onClick={() => updateStatus(p.id, 'Failed')}>Fail</Button>
                            </div>
                          ) : (
                            <Badge variant="default" className="bg-green-500">Completed</Badge>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exams" className="mt-6">
          <Card className="border-none shadow-xl">
             <CardContent className="p-0">
               <Table>
                 <TableHeader className="bg-secondary/10">
                   <TableRow>
                     <TableHead className="pl-6">Employee</TableHead>
                     <TableHead>Exam / Certification</TableHead>
                     <TableHead>Score</TableHead>
                     <TableHead>Result</TableHead>
                     <TableHead>Date</TableHead>
                     <TableHead className="text-right pr-6">Expiry</TableHead>
                   </TableRow>
                 </TableHeader>
                 <TableBody>
                   {examResults.map((r) => (
                     <TableRow key={r.id}>
                       <TableCell className="pl-6 font-medium">{r.employeeName}</TableCell>
                       <TableCell>{r.examTitle}</TableCell>
                       <TableCell>
                         <div className="flex items-center gap-2">
                            <div className="w-12 bg-secondary rounded-full h-1.5">
                              <div className={`h-full rounded-full ${r.result === 'Pass' ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${Math.min(r.score, 100)}%` }} />
                            </div>
                            <span className="text-xs">{r.score}%</span>
                         </div>
                       </TableCell>
                       <TableCell>
                         <Badge variant={r.result === 'Pass' ? 'default' : 'destructive'} className={r.result === 'Pass' ? 'bg-green-500' : ''}>
                           {r.result}
                         </Badge>
                       </TableCell>
                       <TableCell className="text-xs">{r.examDate}</TableCell>
                       <TableCell className="text-right pr-6">
                          <div className="flex justify-end gap-2">
                            {r.result === 'Pass' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-blue-500 gap-1"
                                onClick={() => exportCertificateToPDF(r)}
                              >
                                <Download className="h-4 w-4" /> Cert
                              </Button>
                            )}
                            {r.expiryDate ? (
                              <div className="flex items-center gap-1 text-[10px] text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded-md">
                                <AlertCircle className="h-3 w-3" /> {r.expiryDate}
                              </div>
                            ) : null}
                          </div>
                       </TableCell>
                     </TableRow>
                   ))}
                 </TableBody>
               </Table>
             </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="mt-6">
          <div className="grid gap-6">
            {sessions.map((session) => (
              <Card key={session.id} className="border-none shadow-md overflow-hidden hover:shadow-lg transition-all">
                <CardContent className="p-0 flex flex-col md:flex-row">
                   <div className="bg-primary/5 p-6 flex flex-col justify-center items-center w-full md:w-32 border-r border-border/50">
                      <div className="text-2xl font-bold text-primary">{format(new Date(session.startDateTime), 'dd')}</div>
                      <div className="text-sm uppercase tracking-wider text-muted-foreground">{format(new Date(session.startDateTime), 'MMM')}</div>
                      <div className="text-xs text-muted-foreground mt-1">{format(new Date(session.startDateTime), 'HH:mm')}</div>
                   </div>
                   <div className="p-6 flex-1">
                      <div className="flex justify-between items-start">
                         <div>
                            <h3 className="text-lg font-bold">{session.moduleTitle}</h3>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                               <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {session.location}</div>
                               <div className="flex items-center gap-1"><User className="h-3 w-3" /> {session.instructor}</div>
                               <div className="flex items-center gap-1"><Clock className="h-3 w-3" /> {session.durationDays} Days</div>
                            </div>
                         </div>
                         <Badge variant={session.status === 'Scheduled' ? 'secondary' : 'default'}>{session.status}</Badge>
                      </div>
                      
                      <div className="mt-6 flex items-center justify-between">
                         <div className="flex -space-x-2">
                            {/* Avatars placeholder */}
                            <div className="h-8 w-8 rounded-full bg-slate-200 border-2 border-background flex items-center justify-center text-[10px] font-bold">JD</div>
                            <div className="h-8 w-8 rounded-full bg-slate-300 border-2 border-background flex items-center justify-center text-[10px] font-bold">+5</div>
                         </div>
                         <Dialog>
                            <DialogTrigger asChild>
                               <Button variant="outline" size="sm" onClick={() => { setSelectedSession(session); fetchSessionAttendees(session.id); }}>
                                  Manage Attendees
                               </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                               <DialogHeader>
                                  <DialogTitle>Session Attendees - {session.moduleTitle}</DialogTitle>
                               </DialogHeader>
                               <div className="space-y-6">
                                  <div className="flex gap-2 items-center bg-muted/30 p-4 rounded-lg">
                                     <User className="h-4 w-4 text-muted-foreground" />
                                     <Select onValueChange={(v) => handeRegisterAttendee(v)}>
                                        <SelectTrigger className="w-[300px] border-none bg-transparent shadow-none"><SelectValue placeholder="Add attendee..." /></SelectTrigger>
                                        <SelectContent>
                                           {employees.map(e => <SelectItem key={e.employeeId} value={e.employeeId}>{e.name}</SelectItem>)}
                                        </SelectContent>
                                     </Select>
                                     <Button size="sm" variant="ghost">Add</Button>
                                  </div>

                                  <Table>
                                     <TableHeader>
                                        <TableRow>
                                           <TableHead>Employee</TableHead>
                                           <TableHead>Status</TableHead>
                                           <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                     </TableHeader>
                                     <TableBody>
                                        {sessionAttendees.map(att => (
                                           <TableRow key={att.id}>
                                              <TableCell className="font-medium">{att.employeeName}</TableCell>
                                              <TableCell>
                                                 <Badge variant={att.status === 'Attended' ? 'default' : 'secondary'} className={att.status === 'Attended' ? 'bg-green-500' : ''}>
                                                    {att.status}
                                                 </Badge>
                                              </TableCell>
                                              <TableCell className="text-right">
                                                 {att.status !== 'Attended' && (
                                                    <Button size="sm" variant="ghost" className="text-green-600 h-6" onClick={() => handleMarkAttendance(att.id, 'Attended')}>
                                                       Mark Present
                                                    </Button>
                                                 )}
                                              </TableCell>
                                           </TableRow>
                                        ))}
                                        {sessionAttendees.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground">No attendees registered yet.</TableCell></TableRow>}
                                     </TableBody>
                                  </Table>
                               </div>
                            </DialogContent>
                         </Dialog>
                      </div>
                   </div>
                </CardContent>
              </Card>
            ))}
            {sessions.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                    <CalendarDays className="h-12 w-12 mx-auto opacity-20 mb-4" />
                    <p>No training sessions scheduled.</p>
                    <Button variant="link" onClick={() => setIsSessionModalOpen(true)}>Schedule first session</Button>
                </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="catalog" className="mt-6">
          <div className="grid md:grid-cols-3 gap-6">
            {modules.map((m) => (
              <Card key={m.id} className="border-none shadow-lg hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <Badge className="bg-blue-500">{m.category}</Badge>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">{m.department}</span>
                  </div>
                  <CardTitle className="mt-4">{m.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">{m.description}</p>
                  <div className="flex items-center gap-2 mt-4 text-xs font-medium text-indigo-600">
                    <Clock className="h-4 w-4" /> {m.durationDays} Days Duration
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="certifications" className="mt-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {exams.filter(e => e.examType === 'Certification').map((ex) => (
              <div key={ex.id} className="flex items-center justify-between p-6 bg-card rounded-2xl shadow-md border border-primary/5">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-yellow-500/10 rounded-xl">
                    <Award className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{ex.title}</h3>
                    <p className="text-sm text-muted-foreground">Passing Score: {ex.passingScore}% • Recertification: every {ex.validityMonths} months</p>
                  </div>
                </div>
                <Button variant="outline" className="rounded-full">View Standards</Button>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
