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
  "nav.listings": { cn: "房源列表", en: "Listings" },
  "nav.aiImport": { cn: "AI 房源导入", en: "AI Import" },
  "nav.adminLogin": { cn: "管理员登录", en: "Admin Login" },
  "nav.language": { cn: "切换语言", en: "Language" },
  "nav.dashboard": { cn: "控制台", en: "Dashboard" },
  "nav.signOut": { cn: "退出登录", en: "Sign Out" },
  
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
  "listings.featured": { cn: "精选", en: "Featured" },
  "listings.noSsn": { cn: "无需 SSN", en: "No SSN" },
  "listings.noSsnRequired": { cn: "无需 SSN", en: "No SSN Required" },
  "listings.noCreditCheck": { cn: "无需信用记录", en: "No Credit Check" },
  "listings.internationalStudentsWelcome": { cn: "欢迎国际学生", en: "International Students Welcome" },
  "listings.bed": { cn: "卧室", en: "bed" },
  "listings.beds": { cn: "卧室", en: "beds" },
  "listings.bedroom": { cn: "卧室", en: "Bedroom" },
  "listings.bedrooms": { cn: "卧室", en: "Bedrooms" },
  "listings.bath": { cn: "浴室", en: "bath" },
  "listings.baths": { cn: "浴室", en: "baths" },
  "listings.bathroom": { cn: "浴室", en: "Bathroom" },
  "listings.bathrooms": { cn: "浴室", en: "Bathrooms" },
  "listings.sqft": { cn: "平方英尺", en: "sqft" },
  "listings.month": { cn: "月", en: "month" },
  "listings.months": { cn: "个月", en: "months" },
  "listings.deposit": { cn: "押金", en: "deposit" },
  "listings.parking": { cn: "停车位", en: "Parking" },
  "listings.noParking": { cn: "无停车位", en: "No parking" },
  "listings.parkingIncluded": { cn: "包含停车位", en: "Parking Included" },
  "listings.noParkingIncluded": { cn: "不含停车位", en: "No parking included" },
  "listings.petsOk": { cn: "可养宠物", en: "Pets OK" },
  "listings.noPets": { cn: "不可养宠物", en: "No pets" },
  "listings.petsAllowed": { cn: "允许宠物", en: "Pets Allowed" },
  "listings.noPetsAllowed": { cn: "不允许宠物", en: "No pets allowed" },
  "listings.furnished": { cn: "带家具", en: "Furnished" },
  "listings.unfurnished": { cn: "不带家具", en: "Unfurnished" },
  "listings.utilities": { cn: "项水电杂费", en: "utilities" },
  "listings.sourceLink": { cn: "原始链接", en: "Source Link" },
  "amenity.dishwasher": { cn: "洗碗机", en: "Dishwasher" },
  "amenity.laundry": { cn: "洗衣设施", en: "Laundry" },
  "amenity.inUnitLaundry": { cn: "室内洗衣机", en: "In-unit laundry" },
  "amenity.gym": { cn: "健身房", en: "Gym" },
  "amenity.pool": { cn: "泳池", en: "Pool" },
  "amenity.wifi": { cn: "无线网络", en: "WiFi" },
  "amenity.internet": { cn: "网络", en: "Internet" },
  "amenity.airConditioning": { cn: "空调", en: "Air conditioning" },
  "amenity.washerDryer": { cn: "洗衣机/烘干机", en: "Washer/dryer" },

  // Listing signals
  "signals.summer_sublease.label": { cn: "暑期转租", en: "Summer Sublease" },
  "signals.summer_sublease.description": { cn: "暑期可入住，适合秋季返校前短住", en: "Available this summer — ideal for students going home in the fall" },
  "signals.near_campus.label": { cn: "靠近学校", en: "Near Campus" },
  "signals.near_campus.description": { cn: "附近有大学，通勤更方便", en: "Within 15 miles of a university" },
  "signals.furnished.label": { cn: "带家具", en: "Furnished" },
  "signals.furnished.description": { cn: "已配家具，减少搬家成本", en: "Comes with furniture — no moving costs" },
  "signals.utilities_included.label": { cn: "包含水电杂费", en: "Utilities Included" },
  "signals.utilities_included.description": { cn: "部分或全部水电杂费包含在月租中", en: "Some or all utilities are included in the monthly rent" },
  "signals.sublease.label": { cn: "转租", en: "Sublease" },
  "signals.sublease.description": { cn: "当前租客转租，通常更灵活", en: "The current tenant is subletting — flexible and often cheaper" },
  "signals.short_term.label": { cn: "短租", en: "Short-Term" },
  "signals.short_term.description": { cn: "6 个月或更短租期，适合短期学习或实习", en: "Lease of 6 months or less — great for gap semesters or co-ops" },
  "signals.move_in_soon.label": { cn: "近期可入住", en: "Available Soon" },
  "signals.move_in_soon.description": { cn: "未来 30 天内可入住", en: "Ready to move in within the next 30 days" },

  // Apartment detail
  "detail.notFound.title": { cn: "未找到房源", en: "Apartment not found" },
  "detail.notFound.desc": { cn: "此房源可能已被移除或暂不可租。", en: "This listing may have been removed or is no longer available." },
  "detail.notFound.cta": { cn: "浏览房源", en: "Browse Apartments" },
  "detail.backToListings": { cn: "返回房源列表", en: "Back to listings" },
  "detail.draftPreview": { cn: "草稿预览", en: "Draft preview" },
  "detail.draftPreview.desc": { cn: "此房源仅对你可见。请在控制台中发布，以便学生可以搜索到。", en: "this listing is only visible to you. Publish it from your dashboard to make it searchable by students." },
  "detail.status.sublease": { cn: "转租", en: "Sublease" },
  "detail.status.available": { cn: "可租", en: "Available" },
  "detail.status.unavailable": { cn: "不可租", en: "Unavailable" },
  "detail.status.pending": { cn: "待审核", en: "Pending" },
  "detail.status.rejected": { cn: "已拒绝", en: "Rejected" },
  "detail.status.draft": { cn: "草稿", en: "Draft" },
  "detail.signals.title": { cn: "推荐亮点", en: "Why this listing stands out" },
  "detail.moveIn": { cn: "入住时间", en: "Move-in" },
  "detail.stayLength": { cn: "居住时长", en: "Stay length" },
  "detail.parkingPets": { cn: "停车与宠物", en: "Parking & pets" },
  "detail.livingSetup": { cn: "居住配置", en: "Living setup" },
  "detail.ends": { cn: "结束", en: "Ends" },
  "detail.leaseTermNotSpecified": { cn: "未注明租期", en: "Lease term not specified" },
  "detail.monthLease": { cn: "个月租期", en: "month lease" },
  "detail.about": { cn: "房源介绍", en: "About This Property" },
  "detail.amenities": { cn: "设施配套", en: "Amenities" },
  "detail.utilitiesIncluded": { cn: "包含的水电杂费", en: "Utilities Included" },
  "detail.petPolicy": { cn: "宠物政策", en: "Pet Policy" },
  "detail.petDeposit": { cn: "宠物押金", en: "Pet Deposit" },
  "detail.petRent": { cn: "宠物月费", en: "Pet Rent" },
  "detail.parkingType": { cn: "类型", en: "Type" },
  "detail.additionalFee": { cn: "额外费用", en: "Additional Fee" },
  "detail.location": { cn: "位置", en: "Location" },
  "detail.nearby": { cn: "附近", en: "Nearby" },
  "detail.perMonth": { cn: "/月", en: "/month" },
  "detail.lastUpdatedToday": { cn: "今天更新", en: "Last updated today" },
  "detail.lastUpdated": { cn: "最后更新", en: "Last updated" },
  "detail.staleWarning": { cn: "此房源可能已过期，请在申请前确认是否仍可租。", en: "This listing may be outdated. Confirm availability before applying." },
  "detail.reportUnavailable": { cn: "举报已下架", en: "Report as unavailable" },
  "detail.contactWechat.title": { cn: "通过微信联系房东", en: "Contact Landlord on WeChat" },
  "detail.contactWechat.desc": { cn: "房东优先使用微信沟通。复制下方微信号添加联系。", en: "This landlord prefers WeChat. Copy the ID below." },
  "detail.contactWechat.copy": { cn: "复制微信号", en: "Copy WeChat ID" },
  "detail.contactWechat.copied": { cn: "已复制", en: "Copied!" },
  "detail.contactWechat.open": { cn: "打开微信", en: "Open WeChat" },
  "detail.contactWechat.helper": { cn: "在微信中：点击 + → 添加朋友 → 粘贴微信号", en: "In WeChat: tap + → Add Contacts → paste ID" },
  "detail.contactEmail.title": { cn: "通过邮件联系房东", en: "Contact Landlord by Email" },
  "detail.contactEmail.desc": { cn: "此房源提供邮箱联系方式。建议先发送可租确认。", en: "This listing includes an email contact. Send a quick availability check." },
  "detail.contactEmail.cta": { cn: "发送邮件", en: "Email Landlord" },
  "detail.contactRequest.title": { cn: "申请联系房东", en: "Request Landlord Contact" },
  "detail.contactRequest.desc": { cn: "此房源暂未公开直接联系方式。通过 BridgeStay 提交意向后，房东会跟进联系。", en: "Direct contact details are not listed yet. Send your interest through BridgeStay so the landlord can follow up." },
  "detail.contactRequest.cta": { cn: "申请联系", en: "Request Contact" },
  "detail.leaseTerms": { cn: "租期信息", en: "Lease Terms" },
  "detail.subleaseTerms": { cn: "转租信息", en: "Sublease Terms" },
  "detail.type": { cn: "类型", en: "Type" },
  "detail.availableFrom": { cn: "可入住时间", en: "Available From" },
  "detail.leaseEnds": { cn: "租期结束", en: "Lease Ends" },
  "detail.minimumLease": { cn: "最短租期", en: "Minimum Lease" },
  "detail.maximumLease": { cn: "最长租期", en: "Maximum Lease" },
  "detail.notSpecified": { cn: "未注明", en: "Not specified" },
  "detail.international.title": { cn: "适合国际学生", en: "International Student Friendly" },
  "detail.international.noSsn": { cn: "无需 SSN", en: "No SSN required" },
  "detail.international.noCredit": { cn: "无需美国信用记录", en: "No credit history needed" },
  "detail.international.payments": { cn: "支持国际支付", en: "International payments accepted" },
  "detail.international.docs": { cn: "支持签证文件申请", en: "Visa documentation support" },
  "detail.applyNow": { cn: "立即申请", en: "Apply Now" },
  "detail.saved": { cn: "已收藏", en: "Saved" },
  "detail.save": { cn: "收藏", en: "Save" },
  "detail.share": { cn: "分享", en: "Share" },
  "detail.views": { cn: "人浏览过此房源", en: "people viewed this listing" },
  "detail.somethingWrong": { cn: "信息有误？告诉我们", en: "Something wrong? Let us know" },
  "detail.report.title": { cn: "举报此房源", en: "Report this listing" },
  "detail.report.desc": { cn: "请告诉我们问题所在，我们会尽快核实。", en: "Let us know what's wrong and we'll review it." },
  "detail.report.reason": { cn: "原因", en: "Reason" },
  "detail.report.details": { cn: "补充说明", en: "Additional details" },
  "detail.report.optional": { cn: "选填", en: "optional" },
  "detail.report.placeholder": { cn: "请补充任何有助于我们核实的信息…", en: "Any extra context that could help us..." },
  "detail.report.cancel": { cn: "取消", en: "Cancel" },
  "detail.report.submitting": { cn: "提交中…", en: "Submitting…" },
  "detail.report.submit": { cn: "提交举报", en: "Submit report" },
  "detail.toast.wechatCopied": { cn: "微信号已复制。打开微信 → 添加朋友 → 粘贴即可找到房东。", en: "WeChat ID copied! Open WeChat → Add Contacts → paste to find the landlord." },
  "detail.toast.saved": { cn: "已收藏！", en: "Saved!" },
  "detail.toast.savedDesc": { cn: "可在控制台查看所有收藏房源。", en: "Find all your saved listings in the dashboard." },
  "detail.toast.viewSaved": { cn: "查看收藏 →", en: "View saved →" },
  "detail.toast.unsaved": { cn: "已取消收藏", en: "Removed from saved listings" },
  "detail.toast.saveDbOnly": { cn: "仅认证房源支持收藏", en: "Save is only available for verified DB listings" },
  "detail.toast.signInToSave": { cn: "请先登录再收藏房源", en: "Please sign in to save apartments" },
  "detail.toast.linkCopied": { cn: "链接已复制到剪贴板！", en: "Link copied to clipboard!" },
  "detail.toast.reportSubmitted": { cn: "感谢反馈！我们会尽快核实。", en: "Thanks for letting us know! We'll review this listing." },
  "detail.toast.reportFailed": { cn: "提交失败，请重试。", en: "Failed to submit report. Please try again." },
  "detail.report.reason.unavailable": { cn: "已下架 / 不可租", en: "No longer available" },
  "detail.report.reason.wrongDetails": { cn: "价格或信息有误", en: "Wrong price or details" },
  "detail.report.reason.suspicious": { cn: "可疑或误导性信息", en: "Suspicious or misleading" },
  "detail.report.reason.other": { cn: "其他", en: "Other" },
  "detail.emailSubject": { cn: "咨询房源", en: "Inquiry about" },
  "detail.emailBodyPrefix": { cn: "你好，我在 BridgeStay 上看到这个房源，想确认是否仍可租：", en: "Hi, I'm interested in" },
  "detail.emailBodySuffix": { cn: "谢谢！", en: "Is it still available?" },

  // Apartments list
  "apartments.searchPlaceholder": { cn: "搜索城市或区域...", en: "Search by city..." },
  "apartments.filters": { cn: "筛选", en: "Filters" },
  "apartments.state": { cn: "州", en: "State" },
  "apartments.anyState": { cn: "不限州", en: "Any state" },
  "apartments.priceRange": { cn: "价格范围", en: "Price Range" },
  "apartments.bedrooms": { cn: "卧室", en: "Bedrooms" },
  "apartments.bathrooms": { cn: "浴室", en: "Bathrooms" },
  "apartments.propertyType": { cn: "房型", en: "Property Type" },
  "apartments.any": { cn: "不限", en: "Any" },
  "apartments.anyType": { cn: "不限房型", en: "Any type" },
  "apartments.studio": { cn: "单间", en: "Studio" },
  "apartments.oneBedroom": { cn: "1 间卧室", en: "1 Bedroom" },
  "apartments.twoBedrooms": { cn: "2 间卧室", en: "2 Bedrooms" },
  "apartments.threeBedrooms": { cn: "3 间卧室", en: "3 Bedrooms" },
  "apartments.fourBedrooms": { cn: "4 间以上卧室", en: "4+ Bedrooms" },
  "apartments.oneBathroom": { cn: "1 间浴室", en: "1 Bathroom" },
  "apartments.twoBathrooms": { cn: "2 间浴室", en: "2 Bathrooms" },
  "apartments.threeBathrooms": { cn: "3 间浴室", en: "3 Bathrooms" },
  "apartments.petsAllowed": { cn: "允许宠物", en: "Pets Allowed" },
  "apartments.parkingIncluded": { cn: "含停车位", en: "Parking Included" },
  "apartments.applyFilters": { cn: "应用筛选", en: "Apply Filters" },
  "apartments.clearAll": { cn: "清除全部", en: "Clear All" },
  "apartments.loading": { cn: "加载中...", en: "Loading..." },
  "apartments.found": { cn: "套房源", en: "apartments found" },
  "apartments.studentBadge": { cn: "所有房源均接受国际留学生", en: "All listings accept international students" },
  "apartments.newest": { cn: "最新发布", en: "Newest" },
  "apartments.priceLow": { cn: "价格从低到高", en: "Price: Low to High" },
  "apartments.priceHigh": { cn: "价格从高到低", en: "Price: High to Low" },
  "apartments.noMatches": { cn: "暂无匹配房源", en: "No listings match your filters" },
  "apartments.noMatchesDesc": { cn: "尝试调整筛选条件或搜索其他区域", en: "Try widening your search — adjust the price range, city, or remove a filter." },
  "apartments.clearFilters": { cn: "清除筛选", en: "Clear Filters" },
  "apartments.noListings": { cn: "暂无房源", en: "No listings yet" },
  "apartments.adminEmpty": { cn: "导入并发布房源后，公开列表会显示在这里。", en: "Published imports will appear here after review." },
  "apartments.publicEmpty": { cn: "请稍后再来查看新的已发布房源。", en: "Check back soon for newly published listings." },
  "apartments.importListing": { cn: "导入微信房源", en: "Import a Listing" },
  "apartments.toast.saveFailed": { cn: "收藏失败", en: "Failed to save listing" },
  "apartments.toast.unsaveFailed": { cn: "取消收藏失败", en: "Failed to update saved listings" },
  "apartments.toast.contextSaveUnavailable": { cn: "此房源暂不支持收藏", en: "This listing cannot be saved yet" },
  
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
  "footer.copyright": { cn: "© 2025 Bridge Stay. 保留所有权利。", en: "© 2025 Bridge Stay. All rights reserved." },
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
  
  // Not Found (404 page)
  "notFound.title": { cn: "页面未找到", en: "Page Not Found" },
  "notFound.message": { cn: "抱歉，您访问的页面不存在。\n该页面可能已被移动或删除。", en: "Sorry, the page you are looking for doesn't exist.\nIt may have been moved or deleted." },
  "notFound.goHome": { cn: "返回首页", en: "Go Home" },

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
