import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { getSupabase } from './supabaseClient';
import { ensureProfileRow } from './supabaseProfile';
import { loadUserData } from './syncService';

function isEmailUser(session) {
  if (!session?.user) return false;
  // Anonymous users have is_anonymous === true; email users always have an email
  return Boolean(session.user.email) && session.user.is_anonymous !== true;
}

const L = {
  title:        { es: 'Cuenta',              en: 'Account' },
  sign_in:      { es: 'Iniciar sesión',       en: 'Sign in' },
  sign_up:      { es: 'Crear cuenta',         en: 'Sign up' },
  sign_out:     { es: 'Cerrar sesión',        en: 'Sign out' },
  email:        { es: 'Correo electrónico',   en: 'Email' },
  password:     { es: 'Contraseña',           en: 'Password' },
  confirm_pw:   { es: 'Confirmar contraseña', en: 'Confirm password' },
  no_account:   { es: '¿No tienes cuenta?',   en: "Don't have an account?" },
  has_account:  { es: '¿Ya tienes cuenta?',   en: 'Already have an account?' },
  signed_as:    { es: 'Sesión iniciada como', en: 'Signed in as' },
  err_email:    { es: 'Correo inválido.',     en: 'Invalid email.' },
  err_pw_len:   { es: 'La contraseña debe tener al menos 6 caracteres.', en: 'Password must be at least 6 characters.' },
  err_pw_match: { es: 'Las contraseñas no coinciden.', en: 'Passwords do not match.' },
  success_up:   { es: 'Cuenta creada. Revisa tu correo para confirmar.', en: 'Account created. Check your email to confirm.' },
  loading:      { es: 'Cargando…',            en: 'Loading…' },
  reset_link:   { es: 'Enviar link para restablecer contraseña', en: 'Send password reset link' },
  reset_sent:   { es: 'Revisa tu correo para restablecer tu contraseña.', en: 'Check your email to reset your password.' },
  reset_error:  { es: 'No se pudo enviar el correo. Verifica el email.', en: 'Could not send email. Check the address.' },
};

const s = (key, lang) => L[key]?.[lang === 'es' ? 'es' : 'en'] ?? L[key]?.en ?? key;

export default function AuthEmailPanel({ lang = 'es', onUserDataLoaded }) {
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(false);
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [showReset, setShowReset] = useState(false);
  const [resetSending, setResetSending] = useState(false);

  useEffect(() => {
    if (!supabase) { setReady(true); return; }
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (evt, s) => {
      setSession(s);
      if (evt === 'SIGNED_IN' && s?.user) {
        try {
          await ensureProfileRow(supabase, s.user);
          const data = await loadUserData();
          if (onUserDataLoaded) onUserDataLoaded(data);
        } catch (e) { console.error(e); }
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const reset = () => { setError(null); setInfo(null); setShowReset(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    reset();
    const trimEmail = email.trim().toLowerCase();
    if (!trimEmail.includes('@') || trimEmail.length < 5) { setError(s('err_email', lang)); return; }
    if (password.length < 6) { setError(s('err_pw_len', lang)); return; }
    if (mode === 'signup' && password !== confirmPw) { setError(s('err_pw_match', lang)); return; }

    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: trimEmail, password });
        if (err) {
          // Show reset option on invalid credentials
          if (err.message?.toLowerCase().includes('invalid login') || err.message?.toLowerCase().includes('invalid credentials')) {
            setShowReset(true);
          }
          throw err;
        }
      } else {
        const { error: err } = await supabase.auth.signUp({ email: trimEmail, password });
        if (err) throw err;
        setInfo(s('success_up', lang));
        setMode('signin');
        setPassword('');
        setConfirmPw('');
      }
    } catch (err) {
      setError(err.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async () => {
    const trimEmail = email.trim().toLowerCase();
    if (!trimEmail.includes('@') || trimEmail.length < 5) { setError(s('err_email', lang)); return; }
    setResetSending(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(trimEmail);
    setResetSending(false);
    if (err) { setError(s('reset_error', lang)); return; }
    setError(null);
    setShowReset(false);
    setInfo(s('reset_sent', lang));
  };

  const signOut = async () => {
    if (!supabase) return;
    reset();
    await supabase.auth.signOut();
  };

  if (!supabase) return null;

  if (!ready) {
    return (
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 flex items-center gap-2 text-slate-400 text-sm">
        <Loader2 className="animate-spin" size={18} />
        {s('loading', lang)}
      </div>
    );
  }

  const loggedIn = isEmailUser(session);

  return (
    <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700">
      <h2 className="text-white font-semibold mb-4">{s('title', lang)}</h2>

      {loggedIn ? (
        <div className="space-y-3">
          <p className="text-slate-300 text-sm">
            {s('signed_as', lang)}{' '}
            <span className="text-white font-medium">{session.user.email}</span>
          </p>
          <button type="button" onClick={signOut}
            className="bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            {s('sign_out', lang)}
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Show sign-out if there's any session (e.g. anonymous) */}
          {session?.user && (
            <div className="flex items-center justify-between mb-1">
              <p className="text-slate-500 text-xs">{session.user.email || 'Anonymous session'}</p>
              <button type="button" onClick={signOut}
                className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-1 rounded-lg text-xs font-semibold">
                {s('sign_out', lang)}
              </button>
            </div>
          )}
          {/* Email */}
          <div>
            <label className="block text-slate-400 text-xs mb-1">{s('email', lang)}</label>
            <input
              type="email"
              autoComplete="email"
              required
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
              value={email}
              onChange={e => { setEmail(e.target.value); reset(); }}
              placeholder="your@email.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-slate-400 text-xs mb-1">{s('password', lang)}</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                required
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 pr-9 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                value={password}
                onChange={e => { setPassword(e.target.value); reset(); }}
              />
              <button type="button" onClick={() => setShowPw(p => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Confirm password (signup only) */}
          {mode === 'signup' && (
            <div>
              <label className="block text-slate-400 text-xs mb-1">{s('confirm_pw', lang)}</label>
              <input
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                required
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                value={confirmPw}
                onChange={e => { setConfirmPw(e.target.value); reset(); }}
              />
            </div>
          )}

          {/* Feedback */}
          {error && (
            <div>
              <p className="text-red-300 text-xs">{error}</p>
              {showReset && mode === 'signin' && (
                <button
                  type="button"
                  disabled={resetSending}
                  onClick={sendReset}
                  className="mt-2 flex items-center gap-1.5 text-xs text-amber-300 hover:text-amber-200 underline disabled:opacity-50"
                >
                  {resetSending && <Loader2 className="animate-spin" size={12} />}
                  {s('reset_link', lang)}
                </button>
              )}
            </div>
          )}
          {info  && <p className="text-emerald-300 text-xs">{info}</p>}

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2 rounded-lg text-sm font-semibold flex items-center justify-center gap-2">
            {loading && <Loader2 className="animate-spin" size={16} />}
            {s(mode === 'signin' ? 'sign_in' : 'sign_up', lang)}
          </button>

          {/* Toggle mode */}
          <p className="text-slate-500 text-xs text-center">
            {s(mode === 'signin' ? 'no_account' : 'has_account', lang)}{' '}
            <button type="button"
              onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); reset(); }}
              className="text-blue-400 hover:text-blue-300 underline">
              {s(mode === 'signin' ? 'sign_up' : 'sign_in', lang)}
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
