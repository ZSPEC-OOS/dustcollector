import { useCallback, useRef, useState } from 'react';
import { Stats, Config, Trade, SimulationState, MarketData } from '../types';

const EMPTY_STATS = (capital: number): Stats => ({
  capital, initialCapital: capital,
  realizedProfit: 0, grossProfit: 0, totalFees: 0,
  totalTrades: 0, winningTrades: 0, losingTrades: 0,
  winRate: 0, avgProfit: 0, tradesToday: 0, dailyProfit: 0, dailyLoss: 0,
  isRunning: false, isPaused: false, pauseReason: null,
  lastTradeTime: 0, currentRegime: 'normal',
});

// Regime thresholds based on opportunity size in %
const REGIME = (opp: number): Trade['regime'] =>
  opp > 0.40 ? 'extreme' : opp > 0.20 ? 'high' : opp > 0.08 ? 'normal' : 'low';

// Realistic per-trade execution success (front-running, latency, partial fills)
const EXEC_RATE: Record<Config['strategy'], number> = {
  conservative: 0.82,
  balanced:     0.75,
  aggressive:   0.68,
  adaptive:     0.78,
};

function detectOpportunity(market: MarketData, cfg: Config): number | null {
  // The raw bid/ask spread on a single exchange (e.g. BTC ~0.001%) is
  // not the profit – it's the base signal. An HFT arb bot detects
  // CROSS-PAIR / TRIANGULAR / STATISTICAL discrepancies that are a
  // multiple of the base spread, driven by volatility and regime.
  const baseSignal = market.volatility > 0 ? market.volatility : 0.005; // %

  // Regime multiplier: how often does the market throw big opportunities
  const regimeMult = { low: 2, normal: 6, high: 16, extreme: 35 }[cfg.riskLevel === 'high' ? 'extreme' : cfg.riskLevel === 'low' ? 'low' : 'normal'];

  // Random draw — only a fraction of ticks have a real opportunity
  if (Math.random() > 0.30) return null; // 70% of ticks: no arb detected

  const rawOpp = baseSignal * regimeMult * (0.5 + Math.random() * 2.0); // variance

  // Bot won't even touch it if the opportunity doesn't exceed fees + buffer
  const feeRoundTrip = (cfg.exchangeFee * 2) / 100; // decimal
  const minProfitable = feeRoundTrip * 100 * 1.5; // need 1.5× fees as margin

  if (rawOpp < Math.max(cfg.minSpread, minProfitable)) return null;

  return rawOpp; // opportunity size in %
}

