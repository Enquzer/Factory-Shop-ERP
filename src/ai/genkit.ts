
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { nextJS } from '@genkit-ai/next';

export const ai = genkit({
  plugins: [
    nextJS(),
    googleAI()
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
