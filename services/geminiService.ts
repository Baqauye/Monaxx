import { GoogleGenerativeAI } from “@google/genai”;
import { Token, MarketSummary } from ‘../types’;

// Safe initialization - check both possible env var names
const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || ‘’) as string;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const getMarketInsight = async (tokens: Token[]): Promise<MarketSummary> => {
if (!genAI) {
return {
headline: “API Key Missing”,
sentiment: “Neutral”,
insight: “Please configure your Gemini API Key to see AI insights.”
};
}

try {
const topGainers = […tokens].sort((a, b) => b.change24h - a.change24h).slice(0, 3);
const topLosers = […tokens].sort((a, b) => a.change24h - b.change24h).slice(0, 3);

```
const marketSnapshot = {
  gainers: topGainers.map(t => `${t.symbol} (+${t.change24h.toFixed(1)}%)`),
  losers: topLosers.map(t => `${t.symbol} (${t.change24h.toFixed(1)}%)`),
  count: tokens.length
};

const prompt = `
  Act as a witty crypto analyst observing the Monad Testnet ecosystem. 
  Based on this snapshot: ${JSON.stringify(marketSnapshot)}.
  Provide a short, punchy 1-sentence headline and a brief 2-sentence insight.
  Determine if sentiment is Bullish, Bearish, or Neutral.
  Treat the data as real market movements.
  
  Respond with ONLY a JSON object in this exact format:
  {
    "headline": "string",
    "sentiment": "Bullish" | "Bearish" | "Neutral",
    "insight": "string"
  }
`;

const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash-exp",
  generationConfig: {
    responseMimeType: "application/json"
  }
});

const result = await model.generateContent(prompt);
const response = result.response;
const text = response.text();

if (text) {
  return JSON.parse(text) as MarketSummary;
}
throw new Error("No response text");
```

} catch (error) {
console.error(“Gemini Insight Error:”, error);
return {
headline: “Monad Ecosystem Active”,
sentiment: “Neutral”,
insight: “The ecosystem is evolving rapidly. Watch for new deployments and liquidity shifts.”
};
}
};