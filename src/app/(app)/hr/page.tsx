"use client";

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  BarChart3, 
  ArrowRight, 
  Calendar, 
  Award,
  Banknote,
  Trophy,
  ShieldCheck,
  GraduationCap,
  UserPlus,
  Target,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function HRPage() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeOperators: 0,
    avgIncentive: 0,
    topPerformer: 'N/A'
  });

  useEffect(() => {
    // Fetch stats
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/hr/employees');
        if (res.ok) {
          const employees = await res.json();
          setStats(prev => ({
            ...prev,
            totalEmployees: employees.length,
            activeOperators: employees.filter((e: any) => e.jobCenter === 'Sewing machine operator').length
          }));
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            HR & Incentives
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Manage your workforce, skills matrix, and performance-based incentives.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/hr/employees/new">
            <Button className="rounded-full shadow-lg hover:shadow-primary/20 transition-all">
              <UserPlus className="mr-2 h-4 w-4" /> Add Employee
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="Total Employees" 
          value={stats.totalEmployees} 
          icon={<Users className="h-5 w-5" />} 
          color="blue"
          description="Total workforce size"
        />
        <StatsCard 
          title="Active Operators" 
          value={stats.activeOperators} 
          icon={<Target className="h-5 w-5" />} 
          color="green"
          description="Sewing machine operators"
        />
        <StatsCard 
          title="Avg. Incentive" 
          value={`${stats.avgIncentive} Br`} 
          icon={<Banknote className="h-5 w-5" />} 
          color="purple"
          description="Current month average"
        />
        <StatsCard 
          title="Top Performer" 
          value={stats.topPerformer} 
          icon={<Award className="h-5 w-5" />} 
          color="orange"
          description="Highest efficiency"
        />
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <MenuCard 
          title="Employee Directory"
          description="View and manage employee profiles, job centers, and contact info."
          icon={<Users className="h-8 w-8 text-blue-500" />}
          href="/hr/employees"
          badge="Management"
        />
        <MenuCard 
          title="Skill Matrix"
          description="Track operator skills across multiple operations and departments."
          icon={<Target className="h-8 w-8 text-green-500" />}
          href="/hr/skills"
          badge="Performance"
        />
        <MenuCard 
          title="Payroll & Ledger" 
          description="Manage monthly salaries, statutory tax, and bank exports." 
          icon={<Banknote className="h-8 w-8 text-yellow-500" />}
          href="/hr/payroll"
          badge="Finance"
        />
        <MenuCard 
          title="Incentive Review" 
          description="Review performance-based bonuses and piece-rate tiers." 
          icon={<Trophy className="h-8 w-8 text-purple-500" />}
          href="/hr/incentives"
          badge="Performance"
        />
        <MenuCard 
          title="Leave Management" 
          description="Track annual, sick, and unpaid leaves. Automate salary deductions." 
          icon={<Calendar className="h-8 w-8 text-orange-500" />}
          href="/hr/leaves"
          badge="Operations"
        />
        <MenuCard 
          title="Training & Exams" 
          description="Track exam history, promotions, and skill development." 
          icon={<GraduationCap className="h-8 w-8 text-blue-500" />}
          href="/hr/training"
          badge="Development"
        />
      </div>

      <Card className="border-none shadow-xl bg-gradient-to-br from-card to-secondary/20 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10 blur-2xl pointer-events-none">
          <TrendingUp className="h-64 w-64" />
        </div>
        <CardHeader>
          <CardTitle className="text-2xl">Production Efficiency Overview</CardTitle>
          <CardDescription>Real-time performance metrics for the factory floor</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center border-2 border-dashed rounded-xl">
             <p className="text-muted-foreground italic">Efficiency chart placeholder - Data connection pending</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({ title, value, icon, color, description }: any) {
  const colors: any = {
    blue: "bg-blue-500/10 text-blue-500",
    green: "bg-green-500/10 text-green-500",
    purple: "bg-purple-500/10 text-purple-500",
    orange: "bg-orange-500/10 text-orange-500",
  };

  return (
    <Card className="border-none shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`p-3 rounded-2xl ${colors[color]} group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <h2 className="text-3xl font-bold tracking-tight mt-1">{value}</h2>
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MenuCard({ title, description, icon, href, badge }: any) {
  return (
    <Link href={href}>
      <Card className="h-full border border-border/50 shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all duration-300 group cursor-pointer relative overflow-hidden bg-card/50 backdrop-blur-sm">
        <div className="absolute top-0 left-0 w-1 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="p-3 rounded-xl bg-secondary/50 group-hover:bg-primary/10 group-hover:scale-110 transition-all">
              {icon}
            </div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{badge}</Badge>
          </div>
          <CardTitle className="text-xl mt-4 group-hover:text-primary transition-colors">{title}</CardTitle>
          <CardDescription className="text-sm leading-relaxed mt-2">{description}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  );
}
