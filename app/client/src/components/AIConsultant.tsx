import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  Home,
  Shield,
  MapPin,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// Mock AI responses based on keywords
const getMockResponse = (userMessage: string): string => {
  const lowerMessage = userMessage.toLowerCase();
  
  if (lowerMessage.includes("bedroom") && lowerMessage.includes("utah")) {
    return "I found 3 matches in Salt Lake City that accept students without SSN. Would you like to see the safety report?";
  }
  
  if (lowerMessage.includes("safety report") || lowerMessage.includes("yes")) {
    return "Great! Here's what I found:\n\n🏠 **Parkview Apartments** - $1,450/mo\n• Walk Score: 92 • Crime Rate: Low\n• 0.3 miles from campus\n\n🏠 **University Heights** - $1,650/mo\n• Walk Score: 88 • Crime Rate: Very Low\n• 0.5 miles from campus\n\n🏠 **Downtown Lofts** - $1,850/mo\n• Walk Score: 95 • Crime Rate: Low\n• 1.2 miles from campus\n\nWould you like me to schedule tours for any of these?";
  }
  
  if (lowerMessage.includes("schedule") || lowerMessage.includes("tour")) {
    return "Perfect! I can schedule virtual tours for you. Which properties interest you? I'll coordinate with the landlords and send you calendar invites. All tours can be done via video call if you're still abroad!";
  }
  
  if (lowerMessage.includes("usc") || lowerMessage.includes("los angeles") || lowerMessage.includes("la")) {
    return "I found 5 properties near USC in Los Angeles that welcome international students! Prices range from $1,800 to $2,800/month. Most are within walking distance to campus. Would you like me to filter by budget or amenities?";
  }
  
  if (lowerMessage.includes("nyu") || lowerMessage.includes("new york")) {
    return "New York is competitive, but I found 4 verified listings near NYU that don't require SSN or credit history. Studios start at $2,200/month. Shall I show you options in Manhattan or Brooklyn?";
  }
  
  if (lowerMessage.includes("budget") || lowerMessage.includes("price") || lowerMessage.includes("cost")) {
    return "I can help you find apartments within your budget! What's your monthly rent range? Also, would you prefer utilities included or separate?";
  }
  
  if (lowerMessage.includes("visa") || lowerMessage.includes("f-1") || lowerMessage.includes("international")) {
    return "As an international student, you won't need an SSN or US credit history with Bridge Stay. We verify your enrollment and visa status instead. What university will you be attending?";
  }
  
  if (lowerMessage.includes("deposit") || lowerMessage.includes("payment")) {
    return "We accept international payment methods including:\n\n• International credit/debit cards\n• Wire transfers\n• WeChat Pay & Alipay\n\nSecurity deposits are typically 1 month's rent. Would you like to know more about our payment protection?";
  }
  
  if (lowerMessage.includes("hello") || lowerMessage.includes("hi") || lowerMessage.includes("hey")) {
    return "Hello! I'm your housing assistant. I can help you find apartments near any US university — no SSN or credit history required! Which university are you planning to attend?";
  }
  
  // Default response
  return "I'd be happy to help you find housing! Tell me:\n\n• Which university are you attending?\n• How many bedrooms do you need?\n• What's your budget range?\n\nI'll find the perfect matches for you!";
};

// Spring animation for chat bubbles
const bubbleVariants = {
  initial: { 
    opacity: 0, 
    scale: 0.9, 
    y: 12,
  },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    y: -8,
    transition: { duration: 0.2 }
  }
};

// Typing indicator animation
const typingVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

const dotVariants = {
  animate: (i: number) => ({
    y: [0, -4, 0],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      ease: "easeInOut" as const,
      delay: i * 0.12,
    }
  })
};

