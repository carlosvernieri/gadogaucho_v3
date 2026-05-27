export interface AuctionPlaza {
  id: number;
  name: string;
  city: string;
  lat: number;
  lng: number;
  created_at?: string;
}

export interface Auction {
  id: number;
  plaza_id: number;
  auction_date: string;
  commission: number;
  video_url?: string;
  created_at?: string;
  // Joins
  plaza?: AuctionPlaza;
}


export interface AuctionOffer {
  id: number;
  auction_id: number;
  category: string;
  breed?: string;
  price_kg: number;
  price?: number;
  avg_weight: number;
  batch_size: number;
  seller_name?: string;
  seller_city?: string;
  seller_lat?: number;
  seller_lng?: number;
  created_at?: string;
}
