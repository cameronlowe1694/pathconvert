import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@shopify/polaris';
import { Provider as AppBridgeProvider } from '@shopify/app-bridge-react';
import '@shopify/polaris/build/esm/styles.css';
import AppFrame from './components/AppFrame';
import DashboardPage from './pages/DashboardPage';
import ButtonsListPage from './pages/ButtonsListPage';
import CollectionDetailPage from './pages/CollectionDetailPage';
import AISettingsPage from './pages/AISettingsPage';
import SyncPage from './pages/SyncPage';
import PlansPage from './pages/PlansPage';

export default function App() {
  // Get shop and host from URL params
  const params = new URLSearchParams(window.location.search);
  const shop = params.get('shop') || 'sports-clothing-test.myshopify.com';
  const host = params.get('host');

  // Only use App Bridge if we have a valid host parameter (embedded in Shopify Admin)
  const appBridgeConfig = host ? {
    apiKey: import.meta.env.VITE_SHOPIFY_API_KEY || 'fae7538a6fc12ec615cdfc413f17638f',
    host: host,
    forceRedirect: false,
  } : null;

  const content = (
    <AppProvider i18n={{}}>
      <BrowserRouter basename="/app">
        <AppFrame>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/buttons" element={<ButtonsListPage />} />
            <Route path="/buttons/:id" element={<CollectionDetailPage />} />
            <Route path="/settings/ai" element={<AISettingsPage />} />
            <Route path="/sync" element={<SyncPage />} />
            <Route path="/plans" element={<PlansPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppFrame>
      </BrowserRouter>
    </AppProvider>
  );

  // Wrap in App Bridge only if we have a host (embedded mode)
  if (appBridgeConfig) {
    return <AppBridgeProvider config={appBridgeConfig}>{content}</AppBridgeProvider>;
  }

  // Standalone mode (direct access without Shopify iframe)
  return content;
}
