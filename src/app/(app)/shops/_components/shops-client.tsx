"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, MapPin, Loader2, Edit, Eye, ToggleLeft, ToggleRight, Trash2, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { RegisterShopDialog } from "@/components/register-shop-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
  } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { type Shop } from "@/lib/shops";
import { useToast } from '@/hooks/use-toast';
import { ShopDetailDialog } from '@/components/shop-detail-dialog';
import { EditShopDialog } from '@/components/edit-shop-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/auth-context';
import { deleteShop } from '@/lib/shops'; // Import deleteShop function

export function ShopsClientPage({ initialShops, onShopsUpdate }: { initialShops: Shop[], onShopsUpdate?: (shops: Shop[]) => void }) {
    const { user } = useAuth(); // Get user context
    const [shops, setShops] = useState<Shop[]>(initialShops);
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false); // Add state for delete operation
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const shopsPerPage = 10; // Increased for better UX
    
    const [shopToView, setShopToView] = useState<Shop | null>(null);
    const [shopToEdit, setShopToEdit] = useState<Shop | null>(null);
    const [shopToDelete, setShopToDelete] = useState<Shop | null>(null); // Add state for shop to delete
    
    const { toast } = useToast();

    const fetchShops = async (page: number = 1) => {
        setIsLoading(true);
        try {
            // Use API endpoint for fetching paginated shops
            const response = await fetch(`/api/shops?page=${page}&limit=${shopsPerPage}`);
            if (!response.ok) {
                throw new Error('Failed to fetch shops');
            }
            
            const paginatedShops = await response.json();
            setShops(paginatedShops.shops);
            setTotalPages(paginatedShops.totalPages);
            setTotalCount(paginatedShops.totalCount);
            setCurrentPage(page);
            
            // Notify parent component of updated shops data for dashboard if callback is provided
            if (onShopsUpdate) {
                onShopsUpdate(paginatedShops.shops);
            }
        } catch (error) {
            console.error('Error fetching shops:', error);
            toast({
                title: "Error",
                description: "Failed to fetch shops. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const onShopRegistered = () => {
        // Always fetch the first page when a new shop is registered
        fetchShops(1);
    }
    
    const onShopUpdated = () => {
        fetchShops(currentPage);
        setShopToEdit(null);
    }

    // Add handleDelete function
    const handleDelete = async () => {
        if (!shopToDelete) return;
        
        setIsDeleting(true);
        try {
            const success = await deleteShop(shopToDelete.id);
            
            if (success) {
                toast({
                    title: "Success",
                    description: `Shop "${shopToDelete.name}" has been deleted successfully.`,
                });
                
                // Refresh the shop list
                await fetchShops(currentPage);
                // Use setTimeout to ensure proper state updates before closing
                setTimeout(() => {
                    setShopToDelete(null);
                }, 0);
            } else {
                throw new Error("Failed to delete shop");
            }
        } catch (error) {
            console.error('Error deleting shop:', error);
            toast({
                title: "Error",
                description: error instanceof Error ? error.message : "Failed to delete shop",
                variant: "destructive"
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleExportToPDF = async () => {
        try {
            // Create a temporary link to download the PDF
            const link = document.createElement('a');
            link.href = '/api/shops/export';
            link.download = 'shops-report.pdf';
            document.body.appendChild(link);
            link.click();
            // Use setTimeout to ensure proper cleanup
            setTimeout(() => {
                document.body.removeChild(link);
            }, 0);
            
            toast({
                title: "Success",
                description: "Shops report generated and downloaded successfully.",
            });
        } catch (error) {
            console.error("Error exporting shops:", error);
            toast({
                title: "Error",
                description: "Failed to export shops. Please try again.",
                variant: "destructive",
            });
        }
    };

    // Initial fetch when component mounts
    useEffect(() => {
        // Use setTimeout to ensure proper initialization
        setTimeout(() => {
            fetchShops(currentPage);
        }, 0);
    }, [currentPage]);

    return (
        <>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div></div> {/* Spacer */}
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleExportToPDF}>
                        <FileText className="mr-2 h-4 w-4" />
                        Export PDF
                    </Button>
                    <RegisterShopDialog onShopRegistered={onShopRegistered} userRole={user?.role}>
                        <Button className="w-full sm:w-auto" data-register-shop-button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Register Shop
                        </Button>
                    </RegisterShopDialog>
                </div>
            </div>
            
            {isLoading ? (
                <div className="flex justify-center items-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Shop Name</TableHead>
                                <TableHead className="hidden md:table-cell">Contact Person</TableHead>
                                <TableHead className="hidden lg:table-cell">Location</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shops.length > 0 ? (
                                shops.map((shop) => (
                                    <TableRow key={`shop-row-${shop.id}`}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
                                                <div>
                                                    <div>{shop.name}</div>
                                                    <div className="text-sm text-muted-foreground">@{shop.username}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">{shop.contactPerson}</TableCell>
                                        <TableCell className="hidden lg:table-cell">
                                            <Link 
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.exactLocation}, ${shop.city}`)}`} 
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-2 hover:underline"
                                            >
                                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                                {shop.city}
                                            </Link>
                                            <div className="text-sm text-muted-foreground">{shop.exactLocation}</div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu key={`dropdown-${shop.id}`}>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Shop Actions</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => {
                                                        // Use setTimeout to ensure proper state updates
                                                        setTimeout(() => {
                                                            setShopToView(shop);
                                                        }, 0);
                                                    }}>
                                                        <Eye className="mr-2 h-4 w-4" /> View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => {
                                                        // Use setTimeout to ensure proper state updates
                                                        setTimeout(() => {
                                                            setShopToEdit(shop);
                                                        }, 0);
                                                    }}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem 
                                                        onClick={() => {
                                                            // Use setTimeout to ensure proper state updates
                                                            setTimeout(() => {
                                                                setShopToDelete(shop);
                                                            }, 0);
                                                        }}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow key="no-shops-row">
                                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                        No shops found. <Button variant="link" onClick={() => {
                                            // Use setTimeout to ensure proper state updates
                                            setTimeout(() => {
                                                const registerButton = document.querySelector('[data-register-shop-button]');
                                                if (registerButton) {
                                                    (registerButton as HTMLButtonElement).click();
                                                }
                                            }, 0);
                                        }}>Register your first shop</Button>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between py-4">
                            <div className="text-sm text-muted-foreground">
                                Showing page {currentPage} of {totalPages} ({totalCount} total shops)
                            </div>
                            <div className="flex items-center space-x-2">
                                <Button
                                    key="prev-button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        // Use setTimeout to ensure proper state updates
                                        setTimeout(() => {
                                            fetchShops(currentPage - 1);
                                        }, 0);
                                    }}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>
                                
                                {Array.from({ length: totalPages }, (_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <Button
                                            key={`page-button-${pageNum}`}
                                            variant={pageNum === currentPage ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => {
                                                // Use setTimeout to ensure proper state updates
                                                setTimeout(() => {
                                                    fetchShops(pageNum);
                                                }, 0);
                                            }}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                                
                                <Button
                                    key="next-button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        // Use setTimeout to ensure proper state updates
                                        setTimeout(() => {
                                            fetchShops(currentPage + 1);
                                        }, 0);
                                    }}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
            
            <div key="dialogs-container">
                {shopToView && (
                    <ShopDetailDialog
                        key={`shop-detail-${shopToView.id}`}
                        shop={shopToView}
                        open={!!shopToView}
                        onOpenChange={(isOpen) => !isOpen && setShopToView(null)}
                    />
                )}

                {shopToEdit && (
                    <EditShopDialog
                        key={`shop-edit-${shopToEdit.id}`}
                        shop={shopToEdit}
                        open={!!shopToEdit}
                        onOpenChange={(isOpen) => !isOpen && setShopToEdit(null)}
                        onShopUpdated={onShopUpdated}
                        userRole={user?.role} // Pass user role to EditShopDialog
                    />
                )}
                
                <AlertDialog key="delete-alert" open={!!shopToDelete} onOpenChange={(isOpen) => !isOpen && setShopToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete "{shopToDelete?.name}". This action cannot be undone.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                            {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete"}
                        </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </>
    );
}
