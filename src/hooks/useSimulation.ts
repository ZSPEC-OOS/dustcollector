import { useCallback, useRef, useState } from 'react';
import { Stats, Config, Trade, SimulationState, MarketData } from '../types';
import { CrossPairMap, TRIANGLES } from './useMarketData';

// ---------------------------------------------------------------------------
// Slippage model — based on estimated daily liquidity per pair.
// A $100 trade on BTC has negligible slippage; AR has thin books.
// ---------------------------------------------------------------------------
const DAILY_VOL_USD: Record<string, number> = {
  BTC: 2_000_000_000,
  ETH: 1_000_000_000,
  BNB:   500_000_000,
  SOL:   300_000_000,
  ADA:   150_000_000,
  DOT:    80_000_000,
  LINK:   80_000_000,
  AR:      5_000_000,
};

/** Returns slippage in % for a given trade size */
function slippagePct(symbol: string, tradeSize: number): number {
  const vol = DAILY_VOL_USD[symbol] ?? 50_000_000;
  const relativeSize = tradeSize / vol;
  return Math.sqrt(relativeSize) * 20;
}

// ---------------------------------------------------------------------------
// Execution success rate — strategy + competition for the opportunity size.
// Small arb gaps close in milliseconds; larger ones persist longer.
// ---------------------------------------------------------------------------
const BASE_EXEC: Record<Config['strategy'], number> = {
  conservative: 0.84,
  balanced:     0.76,
  aggressive:   0.69,
  adaptive:     0.79,
};

function execRate(strategy: Config['strategy'], opportunityPct: number): number {
  const base = BASE_EXEC[strategy];
  const competitionPenalty = Math.max(0, (0.15 - opportunityPct) / 0.15) * 0.25;
  return Math.max(0.30, base - competitionPenalty);
}

// ---------------------------------------------------------------------------
// PRIMARY: Real triangular arbitrage using live cross-pair prices.
// ---------------------------------------------------------------------------
function calcTriangularArb(
  usdtPairs: MarketData[],
  crossPairs: CrossPairMap,
): { symbol: string; opportunityPct: number; path: string } | null {
  const btc = usdtPairs.find(m => m.symbol === 'BTC');
  if (!btc?.bid || !btc?.ask) return null;

  let best: { symbol: string; opportunityPct: number; path: string } | null = null;

  for (const tri of TRIANGLES) {
    const aUsdt = usdtPairs.find(m => m.symbol === tri.base);
    const crossKey = (tri.base + 'BTC').toUpperCase();
    const cross = crossPairs.get(crossKey);

    if (!aUsdt?.bid || !aUsdt?.ask || !cross?.bid || !cross?.ask) continue;

    const forward = (1 / btc.ask) * (1 / cross.ask) * aUsdt.bid;
    const reverse = (1 / aUsdt.ask) * cross.bid * btc.bid;

    const fwdPct = (forward - 1) * 100;
    const revPct = (reverse - 1) * 100;
    const best1  = fwdPct > revPct ? { pct: fwdPct, path: `USDT→BTC→${tri.base}→USDT` }
                                   : { pct: revPct, path: `USDT→${tri.base}→BTC→USDT` };

    if (best1.pct > 0 && (!best || best1.pct > best.opportunityPct)) {
      best = { symbol: tri.base, opportunityPct: best1.pct, path: best1.path };
    }
  }

  return best;
}

// ---------------------------------------------------------------------------
// FALLBACK: Volatility-based opportunity model.
// ---------------------------------------------------------------------------
function detectVolatilityOpp(
  market: MarketData,
  allMarkets: MarketData[],
  cfg: Config,
): { symbol: string; opportunityPct: number; path: string } | null {
  const baseVol = market.volatility > 0 ? market.volatility : 0.002;
  const oppFreq = Math.min(0.40, baseVol * 3);
  if (Math.random() > oppFreq) return null;

  const avgVol       = allMarkets.reduce((s, m) => s + (m.volatility || 0), 0) / (allMarkets.length || 1);
  const disconnect   = Math.max(1, baseVol / Math.max(avgVol, 0.001));
  const opportunityPct = baseVol * (1.5 + Math.random() * 8.5 * disconnect);

  const feeRoundTrip  = cfg.exchangeFee * 2;
  const minProfitable = feeRoundTrip * 1.5;
  if (opportunityPct < Math.max(cfg.minSpread, minProfitable)) return null;

  return { symbol: market.symbol, opportunityPct, path: `${market.symbol}/USDT spread` };
}

