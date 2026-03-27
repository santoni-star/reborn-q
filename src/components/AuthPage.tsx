import { useState } from 'react';
import { useStore } from '../store/useStore';
import { firebaseService } from '../services/firebaseService';
import { clsx } from 'clsx';
import { useTranslation } from 'react-i18next';
import { LogIn, UserPlus, Mail, Lock, X } from 'lucide-react';

export const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { updateSettings, setAuthOpen } = useStore();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login with email and password
        await firebaseService.signInWithEmailAndPassword(email, password);
        // Successfully logged in
        updateSettings({ cloudSyncEnabled: true });
        setAuthOpen(false); // Close the auth modal
        // Redirect or update UI as needed
      } else {
        // Register new user
        if (password !== confirmPassword) {
          setError(t('settings.auth.passwordMismatch'));
          return;
        }

        if (password.length < 6) {
          setError(t('settings.auth.passwordTooShort'));
          return;
        }

        await firebaseService.createUserWithEmailAndPassword(email, password, name);
        // Successfully registered
        updateSettings({ cloudSyncEnabled: true });
        setAuthOpen(false); // Close the auth modal
        // Redirect or update UI as needed
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || t('settings.auth.unknownError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError('');
      console.log("[AuthPage] Starting Google Sign-In...");
      
      const user = await firebaseService.signInWithGoogle();
      
      // user will be null if redirecting (mobile)
      if (user) {
        console.log("[AuthPage] Sign-in successful (popup):", user.email);
        updateSettings({ cloudSyncEnabled: true });
        setAuthOpen(false); 
      } else {
        console.log("[AuthPage] Redirecting to Google (mobile flow)...");
        // Button will stay in loading state until redirect happens
      }
    } catch (err: unknown) {
      setLoading(false);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage || t('settings.auth.googleSignInError'));
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-500/5 blur-[100px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="ui-window w-full max-w-md z-10 relative">
        <div className="ui-window-header">
          <div className="flex items-center gap-3 px-2">
            {isLogin ? <LogIn className="w-5 h-5 text-indigo-400" /> : <UserPlus className="w-5 h-5 text-indigo-400" />}
            <h2 className="ui-title-main text-xs">{isLogin ? t('settings.auth.login') : t('settings.auth.register')}</h2>
          </div>
          <button
            onClick={() => setAuthOpen(false)}
            className="p-2 hover:bg-red-500 hover:text-white transition-all rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">
                {t('settings.auth.name')}
              </label>
              <div className="relative">
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('settings.auth.namePlaceholder')}
                  className="w-full bg-white/5 border border-white/5 rounded-xl h-14 px-6 text-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all pl-14"
                  required={!isLogin}
                />
                <div className="absolute left-6 top-1/2 transform -translate-y-1/2 text-zinc-500">
                  <UserPlus className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">
              {t('settings.auth.email')}
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('settings.auth.emailPlaceholder')}
                className="w-full bg-white/5 border border-white/5 rounded-xl h-14 px-6 text-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all pl-14"
                required
              />
              <div className="absolute left-6 top-1/2 transform -translate-y-1/2 text-zinc-500">
                <Mail className="w-5 h-5" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">
              {t('settings.auth.password')}
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('settings.auth.passwordPlaceholder')}
                className="w-full bg-white/5 border border-white/5 rounded-xl h-14 px-6 text-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all pl-14"
                required
              />
              <div className="absolute left-6 top-1/2 transform -translate-y-1/2 text-zinc-500">
                <Lock className="w-5 h-5" />
              </div>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-black uppercase tracking-widest text-zinc-500 mb-2">
                {t('settings.auth.confirmPassword')}
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('settings.auth.confirmPasswordPlaceholder')}
                  className="w-full bg-white/5 border border-white/5 rounded-xl h-14 px-6 text-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 transition-all pl-14"
                  required={!isLogin}
                />
                <div className="absolute left-6 top-1/2 transform -translate-y-1/2 text-zinc-500">
                  <Lock className="w-5 h-5" />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className={clsx(
              "w-full h-14 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95",
              "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20",
              loading && "opacity-70 cursor-not-allowed"
            )}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                {isLogin ? t('settings.auth.loggingIn') : t('settings.auth.registering')}
              </div>
            ) : isLogin ? (
              t('settings.auth.login')
            ) : (
              t('settings.auth.register')
            )}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-widest font-black text-zinc-500">
              {t('settings.auth.or')}
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className={clsx(
              "w-full h-14 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3",
              "bg-red-600 hover:bg-red-500 text-white shadow-red-500/20",
              loading && "opacity-70 cursor-not-allowed"
            )}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brand-google"><path d="M21.8 10.5H12v3h5.5c-.8 2.3-3 4-5.5 4-3.3 0-6-2.7-6-6s2.7-6 6-6c1.7 0 3.2.7 4.2 1.8l3-3A10 10 0 0 0 12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10c0-.5 0-1-.1-1.5z"/></svg>
            {t('settings.auth.signInWithGoogle')}
          </button>

          <div className="text-center pt-4">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
            >
              {isLogin ? t('settings.auth.noAccount') : t('settings.auth.haveAccount')} {isLogin ? t('settings.auth.register') : t('settings.auth.login')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};