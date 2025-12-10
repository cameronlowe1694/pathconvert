import type {
  DashboardStats,
  AnalysisProgress,
  Collection,
  CollectionWithButtons,
  PathButton,
  AiSettings,
  ActivityLog,
  SyncHistory,
} from '../types';

const API_BASE = '/api';

export async function getShopParam(): Promise<string> {
  const params = new URLSearchParams(window.location.search);
  return params.get('shop') || 'sports-clothing-test.myshopify.com';
}

// Dashboard
export async function fetchDashboardStats(): Promise<DashboardStats> {
  const shop = await getShopParam();
  const response = await fetch(`${API_BASE}/simple/debug?shop=${shop}`);
  const data = await response.json();

  const settingsResponse = await fetch(`${API_BASE}/simple/settings?shop=${shop}`);
  const settings = await settingsResponse.json();

  return {
    collectionsWithButtons: data.count.collections,
    totalCollections: data.count.collections,
    totalButtons: data.count.recommendations,
    lastSync: data.lastSync,
    nextAutoSync: undefined,
    isActive: data.count.recommendations > 0,
    shoppersGuided: 0,
    buttonClicks: 0,
    influencedConversions: 0,
    mostClickedButton: undefined,
  };
}

// Analysis
export async function generateButtonsForAllCollections(): Promise<void> {
  const shop = await getShopParam();
  const response = await fetch(`${API_BASE}/simple/analyze?shop=${shop}`, {
    method: 'POST',
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Analysis failed');
  }
}

export async function refreshAllButtons(): Promise<void> {
  // Same as generate for now
  return generateButtonsForAllCollections();
}

export async function getAnalysisProgress(): Promise<AnalysisProgress> {
  const shop = await getShopParam();
  const response = await fetch(`${API_BASE}/simple/progress?shop=${shop}`);
  return response.json();
}

// Collections & Buttons
export async function fetchCollectionsWithButtons(): Promise<CollectionWithButtons[]> {
  const shop = await getShopParam();
  const response = await fetch(`${API_BASE}/simple/debug?shop=${shop}`);
  const data = await response.json();

  // Map collections with their button counts
  const collectionsMap = new Map();

  data.collections.forEach((c: any) => {
    collectionsMap.set(c.handle, {
      id: c.handle,
      handle: c.handle,
      title: c.title,
      updatedAt: new Date().toISOString(),
      buttons: [],
      buttonCount: 0,
      status: 'no_buttons' as const,
    });
  });

  // Count buttons per collection
  data.recommendations.forEach((r: any) => {
    const collection = collectionsMap.get(r.source_collection_id);
    if (collection) {
      collection.buttonCount++;
      collection.status = 'active';
      collection.buttons.push({
        id: r.id,
        label: r.target_collection_id,
        targetCollectionId: r.target_collection_id,
        relevanceScore: parseFloat(r.similarity_score) * 100,
        visible: true,
      });
    }
  });

  return Array.from(collectionsMap.values());
}

export async function fetchCollectionButtons(collectionId: string): Promise<PathButton[]> {
  const shop = await getShopParam();
  const response = await fetch(`${API_BASE}/simple/debug?shop=${shop}`);
  const data = await response.json();

  return data.recommendations
    .filter((r: any) => r.source_collection_id === collectionId)
    .map((r: any) => ({
      id: r.id,
      label: r.target_collection_id,
      targetCollectionId: r.target_collection_id,
      relevanceScore: parseFloat(r.similarity_score) * 100,
      visible: true,
    }));
}

export async function updateCollectionButtons(
  collectionId: string,
  buttons: PathButton[]
): Promise<void> {
  // Placeholder - implement when backend supports updates
  console.log('Update buttons for collection', collectionId, buttons);
}

export async function regenerateCollectionButtons(collectionId: string): Promise<void> {
  // Placeholder - trigger re-analysis for specific collection
  await generateButtonsForAllCollections();
}

// AI Settings
export async function fetchAiSettings(): Promise<AiSettings> {
  // Return defaults for now - implement when backend supports settings
  return {
    autoGenerateForNewCollections: false,
    autoRemoveDeletedTargets: true,
    syncFrequency: 'manual',
    buttonShape: 'pill',
    buttonSize: 'medium',
    placement: 'aboveGrid',
    colorMode: 'theme',
    buttonAlignment: 'left',
  };
}

export async function updateAiSettings(settings: AiSettings): Promise<void> {
  // Placeholder - implement when backend supports settings
  console.log('Update AI settings', settings);
}

export async function rebuildAiIndex(): Promise<void> {
  // Placeholder - trigger full re-analysis
  await generateButtonsForAllCollections();
}

// Sync & Cleanup
export async function runCleanup(options: {
  removeDeletedTargets: boolean;
  rebuildEmbeddings: boolean;
}): Promise<void> {
  // Placeholder - implement cleanup logic
  console.log('Run cleanup', options);
  if (options.rebuildEmbeddings) {
    await generateButtonsForAllCollections();
  }
}

export async function fetchSyncHistory(): Promise<SyncHistory[]> {
  // Placeholder - return empty for now
  return [];
}

// Activity Log
export async function fetchActivityLog(): Promise<ActivityLog[]> {
  // Placeholder - return empty for now
  return [];
}

// Collections lookup (for display)
export async function getCollectionTitle(handle: string): Promise<string> {
  const collections = await fetchCollectionsWithButtons();
  const collection = collections.find((c) => c.handle === handle);
  return collection?.title || handle;
}
