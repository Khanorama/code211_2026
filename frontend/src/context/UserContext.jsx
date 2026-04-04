import { useEffect, useState } from 'react';
import {
  signIn as sbSignIn,
  signUp as sbSignUp,
  signOut as sbSignOut,
  getSession,
  onAuthStateChange,
  fetchProfile,
  upsertProfile,
} from '../services/supabase';
import { emptyProfile } from '../services/profileUtils';
import UserContext from './userContext';

// XP required to reach level n: 30, 45, 65, 90, 120, 160, 210, ...
// Formula: xpForLevel(n) = Math.round(30 * Math.pow(1.4, n - 1))
export function xpForLevel(level) {
  return Math.round(30 * Math.pow(1.4, level - 1));
}

export function xpToLevel(totalXp) {
  let level = 1;
  let spent = 0;
  while (true) {
    const needed = xpForLevel(level);
    if (spent + needed > totalXp) break;
    spent += needed;
    level++;
  }
  return level;
}

export function xpInCurrentLevel(totalXp) {
  let level = 1;
  let spent = 0;
  while (true) {
    const needed = xpForLevel(level);
    if (spent + needed > totalXp) return totalXp - spent;
    spent += needed;
    level++;
  }
}

export function xpForCurrentLevel(totalXp) {
  return xpForLevel(xpToLevel(totalXp));
}

// Keep for legacy compat
export const XP_PER_LEVEL = 100;

const OPPS_KEY = 'pathfinder.opportunities';
const loadStoredOpps = () => {
  try { return JSON.parse(localStorage.getItem(OPPS_KEY) || 'null'); }
  catch { return null; }
};

export const UserProvider = ({ children }) => {
  const [user,             setUser]             = useState(null);
  const [profile,          setProfile]          = useState(emptyProfile);
  const [isProfileLoading, setProfileLoad]      = useState(false);
  const [xp,               setXpState]          = useState(0);
  const [opportunities,    setOppsState]         = useState(loadStoredOpps);

  const setOpportunities = (opps) => {
    setOppsState(opps);
    if (opps !== null) localStorage.setItem(OPPS_KEY, JSON.stringify(opps));
    else               localStorage.removeItem(OPPS_KEY);
  };

  // Restore session on mount
  useEffect(() => {
    getSession().then((u) => { if (u) setUser(u); });
    const sub = onAuthStateChange((u) => setUser(u ?? null));
    return () => sub?.unsubscribe?.();
  }, []);

  // Load profile whenever user changes
  useEffect(() => {
    if (!user?.id) {
      setProfile(emptyProfile);
      setXpState(0);
      return;
    }
    setProfileLoad(true);
    fetchProfile(user.id)
      .then((saved) => {
        const merged = saved ? { ...emptyProfile, ...saved } : emptyProfile;
        setProfile(merged);
        setXpState(merged.xp || 0);
      })
      .catch(console.error)
      .finally(() => setProfileLoad(false));
  }, [user]);

  const login = async ({ email, password }) => {
    const u = await sbSignIn({ email, password });
    setUser(u);
    return u;
  };

  const signup = async ({ email, password, fullName }) => {
    const u = await sbSignUp({ email, password, fullName });
    setUser(u);
    return u;
  };

  const logout = async () => {
    await sbSignOut();
    setUser(null);
    setProfile(emptyProfile);
    setXpState(0);
    setOpportunities(null);
  };

  const saveProfile = async (updates) => {
    if (!user?.id) return null;
    const next = { ...profile, ...updates, xp };
    setProfile(next);
    const saved = await upsertProfile(user.id, next);
    setProfile({ ...emptyProfile, ...saved });
    return saved;
  };

  const addXp = async (amount) => {
    const newXp = xp + amount;
    setXpState(newXp);
    if (user?.id) {
      const next = { ...profile, xp: newXp };
      setProfile(next);
      await upsertProfile(user.id, next).catch(console.error);
    }
    return newXp;
  };

  const displayName =
    user?.user_metadata?.full_name ||
    profile?.fullName ||
    user?.email?.split('@')[0] ||
    'Student';

  return (
    <UserContext.Provider value={{
      user, profile, isProfileLoading,
      xp, level: xpToLevel(xp), xpInLevel: xpInCurrentLevel(xp), xpForLevel: xpForCurrentLevel(xp),
      displayName, opportunities, setOpportunities,
      login, signup, logout, saveProfile, addXp,
    }}>
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;
