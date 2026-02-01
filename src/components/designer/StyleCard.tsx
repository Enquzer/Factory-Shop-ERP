'use client';

import Link from 'next/link';
import { MoreHorizontal, Shirt, Scissors, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
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
import { Style } from '@/lib/styles-sqlite';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';

interface StyleCardProps {
  style: Style;
}

export function StyleCard({ style }: StyleCardProps) {
  const router = useRouter();
  const { user, token } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const statusColors: Record<string, string> = {
    'Development': 'bg-blue-100 text-blue-700 hover:bg-blue-200',
    'Quotation': 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
    'Size Set': 'bg-purple-100 text-purple-700 hover:bg-purple-200',
    'Counter Sample': 'bg-orange-100 text-orange-700 hover:bg-orange-200',
    'Approved': 'bg-green-100 text-green-700 hover:bg-green-200',
  };

  const handleDelete = async () => {
    if (!token) return;
    
    setIsDeleting(true);
    try {
      const resp = await fetch(`/api/designer/styles/${style.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await resp.json();

      if (resp.ok) {
        toast({
          title: "Style Deleted",
          description: `Style ${style.number} has been successfully removed.`,
        });
        router.refresh();
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to delete style",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the style.",
        variant: "destructive"
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // Check if current user can delete this style
  const canDelete = () => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'factory') return true;
    if (user.role === 'designer' && !style.sampleApproved) return true;
    return false;
  };

  return (
    <>
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
              {style.sampleApproved ? (
               <Badge className="bg-green-500 text-white shadow-sm border-0">Approved</Badge>
              ) : null}
          </div>
        </div>
        
        <CardHeader className="p-4 pb-2">
          <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0 pr-2">
                  <CardTitle className="text-lg font-semibold text-slate-900 truncate" title={style.name}>
                      {style.name}
                  </CardTitle>
                  <div className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                      <span className="bg-slate-100 px-1.5 py-0.5 rounded text-xs shrink-0">#{style.number}</span>
                      {style.season && <span className="text-slate-400 truncate">• {style.season}</span>}
                  </div>
              </div>
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-400 hover:text-slate-700">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <Link href={`/designer/${style.id}`}>
                        <DropdownMenuItem>Edit Style</DropdownMenuItem>
                      </Link>
                      <DropdownMenuItem>Download Tech Pack</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className={cn(
                          "text-red-600 focus:bg-red-50 focus:text-red-700",
                          !canDelete() && "opacity-50 cursor-not-allowed"
                        )}
                        disabled={!canDelete()}
                        onClick={(e) => {
                          e.preventDefault();
                          if (canDelete()) setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Style
                      </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
          </div>
        </CardHeader>

        <CardFooter className="p-4 pt-2 border-t border-slate-50 bg-slate-50/50">
           <div className="w-full flex justify-between items-center text-xs text-slate-500">
              <span>Ver. {style.version}</span>
              <span>{new Date(style.updatedAt).toLocaleDateString()}</span>
           </div>
           <Link href={`/designer/${style.id}`} className="absolute inset-0 z-0" />
        </CardFooter>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the style <strong>{style.name} (#{style.number})</strong> from the system. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting..." : "Delete Style"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
