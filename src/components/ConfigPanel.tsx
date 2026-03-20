import React from 'react';
import { Config } from '../types';
import { Settings, Info } from 'lucide-react';

interface ConfigPanelProps {
  config: Config;
  onUpdate: (config: Partial<Config>) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onUpdate }) => {
  const strategies = [
    { value: 'conservative', label: 'Conservative', desc: 'High spreads, low frequency' },
    { value: 'balanced', label: 'Balanced', desc: 'Moderate spreads and frequency' },
    { value: 'aggressive', label: 'Aggressive', desc: 'Lower spreads, higher frequency' },
    { value: 'adaptive', label: 'Adaptive Ultra-HF', desc: 'Dynamic based on volatility' }
  ];

  const riskLevels = [
    { value: 'low', label: 'Low Risk', desc: 'Max 5% daily loss' },
    { value: 'medium', label: 'Medium Risk', desc: 'Max 10% daily loss' },
    { value: 'high', label: 'High Risk', desc: 'Max 20% daily loss' }
  ];

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-cyan-400" />
        <h3 className="text-lg font-bold text-cyan-400">Strategy Configuration</h3>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">Trading Strategy</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {strategies.map(strat => (
              <button
                key={strat.value}
                onClick={() => onUpdate({ strategy: strat.value as any })}
                className={`p-4 rounded-lg border text-left transition-all ${
                  config.strategy === strat.value
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                    : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                <div className="font-medium">{strat.label}</div>
                <div className="text-xs opacity-60 mt-1">{strat.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <ConfigSlider
            label="Minimum Spread Threshold"
            value={config.minSpread}
            min={0.02}
            max={0.30}
            step={0.01}
            unit="%"
            onChange={(v) => onUpdate({ minSpread: v })}
            description="Minimum price difference required to trade"
          />

          <ConfigSlider
            label="Trade Size"
            value={config.tradeSizePercent}
            min={50}
            max={95}
            step={5}
            unit="%"
            onChange={(v) => onUpdate({ tradeSizePercent: v })}
            description="Percentage of capital used per trade"
          />

          <ConfigSlider
            label="Max Trades Per Hour"
            value={config.maxTradesPerHour}
            min={10}
            max={600}
            step={10}
            unit=""
            onChange={(v) => onUpdate({ maxTradesPerHour: v })}
            description="Maximum trade frequency (safety limit)"
          />

          <ConfigSlider
            label="Cooldown Period"
            value={config.cooldownSeconds}
            min={10}
            max={300}
            step={10}
            unit="s"
            onChange={(v) => onUpdate({ cooldownSeconds: v })}
            description="Minimum time between trades"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">Risk Management</label>
          <div className="flex flex-wrap gap-3">
            {riskLevels.map(risk => (
              <button
                key={risk.value}
                onClick={() => onUpdate({ riskLevel: risk.value as any })}
                className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                  config.riskLevel === risk.value
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                    : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                }`}
              >
                {risk.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-slate-700">
          <label className="flex items-center justify-between p-3 bg-slate-800 rounded-lg cursor-pointer hover:bg-slate-700 transition-colors">
            <div className="flex items-center gap-3">
              <Info className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-sm font-medium">Predictive Trading</div>
                <div className="text-xs text-slate-500">Use order book analysis to front-run</div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={config.enablePredictive}
              onChange={(e) => onUpdate({ enablePredictive: e.target.checked })}
              className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-cyan-500 focus:ring-cyan-500"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

const ConfigSlider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (val: number) => void;
  description?: string;
}> = ({ label, value, min, max, step, unit, onChange, description }) => (
  <div className="bg-slate-800 rounded-lg p-4">
    <div className="flex items-center justify-between mb-2">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <span className="text-cyan-400 font-mono text-sm">
        {value}{unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full"
    />
    {description && (
      <p className="text-xs text-slate-500 mt-2">{description}</p>
    )}
  </div>
);
