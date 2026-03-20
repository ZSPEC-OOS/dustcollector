export interface Stats {
  capital: number;
  initialCapital: number;
  realizedProfit: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  avgProfit: number;
  tradesToday: number;
  dailyProfit: number;
  dailyLoss: number;
  isRunning: boolean;
  isPaused: boolean;
  pauseReason: string | null;
  lastTradeTime: number;
  currentRegime: 'low' | 'normal' | 'high' | 'extreme';
}

export interface Trade {
  id: string;
  timestamp: number;
  pair: string;
  regime: 'low' | 'normal' | 'high' | 'extreme';
  spread: number;
  size: number;
  expectedProfit: number;
  actualProfit: number;
  netProfit: number;
  status: 'completed' | 'failed' | 'pending';
}

export interface Config {
  initialCapital: number;
  minSpread: number;
  tradeSizePercent: number;
  maxTradesPerHour: number;
  cooldownSeconds: number;
  strategy: 'conservative' | 'balanced' | 'aggressive' | 'adaptive';
  enablePredictive: boolean;
  batchSize: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface MarketData {
  symbol: string;
  price: number;
  change: number;
  volatility: number;
}

export type SimulationState = 'idle' | 'running' | 'paused' | 'error';

export interface SimulationParams {
  speed: number;
  duration: number;
  initialCapital: number;
}
