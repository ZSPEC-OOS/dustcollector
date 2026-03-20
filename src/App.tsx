import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RotateCcw, TrendingUp, Activity, DollarSign, BarChart3, AlertTriangle } from 'lucide-react';
import { Trade, Stats, Config } from './types';
import { useSimulation } from './hooks/useSimulation';
import { useMarketData } from './hooks/useMarketData';
import { formatCurrency, formatCurrencyDetailed, formatPercentage } from './utils/formatters';
import { StatCard } from './components/StatCard';
import { TradeRow } from './components/TradeRow';
import { ConfigPanel } from './components/ConfigPanel';
import { MarketTicker } from './components/MarketTicker';
import { SimulationChart } from './components/SimulationChart';
import { LogConsole } from './components/LogConsole';

const DEFAULT_CONFIG: Config = {
  initialCapital: 1.00,
  minSpread: 0.07,
  tradeSizePercent: 80,
  maxTradesPerHour: 60,
  cooldownSeconds: 60,
  strategy: 'adaptive',
  enablePredictive: true,
  batchSize: 5,
  riskLevel: 'medium'
};

const INITIAL_STATS: Stats = {
  capital: 1.00,
  initialCapital: 1.00,
  realizedProfit: 0.00,
  totalTrades: 0,
  winningTrades: 0,
  losingTrades: 0,
  winRate: 0,
  avgProfit: 0,
  tradesToday: 0,
  dailyProfit: 0,
  dailyLoss: 0,
  isRunning: false,
  isPaused: false,
  pauseReason: null,
  lastTradeTime: 0,
  currentRegime: 'normal'
};

