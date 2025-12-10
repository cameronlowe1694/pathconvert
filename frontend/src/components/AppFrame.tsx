import { Frame, Navigation } from '@shopify/polaris';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ButtonIcon,
  SettingsIcon,
  RefreshIcon,
  QuestionCircleIcon,
  CreditCardIcon,
} from '@shopify/polaris-icons';

export default function AppFrame({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navigationItems = [
    {
      url: '/',
      label: 'Dashboard',
      icon: HomeIcon,
      selected: location.pathname === '/',
    },
    {
      url: '/buttons',
      label: 'Buttons',
      icon: ButtonIcon,
      selected: location.pathname.startsWith('/buttons'),
    },
    {
      url: '/settings/ai',
      label: 'AI Settings',
      icon: SettingsIcon,
      selected: location.pathname.startsWith('/settings'),
    },
    {
      url: '/sync',
      label: 'Sync',
      icon: RefreshIcon,
      selected: location.pathname === '/sync',
    },
    {
      url: '/plans',
      label: 'Plans',
      icon: CreditCardIcon,
      selected: location.pathname === '/plans',
    },
  ];

  return (
    <Frame
      navigation={
        <Navigation location="/">
          <Navigation.Section
            items={navigationItems.map((item) => ({
              ...item,
              onClick: () => navigate(item.url),
            }))}
          />
        </Navigation>
      }
    >
      {children}
    </Frame>
  );
}
