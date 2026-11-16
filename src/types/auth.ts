import type { Session, User } from '@supabase/supabase-js';

import type { UserRole } from './database';

export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

export interface AuthProfile {
  id: string;
  full_name: string;
  role: UserRole;
}

export interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
}

export interface SignInParams {
  email: string;
  password: string;
}

export interface AuthResult {
  user: User | null;
  session: Session | null;
}

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  role: UserRole | null;
  status: AuthStatus;
  signIn: (params: SignInParams) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<void>;
  signOut: () => Promise<void>;
}
