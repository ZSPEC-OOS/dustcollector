import { useState, useCallback } from 'react';
import { RealTradingStatus } from '../types';

const BINANCE_BASE = 'https://api.binance.com';

async function hmacSign(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function binanceRequest(
  apiKey: string,
  apiSecret: string,
  method: 'GET' | 'POST' | 'DELETE',
  endpoint: string,
  params: Record<string, string | number> = {}
) {
  const timestamp = Date.now();
  const query = new URLSearchParams({ ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])), timestamp: String(timestamp) });
  const signature = await hmacSign(apiSecret, query.toString());
  query.set('signature', signature);

  const url = `${BINANCE_BASE}${endpoint}?${query}`;
  const res = await fetch(url, {
    method,
    headers: { 'X-MBX-APIKEY': apiKey },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.msg || `Binance error ${res.status}`);
  return data;
}

export function useRealTrading() {
  const [status, setStatus] = useState<RealTradingStatus>({
    connected: false,
    balance: 0,
    balanceCurrency: 'USDT',
    lastOrderId: null,
    error: null,
  });

  const connect = useCallback(async (apiKey: string, apiSecret: string) => {
    setStatus(s => ({ ...s, error: null }));
    try {
      const account = await binanceRequest(apiKey, apiSecret, 'GET', '/api/v3/account');
      const usdt = account.balances?.find((b: { asset: string; free: string }) => b.asset === 'USDT');
      setStatus({
        connected: true,
        balance: parseFloat(usdt?.free ?? '0'),
        balanceCurrency: 'USDT',
        lastOrderId: null,
        error: null,
      });
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const isCors = msg.includes('Failed to fetch') || msg.includes('NetworkError');
      setStatus(s => ({
        ...s,
        connected: false,
        error: isCors
          ? 'CORS blocked — Binance does not allow direct browser requests to private endpoints. Deploy a backend proxy or use test mode.'
          : msg,
      }));
      return false;
    }
  }, []);

  const placeMarketBuy = useCallback(async (
    apiKey: string,
    apiSecret: string,
    symbol: string,
    quoteQty: number
  ) => {
    const order = await binanceRequest(apiKey, apiSecret, 'POST', '/api/v3/order', {
      symbol: symbol.replace('-', ''),
      side: 'BUY',
      type: 'MARKET',
      quoteOrderQty: quoteQty.toFixed(2),
    });
    setStatus(s => ({ ...s, lastOrderId: order.orderId }));
    return order;
  }, []);

  const placeMarketSell = useCallback(async (
    apiKey: string,
    apiSecret: string,
    symbol: string,
    quantity: number
  ) => {
    const order = await binanceRequest(apiKey, apiSecret, 'POST', '/api/v3/order', {
      symbol: symbol.replace('-', ''),
      side: 'SELL',
      type: 'MARKET',
      quantity: quantity.toFixed(6),
    });
    setStatus(s => ({ ...s, lastOrderId: order.orderId }));
    return order;
  }, []);

  const disconnect = useCallback(() => {
    setStatus({ connected: false, balance: 0, balanceCurrency: 'USDT', lastOrderId: null, error: null });
  }, []);

  return { status, connect, disconnect, placeMarketBuy, placeMarketSell };
}
