import React, { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { t } from './i18n';
import { getSupabase } from './supabaseClient';
import { ensureProfileRow } from './supabaseProfile';

const HANDLE_RE = /^[a-z0-9_]{3,30}$/;

export default function CommunityProfileSettings({ lang, accountCreated }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [country, setCountry] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second for live timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate account age
  const getAccountAge = () => {
    if (!accountCreated) return null;
    
    const created = new Date(accountCreated);
    const now = currentTime;
    const diffMs = now - created;
    
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    if (days > 0) {
      return lang === 'es' 
        ? `${days}d ${hours}h`
        : `${days}d ${hours}h`;
    } else if (hours > 0) {
      return lang === 'es'
        ? `${hours}h ${minutes}m`
        : `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return lang === 'es'
        ? `${minutes}m ${seconds}s`
        : `${minutes}m ${seconds}s`;
    } else {
      return lang === 'es'
        ? `${seconds}s`
        : `${seconds}s`;
    }
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      let { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (error || !data.session) {
          if (!cancelled) setLoading(false);
          return;
        }
        session = data.session;
      }
      if (!session?.user || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }
      try {
        await ensureProfileRow(supabase, session.user);
      } catch (_) {}
      const { data: prof, error } = await supabase
        .from('profiles')
        .select('display_name, handle, bio, avatar_url, country')
        .eq('id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error?.message?.includes('column')) {
        setStatus('migration');
        setLoading(false);
        return;
      }
      if (prof) {
        setDisplayName(prof.display_name ?? '');
        setHandle(prof.handle ?? '');
        setBio(prof.bio ?? '');
        setAvatarUrl(prof.avatar_url ?? '');
        setCountry(prof.country ?? '');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const save = async () => {
    if (!supabase) return;
    setStatus(null);
    const h = handle.trim().replace(/^@+/, '').toLowerCase();
    if (!HANDLE_RE.test(h)) {
      setStatus('bad_handle');
      return;
    }
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setSaving(false);
      setStatus('no_session');
      return;
    }
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: (displayName.trim() || 'Inversor').slice(0, 80),
        handle: h,
        bio: bio.trim() ? bio.trim().slice(0, 280) : null,
        avatar_url: avatarUrl.trim() ? avatarUrl.trim().slice(0, 500) : null,
        country: country.trim() ? country.trim().slice(0, 80) : null,
      })
      .eq('id', session.user.id);
    setSaving(false);
    if (error) {
      if (error.code === '23505') setStatus('handle_taken');
      else if (error.message?.includes('column')) setStatus('migration');
      else setStatus(error.message);
      return;
    }
    setStatus('ok');
  };

  if (!supabase) return null;

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-white font-semibold">{t('settings_profile_community', lang)}</h2>
        {accountCreated && (
          <div className="text-right">
            <p className="text-slate-500 text-xs">
              {lang === 'es' ? 'Cuenta creada hace' : 'Account created'}
            </p>
            <p className="text-slate-400 text-xs font-mono">
              {getAccountAge()}
            </p>
          </div>
        )}
      </div>
      <p className="text-slate-400 text-sm mb-4">{t('settings_profile_community_hint', lang)}</p>

      {loading ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
          <Loader2 className="animate-spin" size={18} />
          {t('profile_loading', lang)}
        </div>
      ) : status === 'migration' ? (
        <p className="text-amber-200 text-sm bg-amber-900/20 border border-amber-700/40 rounded-lg px-3 py-2">
          {t('profile_migration_needed', lang)}
        </p>
      ) : (
        <>
          {status === 'ok' && (
            <p className="text-emerald-300 text-sm mb-3">{t('profile_saved', lang)}</p>
          )}
          {status && status !== 'ok' && status !== 'migration' && (
            <p className="text-red-300 text-sm mb-3">
              {status === 'bad_handle' && t('profile_bad_handle', lang)}
              {status === 'handle_taken' && t('profile_handle_taken', lang)}
              {status === 'no_session' && t('community_auth_error', lang)}
              {!['bad_handle', 'handle_taken', 'no_session'].includes(status) && String(status)}
            </p>
          )}
          <div className="space-y-3">
            <div>
              <label className="block text-slate-400 text-xs mb-1">{t('profile_display_name', lang)}</label>
              <input
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={80}
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">{t('profile_handle', lang)}</label>
              <input
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase())}
                maxLength={30}
                placeholder="mi_handle"
              />
              <p className="text-slate-500 text-xs mt-1">{t('profile_handle_hint', lang)}</p>
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">{t('profile_bio', lang)}</label>
              <textarea
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 min-h-[72px] resize-y"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={280}
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">{t('profile_avatar', lang)}</label>
              <input
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                maxLength={500}
                placeholder="https://…"
              />
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">{t('profile_country', lang)}</label>
              <input
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                maxLength={80}
                placeholder="México, CDMX…"
              />
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={save}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
            >
              {saving && <Loader2 className="animate-spin" size={16} />}
              {t('profile_save', lang)}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