// ---------------------------------------------------------------------------
// Detect the best available signal from live market data.
// ---------------------------------------------------------------------------
function detectSignal(
  live: MarketData[],
  crossPairs: CrossPairMap,
  cfg: Config,
): { symbol: string; opportunityPct: number; path: string } | null {
  const feeRoundTrip = cfg.exchangeFee * 2;

  let signal = calcTriangularArb(live, crossPairs);
  if (signal && signal.opportunityPct < feeRoundTrip * 1.5) signal = null;

  if (!signal) {
    const market = live[Math.floor(Math.random() * live.length)];
    signal = detectVolatilityOpp(market, live, cfg);
  }

  return signal;
}

// ---------------------------------------------------------------------------
// Build a single trade from a signal at a given trade size.
// botLabel is optional — used by swarm mode to tag trades with bot #.
// ---------------------------------------------------------------------------
function buildTrade(
  signal: { symbol: string; opportunityPct: number; path: string },
  tradeSize: number,
  cfg: Config,
  botLabel?: string,
): Trade | null {
  const { symbol, opportunityPct, path } = signal;
  const feeRoundTrip = cfg.exchangeFee * 2;
  const slip        = slippagePct(symbol, tradeSize);
  const netOppPct   = opportunityPct - slip;
  const feeRateDec  = feeRoundTrip / 100;
  const fee         = tradeSize * feeRateDec;
  const grossProfit = tradeSize * (opportunityPct / 100);
  const netIfWin    = tradeSize * (netOppPct / 100) - fee;

  if (netIfWin <= 0) return null;

  const rate      = execRate(cfg.strategy, opportunityPct);
  const isWin     = Math.random() < rate;
  const netProfit = isWin ? netIfWin : -(fee + tradeSize * slip / 100);

  return {
    id:             Math.random().toString(36).substr(2, 9),
    timestamp:      Date.now(),
    pair:           botLabel ? `[${botLabel}] ${path}` : path,
    regime:         REGIME(opportunityPct),
    spread:         opportunityPct,
    size:           tradeSize,
    expectedProfit: netIfWin,
    grossProfit:    isWin ? grossProfit : 0,
    fee,
    actualProfit:   netProfit,
    netProfit,
    status:         'completed',
  };
}

// ---------------------------------------------------------------------------
const EMPTY_STATS = (capital: number): Stats => ({
  capital, initialCapital: capital,
  realizedProfit: 0, grossProfit: 0, totalFees: 0,
  totalTrades: 0, winningTrades: 0, losingTrades: 0,
  winRate: 0, avgProfit: 0, tradesToday: 0, dailyProfit: 0, dailyLoss: 0,
  isRunning: false, isPaused: false, pauseReason: null,
  lastTradeTime: 0, currentRegime: 'normal',
  totalSwarms: 0, lastSwarmWins: 0, lastSwarmTotal: 0,
  swarmBotsWon: 0, swarmBotsLost: 0,
});

const REGIME = (opp: number): Trade['regime'] =>
  opp > 0.40 ? 'extreme' : opp > 0.20 ? 'high' : opp > 0.08 ? 'normal' : 'low';

