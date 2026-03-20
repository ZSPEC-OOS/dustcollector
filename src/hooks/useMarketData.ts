import { useState, useEffect, useRef, useCallback } from 'react';
import { MarketData } from '../types';

// USDT pairs — price + bid/ask for simulation
const USDT_PAIRS = [
  // Tier 1 — top market cap, very liquid
  { symbol: 'BTC',   binance: 'BTCUSDT',   gecko: 'bitcoin',            spread: 0.015 },
  { symbol: 'ETH',   binance: 'ETHUSDT',   gecko: 'ethereum',           spread: 0.020 },
  { symbol: 'XRP',   binance: 'XRPUSDT',   gecko: 'ripple',             spread: 0.030 },
  { symbol: 'BNB',   binance: 'BNBUSDT',   gecko: 'binancecoin',        spread: 0.025 },
  { symbol: 'SOL',   binance: 'SOLUSDT',   gecko: 'solana',             spread: 0.035 },
  { symbol: 'DOGE',  binance: 'DOGEUSDT',  gecko: 'dogecoin',           spread: 0.040 },
  { symbol: 'ADA',   binance: 'ADAUSDT',   gecko: 'cardano',            spread: 0.040 },
  { symbol: 'TRX',   binance: 'TRXUSDT',   gecko: 'tron',               spread: 0.040 },
  { symbol: 'AVAX',  binance: 'AVAXUSDT',  gecko: 'avalanche-2',        spread: 0.035 },
  { symbol: 'MATIC', binance: 'MATICUSDT', gecko: 'matic-network',      spread: 0.040 },
  { symbol: 'LTC',   binance: 'LTCUSDT',   gecko: 'litecoin',           spread: 0.025 },
  { symbol: 'LINK',  binance: 'LINKUSDT',  gecko: 'chainlink',          spread: 0.050 },
  { symbol: 'XLM',   binance: 'XLMUSDT',   gecko: 'stellar',            spread: 0.050 },
  { symbol: 'ATOM',  binance: 'ATOMUSDT',  gecko: 'cosmos',             spread: 0.050 },
  { symbol: 'NEAR',  binance: 'NEARUSDT',  gecko: 'near',               spread: 0.055 },
  // Tier 2 — mid-cap, good liquidity
  { symbol: 'DOT',   binance: 'DOTUSDT',   gecko: 'polkadot',           spread: 0.060 },
  { symbol: 'UNI',   binance: 'UNIUSDT',   gecko: 'uniswap',            spread: 0.060 },
  { symbol: 'AAVE',  binance: 'AAVEUSDT',  gecko: 'aave',               spread: 0.065 },
  { symbol: 'ALGO',  binance: 'ALGOUSDT',  gecko: 'algorand',           spread: 0.065 },
  { symbol: 'FIL',   binance: 'FILUSDT',   gecko: 'filecoin',           spread: 0.075 },
  { symbol: 'HBAR',  binance: 'HBARUSDT',  gecko: 'hedera-hashgraph',   spread: 0.070 },
  { symbol: 'VET',   binance: 'VETUSDT',   gecko: 'vechain',            spread: 0.080 },
  { symbol: 'ICP',   binance: 'ICPUSDT',   gecko: 'internet-computer',  spread: 0.080 },
  // Tier 3 — lower volume, wider spreads
  { symbol: 'FTM',   binance: 'FTMUSDT',   gecko: 'fantom',             spread: 0.100 },
  { symbol: 'THETA', binance: 'THETAUSDT', gecko: 'theta-token',        spread: 0.120 },
  { symbol: 'SAND',  binance: 'SANDUSDT',  gecko: 'the-sandbox',        spread: 0.120 },
  { symbol: 'MANA',  binance: 'MANAUSDT',  gecko: 'decentraland',       spread: 0.120 },
  { symbol: 'CHZ',   binance: 'CHZUSDT',   gecko: 'chiliz',             spread: 0.120 },
  { symbol: 'AR',    binance: 'ARUSDT',    gecko: 'arweave',            spread: 0.150 },
];

