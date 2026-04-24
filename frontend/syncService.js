import { getSupabase } from './supabaseClient';

const DEFAULT_PORTFOLIO = {
  cash: 0,
  deposits: [],
  holdings: {},
  transactions: [],
  dividendsReceived: 0,
};

const DEFAULT_ALERTS = [];

const DEFAULT_PREFERENCES = {
  currency: 'USD',
  lang: 'es',
  timezone: 'America/New_York',
  enabledCurrencies: ['USD', 'MXN', 'EUR'],
};

// ── localStorage helpers ──────────────────────────────────────────────────────

function lsGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function lsRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

// ── Internal state ────────────────────────────────────────────────────────────

let _userId = null;

// Keep _userId in sync whenever auth state changes
function _initAuthListener() {
  const supabase = getSupabase();
  if (!supabase) return;
  supabase.auth.onAuthStateChange(async (_evt, session) => {
    const newId = session?.user?.id ?? null;
    if (newId !== _userId) {
      _userId = newId;
    }
  });
}

// ── Task 2.4: _flushPendingIfNeeded ──────────────────────────────────────────

async function _flushPendingIfNeeded() {
  const supabase = getSupabase();
  if (!supabase || !_userId) return;

  try {
    const pending = localStorage.getItem('_sync_pending');
    if (pending !== 'true') return;
  } catch {
    return;
  }

  const portfolio = lsGet('portfolio', DEFAULT_PORTFOLIO);
  const alerts = lsGet('priceAlerts', DEFAULT_ALERTS);
  const preferences = lsGet('preferences', DEFAULT_PREFERENCES);

  const { error } = await supabase.from('user_data').upsert({
    user_id: _userId,
    portfolio,
    price_alerts: alerts,
    preferences,
  });

  if (!error) {
    lsRemove('_sync_pending');
  }
}

// ── Task 2.2: loadUserData ────────────────────────────────────────────────────

async function loadUserData() {
  const supabase = getSupabase();

  if (!supabase || !_userId) {
    return {
      portfolio: lsGet('portfolio', DEFAULT_PORTFOLIO),
      alerts: lsGet('priceAlerts', DEFAULT_ALERTS),
      preferences: lsGet('preferences', DEFAULT_PREFERENCES),
    };
  }

  try {
    const { data, error } = await supabase
      .from('user_data')
      .select()
      .eq('user_id', _userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return {
        portfolio: DEFAULT_PORTFOLIO,
        alerts: DEFAULT_ALERTS,
        preferences: DEFAULT_PREFERENCES,
      };
    }

    return {
      portfolio: { ...DEFAULT_PORTFOLIO, ...(data.portfolio ?? {}) },
      alerts: data.price_alerts ?? DEFAULT_ALERTS,
      preferences: { ...DEFAULT_PREFERENCES, ...(data.preferences ?? {}) },
    };
  } catch (err) {
    console.error('[syncService] loadUserData error:', err);
    return {
      portfolio: lsGet('portfolio', DEFAULT_PORTFOLIO),
      alerts: lsGet('priceAlerts', DEFAULT_ALERTS),
      preferences: lsGet('preferences', DEFAULT_PREFERENCES),
    };
  }
}

// ── Task 2.1: initSync ────────────────────────────────────────────────────────

async function initSync() {
  const supabase = getSupabase();

  _initAuthListener();

  if (!supabase) {
    return {
      portfolio: lsGet('portfolio', DEFAULT_PORTFOLIO),
      alerts: lsGet('priceAlerts', DEFAULT_ALERTS),
      preferences: lsGet('preferences', DEFAULT_PREFERENCES),
    };
  }

  try {
    let { data: sessionData } = await supabase.auth.getSession();
    let session = sessionData?.session;

    if (!session) {
      const { data: anonData } = await supabase.auth.signInAnonymously();
      session = anonData?.session;
    }

    _userId = session?.user?.id ?? null;
    return await loadUserData();
  } catch (err) {
    console.error('[syncService] initSync error:', err);
    return {
      portfolio: lsGet('portfolio', DEFAULT_PORTFOLIO),
      alerts: lsGet('priceAlerts', DEFAULT_ALERTS),
      preferences: lsGet('preferences', DEFAULT_PREFERENCES),
    };
  }
}

// ── Task 2.3: sync functions ──────────────────────────────────────────────────

async function syncPortfolio(portfolio) {
  lsSet('portfolio', portfolio);

  const supabase = getSupabase();
  if (!supabase || !_userId) {
    lsSet('_sync_pending', 'true');
    return;
  }

  const { error } = await supabase.from('user_data').upsert({
    user_id: _userId,
    portfolio,
  });

  if (error) {
    console.error('[syncService] syncPortfolio error:', error);
    lsSet('_sync_pending', 'true');
  } else {
    await _flushPendingIfNeeded();
    lsRemove('_sync_pending');
  }
}

async function syncAlerts(alerts) {
  lsSet('priceAlerts', alerts);

  const supabase = getSupabase();
  if (!supabase || !_userId) {
    lsSet('_sync_pending', 'true');
    return;
  }

  const { error } = await supabase.from('user_data').upsert({
    user_id: _userId,
    price_alerts: alerts,
  });

  if (error) {
    console.error('[syncService] syncAlerts error:', error);
    lsSet('_sync_pending', 'true');
  } else {
    await _flushPendingIfNeeded();
    lsRemove('_sync_pending');
  }
}

async function syncPreferences(preferences) {
  lsSet('preferences', preferences);

  const supabase = getSupabase();
  if (!supabase || !_userId) {
    lsSet('_sync_pending', 'true');
    return;
  }

  const { error } = await supabase.from('user_data').upsert({
    user_id: _userId,
    preferences,
  });

  if (error) {
    console.error('[syncService] syncPreferences error:', error);
    lsSet('_sync_pending', 'true');
  } else {
    await _flushPendingIfNeeded();
    lsRemove('_sync_pending');
  }
}

// ── Clear all data function ──────────────────────────────────────────────────

async function clearAllData() {
  const supabase = getSupabase();
  
  // Clear localStorage
  const keysToRemove = [
    'portfolio',
    'priceAlerts', 
    'bankAccounts',
    'selectedStocks',
    'comparatorData',
    'stockData',
    'chartData',
    'fundamentalsData',
    'newsData',
    'technicalIndicators',
    'patterns',
    'backtestResults',
    'investmentSimulation',
    '_sync_pending'
  ];
  
  keysToRemove.forEach(key => {
    lsRemove(key);
  });
  
  // Set default values in localStorage
  lsSet('portfolio', DEFAULT_PORTFOLIO);
  lsSet('priceAlerts', DEFAULT_ALERTS);
  
  // Clear Supabase data if user is logged in
  if (supabase && _userId) {
    try {
      const { error } = await supabase.from('user_data').upsert({
        user_id: _userId,
        portfolio: DEFAULT_PORTFOLIO,
        price_alerts: DEFAULT_ALERTS,
        preferences: DEFAULT_PREFERENCES,
      });
      
      if (error) {
        console.error('[syncService] clearAllData error:', error);
        throw error;
      }
    } catch (err) {
      console.error('[syncService] Failed to clear Supabase data:', err);
      throw err;
    }
  }
  
  return true;
}

// ── Exports ───────────────────────────────────────────────────────────────────

export { initSync, loadUserData, syncPortfolio, syncAlerts, syncPreferences, clearAllData };
