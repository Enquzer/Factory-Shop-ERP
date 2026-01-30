import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// CSV format specification for product import
export const PRODUCT_IMPORT_CSV_SPEC = `productCode,sellingPrice,image,name,category,description
CK-008/01,29.99,https://example.com/image1.jpg,Product Name 1,Men,A description for product 1
CK-0002,39.99,https://example.com/image2.jpg,Product Name 2,Women,A description for product 2
CK-pn-11/01,49.99,https://example.com/image3.jpg,Product Name 3,Kids,A description for product 3`;

// Helper function to convert CSV to JSON with better handling of quoted fields
export function csvToJson(csv: string): any[] {
  const lines = csv.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return [];

  // Parse headers, handling quoted fields
  const headers = parseCSVLine(lines[0]);
  
  const result: any[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '') continue; // Skip empty lines
    
    const currentLine = parseCSVLine(lines[i]);
    if (currentLine.length !== headers.length) continue;

    const obj: any = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = currentLine[j];
    }
    result.push(obj);
  }

  return result;
}

// Helper function to parse a single CSV line, handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Double quotes inside quoted field represent a single quote
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Helper function to parse Excel/CSV data
export function parseExcelData(data: string): any[] {
  // First check if it's CSV format
  if (data.includes(',')) {
    return csvToJson(data);
  }
  
  // For now, return empty array for other formats
  // In a real implementation, you would need a proper Excel parser
  return [];
}

// Utility function to convert file to text
export function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      resolve(text);
    };
    reader.onerror = (e) => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsText(file);
  });
}

// Utility function to convert file to ArrayBuffer (for Excel files)
export function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const arrayBuffer = e.target?.result as ArrayBuffer;
      resolve(arrayBuffer);
    };
    reader.onerror = (e) => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsArrayBuffer(file);
  });
}

// Utility function for authenticated API requests
export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  // Get the auth token from localStorage
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...options.headers,
  });
  
  if (authToken) {
    headers.set('Authorization', `Bearer ${authToken}`);
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}