// Core types
export type Collection = {
  id: string;
  title: string;
  handle: string;
  updatedAt: string;
};

export type PathButton = {
  id: string;
  label: string;
  targetCollectionId: string;
  relevanceScore: number;
  visible: boolean;
};

export type CollectionWithButtons = Collection & {
  buttons: PathButton[];
  buttonCount: number;
  status: 'active' | 'no_buttons' | 'disabled';
};

export type AiSettings = {
  autoGenerateForNewCollections: boolean;
  autoRemoveDeletedTargets: boolean;
  syncFrequency: 'hourly' | 'daily' | 'weekly' | 'manual';
  buttonShape: 'pill' | 'rounded' | 'square';
  buttonSize: 'small' | 'medium';
  placement: 'aboveGrid' | 'belowDescription' | 'both';
  colorMode: 'theme' | 'custom';
  customHex?: string;
  customColor?: string;
  buttonAlignment?: 'left' | 'center' | 'right';
  maxButtonsPerPage?: number;
};

export type DashboardStats = {
  collectionsWithButtons: number;
  totalCollections: number;
  totalButtons: number;
  lastSync?: string;
  nextAutoSync?: string;
  isActive: boolean;
  shoppersGuided?: number;
  buttonClicks?: number;
  influencedConversions?: number;
  mostClickedButton?: string;
};

export type ActivityLog = {
  id: string;
  action: string;
  time: string;
  status: 'success' | 'error' | 'in_progress';
};

export type SyncHistory = {
  id: string;
  date: string;
  type: 'refresh' | 'cleanup' | 'generate';
  status: 'success' | 'error';
  details?: string;
};

export type AnalysisProgress = {
  progress: number;
  status: string;
  complete: boolean;
  error: string | null;
  collections?: number;
};

// Legacy types for backwards compatibility with existing API
export type Recommendation = {
  id: string;
  source_collection_id: string;
  target_collection_id: string;
  similarity_score: string;
  recommendation_rank: number;
};

export type ShopSettings = {
  calculated_threshold: string;
  max_recommendations: number;
};
