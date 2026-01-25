
import { Suspense } from 'react';
import Link from 'next/link';
import { Plus, Search, Filter, MoreHorizontal, Shirt, Palette, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getStyles, Style } from '@/lib/styles-sqlite';

export const metadata = {
  title: 'Designer - Style Management',
  description: 'Manage fashion styles and tech packs.',
};

export default async function DesignerPage() {
  const styles = await getStyles();

  return (
    <div className="flex flex-col h-full bg-slate-50 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Designer Studio</h1>
          <p className="text-slate-500 mt-1">Manage styles, tech packs, and samples.</p>
        </div>
        <div className="flex gap-2">
           <Link href="/designer/new">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all hover:scale-105 active:scale-95">
              <Plus className="mr-2 h-4 w-4" /> New Style
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
          <Input
            type="search"
            placeholder="Search styles by name or number..."
            className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
          />
        </div>
        <Button variant="outline" className="text-slate-600 border-slate-200 hover:bg-slate-50">
          <Filter className="mr-2 h-4 w-4" /> Filter
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {styles.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center p-12 text-center text-slate-500 bg-white rounded-xl border border-dashed border-slate-300">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Palette className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">No styles found</h3>
            <p className="mt-1 max-w-sm mx-auto">Get started by creating your first style design. You can manage BOMs, measurements, and tech packs here.</p>
            <Link href="/designer/new" className="mt-6">
                <Button>Create Style</Button>
            </Link>
          </div>
        ) : (
          styles.map((style) => (
            <StyleCard key={style.id} style={style} />
          ))
        )}
      </div>
    </div>
  );
}

function StyleCard({ style }: { style: Style }) {
  const statusColors: Record<string, string> = {
    'Development': 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    'Quotation': 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
    'Size Set': 'bg-purple-100 text-purple-700 hover:bg-purple-200',
    'Counter Sample': 'bg-orange-100 text-orange-700 hover:bg-orange-200',
  };

  return (
    <Card className="relative group overflow-hidden border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
        {style.imageUrl ? (
          <img 
            src={style.imageUrl} 
            alt={style.name} 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
            <Shirt className="h-12 w-12 mb-2 opacity-50" />
            <span className="text-xs font-medium uppercase tracking-wider">No Preview</span>
          </div>
        )}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
            <Badge className={cn("shadow-sm border-0 font-medium", statusColors[style.status] || 'bg-slate-100 text-slate-700')}>
                {style.status}
            </Badge>
            {style.sampleApproved && (
             <Badge className="bg-green-500 text-white shadow-sm border-0">Approved</Badge>
            )}
        </div>
      </div>
      
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start">
            <div>
                <CardTitle className="text-lg font-semibold text-slate-900 line-clamp-1" title={style.name}>
                    {style.name}
                </CardTitle>
                <div className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                    <span className="bg-slate-100 px-1.5 py-0.5 rounded text-xs">#{style.number}</span>
                    {style.season && <span className="text-slate-400">• {style.season}</span>}
                </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-400 hover:text-slate-700">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem>Edit Style</DropdownMenuItem>
                    <DropdownMenuItem>Download Tech Pack</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600">Delete</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </CardHeader>

      <CardFooter className="p-4 pt-2 border-t border-slate-50 bg-slate-50/50">
         <div className="w-full flex justify-between items-center text-xs text-slate-500">
            <span>Ver. {style.version}</span>
            <span>{style.updatedAt.toLocaleDateString()}</span>
         </div>
         <Link href={`/designer/${style.id}`} className="absolute inset-0 z-10" />
      </CardFooter>
    </Card>
  );
}

// Utility for class merging (assuming the project has one, commonly in lib/utils)
import { cn } from '@/lib/utils';
