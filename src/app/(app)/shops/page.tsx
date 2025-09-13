import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle } from "lucide-react";

export default function ShopsPage() {
    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Shops</h1>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Register Shop
                </Button>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Shop List</CardTitle>
                    <CardDescription>Manage registered shops here.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                        <p>No shops registered yet.</p>
                        <p className="text-sm">Click "Register Shop" to add one.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
