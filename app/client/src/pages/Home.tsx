import { Navbar } from "@/components/Navbar";
import { BridgeStayLogo, BridgeIcon } from "@/components/BridgeStayLogo";
import { FeaturedListingCard } from "@/components/FeaturedListingCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListings } from "@/contexts/ListingsContext";
import { siteContent, getText } from "@/lib/translations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Shield,
  Globe,
  CreditCard,
  FileCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
  Building2,
  GraduationCap,
  Heart,
  Star,
  Home as HomeIcon,
  Sparkles,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";
import { useState, useMemo } from "react";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Icon mapping for features
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Shield,
  CreditCard,
  Globe,
  MapPin,
  FileCheck,
  Clock,
};

const universities = [
  "University of Utah",
  "USC",
  "NYU",
  "MIT",
  "Stanford",
  "UC Berkeley",
];

// Friendly Approval Notification Card with bilingual support
function ApprovalCard() {
  const { language } = useLanguage();
  const content = siteContent.approvalCard;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative"
    >
      <Card className="w-[340px] md:w-[380px] bg-white border-0 shadow-soft-xl overflow-hidden">
        <CardContent className="p-6">
          {/* Header with Avatar */}
          <div className="flex items-start gap-4 mb-5">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-2xl">
                👩🏻
              </div>
              <motion.div
                className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 400 }}
              >
                <Check className="w-3.5 h-3.5 text-white" />
              </motion.div>
            </div>
            <div className="flex-1">
              <h3 className={`font-semibold text-gray-900 text-lg ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                {getText(content.name, language)}
              </h3>
              <p className={`text-sm text-gray-500 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                {getText(content.university, language)}
              </p>
            </div>
            <Badge className={`bg-green-50 text-green-700 border-green-200 hover:bg-green-100 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
              {getText(content.statusBadge, language)}
            </Badge>
          </div>
          
          {/* Property Info */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 mb-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center">
                <HomeIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className={`font-medium text-gray-900 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                  {getText(content.listingTitle, language)}
                </p>
                <p className={`text-sm text-gray-500 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                  {getText(content.listingLocation, language)}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className={`text-gray-600 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                {getText(content.monthlyRent, language)}
              </span>
              <span className="font-semibold text-gray-900">$2,450</span>
            </div>
          </div>
          
          {/* Approval Message */}
          <motion.div
            className="flex items-center gap-3 p-4 rounded-2xl bg-green-50 border border-green-100"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className={`font-medium text-green-800 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                {getText(content.approvalMessage, language)}
              </p>
              <p className={`text-sm text-green-600 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                {getText(content.moveInReady, language)}
              </p>
            </div>
          </motion.div>
        </CardContent>
      </Card>
      
      {/* Floating Elements */}
      <motion.div
        className="absolute -top-4 -right-4 w-12 h-12 rounded-2xl bg-white shadow-soft flex items-center justify-center"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <Heart className="w-6 h-6 text-red-400" />
      </motion.div>
      
      <motion.div
        className="absolute -bottom-3 -left-4 w-10 h-10 rounded-xl bg-white shadow-soft flex items-center justify-center"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
      >
        <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
      </motion.div>
    </motion.div>
  );
}

export default function Home() {
  const [searchLocation, setSearchLocation] = useState("");
  const [showFooterContact, setShowFooterContact] = useState(false);
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { t, language } = useLanguage();
  const { allListings, isLoadingSupabase } = useListings();

  // Hidden admin mode - only enabled with ?admin=true in URL
  const isAdminMode = useMemo(() => {
    const params = new URLSearchParams(searchString);
    return params.get('admin') === 'true';
  }, [searchString]);

  const handleSearch = () => {
    if (searchLocation.trim()) {
      setLocation(`/apartments?search=${encodeURIComponent(searchLocation)}`);
    } else {
      setLocation("/apartments");
    }
  };

  // Get translated content
  const hero = siteContent.hero;
  const features = siteContent.features;
  const stats = siteContent.stats;
  const howItWorks = siteContent.howItWorks;
  const featuredListingsContent = siteContent.featuredListings;
  const cta = siteContent.cta;
  const footer = siteContent.footer;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden pt-20">
        {/* Background Image */}
        <div className="absolute inset-0">
          <img
            src="/hero-apartment.png"
            alt="Warm, sunlit apartment interior"
            className="w-full h-full object-cover"
          />
          <div className="hero-overlay absolute inset-0" />
        </div>

        <div className="container relative z-10 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            {/* Left Column - Text Content */}
            <motion.div
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="max-w-xl"
            >
              {/* Badge */}
              <motion.div variants={fadeInUp}>
                <Badge variant="secondary" className={`px-4 py-2 mb-8 text-sm font-medium bg-white/80 backdrop-blur-sm border-0 shadow-soft ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                  <GraduationCap className="w-4 h-4 mr-2 text-primary" />
                  {getText(hero.badge, language)}
                </Badge>
              </motion.div>

              {/* Headline */}
              <motion.h1 variants={fadeInUp} className={`mb-6 text-gray-900 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                {getText(hero.headline, language)}{" "}
                <span className="block mt-2">{getText(hero.headlineWelcome, language)}{" "}
                <span className="gradient-text-warm" style={{ fontFamily: "var(--font-serif)" }}>Bridge</span>{" "}
                <span className="font-light">Stay</span>{language === "cn" ? "。" : "."}</span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                variants={fadeInUp}
                className={`text-xl text-gray-600 mb-8 leading-relaxed ${language === "cn" ? "font-chinese" : ""}`}
                style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}
              >
                {getText(hero.subheadline, language)}
              </motion.p>

              {/* Search Bar */}
              <motion.div variants={fadeInUp} className="mb-8">
                <div className="search-bar flex items-center p-2 pl-6 gap-2">
                  <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <Input
                    type="text"
                    placeholder={getText(hero.searchPlaceholder, language)}
                    value={searchLocation}
                    onChange={(e) => setSearchLocation(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    className={`flex-1 border-0 bg-transparent focus-visible:ring-0 text-base placeholder:text-gray-400 ${language === "cn" ? "font-chinese" : ""}`}
                    style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}
                  />
                  <Button 
                    onClick={handleSearch}
                    className={`h-12 px-8 rounded-full btn-warm text-white font-medium ${language === "cn" ? "font-chinese" : ""}`}
                    style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}
                  >
                    <Search className="w-5 h-5 mr-2" />
                    {getText(hero.searchButton, language)}
                  </Button>
                </div>
              </motion.div>

              {/* Quick Stats */}
              <motion.div
                variants={fadeInUp}
                className="flex flex-wrap items-center gap-6 text-sm"
              >
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className={`text-gray-600 font-medium ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                    {getText(hero.quickStats.approval, language)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className={`text-gray-600 font-medium ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                    {getText(hero.quickStats.creditCheck, language)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className={`text-gray-600 font-medium ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                    {getText(hero.quickStats.online, language)}
                  </span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Approval Card */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="hidden lg:flex justify-center lg:justify-end"
            >
              <ApprovalCard />
            </motion.div>
          </div>
        </div>
      </section>

      {/* University Trust Signals Section */}
      <section className="py-16 bg-white border-y border-gray-100">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <p className={`text-sm text-gray-500 mb-8 font-medium ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
              {language === "cn" ? "受到顶尖大学学生的信赖" : "Trusted by students from top universities"}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
              {universities.map((uni) => (
                <span 
                  key={uni}
                  className="text-lg font-semibold text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {uni}
                </span>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-white to-orange-50/30">
        <div className="container">
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center">
              <div className="text-4xl md:text-5xl font-bold gradient-text-warm mb-2">{stats.studentsHoused.value}</div>
              <div className={`text-gray-500 font-medium ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                {getText(stats.studentsHoused.label, language)}
              </div>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center">
              <div className="text-4xl md:text-5xl font-bold gradient-text-warm mb-2">{stats.partnerProperties.value}</div>
              <div className={`text-gray-500 font-medium ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                {getText(stats.partnerProperties.label, language)}
              </div>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center">
              <div className="text-4xl md:text-5xl font-bold gradient-text-warm mb-2">{stats.universitiesCovered.value}</div>
              <div className={`text-gray-500 font-medium ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                {getText(stats.universitiesCovered.label, language)}
              </div>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center">
              <div className="text-4xl md:text-5xl font-bold gradient-text-warm mb-2">{stats.approvalRate.value}</div>
              <div className={`text-gray-500 font-medium ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                {getText(stats.approvalRate.label, language)}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28 bg-white">
        <div className="container">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-16"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.h2 variants={fadeInUp} className={`mb-4 text-gray-900 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
              {getText(features.sectionTitle, language)}
            </motion.h2>
            <motion.p variants={fadeInUp} className={`text-xl text-gray-600 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
              {getText(features.sectionSubtitle, language)}
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {features.cards.map((feature) => {
              const IconComponent = iconMap[feature.icon] || Shield;
              return (
                <motion.div
                  key={feature.icon}
                  variants={fadeInUp}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="h-full card-warm border-0">
                    <CardContent className="p-8">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 flex items-center justify-center mb-6">
                        <IconComponent className="w-7 h-7 text-primary" />
                      </div>
                      <h3 className={`text-xl font-semibold mb-3 text-gray-900 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                        {getText(feature.title, language)}
                      </h3>
                      <p className={`text-gray-600 leading-relaxed ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                        {getText(feature.description, language)}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* Featured Listings Section */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-white to-orange-50/30">
        <div className="container">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-16"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.h2 variants={fadeInUp} className={`mb-4 text-gray-900 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
              {getText(featuredListingsContent.sectionTitle, language)}
            </motion.h2>
            <motion.p variants={fadeInUp} className={`text-xl text-gray-600 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
              {getText(featuredListingsContent.sectionSubtitle, language)}
            </motion.p>
          </motion.div>

          <motion.div
            className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {allListings.filter(l => l.isFeatured && (l.reviewStatus === "approved" || !l.reviewStatus)).slice(0, 6).map((listing, index) => (
              <motion.div key={listing.id} variants={fadeInUp}>
                <FeaturedListingCard listing={listing} index={index} isAdminMode={isAdminMode} />
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
          >
            <a href="/apartments">
              <Button variant="outline" className={`h-14 px-8 rounded-full text-base font-medium border-gray-300 hover:bg-gray-100 gap-2 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                {getText(featuredListingsContent.viewAll, language)}
                <ArrowRight className="w-5 h-5" />
              </Button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-orange-50/50 to-white">
        <div className="container">
          <motion.div
            className="text-center max-w-2xl mx-auto mb-16"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.h2 variants={fadeInUp} className={`mb-4 text-gray-900 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
              {getText(howItWorks.sectionTitle, language)}
            </motion.h2>
            <motion.p variants={fadeInUp} className={`text-xl text-gray-600 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
              {getText(howItWorks.sectionSubtitle, language)}
            </motion.p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            {howItWorks.steps.map((step, index) => (
              <motion.div key={step.number} variants={fadeInUp} className="relative text-center">
                {index < howItWorks.steps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-orange-200 to-transparent" />
                )}
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-orange-400 text-white text-2xl font-bold flex items-center justify-center mx-auto mb-6 shadow-soft">
                  {step.number}
                </div>
                <h3 className={`text-xl font-semibold mb-3 text-gray-900 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                  {getText(step.title, language)}
                </h3>
                <p className={`text-gray-600 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                  {getText(step.description, language)}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section - For Students */}
      <section className="py-20 md:py-28 bg-white">
        <div className="container">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeInUp}
          >
            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-0 shadow-soft-lg overflow-hidden">
              <CardContent className="p-10 md:p-16 flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center mb-8 shadow-soft">
                    <GraduationCap className="w-8 h-8 text-white" />
                  </div>
                  <h2 className={`mb-6 text-gray-900 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                    {getText(cta.title, language)}
                  </h2>
                  <p className={`text-xl text-gray-600 mb-8 leading-relaxed max-w-lg ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                    {getText(cta.subtitle, language)}
                  </p>
                  <a href="/apartments">
                    <Button className={`h-14 px-8 rounded-full btn-warm text-white font-medium text-base ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                      {getText(cta.button, language)}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </a>
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="grid grid-cols-2 gap-4 max-w-sm">
                    {[
                      { icon: CheckCircle2, text: { en: "No Application Fee", cn: "免申请费" } },
                      { icon: Clock, text: { en: "24hr Approval", cn: "24小时审批" } },
                      { icon: Shield, text: { en: "Secure Payments", cn: "安全支付" } },
                      { icon: Heart, text: { en: "24/7 Support", cn: "全天候支持" } },
                    ].map((item) => (
                      <div key={item.text.en} className="p-5 rounded-2xl bg-white shadow-soft">
                        <item.icon className="w-6 h-6 text-primary mb-3" />
                        <div className={`font-medium text-gray-900 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                          {getText(item.text, language)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 bg-gray-900 text-gray-300">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-12 md:gap-8">
            {/* Brand Column */}
            <div className="flex flex-col items-center md:items-start">
              <div className="flex items-center gap-3 mb-4">
                <BridgeIcon className="w-10 h-10 text-primary" />
                <div className="flex items-baseline gap-1">
                  <span className="text-xl font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>Bridge</span>
                  <span className="text-xl font-light text-white">Stay</span>
                </div>
              </div>
              <p className={`text-sm text-gray-400 text-center md:text-left ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                {getText(footer.tagline, language)}
              </p>
            </div>

            {/* Links Column */}
            <div className="flex flex-col items-center md:items-start">
              <h4 className={`text-white font-semibold mb-4 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                {language === "cn" ? "快速链接" : "Quick Links"}
              </h4>
              <div className="flex flex-col gap-3 text-sm">
                <a href="#" className={`hover:text-white transition-colors ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                  {getText(footer.links.about, language)}
                </a>
                <button 
                  onClick={() => setShowFooterContact(true)}
                  className={`hover:text-white transition-colors text-left ${language === "cn" ? "font-chinese" : ""}`} 
                  style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}
                >
                  {getText(footer.links.contact, language)}
                </button>
                <a href="#" className={`hover:text-white transition-colors ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                  {getText(footer.links.terms, language)}
                </a>
              </div>
            </div>

            {/* Social Column */}
            <div className="flex flex-col items-center md:items-start">
              <h4 className={`text-white font-semibold mb-4 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                {language === "cn" ? "关注我们" : "Connect"}
              </h4>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowFooterContact(true)}
                  className="w-10 h-10 rounded-full bg-gray-800 hover:bg-green-600 flex items-center justify-center transition-colors"
                  title="WeChat"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.032zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"/>
                  </svg>
                </button>
                <a 
                  href="mailto:support@bridgestay.com"
                  className="w-10 h-10 rounded-full bg-gray-800 hover:bg-blue-600 flex items-center justify-center transition-colors"
                  title="Email"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <Separator className="my-8 bg-gray-800" />
          
          <div className="text-center text-sm text-gray-500">
            <p className={language === "cn" ? "font-chinese" : ""} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
              © 2026 Bridge Stay. {getText(footer.copyright, language)}
            </p>
          </div>
        </div>
      </footer>

      {/* Footer Contact Modal */}
      <AnimatePresence>
        {showFooterContact && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowFooterContact(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-bold text-gray-900 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                  {getText(footer.contactModal.title, language)}
                </h3>
                <button
                  onClick={() => setShowFooterContact(false)}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* WeChat */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18z"/>
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm text-gray-500 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                        {getText(footer.contactModal.wechat, language)}
                      </p>
                      <p className="text-lg font-bold text-gray-900">BridgeStay_SLC</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText("BridgeStay_SLC");
                      toast.success(language === "cn" ? "已复制！" : "Copied!");
                    }}
                    className="w-full h-10 rounded-xl bg-green-500 hover:bg-green-600 text-white font-medium gap-2"
                  >
                    {language === "cn" ? "复制微信号" : "Copy WeChat ID"}
                  </Button>
                </div>

                {/* Email */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="4" width="20" height="16" rx="2"/>
                        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                      </svg>
                    </div>
                    <div>
                      <p className={`text-sm text-gray-500 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                        {getText(footer.contactModal.email, language)}
                      </p>
                      <p className="text-lg font-bold text-gray-900">support@bridgestay.com</p>
                    </div>
                  </div>
                  <a href="mailto:support@bridgestay.com" className="block">
                    <Button
                      variant="outline"
                      className="w-full h-10 rounded-xl font-medium gap-2 border-blue-300 text-blue-600 hover:bg-blue-100"
                    >
                      {language === "cn" ? "发送邮件" : "Send Email"}
                    </Button>
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
