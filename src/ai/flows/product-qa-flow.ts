'use server';
/**
 * @fileOverview A flow for answering questions about products, orders, and shops.
 *
 * - productQA - A function that handles the product question answering process.
 * - ProductQAInput - The input type for the productQA function.
 * - ProductQAOutput - The return type for the productQA function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { getProducts } from '@/lib/products';
import { getShops } from '@/lib/shops';
import { ordersStore } from '@/lib/orders';

const ProductQAInputSchema = z.object({
  query: z.string().describe("The user's question about products, inventory, orders, or shops."),
});
export type ProductQAInput = z.infer<typeof ProductQAInputSchema>;

const ProductQAOutputSchema = z.object({
  answer: z.string().describe("The AI's answer to the user's question."),
});
export type ProductQAOutput = z.infer<typeof ProductQAOutputSchema>;


export async function productQA(input: ProductQAInput): Promise<ProductQAOutput> {
  return productQAFlow(input);
}

const prompt = ai.definePrompt({
  name: 'productQAPrompt',
  input: { schema: ProductQAInputSchema },
  output: { schema: ProductQAOutputSchema },
  prompt: `You are an AI assistant for a factory manager. You have access to the current product inventory, shop data, and all orders. Answer the user's question based on the data provided below.

  If the user asks a general question not related to the provided data, politely decline to answer.

  Product Data:
  {{jsonStringify products}}

  Shop Data:
  {{jsonStringify shops}}

  Order Data:
  {{jsonStringify orders}}

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
    // Fetch all necessary data dynamically
    const products = await getProducts();
    const shops = await getShops();
    const orders = ordersStore.allOrders;
    
    // Pass all data as variables to the prompt
    const { output } = await prompt(input, {
      variables: { products, shops, orders }
    });
    
    return output!;
  }
);