// Cross pairs for triangular arb: A/BTC where A/USDT and BTC/USDT are known
// Real triangular arb: USDT → BTC → A → USDT  vs  direct A/USDT
export const TRIANGLES = [
  // Tier 1 — very liquid BTC crosses
  { base: 'ETH',   stream: 'ethbtc'   },
  { base: 'XRP',   stream: 'xrpbtc'   },
  { base: 'BNB',   stream: 'bnbbtc'   },
  { base: 'SOL',   stream: 'solbtc'   },
  { base: 'DOGE',  stream: 'dogebtc'  },
  { base: 'ADA',   stream: 'adabtc'   },
  { base: 'TRX',   stream: 'trxbtc'   },
  { base: 'AVAX',  stream: 'avaxbtc'  },
  { base: 'MATIC', stream: 'maticbtc' },
  { base: 'LTC',   stream: 'ltcbtc'   },
  { base: 'LINK',  stream: 'linkbtc'  },
  { base: 'XLM',   stream: 'xlmbtc'   },
  { base: 'ATOM',  stream: 'atombtc'  },
  { base: 'NEAR',  stream: 'nearbtc'  },
  // Tier 2 — mid-volume BTC crosses
  { base: 'DOT',   stream: 'dotbtc'   },
  { base: 'UNI',   stream: 'unibtc'   },
  { base: 'AAVE',  stream: 'aavebtc'  },
  { base: 'ALGO',  stream: 'algobtc'  },
  { base: 'FIL',   stream: 'filbtc'   },
  { base: 'HBAR',  stream: 'hbarbtc'  },
  { base: 'VET',   stream: 'vetbtc'   },
  { base: 'ICP',   stream: 'icpbtc'   },
  // Tier 3 — thinner BTC crosses
  { base: 'FTM',   stream: 'ftmbtc'   },
  { base: 'THETA', stream: 'thetabtc' },
  { base: 'SAND',  stream: 'sandbtc'  },
  { base: 'MANA',  stream: 'manabtc'  },
  { base: 'CHZ',   stream: 'chzbtc'   },
  { base: 'AR',    stream: 'arbtc'    },
];

export type CrossPairMap = Map<string, { bid: number; ask: number }>;

const BASE = 'https://api.binance.com/api/v3';

const INITIAL: MarketData[] = USDT_PAIRS.map(p => ({
  symbol: p.symbol, stream: p.binance.toLowerCase(),
  price: 0, change: 0, volatility: 0, bid: 0, ask: 0, connected: false,
}));

async function fetchBinance(): Promise<{ usdt: MarketData[]; cross: CrossPairMap } | null> {
  const usdtSyms   = JSON.stringify(USDT_PAIRS.map(p => p.binance));
  const crossSyms  = JSON.stringify(TRIANGLES.map(t => (t.base + 'BTC').toUpperCase()));
  try {
    const [tRes, usdtBookRes, crossBookRes] = await Promise.all([
      fetch(`${BASE}/ticker/24hr?symbols=${usdtSyms}`,         { signal: AbortSignal.timeout(5000) }),
      fetch(`${BASE}/ticker/bookTicker?symbols=${usdtSyms}`,   { signal: AbortSignal.timeout(5000) }),
      fetch(`${BASE}/ticker/bookTicker?symbols=${crossSyms}`,  { signal: AbortSignal.timeout(5000) }),
    ]);
    if (!tRes.ok || !usdtBookRes.ok) return null;

    const [tickers, usdtBooks, crossBooks]: [
      { symbol: string; lastPrice: string; priceChangePercent: string }[],
      { symbol: string; bidPrice: string; askPrice: string }[],
      { symbol: string; bidPrice: string; askPrice: string }[],
    ] = await Promise.all([tRes.json(), usdtBookRes.json(), crossBookRes.ok ? crossBookRes.json() : []]);

    const tickerMap   = Object.fromEntries(tickers.map(t => [t.symbol, t]));
    const usdtBookMap = Object.fromEntries(usdtBooks.map(b => [b.symbol, b]));

    const usdt: MarketData[] = USDT_PAIRS.map(p => {
      const t  = tickerMap[p.binance];
      const bk = usdtBookMap[p.binance];
      const bid = bk ? parseFloat(bk.bidPrice) : 0;
      const ask = bk ? parseFloat(bk.askPrice) : 0;
      return {
        symbol: p.symbol, stream: p.binance.toLowerCase(),
        price:      t  ? parseFloat(t.lastPrice)          : 0,
        change:     t  ? parseFloat(t.priceChangePercent) : 0,
        bid, ask,
        volatility: bid > 0 ? ((ask - bid) / bid) * 100 : p.spread,
        connected:  !!(t && bk),
      };
    });

    const cross: CrossPairMap = new Map();
    if (Array.isArray(crossBooks)) {
      crossBooks.forEach((b: { symbol: string; bidPrice: string; askPrice: string }) => {
        cross.set(b.symbol.toUpperCase(), { bid: parseFloat(b.bidPrice), ask: parseFloat(b.askPrice) });
      });
    }

    return { usdt, cross };
  } catch { return null; }
}

