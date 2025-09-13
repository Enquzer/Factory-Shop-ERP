import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";
import { AddProductDialog } from "@/components/add-product-dialog";

export default function ProductsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold self-start sm:self-center">Products</h1>
                <AddProductDialog>
                    <Button className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Add Product
                    </Button>
                </AddProductDialog>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Product List</CardTitle>
                    <CardDescription>Manage your product catalog here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No products yet.</p>
                        <p className="text-sm">Click "Add Product" to get started.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

    