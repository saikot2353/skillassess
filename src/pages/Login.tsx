import React, { useState } from 'react';
import { Shield, KeyRound, Mail, ArrowRight, Sparkles, CheckCircle2, Eye, EyeOff, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { useToast } from '../context/ToastContext';
import { Role, User } from '../types';
import { StorageService, STORAGE_KEYS } from '../services/storageService';

interface DemoAccount {
  role: Role;
  label: string;
  email: string;
  usernameHint?: string;
  password: string;
  description: string;
}

export const Login: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const { login } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { showToast } = useToast();

  const [email, setEmail] = useState('superadmin@skillassess360.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const demoAccounts: DemoAccount[] = [
    {
      role: 'SUPER_ADMIN',
      label: t.roles.SUPER_ADMIN,
      email: 'superadmin@skillassess360.com',
      usernameHint: 'superadmin',
      password: 'admin123',
      description: 'Global authority & governance across countries and centers',
    },
    {
      role: 'COUNTRY_ACCOUNT',
      label: `${t.roles.COUNTRY_ACCOUNT} (Saudi Arabia)`,
      email: 'country.sa@skillassess360.com',
      usernameHint: 'country.sa',
      password: 'country123',
      description: 'Manages national centers and approves local operations',
    },
    {
      role: 'CENTER_ADMIN',
      label: `${t.roles.CENTER_ADMIN} (Riyadh Hub)`,
      email: 'center.admin@skillassess360.com',
      usernameHint: 'admin.riyadh',
      password: 'center123',
      description: 'Oversees center schedules, batches, and candidate sessions',
    },
    {
      role: 'ASSESSOR',
      label: `${t.roles.ASSESSOR} (Lead Technical - Eng. Yasir)`,
      email: 'assessor.lead@skillassess360.com',
      usernameHint: 'assessor01',
      password: 'assessor123',
      description: 'Conducts practical evaluations, verifies candidates, uploads evidence & locks ratings',
    },
    {
      role: 'SUPPORT_STAFF',
      label: t.roles.SUPPORT_STAFF,
      email: 'support.staff@skillassess360.com',
      usernameHint: 'support01',
      password: 'support123',
      description: 'Assists candidate verification, registration, and seating',
    },
  ];

  const handleSelectDemoAccount = (account: DemoAccount) => {
    setEmail(account.email);
    setPassword(account.password);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    setTimeout(() => {
      const success = login(email, password);
      setIsLoading(false);

      if (success) {
        showToast(t.toasts.loginSuccess, 'success');
        const authUser = StorageService.get<User | null>(STORAGE_KEYS.AUTH, null);
        if (authUser?.role === 'ASSESSOR') {
          onNavigate('/assessor/dashboard');
        } else {
          onNavigate('/dashboard');
        }
      } else {
        setError(t.auth.invalidCredentials);
        showToast(t.auth.invalidCredentials, 'error');
      }
    }, 400);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-canvas-base">
      {/* Top bar with logo and language switch */}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-maroon-800 text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-sm">
            360
          </div>
          <div>
            <span className="text-base font-bold text-stone-900 leading-none block">
              {t.brand.name}
            </span>
            <span className="text-[10px] text-stone-500 font-medium leading-none block mt-0.5">
              {t.brand.tagline}
            </span>
          </div>
        </div>

        {/* Language switch button */}
        <div className="flex items-center border border-borderlight rounded-md p-0.5 bg-white text-xs font-medium shadow-soft">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-2.5 py-1 rounded transition-colors ${
              language === 'en'
                ? 'bg-maroon-50 text-maroon-900 font-semibold border border-maroon-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            English
          </button>
          <span className="text-stone-300">|</span>
          <button
            type="button"
            onClick={() => setLanguage('ar')}
            className={`px-2.5 py-1 rounded transition-colors font-arabic ${
              language === 'ar'
                ? 'bg-maroon-50 text-maroon-900 font-semibold border border-maroon-200'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            العربية
          </button>
        </div>
      </div>

      {/* Main Login Card and Demo Selector */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left / Login Form Panel (7 Cols) */}
          <div className="lg:col-span-7 bg-white rounded-lg border border-borderlight p-6 sm:p-8 shadow-soft">
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-maroon-50 border border-maroon-200 text-maroon-900 text-xs font-semibold mb-3">
                <Shield className="w-3.5 h-3.5 text-maroon-700" />
                <span>Enterprise Identity Portal</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight">
                {t.auth.signInTitle}
              </h2>
              <p className="text-xs sm:text-sm text-stone-500 mt-1">
                {t.auth.signInSubtitle}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label={language === 'ar' ? 'اسم المستخدم أو البريد الإلكتروني' : 'Username or Email Address'}
                type="text"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                leftIcon={<Mail className="w-4 h-4" />}
                placeholder="assessor01 or name@skillassess360.com"
              />

              <div className="relative">
                <Input
                  label={t.auth.password}
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  leftIcon={<KeyRound className="w-4 h-4" />}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-8 text-stone-400 hover:text-stone-700 p-1"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="rounded border-borderlight text-[#7A2E3A] focus:ring-[#7A2E3A]"
                  />
                  <span>{t.auth.rememberMe}</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => setIsForgotOpen(true)}
                  className="text-[#7A2E3A] hover:underline"
                >
                  {t.auth.forgotPassword}
                </button>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  className="w-full text-sm font-semibold bg-[#7A2E3A] hover:bg-[#682430] text-white"
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {t.auth.loginButton}
                </Button>
              </div>
            </form>

            <div className="mt-6 pt-4 border-t border-borderlight text-center">
              <p className="text-[11px] text-stone-400">
                {t.auth.demoNotice}
              </p>
            </div>
          </div>

          {/* Right / Demo Accounts Helper (5 Cols) */}
          <div className="lg:col-span-5 bg-white/70 border border-borderlight rounded-lg p-5 shadow-soft">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-gold-600" />
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                {t.auth.demoAccountsTitle}
              </h3>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              {t.auth.demoAccountsSubtitle}
            </p>

            <div className="space-y-2.5">
              {demoAccounts.map(acc => {
                const isSelected = email === acc.email || email === acc.usernameHint;
                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleSelectDemoAccount(acc)}
                    className={`w-full text-start p-3 rounded-md border transition-all text-xs ${
                      isSelected
                        ? 'bg-[#F8ECEE] border-[#7A2E3A] ring-1 ring-[#7A2E3A]'
                        : 'bg-white border-borderlight hover:bg-stone-50 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-stone-900">{acc.label}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#7A2E3A]" />}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-stone-500 font-mono truncate">
                      <span>{acc.email}</span>
                      {acc.usernameHint && (
                        <span className="text-[10px] text-[#C9A24D] font-bold">user: {acc.usernameHint}</span>
                      )}
                    </div>
                    <p className="text-[10px] text-stone-400 mt-1 line-clamp-1">{acc.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsForgotOpen(false)}
          title={language === 'ar' ? 'استعادة بيانات الاعتماد التجريبية' : 'Prototype Credential Recovery'}
          maxWidth="sm"
          footer={
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setIsForgotOpen(false)}>
                {t.common.close}
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs text-[#3F3030]">
            <p>
              {language === 'ar'
                ? 'في هذا النموذج الأولي، يتم تهيئة بيانات اعتماد تجريبية مسبقاً لكافة الأدوار التشغيلية.'
                : 'In this prototype environment, pre-seeded accounts are provided for immediate testing.'}
            </p>
            <div className="p-3 bg-[#FFFCF8] rounded-md border border-[#E8D9D2] font-mono text-[11px] space-y-1">
              <div><strong>Assessor Username:</strong> assessor01</div>
              <div><strong>Assessor Password:</strong> assessor123</div>
              <div><strong>Lead Assessor:</strong> assessor.lead@skillassess360.com</div>
            </div>
            <p className="text-[#806F6F]">
              {language === 'ar'
                ? 'انقر على بطاقة "المقيّم المعتمد" في لوحة الحسابات التجريبية لتعبئة الحقول تلقائياً.'
                : 'Click any account card in the quick demo panel to autofill credentials automatically.'}
            </p>
          </div>
        </Modal>
      )}

      {/* Footer */}
      <div className="w-full border-t border-borderlight py-4 px-4 text-center text-xs text-stone-400 bg-white">
        © 2026 SkillAssess 360 Platform. Enterprise Digital Assessment Infrastructure.
      </div>
    </div>
  );
};
