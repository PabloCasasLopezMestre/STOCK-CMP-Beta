import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { t } from './i18n';

export default function TraderSearch({ supabase, lang, onSelectProfile }) {
  const [input, setInput] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    const query = input.startsWith('@') ? input.slice(1) : input;

    if (query.length < 2) {
      setResults([]);
      setError(null);
      setSearched(false);
      clearTimeout(debounceRef.current);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!supabase) return;
      setLoading(true);
      setError(null);
      const { data, error: qErr } = await supabase
        .from('profiles')
        .select('id, handle, display_name, avatar_url')
        .ilike('handle', `%${query}%`)
        .limit(10);
      setLoading(false);
      setSearched(true);
      if (qErr) {
        setError(`${t('trader_search_error', lang)}: ${qErr.message}`);
        setResults([]);
      } else {
        setResults(data || []);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [input, supabase, lang]);

  const showList = !loading && !error && searched && (input.startsWith('@') ? input.slice(1) : input).length >= 2;

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('trader_search_placeholder', lang)}
          className="w-full bg-slate-800 text-white rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-500"
        />
        {loading && (
          <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
        )}
      </div>

      {error && (
        <div className="mt-2 text-sm text-red-300 bg-red-900/30 border border-red-700/50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {showList && (
        <ul className="mt-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl">
          {results.length === 0 ? (
            <li className="px-4 py-3 text-slate-400 text-sm">
              {t('trader_search_not_found', lang)}
            </li>
          ) : (
            results.map((profile) => {
              const name = profile.display_name || profile.handle || '?';
              return (
                <li key={profile.id}>
                  <button
                    type="button"
                    onClick={() => onSelectProfile(profile.id)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700 transition-colors text-left"
                  >
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover border border-slate-600 shrink-0"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-600 border border-slate-500 shrink-0 flex items-center justify-center text-slate-300 text-xs font-bold">
                        {name.slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-white text-sm font-medium truncate">{name}</p>
                      {profile.handle && (
                        <p className="text-slate-400 text-xs truncate">@{profile.handle}</p>
                      )}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}
