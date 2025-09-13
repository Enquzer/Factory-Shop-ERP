'use server';
/**
 * @fileOverview A flow for answering questions about products.
 *
 * - productQA - A function that handles the product question answering process.
 * - ProductQAInput - The input type for the productQA function.
 * - ProductQAOutput - The return type for the productQA function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const ProductQAInputSchema = z.object({
  query: z.string().describe("The user's question about products."),
});
export type ProductQAInput = z.infer<typeof ProductQAInputSchema>;

const ProductQAOutputSchema = z.object({
  answer: z.string().describe("The AI's answer to the product question."),
});
export type ProductQAOutput = z.infer<typeof ProductQAOutputSchema>;

// Mock product data - in a real application, this would come from a database.
const products = [
    { 
        id: "MCT-001", 
        name: "Men's Classic Tee", 
        category: "Men", 
        price: 500.00, 
        variants: [
            { id: "VAR-001", color: "White", size: "M", stock: 15 },
            { id: "VAR-002", color: "White", size: "L", stock: 10 },
            { id: "VAR-003", color: "Black", size: "M", stock: 20 },
            { id: "VAR-004", color: "Black", size: "XL", stock: 5 },
        ]
    },
    { 
        id: "WSD-012", 
        name: "Women's Summer Dress", 
        category: "Women", 
        price: 1200.00, 
        variants: [
            { id: "VAR-005", color: "Floral", size: "S", stock: 8 },
            { id: "VAR-006", color: "Floral", size: "M", stock: 12 },
        ]
    },
    { 
        id: "KGH-034", 
        name: "Kid's Graphic Hoodie", 
        category: "Kids", 
        price: 850.00, 
        variants: [
            { id: "VAR-007", color: "Blue", size: "6Y", stock: 18 },
            { id: "VAR-008", color: "Pink", size: "8Y", stock: 22 },
        ]
    },
    { 
        id: "UDJ-007", 
        name: "Unisex Denim Jacket", 
        category: "Unisex", 
        price: 2500.00, 
        variants: [
            { id: "VAR-009", color: "Indigo", size: "L", stock: 7 },
        ]
    },
    { 
        id: "MST-002", 
        name: "Men's Striped Shirt", 
        category: "Men", 
        price: 950.00, 
        variants: [
            { id: "VAR-010", color: "Navy/White", size: "M", stock: 14 },
            { id: "VAR-011", color: "Navy/White", size: "L", stock: 11 },
        ]
    },
    { 
        id: "WJP-005", 
        name: "Women's Jumpsuit", 
        category: "Women", 
        price: 1800.00, 
        variants: [
            { id: "VAR-012", color: "Black", size: "S", stock: 9 },
            { id: "VAR-013", color: "Olive", size: "M", stock: 6 },
        ]
    },
];

export async function productQA(input: ProductQAInput): Promise<ProductQAOutput> {
  return productQAFlow(input);
}

const prompt = ai.definePrompt({
  name: 'productQAPrompt',
  input: { schema: ProductQAInputSchema },
  output: { schema: ProductQAOutputSchema },
  prompt: `You are an AI assistant for a factory manager. You have access to the current product inventory. Answer the user's question based on the data provided below.

  If the user asks a general question not related to the products, politely decline to answer.

  Product Data:
  {{jsonStringify products}}

  Question:
  {{{query}}}`,
});

const productQAFlow = ai.defineFlow(
  {
    name: 'productQAFlow',
    inputSchema: ProductQAInputSchema,
    outputSchema: ProductQAOutputSchema,
  },
  async (input) => {
    const { output } = await prompt({
        ...input,
        products,
    });
    return output!;
  }
);