async function fetchCoinGecko(): Promise<MarketData[]> {
  const ids = USDT_PAIRS.map(p => p.gecko).join(',');
  const r = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!r.ok) throw new Error('coingecko failed');
  const data: Record<string, { usd: number; usd_24h_change: number }> = await r.json();
  return USDT_PAIRS.map(p => {
    const info = data[p.gecko];
    const price = info?.usd ?? 0;
    const half  = price * (p.spread / 100) / 2;
    return {
      symbol: p.symbol, stream: p.binance.toLowerCase(),
      price, change: info?.usd_24h_change ?? 0,
      bid: price - half, ask: price + half,
      volatility: p.spread,
      connected: !!info && price > 0,
    };
  });
}

export function useMarketData() {
  const [marketData, setMarketData]   = useState<MarketData[]>(INITIAL);
  const [crossPairs, setCrossPairs]   = useState<CrossPairMap>(new Map());
  const [volatility, setVolatility]   = useState(0);
  const wsRef        = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsAlive      = useRef(false);
  const crossRef     = useRef<CrossPairMap>(new Map());

  const applyUsdt = useCallback((data: MarketData[]) => {
    setMarketData(data);
    const live = data.filter(d => d.connected);
    if (live.length > 0)
      setVolatility(live.reduce((s, d) => s + d.volatility, 0) / live.length);
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    const poll = async () => {
      if (wsAlive.current) return;
      const result = await fetchBinance().catch(() => null);
      if (result) {
        applyUsdt(result.usdt);
        setCrossPairs(result.cross);
        crossRef.current = result.cross;
      } else {
        fetchCoinGecko().then(applyUsdt).catch(() => {});
      }
    };
    poll();
    pollRef.current = setInterval(poll, 8000);
  }, [applyUsdt]);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => {
    // Immediate REST fetch — data before WebSocket connects
    fetchBinance().then(r => {
      if (r) { applyUsdt(r.usdt); setCrossPairs(r.cross); crossRef.current = r.cross; }
      else fetchCoinGecko().then(applyUsdt).catch(() => {});
    }).catch(() => fetchCoinGecko().then(applyUsdt).catch(() => {}));

    startPolling();

    // WebSocket: USDT tickers + cross pair tickers combined
    const usdtStreams  = USDT_PAIRS.map(p => `${p.binance.toLowerCase()}@ticker`);
    const crossStreams  = TRIANGLES.map(t => `${t.stream}@ticker`);
    const allStreams    = [...usdtStreams, ...crossStreams].join('/');
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${allStreams}`;

    const connect = () => {
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen  = () => { wsAlive.current = true; stopPolling(); };
      ws.onerror = () => ws.close();
      ws.onclose = () => {
        wsAlive.current = false;
        startPolling();
        reconnectRef.current = setTimeout(connect, 15000);
      };

      ws.onmessage = (ev) => {
        try {
          const { data: d } = JSON.parse(ev.data);
          if (!d?.s) return;
          const sym = d.s as string;
          const bid = parseFloat(d.b);
          const ask = parseFloat(d.a);

          // Cross pair (e.g. ETHBTC)
          const isCross = TRIANGLES.some(t => (t.base + 'BTC').toUpperCase() === sym);
          if (isCross) {
            const next = new Map(crossRef.current);
            next.set(sym, { bid, ask });
            crossRef.current = next;
            setCrossPairs(next);
            return;
          }

          // USDT pair
          const pair = USDT_PAIRS.find(p => p.binance === sym);
          if (!pair) return;
          const price      = parseFloat(d.c);
          const spreadPct  = bid > 0 ? ((ask - bid) / bid) * 100 : 0;
          setMarketData(prev => prev.map(m =>
            m.symbol !== pair.symbol ? m
              : { ...m, price, change: parseFloat(d.P), bid, ask, volatility: spreadPct, connected: true }
          ));
          setVolatility(prev => prev * 0.9 + spreadPct * 0.1);
        } catch { /* ignore malformed frames */ }
      };
    };

    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      stopPolling();
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
    };
  }, [applyUsdt, startPolling, stopPolling]);

  return { marketData, crossPairs, volatility };
}
