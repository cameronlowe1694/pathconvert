import { Frame, Navigation } from '@shopify/polaris';
import {
  HomeIcon,
  ButtonIcon,
  SettingsIcon,
  RefreshIcon,
  QuestionCircleIcon,
  CreditCardIcon,
} from '@shopify/polaris-icons';

interface AppFrameProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function AppFrame({ children, currentPage, onNavigate }: AppFrameProps) {
  const navigationItems = [
    {
      label: 'Dashboard',
      icon: HomeIcon,
      selected: currentPage === 'dashboard',
      onClick: () => onNavigate('dashboard'),
    },
    {
      label: 'Button Manager',
      icon: ButtonIcon,
      selected: currentPage === 'buttons' || currentPage === 'collection-detail',
      onClick: () => onNavigate('buttons'),
    },
    {
      label: 'AI & Styling Settings',
      icon: SettingsIcon,
      selected: currentPage === 'ai-settings',
      onClick: () => onNavigate('ai-settings'),
    },
    {
      label: 'Instant Sync & Cleanup',
      icon: RefreshIcon,
      selected: currentPage === 'sync',
      onClick: () => onNavigate('sync'),
    },
    {
      label: 'Support',
      icon: QuestionCircleIcon,
      selected: currentPage === 'support',
      onClick: () => onNavigate('support'),
    },
    {
      label: 'Plans',
      icon: CreditCardIcon,
      selected: currentPage === 'plans',
      onClick: () => onNavigate('plans'),
    },
  ];

  return (
    <Frame
      navigation={
        <Navigation location="/">
          <Navigation.Section items={navigationItems} />
        </Navigation>
      }
    >
      {children}
    </Frame>
  );
}
