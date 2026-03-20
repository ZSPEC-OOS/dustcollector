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
  // Model: slippage grows with sqrt of order size relative to market depth
  // A $100 order on BTC (~0.000005% of daily vol) → ~0.0002% slippage
  // A $100 order on AR (~0.002% of daily vol)     → ~0.04% slippage
  const relativeSize = tradeSize / vol;
  return Math.sqrt(relativeSize) * 20; // calibrated constant
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
  // Opportunities < 0.1% are hyper-competitive (dozens of bots hunting them)
  // Opportunities > 0.3% are rarer but face less competition
  const competitionPenalty = Math.max(0, (0.15 - opportunityPct) / 0.15) * 0.25;
  return Math.max(0.30, base - competitionPenalty);
}

// ---------------------------------------------------------------------------
// PRIMARY: Real triangular arbitrage using live cross-pair prices.
// Checks USDT→BTC→A→USDT vs USDT→A→BTC→USDT for each triangle.
// Returns the best real arb gap found, or null.
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

    // Forward:  USDT → BTC → A → USDT
    //   Step 1: buy BTC  with USDT at btc.ask
    //   Step 2: buy A    with BTC  at cross.ask
    //   Step 3: sell A   for USDT  at aUsdt.bid
    //   Net = (1/btc.ask) * (1/cross.ask) * aUsdt.bid  — if > 1, profit exists
    const forward = (1 / btc.ask) * (1 / cross.ask) * aUsdt.bid;

    // Reverse:  USDT → A → BTC → USDT
    //   Step 1: buy A    with USDT at aUsdt.ask
    //   Step 2: sell A   for BTC  at cross.bid
    //   Step 3: sell BTC for USDT at btc.bid
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
// FALLBACK: Volatility-based opportunity model when cross-pair data isn't
// available yet. Scales with actual live spread data.
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
const EMPTY_STATS = (capital: number): Stats => ({
  capital, initialCapital: capital,
  realizedProfit: 0, grossProfit: 0, totalFees: 0,
  totalTrades: 0, winningTrades: 0, losingTrades: 0,
  winRate: 0, avgProfit: 0, tradesToday: 0, dailyProfit: 0, dailyLoss: 0,
  isRunning: false, isPaused: false, pauseReason: null,
  lastTradeTime: 0, currentRegime: 'normal',
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

  const generateTrade = useCallback((curr: Stats, cfg: Config): Trade | null => {
    const live = marketRef.current.filter(m => m.price > 0);
    if (live.length === 0) return null;

    const feeRoundTrip = cfg.exchangeFee * 2; // %

    // --- Try real triangular arb first ---
    let signal = calcTriangularArb(live, crossRef.current);

    // Triangular arb must still clear fees + buffer to be worth it
    if (signal && signal.opportunityPct < feeRoundTrip * 1.5) signal = null;

    // --- Fallback: volatility-based model ---
    if (!signal) {
      const market = live[Math.floor(Math.random() * live.length)];
      signal = detectVolatilityOpp(market, live, cfg);
    }

    if (!signal) return null;

    const { symbol, opportunityPct, path } = signal;
    const tradeSize = curr.capital * (cfg.tradeSizePercent / 100);

    // --- Slippage: reduces effective gross profit ---
    const slip        = slippagePct(symbol, tradeSize);
    const netOppPct   = opportunityPct - slip;   // real net opportunity after slippage
    const feeRateDec  = feeRoundTrip / 100;
    const fee         = tradeSize * feeRateDec;
    const grossProfit = tradeSize * (opportunityPct / 100);
    const netIfWin    = tradeSize * (netOppPct / 100) - fee;

    // Skip if slippage + fee makes it unviable
    if (netIfWin <= 0) return null;

    // --- Competition-adjusted execution rate ---
    const rate   = execRate(cfg.strategy, opportunityPct);
    const isWin  = Math.random() < rate;
    const netProfit = isWin ? netIfWin : -(fee + tradeSize * slip / 100);

    return {
      id:             Math.random().toString(36).substr(2, 9),
      timestamp:      Date.now(),
      pair:           path,
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
          const src = crossRef.current.size > 0 ? 'triangular+spread arb' : 'spread arb (no cross-pair data yet)';
          setLogs(prev => [
            `[${new Date().toLocaleTimeString()}] ${total} trades | ROI: ${roi}% | Fees: $${(curr.totalFees + trade.fee).toFixed(6)} | ${src}`,
            ...prev
          ].slice(0, 500));
        }

        // Regime from actual average live volatility
        const mData = marketRef.current;
        const avgVol = mData.reduce((s, m) => s + (m.volatility || 0), 0) / (mData.length || 1);
        const liveRegime: Trade['regime'] =
          avgVol > 0.10 ? 'extreme' : avgVol > 0.04 ? 'high' : avgVol > 0.01 ? 'normal' : 'low';

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
