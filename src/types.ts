export interface Stats {
  capital: number;
  initialCapital: number;
  realizedProfit: number;
  grossProfit: number;
  totalFees: number;
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
  // Swarm stats
  totalSwarms: number;
  lastSwarmWins: number;
  lastSwarmTotal: number;
  swarmBotsWon: number;
  swarmBotsLost: number;
}

export interface Trade {
  id: string;
  timestamp: number;
  pair: string;
  regime: 'low' | 'normal' | 'high' | 'extreme';
  spread: number;
  size: number;
  expectedProfit: number;
  grossProfit: number;
  fee: number;
  actualProfit: number;
  netProfit: number;
  status: 'completed' | 'failed' | 'pending';
}

export interface Config {
  mode: 'test' | 'real';
  initialCapital: number;
  apiKey: string;
  apiSecret: string;
  exchangeFee: number;
  minSpread: number;
  tradeSizePercent: number;
  maxTradesPerHour: number;
  cooldownSeconds: number;
  strategy: 'conservative' | 'balanced' | 'aggressive' | 'adaptive';
  enablePredictive: boolean;
  batchSize: number;
  riskLevel: 'low' | 'medium' | 'high';
  // Swarm mode
  swarmMode: boolean;
  swarmBotCount: number;   // number of bots per swarm attack
  swarmBotSize: number;    // capital per bot in USD
  // Reality Check
  realityPreset: 'optimistic' | 'realistic' | 'custom';
  orderType: 'market' | 'limit';
  takerFee: number;              // % per side — Binance default 0.1%
  makerFee: number;              // % per side — Binance maker with BNB 0.025%
  infrastructureLatencyMs: number; // one-way ms latency to exchange
  competitionLevel: 'none' | 'light' | 'semipro' | 'retail';
  opportunityLifetime: 'simulated' | 'relaxed' | 'realistic';
  opportunityFrequency: 'optimistic' | 'moderate' | 'realistic';
}

export interface MarketData {
  symbol: string;
  stream: string;
  price: number;
  change: number;
  volatility: number;
  bid: number;
  ask: number;
  connected: boolean;
}

export type SimulationState = 'idle' | 'running' | 'paused' | 'error';

export interface SimulationParams {
  speed: number;
  duration: number;
  initialCapital: number;
}

export interface RealTradingStatus {
  connected: boolean;
  balance: number;
  balanceCurrency: string;
  lastOrderId: string | null;
  error: string | null;
}
