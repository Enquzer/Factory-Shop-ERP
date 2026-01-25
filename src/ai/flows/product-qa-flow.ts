'use server';
/**
 * @fileOverview A flow for answering questions about products, orders, and shops.
 *
 * - productQA - A function that handles the product question answering process.
 * - ProductQAInput - The input type for the productQA function.
 * - ProductQAOutput - The return type for the productQA function.
 */


import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getProducts } from '@/lib/products';
import { getShops } from '@/lib/shops';
import { getOrders } from '@/lib/orders';
import { processAssistantQuery } from '@/lib/assistant-logic';

const ProductQAInputSchema = z.object({
  query: z.string().describe("The user's question about products, inventory, orders, or shops."),
});
export type ProductQAInput = z.infer<typeof ProductQAInputSchema>;

const ProductQAOutputSchema = z.object({
  answer: z.string().describe("The AI's answer to the user's question."),
});
export type ProductQAOutput = z.infer<typeof ProductQAOutputSchema>;


export async function productQA(input: ProductQAInput): Promise<ProductQAOutput> {
  // First, try the local smart logic
  try {
    const result = await processAssistantQuery(input.query);

    // If the local analyst found a specific answer, return it.
    if (!result.isFallback) {
      return { answer: result.answer };
    }
  } catch (error: any) {
    console.error("Local Assistant Logic Error:", error);
    return { answer: `DEBUG ERROR (Local Logic): ${error.message || error}` };
  }

  // Fallback to Genkit if available
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_production_api_key_here') {
    try {
      return await productQAFlow(input);
    } catch (error: any) {
      console.error("Genkit Error:", error);
      return { answer: `DEBUG ERROR (Genkit): ${error.message || error}` };
    }
  }

  // Final fallback (Local help message)
  try {
    const result = await processAssistantQuery(input.query);
    return { answer: result.answer };
  } catch (error: any) {
    return { answer: `DEBUG ERROR (Final Fallback): ${error.message || error}` };
  }
}

const getProductsTool = ai.defineTool(
  {
    name: 'getProducts',
    description: 'Get a list of all available products in the factory catalog.',
    outputSchema: z.any(),
  },
  async () => await getProducts()
);

const getShopsTool = ai.defineTool(
  {
    name: 'getShops',
    description: 'Get a list of all registered shops.',
    outputSchema: z.any(),
  },
  async () => await getShops()
);

const getOrdersTool = ai.defineTool(
  {
    name: 'getOrders',
    description: 'Get a list of all orders that have been placed.',
    outputSchema: z.any(),
  },
  async () => await getOrders()
);

const prompt = ai.definePrompt({
  name: 'productQAPrompt',
  input: { schema: ProductQAInputSchema },
  output: { schema: ProductQAOutputSchema },
  tools: [getProductsTool, getShopsTool, getOrdersTool],
  prompt: `You are an AI assistant for a factory manager. You have access to tools that can fetch the current product inventory, shop data, and all orders. Answer the user's question based on the data you can retrieve from your tools.

  If the user asks a general question not related to the provided data, politely decline to answer.

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
    const { output } = await prompt(input);
    return output!;
  }
);

