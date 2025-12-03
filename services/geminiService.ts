import { GoogleGenAI, Type } from "@google/genai";
import { Token, MarketSummary } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getMarketInsight = async (tokens: Token[]): Promise<MarketSummary> => {
  try {
    // Filter top movers to keep context small
    const topGainers = [...tokens].sort((a, b) => b.change24h - a.change24h).slice(0, 3);
    const topLosers = [...tokens].sort((a, b) => a.change24h - b.change24h).slice(0, 3);
    
    const marketSnapshot = {
      gainers: topGainers.map(t => `${t.symbol} (+${t.change24h.toFixed(1)}%)`),
      losers: topLosers.map(t => `${t.symbol} (${t.change24h.toFixed(1)}%)`),
      btc_trend: tokens.find(t => t.symbol === 'BTC')?.change24h || 0,
    };

    const prompt = `
      Act as a witty crypto analyst. Based on this market snapshot: ${JSON.stringify(marketSnapshot)}.
      Provide a short, punchy 1-sentence headline and a brief 2-sentence insight.
      Determine if sentiment is Bullish, Bearish, or Neutral.
      Do NOT mention that this is simulated data. Treat it as real.
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
      headline: "Market Moves",
      sentiment: "Neutral",
      insight: "The market is fluctuating. Keep an eye on the charts for the next big move."
    };
  }
};
