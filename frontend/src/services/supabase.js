// supabase.js — Supabase auth + profile storage
//
// Setup (takes ~3 minutes):
//   1. Create a free project at https://supabase.com
//   2. Go to Project Settings > API
//   3. Copy "Project URL" and "anon public" key into frontend/.env:
//        VITE_SUPABASE_URL=https://your-project.supabase.co
//        VITE_SUPABASE_ANON_KEY=your-anon-key
//   4. In the Supabase SQL editor, run:
//
//        create table if not exists profiles (
//          id uuid primary key references auth.users on delete cascade,
//          data jsonb not null default '{}',
//          updated_at timestamptz default now()
//        );
//        alter table profiles enable row level security;
//        create policy "Users read own profile"
//          on profiles for select using (auth.uid() = id);
//        create policy "Users insert own profile"
//          on profiles for insert with check (auth.uid() = id);
//        create policy "Users update own profile"
//          on profiles for update using (auth.uid() = id);
//
// Without keys: auth and profiles fall back to localStorage automatically.

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const USE_LOCAL = !SUPABASE_URL || !SUPABASE_ANON_KEY ||
  SUPABASE_URL.includes('YOUR_PROJECT');

if (USE_LOCAL) {
  console.info(
    '[PathFinder] Supabase keys not set — using local storage for auth and profiles. ' +
    'Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env for real auth.'
  );
}

export const supabase = USE_LOCAL
  ? null
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Auth ──────────────────────────────────────────────────────────────────────

export const signUp = async ({ email, password, fullName }) => {
  if (USE_LOCAL) return _localSignUp({ email, fullName });
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
  if (error) throw error;
  return data.user;
};

export const signIn = async ({ email, password }) => {
  if (USE_LOCAL) return _localSignIn({ email });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
};

export const signOut = async () => {
  if (USE_LOCAL) { _localClearSession(); return; }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const getSession = async () => {
  if (USE_LOCAL) return _localGetSession();
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
};

export const onAuthStateChange = (callback) => {
  if (USE_LOCAL) return { unsubscribe: () => {} };
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null);
  });
  return data.subscription;
};

// ── Profile CRUD ──────────────────────────────────────────────────────────────

export const fetchProfile = async (userId) => {
  if (USE_LOCAL) return _localFetchProfile(userId);
  const { data, error } = await supabase
    .from('profiles')
    .select('data')
    .eq('id', userId)
    .single();
  if (error && error.code !== 'PGRST116') throw error;
  return data?.data ?? null;
};

export const upsertProfile = async (userId, profile) => {
  if (USE_LOCAL) return _localUpsertProfile(userId, profile);
  const record = { ...profile, updatedAt: new Date().toISOString() };
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, data: record, updated_at: new Date().toISOString() });
  if (error) throw error;
  return record;
};

// ── Local storage fallback (used when Supabase keys are absent) ───────────────

const _DB_KEY  = 'pathfinder.db';
const _SES_KEY = 'pathfinder.session';
const _delay   = (ms) => new Promise((r) => setTimeout(r, ms));

const _readDb   = () => { try { return JSON.parse(localStorage.getItem(_DB_KEY)  || '{"profiles":{}}'); } catch { return { profiles: {} }; } };
const _writeDb  = (db) => localStorage.setItem(_DB_KEY, JSON.stringify(db));
const _readSess = ()    => { try { return JSON.parse(localStorage.getItem(_SES_KEY) || 'null'); } catch { return null; } };
const _writeSess = (u)  => u ? localStorage.setItem(_SES_KEY, JSON.stringify(u)) : localStorage.removeItem(_SES_KEY);

function _buildLocalUser({ email, fullName }) {
  const id = email.trim().toLowerCase();
  return {
    id,
    email: id,
    user_metadata: {
      full_name: fullName || id.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    },
  };
}

async function _localSignUp({ email, fullName }) {
  await _delay(300);
  const user = _buildLocalUser({ email, fullName });
  _writeSess(user);
  return user;
}

async function _localSignIn({ email }) {
  await _delay(300);
  const user = _buildLocalUser({ email });
  _writeSess(user);
  return user;
}

function _localClearSession() {
  _writeSess(null);
}

async function _localGetSession() {
  return _readSess();
}

async function _localFetchProfile(userId) {
  await _delay(150);
  return _readDb().profiles[userId] ?? null;
}

async function _localUpsertProfile(userId, profile) {
  await _delay(200);
  const db = _readDb();
  const record = { ...profile, updatedAt: new Date().toISOString() };
  db.profiles[userId] = record;
  _writeDb(db);
  return record;
}
