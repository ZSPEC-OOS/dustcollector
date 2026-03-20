import { useState, useEffect } from 'react';
import { MarketData } from '../types';

const INITIAL_MARKETS: MarketData[] = [
  { symbol: 'BTC', price: 70307.90, change: -1.17, volatility: 0.73 },
  { symbol: 'ETH', price: 2143.09, change: -2.56, volatility: 0.86 },
  { symbol: 'SOL', price: 89.24, change: -1.11, volatility: 0.95 },
  { symbol: 'AR', price: 1.72, change: -0.58, volatility: 1.14 },
  { symbol: 'ADA', price: 0.2694, change: -1.10, volatility: 0.68 },
  { symbol: 'DOT', price: 1.54, change: -0.97, volatility: 0.75 },
  { symbol: 'LINK', price: 9.09, change: -1.30, volatility: 0.89 },
  { symbol: 'MATIC', price: 0.3794, change: -0.29, volatility: 0.42 }
];

export function useMarketData() {
  const [marketData, setMarketData] = useState<MarketData[]>(INITIAL_MARKETS);
  const [volatility, setVolatility] = useState(0.65);

  useEffect(() => {
    const interval = setInterval(() => {
      setMarketData(prev => prev.map(market => {
        const change = (Math.random() - 0.5) * 0.1;
        const newPrice = market.price * (1 + change / 100);
        const newChange = market.change + (Math.random() - 0.5) * 0.2;
        
        return {
          ...market,
          price: newPrice,
          change: newChange
        };
      }));

      setVolatility(prev => {
        const target = 0.5 + Math.random() * 0.8;
        return prev + (target - prev) * 0.1;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return { marketData, volatility };
}
