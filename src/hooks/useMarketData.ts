import { useState, useEffect, useRef } from 'react';
import { MarketData } from '../types';

const PAIRS = [
  { symbol: 'BTC',  stream: 'btcusdt'  },
  { symbol: 'ETH',  stream: 'ethusdt'  },
  { symbol: 'SOL',  stream: 'solusdt'  },
  { symbol: 'AR',   stream: 'arusdt'   },
  { symbol: 'ADA',  stream: 'adausdt'  },
  { symbol: 'DOT',  stream: 'dotusdt'  },
  { symbol: 'LINK', stream: 'linkusdt' },
  { symbol: 'POL',  stream: 'polusdt'  }, // formerly MATIC
];


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

async function fetchRestFallback(): Promise<MarketData[]> {
  const [tickerRes, bookRes] = await Promise.all([
    fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(PAIRS.map(p => p.stream.toUpperCase())))}`),
    fetch(`https://api.binance.com/api/v3/ticker/bookTicker?symbols=${encodeURIComponent(JSON.stringify(PAIRS.map(p => p.stream.toUpperCase())))}`),
  ]);
  const tickers: Record<string, { lastPrice: string; priceChangePercent: string }> = {};
  const books:   Record<string, { bidPrice: string; askPrice: string }> = {};

  if (tickerRes.ok) {
    const arr = await tickerRes.json() as { symbol: string; lastPrice: string; priceChangePercent: string }[];
    arr.forEach(t => { tickers[t.symbol] = t; });
  }
  if (bookRes.ok) {
    const arr = await bookRes.json() as { symbol: string; bidPrice: string; askPrice: string }[];
    arr.forEach(b => { books[b.symbol] = b; });
  }

  return PAIRS.map(p => {
    const sym = p.stream.toUpperCase();
    const t = tickers[sym];
    const bk = books[sym];
    const bid = bk ? parseFloat(bk.bidPrice) : 0;
    const ask = bk ? parseFloat(bk.askPrice) : 0;
    const spreadPct = bid > 0 ? ((ask - bid) / bid) * 100 : 0;
    return {
      symbol: p.symbol,
      stream: p.stream,
      price:  t  ? parseFloat(t.lastPrice)           : 0,
      change: t  ? parseFloat(t.priceChangePercent)  : 0,
      bid,
      ask,
      volatility: spreadPct,
      connected:  !!(t && bk),
    };
  });
}

export function useMarketData() {
  const [marketData, setMarketData] = useState<MarketData[]>(INITIAL);
  const [volatility, setVolatility] = useState(0);
  const wsRef          = useRef<WebSocket | null>(null);
  const reconnectRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsConnected    = useRef(false);

  // REST polling fallback
  const startPolling = () => {
    if (pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const data = await fetchRestFallback();
        setMarketData(data);
        const avgSpread = data.reduce((s, d) => s + d.volatility, 0) / data.length;
        setVolatility(avgSpread);
      } catch {
        // silent — will retry next interval
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  useEffect(() => {
    const streams = PAIRS.map(p => `${p.stream}@ticker`).join('/');
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    // Immediately fetch via REST so there's data while WS connects
    fetchRestFallback().then(data => {
      setMarketData(data);
    }).catch(() => {});

    const connect = () => {
      if (wsRef.current) wsRef.current.close();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      // If WS doesn't open within 6 s, start polling
      const openTimeout = setTimeout(() => {
        if (!wsConnected.current) startPolling();
      }, 6000);

      ws.onopen = () => {
        wsConnected.current = true;
        clearTimeout(openTimeout);
        stopPolling();
        setMarketData(prev => prev.map(m => ({ ...m, connected: true })));
      };

      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        const d = msg.data;
        if (!d) return;
        const pair = PAIRS.find(p => d.s && p.stream === d.s.toLowerCase());
        if (!pair) return;

        const price = parseFloat(d.c);
        const bid   = parseFloat(d.b);
        const ask   = parseFloat(d.a);
        const spreadPct = bid > 0 ? ((ask - bid) / bid) * 100 : 0;

        setMarketData(prev => prev.map(m =>
          m.symbol !== pair.symbol ? m : {
            ...m, price, change: parseFloat(d.P), volatility: spreadPct, bid, ask, connected: true,
          }
        ));
        setVolatility(prev => prev * 0.95 + spreadPct * 0.05);
      };

      ws.onerror = () => {
        clearTimeout(openTimeout);
        ws.close();
      };

      ws.onclose = () => {
        wsConnected.current = false;
        clearTimeout(openTimeout);
        setMarketData(prev => prev.map(m => ({ ...m, connected: false })));
        startPolling();
        reconnectRef.current = setTimeout(() => {
          stopPolling();
          connect();
        }, 8000);
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
