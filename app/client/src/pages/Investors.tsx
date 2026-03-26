import { Navbar } from "@/components/Navbar";
import { BridgeStayLogo } from "@/components/BridgeStayLogo";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { motion, useInView } from "framer-motion";
import { useRef, useState, useEffect } from "react";
import {
  Shield,
  Globe,
  Users,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Building2,
  TrendingUp,
  Award,
  FileCheck,
  Home as HomeIcon,
  Sparkles,
  Star,
  Quote,
  ChevronRight,
  Play,
  Zap,
  Target,
  Rocket,
  DollarSign,
  BarChart3,
  UserCheck,
  Clock,
  MapPin,
} from "lucide-react";
import { Link } from "wouter";

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

// Animated counter component
function AnimatedCounter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = target / steps;
      let current = 0;
      const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
          setCount(target);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);
      return () => clearInterval(timer);
    }
  }, [isInView, target]);

  return (
    <span ref={ref}>
      {prefix}{count.toLocaleString()}{suffix}
    </span>
  );
}

// How It Works Step Component
function ProcessStep({ 
  step, 
  icon: Icon, 
  title, 
  description, 
  isLast = false 
}: { 
  step: number; 
  icon: React.ComponentType<{ className?: string }>; 
  title: string; 
  description: string;
  isLast?: boolean;
}) {
  return (
    <motion.div 
      variants={fadeInUp}
      className="relative flex flex-col items-center text-center"
    >
      {/* Step Number */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center z-10">
        {step}
      </div>
      
      {/* Icon Circle */}
      <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center mb-6 shadow-soft relative">
        <Icon className="w-10 h-10 text-primary" />
      </div>
      
      {/* Content */}
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      <p className="text-gray-600 leading-relaxed max-w-xs">{description}</p>
      
      {/* Connector Arrow */}
      {!isLast && (
        <div className="hidden lg:block absolute top-12 -right-8 xl:-right-12">
          <ChevronRight className="w-8 h-8 text-orange-300" />
        </div>
      )}
    </motion.div>
  );
}

// Testimonial Card Component
function TestimonialCard({ 
  name, 
  university, 
  country, 
  quote, 
  avatar,
  verified = true
}: { 
  name: string; 
  university: string; 
  country: string;
  quote: string;
  avatar: string;
  verified?: boolean;
}) {
  return (
    <motion.div variants={fadeInUp}>
      <Card className="bg-white border-0 shadow-soft-lg h-full hover:shadow-soft-xl transition-shadow duration-300">
        <CardContent className="p-8">
          {/* Quote Icon */}
          <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mb-6">
            <Quote className="w-6 h-6 text-primary" />
          </div>
          
          {/* Quote Text */}
          <p className="text-gray-700 text-lg leading-relaxed mb-8 italic">
            "{quote}"
          </p>
          
          {/* Author Info */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-2xl">
                {avatar}
              </div>
              {verified && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{name}</p>
              <p className="text-sm text-gray-500">{university}</p>
              <p className="text-xs text-gray-400">{country}</p>
            </div>
            {verified && (
              <Badge className="ml-auto bg-green-50 text-green-700 border-green-200 text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// Live Stats Dashboard Component
function LiveStatsDashboard() {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.3 }}
      className="relative"
    >
      <Card className="bg-white/95 backdrop-blur-sm border-0 shadow-soft-xl overflow-hidden">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Live Platform Metrics</h3>
                <p className="text-xs text-gray-500">Real-time traction data</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs text-green-600 font-medium">Live</span>
            </div>
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-primary" />
                <span className="text-xs text-gray-500 font-medium">Students Matched</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                <AnimatedCounter target={156} suffix="+" />
              </p>
              <p className="text-xs text-green-600 mt-1">↑ 23% this month</p>
            </div>
            
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span className="text-xs text-gray-500 font-medium">Verified Listings</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                <AnimatedCounter target={89} />
              </p>
              <p className="text-xs text-green-600 mt-1">↑ 12 new this week</p>
            </div>
            
            <div className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-500 font-medium">Avg. Rent Saved</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                <AnimatedCounter target={340} prefix="$" />
              </p>
              <p className="text-xs text-gray-500 mt-1">vs. market average</p>
            </div>
            
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-4 h-4 text-purple-600" />
                <span className="text-xs text-gray-500 font-medium">Satisfaction Rate</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                <AnimatedCounter target={98} suffix="%" />
              </p>
              <p className="text-xs text-gray-500 mt-1">from 120+ reviews</p>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="border-t border-gray-100 pt-6">
            <p className="text-xs text-gray-500 font-medium mb-4">Recent Activity</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-gray-600">New lease signed - Sugar House</span>
                <span className="text-xs text-gray-400 ml-auto">2m ago</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-gray-600">Student verified - UofU</span>
                <span className="text-xs text-gray-400 ml-auto">5m ago</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                  <HomeIcon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-gray-600">New listing added - Downtown</span>
                <span className="text-xs text-gray-400 ml-auto">12m ago</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Floating Elements */}
      <motion.div
        className="absolute -top-4 -right-4 w-12 h-12 rounded-2xl bg-white shadow-soft flex items-center justify-center"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <TrendingUp className="w-6 h-6 text-green-500" />
      </motion.div>
    </motion.div>
  );
}

export default function Investors() {
  const { language } = useLanguage();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[95vh] flex items-center overflow-hidden pt-20">
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-amber-50" />
        
        {/* Decorative Elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-orange-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl" />

        <div className="container relative z-10 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column - Text Content */}
            <motion.div
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="max-w-2xl"
            >
              {/* Badge */}
              <motion.div variants={fadeInUp}>
                <Badge variant="secondary" className="px-4 py-2 mb-8 text-sm font-medium bg-white/80 backdrop-blur-sm border-orange-200 shadow-soft">
                  <Award className="w-4 h-4 mr-2 text-primary" />
                  Tim Draper UEC 2026 Finalist
                </Badge>
              </motion.div>

              {/* Headline */}
              <motion.h1 variants={fadeInUp} className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-gray-900 leading-tight">
                Secure Housing for{" "}
                <span className="gradient-text-warm">UofU International Students</span>
                <span className="block mt-2 text-4xl md:text-5xl font-light text-gray-600">
                  Before You Board the Plane.
                </span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                variants={fadeInUp}
                className="text-xl text-gray-600 mb-10 leading-relaxed"
              >
                BridgeStay eliminates the #1 barrier for international students: 
                <span className="font-semibold text-gray-900"> no SSN, no credit history, no problem.</span> 
                {" "}Verified housing, bilingual support, and AI-powered roommate matching.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div variants={fadeInUp} className="flex flex-wrap gap-4 mb-12">
                <Link href="/apartments">
                  <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg rounded-2xl shadow-soft-lg hover:shadow-soft-xl transition-all">
                    <Rocket className="w-5 h-5 mr-2" />
                    Explore Listings
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="px-8 py-6 text-lg rounded-2xl border-2 hover:bg-orange-50">
                  <Play className="w-5 h-5 mr-2" />
                  Watch Demo
                </Button>
              </motion.div>

              {/* Trust Indicators */}
              <motion.div variants={fadeInUp} className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center text-sm border-2 border-white">👩🏻</div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-sm border-2 border-white">👨🏽</div>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center text-sm border-2 border-white">👩🏼</div>
                  </div>
                  <span className="text-sm text-gray-600">156+ students matched</span>
                </div>
                <div className="h-6 w-px bg-gray-200" />
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-600">100% Verified Listings</span>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Column - Live Stats Dashboard */}
            <div className="hidden lg:block">
              <LiveStatsDashboard />
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement Section */}
      <section className="py-24 bg-white">
        <div className="container">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="max-w-4xl mx-auto text-center mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="px-4 py-2 mb-6 bg-red-50 text-red-700 border-red-200">
                <Target className="w-4 h-4 mr-2" />
                The Problem We Solve
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              3,165 International Students at UofU.
              <span className="block text-red-600">Zero Housing Solutions Built for Them.</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl text-gray-600 leading-relaxed">
              Traditional platforms like Zillow and KSL require SSN and credit history—barriers that 
              international students simply cannot overcome. The result? Scams, stress, and students 
              settling for subpar housing.
            </motion.p>
          </motion.div>

          {/* Pain Points Grid */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            <motion.div variants={fadeInUp}>
              <Card className="bg-red-50 border-red-100 h-full">
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mb-6">
                    <FileCheck className="w-7 h-7 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">No SSN = No Application</h3>
                  <p className="text-gray-600">
                    Zillow states: "Without an SSN, we cannot provide a background check." 
                    International students are automatically rejected.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="bg-red-50 border-red-100 h-full">
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mb-6">
                    <Globe className="w-7 h-7 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">Remote Booking Scams</h3>
                  <p className="text-gray-600">
                    Students must secure housing from overseas, making them prime targets for 
                    fake listings and deposit fraud.
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="bg-red-50 border-red-100 h-full">
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mb-6">
                    <DollarSign className="w-7 h-7 text-red-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">$1,467/mo Average Rent</h3>
                  <p className="text-gray-600">
                    Salt Lake City ranks among the most expensive markets nationally. 
                    Students overpay due to limited options and desperation.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gradient-to-b from-orange-50/50 to-white">
        <div className="container">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-20"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="px-4 py-2 mb-6 bg-white border-orange-200">
                <Zap className="w-4 h-4 mr-2 text-primary" />
                Simple 3-Step Process
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              How BridgeStay Works
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl text-gray-600 max-w-2xl mx-auto">
              From verification to move-in, we've streamlined the entire process for international students.
            </motion.p>
          </motion.div>

          {/* Process Steps */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-12 lg:gap-16 max-w-5xl mx-auto"
          >
            <ProcessStep
              step={1}
              icon={UserCheck}
              title="Verify Your Identity"
              description="Upload your passport and I-20 visa document. No SSN or U.S. credit history required. Verification completes in under 24 hours."
            />
            <ProcessStep
              step={2}
              icon={Users}
              title="Match & Connect"
              description="Browse verified listings or use our AI-powered roommate matching to find compatible housemates based on lifestyle and preferences."
            />
            <ProcessStep
              step={3}
              icon={HomeIcon}
              title="Move In Confidently"
              description="Sign your lease digitally, pay securely, and move into your verified home. Our bilingual support team is with you every step."
              isLast
            />
          </motion.div>
        </div>
      </section>

      {/* Trust Signals / Testimonials Section */}
      <section className="py-24 bg-white">
        <div className="container">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="px-4 py-2 mb-6 bg-green-50 text-green-700 border-green-200">
                <Shield className="w-4 h-4 mr-2" />
                Verified by UofU Student ID
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Trusted by Students Like You
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-xl text-gray-600 max-w-2xl mx-auto">
              Real stories from international students who found their home through BridgeStay.
            </motion.p>
          </motion.div>

          {/* Testimonials Grid */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-8"
          >
            <TestimonialCard
              name="Yuki Tanaka"
              university="University of Utah, MS Computer Science"
              country="🇯🇵 Japan"
              quote="I was rejected by 5 landlords on Zillow because I had no SSN. BridgeStay verified my passport and I-20 in one day. I signed my lease before even landing in Salt Lake City!"
              avatar="👩🏻"
            />
            <TestimonialCard
              name="Priya Sharma"
              university="University of Utah, MBA"
              country="🇮🇳 India"
              quote="The roommate matching feature connected me with two other Indian students in my program. We found a 3-bedroom near campus and split the rent. Saved $400/month each!"
              avatar="👩🏽"
            />
            <TestimonialCard
              name="Wei Chen"
              university="University of Utah, Undergraduate"
              country="🇨🇳 China"
              quote="作为一个中国学生，能用中文浏览房源太方便了。客服也会说中文，帮我解决了很多问题。强烈推荐给其他留学生！"
              avatar="👨🏻"
            />
          </motion.div>

          {/* Trust Badges */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-16 flex flex-wrap justify-center items-center gap-8"
          >
            <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 rounded-2xl">
              <GraduationCap className="w-6 h-6 text-red-600" />
              <span className="font-medium text-gray-700">University of Utah Partner</span>
            </div>
            <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 rounded-2xl">
              <Shield className="w-6 h-6 text-green-600" />
              <span className="font-medium text-gray-700">SSL Encrypted</span>
            </div>
            <div className="flex items-center gap-3 px-6 py-3 bg-gray-50 rounded-2xl">
              <Award className="w-6 h-6 text-primary" />
              <span className="font-medium text-gray-700">Lassonde Entrepreneur Institute</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Market Opportunity Section */}
      <section className="py-24 bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="container">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="secondary" className="px-4 py-2 mb-6 bg-white/10 text-white border-white/20">
                <TrendingUp className="w-4 h-4 mr-2" />
                Market Opportunity
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-5xl font-bold mb-6">
              A $24.5 Billion Market.
              <span className="block text-orange-400">Growing 7.74% Annually.</span>
            </motion.h2>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto"
          >
            <motion.div variants={fadeInUp} className="text-center">
              <p className="text-5xl font-bold text-orange-400 mb-2">
                <AnimatedCounter target={3165} />
              </p>
              <p className="text-gray-400">UofU International Students</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center">
              <p className="text-5xl font-bold text-orange-400 mb-2">
                <AnimatedCounter target={15} suffix="%" />
              </p>
              <p className="text-gray-400">YoY Enrollment Growth</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center">
              <p className="text-5xl font-bold text-orange-400 mb-2">
                <AnimatedCounter target={1467} prefix="$" />
              </p>
              <p className="text-gray-400">Avg. Monthly Rent</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center">
              <p className="text-5xl font-bold text-orange-400 mb-2">
                <AnimatedCounter target={43} suffix="B" prefix="$" />
              </p>
              <p className="text-gray-400">Int'l Student Economic Impact</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-orange-500 to-amber-500">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto text-center text-white"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Find Your Home?
            </h2>
            <p className="text-xl mb-10 text-white/90">
              Join 156+ international students who found verified housing through BridgeStay. 
              No SSN required. No credit history needed.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/apartments">
                <Button size="lg" className="bg-white text-primary hover:bg-gray-100 px-8 py-6 text-lg rounded-2xl shadow-lg">
                  <HomeIcon className="w-5 h-5 mr-2" />
                  Browse Listings
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="border-2 border-white text-white hover:bg-white/10 px-8 py-6 text-lg rounded-2xl">
                  <GraduationCap className="w-5 h-5 mr-2" />
                  Create Free Account
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 text-gray-400">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <BridgeStayLogo className="h-8" />
              <span className="text-sm">© 2026 BridgeStay. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <span>Tim Draper Utah Entrepreneur Challenge 2026</span>
              <span>•</span>
              <span>University of Utah</span>
              <span>•</span>
              <span>Lassonde Entrepreneur Institute</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
