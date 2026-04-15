/** community_ideas.author_id → profiles.id; crea fila si el trigger no corrió */
export async function ensureProfileRow(supabase, user) {
  if (!user?.id) return;
  const { data: row } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
  if (row) return;
  const compact = user.id.replace(/-/g, '');
  const handle = `u_${compact.slice(0, 12)}`;
  const { error } = await supabase.from('profiles').insert({
    id: user.id,
    handle,
    display_name: 'Inversor',
  });
  if (error) throw error;
}
