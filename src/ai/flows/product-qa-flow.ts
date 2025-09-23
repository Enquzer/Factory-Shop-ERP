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
import { getProducts } from '@/lib/products';

const ProductQAInputSchema = z.object({
  query: z.string().describe("The user's question about products."),
});
export type ProductQAInput = z.infer<typeof ProductQAInputSchema>;

const ProductQAOutputSchema = z.object({
  answer: z.string().describe("The AI's answer to the product question."),
});
export type ProductQAOutput = z.infer<typeof ProductQAOutputSchema>;


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
    // Fetch products dynamically
    const products = await getProducts();
    
    // Pass products as a variable to the prompt
    const { output } = await prompt(input, {
      variables: { products }
    });
    
    return output!;
  }
);