export function AIConsultant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi there! 👋 I'm your housing assistant. I can help you find the perfect apartment near any US university — no SSN or credit history required!\n\nTry asking: \"I need a 2 bedroom near University of Utah\"",
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI thinking delay (1.5-3 seconds)
    const delay = 1500 + Math.random() * 1500;
    
    setTimeout(() => {
      const response = getMockResponse(userMessage.content);
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };
      
      setIsTyping(false);
      setMessages(prev => [...prev, assistantMessage]);
    }, delay);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            className="fixed bottom-8 right-8 z-50"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring" as const, stiffness: 400, damping: 30 }}
          >
            <Button
              onClick={() => setIsOpen(true)}
              className="w-16 h-16 rounded-full btn-warm text-white shadow-soft-xl"
            >
              <MessageCircle className="w-7 h-7" />
            </Button>
            
            {/* Pulse ring */}
            <motion.div
              className="absolute inset-0 rounded-full bg-primary/30"
              animate={{
                scale: [1, 1.3, 1.3],
                opacity: [0.4, 0, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed bottom-8 right-8 z-50 w-[400px] h-[600px] max-h-[80vh]"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring" as const, stiffness: 400, damping: 35 }}
          >
            <Card className="h-full bg-white border-0 shadow-soft-xl overflow-hidden">
              {/* Header */}
              <CardHeader className="p-5 pb-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center shadow-sm">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">Housing Assistant</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-gray-500 font-medium">Online</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full w-10 h-10"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-0 flex flex-col h-[calc(100%-88px)]">
                {/* Messages Area */}
                <div 
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-5 space-y-5 bg-gray-50/50"
                >
                  <AnimatePresence mode="popLayout">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        variants={bubbleVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        layout
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div className={`flex items-end gap-3 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                          {/* Avatar */}
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.role === "assistant" 
                              ? "bg-gradient-to-br from-primary to-orange-400 shadow-sm" 
                              : "bg-gray-200"
                          }`}>
                            {message.role === "assistant" ? (
                              <Bot className="w-4 h-4 text-white" />
                            ) : (
                              <User className="w-4 h-4 text-gray-500" />
                            )}
                          </div>
                          
                          {/* Message Bubble */}
                          <div className={`px-5 py-4 rounded-2xl shadow-soft ${
                            message.role === "user"
                              ? "bg-primary text-white rounded-br-lg"
                              : "bg-white text-gray-800 rounded-bl-lg border border-gray-100"
                          }`}>
                            <p className="text-[15px] whitespace-pre-wrap leading-relaxed">
                              {message.content}
                            </p>
                            <p className={`text-[11px] mt-2 font-medium ${
                              message.role === "user" ? "text-white/70" : "text-gray-400"
                            }`}>
                              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Typing Indicator */}
                    {isTyping && (
                      <motion.div
                        variants={typingVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="flex justify-start"
                      >
                        <div className="flex items-end gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                            <Bot className="w-4 h-4 text-white" />
                          </div>
                          <div className="px-5 py-4 rounded-2xl rounded-bl-lg bg-white shadow-soft border border-gray-100">
                            <div className="flex items-center gap-1.5">
                              {[0, 1, 2].map((i) => (
                                <motion.div
                                  key={i}
                                  className="w-2 h-2 rounded-full bg-gray-400"
                                  animate={dotVariants.animate(i)}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Quick Actions */}
                <div className="px-5 py-3 border-t border-gray-100 bg-white">
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                    {[
                      { icon: Home, label: "Find apartments" },
                      { icon: Shield, label: "No SSN needed" },
                      { icon: MapPin, label: "Near campus" },
                    ].map((action) => (
                      <button
                        key={action.label}
                        onClick={() => {
                          setInputValue(action.label === "Find apartments" 
                            ? "I need a 2 bedroom near University of Utah"
                            : action.label === "No SSN needed"
                            ? "How does verification work for international students?"
                            : "Show me apartments near USC"
                          );
                          inputRef.current?.focus();
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-[13px] text-gray-700 whitespace-nowrap transition-colors font-medium"
                      >
                        <action.icon className="w-3.5 h-3.5" />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Input Area */}
                <div className="p-5 pt-3 border-t border-gray-100 bg-white">
                  <div className="flex items-center gap-3">
                    <Input
                      ref={inputRef}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Ask about apartments..."
                      className="flex-1 h-12 bg-gray-100 border-0 text-gray-800 placeholder:text-gray-400 focus-visible:ring-primary/30 rounded-full text-[15px] px-5"
                      disabled={isTyping}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isTyping}
                      className="h-12 w-12 rounded-full btn-warm text-white disabled:opacity-50"
                    >
                      {isTyping ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-3 text-center font-medium">
                    Housing assistant • Powered by Bridge Stay
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
