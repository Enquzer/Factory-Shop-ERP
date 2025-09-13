import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, MoreHorizontal, MapPin } from "lucide-react";
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

const shops = [
    {
        id: "SHP-001",
        name: "Bole Boutique",
        contactPerson: "Abebe Bikila",
        city: "Addis Ababa",
        exactLocation: "Bole, next to Edna Mall",
        discount: 5,
        status: "Active"
    },
    {
        id: "SHP-002",
        name: "Hawassa Habesha",
        contactPerson: "Tirunesh Dibaba",
        city: "Hawassa",
        exactLocation: "Piassa, near the lake",
        discount: 0,
        status: "Active"
    },
    {
        id: "SHP-003",
        name: "Merkato Style",
        contactPerson: "Kenenisa Bekele",
        city: "Addis Ababa",
        exactLocation: "Merkato, main market area",
        discount: 10,
        status: "Pending"
    },
    {
        id: "SHP-004",
        name: "Adama Modern",
        contactPerson: "Meseret Defar",
        city: "Adama",
        exactLocation: "City center, across from the post office",
        discount: 5,
        status: "Inactive"
    }
];


export default function ShopsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Shops</h1>
                <RegisterShopDialog>
                    <Button>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Register Shop
                    </Button>
                </RegisterShopDialog>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Shop List</CardTitle>
                    <CardDescription>Manage registered shops here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Shop Name</TableHead>
                                <TableHead>Contact Person</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Discount</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {shops.length > 0 ? (
                                shops.map((shop) => (
                                    <TableRow key={shop.id}>
                                        <TableCell className="font-medium">{shop.name}</TableCell>
                                        <TableCell>{shop.contactPerson}</TableCell>
                                        <TableCell>
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
                                        <TableCell>
                                            <Badge variant={shop.status === 'Active' ? 'default' : shop.status === 'Pending' ? 'secondary' : 'destructive'}>
                                                {shop.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">{shop.discount}%</TableCell>
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
                                                    <DropdownMenuItem>View Details</DropdownMenuItem>
                                                    <DropdownMenuItem>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem className="text-destructive">Deactivate</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                        <p>No shops registered yet.</p>
                                        <p className="text-sm">Click "Register Shop" to add one.</p>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
