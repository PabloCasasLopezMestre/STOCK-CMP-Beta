import React, { useEffect, useState } from 'react';
import { X, Loader2, MessageSquare } from 'lucide-react';
import * as chatService from './chatService';
import { t } from './i18n';

function sentimentBadgeClass(s) {
  if (s === 'bullish') return 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40';
  if (s === 'bearish') return 'bg-red-600/30 text-red-300 border-red-500/40';
  return 'bg-slate-600/50 text-slate-300 border-slate-500/40';
}

export default function ProfileViewer({ profileId, supabase, currentUser, lang, onClose, onOpenChat }) {
  const [profile, setProfile] = useState(null);
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);

  useEffect(() => {
    if (!supabase || !profileId) return;

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const [profileRes, ideasRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, handle, display_name, bio, avatar_url, country')
          .eq('id', profileId)
          .single(),
        supabase
          .from('community_ideas')
          .select('id, body, sentiment, tickers, chart_url, like_count, created_at')
          .eq('author_id', profileId)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (cancelled) return;

      if (profileRes.error) {
        setError(profileRes.error.message || 'Error al cargar el perfil.');
        setLoading(false);
        return;
      }

      setProfile(profileRes.data);
      setIdeas(ideasRes.data || []);
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [supabase, profileId]);

  const handleSendMessage = async () => {
    if (!supabase || !currentUser || !profile) return;
    setChatError(null);
    setChatLoading(true);
    try {
      const conversation = await chatService.getOrCreateConversation(supabase, currentUser.id, profileId);
      onOpenChat(conversation.id);
    } catch (e) {
      setChatError(e.message || 'Error al abrir la conversación.');
    } finally {
      setChatLoading(false);
    }
  };

  // Button visibility logic
  const viewerIsEmail = chatService.isEmailUser(currentUser);
  // A profile belongs to an EmailUser if their handle is NOT auto-generated (u_ prefix with 14 chars total)
  const isAutoHandle = (h) => /^u_[a-z0-9]{12}$/.test(h || '');
  const profileIsEmail = profile ? !isAutoHandle(profile.handle) : false;
  const isSelf = currentUser?.id === profileId;

  // Hidden: profile belongs to AnonUser
  const showButton = profileIsEmail;
  // Enabled: viewer is EmailUser AND profile is another EmailUser AND not self
  const buttonEnabled = viewerIsEmail && profileIsEmail && !isSelf;

  const name = profile?.display_name || profile?.handle || '—';
  const initial = (name || '?').slice(0, 1).toUpperCase();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="bg-slate-900 border border-slate-600 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-white font-semibold text-sm">
            {t('profile_viewer_title', lang)}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded"
            aria-label={t('profile_viewer_close', lang)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
          {loading && (
            <div className="flex items-center justify-center gap-2 text-slate-400 text-sm py-12">
              <Loader2 className="animate-spin" size={20} />
              {t('profile_viewer_loading', lang)}
            </div>
          )}

          {!loading && error && (
            <div className="text-red-300 bg-red-900/30 border border-red-700/50 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {!loading && !error && profile && (
            <>
              {/* Profile header */}
              <div className="flex items-start gap-4 mb-4">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="w-16 h-16 rounded-full object-cover border border-slate-600 shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-600 border border-slate-500 shrink-0 flex items-center justify-center text-slate-200 text-2xl font-bold">
                    {initial}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-lg leading-tight truncate">{name}</p>
                  {profile.handle && (
                    <p className="text-slate-400 text-sm">@{profile.handle}</p>
                  )}
                  {profile.country && profile.country.trim() !== '' && (
                    <p className="text-slate-400 text-xs mt-1">{profile.country}</p>
                  )}
                  {profile.bio && profile.bio.trim() !== '' && (
                    <p className="text-slate-300 text-sm mt-2 whitespace-pre-wrap">{profile.bio}</p>
                  )}
                </div>
              </div>

              {/* Send message button */}
              {showButton && (
                <div className="mb-4">
                  {chatError && (
                    <p className="text-red-300 text-xs mb-2 bg-red-900/20 border border-red-800/50 rounded px-2 py-1">
                      {chatError}
                    </p>
                  )}
                  <span
                    title={!viewerIsEmail ? t('profile_viewer_requires_email', lang) : undefined}
                    className="inline-block"
                  >
                    <button
                      type="button"
                      disabled={!buttonEnabled || chatLoading}
                      onClick={handleSendMessage}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                    >
                      {chatLoading ? (
                        <Loader2 className="animate-spin" size={16} />
                      ) : (
                        <MessageSquare size={16} />
                      )}
                      {t('profile_viewer_send_message', lang)}
                    </button>
                  </span>
                </div>
              )}

              {/* Ideas */}
              <div>
                <p className="text-slate-400 text-xs font-semibold mb-3 uppercase tracking-wide">
                  {t('profile_viewer_latest_ideas', lang)}
                  {ideas.length > 0 && <span className="ml-1 text-slate-500">({ideas.length})</span>}
                </p>
                {ideas.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-6">
                    {t('profile_viewer_no_ideas', lang)}
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {ideas.map((idea) => (
                      <li key={idea.id} className="bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded border ${sentimentBadgeClass(idea.sentiment)}`}
                          >
                            {idea.sentiment === 'bullish'
                              ? (lang === 'es' ? t('community_bullish', lang) : t('community_bullish', lang))
                              : idea.sentiment === 'bearish'
                                ? t('community_bearish', lang)
                                : t('community_neutral', lang)}
                          </span>
                          <span className="text-slate-500 text-xs ml-auto">
                            {new Date(idea.created_at).toLocaleString(lang === 'es' ? 'es-MX' : undefined)}
                          </span>
                        </div>
                        {(idea.tickers || []).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {idea.tickers.map((sym) => (
                              <span key={sym} className="bg-blue-900/40 text-blue-200 text-xs font-bold px-2 py-0.5 rounded">
                                {sym}
                              </span>
                            ))}
                          </div>
                        )}
                        <p className="text-slate-200 text-sm whitespace-pre-wrap">{idea.body}</p>
                        {idea.chart_url && (
                          <a
                            href={idea.chart_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-400 text-xs mt-2 inline-block hover:underline"
                          >
                            {t('profile_viewer_view_chart', lang)}
                          </a>
                        )}
                        <div className="mt-2 text-slate-500 text-xs">
                          ♥ {idea.like_count ?? 0}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
