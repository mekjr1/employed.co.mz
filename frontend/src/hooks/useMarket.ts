"use client";

import { createContext, createElement, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";

import { buildMarketHostname, MARKETS, resolveMarketFromHostname } from "@/lib/market";
import type { MarketConfig, MarketKey } from "@/lib/types";

interface MarketContextValue {
  market: MarketConfig;
  switchMarket: (nextMarket: MarketKey) => void;
}

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketProvider({ initialMarket, children }: PropsWithChildren<{ initialMarket: MarketConfig }>) {
  const [market, setMarket] = useState(initialMarket);

  useEffect(() => {
    setMarket(resolveMarketFromHostname(window.location.hostname));
  }, []);

  const value = useMemo<MarketContextValue>(
    () => ({
      market,
      switchMarket: (nextMarket) => {
        const next = MARKETS[nextMarket];
        setMarket(next);

        if (typeof window === "undefined") return;

        const current = new URL(window.location.href);
        current.hostname = buildMarketHostname(nextMarket, current.hostname);
        window.location.assign(current.toString());
      }
    }),
    [market]
  );

  return createElement(MarketContext.Provider, { value }, children);
}

export function useMarket() {
  const context = useContext(MarketContext);

  if (!context) {
    throw new Error("useMarket must be used within a MarketProvider");
  }

  return context;
}
