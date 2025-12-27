"use client";

import * as React from "react";
import { useState, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import { Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnhancedImageUploadProps {
  onImageChange: (file: File | null) => void;
  currentImage?: string | null;
  label: string;
  disabled?: boolean;
  accept?: string;
}

export function EnhancedImageUpload({
  onImageChange,
  currentImage,
  label,
  disabled,
  accept = "image/*"
}: EnhancedImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clean up object URLs
  React.useEffect(() => {
    return () => {
      if (preview && preview.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(preview);
        } catch (error) {
          console.warn('Failed to revoke blob URL:', error);
        }
      }
    };
  }, [preview]);

  const processFile = useCallback((file: File) => {
    // Check if file is an image
    if (!file.type.match('image.*')) {
      alert('Please select an image file');
      return;
    }

    // Create preview
    const newPreviewUrl = URL.createObjectURL(file);
    if (preview && preview.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(preview);
      } catch (error) {
        console.warn('Failed to revoke previous blob URL:', error);
      }
    }
    setPreview(newPreviewUrl);
    onImageChange(file);
  }, [onImageChange, preview]);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleClickUpload = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleRemoveImage = () => {
    if (preview && preview.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // Paste handler
  const handlePaste = (e: React.ClipboardEvent) => {
    if (disabled) return;
    
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processFile(file);
          break;
        }
      }
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div 
        ref={containerRef}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onPaste={handlePaste}
        tabIndex={0}
        className={`relative border-2 border-dashed rounded-lg transition-colors ${
          isDragging 
            ? 'border-primary bg-primary/10' 
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <Input
          type="file"
          ref={fileInputRef}
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />
        
        {preview ? (
          <div className="relative">
            <div className="relative w-full aspect-video max-w-sm mx-auto rounded-md overflow-hidden">
              <Image 
                src={preview} 
                alt="Preview" 
                fill 
                sizes="(max-width: 768px) 100vw, 50vw"
                style={{ objectFit: "contain" }} 
              />
            </div>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveImage();
              }}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div 
            className="flex flex-col items-center justify-center p-8 text-center"
            onClick={handleClickUpload}
          >
            <Upload className="h-10 w-10 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium text-primary">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              Paste image (Ctrl+V) or drop image file here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}