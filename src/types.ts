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
  takerFee: number;              // % per side â Binance default 0.1%
  makerFee: number;              // % per side â Binance maker with BNB 0.025%
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

// ============================================
// STRATEGY BRAIN MODULE TYPES
// ============================================

export type StrategyStatus = 'idle' | 'active' | 'error';
export type SignalDirection = 'STRONG_BUY' | 'BUY' | 'SELL' | 'STRONG_SELL' | 'NONE';
export type TrendRegime = 'bullish' | 'bearish' | 'neutral' | 'volatile';
export type VolatilityRegime = 'low' | 'normal' | 'elevated' | 'extreme';

export interface StrategyConfig {
  riskPerTrade: number;
  maxPositionSize: number;
  minConfidence: number;
  timeframes: string[];
  symbols: string[];
  antiManipulation: boolean;
  adaptiveSizing: boolean;
}

export interface MarketRegime {
  trend: TrendRegime;
  volatilityRegime: VolatilityRegime;
}

export interface TradingSignal {
  direction: SignalDirection;
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  positionSizePct: number;
  regime: MarketRegime;
  reasoning: string[];
  timestamp: number;
  symbol: string;
}

export interface StrategyTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: 'basic' | 'advanced' | 'ml';
  inputs: string[];
  outputs: string[];
  defaultConfig: StrategyConfig;
}

export interface StrategyInstance {
  instanceId: string;
  templateId: string;
  name: string;
  icon: string;
  description: string;
  inputs: string[];
  outputs: string[];
  position: { x: number; y: number };
  config: StrategyConfig;
  status: StrategyStatus;
  lastSignal: TradingSignal | null;
  signals: TradingSignal[];
  createdAt: number;
  updatedAt: number;
}

export interface ConnectionMapping {
  [key: string]: string;
}

export interface StrategyConnection {
  id: string;
  sourceId: string;
  targetId: string;
  mapping: ConnectionMapping;
}

export interface StrategyBrainState {
  instances: StrategyInstance[];
  connections: StrategyConnection[];
  selectedInstanceId: string | null;
  isConfigPanelOpen: boolean;
  draggedTemplate: StrategyTemplate | null;
}

export interface StrategyPerformanceMetrics {
  totalSignals: number;
  winRate: number;
  avgRiskReward: number;
  totalPnl: number;
  maxDrawdown: number;
  profitableTrades: number;
  losingTrades: number;
}
