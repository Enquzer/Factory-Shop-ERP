
"use client";

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Loader2, Check, UserPlus, Cpu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Employee, OperationRate } from '@/lib/hr';
import { useToast } from '@/hooks/use-toast';

interface OperatorAssignmentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  operationCode: string;
  operationName: string;
  componentName?: string;
  onAssigned?: (employeeId: string) => void;
}

export function OperatorAssignmentSidebar({ 
  isOpen, 
  onClose, 
  orderId, 
  operationCode, 
  operationName,
  componentName,
  onAssigned 
}: OperatorAssignmentSidebarProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, operationName]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [empRes, sugRes] = await Promise.all([
        fetch('/api/hr/employees'),
        fetch(`/api/hr/suggestions?operation=${encodeURIComponent(operationName)}`)
      ]);
      
      if (empRes.ok) {
        const data = await empRes.json();
        setEmployees(data.filter((e: any) => e.jobCenter === 'Sewing machine operator'));
      }
      
      if (sugRes.ok) {
        const sugData = await sugRes.json();
        setSuggestions(sugData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedId) return;
    setAssigning(true);
    try {
      const res = await fetch('/api/hr/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: selectedId,
          orderId,
          opCode: operationCode,
          componentName,
          machineId: 'M-001' // Placeholder or could be selected
        })
      });

      if (res.ok) {
        toast({
          title: "Operator Assigned",
          description: `Successfully assigned to ${operationName}`,
        });
        onAssigned?.(selectedId);
        onClose();
      } else {
        throw new Error('Failed to assign');
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to assign operator",
        variant: "destructive"
      });
    } finally {
      setAssigning(false);
    }
  };

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase()) || 
    e.employeeId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[400px] sm:w-[540px] flex flex-col p-0 border-none shadow-2xl">
        <SheetHeader className="p-6 bg-gradient-to-br from-primary/10 to-transparent border-b">
          <SheetTitle className="text-xl flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Assign Operator
          </SheetTitle>
          <SheetDescription>
            Select an operator for <span className="font-bold text-foreground">"{operationName}"</span>
          </SheetDescription>
        </SheetHeader>

        <div className="p-4 border-b bg-secondary/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or ID..." 
              className="pl-10 rounded-xl bg-background border-none shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-2">
          <div className="p-4 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Analyzing workforce skills...</p>
              </div>
            ) : (
              <>
                {suggestions.length > 0 && !search && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary/70 px-1">
                      <Cpu className="h-3 w-3" /> AI Recommended Operators
                    </div>
                    {suggestions.map((emp) => (
                      <OperatorCard 
                        key={emp.employeeId} 
                        emp={emp} 
                        selectedId={selectedId} 
                        onSelect={setSelectedId}
                        isSuggested
                      />
                    ))}
                  </div>
                )}

                <div className="space-y-3">
                  <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 py-2">
                    {search ? `Searching for "${search}"` : "All Sewing Operators"}
                  </div>
                  {filteredEmployees.map((emp) => (
                    <OperatorCard 
                      key={emp.employeeId} 
                      emp={emp} 
                      selectedId={selectedId} 
                      onSelect={setSelectedId} 
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="p-6 border-t bg-secondary/5">
          <Button variant="outline" onClick={onClose} className="rounded-full">Cancel</Button>
          <Button 
            disabled={!selectedId || assigning} 
            onClick={handleAssign} 
            className="rounded-full px-8 shadow-lg shadow-primary/20"
          >
            {assigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              'Confirm Assignment'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function OperatorCard({ emp, selectedId, onSelect, isSuggested }: any) {
  return (
    <div 
      onClick={() => onSelect(emp.employeeId)}
      className={`flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all border-2 ${
        selectedId === emp.employeeId 
          ? 'border-primary bg-primary/5 shadow-md' 
          : isSuggested ? 'border-primary/20 bg-primary/5 hover:bg-primary/10' : 'border-transparent hover:bg-secondary/50'
      }`}
    >
      <Avatar className="h-12 w-12 border-2 border-background shadow-sm">
        <AvatarImage src={emp.profilePicture} />
        <AvatarFallback className="bg-primary/10 text-primary">
          {emp.name.split(' ').map((n: string) => n[0]).join('')}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold truncate">{emp.name}</span>
          {isSuggested && <Badge className="text-[8px] bg-primary/20 text-primary border-none h-4 px-1">Top Match</Badge>}
        </div>
        <div className="text-xs text-muted-foreground font-mono">ID: {emp.employeeId}</div>
        <div className="flex gap-2 mt-1">
          <Badge variant="outline" className="text-[10px] h-4 font-normal">
            Score: {emp.relevanceScore || 'N/A'}
          </Badge>
          <Badge variant="outline" className="text-[10px] h-4 font-normal">Level 4</Badge>
        </div>
      </div>
      {selectedId === emp.employeeId && (
        <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center animate-in zoom-in">
          <Check className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
