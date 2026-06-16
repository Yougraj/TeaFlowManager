import { handler as serverHandler } from "../server";

// Export the handler as required by Netlify Functions
export const handler = serverHandler;
