-- Enable pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Shop settings table
CREATE TABLE IF NOT EXISTS shop_settings (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) UNIQUE NOT NULL,
  access_token TEXT NOT NULL,
  installed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  analysis_frequency VARCHAR(50) DEFAULT 'weekly',
  min_similarity_score DECIMAL(3,2) DEFAULT 0.70,
  min_similarity_threshold DECIMAL(3,2) DEFAULT 0.70,
  calculated_threshold DECIMAL(3,2) DEFAULT 0.50,
  max_recommendations INTEGER DEFAULT 3,
  analysis_progress INTEGER DEFAULT 0,
  button_style JSONB
);

-- Add calculated_threshold column if it doesn't exist (migration)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='shop_settings' AND column_name='calculated_threshold'
  ) THEN
    ALTER TABLE shop_settings ADD COLUMN calculated_threshold DECIMAL(3,2) DEFAULT 0.50;
  END IF;
END $$;

-- Collections table with vector embeddings
CREATE TABLE IF NOT EXISTS collections (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  collection_id VARCHAR(255) NOT NULL,
  handle VARCHAR(255) NOT NULL,
  title VARCHAR(500),
  description TEXT,
  h1_tag TEXT,
  meta_title VARCHAR(500),
  meta_description TEXT,
  url TEXT,
  embedding vector(1536),
  analyzed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(shop_domain, collection_id)
);

-- Collection recommendations (similarity matches)
CREATE TABLE IF NOT EXISTS collection_recommendations (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  source_collection_id VARCHAR(255) NOT NULL,
  target_collection_id VARCHAR(255) NOT NULL,
  similarity_score DECIMAL(5,4) NOT NULL,
  recommendation_rank INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(shop_domain, source_collection_id, target_collection_id)
);

-- Link analytics table
CREATE TABLE IF NOT EXISTS collection_link_analytics (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  source_collection_id VARCHAR(255) NOT NULL,
  target_collection_id VARCHAR(255) NOT NULL,
  clicked_at TIMESTAMP DEFAULT NOW(),
  session_id VARCHAR(255),
  user_agent TEXT
);

-- Job queue for async processing
CREATE TABLE IF NOT EXISTS job_queue (
  id SERIAL PRIMARY KEY,
  shop_domain VARCHAR(255) NOT NULL,
  job_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_collections_shop ON collections(shop_domain);
CREATE INDEX IF NOT EXISTS idx_collections_handle ON collections(handle);
CREATE INDEX IF NOT EXISTS idx_recommendations_shop ON collection_recommendations(shop_domain);
CREATE INDEX IF NOT EXISTS idx_recommendations_source ON collection_recommendations(source_collection_id);
CREATE INDEX IF NOT EXISTS idx_analytics_shop ON collection_link_analytics(shop_domain);
CREATE INDEX IF NOT EXISTS idx_job_queue_status ON job_queue(status);
CREATE INDEX IF NOT EXISTS idx_job_queue_shop ON job_queue(shop_domain);

-- Vector similarity index (using ivfflat for fast approximate nearest neighbor search)
-- This creates 100 inverted lists - good for datasets with hundreds to thousands of collections
CREATE INDEX IF NOT EXISTS idx_collections_embedding ON collections 
  USING ivfflat (embedding vector_cosine_ops) 
  WITH (lists = 100);
