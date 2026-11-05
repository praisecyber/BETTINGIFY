export interface ApiMatch {
  id: string; sport: string; league: string; home: string; away: string; startsAt: string;
  status: 'scheduled' | 'live' | 'finished' | 'cancelled'; isLive: boolean; score: string | null;
  odds: { home: number; draw: number; away: number };
  result?: 'home' | 'draw' | 'away' | null;
}
export interface SportsFeedEvent {
  id: string; sport: string; league: string; home: string; away: string; startsAt: string;
  status: 'scheduled' | 'live' | 'finished' | 'cancelled'; score: string | null;
  result: 'home' | 'draw' | 'away' | null;
  homeLogo?: string; awayLogo?: string;
}
export interface OddsFeedEvent {
  id: string; sportKey: string; sport: string; startsAt: string; home: string; away: string;
  bookmakers: {
    key: string; name: string; updatedAt: string | null;
    markets: {
      key: string; updatedAt: string | null;
      outcomes: { name: string; price: number; point: number | null; description: string | null }[];
    }[];
  }[];
}
export interface OddsSport {
  key: string;
  group: string;
  title: string;
  description: string;
  active: boolean;
  hasOutrights: boolean;
}
export interface ApiBetLeg { matchId: string; match: string; selection: string; odds: number; status: string; result: 'home' | 'draw' | 'away' | null; score: string | null }
export interface ApiBet {
  id: string; kind: 'sport' | 'aviator'; matchId: string | null; match: string; selection: string; odds: number;
  stake: number; potential: number; status: 'open' | 'won' | 'lost' | 'cashed_out' | 'void'; payout: number;
  cashoutOffer: number | null; date: string; legs?: ApiBetLeg[];
}
export interface Wallet { balance: number; withdrawable: number; bonus: number; bonusWagerRemaining: number; currency: string }
export interface User {
  id: string; email: string; phone: string; firstName: string; lastName: string; role: 'user' | 'admin';
  referralCode: string; createdAt: string; dateOfBirth: string | null; emailVerified: boolean;
  ageVerificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  identityVerificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  depositLimits: { daily: number | null; monthly: number | null }; selfExcludedUntil: string | null;
}
export interface PayMethod { id: string; name: string; min: number; max: number; time: string; icon: string }
export interface Promotion { id: string; title: string; desc: string; reward: string; image: string; tag: string }
export interface Game { id: string; name: string; image: string; tag: string; rtp: string; playable: boolean }
export interface Gift { id: string; title: string; desc: string; reward: string; icon: string; progress: number; claimable: boolean; claimed: boolean }
export interface Txn { id: string; type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'refund'; amount: number; status: 'completed' | 'pending' | 'failed'; method: string; date: string }
