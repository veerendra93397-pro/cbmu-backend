import React, { useState, useEffect } from 'react';
import { SplashScreen } from './components/SplashScreen';
import { ChatScreen } from './components/ChatScreen';
import { NavigationDrawer, ScreenType } from './components/NavigationDrawer';
import { MapScreen } from './components/MapScreen';
import { CampusMapScreen } from './components/screens/CampusMapScreen';
import { AcademicCalendarScreen } from './components/screens/AcademicCalendarScreen';
import { ContactUsScreen } from './components/screens/ContactUsScreen';
import { FeedbackScreen } from './components/screens/FeedbackScreen';
import { NoticesScreen } from './components/screens/NoticesScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { AboutScreen } from './components/screens/AboutScreen';
import { AdminLoginScreen } from './components/admin/AdminLoginScreen';
import { AdminDashboardScreen, AdminSubScreen } from './components/admin/AdminDashboardScreen';
import { AdminDepartmentsScreen } from './components/admin/AdminDepartmentsScreen';
import { AdminChairpersonsScreen } from './components/admin/AdminChairpersonsScreen';
import { AdminFeesScreen } from './components/admin/AdminFeesScreen';
import { AdminBuildingsScreen } from './components/admin/AdminBuildingsScreen';
import { AdminNoticesScreen } from './components/admin/AdminNoticesScreen';
import { storage } from './services/storage';
import { Language, ThemeMode } from './types';

type FullScreenMode = 
  | 'splash'
  | 'chat'
  | 'location_map'
  | ScreenType
  | 'admin_departments'
  | 'admin_chairpersons'
  | 'admin_fees'
  | 'admin_buildings'
  | 'admin_notices';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<FullScreenMode>('splash');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => storage.getThemeMode());
  const [lang, setLang] = useState<Language>(() => storage.getLanguage());
  const [unreadNotices, setUnreadNotices] = useState(0);

  // Active embedded map target
  const [mapTarget, setMapTarget] = useState<{ lat: number; lng: number; name: string } | null>(null);

  const refreshUnreadBadge = () => {
    const list = storage.getNotices();
    const count = storage.getUnreadNoticesCount(list);
    setUnreadNotices(count);
  };

  useEffect(() => {
    refreshUnreadBadge();
  }, []);

  // Update HTML class / color scheme when theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (themeMode === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else if (themeMode === 'dark') {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    }
  }, [themeMode]);

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    storage.setThemeMode(mode);
  };

  const handleToggleLang = () => {
    const newLang = lang === 'en' ? 'kn' : 'en';
    setLang(newLang);
    storage.setLanguage(newLang);
  };

  const handleOpenLocationMap = (lat: number, lng: number, name: string) => {
    setMapTarget({ lat, lng, name });
    setCurrentScreen('location_map');
  };

  const handleAdminSubScreen = (sub: AdminSubScreen) => {
    switch (sub) {
      case 'departments':
        setCurrentScreen('admin_departments');
        break;
      case 'chairpersons':
        setCurrentScreen('admin_chairpersons');
        break;
      case 'fees':
        setCurrentScreen('admin_fees');
        break;
      case 'buildings':
        setCurrentScreen('admin_buildings');
        break;
      case 'notices':
        setCurrentScreen('admin_notices');
        break;
    }
  };

  // Render current active screen
  const renderScreen = () => {
    switch (currentScreen) {
      case 'splash':
        return <SplashScreen onFinish={() => setCurrentScreen('chat')} />;

      case 'chat':
        return (
          <ChatScreen
            lang={lang}
            onToggleLang={handleToggleLang}
            onOpenDrawer={() => setDrawerOpen(true)}
            onOpenLocationMap={handleOpenLocationMap}
          />
        );

      case 'location_map':
        if (!mapTarget) return <ChatScreen lang={lang} onToggleLang={handleToggleLang} onOpenDrawer={() => setDrawerOpen(true)} onOpenLocationMap={handleOpenLocationMap} />;
        return (
          <MapScreen
            lat={mapTarget.lat}
            lng={mapTarget.lng}
            locationName={mapTarget.name}
            onBack={() => setCurrentScreen('chat')}
          />
        );

      case 'campus_map':
        return <CampusMapScreen onBack={() => setCurrentScreen('chat')} />;

      case 'academic_calendar':
        return (
          <AcademicCalendarScreen
            onBack={() => setCurrentScreen('chat')}
            onAskBot={() => setCurrentScreen('chat')}
          />
        );

      case 'contact_us':
        return <ContactUsScreen onBack={() => setCurrentScreen('chat')} />;

      case 'feedback':
        return <FeedbackScreen onBack={() => setCurrentScreen('chat')} />;

      case 'notices':
        return (
          <NoticesScreen
            onBack={() => setCurrentScreen('chat')}
            onRefreshBadge={refreshUnreadBadge}
          />
        );

      case 'settings':
        return (
          <SettingsScreen
            currentTheme={themeMode}
            onThemeChange={handleThemeChange}
            onNavigateAbout={() => setCurrentScreen('about')}
            onBack={() => setCurrentScreen('chat')}
          />
        );

      case 'about':
        return <AboutScreen onBack={() => setCurrentScreen('chat')} />;

      case 'admin_login':
        return (
          <AdminLoginScreen
            onSuccess={() => setCurrentScreen('admin_dashboard')}
            onBack={() => setCurrentScreen('chat')}
          />
        );

      case 'admin_dashboard':
        return (
          <AdminDashboardScreen
            onBack={() => setCurrentScreen('chat')}
            onLogout={() => {
              storage.clearAdminToken();
              setCurrentScreen('admin_login');
            }}
            onOpenSubScreen={handleAdminSubScreen}
          />
        );

      case 'admin_departments':
        return <AdminDepartmentsScreen onBack={() => setCurrentScreen('admin_dashboard')} />;

      case 'admin_chairpersons':
        return <AdminChairpersonsScreen onBack={() => setCurrentScreen('admin_dashboard')} />;

      case 'admin_fees':
        return <AdminFeesScreen onBack={() => setCurrentScreen('admin_dashboard')} />;

      case 'admin_buildings':
        return <AdminBuildingsScreen onBack={() => setCurrentScreen('admin_dashboard')} />;

      case 'admin_notices':
        return <AdminNoticesScreen onBack={() => setCurrentScreen('admin_dashboard')} />;

      default:
        return (
          <ChatScreen
            lang={lang}
            onToggleLang={handleToggleLang}
            onOpenDrawer={() => setDrawerOpen(true)}
            onOpenLocationMap={handleOpenLocationMap}
          />
        );
    }
  };

  return (
    <div className={`w-screen h-screen flex flex-col overflow-hidden ${themeMode === 'light' ? 'bg-[#F7F7F5] text-neutral-900' : 'bg-black text-white'}`}>
      {renderScreen()}

      <NavigationDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onNavigate={(screen) => setCurrentScreen(screen)}
        unreadNoticesCount={unreadNotices}
      />
    </div>
  );
};
