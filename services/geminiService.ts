import { GoogleGenAI, Type } from "@google/genai";
import { Token, MarketSummary } from '../types';

// Safe initialization
const apiKey = process.env.API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const getMarketInsight = async (tokens: Token[]): Promise<MarketSummary> => {
  if (!ai) {
    return {
      headline: "API Key Missing",
      sentiment: "Neutral",
      insight: "Please configure your Gemini API Key to see AI insights."
    };
  }

  try {
    const topGainers = [...tokens].sort((a, b) => b.change24h - a.change24h).slice(0, 3);
    const topLosers = [...tokens].sort((a, b) => a.change24h - b.change24h).slice(0, 3);
    
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
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            headline: { type: Type.STRING },
            sentiment: { type: Type.STRING, enum: ["Bullish", "Bearish", "Neutral"] },
            insight: { type: Type.STRING },
          },
          required: ["headline", "sentiment", "insight"]
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as MarketSummary;
    }
    throw new Error("No response text");

  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return {
      headline: "Monad Ecosystem Active",
      sentiment: "Neutral",
      insight: "The ecosystem is evolving rapidly. Watch for new deployments and liquidity shifts."
    };
  }
};