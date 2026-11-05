import { useEffect, useState } from 'react';
import { App as NativeApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { hasMobileApiConfig } from './lib/api';
import { initSession } from './lib/session';
import { useHashRoute } from './router';
import { SplashScreen } from './components/SplashScreen';
import { Layout } from './Layout';
import { HomePage } from './pages/HomePage';
import { AzPage } from './pages/AzPage';
import { AviatorPage } from './pages/AviatorPage';
import { DepositPage } from './pages/DepositPage';
import { WithdrawPage } from './pages/WithdrawPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AccountPage } from './pages/AccountPage';
import { GiftsPage } from './pages/GiftsPage';
import { MyMatchesPage } from './pages/MyMatchesPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { RegisterPage } from './pages/RegisterPage';
import { GamesPage } from './pages/GamesPage';
import { CasinoGamePage } from './pages/CasinoGamePage';
import { MePage } from './pages/MePage';
import { OpenBetPage } from './pages/OpenBetPage';
import { AdminPage } from './pages/AdminPage';
import { VirtualsPage } from './pages/VirtualsPage';
import { JackpotPage } from './pages/JackpotPage';
import { LiveScoresPage } from './pages/LiveScoresPage';
import { LiveGamesPage } from './pages/LiveGamesPage';
import { MobileSetupPage } from './pages/MobileSetupPage';

function App() {
  const route = useHashRoute();
  const isNative = Capacitor.isNativePlatform();
  const [mobileConfigured, setMobileConfigured] = useState(!isNative || hasMobileApiConfig());
  const [splash, setSplash] = useState(true);
  useEffect(() => { if (mobileConfigured) void initSession(); }, [mobileConfigured]);
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    let active = true;
    let removeListener: (() => void) | undefined;
    void NativeApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else void NativeApp.exitApp();
    }).then((listener) => {
      if (active) removeListener = () => { void listener.remove(); };
      else void listener.remove();
    });
    return () => {
      active = false;
      removeListener?.();
    };
  }, []);

  if (!mobileConfigured) return <MobileSetupPage onConfigured={() => setMobileConfigured(true)} />;

  const renderPage = () => {
    if (route.startsWith('/az')) return <AzPage />;
    if (route === '/open-bet') return <OpenBetPage />;
    if (route === '/open-bets') return <OpenBetPage />;
    switch (route) {
      case '/': return <HomePage />;
      case '/virtuals': return <VirtualsPage />;
      case '/jackpot': return <JackpotPage />;
      case '/live-scores': return <LiveScoresPage />;
      case '/live-games': return <LiveGamesPage />;
      case '/AVIATOR': return <AviatorPage />;
      case '/deposit': return <DepositPage />;
      case '/withdraw': return <WithdrawPage />;
      case '/transactions': return <TransactionsPage />;
      case '/account': return <AccountPage />;
      case '/gifts': return <GiftsPage />;
      case '/my-matches': return <MyMatchesPage />;
      case '/promotions': return <PromotionsPage />;
      case '/register': return <RegisterPage />;
      case '/games': return <GamesPage />;
      case '/ROULETTE': return <CasinoGamePage gameId="roulette" />;
      case '/SLOTS': return <CasinoGamePage gameId="slots" />;
      case '/me': return <MePage />;
      case '/admin': return <AdminPage />;
      default: return <HomePage />;
    }
  };

  return (
    <>
      {splash && <SplashScreen onDone={() => setSplash(false)} />}
      <Layout>
        {renderPage()}
      </Layout>
    </>
  );
}

export default App;