export function useSimulation(
  _stats: Stats,
  config: Config,
  marketData: MarketData[],
  setStats: React.Dispatch<React.SetStateAction<Stats>>,
  setTrades: React.Dispatch<React.SetStateAction<Trade[]>>,
  setLogs: React.Dispatch<React.SetStateAction<string[]>>
) {
  const simulationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [simulationState, setSimulationState] = useState<SimulationState>('idle');
  const marketDataRef = useRef<MarketData[]>(marketData);
  marketDataRef.current = marketData;
  const configRef = useRef<Config>(config);
  configRef.current = config;

  const generateTrade = useCallback((currentStats: Stats, cfg: Config): Trade | null => {
    const live = marketDataRef.current.filter(m => m.price > 0);
    if (live.length === 0) return null;

    const market = live[Math.floor(Math.random() * live.length)];
    const opportunity = detectOpportunity(market, cfg);
    if (!opportunity) return null;

    const feeRateTotal = (cfg.exchangeFee * 2) / 100;       // e.g. 0.0005
    const tradeSize    = currentStats.capital * (cfg.tradeSizePercent / 100);
    const fee          = tradeSize * feeRateTotal;

    // Gross if fully captured; net = gross - fee
    const grossProfit  = tradeSize * (opportunity / 100);
    const netIfWin     = grossProfit - fee;

    // Execution: some trades slip or get front-run
    const execRate = EXEC_RATE[cfg.strategy];
    const isWin    = Math.random() < execRate;

    // On a loss the bot still pays fees + small slippage
    const netProfit = isWin ? netIfWin : -(fee * 1.2);

    return {
      id:           Math.random().toString(36).substr(2, 9),
      timestamp:    Date.now(),
      pair:         `${market.symbol}/USDT`,
      regime:       REGIME(opportunity),
      spread:       opportunity,
      size:         tradeSize,
      expectedProfit: netIfWin,
      grossProfit:  isWin ? grossProfit : 0,
      fee,
      actualProfit: netProfit,
      netProfit,
      status:       'completed',
    };
  }, []);

  const startSimulation = useCallback((speed: number = 1) => {
    if (simulationRef.current) return;
    setSimulationState('running');
    setStats(prev => ({ ...prev, isRunning: true, isPaused: false }));

    const interval = Math.max(50, 1000 / speed);

    simulationRef.current = setInterval(() => {
      setStats(curr => {
        const now = Date.now();
        const cfg = configRef.current;

        if (now - curr.lastTradeTime < cfg.cooldownSeconds * 1000) return curr;

        const lossLimit = curr.initialCapital * (cfg.riskLevel === 'high' ? 0.20 : cfg.riskLevel === 'low' ? 0.05 : 0.10);
        if (curr.dailyLoss > lossLimit) {
          setSimulationState('paused');
          return { ...curr, isPaused: true, pauseReason: 'Daily loss limit hit — bot paused' };
        }

        const trade = generateTrade(curr, cfg);
        if (!trade) return curr;

        const isWin      = trade.netProfit > 0;
        const total      = curr.totalTrades + 1;
        const wins       = isWin ? curr.winningTrades + 1 : curr.winningTrades;
        const newCapital = curr.capital + trade.netProfit;

        setTrades(prev => [trade, ...prev].slice(0, 1000));

        if (total % 10 === 0) {
          const roi = ((newCapital - curr.initialCapital) / curr.initialCapital * 100).toFixed(3);
          setLogs(prev => [
            `[${new Date().toLocaleTimeString()}] ${total} trades | ROI: ${roi}% | Fees: $${(curr.totalFees + trade.fee).toFixed(6)}`,
            ...prev
          ].slice(0, 500));
        }

        return {
          ...curr,
          capital:        newCapital,
          grossProfit:    curr.grossProfit + trade.grossProfit,
          totalFees:      curr.totalFees + trade.fee,
          realizedProfit: curr.realizedProfit + trade.netProfit,
          totalTrades:    total,
          winningTrades:  wins,
          losingTrades:   !isWin ? curr.losingTrades + 1 : curr.losingTrades,
          winRate:        (wins / total) * 100,
          avgProfit:      (curr.realizedProfit + trade.netProfit) / total,
          tradesToday:    curr.tradesToday + 1,
          dailyProfit:    isWin  ? curr.dailyProfit + trade.netProfit  : curr.dailyProfit,
          dailyLoss:      !isWin ? curr.dailyLoss   + Math.abs(trade.netProfit) : curr.dailyLoss,
          lastTradeTime:  now,
          currentRegime:  trade.regime,
        };
      });
    }, interval);
  }, [generateTrade]);

  const pauseSimulation = useCallback(() => {
    if (simulationRef.current) { clearInterval(simulationRef.current); simulationRef.current = null; }
    setSimulationState('paused');
    setStats(prev => ({ ...prev, isRunning: false, isPaused: true }));
  }, []);

  const resetSimulation = useCallback(() => {
    if (simulationRef.current) { clearInterval(simulationRef.current); simulationRef.current = null; }
    setSimulationState('idle');
    setStats(EMPTY_STATS(configRef.current.initialCapital));
    setTrades([]);
  }, []);

  const updateConfig = useCallback((_newConfig: Config) => { /* applied via configRef */ }, []);

  return { simulationState, startSimulation, pauseSimulation, resetSimulation, updateConfig };
}
