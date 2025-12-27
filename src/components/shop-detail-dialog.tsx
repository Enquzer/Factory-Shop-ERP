"use client";

import type { Shop } from "@/lib/shops";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "./ui/scroll-area";
import { MapPin, Phone, User, Tag, Percent, Target, CreditCard, FileText } from "lucide-react";

export function ShopDetailDialog({ shop, open, onOpenChange }: { shop: Shop; open: boolean; onOpenChange: (open: boolean) => void }) {

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg" key="shop-detail-dialog-content">
                <DialogHeader key="shop-detail-dialog-header">
                    <DialogTitle key="shop-detail-dialog-title">{shop.name}</DialogTitle>
                    <DialogDescription key="shop-detail-dialog-description">
                        Username: {shop.username}
                    </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[70vh]">
                    <div className="space-y-4 pr-6">

                        <div className="flex items-center">
                            <User className="h-5 w-5 mr-3 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Contact Person</p>
                                <p className="text-sm text-muted-foreground">{shop.contactPerson}</p>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <Phone className="h-5 w-5 mr-3 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Contact Phone</p>
                                <p className="text-sm text-muted-foreground">{shop.contactPhone || "Not provided"}</p>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <MapPin className="h-5 w-5 mr-3 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Location</p>
                                <p className="text-sm text-muted-foreground">{shop.exactLocation}, {shop.city}</p>
                            </div>
                        </div>

                        <Separator />

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center">
                                <Tag className="h-5 w-5 mr-3 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">Status</p>
                                    <Badge variant={shop.status === 'Active' ? 'default' : shop.status === 'Pending' ? 'secondary' : 'destructive'}>
                                        {shop.status}
                                    </Badge>
                                </div>
                            </div>
                            <div className="flex items-center">
                                <Percent className="h-5 w-5 mr-3 text-muted-foreground" />
                                <div>
                                    <p className="text-sm font-medium">Discount</p>
                                    <p className="text-sm font-semibold">{(shop.discount * 100).toFixed(0)}%</p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center">
                            <Target className="h-5 w-5 mr-3 text-muted-foreground" />
                            <div>
                                <p className="text-sm font-medium">Monthly Sales Target</p>
                                <p className="text-sm text-muted-foreground">
                                    {shop.monthlySalesTarget ? `ETB ${shop.monthlySalesTarget.toLocaleString()}` : "Not set"}
                                </p>
                            </div>
                        </div>

                        <Separator />

                        <div>
                            <p className="text-sm font-medium mb-2">Business Information</p>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p><strong>TIN:</strong> {shop.tinNumber || "Not provided"}</p>
                                <p><strong>Trade License:</strong> {shop.tradeLicenseNumber || "Not provided"}</p>
                                {shop.createdAt && (
                                    <p><strong>Registered:</strong> {new Date(shop.createdAt).toLocaleString()}</p>
                                )}
                                {shop.updatedAt && (
                                    <p><strong>Last Updated:</strong> {new Date(shop.updatedAt).toLocaleString()}</p>
                                )}
                            </div>
                        </div>

                    </div>
                </ScrollArea>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}