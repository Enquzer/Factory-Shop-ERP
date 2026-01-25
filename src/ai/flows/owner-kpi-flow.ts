'use server';
/**
 * @fileOverview A flow for answering questions about owner KPIs and business insights.
 *
 * - ownerKPIQA - A function that handles the owner KPI question answering process.
 * - OwnerKPIQAInput - The input type for the ownerKPIQA function.
 * - OwnerKPIQAOutput - The return type for the ownerKPIQA function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

const OwnerKPIQAInputSchema = z.object({
  query: z.string().describe("The user's question about KPIs, business performance, or insights."),
});
export type OwnerKPIQAInput = z.infer<typeof OwnerKPIQAInputSchema>;

const OwnerKPIQAOutputSchema = z.object({
  answer: z.string().describe("The AI's answer to the user's question."),
});
export type OwnerKPIQAOutput = z.infer<typeof OwnerKPIQAOutputSchema>;

export async function ownerKPIQA(input: OwnerKPIQAInput): Promise<OwnerKPIQAOutput> {
  return ownerKPIQAFlow(input);
}

// Define tools for fetching KPI data
const getKPITool = ai.defineTool(
  {
    name: 'getKPIs',
    description: 'Get current KPI metrics for the business.',
    outputSchema: z.any(),
  },
  async () => {
    // In a real implementation, this would fetch actual KPI data
    // For now, we'll return a mock response
    return {
      totalSales: 1000000,
      totalOrders: 500,
      activeShops: 25,
      avgOrderValue: 2000,
      customerRetention: 0.75,
      inventoryTurnover: 12,
      onTimeDelivery: 0.95
    };
  }
);

const prompt = ai.definePrompt({
  name: 'ownerKPIQAPrompt',
  input: { schema: OwnerKPIQAInputSchema },
  output: { schema: OwnerKPIQAOutputSchema },
  tools: [getKPITool],
  prompt: `You are an AI business analyst for a fashion manufacturing company. You have access to tools that can fetch current KPI metrics. Answer the user's question based on the data you can retrieve from your tools.

  Focus on providing actionable insights and business recommendations. Use specific numbers and percentages when available.

  Question:
  {{{query}}}`,
});

const ownerKPIQAFlow = ai.defineFlow(
  {
    name: 'ownerKPIQAFlow',
    inputSchema: OwnerKPIQAInputSchema,
    outputSchema: OwnerKPIQAOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);