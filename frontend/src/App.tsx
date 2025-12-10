import { BrowserRouter, Routes, Route } from 'react-router-dom';
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

export default function App() {
  return (
    <AppProvider i18n={{}}>
      <BrowserRouter>
        <AppFrame>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/buttons" element={<ButtonsListPage />} />
            <Route path="/buttons/:id" element={<CollectionDetailPage />} />
            <Route path="/settings/ai" element={<AISettingsPage />} />
            <Route path="/sync" element={<SyncPage />} />
            <Route path="/support" element={<SupportPage />} />
            <Route path="/plans" element={<PlansPage />} />
          </Routes>
        </AppFrame>
      </BrowserRouter>
    </AppProvider>
  );
}
