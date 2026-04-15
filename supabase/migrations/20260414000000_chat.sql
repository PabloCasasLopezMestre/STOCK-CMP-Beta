-- Migración: tablas conversations y messages para chat directo entre traders
-- Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6

-- ============================================================
-- Tabla conversations
-- ============================================================
create table public.conversations (
  id              uuid primary key default gen_random_uuid(),
  participant_a   uuid not null references auth.users(id) on delete cascade,
  participant_b   uuid not null references auth.users(id) on delete cascade,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  constraint conversations_pair_unique unique (participant_a, participant_b),
  constraint conversations_ordered check (participant_a < participant_b)
);

-- ============================================================
-- Tabla messages
-- ============================================================
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id       uuid not null references auth.users(id) on delete cascade,
  body            text not null check (char_length(body) between 1 and 1000),
  created_at      timestamptz not null default now(),
  read_by_a       boolean not null default false,
  read_by_b       boolean not null default false
);

create index messages_conversation_created_idx
  on public.messages(conversation_id, created_at asc);

-- ============================================================
-- Trigger: actualiza last_message_at al insertar un mensaje
-- ============================================================
create or replace function public.update_conversation_last_message()
returns trigger language plpgsql security definer as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger tr_update_last_message
  after insert on public.messages
  for each row execute function public.update_conversation_last_message();

-- ============================================================
-- RLS: conversations
-- ============================================================
alter table public.conversations enable row level security;

create policy "conv_select_participant"
  on public.conversations for select
  to authenticated
  using (participant_a = auth.uid() or participant_b = auth.uid());

create policy "conv_insert_participant"
  on public.conversations for insert
  to authenticated
  with check (participant_a = auth.uid() or participant_b = auth.uid());

-- ============================================================
-- RLS: messages
-- ============================================================
alter table public.messages enable row level security;

-- Leer: solo si el usuario participa en la conversación
create policy "msg_select_participant"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

-- Insertar: solo el remitente puede insertar sus propios mensajes
create policy "msg_insert_own"
  on public.messages for insert
  to authenticated
  with check (sender_id = auth.uid());

-- Actualizar read_by_*: solo participantes de la conversación
create policy "msg_update_read"
  on public.messages for update
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.participant_a = auth.uid() or c.participant_b = auth.uid())
    )
  );

-- ============================================================
-- Realtime
-- ============================================================
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
