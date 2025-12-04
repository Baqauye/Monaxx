import { GoogleGenerativeAI } from "@google/generative-ai";
import { Token, MarketSummary } from "../types";

// Safe initialization - support multiple env var names
const apiKey = (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || "") as string;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

/**
 * Unified market insight generator:
 * - Uses Gemini model if API key exists
 * - Falls back to local heuristic assistant if not
 */
export const getMarketInsight = async (tokens: Token[]): Promise<MarketSummary> => {
  // If AI unavailable → local insight
  if (!genAI) {
    return generateLocalInsight(tokens);
  }

  try {
    const topGainers = [...tokens].sort((a, b) => b.change24h - a.change24h).slice(0, 3);
    const topLosers = [...tokens].sort((a, b) => a.change24h - b.change24h).slice(0, 3);

    const marketSnapshot = {
      gainers: topGainers.map((t) => `${t.symbol} (+${t.change24h.toFixed(1)}%)`),
      losers: topLosers.map((t) => `${t.symbol} (${t.change24h.toFixed(1)}%)`),
      count: tokens.length,
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
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    if (text) {
      return JSON.parse(text) as MarketSummary;
    }

    throw new Error("No response text from Gemini");
  } catch (error) {
    console.error("Gemini Insight Error:", error);

    // fallback to local model
    return generateLocalInsight(tokens);
  }
};

/**
 * Local backup AI → lightweight insight generator
 */
const generateLocalInsight = (tokens: Token[]): MarketSummary => {
  try {
    if (!tokens || tokens.length === 0) {
      return {
        headline: "No market data",
        sentiment: "Neutral",
        insight: "No tokens available to analyze right now.",
      };
    }

    const topGainers = [...tokens].sort((a, b) => b.change24h - a.change24h).slice(0, 3);
    const topLosers = [...tokens].sort((a, b) => a.change24h - b.change24h).slice(0, 3);

    const headline = `${topGainers[0]?.symbol || "Token"} leads with ${topGainers[0]?.change24h?.toFixed(1) || "0.0"}% growth`;

    const insight = `Top gainers: ${topGainers
      .map((t) => `${t.symbol} (${t.change24h.toFixed(1)}%)`)
      .join(", ")}. Top losers: ${topLosers
      .map((t) => `${t.symbol} (${t.change24h.toFixed(1)}%)`)
      .join(", ")}. Keep an eye on liquidity shifts and new deployments.`;

    const avgChange = tokens.reduce((sum, t) => sum + (t.change24h || 0), 0) / tokens.length;
    const sentiment = avgChange > 1 ? "Bullish" : avgChange < -1 ? "Bearish" : "Neutral";

    return {
      headline,
      sentiment: sentiment as MarketSummary["sentiment"],
      insight,
    };
  } catch {
    return {
      headline: "Monad Ecosystem Active",
      sentiment: "Neutral",
      insight: "The ecosystem is evolving rapidly. Watch for new deployments and liquidity shifts.",
    };
  }
};
