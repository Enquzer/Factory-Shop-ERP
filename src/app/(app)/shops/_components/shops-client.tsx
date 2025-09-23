
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreHorizontal, MapPin, Loader2 } from "lucide-react";
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
  } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { getShops, type Shop } from "@/lib/shops";


export function ShopsClientPage({ initialShops }: { initialShops: Shop[] }) {
    const [shops, setShops] = useState<Shop[]>(initialShops);
    const [isLoading, setIsLoading] = useState(false);

    const fetchShops = async () => {
        setIsLoading(true);
        const shopsData = await getShops(true); // Force refresh
        setShops(shopsData);
        setIsLoading(false);
    };

    const onShopRegistered = () => {
        fetchShops();
    }

    return (
        <>
            <div className="flex justify-end mb-4">
                 <RegisterShopDialog onShopRegistered={onShopRegistered}>
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
                                        {shop.name}
                                        <div className="text-sm text-muted-foreground md:hidden">{shop.contactPerson}</div>
                                         <div className="text-sm text-muted-foreground sm:hidden">
                                            <Badge variant={shop.status === 'Active' ? 'default' : shop.status === 'Pending' ? 'secondary' : 'destructive'} className="mt-1">
                                                {shop.status}
                                            </Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell">{shop.contactPerson}</TableCell>
                                    <TableCell className="hidden lg:table-cell">
                                        <Link
                                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${shop.name}, ${shop.city}`)}`}
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
                                                <DropdownMenuItem disabled>View Details</DropdownMenuItem>
                                                <DropdownMenuItem disabled>Edit</DropdownMenuItem>
                                                <DropdownMenuItem className="text-destructive" disabled>Deactivate</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                                    <p>No shops registered yet.</p>
                                    <p className="text-sm">Click "Register Shop" to add one.</p>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            )}
        </>
    );
}
