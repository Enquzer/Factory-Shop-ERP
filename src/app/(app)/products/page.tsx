"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, PlusCircle, Loader2, FileText, Filter, ChevronDown, Grid, List, Upload } from "lucide-react";
import Link from "next/link";
import { Product, getProducts } from '@/lib/products';
import { ProductList } from './_components/product-list';
import { ProductsTableView } from './_components/products-table-view';
import { ProductsDashboard } from './_components/products-dashboard';
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { subDays } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { BulkSelectionProvider } from "@/contexts/bulk-selection-context";

export default function ProductsPage({
    searchParams
}: {
    searchParams?: {
        query?: string;
    }
}) {
    const searchTerm = searchParams?.query || "";
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [stockFilter, setStockFilter] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRange | undefined>({
        from: undefined,
        to: undefined
    });
    const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
    const [isExcelUploadOpen, setIsExcelUploadOpen] = useState(false);
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    
    // Get unique categories for filter
    const categories = useMemo(() => {
        return [...new Set(products.map(product => product.category))];
    }, [products]);
    
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                // Use forceRefresh to bypass any caching
                const productsData = await getProducts(true);
                setProducts(productsData);
            } catch (error) {
                console.error('Error fetching products:', error);
            } finally {
                setLoading(false);
            }
        };
        
        fetchProducts();
    }, []);
    
    const handleExportToPDF = async () => {
        try {
            // Create a temporary link to download the PDF
            const link = document.createElement('a');
            link.href = '/api/products/export';
            link.download = 'products-report.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            toast({
                title: "Success",
                description: "Products report generated and downloaded successfully.",
            });
        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({
                title: "Error",
                description: "Failed to generate PDF. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        if (file) {
            // Check if the file is an Excel file
            if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                file.type === 'application/vnd.ms-excel' ||
                file.name.endsWith('.xlsx') ||
                file.name.endsWith('.xls')) {
                setExcelFile(file);
            } else {
                toast({
                    title: "Error",
                    description: "Please select a valid Excel file (.xlsx or .xls)",
                    variant: "destructive",
                });
            }
        }
    };

    const handleUploadExcel = async () => {
        if (!excelFile) {
            toast({
                title: "Error",
                description: "Please select an Excel file to upload",
                variant: "destructive",
            });
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', excelFile);
            
            const response = await fetch('/api/products/upload-excel', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                toast({
                    title: "Success",
                    description: `Successfully processed ${result.processed} products. ${result.created} created, ${result.updated} updated.`,
                });
                // Refresh the product list
                const productsData = await getProducts(true);
                setProducts(productsData);
                setIsExcelUploadOpen(false);
                setExcelFile(null);
            } else {
                toast({
                    title: "Error",
                    description: result.error || "Failed to upload Excel file",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Error uploading Excel:", error);
            toast({
                title: "Error",
                description: "An error occurred while uploading the Excel file",
                variant: "destructive",
            });
        } finally {
            setUploading(false);
        }
    };

    const handleDownloadTemplate = () => {
        // Create a CSV template with sample data using the new product code formats
        const csvContent = "productCode,sellingPrice,image,name,category,description\n"
            + "CK-008/01,29.99,https://example.com/image1.jpg,Product Name 1,Men,A description for product 1\n"
            + "CK-0002,39.99,https://example.com/image2.jpg,Product Name 2,Women,A description for product 2\n"
            + "CK-pn-11/01,49.99,https://example.com/image3.jpg,Product Name 3,Kids,A description for product 3";
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'product_import_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        toast({
            title: "Template Downloaded",
            description: "CSV template downloaded successfully. Fill in your product data and upload it.",
        });
    };
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <BulkSelectionProvider>
        <div className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold">Products</h1>
                    <p className="text-muted-foreground">Manage your product catalog.</p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <form className="relative w-full md:w-auto">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            name="query"
                            placeholder="Search products..."
                            className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] w-full"
                            defaultValue={searchTerm}
                        />
                    </form>
                    
                    {/* View Toggle Buttons */}
                    <div className="flex rounded-md border border-input">
                        <Button
                            variant={viewMode === "grid" ? "default" : "ghost"}
                            size="sm"
                            className="rounded-r-none border-0"
                            onClick={() => setViewMode("grid")}
                        >
                            <Grid className="h-4 w-4" />
                        </Button>
                        <Button
                            variant={viewMode === "table" ? "default" : "ghost"}
                            size="sm"
                            className="rounded-l-none border-0"
                            onClick={() => setViewMode("table")}
                        >
                            <List className="h-4 w-4" />
                        </Button>
                    </div>
                    
                    {/* Date Range Filter */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                id="date"
                                variant={"outline"}
                                className={cn(
                                    "w-full md:w-[200px] justify-start text-left font-normal",
                                    !dateRange && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                            {dateRange.from.toLocaleDateString()} -{" "}
                                            {dateRange.to.toLocaleDateString()}
                                        </>
                                    ) : (
                                        dateRange.from.toLocaleDateString()
                                    )
                                ) : (
                                    <span>Recently Added</span>
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                initialFocus
                                mode="range"
                                defaultMonth={dateRange?.from}
                                selected={dateRange}
                                onSelect={setDateRange}
                                numberOfMonths={2}
                            />
                        </PopoverContent>
                    </Popover>
                    
                    {/* Filter Dropdowns */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                                <Filter className="h-4 w-4 mr-2" />
                                Filters
                                <ChevronDown className="h-4 w-4 ml-2" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="end">
                            <div className="space-y-4">
                                <h4 className="font-medium leading-none">Filter Options</h4>
                                <div className="grid gap-2">
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label htmlFor="category">Category</label>
                                        <Select value={selectedCategory || "all"} onValueChange={(value) => setSelectedCategory(value === "all" ? null : value)}>
                                            <SelectTrigger className="col-span-2">
                                                <SelectValue placeholder="All Categories" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Categories</SelectItem>
                                                {categories.map(category => (
                                                    <SelectItem key={category} value={category}>
                                                        {category}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label htmlFor="status">Status</label>
                                        <Select value={selectedStatus || "all"} onValueChange={(value) => setSelectedStatus(value === "all" ? null : value)}>
                                            <SelectTrigger className="col-span-2">
                                                <SelectValue placeholder="All Statuses" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Statuses</SelectItem>
                                                <SelectItem value="available">Available</SelectItem>
                                                <SelectItem value="unavailable">Unavailable</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-3 items-center gap-4">
                                        <label htmlFor="stock">Stock</label>
                                        <Select value={stockFilter || "all"} onValueChange={(value) => setStockFilter(value === "all" ? null : value)}>
                                            <SelectTrigger className="col-span-2">
                                                <SelectValue placeholder="All Stock Levels" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="all">All Stock Levels</SelectItem>
                                                <SelectItem value="in-stock">In Stock</SelectItem>
                                                <SelectItem value="low-stock">Low Stock</SelectItem>
                                                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <Button 
                                        size="sm" 
                                        onClick={() => {
                                            // Refresh the product list with new filters
                                            window.location.reload();
                                        }}
                                    >
                                        Apply Filters
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    
                    <Button onClick={handleExportToPDF} variant="outline">
                        <FileText className="mr-2 h-4 w-4" />
                        Export PDF
                    </Button>
                    
                    {/* Excel Upload Button */}
                    <Popover open={isExcelUploadOpen} onOpenChange={setIsExcelUploadOpen}>
                        <PopoverTrigger asChild>
                            <Button variant="outline">
                                <Upload className="mr-2 h-4 w-4" />
                                Upload Excel
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 p-4" align="end">
                            <div className="space-y-4">
                                <h4 className="font-medium leading-none">Upload Excel/CSV File</h4>
                                <p className="text-sm text-muted-foreground">Upload product data with codes, prices, and images</p>
                                
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Download Template</label>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            onClick={handleDownloadTemplate}
                                            className="w-full"
                                        >
                                            Download CSV Template
                                        </Button>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Use this template to format your data correctly
                                        </p>
                                    </div>
                                    
                                    <div className="pt-2">
                                        <label htmlFor="excel-upload" className="block text-sm font-medium mb-1">Select File</label>
                                        <Input
                                            id="excel-upload"
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
                                            onChange={handleExcelFileChange}
                                            disabled={uploading}
                                        />
                                        {excelFile && (
                                            <p className="text-sm text-muted-foreground truncate mt-1">Selected: {excelFile.name}</p>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Note: For Excel files with multiple sheets (Kids, Ladies), export each sheet as a separate CSV file or combine data into one CSV file.
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex justify-end gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setIsExcelUploadOpen(false);
                                            setExcelFile(null);
                                        }}
                                        disabled={uploading}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={handleUploadExcel}
                                        disabled={!excelFile || uploading}
                                    >
                                        {uploading ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Uploading...
                                            </>
                                        ) : (
                                            "Upload"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </PopoverContent>
                    </Popover>
                    
                    <Button asChild>
                        <Link href="/products/new">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Product
                        </Link>
                    </Button>
                </div>
            </div>

            <ProductsDashboard products={products} />

            <Suspense fallback={
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            }>
                {viewMode === "grid" ? (
                    <ProductList 
                        products={products} 
                        query={searchTerm} 
                        selectedCategory={selectedCategory}
                        selectedStatus={selectedStatus}
                        stockFilter={stockFilter}
                        dateRange={dateRange}
                        onProductsDeleted={async () => {
                            const productsData = await getProducts(true);
                            setProducts(productsData);
                        }}
                    />
                ) : (
                    <ProductsTableView 
                        products={products} 
                        query={searchTerm} 
                        selectedCategory={selectedCategory}
                        selectedStatus={selectedStatus}
                        stockFilter={stockFilter}
                        dateRange={dateRange}
                        onProductsDeleted={async () => {
                            const productsData = await getProducts(true);
                            setProducts(productsData);
                        }}
                    />
                )}
            </Suspense>
        </div>
        </BulkSelectionProvider>
    );
}