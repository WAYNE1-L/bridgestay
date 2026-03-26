import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Language = "cn" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

// Translation dictionary
const translations: Record<string, Record<Language, string>> = {
  // Navbar
  "nav.home": { cn: "首页", en: "Home" },
  "nav.findApartments": { cn: "全部房源", en: "All Listings" },
  "nav.howItWorks": { cn: "如何使用", en: "How It Works" },
  "nav.postSublease": { cn: "发布转租", en: "Post Sublease" },
  "nav.admin": { cn: "管理后台", en: "Admin" },
  
  // Hero Section
  "hero.badge": { cn: "为国际学生打造", en: "For International Students" },
  "hero.headline1": { cn: "跨越国界", en: "Crossing" },
  "hero.headline2": { cn: "轻松实现。", en: "borders made easy." },
  "hero.headline3": { cn: "欢迎来到", en: "Welcome to" },
  "hero.subheadline": { cn: "无需SSN，无需信用记录。加入数千名已找到理想住所的国际学生。", en: "No SSN needed. No credit history required. Join thousands of international students who found their perfect home." },
  "hero.searchPlaceholder": { cn: "你在哪里上学？（如 USC, NYU, MIT）", en: "Where are you studying? (e.g., USC, NYU, MIT)" },
  "hero.search": { cn: "搜索", en: "Search" },
  "hero.24hrApproval": { cn: "24小时审批", en: "24hr approval" },
  "hero.noCreditCheck": { cn: "无需信用检查", en: "No credit check" },
  "hero.100Online": { cn: "100%线上", en: "100% online" },
  
  // Trust Section
  "trust.title": { cn: "受到顶尖大学学生的信赖", en: "Trusted by students from top universities" },
  
  // Stats
  "stats.studentsHoused": { cn: "已入住学生", en: "Students Housed" },
  "stats.partnerProperties": { cn: "合作房源", en: "Partner Properties" },
  "stats.universitiesCovered": { cn: "覆盖大学", en: "Universities Covered" },
  "stats.approvalRate": { cn: "审批通过率", en: "Approval Rate" },
  
  // Features Section
  "features.title": { cn: "专为国际学生打造", en: "Built for international students" },
  "features.subtitle": { cn: "我们消除了所有让海外学生找房困难的障碍。", en: "We've removed every barrier that makes finding housing difficult for students from abroad." },
  "features.noSSN.title": { cn: "无需SSN", en: "No SSN Required" },
  "features.noSSN.desc": { cn: "我们理解国际学生没有社会安全号码。我们的验证流程专为您设计。", en: "We understand international students don't have Social Security Numbers. Our verification process is designed specifically for you." },
  "features.noCredit.title": { cn: "无需信用记录", en: "No Credit History Needed" },
  "features.noCredit.desc": { cn: "跳过信用检查的障碍。我们使用适合国际学生的替代验证方法。", en: "Skip the credit check hurdle. We use alternative verification methods that work for international students." },
  "features.intlPayments.title": { cn: "国际支付", en: "International Payments" },
  "features.intlPayments.desc": { cn: "使用国际支付方式支付押金和租金。我们支持来自世界各地的银行卡和转账。", en: "Pay deposits and rent using international payment methods. We support cards and bank transfers from anywhere." },
  "features.university.title": { cn: "以大学为中心", en: "University-Focused" },
  "features.university.desc": { cn: "通过我们的互动地图找到校园附近的公寓，显示与大学和设施的距离。", en: "Find apartments near your campus with our interactive map showing proximity to universities and amenities." },
  "features.secureDocs.title": { cn: "安全文件", en: "Secure Documents" },
  "features.secureDocs.desc": { cn: "安全上传您的护照、签证和入学证明。您的文件经过加密保护。", en: "Upload your passport, visa, and enrollment letters securely. Your documents are encrypted and protected." },
  "features.fastApproval.title": { cn: "快速审批", en: "Fast Approval" },
  "features.fastApproval.desc": { cn: "几天内获得批准，而不是几周。我们简化的流程意味着您可以在抵达前确保住房。", en: "Get approved in days, not weeks. Our streamlined process means you can secure housing before you arrive." },
  
  // Featured Listings
  "listings.badge": { cn: "精选房源", en: "Featured Listings" },
  "listings.title": { cn: "精选房源", en: "Featured Listings" },
  "listings.subtitle": { cn: "精选优质房源，为国际学生量身定制。无需SSN，快速入住。", en: "Curated quality listings tailored for international students. No SSN required, move in fast." },
  "listings.viewAll": { cn: "查看所有房源", en: "View All Listings" },
  "listings.perMonth": { cn: "/月", en: "/mo" },
  "listings.contactHost": { cn: "加微信联系", en: "Contact Host" },
  "listings.availability": { cn: "起止日期", en: "Availability" },
  "listings.location": { cn: "位置", en: "Location" },
  "listings.price": { cn: "月租金", en: "Price/mo" },
  
  // Contact Modal
  "contact.wechatTitle": { cn: "房东微信号", en: "Host WeChat" },
  "contact.emailTitle": { cn: "房东邮箱", en: "Host Email" },
  "contact.copy": { cn: "点击复制", en: "Copy" },
  "contact.copied": { cn: "已复制！", en: "Copied!" },
  "contact.noWechat": { cn: "房东未提供微信", en: "WeChat not provided" },
  "contact.noEmail": { cn: "房东未提供邮箱", en: "Email not provided" },
  "listings.immediateAvailable": { cn: "即可入住", en: "Available Now" },
  "listings.delete": { cn: "删除", en: "Delete" },
  "listings.urgent": { cn: "急转租", en: "Urgent" },
  
  // How It Works
  "howItWorks.title": { cn: "如何使用", en: "How it works" },
  "howItWorks.subtitle": { cn: "从搜索到入住，我们让每一步都简单无压力。", en: "From search to move-in, we've made every step simple and stress-free." },
  "howItWorks.step1.title": { cn: "搜索发现", en: "Search & Discover" },
  "howItWorks.step1.desc": { cn: "浏览大学附近的验证房源。按价格、设施和距离筛选。", en: "Browse verified listings near your university. Filter by price, amenities, and distance to campus." },
  "howItWorks.step2.title": { cn: "在线申请", en: "Apply Online" },
  "howItWorks.step2.desc": { cn: "提交您的申请和文件。无需SSN或信用评分。", en: "Submit your application with your documents. No SSN or credit score required." },
  "howItWorks.step3.title": { cn: "获得批准", en: "Get Approved" },
  "howItWorks.step3.desc": { cn: "24-48小时内获得批准。我们验证您的入学和签证状态。", en: "Receive approval within 24-48 hours. We verify your enrollment and visa status." },
  "howItWorks.step4.title": { cn: "入住", en: "Move In" },
  "howItWorks.step4.desc": { cn: "安全支付押金并获取钥匙。欢迎来到您的新家！", en: "Pay your deposit securely and get your keys. Welcome to your new home!" },
  
  // CTA Sections
  "cta.student.title": { cn: "准备好找到您的家了吗？", en: "Ready to find your home?" },
  "cta.student.desc": { cn: "加入数千名通过 Bridge Stay 找到理想公寓的国际学生。", en: "Join thousands of international students who've found their perfect apartment through Bridge Stay." },
  "cta.student.button": { cn: "开始搜索", en: "Start Your Search" },
  "cta.student.noFee": { cn: "无申请费", en: "No Application Fee" },
  "cta.student.24hr": { cn: "24小时审批", en: "24hr Approval" },
  "cta.student.secure": { cn: "安全支付", en: "Secure Payments" },
  "cta.student.support": { cn: "全天候支持", en: "24/7 Support" },
  "cta.landlord.title": { cn: "发布您的房源", en: "List your property" },
  "cta.landlord.desc": { cn: "与寻找顶尖大学附近住房的合格国际学生建立联系。我们处理验证、支付和支持。", en: "Connect with qualified international students looking for housing near top universities. We handle verification, payments, and support." },
  "cta.landlord.button": { cn: "与我们合作", en: "Partner With Us" },
  "cta.landlord.verified": { cn: "预先验证的学生租户", en: "Pre-verified student tenants" },
  "cta.landlord.payment": { cn: "保证付款处理", en: "Guaranteed payment processing" },
  "cta.landlord.docs": { cn: "文件验证已处理", en: "Document verification handled" },
  "cta.landlord.manager": { cn: "专属物业经理支持", en: "Dedicated property manager support" },
  "cta.landlord.commission": { cn: "佣金", en: "Commission" },
  "cta.landlord.commissionValue": { cn: "成功租赁的5%", en: "5% on successful lease" },
  "cta.landlord.processing": { cn: "付款处理", en: "Payment Processing" },
  "cta.landlord.included": { cn: "已包含", en: "Included" },
  
  // Footer
  "footer.tagline": { cn: "帮助国际学生在美国找到他们的第一个家。", en: "Helping international students find their first home in the US." },
  "footer.students": { cn: "学生", en: "Students" },
  "footer.landlords": { cn: "房东", en: "Landlords" },
  "footer.company": { cn: "公司", en: "Company" },
  "footer.findApartments": { cn: "找房源", en: "Find Apartments" },
  "footer.howItWorks": { cn: "如何使用", en: "How It Works" },
  "footer.universities": { cn: "大学", en: "Universities" },
  "footer.faqs": { cn: "常见问题", en: "FAQs" },
  "footer.listProperty": { cn: "发布房源", en: "List Property" },
  "footer.pricing": { cn: "定价", en: "Pricing" },
  "footer.resources": { cn: "资源", en: "Resources" },
  "footer.contact": { cn: "联系我们", en: "Contact" },
  "footer.aboutUs": { cn: "关于我们", en: "About Us" },
  "footer.careers": { cn: "招聘", en: "Careers" },
  "footer.privacy": { cn: "隐私政策", en: "Privacy Policy" },
  "footer.terms": { cn: "服务条款", en: "Terms of Service" },
  "footer.copyright": { cn: "© 2024 Bridge Stay. 保留所有权利。", en: "© 2024 Bridge Stay. All rights reserved." },
  "footer.madeWith": { cn: "用", en: "Made with" },
  "footer.forStudents": { cn: "为国际学生打造", en: "for international students" },
  
  // Admin Dashboard
  "admin.title": { cn: "管理后台", en: "Admin Dashboard" },
  "admin.addListing": { cn: "添加新房源", en: "Add New Listing" },
  "admin.imageUrl": { cn: "图片URL", en: "Image URL" },
  "admin.imageUrlPlaceholder": { cn: "输入图片链接或留空使用默认图片", en: "Enter image URL or leave empty for default" },
  "admin.titleCn": { cn: "中文标题", en: "Chinese Title" },
  "admin.titleEn": { cn: "英文标题", en: "English Title" },
  "admin.price": { cn: "月租价格 (USD)", en: "Monthly Price (USD)" },
  "admin.priceNotes": { cn: "价格备注（如优惠信息）", en: "Price Notes (e.g., discounts)" },
  "admin.priceNotesCn": { cn: "中文价格备注", en: "Chinese Price Notes" },
  "admin.priceNotesEn": { cn: "英文价格备注", en: "English Price Notes" },
  "admin.addressCn": { cn: "中文地址", en: "Chinese Address" },
  "admin.addressEn": { cn: "英文地址", en: "English Address" },
  "admin.areaCn": { cn: "中文区域", en: "Chinese Area" },
  "admin.areaEn": { cn: "英文区域", en: "English Area" },
  "admin.descCn": { cn: "中文描述", en: "Chinese Description" },
  "admin.descEn": { cn: "英文描述", en: "English Description" },
  "admin.propertyType": { cn: "房型", en: "Property Type" },
  "admin.tags": { cn: "标签（用逗号分隔）", en: "Tags (comma separated)" },
  "admin.tagsPlaceholder": { cn: "急转租, 滑雪, 可养宠物", en: "Urgent, Skiing, Pet-friendly" },
  "admin.submit": { cn: "添加房源", en: "Add Listing" },
  "admin.success": { cn: "房源添加成功！", en: "Listing added successfully!" },
  "admin.manageListing": { cn: "管理现有房源", en: "Manage Existing Listings" },
  "admin.noListings": { cn: "暂无房源", en: "No listings yet" },
  "admin.deleteConfirm": { cn: "确定要删除这个房源吗？", en: "Are you sure you want to delete this listing?" },
  
  // AI Chat
  "chat.title": { cn: "Bridge Stay AI 助手", en: "Bridge Stay AI Assistant" },
  "chat.placeholder": { cn: "输入您的问题...", en: "Type your question..." },
  "chat.welcome": { cn: "你好！我是 Bridge Stay 的 AI 助手。我可以帮你找到完美的公寓。试着告诉我你在哪里上学，你的预算是多少？", en: "Hi! I'm Bridge Stay's AI assistant. I can help you find the perfect apartment. Try telling me where you're studying and what's your budget?" },
  
  // Approval Card
  "approval.approved": { cn: "已批准", en: "Approved" },
  "approval.monthlyRent": { cn: "月租", en: "Monthly Rent" },
  "approval.approvedIn": { cn: "4小时内批准！", en: "Approved in just 4 hours!" },
  "approval.moveIn": { cn: "1月15日可入住", en: "Move-in ready for Jan 15" },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bridgestay-language");
      return (saved as Language) || "cn";
    }
    return "cn";
  });

  useEffect(() => {
    localStorage.setItem("bridgestay-language", language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key}`);
      return key;
    }
    return translation[language];
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
