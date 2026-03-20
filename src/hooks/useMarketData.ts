import { useState, useEffect, useRef } from 'react';
import { MarketData } from '../types';

const PAIRS = [
  { symbol: 'BTC',  stream: 'btcusdt'  },
  { symbol: 'ETH',  stream: 'ethusdt'  },
  { symbol: 'SOL',  stream: 'solusdt'  },
  { symbol: 'BNB',  stream: 'bnbusdt'  },
  { symbol: 'ADA',  stream: 'adausdt'  },
  { symbol: 'DOT',  stream: 'dotusdt'  },
  { symbol: 'LINK', stream: 'linkusdt' },
  { symbol: 'AR',   stream: 'arusdt'   },
];

const BASE = 'https://api.binance.com/api/v3';

const INITIAL: MarketData[] = PAIRS.map(p => ({
  symbol: p.symbol,
  stream: p.stream,
  price: 0,
  change: 0,
  volatility: 0,
  bid: 0,
  ask: 0,
  connected: false,
}));

async function fetchOnePair(p: typeof PAIRS[0]): Promise<MarketData> {
  const sym = p.stream.toUpperCase();
  const [t24, book] = await Promise.all([
    fetch(`${BASE}/ticker/24hr?symbol=${sym}`).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(`${BASE}/ticker/bookTicker?symbol=${sym}`).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);
  const bid = book ? parseFloat(book.bidPrice) : 0;
  const ask = book ? parseFloat(book.askPrice) : 0;
  return {
    symbol: p.symbol,
    stream: p.stream,
    price:      t24  ? parseFloat(t24.lastPrice)          : 0,
    change:     t24  ? parseFloat(t24.priceChangePercent) : 0,
    bid,
    ask,
    volatility: bid > 0 ? ((ask - bid) / bid) * 100 : 0,
    connected:  !!(t24 && book),
  };
}

async function fetchAllRest(): Promise<MarketData[]> {
  const results = await Promise.allSettled(PAIRS.map(fetchOnePair));
  return results.map((r, i) =>
    r.status === 'fulfilled' ? r.value : { ...INITIAL[i] }
  );
}

export function useMarketData() {
  const [marketData, setMarketData] = useState<MarketData[]>(INITIAL);
  const [volatility, setVolatility] = useState(0);
  const wsRef        = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsLive       = useRef(false);

  const applyData = (data: MarketData[]) => {
    setMarketData(data);
    const avg = data.filter(d => d.connected).reduce((s, d) => s + d.volatility, 0) / (data.filter(d => d.connected).length || 1);
    setVolatility(avg);
  };

  const startPolling = () => {
    if (pollRef.current) return;
    // immediate fetch, then every 4 s
    fetchAllRest().then(applyData).catch(() => {});
    pollRef.current = setInterval(() => {
      fetchAllRest().then(applyData).catch(() => {});
    }, 4000);
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  useEffect(() => {
    // Always start REST polling immediately so data is never blank
    startPolling();

    const streams = PAIRS.map(p => `${p.stream}@ticker`).join('/');
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    const connect = () => {
      if (wsRef.current) wsRef.current.close();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        wsLive.current = true;
        stopPolling(); // WS takes over
        setMarketData(prev => prev.map(m => ({ ...m, connected: true })));
      };

      ws.onmessage = (ev) => {
        const msg = JSON.parse(ev.data);
        const d = msg.data;
        if (!d) return;
        const pair = PAIRS.find(p => d.s && p.stream === d.s.toLowerCase());
        if (!pair) return;

        const price = parseFloat(d.c);
        const bid   = parseFloat(d.b);
        const ask   = parseFloat(d.a);
        const spreadPct = bid > 0 ? ((ask - bid) / bid) * 100 : 0;

        setMarketData(prev => prev.map(m =>
          m.symbol !== pair.symbol ? m : { ...m, price, change: parseFloat(d.P), volatility: spreadPct, bid, ask, connected: true }
        ));
        setVolatility(prev => prev * 0.95 + spreadPct * 0.05);
      };

      ws.onerror  = () => ws.close();
      ws.onclose  = () => {
        wsLive.current = false;
        setMarketData(prev => prev.map(m => ({ ...m, connected: false })));
        startPolling(); // fall back to REST while WS reconnects
        reconnectRef.current = setTimeout(() => {
          stopPolling();
          connect();
        }, 10000);
      };
    };

    connect();

    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      stopPolling();
      wsRef.current?.close();
    };
  }, []);

  return { marketData, volatility };
}
