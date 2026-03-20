import { useState, useEffect, useRef } from 'react';
import { MarketData } from '../types';

const PAIRS = [
  { symbol: 'BTC',   stream: 'btcusdt'  },
  { symbol: 'ETH',   stream: 'ethusdt'  },
  { symbol: 'SOL',   stream: 'solusdt'  },
  { symbol: 'AR',    stream: 'arusdt'   },
  { symbol: 'ADA',   stream: 'adausdt'  },
  { symbol: 'DOT',   stream: 'dotusdt'  },
  { symbol: 'LINK',  stream: 'linkusdt' },
  { symbol: 'MATIC', stream: 'maticusdt'},
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

export function useMarketData() {
  const [marketData, setMarketData] = useState<MarketData[]>(INITIAL);
  const [volatility, setVolatility] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const streams = PAIRS.map(p => `${p.stream}@ticker`).join('/');
    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    const connect = () => {
      if (wsRef.current) wsRef.current.close();
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
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
            ...m,
            price,
            change: parseFloat(d.P),
            volatility: spreadPct,
            bid,
            ask,
            connected: true,
          }
        ));

        setVolatility(prev => prev * 0.95 + spreadPct * 0.05);
      };

      ws.onerror = () => ws.close();

      ws.onclose = () => {
        setMarketData(prev => prev.map(m => ({ ...m, connected: false })));
        reconnectRef.current = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, []);

  return { marketData, volatility };
}
