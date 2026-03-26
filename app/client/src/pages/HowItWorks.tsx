import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Globe,
  CreditCard,
  FileText,
  Home,
  Search,
  Upload,
  Clock,
  GraduationCap,
  Building2,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";

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

const studentSteps = [
  {
    icon: GraduationCap,
    title: "Create Your Profile",
    description: "Sign up with your university email and complete your student profile. Add your visa type, university information, and expected graduation date.",
    details: [
      "No SSN required",
      "No credit check needed",
      "Verify your student status",
    ],
  },
  {
    icon: Search,
    title: "Browse Apartments",
    description: "Search through verified listings near your campus. Filter by price, location, amenities, and more. All properties accept international students.",
    details: [
      "Interactive map view",
      "Virtual tours available",
      "Save favorites for later",
    ],
  },
  {
    icon: FileText,
    title: "Apply Instantly",
    description: "Submit applications with just a few clicks. Our streamlined process is designed specifically for international students without traditional U.S. documentation.",
    details: [
      "No application fees",
      "Alternative verification",
      "Quick response times",
    ],
  },
  {
    icon: Upload,
    title: "Upload Documents",
    description: "Securely upload your passport, visa, I-20, and enrollment letter. Your documents are encrypted and only shared with approved landlords.",
    details: [
      "Bank-level encryption",
      "Document verification",
      "Secure storage",
    ],
  },
  {
    icon: CreditCard,
    title: "Pay Securely",
    description: "Once approved, pay your deposit and first month's rent using international payment methods. We support cards and bank transfers from anywhere.",
    details: [
      "International cards accepted",
      "Wire transfers supported",
      "Transparent pricing",
    ],
  },
  {
    icon: Home,
    title: "Move In",
    description: "Receive your lease, coordinate move-in details with your landlord, and settle into your new home. We're here to support you every step of the way.",
    details: [
      "Digital lease signing",
      "Move-in coordination",
      "24/7 support",
    ],
  },
];

const landlordSteps = [
  {
    icon: Building2,
    title: "List Your Property",
    description: "Create a detailed listing with photos, amenities, and pricing. Reach thousands of qualified international students looking for housing.",
    details: [
      "Free to list",
      "Professional photos",
      "Maximum visibility",
    ],
  },
  {
    icon: Shield,
    title: "Receive Verified Applications",
    description: "Get applications from pre-verified students with complete documentation. Review their university status, visa information, and financial backing.",
    details: [
      "Pre-screened tenants",
      "Complete documentation",
      "Background verification",
    ],
  },
  {
    icon: MessageSquare,
    title: "Connect & Approve",
    description: "Communicate with applicants, request additional information, and approve qualified tenants. Our platform handles all the paperwork.",
    details: [
      "In-app messaging",
      "Document requests",
      "Quick approvals",
    ],
  },
  {
    icon: CreditCard,
    title: "Get Paid Securely",
    description: "Receive deposits and rent payments directly to your bank account. We handle international payment processing and currency conversion.",
    details: [
      "Guaranteed payments",
      "Direct deposits",
      "Payment tracking",
    ],
  },
];

const faqs = [
  {
    question: "Why don't I need an SSN to apply?",
    answer: "We understand that international students typically don't have Social Security Numbers. Our platform uses alternative verification methods including university enrollment verification, visa documentation, and financial statements to assess applications.",
  },
  {
    question: "How do you verify students without a credit check?",
    answer: "Instead of traditional credit checks, we verify students through their university enrollment status, visa documentation, proof of financial support (bank statements, scholarship letters, or guarantor information), and references.",
  },
  {
    question: "What documents do I need to apply?",
    answer: "Typically, you'll need: a valid passport, your visa (F-1, J-1, etc.), I-20 or DS-2019, university enrollment letter, and proof of financial support (bank statement, scholarship letter, or guarantor information).",
  },
  {
    question: "How do international payments work?",
    answer: "We accept international credit/debit cards and bank transfers through Stripe. Payments are processed in USD, and your bank will handle any currency conversion. There are no hidden fees from Bridge Stay.",
  },
  {
    question: "How long does the application process take?",
    answer: "Most applications are reviewed within 2-3 business days. Once approved, you can sign your lease digitally and pay your deposit immediately. Many students secure housing before they even arrive in the U.S.",
  },
  {
    question: "Is my personal information secure?",
    answer: "Absolutely. We use bank-level encryption to protect your documents and personal information. Your data is only shared with landlords you apply to, and you can delete your documents at any time.",
  },
];

