import React from 'react';
import { MarketData } from '../types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MarketTickerProps {
  data: MarketData[];
  volatility: number;
}

export const MarketTicker: React.FC<MarketTickerProps> = ({ data, volatility }) => {
  const connected = data.some(d => d.connected);

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Live Markets</h3>
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
          <span className="text-xs text-slate-500">{connected ? 'Binance' : 'Connecting...'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-500">Avg Spread:</span>
          <span className={`font-mono ${volatility > 0.05 ? 'text-red-400' : volatility > 0.02 ? 'text-yellow-400' : 'text-green-400'}`}>
            {volatility.toFixed(4)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {data.map(pair => (
          <div key={pair.symbol} className="bg-slate-800 rounded-lg p-3 text-center">
            <div className="text-cyan-400 font-bold text-sm">{pair.symbol}</div>
            <div className="text-white font-mono text-xs mt-1">
              {pair.price > 0 ? `$${pair.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}` : '—'}
            </div>
            <div className={`flex items-center justify-center gap-1 text-xs mt-1 ${
              pair.change >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {pair.price > 0 && (pair.change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
              {pair.price > 0 ? `${Math.abs(pair.change).toFixed(2)}%` : '—'}
            </div>
            {pair.bid > 0 && (
              <div className="text-xs text-slate-500 mt-1 font-mono">
                {((pair.ask - pair.bid) / pair.bid * 100).toFixed(4)}%
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
