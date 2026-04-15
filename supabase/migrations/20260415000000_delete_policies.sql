-- Allow ANY authenticated user (including anon) to delete any community idea
drop policy if exists "community_ideas_delete_own" on public.community_ideas;
create policy "community_ideas_delete_any"
  on public.community_ideas for delete
  using (auth.uid() is not null);

-- Allow ANY authenticated user (including anon) to delete any chat message
drop policy if exists "msg_delete_own" on public.messages;
create policy "msg_delete_any"
  on public.messages for delete
  using (auth.uid() is not null);
