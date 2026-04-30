import { useEffect, useRef } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { Home, BarChart3, Calculator, FileText, Bed } from 'lucide-react'
import { NavItem } from '../../types'
import { ThemeToggle } from '../ui/ThemeToggle'
import { LanguageSwitcher } from '../LanguageSwitcher'
import { FooterVersion } from '../VersionDisplay'
import { useTranslation } from 'react-i18next'

export function AppLayout() {
  const { t } = useTranslation()
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  // Focus main content on route change for accessibility
  useEffect(() => {
    mainRef.current?.focus()
  }, [location.pathname])

  const navigation: NavItem[] = [
    { name: t('nav.home'), href: '/', icon: Home },
    { name: t('nav.dashboard'), href: '/dashboard', icon: BarChart3 },
    { name: t('nav.calculator'), href: '/roi', icon: Calculator },
    { name: t('nav.reports'), href: '/reports', icon: FileText },
    { name: t('nav.sublease'), href: '/sublease', icon: Bed },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-blue-600 text-white px-4 py-2 rounded-md focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
      >
        Skip to main content
      </a>
      
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <nav className="container mx-auto px-4 h-16 flex items-center gap-6">
          <div className="mr-4 flex">
            <NavLink 
              to="/" 
              className="mr-6 flex items-center space-x-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md"
            >
              <div className="h-6 w-6 rounded bg-primary" />
              <span className="hidden font-bold sm:inline-block">
                BridgeStay Analytics
              </span>
            </NavLink>
          </div>
          <div className="flex items-center space-x-6 text-sm font-medium">
            {navigation.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) => 
                    `flex items-center gap-2 transition-colors hover:text-foreground/80 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-md px-2 py-1 ${
                      isActive ? 'text-foreground' : 'text-foreground/60'
                    }`
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </NavLink>
              )
            })}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </nav>
      </header>
      
      <main 
        id="main-content" 
        ref={mainRef}
        tabIndex={-1}
        className="container mx-auto px-4 py-6 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        role="main"
      >
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-6">
          <FooterVersion />
        </div>
      </footer>
    </div>
  )
}
