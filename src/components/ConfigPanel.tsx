import React, { useState } from 'react';
import { Config, RealTradingStatus } from '../types';
import { Settings, Info, ExternalLink, Eye, EyeOff, AlertTriangle } from 'lucide-react';

interface ConfigPanelProps {
  config: Config;
  onUpdate: (config: Partial<Config>) => void;
  realStatus: RealTradingStatus;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onUpdate, realStatus }) => {
  const [showSecret, setShowSecret] = useState(false);

  const strategies = [
    { value: 'conservative', label: 'Conservative', desc: 'High spreads, low frequency' },
    { value: 'balanced',     label: 'Balanced',     desc: 'Moderate spreads and frequency' },
    { value: 'aggressive',   label: 'Aggressive',   desc: 'Lower spreads, higher frequency' },
    { value: 'adaptive',     label: 'Adaptive Ultra-HF', desc: 'Dynamic based on volatility' },
  ];

  const riskLevels = [
    { value: 'low',    label: 'Low Risk',    desc: 'Max 5% daily loss' },
    { value: 'medium', label: 'Medium Risk', desc: 'Max 10% daily loss' },
    { value: 'high',   label: 'High Risk',   desc: 'Max 20% daily loss' },
  ];

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Mode selector */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-cyan-400">Trading Mode</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onUpdate({ mode: 'test' })}
            className={`p-4 rounded-lg border text-left transition-all ${
              config.mode === 'test'
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
            }`}
          >
            <div className="font-bold">⚡ Test Mode</div>
            <div className="text-xs opacity-60 mt-1">Simulated trades · real market data · no risk</div>
          </button>
          <button
            onClick={() => onUpdate({ mode: 'real' })}
            className={`p-4 rounded-lg border text-left transition-all ${
              config.mode === 'real'
                ? 'bg-red-500/20 border-red-500 text-red-400'
                : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
            }`}
          >
            <div className="font-bold">🔴 Real Mode</div>
            <div className="text-xs opacity-60 mt-1">Live Binance orders · real money · real risk</div>
          </button>
        </div>

        {config.mode === 'real' && (
          <div className="mt-3 flex items-start gap-2 text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-xs">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Real mode places actual orders on Binance using your funds. Only enable if you understand the risks. Note: direct browser→Binance API calls may be blocked by CORS — a backend proxy may be required for order execution.</span>
          </div>
        )}
      </div>

      {/* API Keys */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-cyan-400">Binance API</h3>
            {realStatus.connected && <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full">Connected</span>}
          </div>
          <a
            href="https://www.binance.com/en/my/settings/api-management"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Get API Key <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-slate-400 mb-1">API Key</label>
            <input
              type="text"
              value={config.apiKey}
              onChange={(e) => onUpdate({ apiKey: e.target.value })}
              placeholder="Paste your Binance API key"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-cyan-500 text-slate-200 placeholder-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">API Secret</label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                value={config.apiSecret}
                onChange={(e) => onUpdate({ apiSecret: e.target.value })}
                placeholder="Paste your Binance API secret"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:border-cyan-500 text-slate-200 placeholder-slate-600"
              />
              <button
                onClick={() => setShowSecret(s => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {realStatus.error && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded p-2">
              {realStatus.error}
            </div>
          )}

          <p className="text-xs text-slate-600">
            Keys are stored in memory only and never sent anywhere except Binance. Enable "Spot Trading" permission and restrict by IP for safety.
          </p>
        </div>
      </div>

      {/* Capital & Fees */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-bold text-cyan-400 mb-4">Capital & Fees</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {config.mode === 'real' ? 'Starting Capital (USDT)' : 'Simulated Starting Capital (USD)'}
            </label>
            <div className="flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-lg px-3 py-2">
              <span className="text-cyan-400 font-mono">$</span>
              <input
                type="number"
                min={0.00001}
                step={0.01}
                value={config.initialCapital}
                onChange={(e) => onUpdate({ initialCapital: Math.max(0.00001, Number(e.target.value)) })}
                className="bg-transparent flex-1 text-cyan-400 font-mono text-sm focus:outline-none"
              />
            </div>
            <p className="text-xs text-slate-600 mt-1">Changing this resets the simulation</p>
          </div>

          <ConfigSlider
            label="Exchange Fee (per side)"
            value={config.exchangeFee}
            min={0.01}
            max={0.5}
            step={0.005}
            unit="%"
            onChange={(v) => onUpdate({ exchangeFee: v })}
            description={`Round-trip: ${(config.exchangeFee * 2).toFixed(3)}% · Binance taker 0.1%, maker 0.025% (with BNB VIP)`}
          />

          {/* Profitability check */}
          {(() => {
            const roundTrip = config.exchangeFee * 2;
            const isProfitable = config.minSpread > roundTrip * 1.5;
            return (
              <div className={`rounded-lg px-4 py-3 text-xs border ${
                isProfitable
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                <div className="font-bold mb-1">{isProfitable ? '✓ Profitable settings' : '✗ Unprofitable settings'}</div>
                <div className="space-y-0.5 font-mono">
                  <div>Min spread required to break even: <span className="font-bold">{roundTrip.toFixed(3)}%</span></div>
                  <div>Your min spread threshold: <span className="font-bold">{config.minSpread.toFixed(3)}%</span></div>
                  <div>Net margin per trade: <span className={`font-bold ${isProfitable ? 'text-green-300' : 'text-red-300'}`}>
                    {(config.minSpread - roundTrip).toFixed(3)}%
                  </span></div>
                </div>
                {!isProfitable && (
                  <div className="mt-2 opacity-80">
                    Lower Exchange Fee or raise Min Spread Threshold above {(roundTrip * 1.5).toFixed(3)}% to profit.
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>

      {/* Strategy */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-bold text-cyan-400 mb-4">Strategy Configuration</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Trading Strategy</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {strategies.map(strat => (
                <button
                  key={strat.value}
                  onClick={() => onUpdate({ strategy: strat.value as Config['strategy'] })}
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
            <ConfigSlider label="Minimum Spread Threshold" value={config.minSpread} min={0.02} max={0.30} step={0.01} unit="%" onChange={(v) => onUpdate({ minSpread: v })} description="Minimum real bid/ask spread required to attempt a trade" />
            <ConfigSlider label="Trade Size" value={config.tradeSizePercent} min={50} max={95} step={5} unit="%" onChange={(v) => onUpdate({ tradeSizePercent: v })} description="Percentage of capital used per trade" />
            <ConfigSlider label="Max Trades Per Hour" value={config.maxTradesPerHour} min={10} max={600} step={10} unit="" onChange={(v) => onUpdate({ maxTradesPerHour: v })} description="Maximum trade frequency (safety limit)" />
            <ConfigSlider label="Cooldown Period" value={config.cooldownSeconds} min={10} max={300} step={10} unit="s" onChange={(v) => onUpdate({ cooldownSeconds: v })} description="Minimum time between trades" />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">Risk Management</label>
            <div className="flex flex-wrap gap-3">
              {riskLevels.map(risk => (
                <button
                  key={risk.value}
                  onClick={() => onUpdate({ riskLevel: risk.value as Config['riskLevel'] })}
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
    </div>
  );
};

const ConfigSlider: React.FC<{
  label: string; value: number; min: number; max: number; step: number;
  unit: string; onChange: (val: number) => void; description?: string;
}> = ({ label, value, min, max, step, unit, onChange, description }) => (
  <div className="bg-slate-800 rounded-lg p-4">
    <div className="flex items-center justify-between mb-2">
      <label className="text-sm font-medium text-slate-300">{label}</label>
      <span className="text-cyan-400 font-mono text-sm">{value}{unit}</span>
    </div>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full" />
    {description && <p className="text-xs text-slate-500 mt-2">{description}</p>}
  </div>
);
