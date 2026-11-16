import type { AuthChangeEvent, Session, Subscription, User } from '@supabase/supabase-js';

import { toUserMessage } from '../lib/errors';
import { supabase } from '../lib/supabase';
import type { AuthProfile, AuthResult, SignInParams, SignUpParams } from '../types/auth';
import type { UserRole } from '../types/database';
import { AppError } from '../types/domain';

/**
 * Signs up a new user with email and password, supplying full_name and role
 * metadata for the handle_new_user database trigger.
 */
export async function signUp({
  email,
  password,
  fullName,
  role,
}: SignUpParams): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role,
      },
    },
  });

  if (error) {
    throw new AppError(error.code ?? 'AUTH_SIGNUP_FAILED', toUserMessage(error), error);
  }

  return {
    user: data.user,
    session: data.session,
  };
}

/**
 * Signs in an existing user with email and password.
 */
export async function signIn({
  email,
  password,
}: SignInParams): Promise<{ user: User; session: Session }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new AppError(error.code ?? 'AUTH_SIGNIN_FAILED', toUserMessage(error), error);
  }

  if (!data.user || !data.session) {
    throw new AppError('AUTH_SIGNIN_FAILED', 'Failed to retrieve session after signing in.');
  }

  return {
    user: data.user,
    session: data.session,
  };
}

/**
 * Signs out the active user session.
 */
export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new AppError(error.code ?? 'AUTH_SIGNOUT_FAILED', toUserMessage(error), error);
  }
}

/**
 * Fetches user profile (id, full_name, role) by userId.
 * Returns null if the profile row is not yet found (e.g. trigger execution in progress).
 */
export async function getProfile(userId: string): Promise<AuthProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .single();

  if (error) {
    // PostgREST error code PGRST116 indicates 0 rows returned
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new AppError(error.code ?? 'AUTH_GET_PROFILE_FAILED', toUserMessage(error), error);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id as string,
    full_name: data.full_name as string,
    role: data.role as UserRole,
  };
}

/**
 * Retrieves the currently active session from Supabase client / persistent storage.
 */
export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw new AppError(error.code ?? 'AUTH_GET_SESSION_FAILED', toUserMessage(error), error);
  }

  return data.session;
}

/**
 * Subscribes to Supabase authentication state changes.
 */
export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): { data: { subscription: Subscription } } {
  return supabase.auth.onAuthStateChange(callback);
}
