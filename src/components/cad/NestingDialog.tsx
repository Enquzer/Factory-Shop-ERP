'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Play, Download, Settings2, Ruler, Maximize2, Trash2, Upload, FileText } from 'lucide-react';
import * as fabric from 'fabric';
import { getMarketingOrders, MarketingOrder } from '@/lib/marketing-orders';

interface NestingDialogProps {
    isOpen: boolean;
    onClose: () => void;
    canvas: fabric.Canvas | null;
}

export default function NestingDialog({ isOpen, onClose, canvas }: NestingDialogProps) {
    const [fabricWidth, setFabricWidth] = useState(1500); // mm
    const [fabricLength, setFabricLength] = useState(3000); // mm
    const [margin, setMargin] = useState(10); // mm
    const [isNesting, setIsNesting] = useState(false);
    const [totalConsumption, setTotalConsumption] = useState(0);
    const [utilization, setUtilization] = useState(0);
    const [nestingQueue, setNestingQueue] = useState<{ id: string, name: string, qty: number, obj?: fabric.Object }[]>([]);
    
    // Order Integration
    const [orders, setOrders] = useState<MarketingOrder[]>([]);
    const [selectedOrder, setSelectedOrder] = useState<MarketingOrder | null>(null);

    // Virtual Canvas for Preview
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const [previewCanvas, setPreviewCanvas] = useState<fabric.Canvas | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && previewContainerRef.current) {
            const container = previewContainerRef.current;
            // Clear any existing content just in case
            container.innerHTML = '';
            
            const canvasEl = document.createElement('canvas');
            container.appendChild(canvasEl);
            
            const pc = new fabric.Canvas(canvasEl, {
                width: container.clientWidth,
                height: container.clientHeight,
                backgroundColor: '#ffffff',
                selection: false
            });
            setPreviewCanvas(pc);
            
            return () => {
                pc.dispose();
                container.innerHTML = '';
                setPreviewCanvas(null);
            };
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            getMarketingOrders().then(setOrders).catch(console.error);
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && canvas) {
            // Initial load from canvas
            const allObjects = canvas.getObjects();
            const valid = allObjects.filter(o => {
                const isPattern = ['path', 'rect', 'circle', 'polygon', 'group'].includes(o.type);
                const isExcluded = (o as any).excludeFromExport || (o as any).isGrid;
                return isPattern && !isExcluded;
            }) as fabric.Object[];
            
            const queue = valid.map((obj, idx) => ({
                id: (obj as any).id || `obj_${idx}`,
                name: (obj as any).presetKey ? `Component: ${(obj as any).presetKey}` : `Pattern Piece ${idx + 1}`,
                qty: 1,
                obj: obj
            }));
            setNestingQueue(queue);
        }
    }, [isOpen, canvas]);

    const handleOrderSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const orderId = e.target.value;
        const order = orders.find(o => o.id === orderId) || null;
        setSelectedOrder(order);
    };

    const autoFillQuantities = () => {
        if (!selectedOrder) return;
        
        // Create a map of Size -> Quantity from the order
        const sizeMap: Record<string, number> = {};
        selectedOrder.items.forEach(item => {
            sizeMap[item.size.toLowerCase()] = (sizeMap[item.size.toLowerCase()] || 0) + item.quantity;
            // Also store exact match
            sizeMap[item.size] = (sizeMap[item.size] || 0) + item.quantity;
        });

        const newQueue = nestingQueue.map(item => {
            let matchedQty = 0;
            const nameLower = item.name.toLowerCase();
            
            // Try to find size in pattern name
            Object.keys(sizeMap).forEach(size => {
                // If the pattern name explicity contains the size (e.g. "Front - S")
                // We use loose matching: " S " or "-S" or "Size S"
                const regex = new RegExp(`[\\s\\-_]${size}[\\s\\-_]|$`, 'i'); 
                if (regex.test(nameLower) || nameLower.includes(` ${size.toLowerCase()} `) || nameLower === size.toLowerCase()) {
                    matchedQty = sizeMap[size];
                }
            });
            
            return { ...item, qty: matchedQty > 0 ? matchedQty : item.qty };
        });
        setNestingQueue(newQueue);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
             const content = evt.target?.result as string;
             // Very basic DXF/Text handler for demonstration; ideally use a DXF parser
             // If JSON:
             try {
                const json = JSON.parse(content);
                if (json.objects) {
                     fabric.util.enlivenObjects(json.objects).then((objs: any[]) => {
                        const newItems = objs.map((obj, i) => ({
                            id: `imported_${Date.now()}_${i}`,
                            name: `Imported ${file.name} ${i+1}`,
                            qty: 1,
                            obj: obj
                        }));
                        setNestingQueue(prev => [...prev, ...newItems]);
                     });
                     return;
                }
             } catch (err) {
                 // Not JSON, maybe DXF text? 
                 // For now, assume user might upload a JSON export from this tool
                 alert("File format not recognized. Please upload a valid JSON pattern file (exported from Carement CAD). DXF Import requires a converter.");
             }
        };
        reader.readAsText(file);
    };

    const updateQty = (idx: number, newQty: number) => {
        const newQueue = [...nestingQueue];
        newQueue[idx].qty = Math.max(0, newQty);
        setNestingQueue(newQueue);
    };

    const runNesting = async () => {
        if (!canvas || !previewCanvas) return;
        
        setIsNesting(true);

        try {
            // Expand queue based on quantity
            const expandedItems: fabric.Object[] = [];
            nestingQueue.forEach(item => {
                if (item.qty > 0 && item.obj) {
                    for (let i = 0; i < item.qty; i++) {
                        expandedItems.push(item.obj);
                    }
                }
            });

            console.log("Found items to nest:", expandedItems.length);

            if (expandedItems.length === 0) {
                alert("Queue is empty. Please check quantities.");
                setIsNesting(false);
                return;
            }
            
            // 2. Clear preview and draw fabric area
            previewCanvas.clear();
            (previewCanvas as any).backgroundColor = '#ffffff';
            
            const scale = Math.min(
                (previewCanvas.width! - 40) / fabricWidth,
                (previewCanvas.height! - 40) / fabricLength
            );

            // Draw Fabric Roll
            const fabricRect = new fabric.Rect({
                left: 20,
                top: 20,
                width: fabricWidth * scale,
                height: fabricLength * scale,
                fill: '#f8fafc',
                stroke: '#cbd5e1',
                strokeWidth: 1,
                selectable: false,
                evented: false
            } as any);
            previewCanvas.add(fabricRect);
            
            // ... (Rest of cloning logic remains similar but uses expandedItems) ...
            
            console.log("Starting cloning process...");
            console.log("Starting cloning process...");
            const clones = await Promise.all(expandedItems.map(async (item) => {
                const cloned = await (item as any).clone();
                // Set scale to 1 for nesting space calculations
                cloned.set({
                    scaleX: scale,
                    scaleY: scale,
                    selectable: true,
                    hasControls: false
                });
                
                // Align to grain line
                const gl = (cloned as any).grainLine?.angle || 0;
                cloned.rotate(-gl);
                
                return cloned;
            }));
            
            // ... (Rest of packing logic) ...
            
            clones.sort((a, b) => (b.getBoundingRect().height * b.getBoundingRect().width) - (a.getBoundingRect().height * a.getBoundingRect().width));
            
            let currentX = 20 + (margin * scale);
            let currentY = 20 + (margin * scale);
            let maxHeightInRow = 0;
            let usedArea = 0;
            const rightEdge = 20 + (fabricWidth * scale);

            clones.forEach(obj => {
                const br = obj.getBoundingRect();
                const itemWidth = br.width;
                const itemHeight = br.height;
                
                // Check if fits in current row
                if (currentX + itemWidth > rightEdge) {
                    // Move to next row
                    currentX = 20 + (margin * scale);
                    currentY += maxHeightInRow + (margin * scale); // Add margin between rows too!
                    maxHeightInRow = 0;
                }
                
                // If it STILL doesn't fit (item wider than fabric), we position it anyway at start of row
                // but maybe we should warn? For now, standard nesting just places it.
                
                // Calculate offsets to align visual bounding box top-left with currentX/Y
                const offsetX = obj.left! - br.left;
                const offsetY = obj.top! - br.top;

                obj.set({
                    left: currentX + offsetX,
                    top: currentY + offsetY
                });
                
                previewCanvas.add(obj);
                usedArea += (itemWidth * itemHeight) / (scale * scale); // Convert back to real mm2 for stat calc
                
                currentX += itemWidth + (margin * scale);
                maxHeightInRow = Math.max(maxHeightInRow, itemHeight);
            });

            // Re-calculate Consumption in mm
            // currentY + maxHeightInRow gives the bottom pixel. Remove top padding (20). Divide by scale.
            const statsHeightPixels = (currentY + maxHeightInRow) - 20; 
            const statsHeightMm = statsHeightPixels / scale;

            const totalAreaAvailable = fabricWidth * statsHeightMm;
            setUtilization(Math.round((usedArea / totalAreaAvailable) * 100) || 0);
            setTotalConsumption(Math.round(statsHeightMm));

            previewCanvas.requestRenderAll();

        } catch (error) {
            console.error("Nesting Error:", error);
            alert("An error occurred during nesting optimization.");
        } finally {
            setIsNesting(false);
        }
    };

    const downloadPDF = async () => {
        if (!previewCanvas) return;
        setIsNesting(true);
        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF('p', 'mm', [fabricWidth, fabricLength]);
            
            const items = previewCanvas.getObjects().filter(o => o.type === 'path') as fabric.Path[];
            const scale = Math.min(
                (previewCanvas.width! - 40) / fabricWidth,
                (previewCanvas.height! - 40) / fabricLength
            );

            items.forEach(item => {
                const path = item.path as any[];
                // Original matrix without the preview scale
                const matrix = item.calcTransformMatrix();
                // We need to remove the scale factor we added for preview
                matrix[0] /= scale;
                matrix[3] /= scale;

                // Adjust left/top to real world (reverse the scale and the 20px padding)
                const realLeft = (item.left! - 20) / scale;
                const realTop = (item.top! - 20) / scale;

                doc.setDrawColor(0);
                doc.setLineWidth(0.5);

                const pdfPath: { op: string, c: number[] }[] = [];
                path.forEach(cmd => {
                    const type = cmd[0];
                    const pts: number[] = [];
                    for (let i = 1; i < cmd.length; i += 2) {
                        // Transform point using original untransformed path coordinates
                        const p = fabric.util.transformPoint(
                            new fabric.Point(cmd[i] - (item as any).pathOffset.x, cmd[i+1] - (item as any).pathOffset.y), 
                            matrix
                        );
                        // Shift to markers position
                        pts.push(p.x + (realLeft - item.left!/scale), p.y + (realTop - item.top!/scale));
                    }

                    if (type === 'M') pdfPath.push({ op: 'm', c: [pts[0], pts[1]] });
                    else if (type === 'L') pdfPath.push({ op: 'l', c: [pts[0], pts[1]] });
                    else if (type === 'C') pdfPath.push({ op: 'c', c: [pts[0], pts[1], pts[2], pts[3], pts[4], pts[5]] });
                    else if (type === 'Z') pdfPath.push({ op: 'h', c: [] });
                });
                (doc as any).path(pdfPath);
                doc.stroke();
            });

            doc.save(`marker_${fabricWidth}x${totalConsumption}.pdf`);
        } catch (err) {
            console.error(err);
            alert("Error generating PDF");
        }
        setIsNesting(false);
    };

    const downloadDXF = () => {
        if (!previewCanvas) return;
        const items = previewCanvas.getObjects().filter(o => o.type === 'path') as fabric.Path[];
        const scale = Math.min((previewCanvas.width! - 40) / fabricWidth, (previewCanvas.height! - 40) / fabricLength);
        
        // Simple DXF R12 Generator
        let dxf = "0\nSECTION\n2\nENTITIES\n";
        
        items.forEach(item => {
            const path = item.path as any[];
            const realLeft = (item.left! - 20) / scale;
            const realTop = (item.top! - 20) / scale;
            const matrix = item.calcTransformMatrix();
            matrix[0] /= scale; matrix[3] /= scale;

            dxf += "0\nPOLYLINE\n8\n0\n66\n1\n";
            path.forEach(cmd => {
                if (cmd[0] === 'Z') return;
                const p = fabric.util.transformPoint(new fabric.Point(cmd[cmd.length-2] - (item as any).pathOffset.x, cmd[cmd.length-1] - (item as any).pathOffset.y), matrix);
                const x = p.x + (realLeft - item.left!/scale);
                const y = -(p.y + (realTop - item.top!/scale)); // Invert Y for CAD
                dxf += `0\nVERTEX\n8\n0\n10\n${x}\n20\n${y}\n`;
            });
            dxf += "0\SEQEND\n";
        });
        
        dxf += "0\nENDSEC\n0\nEOF";
        
        const blob = new Blob([dxf], { type: 'application/dxf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `marker_${fabricWidth}.dxf`;
        link.click();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-8">
            <div className="bg-white w-full max-w-6xl h-full rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200">
                {/* Header */}
                <div className="h-16 border-b px-6 flex items-center justify-between bg-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
                            <Maximize2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 leading-tight">Auto-Nesting Studio</h2>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Garment Optimization Engine</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar Controls */}
                    <div className="w-80 border-r bg-slate-50 p-6 space-y-6 overflow-y-auto shrink-0 font-sans">
                        
                        {/* 1. Order Selection */}
                         <div className="space-y-4">
                            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                                <FileText className="w-3 h-3" /> Connect Order
                            </h3>
                            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                <select 
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                                    onChange={handleOrderSelect}
                                    value={selectedOrder?.id || ""}
                                >
                                    <option value="">-- Select Active Order --</option>
                                    {orders.map(o => (
                                        <option key={o.id} value={o.id}>{o.orderNumber} - {o.productName}</option>
                                    ))}
                                </select>
                                
                                {selectedOrder && (
                                    <div className="space-y-2">
                                        <div className="text-[10px] text-slate-500 font-medium">Order Quantities:</div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {selectedOrder.items.map((item: any, i: number) => (
                                                <div key={i} className="bg-slate-100 p-1.5 rounded text-center">
                                                    <div className="text-[9px] uppercase font-bold text-slate-500">{item.size}</div>
                                                    <div className="text-xs font-black text-slate-800">{item.quantity}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <button 
                                            onClick={autoFillQuantities}
                                            className="w-full py-1.5 bg-blue-50 text-blue-600 text-[10px] font-bold uppercase rounded hover:bg-blue-100 transition-colors"
                                        >
                                            Auto-Match to Patterns
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                         {/* 2. Upload / Import */}
                         <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                                <Upload className="w-3 h-3" /> Import Pattern
                            </h3>
                            <div className="relative">
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    className="hidden" 
                                    accept=".json,.dxf"
                                    onChange={handleFileUpload}
                                />
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full py-2 bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 rounded-lg text-xs font-bold transition-all border-dashed"
                                >
                                    Upload JSON / DXF...
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                                <Settings2 className="w-3 h-3" /> Fabric Parameters
                            </h3>
                            
                            <div className="space-y-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-600">Fabric Width (mm)</label>
                                    <input 
                                        type="number" 
                                        value={fabricWidth} 
                                        onChange={(e) => setFabricWidth(parseInt(e.target.value))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-600">Fabric Length (mm)</label>
                                    <input 
                                        type="number" 
                                        value={fabricLength} 
                                        onChange={(e) => setFabricLength(parseInt(e.target.value))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[11px] font-bold text-slate-600">Buffer Spacing (mm)</label>
                                    <input 
                                        type="number" 
                                        value={margin} 
                                        onChange={(e) => setMargin(parseInt(e.target.value))}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                             <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                                <Settings2 className="w-3 h-3" /> Pattern Queue
                            </h3>
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                {nestingQueue.map((item, idx) => (
                                    <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex items-center justify-between text-xs">
                                        <span className="font-bold text-slate-600 truncate max-w-[120px]" title={item.name}>{item.name}</span>
                                        <div className="flex items-center gap-1">
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={item.qty} 
                                                onChange={(e) => updateQty(idx, parseInt(e.target.value))}
                                                className="w-12 bg-slate-50 border border-slate-200 rounded px-1 py-1 text-center font-bold text-slate-700 outline-none"
                                            />
                                            <button onClick={() => updateQty(idx, 0)} className="text-slate-400 hover:text-red-500 p-1">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {nestingQueue.length === 0 && <p className="text-[10px] text-slate-400 italic">No patterns detected.</p>}
                            </div>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                             <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-2">
                                <Ruler className="w-3 h-3" /> Nesting Results
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Marker Len</p>
                                    <p className="text-lg font-black text-slate-700">{totalConsumption}mm</p>
                                </div>
                                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">Utilization</p>
                                    <p className="text-lg font-black text-green-600">{utilization}%</p>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={runNesting}
                            disabled={isNesting}
                            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-sm shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50"
                        >
                            {isNesting ? 'Optimizing...' : <><Play className="w-4 h-4 fill-current" /> Run Optimizer</>}
                        </button>

                        <div className="space-y-2 pt-4 border-t">
                            <button 
                                onClick={downloadPDF}
                                className="w-full py-3 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"
                            >
                                <Download className="w-4 h-4" /> Export 1:1 PDF
                            </button>
                            <button 
                                onClick={downloadDXF}
                                className="w-full py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2"
                            >
                                <Maximize2 className="w-4 h-4" /> Export 1:1 DXF (CAD)
                            </button>
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="flex-1 bg-slate-200/50 p-8 flex items-center justify-center relative">
                        <div 
                            ref={previewContainerRef} 
                            className="w-full h-full bg-white rounded-lg shadow-lg overflow-hidden border border-slate-300 pattern-grid"
                        />
                        <div className="absolute top-12 left-12 flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 backdrop-blur-sm text-white rounded-full text-[10px] font-bold uppercase tracking-widest shadow-xl">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live Preview
                        </div>
                    </div>
                </div>
            </div>
            
            <style jsx>{`
                .pattern-grid {
                    background-image: radial-gradient(#cbd5e1 1px, transparent 1px);
                    background-size: 20px 20px;
                }
            `}</style>
        </div>
    );
}