export default function HowItWorks() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-20 md:py-32">
          <div className="container px-6">
            <motion.div
              className="max-w-3xl mx-auto text-center"
              initial="initial"
              animate="animate"
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Designed for International Students</span>
              </motion.div>
              
              <motion.h1 variants={fadeInUp} className="mb-6">
                How Bridge Stay Works
              </motion.h1>
              
              <motion.p variants={fadeInUp} className="text-xl text-muted-foreground">
                We've reimagined the rental process for international students. No SSN, no credit history, no problem.
              </motion.p>
            </motion.div>
          </div>
        </section>
        
        {/* For Students Section */}
        <section className="py-20 bg-card/50">
          <div className="container px-6">
            <motion.div
              className="text-center mb-16"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-4">
                <GraduationCap className="w-4 h-4" />
                <span className="text-sm font-medium">For Students</span>
              </motion.div>
              <motion.h2 variants={fadeInUp}>
                Find Your Home in 6 Simple Steps
              </motion.h2>
            </motion.div>
            
            <motion.div
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
              {studentSteps.map((step, index) => (
                <motion.div
                  key={step.title}
                  variants={fadeInUp}
                  className="relative"
                >
                  <div className="p-6 rounded-2xl bg-card border border-border h-full">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <step.icon className="w-6 h-6 text-primary" />
                      </div>
                      <span className="text-4xl font-bold text-muted-foreground/30">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground mb-4">{step.description}</p>
                    <ul className="space-y-2">
                      {step.details.map((detail) => (
                        <li key={detail} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </motion.div>
            
            <motion.div
              className="text-center mt-12"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
            >
              <a href={getLoginUrl()}>
                <Button size="lg" className="glow gap-2">
                  Start Your Search
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </a>
            </motion.div>
          </div>
        </section>
        
        {/* For Landlords Section */}
        <section className="py-20">
          <div className="container px-6">
            <motion.div
              className="text-center mb-16"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground mb-4">
                <Building2 className="w-4 h-4" />
                <span className="text-sm font-medium">For Landlords</span>
              </motion.div>
              <motion.h2 variants={fadeInUp}>
                List Your Property in 4 Easy Steps
              </motion.h2>
            </motion.div>
            
            <motion.div
              className="grid md:grid-cols-2 lg:grid-cols-4 gap-8"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
              {landlordSteps.map((step, index) => (
                <motion.div
                  key={step.title}
                  variants={fadeInUp}
                  className="relative"
                >
                  <div className="p-6 rounded-2xl bg-card border border-border h-full">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                        <step.icon className="w-6 h-6" />
                      </div>
                      <span className="text-4xl font-bold text-muted-foreground/30">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                    <p className="text-muted-foreground mb-4">{step.description}</p>
                    <ul className="space-y-2">
                      {step.details.map((detail) => (
                        <li key={detail} className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              ))}
            </motion.div>
            
            <motion.div
              className="text-center mt-12"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={fadeInUp}
            >
              <Button size="lg" variant="outline" className="gap-2 bg-transparent">
                Partner With Us
                <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </section>
        
        {/* FAQs Section */}
        <section className="py-20 bg-card/50">
          <div className="container px-6">
            <motion.div
              className="text-center mb-16"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
              <motion.h2 variants={fadeInUp}>
                Frequently Asked Questions
              </motion.h2>
            </motion.div>
            
            <motion.div
              className="max-w-3xl mx-auto space-y-6"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
            >
              {faqs.map((faq) => (
                <motion.div
                  key={faq.question}
                  variants={fadeInUp}
                  className="p-6 rounded-2xl bg-card border border-border"
                >
                  <h3 className="text-lg font-semibold mb-2">{faq.question}</h3>
                  <p className="text-muted-foreground">{faq.answer}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>
        
        {/* CTA Section */}
        <section className="py-20">
          <div className="container px-6">
            <motion.div
              className="max-w-3xl mx-auto text-center"
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              <motion.h2 variants={fadeInUp} className="mb-4">
                Ready to Find Your Home?
              </motion.h2>
              <motion.p variants={fadeInUp} className="text-xl text-muted-foreground mb-8">
                Join thousands of international students who've found their perfect apartment through Bridge Stay.
              </motion.p>
              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <a href={getLoginUrl()}>
                  <Button size="lg" className="glow gap-2">
                    Create Free Account
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </a>
                <Link href="/apartments">
                  <Button size="lg" variant="outline" className="bg-transparent">
                    Browse Apartments
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>
        
        {/* Footer */}
        <footer className="py-16 border-t border-border">
          <div className="container px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">BS</span>
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold text-gray-900" style={{ fontFamily: "var(--font-serif)" }}>Bridge</span>
                  <span className="font-light text-gray-600">Stay</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                © 2025 Bridge Stay. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
