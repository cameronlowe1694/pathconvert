import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from '@shopify/polaris';
import Dashboard from './pages/Dashboard';
import Collections from './pages/Collections';
import Settings from './pages/Settings';
import Billing from './pages/Billing';
import Admin from './pages/Admin';

function App() {
  // Get shop parameter from URL
  const params = new URLSearchParams(window.location.search);
  const shop = params.get('shop') || '';

  return (
    <AppProvider i18n={{}}>
      <Router>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard shop={shop} />} />
          <Route path="/collections" element={<Collections shop={shop} />} />
          <Route path="/settings" element={<Settings shop={shop} />} />
          <Route path="/billing" element={<Billing shop={shop} />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Router>
    </AppProvider>
  );
}

export default App;
