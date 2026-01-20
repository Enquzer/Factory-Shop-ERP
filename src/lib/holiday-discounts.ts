// Types and interfaces for holiday discount system

export interface HolidayDiscount {
  id: string;
  name: string;
  description?: string;
  startDate: Date | string;
  endDate: Date | string;
  discountPercentage: number;
  isActive: boolean;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ProductHolidayDiscount {
  id?: number; // Auto-generated
  productId: string;
  holidayDiscountId: string;
}

// Extended product type to include holiday discounts
export interface ProductWithHolidayDiscounts {
  id: string;
  productCode: string;
  name: string;
  category: string;
  price: number;
  minimumStockLevel: number;
  variants: any[]; // ProductVariant type
  agePricing?: any[]; // AgePricing type
  imageUrl?: string;
  description?: string;
  readyToDeliver?: number;
  updatedAt?: Date;
  holidayDiscounts?: HolidayDiscount[];
}

// Input types for validation
export interface CreateHolidayDiscountInput {
  name: string;
  description?: string;
  startDate: Date | string;
  endDate: Date | string;
  discountPercentage: number;
}

export interface UpdateHolidayDiscountInput extends Partial<CreateHolidayDiscountInput> {
  id: string;
  isActive?: boolean;
}

// Response types
export interface HolidayDiscountResponse {
  success: boolean;
  message: string;
  data?: HolidayDiscount | HolidayDiscount[] | null;
}

export interface ApplyHolidayDiscountInput {
  holidayDiscountId: string;
  productIds: string[];
}