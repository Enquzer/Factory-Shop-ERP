"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, MapPin, Loader2, Edit, Eye, ToggleLeft, ToggleRight, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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
import { getShops, getPaginatedShops, type Shop } from "@/lib/shops";
import { useToast } from '@/hooks/use-toast';
import { ShopDetailDialog } from '@/components/shop-detail-dialog';
import { EditShopDialog } from '@/components/edit-shop-dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/auth-context';

export function ShopsClientPage({ initialShops }: { initialShops: Shop[] }) {
    const { user } = useAuth(); // Get user context
    const [shops, setShops] = useState<Shop[]>(initialShops);
    const [isLoading, setIsLoading] = useState(false);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const shopsPerPage = 2; // Reduced to 2 for better pagination testing
    
    const [shopToView, setShopToView] = useState<Shop | null>(null);
    const [shopToEdit, setShopToEdit] = useState<Shop | null>(null);
    const [shopToToggleStatus, setShopToToggleStatus] = useState<Shop | null>(null);
    
    const { toast } = useToast();

    const fetchShops = async (page: number = 1) => {
        setIsLoading(true);
        try {
            // Use pagination for better performance with many shops
            const paginatedShops = await getPaginatedShops(page, shopsPerPage);
            setShops(paginatedShops.shops);
            setTotalPages(paginatedShops.totalPages);
            setTotalCount(paginatedShops.totalCount);
            setCurrentPage(page);
        } catch (error) {
            console.error('Error fetching shops:', error);
            // Fallback to non-paginated version
            const shopsData = await getShops(true); // Force refresh
            setShops(shopsData);
            setTotalPages(1);
            setTotalCount(shopsData.length);
            setCurrentPage(1);
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

    const handleToggleStatus = async () => {
        if (!shopToToggleStatus) return;
        
        setIsUpdatingStatus(true);
        const currentStatus = shopToToggleStatus.status;
        const newStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';

        try {
            // Use the API to update the shop status
            const response = await fetch(`/api/shops?id=${shopToToggleStatus.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                throw new Error('Failed to update shop status');
            }

            toast({
                title: "Status Updated",
                description: `Shop status changed to ${newStatus}`
            });
            
            // Refresh the shop list
            fetchShops(currentPage);
            setShopToToggleStatus(null);
        } catch (error) {
            console.error('Error updating shop status:', error);
            toast({
                title: "Error",
                description: "Failed to update shop status",
                variant: "destructive"
            });
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    return (
        <>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div></div> {/* Spacer */}
                <RegisterShopDialog onShopRegistered={onShopRegistered} userRole={user?.role}>
                    <Button className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Register Shop
                    </Button>
                </RegisterShopDialog>
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
                                <TableHead className="hidden sm:table-cell">Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shops.length > 0 ? (
                                shops.map((shop) => (
                                    <TableRow key={shop.id}>
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
                                        <TableCell className="hidden sm:table-cell">
                                            <Badge variant={shop.status === 'Active' ? 'default' : shop.status === 'Pending' ? 'secondary' : 'destructive'}>
                                                {shop.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                        <span className="sr-only">Shop Actions</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => setShopToView(shop)}>
                                                        <Eye className="mr-2 h-4 w-4" /> View Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => setShopToEdit(shop)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem 
                                                        onClick={() => setShopToToggleStatus(shop)}
                                                        className={shop.status === 'Active' ? 'text-destructive' : ''}
                                                    >
                                                        {shop.status === 'Active' ? <ToggleLeft className="mr-2 h-4 w-4" /> : <ToggleRight className="mr-2 h-4 w-4" />}
                                                        {shop.status === 'Active' ? 'Deactivate' : 'Activate'}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                        No shops found. <Button variant="link" onClick={() => {
                                            const registerButton = document.querySelector('[data-register-shop-button]');
                                            if (registerButton) {
                                                (registerButton as HTMLButtonElement).click();
                                            }
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
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchShops(currentPage - 1)}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                    Previous
                                </Button>
                                
                                {Array.from({ length: totalPages }, (_, i) => {
                                    const pageNum = i + 1;
                                    return (
                                        <Button
                                            key={pageNum}
                                            variant={pageNum === currentPage ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => fetchShops(pageNum)}
                                        >
                                            {pageNum}
                                        </Button>
                                    );
                                })}
                                
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => fetchShops(currentPage + 1)}
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
            
            {shopToView && (
                <ShopDetailDialog
                    shop={shopToView}
                    open={!!shopToView}
                    onOpenChange={(isOpen) => !isOpen && setShopToView(null)}
                />
            )}

            {shopToEdit && (
                <EditShopDialog
                    shop={shopToEdit}
                    open={!!shopToEdit}
                    onOpenChange={(isOpen) => !isOpen && setShopToEdit(null)}
                    onShopUpdated={onShopUpdated}
                    userRole={user?.role} // Pass user role to EditShopDialog
                />
            )}
            
            <AlertDialog open={!!shopToToggleStatus} onOpenChange={(isOpen) => !isOpen && setShopToToggleStatus(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will change the status of "{shopToToggleStatus?.name}" to {shopToToggleStatus?.status === 'Active' ? '"Inactive"' : '"Active"'}.
                        An inactive shop will not be able to log in or place new orders.
                    </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                    <AlertDialogCancel disabled={isUpdatingStatus}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleToggleStatus} disabled={isUpdatingStatus}>
                        {isUpdatingStatus ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : "Confirm"}
                    </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}