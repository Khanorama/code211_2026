import { useEffect, useState } from 'react';
import { fetchProfile, upsertProfile } from '../services/mockSupabase';
import { buildUserFromCredentials, emptyProfile } from '../services/profileUtils';
import UserContext from './userContext';

const SESSION_KEY = 'pathfinder.mock.session';

const readStoredUser = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const storedUser = window.localStorage.getItem(SESSION_KEY);
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(readStoredUser);
  const [profile, setProfile] = useState(emptyProfile);
  const [isProfileLoading, setIsProfileLoading] = useState(Boolean(readStoredUser()));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (user) {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

  useEffect(() => {
    let isActive = true;

    const loadProfile = async () => {
      if (!user?.id) {
        setProfile(emptyProfile);
        setIsProfileLoading(false);
        return;
      }

      setIsProfileLoading(true);

      try {
        const savedProfile = await fetchProfile(user.id);

        if (isActive) {
          setProfile(savedProfile ? { ...emptyProfile, ...savedProfile } : emptyProfile);
        }
      } finally {
        if (isActive) {
          setIsProfileLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isActive = false;
    };
  }, [user]);

  const login = ({ email, fullName }) => {
    const nextUser = buildUserFromCredentials({ email, fullName });
    setUser(nextUser);
    return nextUser;
  };

  const logout = () => {
    setUser(null);
    setProfile(emptyProfile);
    setIsProfileLoading(false);
  };

  const saveProfile = async (updates) => {
    if (!user?.id) {
      return null;
    }

    const nextProfile = { ...profile, ...updates };
    setProfile(nextProfile);
    const savedProfile = await upsertProfile(user.id, nextProfile);
    setProfile({ ...emptyProfile, ...savedProfile });
    return savedProfile;
  };

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        isProfileLoading,
        login,
        logout,
        saveProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserProvider;
