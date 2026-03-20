import React from 'react';
import { Trade } from '../types';
import { formatTime, formatCurrency } from '../utils/formatters';

interface TradeRowProps {
  trade: Trade;
}

export const TradeRow: React.FC<TradeRowProps> = ({ trade }) => {
  const isProfit = trade.netProfit > 0;
  
  return (
    <div className="grid grid-cols-6 gap-4 py-3 px-4 border-b border-slate-800 hover:bg-slate-800/50 text-sm transition-colors">
      <span className="text-slate-500">{formatTime(trade.timestamp)}</span>
      <span className="text-cyan-400 font-medium">{trade.pair}</span>
      <span className="text-slate-400 capitalize">{trade.regime}</span>
      <span className="text-yellow-400">{trade.spread.toFixed(4)}%</span>
      <span className={isProfit ? 'text-green-400' : 'text-red-400'}>
        {isProfit ? '+' : ''}{formatCurrency(trade.netProfit)}
      </span>
      <span className={`text-xs px-2 py-1 rounded text-center ${
        trade.status === 'completed' ? 'bg-green-500/20 text-green-400' : 
        trade.status === 'failed' ? 'bg-red-500/20 text-red-400' : 
        'bg-yellow-500/20 text-yellow-400'
      }`}>
        {trade.status}
      </span>
    </div>
  );
};
