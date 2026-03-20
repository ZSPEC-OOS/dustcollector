import React, { useState } from 'react';
import { Config, RealTradingStatus } from '../types';
import { Settings, Info, ExternalLink, Eye, EyeOff, AlertTriangle, Zap, FlaskConical } from 'lucide-react';

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

  // Reality Score: 0–100 representing how close to real-world conditions
  const realityScore = (() => {
    if (config.realityPreset === 'optimistic') return 0;
    if (config.realityPreset === 'realistic')  return 100;
    let score = 0;
    if (config.takerFee >= 0.1)                score += 25;
    if (config.infrastructureLatencyMs >= 100) score += 25;
    const compScore = { retail: 25, semipro: 15, light: 8, none: 0 };
    score += compScore[config.competitionLevel] ?? 0;
    const freqScore = { realistic: 25, moderate: 15, optimistic: 0 };
    score += freqScore[config.opportunityFrequency] ?? 0;
    return score;
  })();

  const INFRA_OPTIONS: { label: string; desc: string; ms: number }[] = [
    { label: 'Browser',      desc: '+150–250ms (typical home broadband → REST API)',  ms: 200 },
    { label: 'Node Server',  desc: '+20–50ms (remote VPS, no co-location)',           ms: 35  },
    { label: 'VPS Near Exch',desc: '+5–15ms (cloud VM in same region as Binance)',    ms: 10  },
    { label: 'Co-located',   desc: '+1–3ms (server physically inside exchange DC)',   ms: 2   },
  ];

  const COMPETITION_OPTIONS: { value: Config['competitionLevel']; label: string; desc: string }[] = [
    { value: 'none',    label: 'None',     desc: 'Testing only — no competition modeled' },
    { value: 'light',   label: 'Light',    desc: '~20 bots — obscure pairs, thin markets' },
    { value: 'semipro', label: 'Semi-Pro', desc: '~100 bots — minor pairs, some competition' },
    { value: 'retail',  label: 'Retail',   desc: '~500 bots — major pairs on Binance (realistic)' },
  ];

  const FEE_TIERS: { label: string; taker: number; maker: number; note: string }[] = [
    { label: 'Retail (default)',  taker: 0.100, maker: 0.020, note: 'No BNB, no VIP' },
    { label: 'Retail + BNB',      taker: 0.075, maker: 0.015, note: '25% BNB discount' },
    { label: 'VIP 1',             taker: 0.090, maker: 0.018, note: '$1M/mo volume' },
    { label: 'VIP 5',             taker: 0.040, maker: 0.012, note: '$150M/mo volume' },
    { label: 'VIP 9 (max)',       taker: 0.020, maker: 0.010, note: '>$4B/mo volume' },
    { label: 'Maker w/ BNB+VIP1', taker: 0.090, maker: 0.025, note: 'Old sim default' },
  ];

  const swarmTotal  = config.swarmBotCount * config.swarmBotSize;
  const swarmPct    = ((swarmTotal / config.initialCapital) * 100).toFixed(1);
  const swarmOver   = swarmTotal > config.initialCapital;
  const swarmWarn   = swarmTotal > config.initialCapital * 0.95 && !swarmOver;
  const belowMinimum = config.swarmBotSize < 10;

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

      {/* Reality Check */}
      <div className="bg-slate-900 border border-purple-500/40 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <FlaskConical className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-bold text-purple-400">Reality Check</h3>
          <span className="ml-auto text-xs text-slate-500">
            accuracy: <span className={`font-bold ${realityScore >= 75 ? 'text-green-400' : realityScore >= 40 ? 'text-yellow-400' : 'text-orange-400'}`}>{realityScore}/100</span>
          </span>
        </div>

        {/* Reality Score bar */}
        <div className="mb-4">
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${realityScore >= 75 ? 'bg-green-500' : realityScore >= 40 ? 'bg-yellow-500' : 'bg-orange-500'}`}
              style={{ width: `${realityScore}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-600 mt-1">
            <span>Optimistic (learning)</span>
            <span>Real-world accurate</span>
          </div>
        </div>

        {/* Preset selector */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {([
            { value: 'optimistic', label: '⚡ Optimistic', desc: 'Ideal conditions. Educational — shows potential.' },
            { value: 'realistic',  label: '🌍 Realistic',  desc: 'Real constraints: taker fees, latency, 500+ bot competition.' },
            { value: 'custom',     label: '⚙ Custom',      desc: 'Manually tune each parameter.' },
          ] as const).map(p => (
            <button
              key={p.value}
              onClick={() => onUpdate({ realityPreset: p.value })}
              className={`p-3 rounded-lg border text-left transition-all ${
                config.realityPreset === p.value
                  ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                  : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
              }`}
            >
              <div className="font-bold text-sm">{p.label}</div>
              <div className="text-xs opacity-60 mt-1 leading-tight">{p.desc}</div>
            </button>
          ))}
        </div>

        {/* Summary of active constraints */}
        {config.realityPreset !== 'optimistic' && (
          <div className="bg-slate-800/60 rounded-lg px-4 py-3 mb-4 text-xs font-mono space-y-1">
            <div className="text-slate-400 font-medium mb-2">Active constraints:</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
              <div>Order type: <span className="text-purple-300">{config.orderType === 'market' ? 'Market (taker)' : 'Limit (maker)'}</span></div>
              <div>Fee/leg: <span className="text-purple-300">{config.orderType === 'market' ? config.takerFee : config.makerFee}% × 3 legs = {((config.orderType === 'market' ? config.takerFee : config.makerFee) * 3).toFixed(3)}% total</span></div>
              <div>Latency: <span className="text-purple-300">{config.infrastructureLatencyMs}ms one-way</span></div>
              <div>Competitors: <span className="text-purple-300">~{({ none: 1, light: 20, semipro: 100, retail: 500 })[config.competitionLevel]} bots</span></div>
              <div>Opp. lifetime: <span className="text-purple-300">{{ realistic: '10–50ms', relaxed: '100–500ms', simulated: '5–60s' }[config.opportunityLifetime]}</span></div>
              <div>Opp. frequency: <span className="text-purple-300">~{{ realistic: '2', moderate: '10', optimistic: '360' }[config.opportunityFrequency]}/hr</span></div>
            </div>
          </div>
        )}

        {/* Custom sub-settings */}
        {config.realityPreset === 'custom' && (
          <div className="space-y-4">

            {/* Order type */}
            <div>
              <div className="text-sm font-medium text-slate-300 mb-2">Order Type</div>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'market', label: 'Market (Taker)', desc: 'Instant fill. Binance default: 0.1%/leg.' },
                  { value: 'limit',  label: 'Limit (Maker)',  desc: 'May not fill before gap closes. 0.025%/leg.' },
                ] as const).map(o => (
                  <button key={o.value} onClick={() => onUpdate({ orderType: o.value })}
                    className={`p-3 rounded-lg border text-left transition-all text-sm ${config.orderType === o.value ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                    <div className="font-bold">{o.label}</div>
                    <div className="text-xs opacity-60 mt-1">{o.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Fee tier */}
            <div>
              <div className="text-sm font-medium text-slate-300 mb-2">Fee Tier</div>
              <div className="grid grid-cols-1 gap-2">
                {FEE_TIERS.map(tier => (
                  <button
                    key={tier.label}
                    onClick={() => onUpdate({ takerFee: tier.taker, makerFee: tier.maker })}
                    className={`px-4 py-2 rounded-lg border text-left transition-all text-xs flex items-center justify-between ${
                      config.takerFee === tier.taker && config.makerFee === tier.maker
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <span className="font-medium">{tier.label}</span>
                    <span className="font-mono text-slate-500">taker {tier.taker}% · maker {tier.maker}% — {tier.note}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Infrastructure / Latency */}
            <div>
              <div className="text-sm font-medium text-slate-300 mb-2">Infrastructure (Latency)</div>
              <div className="grid grid-cols-2 gap-2">
                {INFRA_OPTIONS.map(opt => (
                  <button
                    key={opt.label}
                    onClick={() => onUpdate({ infrastructureLatencyMs: opt.ms })}
                    className={`p-3 rounded-lg border text-left transition-all text-xs ${
                      config.infrastructureLatencyMs === opt.ms
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-bold">{opt.label} <span className="font-mono">({opt.ms}ms)</span></div>
                    <div className="opacity-60 mt-1 leading-tight">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Competition level */}
            <div>
              <div className="text-sm font-medium text-slate-300 mb-2">Competition Level</div>
              <div className="grid grid-cols-2 gap-2">
                {COMPETITION_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => onUpdate({ competitionLevel: opt.value })}
                    className={`p-3 rounded-lg border text-left transition-all text-xs ${
                      config.competitionLevel === opt.value
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300'
                        : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'
                    }`}
                  >
                    <div className="font-bold">{opt.label}</div>
                    <div className="opacity-60 mt-1">{opt.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Opportunity lifetime */}
            <div>
              <div className="text-sm font-medium text-slate-300 mb-2">Opportunity Lifetime</div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'realistic', label: '10–50ms',  desc: 'HFT reality — near-impossible for retail' },
                  { value: 'relaxed',   label: '100–500ms', desc: 'Some retail chance with fast infra' },
                  { value: 'simulated', label: '5–60s',     desc: 'Sim default — gaps persist for seconds' },
                ] as const).map(o => (
                  <button key={o.value} onClick={() => onUpdate({ opportunityLifetime: o.value })}
                    className={`p-3 rounded-lg border text-left transition-all text-xs ${config.opportunityLifetime === o.value ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                    <div className="font-bold font-mono">{o.label}</div>
                    <div className="opacity-60 mt-1 leading-tight">{o.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Opportunity frequency */}
            <div>
              <div className="text-sm font-medium text-slate-300 mb-2">Opportunity Frequency</div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'realistic',  label: '~2/hr',   desc: 'Genuine arb gaps survive long enough for retail' },
                  { value: 'moderate',   label: '~10/hr',  desc: 'Moderate — mid-tier pairs or manual monitoring' },
                  { value: 'optimistic', label: '~360/hr', desc: 'Sim default — treated as always available' },
                ] as const).map(o => (
                  <button key={o.value} onClick={() => onUpdate({ opportunityFrequency: o.value })}
                    className={`p-3 rounded-lg border text-left transition-all text-xs ${config.opportunityFrequency === o.value ? 'bg-purple-500/20 border-purple-500 text-purple-300' : 'bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-500'}`}>
                    <div className="font-bold font-mono">{o.label}</div>
                    <div className="opacity-60 mt-1 leading-tight">{o.desc}</div>
                  </button>
                ))}
              </div>
            </div>

          </div>
        )}

        {config.realityPreset === 'optimistic' && (
          <p className="text-xs text-slate-500 italic leading-relaxed">
            Optimistic mode uses ideal conditions: maker fees, instant execution, minimal competition.
            Great for learning how the strategy works — not representative of real trading outcomes.
            Switch to <span className="text-purple-400">Realistic</span> to see true expected performance.
          </p>
        )}
      </div>

      {/* Swarm Mode */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-bold text-yellow-400">Swarm Mode</h3>
            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
              {config.swarmMode ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          <button
            onClick={() => onUpdate({ swarmMode: !config.swarmMode })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              config.swarmMode ? 'bg-yellow-500' : 'bg-slate-600'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              config.swarmMode ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>

        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Instead of one large trade, deploy multiple small bots simultaneously on the same market signal.
          Each bot races independently — most will profit, some will be sacrificed to fees.
          Reduces slippage, averages entry price, and stabilises win rate across 95% confidence bands.
        </p>

        {config.swarmMode && (
          <div className="space-y-4">
            {/* Bot count */}
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">Bot Count</label>
                <span className="text-yellow-400 font-mono text-sm">{config.swarmBotCount} bots</span>
              </div>
              <input
                type="range"
                min={2}
                max={50}
                step={1}
                value={config.swarmBotCount}
                onChange={(e) => onUpdate({ swarmBotCount: Number(e.target.value) })}
                className="w-full accent-yellow-400"
              />
              <p className="text-xs text-slate-500 mt-2">
                Bots per swarm attack. All fire simultaneously on the same opportunity.
              </p>
            </div>

            {/* Bot size */}
            <div className="bg-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">Capital Per Bot</label>
                <span className="text-yellow-400 font-mono text-sm">${config.swarmBotSize}</span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={1}
                value={config.swarmBotSize}
                onChange={(e) => onUpdate({ swarmBotSize: Number(e.target.value) })}
                className="w-full accent-yellow-400"
              />
              {belowMinimum && (
                <div className="mt-2 text-xs text-orange-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Binance requires ~$10 minimum notional per order in real mode
                </div>
              )}
              {!belowMinimum && (
                <p className="text-xs text-slate-500 mt-2">
                  Trade size per bot. Binance spot minimum is ~$10/order.
                </p>
              )}
            </div>

            {/* Swarm summary */}
            <div className={`rounded-lg px-4 py-3 text-xs border font-mono ${
              swarmOver
                ? 'bg-red-500/10 border-red-500/30 text-red-400'
                : swarmWarn
                  ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                  : 'bg-yellow-500/5 border-yellow-500/20 text-yellow-300'
            }`}>
              <div className="font-bold mb-2 text-sm">
                {swarmOver ? '✗ Exceeds capital' : swarmWarn ? '⚠ Near capital limit' : '✓ Swarm configured'}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <div>Bots deployed: <span className="font-bold">{config.swarmBotCount}</span></div>
                <div>Capital per bot: <span className="font-bold">${config.swarmBotSize}</span></div>
                <div>Total deployed: <span className="font-bold">${swarmTotal.toFixed(0)}</span></div>
                <div>% of capital: <span className="font-bold">{swarmPct}%</span></div>
                <div>Reserved (buffer): <span className="font-bold">${(config.initialCapital - swarmTotal).toFixed(2)}</span></div>
                <div>Fee / swarm: <span className="font-bold">${(() => {
                  const feeRate = config.realityPreset !== 'optimistic'
                    ? (config.orderType === 'market' ? config.takerFee : config.makerFee)
                    : config.exchangeFee;
                  const legs = config.realityPreset !== 'optimistic' ? 3 : 2;
                  return (config.swarmBotCount * config.swarmBotSize * feeRate * legs / 100).toFixed(4);
                })()}</span></div>
              </div>
              {swarmOver && (
                <div className="mt-2 opacity-80">
                  Reduce bot count or bot size so total ≤ ${config.initialCapital.toFixed(0)} capital.
                </div>
              )}
            </div>

            {/* Rate limit note */}
            <div className="text-xs text-slate-500 bg-slate-800/50 rounded-lg px-4 py-3">
              <div className="font-medium text-slate-400 mb-1">Exchange constraints (real mode):</div>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Binance: 50 orders / 10s per API key — {config.swarmBotCount} bots × 3 legs = {config.swarmBotCount * 3} orders</li>
                <li>All bots share the same signal; execution order is random</li>
                <li>Later bots may face worse fills as early bots partially close the gap</li>
              </ul>
            </div>
          </div>
        )}

        {!config.swarmMode && (
          <div className="text-xs text-slate-500 italic">
            Enable to split capital into {config.swarmBotCount} × ${config.swarmBotSize} bots per attack instead of a single {config.tradeSizePercent}% trade.
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
            const isRealistic = config.realityPreset !== 'optimistic';
            const feeRate     = isRealistic
              ? (config.orderType === 'market' ? config.takerFee : config.makerFee)
              : config.exchangeFee;
            const legs        = isRealistic ? 3 : 2;
            const totalFee    = feeRate * legs;
            const isProfitable = config.minSpread > totalFee * 1.5;
            return (
              <div className={`rounded-lg px-4 py-3 text-xs border ${
                isProfitable
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                <div className="font-bold mb-1">{isProfitable ? '✓ Profitable settings' : '✗ Unprofitable settings'}</div>
                <div className="space-y-0.5 font-mono">
                  <div>Fee model: <span className="font-bold">{feeRate}% × {legs} legs = {totalFee.toFixed(3)}% total</span>
                    {isRealistic && <span className="text-slate-500 ml-1">(tri-arb, {config.orderType})</span>}
                  </div>
                  <div>Break-even spread: <span className="font-bold">{totalFee.toFixed(3)}%</span></div>
                  <div>Your min spread threshold: <span className="font-bold">{config.minSpread.toFixed(3)}%</span></div>
                  <div>Net margin: <span className={`font-bold ${isProfitable ? 'text-green-300' : 'text-red-300'}`}>
                    {(config.minSpread - totalFee).toFixed(3)}%
                  </span></div>
                </div>
                {!isProfitable && (
                  <div className="mt-2 opacity-80">
                    Raise Min Spread above {(totalFee * 1.5).toFixed(3)}% or lower fees to turn profitable.
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
            <ConfigSlider label="Minimum Spread Threshold" value={config.minSpread} min={0.02} max={2.00} step={0.01} unit="%" onChange={(v) => onUpdate({ minSpread: v })} description="Minimum real bid/ask spread required to attempt a trade (realistic tri-arb needs >0.30% to clear 3-leg fees)" />
            {!config.swarmMode && (
              <ConfigSlider label="Trade Size (single-bot mode)" value={config.tradeSizePercent} min={50} max={95} step={5} unit="%" onChange={(v) => onUpdate({ tradeSizePercent: v })} description="Percentage of capital used per trade (swarm mode uses bot size × count instead)" />
            )}
            <ConfigSlider label="Max Trades Per Hour" value={config.maxTradesPerHour} min={10} max={600} step={10} unit="" onChange={(v) => onUpdate({ maxTradesPerHour: v })} description="Maximum trade frequency (safety limit)" />
            <ConfigSlider label="Cooldown Between Attacks" value={config.cooldownSeconds} min={5} max={300} step={5} unit="s" onChange={(v) => onUpdate({ cooldownSeconds: v })} description={config.swarmMode ? 'Minimum time between swarm attacks' : 'Minimum time between trades'} />
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
