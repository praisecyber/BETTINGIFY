import { useState, useEffect } from 'react';

export type Route =
  | '/'
  | '/deposit'
  | '/withdraw'
  | '/open-bets'
  | '/transactions'
  | '/gifts'
  | '/account'
  | '/my-matches'
  | '/promotions'
  | '/az'
  | '/virtuals'
  | '/jackpot'
  | '/live-scores'
  | '/live-games'
  | '/AVIATOR'
  | '/register'
  | '/games'
  | '/ROULETTE'
  | '/SLOTS'
  | '/me'
  | '/open-bet'
  | '/admin';

export function parseHash(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h || '/';
}

export function navigate(route: string) {
  window.location.hash = route;
}

export function useHashRoute(): string {
  const [route, setRoute] = useState(parseHash());
  useEffect(() => {
    const handler = () => setRoute(parseHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return route;
}
