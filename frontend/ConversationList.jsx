import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Loader2 } from 'lucide-react';
import { isEmailUser, subscribeToConversations, getUnreadCount } from './chatService';
import { t } from './i18n';

/**
 * Returns a relative timestamp string (e.g. "hace 5 min", "2h ago").
 */
function relativeTime(ts, lang) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (lang === 'es') {
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins} min`;
    if (hours < 24) return `hace ${hours}h`;
    return `hace ${days}d`;
  }
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

/**
 * Truncates a string to maxLen characters.
 */
function truncate(str, maxLen) {
  if (!str) return '';
  return str.length <= maxLen ? str : str.slice(0, maxLen);
}

/**
 * UnreadBadge — shows count, "99+" if > 99, hidden if 0.
 */
function UnreadBadge({ count }) {
  if (!count || count === 0) return null;
  const label = count > 99 ? '99+' : String(count);
  return (
    <span className="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-blue-600 text-white text-xs font-bold leading-none">
      {label}
    </span>
  );
}

/**
 * ConversationList
 *
 * Props:
 *   supabase          — Supabase client
 *   currentUser       — Supabase user object (or null)
 *   lang              — locale string
 *   onOpenConversation(conversationId, otherProfile) — callback
 */
export default function ConversationList({ supabase, currentUser, lang, onOpenConversation, onUnreadChange }) {
  const [conversations, setConversations] = useState([]);
  const [profiles, setProfiles] = useState({}); // keyed by userId
  const [unreadCounts, setUnreadCounts] = useState({}); // keyed by conversationId
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const channelRef = useRef(null);

  const isEmail = isEmailUser(currentUser);

  // ── Fetch unread count for a single conversation ──────────────────────────
  const fetchUnread = useCallback(
    async (conversationId) => {
      if (!supabase || !currentUser?.id) return;
      try {
        const count = await getUnreadCount(supabase, conversationId, currentUser.id);
        setUnreadCounts((prev) => ({ ...prev, [conversationId]: count }));
      } catch (e) {
        console.error('getUnreadCount error:', e);
      }
    },
    [supabase, currentUser?.id]
  );

  // ── Load conversations + other-participant profiles ───────────────────────
  const loadConversations = useCallback(async () => {
    if (!supabase || !currentUser?.id) return;
    setLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_a.eq.${currentUser.id},participant_b.eq.${currentUser.id}`)
      .order('last_message_at', { ascending: false });

    setLoading(false);

    if (error) {
      setLoadError(error.message);
      setConversations([]);
      return;
    }

    const convs = data || [];
    setConversations(convs);

    // Collect other-participant IDs
    const otherIds = [
      ...new Set(
        convs.map((c) =>
          c.participant_a === currentUser.id ? c.participant_b : c.participant_a
        )
      ),
    ];

    if (otherIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, display_name, handle, avatar_url')
        .in('id', otherIds);

      const profileMap = {};
      for (const p of profileData || []) {
        profileMap[p.id] = p;
      }
      setProfiles(profileMap);
    }

    // Fetch unread counts for all conversations
    for (const c of convs) {
      fetchUnread(c.id);
    }
  }, [supabase, currentUser?.id, fetchUnread]);

  // ── Subscribe to conversation updates via Realtime ────────────────────────
  useEffect(() => {
    if (!isEmail || !supabase || !currentUser?.id) return;

    loadConversations();

    channelRef.current = subscribeToConversations(supabase, currentUser.id, (updatedConv) => {
      setConversations((prev) => {
        const idx = prev.findIndex((c) => c.id === updatedConv.id);
        let next;
        if (idx >= 0) {
          next = [...prev];
          next[idx] = { ...next[idx], ...updatedConv };
        } else {
          next = [updatedConv, ...prev];
        }
        // Re-sort by last_message_at DESC
        return next.sort(
          (a, b) =>
            new Date(b.last_message_at || b.created_at) -
            new Date(a.last_message_at || a.created_at)
        );
      });
      // Refresh unread count for the updated conversation
      fetchUnread(updatedConv.id);
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmail, currentUser?.id]);

  // ── Guard: non-email user ─────────────────────────────────────────────────
  if (!isEmail) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-slate-300 text-sm text-center">
          {t('chat_require_email', lang)}
        </div>
      </div>
    );
  }

  // ── Compute total unread ──────────────────────────────────────────────────
  const totalUnread = Object.values(unreadCounts).reduce((sum, n) => sum + (n || 0), 0);

  useEffect(() => {
    if (onUnreadChange) onUnreadChange(totalUnread);
  }, [totalUnread, onUnreadChange]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto p-4 pb-16">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <MessageCircle size={20} className="text-blue-400 shrink-0" />
        <h2 className="text-white font-semibold text-lg">
          {t('chat_messages_tab', lang)}
        </h2>
        {totalUnread > 0 && (
          <UnreadBadge count={totalUnread} />
        )}
      </div>

      {/* Error */}
      {loadError && (
        <div className="mb-4 text-sm text-red-300 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2">
          {loadError}
        </div>
      )}

      {/* Loading */}
      {loading && conversations.length === 0 ? (
        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm py-12">
          <Loader2 className="animate-spin" size={18} />
          {t('chat_loading', lang)}
        </div>
      ) : conversations.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-12">
          {t('chat_empty_conversations', lang)}
        </p>
      ) : (
        <ul className="space-y-2">
          {conversations.map((conv) => {
            const otherId =
              conv.participant_a === currentUser.id ? conv.participant_b : conv.participant_a;
            const otherProfile = profiles[otherId] || {};
            const otherName = otherProfile.display_name || otherProfile.handle || '?';
            const otherInitial = otherName.slice(0, 1).toUpperCase();
            const preview = truncate(conv.last_message_preview || '', 60);
            const unread = unreadCounts[conv.id] || 0;

            return (
              <li key={conv.id}>
                <button
                  type="button"
                  onClick={() => onOpenConversation(conv.id, otherProfile)}
                  className="w-full flex items-center gap-3 bg-slate-800/60 hover:bg-slate-700/60 border border-slate-700 rounded-xl px-4 py-3 text-left transition-colors"
                >
                  {/* Avatar */}
                  {otherProfile.avatar_url ? (
                    <img
                      src={otherProfile.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border border-slate-600 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-600 border border-slate-500 shrink-0 flex items-center justify-center text-slate-300 text-sm font-bold">
                      {otherInitial}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-white font-semibold text-sm truncate">{otherName}</span>
                      <span className="text-slate-500 text-xs shrink-0">
                        {relativeTime(conv.last_message_at, lang)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-slate-400 text-xs truncate">
                        {preview || t('chat_no_messages_yet', lang)}
                      </span>
                      <UnreadBadge count={unread} />
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
