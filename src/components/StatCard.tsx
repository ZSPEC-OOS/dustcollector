import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  subvalue?: string;
  trend: 'up' | 'down' | 'neutral';
  icon: LucideIcon;
}

export const StatCard: React.FC<StatCardProps> = ({ title, value, subvalue, trend, icon: Icon }) => {
  const trendColors = {
    up: 'text-green-400 border-green-500/30',
    down: 'text-red-400 border-red-500/30',
    neutral: 'text-cyan-400 border-cyan-500/30'
  };

  return (
    <div className={`bg-slate-900 border rounded-lg p-4 ${trendColors[trend]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">{title}</span>
        <Icon className="w-4 h-4 opacity-60" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {subvalue && <div className="text-xs opacity-60 mt-1">{subvalue}</div>}
    </div>
  );
};
