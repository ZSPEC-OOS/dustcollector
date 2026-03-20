import { useState, useEffect, useRef, useCallback } from 'react';
import { MarketData } from '../types';

const PAIRS = [
  { symbol: 'BTC',  binance: 'BTCUSDT',  gecko: 'bitcoin',      spread: 0.015 },
  { symbol: 'ETH',  binance: 'ETHUSDT',  gecko: 'ethereum',     spread: 0.020 },
  { symbol: 'SOL',  binance: 'SOLUSDT',  gecko: 'solana',       spread: 0.035 },
  { symbol: 'BNB',  binance: 'BNBUSDT',  gecko: 'binancecoin',  spread: 0.025 },
  { symbol: 'ADA',  binance: 'ADAUSDT',  gecko: 'cardano',      spread: 0.050 },
  { symbol: 'DOT',  binance: 'DOTUSDT',  gecko: 'polkadot',     spread: 0.060 },
  { symbol: 'LINK', binance: 'LINKUSDT', gecko: 'chainlink',    spread: 0.060 },
  { symbol: 'AR',   binance: 'ARUSDT',   gecko: 'arweave',      spread: 0.150 },
];

const INITIAL: MarketData[] = PAIRS.map(p => ({
  symbol: p.symbol, stream: p.binance.toLowerCase(),
  price: 0, change: 0, volatility: 0, bid: 0, ask: 0, connected: false,
}));

// Binance: 2 batch calls total (not 16)
async function fetchBinance(): Promise<MarketData[] | null> {
  const syms = JSON.stringify(PAIRS.map(p => p.binance));
  try {
    const [tRes, bRes] = await Promise.all([
      fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${syms}`, { signal: AbortSignal.timeout(5000) }),
      fetch(`https://api.binance.com/api/v3/ticker/bookTicker?symbols=${syms}`, { signal: AbortSignal.timeout(5000) }),
    ]);
    if (!tRes.ok || !bRes.ok) return null;
    const [tickers, books]: [
      { symbol: string; lastPrice: string; priceChangePercent: string }[],
      { symbol: string; bidPrice: string; askPrice: string }[]
    ] = await Promise.all([tRes.json(), bRes.json()]);

    const tickerMap = Object.fromEntries(tickers.map(t => [t.symbol, t]));
    const bookMap   = Object.fromEntries(books.map(b => [b.symbol, b]));

    return PAIRS.map(p => {
      const t = tickerMap[p.binance];
      const bk = bookMap[p.binance];
      const bid = bk ? parseFloat(bk.bidPrice) : 0;
      const ask = bk ? parseFloat(bk.askPrice) : 0;
      return {
        symbol: p.symbol, stream: p.binance.toLowerCase(),
        price:  t  ? parseFloat(t.lastPrice)          : 0,
        change: t  ? parseFloat(t.priceChangePercent) : 0,
        bid, ask,
        volatility: bid > 0 ? ((ask - bid) / bid) * 100 : p.spread,
        connected: !!(t && bk),
      };
    });
  } catch { return null; }
}

// CoinGecko: reliable fallback, synthetic bid/ask from typical spreads
async function fetchCoinGecko(): Promise<MarketData[]> {
  const ids = PAIRS.map(p => p.gecko).join(',');
  const r = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    { signal: AbortSignal.timeout(8000) }
  );
  if (!r.ok) throw new Error('coingecko failed');
  const data: Record<string, { usd: number; usd_24h_change: number }> = await r.json();
  return PAIRS.map(p => {
    const info = data[p.gecko];
    const price = info?.usd ?? 0;
    const halfSpread = price * (p.spread / 100) / 2;
    return {
      symbol: p.symbol, stream: p.binance.toLowerCase(),
      price, change: info?.usd_24h_change ?? 0,
      bid: price - halfSpread,
      ask: price + halfSpread,
      volatility: p.spread,
      connected: !!info && price > 0,
    };
  });
}

async function fetchPrices(): Promise<MarketData[]> {
  const binance = await fetchBinance();
  if (binance && binance.some(d => d.price > 0)) return binance;
  return fetchCoinGecko(); // always works
}

export function useMarketData() {
  const [marketData, setMarketData] = useState<MarketData[]>(INITIAL);
  const [volatility, setVolatility] = useState(0);
  const wsRef        = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsAlive      = useRef(false);

  const apply = useCallback((data: MarketData[]) => {
    setMarketData(data);
    const live = data.filter(d => d.connected);
    if (live.length > 0)
      setVolatility(live.reduce((s, d) => s + d.volatility, 0) / live.length);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    fetchPrices().then(apply).catch(() => {});
    pollRef.current = setInterval(() => {
      if (!wsAlive.current) fetchPrices().then(apply).catch(() => {});
    }, 8000);
  }, [apply]);

  useEffect(() => {
    // Fetch prices immediately on mount — no waiting for WebSocket
    fetchPrices().then(apply).catch(() => {});
    startPolling();

    const streams = PAIRS.map(p => `${p.binance.toLowerCase()}@ticker`).join('/');
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    const connect = () => {
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen  = () => { wsAlive.current = true; };
      ws.onerror = () => ws.close();
      ws.onclose = () => {
        wsAlive.current = false;
        reconnectRef.current = setTimeout(connect, 15000);
      };

      ws.onmessage = (ev) => {
        try {
          const { data: d } = JSON.parse(ev.data);
          if (!d?.s) return;
          const pair = PAIRS.find(p => p.binance === d.s);
          if (!pair) return;
          const price = parseFloat(d.c);
          const bid   = parseFloat(d.b);
          const ask   = parseFloat(d.a);
          const spreadPct = bid > 0 ? ((ask - bid) / bid) * 100 : pair.spread;
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
  }, [apply, startPolling, stopPolling]);

  return { marketData, volatility };
}
