"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, PlusCircle, Loader2, FileText, Filter, ChevronDown } from "lucide-react";
import Link from "next/link";
import { Product, getProducts } from '@/lib/products';
import { ProductList } from './_components/product-list';
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
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
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
                <ProductList 
                    products={products} 
                    query={searchTerm} 
                    selectedCategory={selectedCategory}
                    selectedStatus={selectedStatus}
                    stockFilter={stockFilter}
                    dateRange={dateRange}
                />
            </Suspense>
        </div>
    );
}