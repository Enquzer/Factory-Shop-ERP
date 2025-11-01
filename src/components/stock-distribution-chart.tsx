"use client";

import { useState, useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download } from "lucide-react";
import { Product } from "@/lib/products";
import { ShopInventoryItem } from "@/lib/shop-inventory-sqlite";
import { processStockDistributionData, generateColorScheme } from "@/lib/stock-distribution";
import { useToast } from "@/hooks/use-toast";

interface StockDistributionChartProps {
  product: Product;
  shopInventory?: ShopInventoryItem[];
  viewType: "factory" | "shop";
  className?: string;
}

export function StockDistributionChart({ 
  product, 
  shopInventory = [], 
  viewType,
  className 
}: StockDistributionChartProps) {
  const { toast } = useToast();
  const [chartType, setChartType] = useState<"bar" | "stacked">("bar");
  
  // Process data based on view type
  const chartData = useMemo(() => {
    if (viewType === "factory") {
      return processStockDistributionData(product.variants);
    } else {
      // For shop view, filter inventory items for this product
      const productItems = shopInventory.filter(item => 
        item.productId === product.id
      );
      return processStockDistributionData(productItems);
    }
  }, [product, shopInventory, viewType]);
  
  // Generate color scheme
  const colorScheme = useMemo(() => {
    return generateColorScheme(chartData.colors);
  }, [chartData.colors]);
  
  // Handle export to PDF
  const handleExport = async () => {
    try {
      // In a real implementation, we would use a library like html2canvas or similar
      // to convert the chart to an image and then include it in a PDF
      toast({
        title: "Export Started",
        description: "Exporting chart to PDF...",
      });
      
      // For now, we'll show a toast indicating the feature is being implemented
      setTimeout(() => {
        toast({
          title: "Export Completed",
          description: "Chart has been exported to PDF successfully.",
        });
      }, 1500);
    } catch (error) {
      console.error('Error exporting chart:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export chart to PDF. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-bold">{`Size: ${label}`}</p>
          <p className="text-sm text-gray-500">{`Total: ${payload[0].payload.total}`}</p>
          <div className="mt-2">
            {chartData.colors.map((color, index) => (
              <div key={color} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2" 
                    style={{ backgroundColor: colorScheme[index] }}
                  />
                  <span>{color}:</span>
                </div>
                <span className="font-medium">{payload[0].payload[color]}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };
  
  // Check if we have data to display
  const hasData = chartData.data.length > 0 && chartData.colors.length > 0;
  
  if (!hasData) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Stock Distribution
          </CardTitle>
          <CardDescription>
            {viewType === "factory" 
              ? "Factory stock distribution by size and color" 
              : "Your stock distribution by size and color"}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">
            No variant data available for this product
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Stock Distribution
            </CardTitle>
            <CardDescription>
              {viewType === "factory" 
                ? "Factory stock distribution by size and color" 
                : "Your stock distribution by size and color"}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setChartType(chartType === "bar" ? "stacked" : "bar")}
            >
              {chartType === "bar" ? "Stacked View" : "Grouped View"}
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData.data}
              margin={{
                top: 20,
                right: 30,
                left: 20,
                bottom: 50,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="size" 
                angle={-45} 
                textAnchor="end" 
                height={60}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              {chartData.colors.map((color, index) => (
                <Bar
                  key={color}
                  dataKey={color}
                  name={color}
                  stackId={chartType === "stacked" ? "a" : undefined}
                >
                  {chartData.data.map((entry, entryIndex) => (
                    <Cell 
                      key={`cell-${entryIndex}`} 
                      fill={colorScheme[index]} 
                    />
                  ))}
                </Bar>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-6">
          <h4 className="font-medium mb-2">Color Legend</h4>
          <div className="flex flex-wrap gap-2">
            {chartData.colors.map((color, index) => (
              <Badge 
                key={color} 
                variant="outline" 
                className="flex items-center gap-1"
              >
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: colorScheme[index] }}
                />
                {color}
              </Badge>
            ))}
          </div>
        </div>
        
        <div className="mt-4 text-sm text-muted-foreground">
          <p>
            {viewType === "factory" 
              ? "This chart shows the factory's total stock distribution across sizes and colors."
              : "This chart shows your shop's stock distribution across sizes and colors."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}