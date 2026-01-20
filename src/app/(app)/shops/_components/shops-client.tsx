"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, MapPin, Loader2, Edit, Eye, ToggleLeft, ToggleRight, Trash2, ChevronLeft, ChevronRight, FileText, Power } from "lucide-react";
import { RegisterShopDialog } from "@/components/register-shop-dialog";
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
import { BulkSelectionTable } from "@/components/bulk-selection-table";
import { BulkActions } from "@/components/bulk-actions";

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
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false); // Add state for edit dialog
    const [shopToDelete, setShopToDelete] = useState<Shop | null>(null); // Add state for shop to delete

    const { toast } = useToast();

    const fetchShops = async (page: number = 1) => {
        setIsLoading(true);
        try {
            // Add a small delay to prevent rapid successive calls
            await new Promise(resolve => setTimeout(resolve, 100));

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
        // Add a small delay to prevent rapid successive calls
        setTimeout(() => {
            fetchShops(currentPage);
            setShopToEdit(null);
            setIsEditDialogOpen(false); // Close the dialog
        }, 100);
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

    const handlePrint = (selectedIds: string[]) => {
        // For printing, we can open a new window with selected shop details
        const selectedShops = shops.filter(shop => selectedIds.includes(shop.id));
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          let printContent = `
            <html>
              <head>
                <title>Selected Shops</title>
                <style>
                  body { font-family: Arial, sans-serif; }
                  table { border-collapse: collapse; width: 100%; }
                  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                  th { background-color: #f2f2f2; }
                </style>
              </head>
              <body>
                <h1>Selected Shops (${selectedShops.length})</h1>
                <table>
                  <thead>
                    <tr>
                      <th>Shop Name</th>
                      <th>Contact Person</th>
                      <th>City</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
          `;
          
          selectedShops.forEach(shop => {
            printContent += `
              <tr>
                <td>${shop.name}</td>
                <td>${shop.contactPerson}</td>
                <td>${shop.city}</td>
                <td>${shop.status}</td>
              </tr>
            `;
          });
          
          printContent += `
                  </tbody>
                </table>
              </body>
            </html>
          `;
          
          printWindow.document.write(printContent);
          printWindow.document.close();
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }
    };
    
    const handleBulkDelete = async (selectedIds: string[]) => {
        // Delete all selected shops
        for (const shopId of selectedIds) {
            try {
                const shopToDelete = shops.find(shop => shop.id === shopId);
                if (!shopToDelete) continue;
                
                const success = await deleteShop(shopId);
                if (!success) {
                    throw new Error(`Failed to delete shop ${shopId}`);
                }
            } catch (error) {
                console.error(`Error deleting shop ${shopId}:`, error);
                toast({
                    title: "Error",
                    description: `Failed to delete shop ${shopId}. Please try again.`,
                    variant: "destructive",
                });
                return; // Stop if any deletion fails
            }
        }
        
        // Refresh the shop list
        await fetchShops(currentPage);
        
        toast({
            title: "Success",
            description: `${selectedIds.length} shop(s) deleted successfully.`,
        });
    };
    
    const toggleShopStatus = async (shop: Shop, newStatus: 'Active' | 'Inactive' | 'Pending') => {
        try {
            const response = await fetch(`/api/shops?id=${shop.id}`, {
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
                title: "Success",
                description: `Shop "${shop.name}" is now ${newStatus}.`,
            });

            // Refresh the shop list
            await fetchShops(currentPage);
        } catch (error) {
            console.error('Error toggling shop status:', error);
            toast({
                title: "Error",
                description: "Failed to update shop status. Please try again.",
                variant: "destructive",
            });
        }
    };

    // Initial fetch when component mounts
    useEffect(() => {
        // Add a small delay to ensure proper initialization
        const timer = setTimeout(() => {
            fetchShops(currentPage);
        }, 100);

        // Clean up the timer
        return () => clearTimeout(timer);
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
                    <BulkSelectionTable
                        headers={[ 
                            { key: 'shopName', title: 'Shop Name', mobileTitle: 'Shop' },
                            { key: 'contactPerson', title: 'Contact Person', mobileTitle: 'Contact', className: 'hidden md:table-cell' },
                            { key: 'location', title: 'Location', mobileTitle: 'Location', className: 'hidden lg:table-cell' },
                            { key: 'status', title: 'Status', mobileTitle: 'Status', className: 'hidden sm:table-cell' },
                            { key: 'actions', title: 'Actions', mobileTitle: 'Actions', className: 'text-right' },
                        ]}
                        data={shops.map(shop => ({
                            id: shop.id,
                            shopName: (
                                <div className="flex items-center gap-3">
                                    <div className="bg-gray-200 border-2 border-dashed rounded-xl w-10 h-10 flex-shrink-0" />
                                    <div>
                                        <div className="font-medium">{shop.name}</div>
                                        <div className="text-sm text-muted-foreground">@{shop.username}</div>
                                    </div>
                                </div>
                            ),
                            contactPerson: (
                                <div className="text-sm">
                                    {shop.contactPerson}
                                </div>
                            ),
                            location: (
                                <div className="text-sm">
                                    <Link
                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.exactLocation}, ${shop.city}`)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 hover:underline"
                                    >
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        {shop.city}, {shop.exactLocation}
                                    </Link>
                                </div>
                            ),
                            status: (
                                <Badge
                                    variant={
                                        shop.status === 'Active' ? 'default' :
                                            shop.status === 'Inactive' ? 'secondary' :
                                                'outline'
                                    }
                                    className={
                                        shop.status === 'Active' ? 'bg-green-500 hover:bg-green-600' :
                                            shop.status === 'Inactive' ? 'bg-gray-500 hover:bg-gray-600' :
                                                'bg-yellow-500 hover:bg-yellow-600'
                                    }
                                >
                                    {shop.status}
                                </Badge>
                            ),
                            actions: (
                                <div className="flex justify-end">
                                    <DropdownMenu key={`dropdown-${shop.id}`}>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="outline" size="sm">
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
                                                    setIsEditDialogOpen(true); // Open the dialog
                                                }, 0);
                                            }}>
                                                <Edit className="mr-2 h-4 w-4" /> Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel>Status Control</DropdownMenuLabel>
                                            <DropdownMenuItem
                                                onClick={() => toggleShopStatus(shop, 'Active')}
                                                disabled={shop.status === 'Active'}
                                            >
                                                <Power className="mr-2 h-4 w-4 text-green-500" /> Set Active
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => toggleShopStatus(shop, 'Inactive')}
                                                disabled={shop.status === 'Inactive'}
                                            >
                                                <Power className="mr-2 h-4 w-4 text-gray-500" /> Set Inactive
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => toggleShopStatus(shop, 'Pending')}
                                                disabled={shop.status === 'Pending'}
                                            >
                                                <Power className="mr-2 h-4 w-4 text-yellow-500" /> Set Pending
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
                                </div>
                            )
                        }))}
                        idKey="id"
                        actions={
                            <BulkActions 
                                onPrint={handlePrint}
                                onDelete={handleBulkDelete}
                                printLabel="Print Selected"
                                deleteLabel="Delete Selected"
                                itemType="shops"
                            />
                        }
                    />

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
                        open={isEditDialogOpen} // Use the dedicated state variable
                        onOpenChange={(isOpen) => {
                            setIsEditDialogOpen(isOpen);
                            if (!isOpen) {
                                setShopToEdit(null);
                            }
                        }}
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
