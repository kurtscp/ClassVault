import type { Session } from '@supabase/supabase-js';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  getProfile,
  getSession,
  onAuthStateChange,
  signIn as authSignIn,
  signOut as authSignOut,
  signUp as authSignUp,
} from '../services/auth';
import type {
  AuthContextValue,
  AuthProfile,
  AuthStatus,
  SignInParams,
  SignUpParams,
} from '../types/auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const MAX_PROFILE_RETRIES = 3;
const PROFILE_RETRY_DELAY_MS = 500;

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // 1. Initial session check on mount + auth state change subscription
  useEffect(() => {
    let isMounted = true;

    // Load existing session on mount (getSession)
    getSession()
      .then((initialSession) => {
        if (!isMounted) return;
        setSession(initialSession);
        setIsInitialized(true);
        if (!initialSession) {
          setStatus('signedOut');
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setSession(null);
        setIsInitialized(true);
        setStatus('signedOut');
      });

    // Subscribe to onAuthStateChange: ONLY set session state in callback (rule DT-5)
    const {
      data: { subscription },
    } = onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // 2. Separate effect keyed on user.id to fetch profile and handle trigger latency
  const userId = session?.user?.id;

  useEffect(() => {
    // Await initial session resolution before acting on auth state
    if (!isInitialized) {
      return;
    }

    if (!userId) {
      setProfile(null);
      setStatus('signedOut');
      return;
    }

    const currentUserId = userId;
    let isCancelled = false;
    let retryCount = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function loadProfile() {
      try {
        const userProfile = await getProfile(currentUserId);
        if (isCancelled) return;

        if (userProfile) {
          setProfile(userProfile);
          setStatus('signedIn');
          return;
        }

        // Profile not there yet right after sign-up: retry up to 3 times with 500 ms delay
        if (retryCount < MAX_PROFILE_RETRIES) {
          retryCount += 1;
          timeoutId = setTimeout(() => {
            if (!isCancelled) {
              void loadProfile();
            }
          }, PROFILE_RETRY_DELAY_MS);
        } else {
          setProfile(null);
          setStatus('signedIn');
        }
      } catch {
        if (isCancelled) return;

        if (retryCount < MAX_PROFILE_RETRIES) {
          retryCount += 1;
          timeoutId = setTimeout(() => {
            if (!isCancelled) {
              void loadProfile();
            }
          }, PROFILE_RETRY_DELAY_MS);
        } else {
          setProfile(null);
          setStatus('signedIn');
        }
      }
    }

    setStatus('loading');
    void loadProfile();

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [userId, isInitialized]);

  // Auth actions
  const signIn = useCallback(async (params: SignInParams) => {
    const result = await authSignIn(params);
    setSession(result.session);
  }, []);

  const signUp = useCallback(async (params: SignUpParams) => {
    const result = await authSignUp(params);
    if (result.session) {
      setSession(result.session);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authSignOut();
    } finally {
      setSession(null);
      setProfile(null);
      setStatus('signedOut');
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      role: profile?.role ?? null,
      status,
      signIn,
      signUp,
      signOut,
    }),
    [session, profile, status, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthProvider;
