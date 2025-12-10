import type { DashboardStats, AnalysisProgress, ShopSettings, Collection, Recommendation } from '../types';

const API_BASE = '/api';

export async function getShopParam(): Promise<string> {
  const params = new URLSearchParams(window.location.search);
  return params.get('shop') || 'sports-clothing-test.myshopify.com';
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const shop = await getShopParam();
  const response = await fetch(`${API_BASE}/simple/debug?shop=${shop}`);
  const data = await response.json();

  const settingsResponse = await fetch(`${API_BASE}/simple/settings?shop=${shop}`);
  const settings = await settingsResponse.json();

  return {
    collections: data.count.collections,
    recommendations: data.count.recommendations,
    threshold: parseFloat(settings.calculated_threshold) * 100,
  };
}

export async function startAnalysis(): Promise<void> {
  const shop = await getShopParam();
  const response = await fetch(`${API_BASE}/simple/analyze?shop=${shop}`, {
    method: 'POST',
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Analysis failed');
  }
}

export async function getAnalysisProgress(): Promise<AnalysisProgress> {
  const shop = await getShopParam();
  const response = await fetch(`${API_BASE}/simple/progress?shop=${shop}`);
  return response.json();
}

export async function getCollections(): Promise<Collection[]> {
  const shop = await getShopParam();
  const response = await fetch(`${API_BASE}/simple/debug?shop=${shop}`);
  const data = await response.json();
  return data.collections.map((c: any, index: number) => ({
    id: c.handle,
    handle: c.handle,
    title: c.title,
    updated_at: new Date().toISOString(),
  }));
}

export async function getRecommendations(): Promise<Recommendation[]> {
  const shop = await getShopParam();
  const response = await fetch(`${API_BASE}/simple/debug?shop=${shop}`);
  const data = await response.json();
  return data.recommendations;
}
