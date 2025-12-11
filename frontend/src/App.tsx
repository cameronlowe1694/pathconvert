import { useState, useCallback } from 'react';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import { AppProvider } from '@shopify/polaris';
import '@shopify/polaris/build/esm/styles.css';

import AppFrame from './components/AppFrame';
import DashboardPage from './pages/DashboardPage';
import ButtonsListPage from './pages/ButtonsListPage';
import CollectionDetailPage from './pages/CollectionDetailPage';
import AISettingsPage from './pages/AISettingsPage';
import SyncPage from './pages/SyncPage';
import SupportPage from './pages/SupportPage';
import PlansPage from './pages/PlansPage';

function getShopFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('shop') || 'sports-clothing-test.myshopify.com';
}

function getHostFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('host') || '';
}

export default function App() {
  const shop = getShopFromURL();
  const host = getHostFromURL();

  // Simple client-side routing state
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [collectionId, setCollectionId] = useState<string | null>(null);

  const navigateTo = useCallback((page: string, id?: string) => {
    setCurrentPage(page);
    if (id) setCollectionId(id);
  }, []);

  const config = {
    apiKey: process.env.SHOPIFY_API_KEY || 'not-needed-for-now',
    host: host,
    forceRedirect: false,
  };

  // Render current page
  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage onNavigate={navigateTo} />;
      case 'buttons':
        return <ButtonsListPage onNavigate={navigateTo} />;
      case 'collection-detail':
        return <CollectionDetailPage id={collectionId || ''} />;
      case 'ai-settings':
        return <AISettingsPage />;
      case 'sync':
        return <SyncPage />;
      case 'support':
        return <SupportPage />;
      case 'plans':
        return <PlansPage />;
      default:
        return <DashboardPage onNavigate={navigateTo} />;
    }
  };

  return (
    <AppBridgeProvider config={config}>
      <AppProvider i18n={{}}>
        <AppFrame currentPage={currentPage} onNavigate={navigateTo}>
          {renderPage()}
        </AppFrame>
      </AppProvider>
    </AppBridgeProvider>
  );
}
