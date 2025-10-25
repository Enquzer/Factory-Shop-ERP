"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter, X } from "lucide-react";

interface FilterOptions {
  searchTerm: string;
  category: string;
  minStock: string;
  maxStock: string;
}

interface InventoryFiltersProps {
  onFilterChange: (filters: FilterOptions) => void;
  categories: string[];
}

export function InventoryFilters({ onFilterChange, categories }: InventoryFiltersProps) {
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: "",
    category: "all",
    minStock: "",
    maxStock: ""
  });

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const resetFilters = {
      searchTerm: "",
      category: "all",
      minStock: "",
      maxStock: ""
    };
    setFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search by product name, code..."
          value={filters.searchTerm}
          onChange={(e) => handleFilterChange("searchTerm", e.target.value)}
          className="pl-10"
        />
      </div>
      
      <div className="flex gap-2">
        <div className="w-40">
          <Label className="text-xs">Category</Label>
          <Select value={filters.category} onValueChange={(value) => handleFilterChange("category", value)}>
            <SelectTrigger>
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-32">
          <Label className="text-xs">Min Stock</Label>
          <Input
            type="number"
            placeholder="Min"
            value={filters.minStock}
            onChange={(e) => handleFilterChange("minStock", e.target.value)}
          />
        </div>
        
        <div className="w-32">
          <Label className="text-xs">Max Stock</Label>
          <Input
            type="number"
            placeholder="Max"
            value={filters.maxStock}
            onChange={(e) => handleFilterChange("maxStock", e.target.value)}
          />
        </div>
        
        <Button variant="outline" onClick={clearFilters} className="mt-auto">
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>
    </div>
  );
}