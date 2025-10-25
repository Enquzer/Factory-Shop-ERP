import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getShops, type Shop } from "@/lib/shops";
import { ShopsClientPage } from "./_components/shops-client";
import { ShopsDashboard } from "./_components/shops-dashboard";

export const dynamic = 'force-dynamic';

export default async function ShopsPage() {
    let shops: Shop[] = [];
    try {
        shops = await getShops();
    } catch (error) {
        console.error('Error fetching shops for server-side rendering:', error);
        shops = [];
    }
    
    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-2xl font-semibold self-start sm:self-center">Shops</h1>
                {/* Export and register buttons are inside the client component */}
            </div>
            
            <ShopsDashboard shops={shops} />
            
            <Card>
                <CardHeader>
                    <CardTitle>Shop List</CardTitle>
                    <CardDescription>Manage registered shops here.</CardDescription>
                </CardHeader>
                <CardContent>
                   <ShopsClientPage initialShops={shops} />
                </CardContent>
            </Card>
        </div>
    );
}

function ExportShopsButton({ shops }: { shops: Shop[] }) {
    const { toast } = useToast();
    
    const handleExportToPDF = async () => {
        try {
            // Create a temporary link to download the PDF
            const link = document.createElement('a');
            link.href = '/api/shops/export';
            link.download = 'shops-report.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
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
    
    return (
        <Button variant="outline" onClick={handleExportToPDF}>
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
        </Button>
    );
}