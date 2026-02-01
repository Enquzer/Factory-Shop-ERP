import { Plus, Search, Filter, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { getStyles } from '@/lib/styles-sqlite';
import { StyleCard } from '@/components/designer/StyleCard';

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
