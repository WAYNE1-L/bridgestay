import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Home, Search, FileText, User, LogOut, Globe, Settings, LogIn, Users, BarChart3, Calculator, GraduationCap, List } from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { BridgeStayLogo } from "./BridgeStayLogo";
import { NotificationBell } from "./NotificationBell";
import { useLanguage } from "@/contexts/LanguageContext";

export function Navbar() {
  const { user, isAuthenticated, logout, signIn } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();

  const isAdmin = user?.role === "admin";

  // Simplified navigation for single admin mode
  const navLinks = isAdmin ? [
    { href: "/", label: t("nav.home"), icon: Home },
    { href: "/sublets", label: t("nav.sublets"), icon: GraduationCap },
    { href: "/apartments", label: t("nav.listings"), icon: Search },
    { href: "/analytics", label: t("nav.analytics"), icon: BarChart3 },
    { href: "/calculator", label: t("nav.calculator"), icon: Calculator },
    { href: "/admin/import", label: t("nav.aiImport"), icon: FileText },
    { href: "/admin/outreach", label: "\u8054\u7CFB\u8FFD\u8E2A", icon: Users },
  ] : [
    { href: "/", label: t("nav.home"), icon: Home },
    { href: "/sublets", label: t("nav.sublets"), icon: GraduationCap },
    { href: "/apartments", label: t("nav.listings"), icon: Search },
    { href: "/analytics", label: t("nav.analytics"), icon: BarChart3 },
    { href: "/calculator", label: t("nav.calculator"), icon: Calculator },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const toggleLanguage = () => {
    setLanguage(language === "cn" ? "en" : "cn");
  };

  return (
    <>
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled 
            ? "bg-white/95 backdrop-blur-md shadow-soft py-3" 
            : "bg-white/80 backdrop-blur-sm py-4"
        }`}
      >
        <nav className="container flex items-center justify-between">
          {/* Logo */}
          <Link href="/">
            <motion.div
              className="cursor-pointer"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <BridgeStayLogo size="md" />
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <motion.div
                  className={`px-5 py-2.5 rounded-full text-[15px] font-medium transition-all duration-200 cursor-pointer ${
                    location === link.href
                      ? "text-primary bg-orange-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {link.label}
                </motion.div>
              </Link>
            ))}

          </div>

          {/* Desktop Auth Buttons & Language Toggle */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Toggle */}
            <motion.button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Globe className="w-4 h-4" />
              <span className="font-semibold">{language === "cn" ? "EN" : "中"}</span>
            </motion.button>

            {isAuthenticated && isAdmin ? (
              /* Single admin mode - minimal UI, just notification bell */
              <div className="flex items-center gap-2">
                <NotificationBell />
                <Link href="/admin">
                  <Button variant="ghost" className="h-11 px-4 rounded-full text-[15px] font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                    <Settings className="w-4 h-4 mr-1.5" />
                    {t("nav.admin")}
                  </Button>
                </Link>
              </div>
            ) : isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2">
                    <Avatar className="size-9 cursor-pointer hover:opacity-80 transition-opacity">
                      <AvatarFallback className="bg-orange-100 text-orange-700 text-sm font-semibold">
                        {(user.name ?? user.email ?? "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => setLocation("/my-listings")}>
                    <List className="w-4 h-4 mr-2" />
                    {language === "cn" ? "我的发布" : "My listings"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("nav.signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 transition-colors"
                onClick={signIn}
              >
                <LogIn className="w-4 h-4" />
                {t("nav.signIn")}
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            {/* Mobile Language Toggle */}
            <motion.button
              onClick={toggleLanguage}
              className="p-2.5 rounded-full hover:bg-gray-100 transition-colors text-gray-700"
              whileTap={{ scale: 0.95 }}
            >
              <Globe className="w-5 h-5" />
            </motion.button>
            
            <motion.button
              className="p-3 rounded-full hover:bg-gray-100 transition-colors text-gray-700"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              whileTap={{ scale: 0.95 }}
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </nav>
      </motion.header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-0 top-[72px] z-40 bg-white/95 backdrop-blur-md shadow-soft-lg md:hidden"
          >
            <div className="container py-6 flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <motion.div
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-[15px] font-medium transition-colors cursor-pointer ${
                      location === link.href
                        ? "text-primary bg-orange-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    whileTap={{ scale: 0.98 }}
                  >
                    <link.icon className="w-5 h-5" />
                    {link.label}
                  </motion.div>
                </Link>
              ))}

              {/* Admin Link for Mobile */}
              {isAdmin && (
                <Link href="/admin">
                  <motion.div
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-[15px] font-medium transition-colors cursor-pointer ${
                      location === "/admin"
                        ? "text-primary bg-orange-50"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Settings className="w-5 h-5" />
                    {t("nav.admin")}
                  </motion.div>
                </Link>
              )}
              
              <div className="border-t border-gray-100 my-3" />

              {/* Language Toggle in Mobile Menu */}
              <motion.div
                className="flex items-center justify-between px-5 py-4 rounded-2xl text-[15px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
                onClick={toggleLanguage}
                whileTap={{ scale: 0.98 }}
              >
                <span className="flex items-center gap-4">
                  <Globe className="w-5 h-5" />
                  {t("nav.language")}
                </span>
                <span className="px-3 py-1 rounded-full bg-gray-100 text-sm font-semibold">
                  {language === "cn" ? "EN" : "中文"}
                </span>
              </motion.div>
              
              {isAuthenticated ? (
                <>
                  {!isAdmin && (
                    <Link href="/my-listings">
                      <motion.div
                        className="flex items-center gap-4 px-5 py-4 rounded-2xl text-[15px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
                        onClick={() => setIsMobileMenuOpen(false)}
                        whileTap={{ scale: 0.98 }}
                      >
                        <List className="w-5 h-5" />
                        {language === "cn" ? "我的发布" : "My listings"}
                      </motion.div>
                    </Link>
                  )}
                  {isAdmin && (
                    <Link href="/dashboard">
                      <motion.div
                        className="flex items-center gap-4 px-5 py-4 rounded-2xl text-[15px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
                        onClick={() => setIsMobileMenuOpen(false)}
                        whileTap={{ scale: 0.98 }}
                      >
                        <User className="w-5 h-5" />
                        {t("nav.dashboard")}
                      </motion.div>
                    </Link>
                  )}
                  <motion.div
                    className="flex items-center gap-4 px-5 py-4 rounded-2xl text-[15px] font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <LogOut className="w-5 h-5" />
                    {t("nav.signOut")}
                  </motion.div>
                </>
              ) : (
                <motion.div
                  className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-orange-500 text-[15px] font-medium text-white hover:bg-orange-600 cursor-pointer transition-colors"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    signIn();
                  }}
                  whileTap={{ scale: 0.98 }}
                >
                  <LogIn className="w-5 h-5" />
                  {t("nav.signIn")}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
