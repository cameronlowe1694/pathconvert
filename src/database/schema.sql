-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Collections table
CREATE TABLE IF NOT EXISTS collections (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  collection_id VARCHAR(255) NOT NULL,
  handle VARCHAR(255) NOT NULL,
  title VARCHAR(255) NOT NULL,
  h1_tag VARCHAR(255), -- Extracted H1 for anchor text fallback
  description TEXT,
  url TEXT NOT NULL,
  product_count INTEGER DEFAULT 0,
  embedding VECTOR(1536),
  last_analyzed TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(shop_domain, collection_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_collections_shop ON collections(shop_domain);
CREATE INDEX IF NOT EXISTS idx_collections_handle ON collections(shop_domain, handle);

-- Related collections table
CREATE TABLE IF NOT EXISTS related_collections (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  source_collection_id VARCHAR(255) NOT NULL,
  related_collection_id VARCHAR(255) NOT NULL,
  similarity_score FLOAT NOT NULL,
  anchor_text VARCHAR(255) NOT NULL, -- AI-generated or H1 fallback
  anchor_text_source VARCHAR(50), -- 'ai_generated', 'h1_tag', 'title'
  position INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(shop_domain, source_collection_id, position)
);

-- Index for faster related collection lookups
CREATE INDEX IF NOT EXISTS idx_related_shop_source ON related_collections(shop_domain, source_collection_id);

-- Shop settings table
CREATE TABLE IF NOT EXISTS shop_settings (
  shop_domain VARCHAR(255) PRIMARY KEY,
  is_active BOOLEAN DEFAULT true,
  max_recommendations INTEGER DEFAULT 7, -- Top 7 matching Colab workflow
  min_similarity_threshold FLOAT DEFAULT 0.85, -- 0.85 matching Colab workflow
  analysis_progress INTEGER DEFAULT 0, -- For progress bar (0-100)
  button_style JSONB,
  access_token TEXT,
  last_sync TIMESTAMP,
  installed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Shop sessions table for OAuth
CREATE TABLE IF NOT EXISTS shop_sessions (
  id VARCHAR(255) PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  state VARCHAR(255) NOT NULL,
  is_online BOOLEAN DEFAULT false,
  scope VARCHAR(255),
  expires TIMESTAMP,
  access_token TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Analytics table (optional)
CREATE TABLE IF NOT EXISTS button_clicks (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  source_collection_handle VARCHAR(255) NOT NULL,
  target_collection_handle VARCHAR(255) NOT NULL,
  clicked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clicks_shop ON button_clicks(shop_domain);
CREATE INDEX IF NOT EXISTS idx_clicks_date ON button_clicks(clicked_at);

-- Job queue table for background tasks
CREATE TABLE IF NOT EXISTS job_queue (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  job_type VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  payload JSONB,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_status ON job_queue(status, created_at);