export function useSimulation(
  _stats: Stats,
  config: Config,
  marketData: MarketData[],
  crossPairs: CrossPairMap,
  setStats: React.Dispatch<React.SetStateAction<Stats>>,
  setTrades: React.Dispatch<React.SetStateAction<Trade[]>>,
  setLogs: React.Dispatch<React.SetStateAction<string[]>>
) {
  const simulationRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const [simulationState, setSimulationState] = useState<SimulationState>('idle');
  const marketRef  = useRef<MarketData[]>(marketData);
  const crossRef   = useRef<CrossPairMap>(crossPairs);
  const configRef  = useRef<Config>(config);
  marketRef.current  = marketData;
  crossRef.current   = crossPairs;
  configRef.current  = config;

  // ---------------------------------------------------------------------------
  // Single-bot trade generation (normal mode)
  // ---------------------------------------------------------------------------
  const generateTrade = useCallback((curr: Stats, cfg: Config): Trade | null => {
    const live = marketRef.current.filter(m => m.price > 0);
    if (live.length === 0) return null;

    const signal = detectSignal(live, crossRef.current, cfg);
    if (!signal) return null;

    const tradeSize = curr.capital * (cfg.tradeSizePercent / 100);
    return buildTrade(signal, tradeSize, cfg);
  }, []);

  // ---------------------------------------------------------------------------
  // Swarm generation — all bots act on the same market signal simultaneously,
  // each with independent win/loss probability.
  // ---------------------------------------------------------------------------
  const generateSwarm = useCallback((cfg: Config): Trade[] => {
    const live = marketRef.current.filter(m => m.price > 0);
    if (live.length === 0) return [];

    const signal = detectSignal(live, crossRef.current, cfg);
    if (!signal) return [];

    const trades: Trade[] = [];
    for (let i = 0; i < cfg.swarmBotCount; i++) {
      const trade = buildTrade(signal, cfg.swarmBotSize, cfg, `B${i + 1}`);
      if (trade) trades.push(trade);
    }
    return trades;
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

        // Live regime from average market volatility
        const mData = marketRef.current;
        const avgVol = mData.reduce((s, m) => s + (m.volatility || 0), 0) / (mData.length || 1);
        const liveRegime: Trade['regime'] =
          avgVol > 0.10 ? 'extreme' : avgVol > 0.04 ? 'high' : avgVol > 0.01 ? 'normal' : 'low';

        // ----------------------------------------------------------------
        // SWARM MODE
        // ----------------------------------------------------------------
        if (cfg.swarmMode) {
          const swarmTrades = generateSwarm(cfg);
          if (swarmTrades.length === 0) return curr;

          const swarmWins    = swarmTrades.filter(t => t.netProfit > 0).length;
          const swarmLosses  = swarmTrades.length - swarmWins;
          const swarmNet     = swarmTrades.reduce((s, t) => s + t.netProfit, 0);
          const swarmGross   = swarmTrades.reduce((s, t) => s + t.grossProfit, 0);
          const swarmFees    = swarmTrades.reduce((s, t) => s + t.fee, 0);
          const swarmDailyP  = swarmTrades.filter(t => t.netProfit > 0).reduce((s, t) => s + t.netProfit, 0);
          const swarmDailyL  = swarmTrades.filter(t => t.netProfit < 0).reduce((s, t) => s + Math.abs(t.netProfit), 0);

          const totalTrades  = curr.totalTrades + swarmTrades.length;
          const totalWins    = curr.winningTrades + swarmWins;
          const newCapital   = curr.capital + swarmNet;
          const swarmNum     = curr.totalSwarms + 1;
          const newRealized  = curr.realizedProfit + swarmNet;

          setTrades(prev => [...swarmTrades, ...prev].slice(0, 1000));

          const winPct = ((swarmWins / swarmTrades.length) * 100).toFixed(0);
          const src = crossRef.current.size > 0 ? 'tri-arb' : 'spread-arb';
          setLogs(prev => [
            `[${new Date().toLocaleTimeString()}] SWARM #${swarmNum} [${src}]: ${swarmWins}/${swarmTrades.length} bots won (${winPct}%) | Net: $${swarmNet.toFixed(6)} | Fees: $${swarmFees.toFixed(6)}`,
            ...prev
          ].slice(0, 500));

          return {
            ...curr,
            capital:         newCapital,
            grossProfit:     curr.grossProfit + swarmGross,
            totalFees:       curr.totalFees + swarmFees,
            realizedProfit:  newRealized,
            totalTrades,
            winningTrades:   totalWins,
            losingTrades:    curr.losingTrades + swarmLosses,
            winRate:         (totalWins / totalTrades) * 100,
            avgProfit:       newRealized / totalTrades,
            tradesToday:     curr.tradesToday + swarmTrades.length,
            dailyProfit:     curr.dailyProfit + swarmDailyP,
            dailyLoss:       curr.dailyLoss + swarmDailyL,
            lastTradeTime:   now,
            currentRegime:   liveRegime,
            totalSwarms:     swarmNum,
            lastSwarmWins:   swarmWins,
            lastSwarmTotal:  swarmTrades.length,
            swarmBotsWon:    curr.swarmBotsWon + swarmWins,
            swarmBotsLost:   curr.swarmBotsLost + swarmLosses,
          };
        }

        // ----------------------------------------------------------------
        // SINGLE-BOT MODE
        // ----------------------------------------------------------------
        const trade = generateTrade(curr, cfg);
        if (!trade) return curr;

        const isWin      = trade.netProfit > 0;
        const total      = curr.totalTrades + 1;
        const wins       = isWin ? curr.winningTrades + 1 : curr.winningTrades;
        const newCapital = curr.capital + trade.netProfit;

        setTrades(prev => [trade, ...prev].slice(0, 1000));

        if (total % 10 === 0) {
          const roi = ((newCapital - curr.initialCapital) / curr.initialCapital * 100).toFixed(3);
          const src = crossRef.current.size > 0 ? 'triangular+spread arb' : 'spread arb (no cross-pair data yet)';
          setLogs(prev => [
            `[${new Date().toLocaleTimeString()}] ${total} trades | ROI: ${roi}% | Fees: $${(curr.totalFees + trade.fee).toFixed(6)} | ${src}`,
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
          currentRegime:  liveRegime,
        };
      });
    }, interval);
  }, [generateTrade, generateSwarm]);

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
