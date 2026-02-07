
"use client";

import { Style } from '@/lib/styles-sqlite';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, FileText, History } from 'lucide-react';
import { generateTechPackPDF } from '@/lib/techpack-generator';
import { useState } from 'react';

interface TechPackTabProps {
  style: Style;
}

export function TechPackTab({ style }: TechPackTabProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
        const blob = await generateTechPackPDF(style);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `TechPack-${style.number}-v${style.version}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up the blob URL after a delay to allow the download to start
        setTimeout(() => {
          try {
            URL.revokeObjectURL(url);
          } catch (error) {
            // URL might already be revoked or invalid, ignore the error
          }
        }, 1000);
    } catch (error) {
        console.error("PDF Fail", error);
        alert("Failed to generate PDF");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
            <CardTitle>Tech Pack Generator</CardTitle>
            <CardDescription>Compile all style data into a manufacturing-ready PDF document.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
            <div className="bg-slate-50 p-6 rounded-lg text-center border-2 border-dashed border-slate-200">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                <h3 className="font-medium text-slate-900">Ready to Export</h3>
                <p className="text-sm text-slate-500 mb-6 max-w-xs mx-auto">
                    Includes Cover Sheet, BOM, Measurement Specs, and Visual Guide.
                </p>
                <Button onClick={handleDownload} disabled={isGenerating}>
                    {isGenerating ? 'Generating...' : (
                        <>
                            <Download className="mr-2 h-4 w-4" /> Download PDF
                        </>
                    )}
                </Button>
            </div>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
              <CardTitle>Revision History</CardTitle>
              <CardDescription>Previous versions of this tech pack.</CardDescription>
          </CardHeader>
          <CardContent>
               <div className="space-y-4">
                  {/* Mock history for now */}
                  <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="bg-slate-100 p-2 rounded">
                          <History className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="flex-1">
                          <div className="flex justify-between">
                             <p className="text-sm font-medium">Version {style.version}</p>
                             <span className="text-xs text-slate-400">Current</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Edited {style.updatedAt.toLocaleDateString()}</p>
                      </div>
                  </div>
                   <div className="flex items-start gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors opacity-60">
                      <div className="bg-slate-100 p-2 rounded">
                          <History className="h-4 w-4 text-slate-500" />
                      </div>
                      <div className="flex-1">
                          <div className="flex justify-between">
                             <p className="text-sm font-medium">Version {style.version - 1}</p>
                             <span className="text-xs text-slate-400">Archived</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Edited --</p>
                      </div>
                  </div>
               </div>
          </CardContent>
      </Card>
    </div>
  );
}