function App() {
  const [stats, setStats] = useState<Stats>(INITIAL_STATS);
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'trades' | 'config' | 'logs'>('dashboard');
  const [simulationSpeed, setSimulationSpeed] = useState<number>(1);
  const [elapsed, setElapsed] = useState<number>(0);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  
  const { marketData, volatility } = useMarketData();
  const {
    startSimulation,
    pauseSimulation,
    resetSimulation,
    updateConfig
  } = useSimulation(stats, config, setStats, setTrades, setLogs);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 500));
  }, []);

  useEffect(() => {
    addLog('Dust Collector v2.0 initialized');
    addLog('Test Mode: Simulating AO Permaweb environment');
    addLog('Market data feed connected (8 pairs)');
  }, []);

  const handleStart = () => {
    if (stats.isRunning) {
      pauseSimulation();
      if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
      addLog('Simulation paused');
    } else {
      startTimeRef.current = Date.now() - elapsed * 1000;
      elapsedRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
      startSimulation(simulationSpeed);
      addLog(`Simulation started (speed: ${simulationSpeed}x)`);
    }
  };

  const handleReset = () => {
    resetSimulation();
    if (elapsedRef.current) { clearInterval(elapsedRef.current); elapsedRef.current = null; }
    setElapsed(0);
    setLogs([]);
    addLog('Simulation reset');
  };

  const handleConfigUpdate = (newConfig: Partial<Config>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    updateConfig(updated);
    if (newConfig.initialCapital !== undefined) {
      setStats(prev => ({
        ...prev,
        capital: newConfig.initialCapital!,
        initialCapital: newConfig.initialCapital!,
        realizedProfit: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        tradesToday: 0,
        dailyProfit: 0,
        dailyLoss: 0,
      }));
    }
    addLog(`Config updated: ${JSON.stringify(newConfig)}`);
  };

  const chartData = React.useMemo(() => {
    const data = [];
    let capital = stats.initialCapital;
    
    for (let i = 0; i <= 30; i++) {
      const dailyReturn = stats.totalTrades > 0 
        ? (stats.realizedProfit / stats.totalTrades) * (config.maxTradesPerHour * 24) / stats.initialCapital
        : 0.005;
        
      capital = capital * (1 + dailyReturn);
      
      data.push({
        day: i,
        capital: capital,
        profit: capital - stats.initialCapital,
        projected: stats.initialCapital * Math.pow(1.025, i)
      });
    }
    return data;
  }, [stats, config]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-mono">
      <div className="relative max-w-7xl mx-auto p-4 md:p-6">
        <header className="mb-6 border-b border-cyan-500/30 pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-cyan-400 tracking-tight">
                ◈ DUST COLLECTOR
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Ultra-HF Micro-Arbitrage Simulator // Test Mode
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/50 text-yellow-400 text-xs rounded-full font-medium">
                ⚡ TEST MODE
              </div>
              <div className="px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/50 text-cyan-400 text-xs rounded-full font-medium">
                v2.0.0
              </div>
            </div>
          </div>
        </header>

        <MarketTicker data={marketData} volatility={volatility} />

        <nav className="flex flex-wrap gap-2 mb-6">
          {(['dashboard', 'trades', 'config', 'logs'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                  : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                title="Capital"
                value={formatCurrency(stats.capital)}
                subvalue={`+${formatCurrency(stats.capital - stats.initialCapital)}`}
                trend={stats.capital >= stats.initialCapital ? 'up' : 'down'}
                icon={DollarSign}
              />
              <StatCard
                title="Total Profit"
                value={formatCurrencyDetailed(stats.realizedProfit)}
                subvalue={`${formatPercentage((stats.realizedProfit / stats.initialCapital) * 100)} ROI`}
                trend="up"
                icon={TrendingUp}
              />
              <StatCard
                title="Win Rate"
                value={`${stats.winRate.toFixed(1)}%`}
                subvalue={`${stats.winningTrades}/${stats.totalTrades} trades`}
                trend={stats.winRate > 60 ? 'up' : 'down'}
                icon={Activity}
              />
              <StatCard
                title="Today's Trades"
                value={stats.tradesToday.toString()}
                subvalue={`+${formatCurrency(stats.dailyProfit)} / -${formatCurrency(stats.dailyLoss)}`}
                trend={stats.dailyProfit > stats.dailyLoss ? 'up' : 'down'}
                icon={BarChart3}
              />
            </div>

            <SimulationChart data={chartData} />

            <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
              <div className="flex flex-wrap items-center gap-4">
                <button
                  onClick={handleStart}
                  className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
                    stats.isRunning
                      ? 'bg-yellow-500/20 border border-yellow-500 text-yellow-400 hover:bg-yellow-500/30'
                      : 'bg-green-500/20 border border-green-500 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  {stats.isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                  {stats.isRunning ? 'PAUSE' : 'START'}
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 transition-all"
                >
                  <RotateCcw className="w-5 h-5" />
                  RESET
                </button>

                <span className="font-mono text-sm text-slate-400">
                  {String(Math.floor(elapsed / 3600)).padStart(2, '0')}:{String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
                </span>

                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-sm text-slate-400">Speed:</span>
                  <select
                    value={simulationSpeed}
                    onChange={(e) => setSimulationSpeed(Number(e.target.value))}
                    className="bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm"
                  >
                    <option value={1}>1x (Real-time)</option>
                    <option value={10}>10x</option>
                    <option value={100}>100x</option>
                    <option value={1000}>1000x (Instant)</option>
                  </select>
                </div>
              </div>

              {stats.isPaused && (
                <div className="mt-4 flex items-center gap-2 text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">Bot paused: {stats.pauseReason}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
            <div className="grid grid-cols-6 gap-4 py-3 px-4 bg-slate-800 text-xs uppercase text-slate-400 font-medium">
              <span>Time</span>
              <span>Pair</span>
              <span>Regime</span>
              <span>Spread</span>
              <span>Profit</span>
              <span>Status</span>
            </div>
            <div className="max-h-[500px] overflow-y-auto">
              {trades.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  No trades yet. Start simulation to see trades.
                </div>
              ) : (
                trades.map(trade => <TradeRow key={trade.id} trade={trade} />)
              )}
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <ConfigPanel config={config} onUpdate={handleConfigUpdate} />
        )}

        {activeTab === 'logs' && (
          <LogConsole logs={logs} />
        )}

        <footer className="mt-8 pt-4 border-t border-slate-800 text-center text-slate-600 text-sm">
          <p>Dust Collector Test Mode // Simulating AO Permaweb Environment</p>
          <p className="mt-1">Real market data • Simulated execution • Risk-free testing</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
