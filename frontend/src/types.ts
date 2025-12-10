export type Collection = {
  id: string;
  handle: string;
  title: string;
  updated_at: string;
};

export type Recommendation = {
  id: string;
  source_collection_id: string;
  target_collection_id: string;
  similarity_score: string;
  recommendation_rank: number;
};

export type DashboardStats = {
  collections: number;
  recommendations: number;
  threshold: number;
  clicks?: number;
  conversions?: number;
};

export type AnalysisProgress = {
  progress: number;
  status: string;
  complete: boolean;
  error: string | null;
  collections: number;
};

export type ShopSettings = {
  calculated_threshold: string;
  max_recommendations: number;
};
