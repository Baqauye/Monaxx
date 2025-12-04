import { Token, MarketSummary } from '../types';

const formatChange = (value: number) => (value >= 0 ? `+${value.toFixed(1)}%` : `${value.toFixed(1)}%`);

export const buildMarketSummary = (tokens: Token[]): MarketSummary => {
  if (!tokens.length) {
    return {
      headline: "Waiting on live feeds",
      sentiment: "Neutral",
      insight: "Data is warming up—hold tight while the Monad chains settle in."
    };
  }

  const avgChange = tokens.reduce((sum, token) => sum + token.change24h, 0) / tokens.length;
  const topGainers = [...tokens].sort((a, b) => b.change24h - a.change24h).slice(0, 2);
  const topLosers = [...tokens].sort((a, b) => a.change24h - b.change24h).slice(0, 2);

  const sentiment: MarketSummary['sentiment'] =
    avgChange > 1.2 ? 'Bullish' :
    avgChange < -1.2 ? 'Bearish' :
    'Neutral';

  const headline = topGainers[0]
    ? `${topGainers[0].symbol} leads the ${sentiment.toLowerCase()} pack`
    : 'Market mood stabilizing';

  const insightParts = [
    `Avg move ${avgChange.toFixed(2)}% across ${tokens.length} tokens`,
    topGainers[0] ? `${topGainers[0].symbol} ${formatChange(topGainers[0].change24h)} today` : '',
    topLosers[0] ? `${topLosers[0].symbol} ${formatChange(topLosers[0].change24h)}` : ''
  ].filter(Boolean);

  return {
    headline,
    sentiment,
    insight: insightParts.join(' · ')
  };
};
