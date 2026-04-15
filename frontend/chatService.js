/**
 * chatService.js
 * Pure module encapsulating all chat logic: conversations, messages, and Realtime subscriptions.
 */

/**
 * Returns true if the user is an EmailUser (authenticated with email).
 * @param {object|null} user - Supabase user object
 * @returns {boolean}
 */
export function isEmailUser(user) {
  return !!user?.email;
}

/**
 * Gets or creates a 1-to-1 conversation between two users.
 * Normalizes the pair so the smaller UUID is always participant_a.
 * Throws if userIdA === userIdB.
 *
 * @param {object} supabase - Supabase client
 * @param {string} userIdA
 * @param {string} userIdB
 * @returns {Promise<object>} The conversation record
 */
export async function getOrCreateConversation(supabase, userIdA, userIdB) {
  if (userIdA === userIdB) {
    throw new Error('Cannot create a conversation with yourself.');
  }

  // Normalize: smaller UUID is participant_a
  const [participant_a, participant_b] =
    userIdA < userIdB ? [userIdA, userIdB] : [userIdB, userIdA];

  const { data, error } = await supabase
    .from('conversations')
    .upsert(
      { participant_a, participant_b },
      { onConflict: 'participant_a,participant_b', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Sends a message in a conversation.
 * Rejects if body is empty or only whitespace.
 * Truncates body to 1000 characters before persisting.
 *
 * @param {object} supabase - Supabase client
 * @param {string} conversationId
 * @param {string} senderId
 * @param {string} body
 * @returns {Promise<object>} The inserted message record
 */
export async function sendMessage(supabase, conversationId, senderId, body) {
  if (!body || body.trim() === '') {
    throw new Error('Message body cannot be empty.');
  }

  const truncatedBody = body.slice(0, 1000);

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, body: truncatedBody })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Marks all unread messages in a conversation as read for the given user.
 *
 * @param {object} supabase - Supabase client
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<void>}
 */
export async function markAsRead(supabase, conversationId, userId) {
  // Determine which participant slot this user occupies
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('participant_a, participant_b')
    .eq('id', conversationId)
    .single();

  if (convError) throw convError;

  const isParticipantA = conv.participant_a === userId;
  const readField = isParticipantA ? 'read_by_a' : 'read_by_b';
  const unreadFilter = isParticipantA ? { read_by_a: false } : { read_by_b: false };

  const { error } = await supabase
    .from('messages')
    .update({ [readField]: true })
    .eq('conversation_id', conversationId)
    .eq(Object.keys(unreadFilter)[0], false);

  if (error) throw error;
}

/**
 * Returns the count of unread messages in a conversation for the given user.
 *
 * @param {object} supabase - Supabase client
 * @param {string} conversationId
 * @param {string} userId
 * @returns {Promise<number>}
 */
export async function getUnreadCount(supabase, conversationId, userId) {
  // Determine which participant slot this user occupies
  const { data: conv, error: convError } = await supabase
    .from('conversations')
    .select('participant_a, participant_b')
    .eq('id', conversationId)
    .single();

  if (convError) throw convError;

  const isParticipantA = conv.participant_a === userId;
  const readField = isParticipantA ? 'read_by_a' : 'read_by_b';

  const { count, error } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .eq(readField, false);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Subscribes to INSERT events on the messages table for a given conversation.
 * Returns the RealtimeChannel so the caller can unsubscribe.
 *
 * @param {object} supabase - Supabase client
 * @param {string} conversationId
 * @param {function} onMessage - Callback invoked with each new message payload
 * @returns {object} RealtimeChannel
 */
export function subscribeToMessages(supabase, conversationId, onMessage) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onMessage(payload.new)
    )
    .subscribe();

  return channel;
}

/**
 * Subscribes to UPDATE events on the conversations table for a given user
 * (where the user is participant_a or participant_b).
 * Returns the RealtimeChannel so the caller can unsubscribe.
 *
 * @param {object} supabase - Supabase client
 * @param {string} userId
 * @param {function} onUpdate - Callback invoked with each updated conversation payload
 * @returns {object} RealtimeChannel
 */
export function subscribeToConversations(supabase, userId, onUpdate) {
  const channel = supabase
    .channel(`conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `participant_a=eq.${userId}`,
      },
      (payload) => onUpdate(payload.new)
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversations',
        filter: `participant_b=eq.${userId}`,
      },
      (payload) => onUpdate(payload.new)
    )
    .subscribe();

  return channel;
}
