import React from 'react';
import { Trade } from '../types';
import { formatTime, formatCurrencyDetailed } from '../utils/formatters';

interface TradeRowProps {
  trade: Trade;
}

export const TradeRow: React.FC<TradeRowProps> = ({ trade }) => {
  const isProfit = trade.netProfit > 0;

  return (
    <div className="grid grid-cols-7 gap-2 py-3 px-4 border-b border-slate-800 hover:bg-slate-800/50 text-xs transition-colors">
      <span className="text-slate-500">{formatTime(trade.timestamp)}</span>
      <span className="text-cyan-400 font-medium">{trade.pair}</span>
      <span className="text-yellow-400">{trade.spread.toFixed(4)}%</span>
      <span className="text-slate-400">{formatCurrencyDetailed(trade.size)}</span>
      <span className={trade.grossProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
        {trade.grossProfit >= 0 ? '+' : ''}{formatCurrencyDetailed(trade.grossProfit)}
      </span>
      <span className="text-orange-400">-{formatCurrencyDetailed(trade.fee)}</span>
      <span className={isProfit ? 'text-cyan-400 font-bold' : 'text-red-400 font-bold'}>
        {isProfit ? '+' : ''}{formatCurrencyDetailed(trade.netProfit)}
      </span>
    </div>
  );
};
