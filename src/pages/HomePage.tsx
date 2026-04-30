import { Calculator, BarChart3, FileText, Bed } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import { FeatureCard } from '../components/ui/FeatureCard'
import { useTranslation } from 'react-i18next'

export default function HomePage() {
  const { t } = useTranslation()

  const features = [
    {
      title: t('home.features.roi.title'),
      description: t('home.features.roi.description'),
      icon: Calculator,
      href: '/roi',
      iconColor: 'text-blue-600',
      iconBgColor: 'bg-blue-50',
    },
    {
      title: t('home.features.cashflow.title'),
      description: t('home.features.cashflow.description'),
      icon: BarChart3,
      href: '/dashboard',
      iconColor: 'text-green-600',
      iconBgColor: 'bg-green-50',
    },
    {
      title: t('home.features.reports.title'),
      description: t('home.features.reports.description'),
      icon: FileText,
      href: '/report',
      iconColor: 'text-purple-600',
      iconBgColor: 'bg-purple-50',
    },
    {
      title: t('home.features.sublease.title'),
      description: t('home.features.sublease.description'),
      icon: Bed,
      href: '/sublease',
      iconColor: 'text-orange-600',
      iconBgColor: 'bg-orange-50',
    },
  ]

  return (
    <>
      <Helmet>
        <title>BridgeStay Analytics - Real Estate Investment Analysis</title>
        <meta name="description" content="Professional real estate investment analysis and property evaluation tools" />
        <meta property="og:title" content="BridgeStay Analytics" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={window.location.origin} />
        <meta property="og:description" content="Professional real estate investment analysis and property evaluation tools" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      
      {/* Hero Section */}
      <div className="text-center space-y-6 mb-16">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-5xl md:text-6xl">
          {t('home.title')}
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto leading-relaxed">
          {t('home.subtitle')}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 md:gap-6">
          <a
            href="/roi"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl border border-black/10 px-4 py-2 
                       text-sm font-medium text-blue-700 hover:bg-blue-50 transition"
          >
            {t('home.getStarted')}
            <span aria-hidden>→</span>
          </a>

          <a
            href="/dashboard"
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 
                       text-sm font-medium text-gray-800 hover:underline underline-offset-4 transition"
          >
            {t('home.viewDashboard')}
          </a>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mb-16">
        {features.map((feature) => (
          <FeatureCard
            key={feature.title}
            title={feature.title}
            description={feature.description}
            icon={feature.icon}
            href={feature.href}
            iconColor={feature.iconColor}
            iconBgColor={feature.iconBgColor}
          />
        ))}
      </div>

      {/* Additional Info */}
      <div className="text-center space-y-4 max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
          Why Choose BridgeStay Analytics?
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
          Our platform provides comprehensive tools for real estate investors to analyze properties, 
          track performance, and make informed investment decisions with confidence.
        </p>
        </div>
    </>
  )
}
