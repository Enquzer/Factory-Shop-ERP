import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { Copy, Edit3, Check, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface PadNumberDisplayProps {
  padNumber: string | null | undefined;
  type: 'material' | 'finished';
  recordId: string;
  editable?: boolean;
  onPadNumberUpdate?: (newNumber: string) => void;
  className?: string;
}

export function PadNumberDisplay({ 
  padNumber, 
  type, 
  recordId, 
  editable = false, 
  onPadNumberUpdate,
  className = ''
}: PadNumberDisplayProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(padNumber || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleCopy = () => {
    if (padNumber) {
      navigator.clipboard.writeText(padNumber);
      toast({
        title: "Copied!",
        description: `Pad number ${padNumber} copied to clipboard`,
      });
    }
  };

  const handleEdit = () => {
    if (!editable) return;
    setIsEditing(true);
    setEditValue(padNumber || '');
  };

  const handleSave = async () => {
    if (!editValue.trim()) {
      toast({
        title: "Error",
        description: "Pad number cannot be empty",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/pad-numbers/${recordId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          newNumber: editValue.trim(),
          recordId
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update pad number');
      }

      const result = await response.json();
      toast({
        title: "Success",
        description: `Pad number updated to ${result.newNumber}`,
      });

      if (onPadNumberUpdate) {
        onPadNumberUpdate(result.newNumber);
      }

      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(padNumber || '');
  };

  const getDisplayText = () => {
    if (isEditing) {
      return (
        <div className="flex items-center gap-2">
          <Input
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-32 h-8 text-sm"
            placeholder={`Enter ${type === 'material' ? 'RM' : 'FG'} number`}
            disabled={isLoading}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleSave}
            disabled={isLoading || !editValue.trim()}
            className="h-8 w-8 p-0"
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleCancel}
            disabled={isLoading}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    if (!padNumber) {
      return (
        <span className="text-muted-foreground italic">
          No pad number assigned
        </span>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <span className="font-mono font-semibold text-lg tracking-wider">
          {padNumber}
        </span>
        <div className="flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-6 w-6 p-0"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Copy pad number</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {editable && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEdit}
                    className="h-6 w-6 p-0"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Edit pad number</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    );
  };

  const getTypeLabel = () => {
    return type === 'material' ? 'Raw Material' : 'Finished Goods';
  };

  const getTypePrefix = () => {
    return type === 'material' ? 'RM' : 'FG';
  };

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {getTypeLabel()} Pad Number
      </Label>
      <div className="flex items-center">
        {getDisplayText()}
      </div>
      {isEditing && (
        <p className="text-xs text-muted-foreground mt-1">
          Format: {getTypePrefix()}-[sequence] {type === 'finished' && 'or FG-[SHOP]-[sequence]'}
        </p>
      )}
    </div>
  );
}