// Translations configuration for Bridge Stay
// All bilingual content is managed here for easy maintenance

export type Language = "en" | "cn";

export const siteContent = {
  // Hero Section
  hero: {
    badge: {
      en: "For International Students",
      cn: "留学生专属",
    },
    headline: {
      en: "Crossing borders made easy.",
      cn: "跨越国界，安家无忧。",
    },
    headlineWelcome: {
      en: "Welcome to",
      cn: "欢迎来到",
    },
    subheadline: {
      en: "No SSN needed. No credit history required. Find an SLC sublet directly from a current student — or browse full-lease listings.",
      cn: "无需 SSN，无需信用记录。从在校学生手里直接转租盐湖城房源,或浏览整租房源。",
    },
    searchPlaceholder: {
      en: "Where are you studying? (e.g., USC, NYU, MIT)",
      cn: "输入学校或区域...",
    },
    searchButton: {
      en: "Search",
      cn: "搜索",
    },
    quickStats: {
      approval: {
        en: "24hr approval",
        cn: "24小时审批",
      },
      creditCheck: {
        en: "No credit check",
        cn: "无需信用记录",
      },
      online: {
        en: "100% online",
        cn: "全程线上",
      },
    },
  },

  // Features Section
  features: {
    sectionTitle: {
      en: "Built for international students",
      cn: "专为留学生打造",
    },
    sectionSubtitle: {
      en: "We've removed every barrier that makes renting difficult for international students. From verification to payment, we've got you covered.",
      cn: "我们消除了跨国租房的所有障碍，让每一个留学生都能轻松安家。",
    },
    cards: [
      {
        icon: "Shield",
        title: {
          en: "No SSN Required",
          cn: "无需 SSN",
        },
        description: {
          en: "We understand international students don't have Social Security Numbers. Our verification process is designed specifically for you.",
          cn: "我们理解留学生没有美国社会安全号码。我们的验证流程专为您设计，护照和 I-20 即可申请。",
        },
      },
      {
        icon: "CreditCard",
        title: {
          en: "No Credit History Needed",
          cn: "无需美国信用记录",
        },
        description: {
          en: "Skip the credit check hurdle. We use alternative verification methods that work for international students.",
          cn: "跳过繁琐的信用检查。我们使用专门针对留学生的身份验证方式，护照/I-20 即可申请。",
        },
      },
      {
        icon: "Globe",
        title: {
          en: "International Payments",
          cn: "支持跨境支付",
        },
        description: {
          en: "Pay deposits and rent using international payment methods. We support cards and bank transfers from anywhere.",
          cn: "人在国内也能轻松付房租。支持支付宝、微信支付、银联卡及国际电汇，无惧汇率换汇烦恼。",
        },
      },
      {
        icon: "MapPin",
        title: {
          en: "University-Focused",
          cn: "学校周边优选",
        },
        description: {
          en: "Find apartments near your campus with our interactive map showing proximity to universities and amenities.",
          cn: "通过我们的互动地图，轻松找到学校附近的公寓，查看到校距离和周边设施。",
        },
      },
      {
        icon: "FileCheck",
        title: {
          en: "Secure Documents",
          cn: "文件安全加密",
        },
        description: {
          en: "Upload your passport, visa, and enrollment letters securely. Your documents are encrypted and protected.",
          cn: "安全上传护照、签证和录取通知书。您的文件经过加密保护，安全无忧。",
        },
      },
      {
        icon: "Clock",
        title: {
          en: "Fast Approval",
          cn: "极速审批",
        },
        description: {
          en: "Get approved in days, not weeks. Our streamlined process means you can secure housing before you arrive.",
          cn: "几天内即可获批，无需等待数周。简化流程让您在抵达前就能锁定住房。",
        },
      },
    ],
  },

  // Social Proof / Approval Card
  approvalCard: {
    name: {
      en: "Sarah Chen",
      cn: "陈同学",
    },
    university: {
      en: "USC • F-1 Visa Student",
      cn: "犹他大学 • F-1 签证",
    },
    statusBadge: {
      en: "Approved",
      cn: "申请通过",
    },
    listingTitle: {
      en: "Modern Studio Apartment",
      cn: "盐湖城市中心绝美 Studio",
    },
    listingLocation: {
      en: "Downtown Los Angeles",
      cn: "市中心核心地段",
    },
    monthlyRent: {
      en: "Monthly Rent",
      cn: "月租金",
    },
    approvalMessage: {
      en: "Approved in just 4 hours!",
      cn: "4小时极速过审！",
    },
    moveInReady: {
      en: "Move-in ready for Jan 15",
      cn: "1月15日 拎包入住",
    },
  },

  // Stats Section
  stats: {
    studentsHoused: {
      value: "10,000+",
      label: {
        en: "Students Housed",
        cn: "已入住学生",
      },
    },
    partnerProperties: {
      value: "500+",
      label: {
        en: "Partner Properties",
        cn: "合作房源",
      },
    },
    universitiesCovered: {
      value: "150+",
      label: {
        en: "Universities Covered",
        cn: "覆盖大学",
      },
    },
    approvalRate: {
      value: "98%",
      label: {
        en: "Approval Rate",
        cn: "审批通过率",
      },
    },
  },

  // How It Works Section
  howItWorks: {
    sectionTitle: {
      en: "How it works",
      cn: "使用流程",
    },
    sectionSubtitle: {
      en: "Four simple steps to your new home",
      cn: "四步轻松入住新家",
    },
    steps: [
      {
        number: "1",
        title: {
          en: "Search & Discover",
          cn: "搜索发现",
        },
        description: {
          en: "Browse verified listings near your university. Filter by price, amenities, and distance to campus.",
          cn: "浏览学校附近的认证房源。按价格、设施和到校距离筛选。",
        },
      },
      {
        number: "2",
        title: {
          en: "Apply Online",
          cn: "在线申请",
        },
        description: {
          en: "Submit your application with your documents. No SSN or credit score required.",
          cn: "提交申请和相关文件。无需 SSN 或信用评分。",
        },
      },
      {
        number: "3",
        title: {
          en: "Get Approved",
          cn: "快速审批",
        },
        description: {
          en: "Receive approval within 24-48 hours. We verify your enrollment and visa status.",
          cn: "24-48 小时内获得审批结果。我们会验证您的入学和签证状态。",
        },
      },
      {
        number: "4",
        title: {
          en: "Move In",
          cn: "拎包入住",
        },
        description: {
          en: "Pay your deposit securely and get your keys. Welcome to your new home!",
          cn: "安全支付押金，领取钥匙。欢迎入住新家！",
        },
      },
    ],
  },

  // Featured Listings Section
  featuredListings: {
    sectionTitle: {
      en: "Featured Listings",
      cn: "精选房源",
    },
    sectionSubtitle: {
      en: "Hand-picked properties perfect for international students",
      cn: "为留学生精心挑选的优质房源",
    },
    viewAll: {
      en: "View All Listings",
      cn: "查看全部房源",
    },
  },

  // CTA Section
  cta: {
    title: {
      en: "Ready to find your new home?",
      cn: "准备好找到你的新家了吗？",
    },
    subtitle: {
      en: "Join thousands of international students who found their perfect place with Bridge Stay.",
      cn: "加入数千名通过 Bridge Stay 找到理想住所的留学生行列。",
    },
    button: {
      en: "Get Started",
      cn: "立即开始",
    },
  },

  // Footer
  footer: {
    tagline: {
      en: "Making housing accessible for international students worldwide.",
      cn: "让全球留学生都能轻松找到理想住所。",
    },
    copyright: {
      en: "Made with ❤️ for SLC Students.",
      cn: "用 ❤️ 为盐湖城留学生打造。",
    },
    links: {
      about: {
        en: "About Us",
        cn: "关于我们",
      },
      contact: {
        en: "Contact Support",
        cn: "联系客服",
      },
      terms: {
        en: "Terms of Service",
        cn: "服务条款",
      },
    },
    contactModal: {
      title: {
        en: "Contact Support",
        cn: "联系客服",
      },
      wechat: {
        en: "WeChat",
        cn: "微信",
      },
      email: {
        en: "Email",
        cn: "邮箱",
      },
    },
  },
};

// Helper function to get translated text
export function getText(
  obj: { en: string; cn: string },
  language: Language
): string {
  return language === "cn" ? obj.cn : obj.en;
}
