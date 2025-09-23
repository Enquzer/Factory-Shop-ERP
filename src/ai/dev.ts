// This is the entrypoint for the Genkit developer UI.
// It will be run by `genkit start` and `genkit watch`.
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Flows will be imported for their side effects in this file.
import './flows/chat-flow';
import './flows/product-qa-flow';

genkit({
  plugins: [
    googleAI(),
  ],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});
