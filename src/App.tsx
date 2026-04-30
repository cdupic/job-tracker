// src/App.tsx
import { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LayoutGrid, BarChart2, Settings, Moon, Sun, Languages } from 'lucide-react'
import { cn } from '@/lib/utils'
import { BoardPage } from '@/pages/BoardPage'
import { StatsPage } from '@/pages/StatsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { Toaster } from '@/components/ui/Toaster'
import { I18nProvider, useI18n, LOCALES, type AppLocale } from '@/i18n'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 0 } },
})

function ThemeToggle() {
  const [dark, setDark] = useState(() =>
      document.documentElement.classList.contains('dark')
  )
  function toggle() {
    document.documentElement.classList.toggle('dark')
    setDark((d) => !d)
  }
  return (
      <button
          onClick={toggle}
          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          aria-label="Toggle theme"
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>
  )
}

const LOCALE_FLAG: Record<AppLocale, string> = {
  fr: '🇫🇷',
  en: '🇬🇧',
  de: '🇩🇪',
}

function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)

  return (
      <div className="relative">
        <button
            onClick={() => setOpen((o) => !o)}
            className="h-8 w-8 lg:w-auto lg:px-2 rounded-md flex items-center justify-center gap-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors text-sm"
            aria-label="Change language"
        >
          <Languages className="h-4 w-4 shrink-0" />
          <span className="hidden lg:inline font-mono text-xs">{locale.toUpperCase()}</span>
        </button>

        {open && (
            <>
              {/* backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute bottom-full left-0 mb-2 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[140px]">
                {LOCALES.map((l) => (
                    <button
                        key={l}
                        onClick={() => { setLocale(l); setOpen(false) }}
                        className={cn(
                            'flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-accent transition-colors',
                            l === locale && 'bg-accent text-foreground font-medium'
                        )}
                    >
                      <span>{LOCALE_FLAG[l]}</span>
                      <span>{t.languageName}</span>
                      {/* show each language's own name */}
                      {l !== locale && (
                          <span className="text-xs text-muted-foreground ml-auto">
                    {l === 'fr' ? 'Français' : l === 'en' ? 'English' : 'Deutsch'}
                  </span>
                      )}
                    </button>
                ))}
              </div>
            </>
        )}
      </div>
  )
}

function AppShell() {
  const { t } = useI18n()

  const navItems = [
    { to: '/', icon: LayoutGrid, label: t.nav.board },
    { to: '/stats', icon: BarChart2, label: t.nav.stats },
    { to: '/settings', icon: Settings, label: t.nav.settings },
  ]

  return (
      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <aside className="w-16 lg:w-52 shrink-0 border-r border-border flex flex-col py-6 px-2 lg:px-4">
          {/* Logo */}
          <div className="mb-8 px-2 lg:px-0">
            <span className="font-display text-xl text-foreground hidden lg:block">JAT</span>
            <span className="font-display text-xl text-foreground lg:hidden block text-center">J</span>
            <span className="text-[10px] font-mono text-muted-foreground hidden lg:block mt-0.5">
            {t.nav.subtitle}
          </span>
          </div>

          {/* Nav */}
          <nav className="flex flex-col gap-1 flex-1">
            {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    className={({ isActive }) =>
                        cn(
                            'flex items-center gap-3 rounded-md px-2 py-2.5 text-sm transition-colors',
                            'hover:bg-accent hover:text-accent-foreground',
                            isActive
                                ? 'bg-accent text-foreground font-medium'
                                : 'text-muted-foreground'
                        )
                    }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden lg:block">{label}</span>
                </NavLink>
            ))}
          </nav>

          {/* Bottom controls */}
          <div className="flex flex-col gap-1 items-center lg:items-start">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-6 lg:p-10">
            <Routes>
              <Route path="/" element={<BoardPage />} />
              <Route path="/stats" element={<StatsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
  )
}

export default function App() {
  return (
      <I18nProvider>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AppShell />
            <Toaster />
          </BrowserRouter>
        </QueryClientProvider>
      </I18nProvider>
  )
}
