
"use client";

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Download
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
  const { toast } = useToast();

  // Form States
  const [enrollForm, setEnrollForm] = useState({
    employeeId: '',
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [modRes, examRes, progRes, resRes, empRes] = await Promise.all([
        fetch('/api/hr/training?type=modules'),
        fetch('/api/hr/exams?type=exams'),
        fetch('/api/hr/training?type=progress'),
        fetch('/api/hr/exams?type=results'),
        fetch('/api/hr/employees')
      ]);

      if (modRes.ok) setModules(await modRes.json());
      if (examRes.ok) setExams(await examRes.json());
      if (progRes.ok) setTrainingProgress(await progRes.json());
      if (resRes.ok) setExamResults(await resRes.json());
      if (empRes.ok) setEmployees(await empRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
                  <label className="text-sm font-medium">Employee</label>
                  <Select onValueChange={(v) => setEnrollForm({...enrollForm, employeeId: v})}>
                    <SelectTrigger><SelectValue placeholder="Select Employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.map(e => <SelectItem key={e.employeeId} value={e.employeeId}>{e.name} ({e.employeeId})</SelectItem>)}
                    </SelectContent>
                  </Select>
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

      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="grid w-full grid-cols-4 rounded-xl bg-secondary/50 p-1">
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
