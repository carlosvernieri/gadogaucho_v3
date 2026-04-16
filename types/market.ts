
export interface MarketIndicator {
  price: number;
  priceKg?: string;
  trend: 'up' | 'down' | 'stable';
  delta: number;
  unit: string;
}

export interface ScotPrice {
  category: string;
  price: number;
}

export interface B3Future {
  month: string;
  price: number;
  priceKg: string;
}

export interface MarketData {
  reportDate: string;
  updatedAt: string;
  scotData: {
    pelotas: ScotPrice[];
    oeste: ScotPrice[];
  };
  cepeaData: MarketIndicator;
  b3Futures: B3Future[];
}
