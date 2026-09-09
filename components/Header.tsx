'use client';

import React from 'react';
import { 
  Sun, 
  Moon, 
  Binary, 
  FileText, 
  ArrowLeftRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { ThemeMode } from '@/types';

interface HeaderProps {
  mode: 'encode' | 'decode';
  onToggleMode: () => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onReset: () => void;
}

const emptySubscribe = () => () => {};

export function Header({
  mode,
  onToggleMode,
  theme,
  onToggleTheme,
  onReset,
}: HeaderProps) {
  const isMounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  return (
    <header className="sticky top-0 z-30 w-full border-b border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-[#0a0a0c]/80 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Branding & Tag */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-zinc-950 dark:bg-white flex items-center justify-center text-white dark:text-zinc-950 font-mono font-bold text-xs shadow-sm">
            64
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-100">
              Traductor Base64
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium border border-emerald-500/20">
              <Zap className="w-3 h-3" />
              Nativo • Sin límite de tokens
            </span>
          </div>
        </div>

        {/* Center: Mode Indicator & Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800">
          <button
            type="button"
            id="header-mode-encode-btn"
            onClick={() => {
              if (mode !== 'encode') onToggleMode();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              mode === 'encode'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span className="hidden sm:inline">Texto a Base64</span>
            <span className="sm:hidden">Codificar</span>
          </button>

          <button
            type="button"
            id="header-swap-mode-btn"
            onClick={onToggleMode}
            title="Invertir dirección"
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/50 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            id="header-mode-decode-btn"
            onClick={() => {
              if (mode !== 'decode') onToggleMode();
            }}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
              mode === 'decode'
                ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
            }`}
          >
            <Binary className="w-3.5 h-3.5 text-purple-500" />
            <span className="hidden sm:inline">Base64 a Texto</span>
            <span className="sm:hidden">Decodificar</span>
          </button>
        </div>

        {/* Right: Security info & Theme Toggle */}
        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% Privado en tu navegador</span>
          </div>

          <button
            type="button"
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-colors"
            aria-label="Cambiar tema claro/oscuro"
            suppressHydrationWarning
          >
            {isMounted ? (
              theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-zinc-700" />
              )
            ) : (
              <span className="w-4 h-4 inline-block" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
