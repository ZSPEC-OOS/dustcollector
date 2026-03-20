import { useCallback, useRef, useState } from 'react';
import { Stats, Config, Trade, SimulationState, MarketData } from '../types';

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

  const generateTrade = useCallback((currentStats: Stats, currentConfig: Config): Trade | null => {
    const liveMarkets = marketDataRef.current.filter(m => m.bid > 0 && m.ask > 0);
    if (liveMarkets.length === 0) return null;

    const market = liveMarkets[Math.floor(Math.random() * liveMarkets.length)];
    const spread = market.bid > 0 ? ((market.ask - market.bid) / market.bid) * 100 : 0;

    if (spread < currentConfig.minSpread) return null;

    const costs = 0.10;
    const netProfitPct = spread - costs;
    if (netProfitPct <= 0) return null;

    const isWin = Math.random() < 0.65;
    const actualNetProfit = isWin ? netProfitPct : -netProfitPct * 0.5;

    const tradeSize = currentStats.capital * (currentConfig.tradeSizePercent / 100);
    const profit = tradeSize * (actualNetProfit / 100);

    const regime = spread > 0.05 ? 'extreme' : spread > 0.02 ? 'high' : spread > 0.01 ? 'normal' : 'low';

    return {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      pair: `${market.symbol}-USDT`,
      regime,
      spread,
      size: tradeSize,
      expectedProfit: tradeSize * (netProfitPct / 100),
      actualProfit: profit,
      netProfit: profit,
      status: 'completed'
    };
  }, []);

  const startSimulation = useCallback((speed: number = 1) => {
    if (simulationRef.current) return;
    setSimulationState('running');
    setStats(prev => ({ ...prev, isRunning: true, isPaused: false }));

    const interval = Math.max(100, 1000 / speed);

    simulationRef.current = setInterval(() => {
      setStats(currentStats => {
        const now = Date.now();

        if (now - currentStats.lastTradeTime < config.cooldownSeconds * 1000) {
          return currentStats;
        }

        if (currentStats.dailyLoss > currentStats.capital * 0.10) {
          setSimulationState('paused');
          return { ...currentStats, isPaused: true, pauseReason: 'daily_loss_limit' };
        }

        const trade = generateTrade(currentStats, config);
        if (!trade) return currentStats;

        const newCapital = currentStats.capital + trade.netProfit;
        const isWin = trade.netProfit > 0;

        const updated: Stats = {
          ...currentStats,
          capital: newCapital,
          realizedProfit: currentStats.realizedProfit + trade.netProfit,
          totalTrades: currentStats.totalTrades + 1,
          winningTrades: isWin ? currentStats.winningTrades + 1 : currentStats.winningTrades,
          losingTrades: !isWin ? currentStats.losingTrades + 1 : currentStats.losingTrades,
          winRate: ((isWin ? currentStats.winningTrades + 1 : currentStats.winningTrades) / (currentStats.totalTrades + 1)) * 100,
          tradesToday: currentStats.tradesToday + 1,
          dailyProfit: isWin ? currentStats.dailyProfit + trade.netProfit : currentStats.dailyProfit,
          dailyLoss: !isWin ? currentStats.dailyLoss + Math.abs(trade.netProfit) : currentStats.dailyLoss,
          lastTradeTime: now,
          currentRegime: trade.regime
        };

        setTrades(prev => [trade, ...prev].slice(0, 1000));

        if (updated.totalTrades % 10 === 0) {
          setLogs(prev => [`Milestone: ${updated.totalTrades} trades completed`, ...prev].slice(0, 500));
        }

        return updated;
      });
    }, interval);
  }, [config, generateTrade]);

  const pauseSimulation = useCallback(() => {
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }
    setSimulationState('paused');
    setStats(prev => ({ ...prev, isRunning: false, isPaused: true }));
  }, []);

  const resetSimulation = useCallback(() => {
    if (simulationRef.current) {
      clearInterval(simulationRef.current);
      simulationRef.current = null;
    }
    setSimulationState('idle');
    setStats({
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
    });
    setTrades([]);
  }, []);

  const updateConfig = useCallback((_newConfig: Config) => {
    // Config updates apply immediately via closure ref
  }, []);

  return {
    simulationState,
    startSimulation,
    pauseSimulation,
    resetSimulation,
    updateConfig
  };
}
