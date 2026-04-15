import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import * as chatService from './chatService';
import { t } from './i18n';

const MAX_BODY = 1000;

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function isSameDay(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

export default function ChatWindow({
  conversationId,
  supabase,
  currentUser,
  otherProfile,
  lang,
  onClose,
}) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const bottomRef = useRef(null);
  const channelRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load historical messages ordered by created_at ASC
  const loadMessages = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setLoading(false);
    if (error) {
      setLoadError(error.message);
      return;
    }
    setMessages(data || []);
  }, [supabase, conversationId]);

  // Mark as read (best-effort, errors only logged)
  const markRead = useCallback(async () => {
    try {
      await chatService.markAsRead(supabase, conversationId, currentUser.id);
    } catch (e) {
      console.error('markAsRead error:', e);
    }
  }, [supabase, conversationId, currentUser.id]);

  // Mount: load messages, subscribe, mark read
  useEffect(() => {
    loadMessages().then(() => {
      markRead();
    });

    channelRef.current = chatService.subscribeToMessages(
      supabase,
      conversationId,
      (newMsg) => {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        markRead();
      }
    );

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    if (body.trim() === '') return;
    setSending(true);
    setSendError(null);
    try {
      await chatService.sendMessage(supabase, conversationId, currentUser.id, body);
      setBody('');
    } catch (e) {
      setSendError(e.message || t('chat_send_error', lang));
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const otherName = otherProfile?.display_name || otherProfile?.handle || '?';
  const otherInitial = otherName.slice(0, 1).toUpperCase();

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/70 p-4">
      <div className="bg-slate-900 border border-slate-600 rounded-xl w-full max-w-lg flex flex-col shadow-2xl"
           style={{ height: 'min(600px, 90vh)' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700 shrink-0">
          {otherProfile?.avatar_url ? (
            <img
              src={otherProfile.avatar_url}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-slate-600 shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-600 border border-slate-500 shrink-0 flex items-center justify-center text-slate-300 text-xs font-bold">
              {otherInitial}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">{otherName}</p>
            {otherProfile?.handle && (
              <p className="text-slate-500 text-xs">@{otherProfile.handle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 shrink-0"
            aria-label={t('chat_close', lang)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
          {loading ? (
            <div className="flex items-center justify-center h-full gap-2 text-slate-400 text-sm">
              <Loader2 className="animate-spin" size={18} />
              {t('chat_loading_messages', lang)}
            </div>
          ) : loadError ? (
            <div className="text-red-300 text-sm bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2">
              {loadError}
            </div>
          ) : messages.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">
              {t('chat_no_messages_start', lang)}
            </p>
          ) : (
            messages.map((msg, idx) => {
              const isOwn = msg.sender_id === currentUser.id;
              const showDate =
                idx === 0 || !isSameDay(messages[idx - 1].created_at, msg.created_at);

              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div className="flex justify-center my-2">
                      <span className="text-slate-500 text-xs bg-slate-800 px-2 py-0.5 rounded-full">
                        {formatDate(msg.created_at)}
                      </span>
                    </div>
                  )}
                  <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end gap-1`}>
                    <button
                      type="button"
                      onClick={async () => {
                        const { error } = await supabase.from('messages').delete().eq('id', msg.id);
                        if (!error) setMessages(prev => prev.filter(m => m.id !== msg.id));
                      }}
                      className="text-slate-600 hover:text-red-400 text-xs mb-1 shrink-0"
                      title={lang === 'es' ? 'Borrar' : 'Delete'}
                    >
                      ✕
                    </button>
                    <div
                      className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm break-words ${
                        isOwn
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-slate-700 text-slate-100 rounded-bl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.body}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isOwn ? 'text-blue-200' : 'text-slate-400'
                        } text-right`}
                      >
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Send error */}
        {sendError && (
          <div className="mx-4 mb-1 text-red-300 text-xs bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-1.5">
            {sendError}
          </div>
        )}

        {/* Input area */}
        <div className="px-4 py-3 border-t border-slate-700 shrink-0">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                className="w-full bg-slate-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 resize-none min-h-[40px] max-h-[120px]"
                placeholder={t('chat_type_message', lang)}
                value={body}
                maxLength={MAX_BODY}
                rows={1}
                onChange={(e) => setBody(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending}
              />
              <span
                className={`absolute bottom-1.5 right-2 text-xs ${
                  body.length >= MAX_BODY ? 'text-red-400' : 'text-slate-500'
                }`}
              >
                {body.length}/{MAX_BODY}
              </span>
            </div>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || body.trim() === ''}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white p-2.5 rounded-xl shrink-0 flex items-center justify-center"
              aria-label={t('chat_send', lang)}
            >
              {sending ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
