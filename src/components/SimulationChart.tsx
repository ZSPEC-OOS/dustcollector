import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartData {
  day: number;
  capital: number;
  profit: number;
  projected: number;
}

interface Props {
  data: ChartData[];
}

export const SimulationChart: React.FC<Props> = ({ data }) => {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
      <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">30-Day Projection</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <defs>
            <linearGradient id="colorCapital" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `$${v.toFixed(0)}`} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
            itemStyle={{ color: '#94a3b8' }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
          />
          <Line
            type="monotone"
            dataKey="capital"
            stroke="#06b6d4"
            strokeWidth={2}
            dot={false}
            name="Projected Capital"
          />
          <Line
            type="monotone"
            dataKey="projected"
            stroke="#10b981"
            strokeWidth={1}
            strokeDasharray="5 5"
            dot={false}
            name="Target (2.5%/day)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
