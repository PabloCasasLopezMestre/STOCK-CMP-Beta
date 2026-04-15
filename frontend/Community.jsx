import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Heart, X, Loader2 } from 'lucide-react';
import { t } from './i18n';
import { getSupabase } from './supabaseClient';
import { ensureProfileRow } from './supabaseProfile';
import TraderSearch from './TraderSearch';
import ProfileViewer from './ProfileViewer';
import ChatWindow from './ChatWindow';
import ConversationList from './ConversationList';

const TICKER_RE = /^[A-Z0-9=\-\.]{1,10}$/i;

function parseTickers(raw) {
  const parts = raw
    .split(/[\s,]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const out = [];
  for (const p of parts) {
    if (!TICKER_RE.test(p)) continue;
    if (!out.includes(p)) out.push(p);
    if (out.length >= 5) break;
  }
  return out;
}

function sentimentBadgeClass(s) {
  if (s === 'bullish') return 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40';
  if (s === 'bearish') return 'bg-red-600/30 text-red-300 border-red-500/40';
  return 'bg-slate-600/50 text-slate-300 border-slate-500/40';
}

function trendingFromIdeas(ideas, limit = 8) {
  const counts = new Map();
  for (const row of ideas || []) {
    for (const sym of row.tickers || []) {
      counts.set(sym, (counts.get(sym) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([sym]) => sym);
}


export default function Community({ lang, prefill, onPrefillConsumed }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [sort, setSort] = useState('recent'); // recent | popular
  const [likedIds, setLikedIds] = useState(new Set());
  const [composerOpen, setComposerOpen] = useState(false);
  const [tickerInput, setTickerInput] = useState('');
  const [body, setBody] = useState('');
  const [sentiment, setSentiment] = useState('neutral');
  const [chartUrl, setChartUrl] = useState('');
  const [publishError, setPublishError] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'messages'
  const [feedLang, setFeedLang] = useState('all'); // 'all' | 'es' | 'en'
  const [selectedProfileId, setSelectedProfileId] = useState(null);
  const [openConversationId, setOpenConversationId] = useState(null);
  const [openConversationOtherProfile, setOpenConversationOtherProfile] = useState(null);
  const [totalUnread, setTotalUnread] = useState(0);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setAuthReady(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => subscription.unsubscribe();
  }, [supabase]);

  const ensureSession = useCallback(async () => {
    if (!supabase) return null;
    const { data: { session: cur } } = await supabase.auth.getSession();
    if (cur) {
      setSession(cur);
      if (cur.user) {
        try {
          await ensureProfileRow(supabase, cur.user);
        } catch (e) {
          console.error(e);
        }
      }
      return cur;
    }
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    setSession(data.session);
    if (data.session?.user) {
      try {
        await ensureProfileRow(supabase, data.session.user);
      } catch (e) {
        console.error(e);
      }
    }
    return data.session;
  }, [supabase]);

  const fetchLiked = useCallback(
    async (userId, ideaIds) => {
      if (!supabase || !userId || !ideaIds.length) {
        setLikedIds(new Set());
        return;
      }
      const { data, error } = await supabase
        .from('community_idea_likes')
        .select('idea_id')
        .eq('user_id', userId)
        .in('idea_id', ideaIds);
      if (error) return;
      setLikedIds(new Set((data || []).map((r) => r.idea_id)));
    },
    [supabase]
  );

  const loadIdeas = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    setLoadError(null);
    const order =
      sort === 'popular'
        ? { column: 'like_count', ascending: false }
        : { column: 'created_at', ascending: false };
    const { data, error } = await supabase
      .from('community_ideas')
      .select(
        'id, body, sentiment, tickers, chart_url, like_count, created_at, author_id, profiles!community_ideas_author_id_fkey(handle, display_name, avatar_url)'
      )
      .order(order.column, { ascending: order.ascending })
      .limit(80);
    setLoading(false);
    if (error) {
      setLoadError(error.message);
      setIdeas([]);
      return;
    }
    setIdeas(data || []);
    const uid = session?.user?.id;
    if (uid && data?.length) {
      fetchLiked(
        uid,
        data.map((r) => r.id)
      );
    } else {
      setLikedIds(new Set());
    }
  }, [supabase, sort, session?.user?.id, fetchLiked]);

  useEffect(() => {
    if (!supabase) return;
    loadIdeas();
  }, [supabase, loadIdeas]);

  useEffect(() => {
    if (!prefill?.openModal) return;
    const tickers = prefill.tickers?.length ? prefill.tickers : [];
    setTickerInput(tickers.join(', '));
    setComposerOpen(true);
    onPrefillConsumed?.();
  }, [prefill, onPrefillConsumed]);

  const toggleLike = async (ideaId) => {
    if (!supabase) return;
    try {
      const s = await ensureSession();
      if (!s?.user?.id) return;
      const uid = s.user.id;
      if (likedIds.has(ideaId)) {
        const { error } = await supabase
          .from('community_idea_likes')
          .delete()
          .eq('idea_id', ideaId)
          .eq('user_id', uid);
        if (error) throw error;
        setLikedIds((prev) => {
          const next = new Set(prev);
          next.delete(ideaId);
          return next;
        });
        setIdeas((prev) =>
          prev.map((row) =>
            row.id === ideaId ? { ...row, like_count: Math.max(0, (row.like_count || 0) - 1) } : row
          )
        );
      } else {
        const { error } = await supabase.from('community_idea_likes').insert({ idea_id: ideaId, user_id: uid });
        if (error) throw error;
        setLikedIds((prev) => new Set(prev).add(ideaId));
        setIdeas((prev) =>
          prev.map((row) =>
            row.id === ideaId ? { ...row, like_count: (row.like_count || 0) + 1 } : row
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteIdea = async (ideaId) => {
    if (!supabase) return;
    const uid = session?.user?.id;
    if (!uid) return;
    const { error } = await supabase.from('community_ideas').delete().eq('id', ideaId);
    if (!error) setIdeas(prev => prev.filter(r => r.id !== ideaId));
  };

  const openComposer = async () => {
    setPublishError(null);
    if (!supabase) return;
    try {
      await ensureSession();
      setComposerOpen(true);
    } catch (e) {
      setPublishError(t('community_auth_error', lang));
    }
  };

  const publish = async () => {
    if (!supabase) return;
    setPublishError(null);
    const tickers = parseTickers(tickerInput);
    const text = body.trim();
    if (!text.length) {
      setPublishError(t('community_write_analysis', lang));
      return;
    }
    if (!tickers.length) {
      setPublishError(t('community_add_ticker', lang));
      return;
    }
    setPublishing(true);
    try {
      const s = await ensureSession();
      if (!s?.user?.id) throw new Error('no session');
      const uid = s.user.id;
      await ensureProfileRow(supabase, s.user);
      const { error } = await supabase.from('community_ideas').insert({
        author_id: uid,
        body: text.slice(0, 500),
        sentiment,
        tickers,
        chart_url: chartUrl.trim() || null,
      });
      if (error) throw error;
      setBody('');
      setTickerInput('');
      setChartUrl('');
      setSentiment('neutral');
      setComposerOpen(false);
      await loadIdeas();
    } catch (e) {
      setPublishError(e.message || t('community_auth_error', lang));
    } finally {
      setPublishing(false);
    }
  };

  const trending = useMemo(() => trendingFromIdeas(ideas), [ideas]);

  if (!supabase) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="bg-amber-900/30 border border-amber-600/50 rounded-xl p-6 text-amber-100 text-sm">
          <p className="font-semibold mb-2">{t('community_title', lang)}</p>
          <p>{t('community_env_hint', lang)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 pb-16">
      {/* Tab bar */}
      <div className="flex gap-2 mb-4">
        <button
          type="button"
          onClick={() => setActiveTab('feed')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'feed' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          Feed
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('messages')}
          className={`relative px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            activeTab === 'messages' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {t('chat_messages_tab', lang)}
          {totalUnread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[1.1rem] h-[1.1rem] px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
              {totalUnread > 99 ? '+99' : totalUnread}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'messages' ? (
        <>
          <div className="mb-4">
            <TraderSearch
              supabase={supabase}
              lang={lang}
              onSelectProfile={(profileId) => setSelectedProfileId(profileId)}
            />
          </div>
          <ConversationList
            supabase={supabase}
            currentUser={session?.user}
            lang={lang}
            onUnreadChange={setTotalUnread}
            onOpenConversation={(convId, otherProfile) => {
              setOpenConversationId(convId);
              setOpenConversationOtherProfile(otherProfile);
            }}
          />
        </>
      ) : (
        <>
      <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 mb-4 border border-slate-700">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{t('community_title', lang)}</h1>
            <p className="text-slate-400 text-sm">{t('community_subtitle', lang)}</p>
          </div>
          <button
            type="button"
            onClick={openComposer}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shrink-0"
          >
            {t('community_new_idea', lang)}
          </button>
        </div>
        <p className="text-slate-500 text-xs mt-4">{t('community_coming', lang)}</p>
      </div>

      {/* TraderSearch */}
      <div className="mb-4">
        <TraderSearch
          supabase={supabase}
          lang={lang}
          onSelectProfile={(profileId) => setSelectedProfileId(profileId)}
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => setSort('recent')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium ${
            sort === 'recent' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {t('community_sort_recent', lang)}
        </button>
        <button
          type="button"
          onClick={() => setSort('popular')}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium ${
            sort === 'popular' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          }`}
        >
          {t('community_sort_popular', lang)}
        </button>
        <div className="ml-auto flex gap-1">
          {[
            { key: 'all', label: lang === 'es' ? 'Todos' : 'All' },
            { key: 'es',  label: 'Español' },
            { key: 'en',  label: 'English' },
          ].map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFeedLang(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                feedLang === key ? 'bg-slate-500 text-white' : 'bg-slate-700/50 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {trending.length > 0 && (
        <div className="bg-slate-800/40 rounded-xl p-4 mb-4 border border-slate-700">
          <p className="text-slate-400 text-xs font-semibold mb-2">{t('community_trending', lang)}</p>
          <div className="flex flex-wrap gap-2">
            {trending.map((sym) => (
              <span key={sym} className="bg-slate-700 text-slate-200 text-xs font-bold px-2.5 py-1 rounded-md">
                {sym}
              </span>
            ))}
          </div>
        </div>
      )}

      {publishError && !composerOpen && (
        <div className="mb-4 text-sm text-red-300 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2">{publishError}</div>
      )}

      {loadError && (
        <div className="mb-4 text-sm text-red-300 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2">{loadError}</div>
      )}

      {loading && !ideas.length ? (
        <div className="flex items-center gap-2 text-slate-400 text-sm py-8 justify-center">
          <Loader2 className="animate-spin" size={20} />
          {t('community_loading', lang)}
        </div>
      ) : ideas.length === 0 ? (
        <p className="text-slate-500 text-center py-12 text-sm">{t('community_empty', lang)}</p>
      ) : (
        <ul className="space-y-3">
          {ideas.filter(row => {
            if (feedLang === 'all') return true;
            const text = (row.body || '').toLowerCase();
            const hasSpanish = /[áéíóúüñ¿¡]/.test(text) || /\b(que|con|para|por|una|los|las|del|como|más|pero|esto|este|esta|hay|tiene|cuando|donde|sobre|también)\b/.test(text);
            return feedLang === 'es' ? hasSpanish : !hasSpanish;
          }).map((row) => {
            const prof = row.profiles;
            const name = prof?.display_name || prof?.handle || '—';
            const handle = prof?.handle ? `@${prof.handle}` : '';
            return (
              <li
                key={row.id}
                className="bg-slate-800/60 border border-slate-700 rounded-xl p-4"
              >
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {prof?.avatar_url ? (
                    <img
                      src={prof.avatar_url}
                      alt=""
                      className="w-9 h-9 rounded-full object-cover border border-slate-600 shrink-0"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-slate-600 border border-slate-500 shrink-0 flex items-center justify-center text-slate-300 text-xs font-bold">
                      {(name || '?').slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => row.author_id && setSelectedProfileId(row.author_id)}
                    className="text-white font-semibold text-sm hover:underline focus:outline-none"
                  >
                    {name}
                  </button>
                  {handle && (
                    <button
                      type="button"
                      onClick={() => row.author_id && setSelectedProfileId(row.author_id)}
                      className="text-slate-500 text-xs hover:underline focus:outline-none"
                    >
                      {handle}
                    </button>
                  )}
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded border ${sentimentBadgeClass(row.sentiment)}`}
                  >
                    {row.sentiment === 'bullish'
                      ? t('community_bullish', lang)
                      : row.sentiment === 'bearish'
                        ? t('community_bearish', lang)
                        : t('community_neutral', lang)}
                  </span>
                  <span className="text-slate-500 text-xs ml-auto">
                    {new Date(row.created_at).toLocaleString(lang === 'es' ? 'es-MX' : undefined)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(row.tickers || []).map((sym) => (
                    <span key={sym} className="bg-blue-900/40 text-blue-200 text-xs font-bold px-2 py-0.5 rounded">
                      {sym}
                    </span>
                  ))}
                </div>
                <p className="text-slate-200 text-sm whitespace-pre-wrap">{row.body}</p>
                {row.chart_url && (
                  <a
                    href={row.chart_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 text-xs mt-2 inline-block hover:underline"
                  >
                    {t('community_chart_url', lang)}
                  </a>
                )}
                <div className="mt-3 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!authReady}
                    onClick={() => toggleLike(row.id)}
                    className={`flex items-center gap-1.5 text-sm font-medium px-2 py-1 rounded-lg transition-colors ${
                      likedIds.has(row.id)
                        ? 'text-pink-400 bg-pink-900/30'
                        : 'text-slate-400 hover:text-slate-200 bg-slate-700/50'
                    }`}
                  >
                    <Heart size={16} className={likedIds.has(row.id) ? 'fill-current' : ''} />
                    {row.like_count ?? 0}
                  </button>
                  {session?.user?.id && (
                    <button
                      type="button"
                      onClick={() => deleteIdea(row.id)}
                      className="text-slate-500 hover:text-red-400 text-xs px-2 py-1 rounded-lg bg-slate-700/50 transition-colors"
                    >
                      {lang === 'es' ? 'Borrar' : 'Delete'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
        </>
      )}

      {/* ProfileViewer modal */}
      {selectedProfileId && (
        <ProfileViewer
          profileId={selectedProfileId}
          supabase={supabase}
          currentUser={session?.user}
          lang={lang}
          onClose={() => setSelectedProfileId(null)}
          onOpenChat={(convId) => {
            setOpenConversationId(convId);
            setOpenConversationOtherProfile(null);
            setSelectedProfileId(null);
          }}
        />
      )}

      {/* ChatWindow modal */}
      {openConversationId && (
        <ChatWindow
          conversationId={openConversationId}
          supabase={supabase}
          currentUser={session?.user}
          otherProfile={openConversationOtherProfile}
          lang={lang}
          onClose={() => setOpenConversationId(null)}
        />
      )}

      {composerOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-slate-600 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
              <h2 className="text-white font-semibold">{t('community_new_idea', lang)}</h2>
              <button
                type="button"
                onClick={() => setComposerOpen(false)}
                className="text-slate-400 hover:text-white p-1"
                aria-label={t('btn_cancel', lang)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {publishError && (
                <p className="text-red-300 text-sm bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">{publishError}</p>
              )}
              <div>
                <label className="block text-slate-400 text-xs mb-1">{t('community_tickers_label', lang)}</label>
                <input
                  className="w-full bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                  value={tickerInput}
                  onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                  placeholder="AAPL, MSFT"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">{t('community_body_label', lang)}</label>
                <textarea
                  className="w-full bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 min-h-[120px] resize-y"
                  value={body}
                  maxLength={500}
                  onChange={(e) => setBody(e.target.value)}
                />
                <p className="text-slate-500 text-xs mt-1 text-right">{body.length}/500</p>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">{t('community_sentiment', lang)}</label>
                <div className="flex flex-wrap gap-2">
                  {['bullish', 'neutral', 'bearish'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSentiment(s)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        sentiment === s ? sentimentBadgeClass(s) + ' ring-2 ring-blue-500' : 'bg-slate-800 text-slate-400 border-slate-600'
                      }`}
                    >
                      {s === 'bullish'
                        ? t('community_bullish', lang)
                        : s === 'bearish'
                          ? t('community_bearish', lang)
                          : t('community_neutral', lang)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">{t('community_chart_url', lang)}</label>
                <input
                  className="w-full bg-slate-800 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                  value={chartUrl}
                  onChange={(e) => setChartUrl(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <button
                type="button"
                disabled={publishing}
                onClick={publish}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
              >
                {publishing && <Loader2 className="animate-spin" size={18} />}
                {t('community_publish', lang)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
