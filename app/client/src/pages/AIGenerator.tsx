import { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { useListings, BilingualListing } from "@/contexts/ListingsContext";
import { trpc } from "@/lib/trpc";
import { Navbar } from "@/components/Navbar";
import { MultiImageUpload } from "@/components/MultiImageUpload";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Sparkles,
  FileJson,
  Copy,
  Download,
  Check,
  Loader2,
  Image as ImageIcon,
  Key,
  Edit3,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  X,
  Wand2,
  Rocket,
  Star,
  Info,
} from "lucide-react";
import { toast } from "sonner";

// Types for the extracted listing data
interface ExtractedListing {
  title: {
    cn: string;
    en: string;
  };
  price: {
    amount: number;
    currency: string;
    notes: {
      cn: string;
      en: string;
    };
  };
  location: {
    address: string;
    area: {
      cn: string;
      en: string;
    };
  };
  propertyType: string;
  availability: {
    start: string;
    end: string;
  };
  description: {
    cn: string;
    en: string;
  };
  tags: {
    cn: string[];
    en: string[];
  };
  contact: {
    wechat: string;
    email: string;
  };
  imageUrl: string; // Primary image (backward compatible)
  images: string[]; // Multiple images for carousel
}

const defaultListing: ExtractedListing = {
  title: { cn: "", en: "" },
  price: { amount: 0, currency: "USD", notes: { cn: "", en: "" } },
  location: { address: "", area: { cn: "", en: "" } },
  propertyType: "",
  availability: { start: "", end: "" },
  description: { cn: "", en: "" },
  tags: { cn: [], en: [] },
  contact: { wechat: "", email: "" },
  imageUrl: "/images/house1.jpg",
  images: [],
};

// System prompt for Gemini
const SYSTEM_PROMPT = `You are an expert at extracting rental listing information from screenshots. Analyze this rental advertisement image and extract the following fields into a pure JSON object.

IMPORTANT: Return ONLY valid JSON, no markdown, no code blocks, no explanations.

Required JSON structure:
{
  "title": {
    "cn": "Chinese title",
    "en": "English title"
  },
  "price": {
    "amount": 1500,
    "currency": "USD",
    "notes": {
      "cn": "价格备注（如首月优惠等）",
      "en": "Price notes (e.g., first month discount)"
    }
  },
  "location": {
    "address": "Full address if visible",
    "area": {
      "cn": "区域描述",
      "en": "Area description"
    }
  },
  "propertyType": "1B1B / Studio / 2B2B etc",
  "availability": {
    "start": "YYYY-MM-DD or 'Immediate'",
    "end": "YYYY-MM-DD or 'Flexible'"
  },
  "description": {
    "cn": "详细描述",
    "en": "Detailed description"
  },
  "tags": {
    "cn": ["标签1", "标签2"],
    "en": ["tag1", "tag2"]
  },
  "contact": {
    "wechat": "WeChat ID if visible",
    "email": "Email if visible"
  },
  "imageUrl": "/images/house1.jpg"
}

Rules:
1. If text is only in Chinese, translate to English
2. If text is only in English, translate to Chinese
3. Extract price as a number without currency symbols
4. Identify key features and create relevant tags (e.g., "急转", "可养宠物", "近地铁")
5. If information is not visible, use empty string or empty array
6. Return ONLY the JSON object, nothing else`;

export default function AIGenerator() {
  const { language } = useLanguage();
  const { addListing } = useListings();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyFromEnv, setApiKeyFromEnv] = useState(false);

  // Auto-load API key from environment variable
  useEffect(() => {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (envKey && typeof envKey === "string" && envKey.length > 10) {
      setApiKey(envKey);
      setApiKeyFromEnv(true);
    }
  }, []);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedListing>(defaultListing);
  const [tagsInputCn, setTagsInputCn] = useState("");
  const [tagsInputEn, setTagsInputEn] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFeatured, setIsFeatured] = useState(false);
  const [showPersistenceModal, setShowPersistenceModal] = useState(false);
  const [publishedJSON, setPublishedJSON] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const listingImageRef = useRef<HTMLInputElement>(null);

  // tRPC mutation for creating apartments in database
  const createApartmentMutation = trpc.apartments.create.useMutation({
    onSuccess: () => {
      toast.success(language === "cn" ? "房源已保存到数据库" : "Listing saved to database");
    },
    onError: (error) => {
      console.error("Failed to save to database:", error);
      toast.error(language === "cn" ? "数据库保存失败，但已保存到本地" : "Database save failed, but saved locally");
    },
  });

  // Handle file upload
  const handleFileUpload = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(language === "cn" ? "请上传图片文件" : "Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setUploadedFile(file);
      setError(null);
    };
    reader.readAsDataURL(file);
  }, [language]);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Call Gemini API
  const analyzeImage = async () => {
    if (!uploadedImage || !apiKey) {
      toast.error(language === "cn" ? "请上传图片并输入 API Key" : "Please upload an image and enter API Key");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Extract base64 data from data URL
      const base64Data = uploadedImage.split(",")[1];
      const mimeType = uploadedImage.split(";")[0].split(":")[1];

      // Call Gemini API - using gemini-2.0-flash model
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: SYSTEM_PROMPT },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: base64Data,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || "API request failed");
      }

      const data = await response.json();
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!textContent) {
        throw new Error("No response from AI");
      }

      // Parse JSON from response (handle potential markdown code blocks)
      let jsonStr = textContent.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      }
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      const parsed = JSON.parse(jsonStr);
      
      // Merge with default to ensure all fields exist
      const mergedData: ExtractedListing = {
        ...defaultListing,
        ...parsed,
        title: { ...defaultListing.title, ...parsed.title },
        price: { 
          ...defaultListing.price, 
          ...parsed.price,
          notes: { ...defaultListing.price.notes, ...parsed.price?.notes }
        },
        location: { 
          ...defaultListing.location, 
          ...parsed.location,
          area: { ...defaultListing.location.area, ...parsed.location?.area }
        },
        description: { ...defaultListing.description, ...parsed.description },
        tags: { ...defaultListing.tags, ...parsed.tags },
        contact: { ...defaultListing.contact, ...parsed.contact },
        availability: { ...defaultListing.availability, ...parsed.availability },
      };

      setExtractedData(mergedData);
      setTagsInputCn(mergedData.tags.cn.join(", "));
      setTagsInputEn(mergedData.tags.en.join(", "));
      setCurrentStep(3);
      toast.success(language === "cn" ? "AI 分析完成！" : "AI analysis complete!");
    } catch (err) {
      console.error("Gemini API error:", err);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      
      // Fallback to mock data if API fails
      toast.error(language === "cn" ? "API Key 错误 - 使用模拟数据" : "API Key Error - Using Mock Data");
      
      const mockData: ExtractedListing = {
        ...defaultListing,
        title: { cn: "SLC 盐湖城 Studio 转租", en: "SLC Studio Sublet" },
        price: { amount: 1600, currency: "USD", notes: { cn: "全包", en: "All inclusive" } },
        location: { 
          address: "Salt Lake City, UT", 
          area: { cn: "市中心", en: "Downtown" } 
        },
        description: { 
          cn: "从截图中提取的房源信息（模拟数据）", 
          en: "Listing info extracted from screenshot (mock data)" 
        },
        tags: { cn: ["新房", "近学校"], en: ["New", "Near Campus"] },
        contact: { wechat: "example_wechat", email: "example@email.com" },
        availability: { start: "2026-01-15", end: "2026-12-31" },
        imageUrl: "/images/house1.jpg",
      };
      
      setExtractedData(mockData);
      setTagsInputCn(mockData.tags.cn.join(", "));
      setTagsInputEn(mockData.tags.en.join(", "));
      setCurrentStep(3);
    } finally {
      setIsProcessing(false);
    }
  };

  // Update extracted data
  const updateField = (path: string, value: string | number | string[]) => {
    setExtractedData((prev) => {
      const newData = { ...prev };
      const keys = path.split(".");
      let current: Record<string, unknown> = newData;
      
      for (let i = 0; i < keys.length - 1; i++) {
        current = current[keys[i]] as Record<string, unknown>;
      }
      current[keys[keys.length - 1]] = value;
      
      return newData;
    });
  };

  // Handle tags input
  const handleTagsChange = (type: "cn" | "en", value: string) => {
    if (type === "cn") {
      setTagsInputCn(value);
      updateField("tags.cn", value.split(",").map((t) => t.trim()).filter(Boolean));
    } else {
      setTagsInputEn(value);
      updateField("tags.en", value.split(",").map((t) => t.trim()).filter(Boolean));
    }
  };

  // Handle listing image upload (convert to Base64)
  const handleListingImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(language === "cn" ? "请上传图片文件" : "Please upload an image file");
      return;
    }

    // Check file size (max 5MB for Base64)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(language === "cn" ? "图片大小不能超过 5MB" : "Image size cannot exceed 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const base64Data = e.target?.result as string;
      updateField("imageUrl", base64Data);
      toast.success(language === "cn" ? "图片已上传" : "Image uploaded");
    };
    reader.onerror = () => {
      toast.error(language === "cn" ? "图片读取失败" : "Failed to read image");
    };
    reader.readAsDataURL(file);
  }, [language]);

  // Generate final JSON
  const generateJSON = () => {
    const finalData = {
      id: `listing_${Date.now()}`,
      ...extractedData,
    };
    return JSON.stringify(finalData, null, 2);
  };

  // Copy to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generateJSON());
      setCopied(true);
      toast.success(language === "cn" ? "已复制到剪贴板" : "Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(language === "cn" ? "复制失败" : "Copy failed");
    }
  };

  // Download JSON file
  const downloadJSON = () => {
    const blob = new Blob([generateJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `listing_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(language === "cn" ? "下载成功" : "Download successful");
  };

  // Publish listing to the website
  const publishListing = async () => {
    setIsPublishing(true);
    
    try {
      // Convert ExtractedListing to BilingualListing format
      const newListing: BilingualListing = {
        id: `listing_${Date.now()}`,
        title: extractedData.title,
        location: {
          address: {
            cn: extractedData.location.address,
            en: extractedData.location.address,
          },
          area: extractedData.location.area,
        },
        price: {
          amount: extractedData.price.amount,
          currency: extractedData.price.currency,
          notes: extractedData.price.notes,
        },
        propertyType: extractedData.propertyType || "Studio",
        availability: extractedData.availability,
        description: extractedData.description,
        tags: extractedData.tags.cn.map((tag, i) => ({
          cn: tag,
          en: extractedData.tags.en[i] || tag,
        })),
        imageUrl: extractedData.imageUrl,
        images: extractedData.images.length > 0 ? extractedData.images : (extractedData.imageUrl ? [extractedData.imageUrl] : []),
        contact: extractedData.contact,
        isFeatured: isFeatured,
        reviewStatus: "pending", // New listings need review
      };

      // Add to listings context (persisted to localStorage) for Homepage
      addListing(newListing);
      
      // Also save to database for /apartments page
      try {
        await createApartmentMutation.mutateAsync({
          title: `${extractedData.title.cn} | ${extractedData.title.en}`,
          description: `${extractedData.description.cn}\n\n${extractedData.description.en}`,
          propertyType: (extractedData.propertyType?.toLowerCase() || "studio") as "apartment" | "studio" | "house" | "room" | "condo" | "townhouse",
          address: extractedData.location.address,
          city: extractedData.location.area.en || "Salt Lake City",
          state: "UT",
          zipCode: "84101",
          bedrooms: 0,
          bathrooms: 1,
          monthlyRent: extractedData.price.amount,
          securityDeposit: extractedData.price.amount,
          availableFrom: extractedData.availability.start || new Date().toISOString().split("T")[0],
          amenities: extractedData.tags.en,
          images: extractedData.images.length > 0 ? extractedData.images : (extractedData.imageUrl ? [extractedData.imageUrl] : []),
        });
      } catch (dbError) {
        console.warn("Database save failed, but local save succeeded:", dbError);
      }
      
      // Save JSON for persistence modal
      setPublishedJSON(JSON.stringify(newListing, null, 2));
      
      toast.success(
        language === "cn" 
          ? "🎉 房源已发布！" 
          : "🎉 Listing published!"
      );

      // Show persistence guidance modal
      setShowPersistenceModal(true);
    } finally {
      setIsPublishing(false);
    }
  };

  // Step indicator component
  const StepIndicator = ({ step, title, isActive, isComplete }: { step: number; title: string; isActive: boolean; isComplete: boolean }) => (
    <div className={`flex items-center gap-3 ${isActive ? "opacity-100" : "opacity-50"}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
        isComplete ? "bg-green-500 text-white" : isActive ? "bg-primary text-white" : "bg-gray-200 text-gray-500"
      }`}>
        {isComplete ? <Check className="w-5 h-5" /> : step}
      </div>
      <span className={`font-medium ${isActive ? "text-gray-900" : "text-gray-500"}`}>{title}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container py-8 pt-24">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
            <Wand2 className="w-4 h-4" />
            <span className="text-sm font-medium">
              {language === "cn" ? "AI 智能提取" : "AI-Powered Extraction"}
            </span>
          </div>
          <h1 className={`text-3xl md:text-4xl font-bold text-gray-900 mb-4 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
            {language === "cn" ? "AI 房源生成器" : "AI Listing Generator"}
          </h1>
          <p className={`text-lg text-gray-600 max-w-2xl mx-auto ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
            {language === "cn" 
              ? "上传租房截图，AI 自动提取房源信息，一键生成结构化数据"
              : "Upload a rental screenshot, AI extracts listing info automatically"}
          </p>
        </motion.div>

        {/* Step Progress */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-8 mb-12">
          <StepIndicator 
            step={1} 
            title={language === "cn" ? "上传截图" : "Upload"} 
            isActive={currentStep >= 1} 
            isComplete={currentStep > 1 || !!uploadedImage} 
          />
          <ArrowRight className="w-5 h-5 text-gray-300 hidden md:block self-center" />
          <StepIndicator 
            step={2} 
            title={language === "cn" ? "AI 分析" : "Analyze"} 
            isActive={currentStep >= 2} 
            isComplete={currentStep > 2} 
          />
          <ArrowRight className="w-5 h-5 text-gray-300 hidden md:block self-center" />
          <StepIndicator 
            step={3} 
            title={language === "cn" ? "编辑确认" : "Review"} 
            isActive={currentStep >= 3} 
            isComplete={currentStep > 3} 
          />
          <ArrowRight className="w-5 h-5 text-gray-300 hidden md:block self-center" />
          <StepIndicator 
            step={4} 
            title={language === "cn" ? "导出" : "Export"} 
            isActive={currentStep >= 4} 
            isComplete={false} 
          />
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Step 1: Upload */}
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="border-0 shadow-soft-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="w-5 h-5 text-primary" />
                      {language === "cn" ? "步骤 1: 上传截图" : "Step 1: Upload Screenshot"}
                    </CardTitle>
                    <CardDescription>
                      {language === "cn" 
                        ? "拖拽或点击上传租房广告截图（如微信群截图）"
                        : "Drag & drop or click to upload a rental ad screenshot"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Upload Area */}
                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                        uploadedImage 
                          ? "border-green-300 bg-green-50" 
                          : "border-gray-300 hover:border-primary hover:bg-primary/5"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                        className="hidden"
                      />
                      
                      {uploadedImage ? (
                        <div className="space-y-4">
                          <div className="relative inline-block">
                            <img 
                              src={uploadedImage} 
                              alt="Uploaded" 
                              className="max-h-64 rounded-lg shadow-md mx-auto"
                            />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setUploadedImage(null);
                                setUploadedFile(null);
                              }}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-green-600 font-medium flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-5 h-5" />
                            {uploadedFile?.name}
                          </p>
                        </div>
                      ) : (
                        <>
                          <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                          <p className={`text-gray-600 mb-2 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                            {language === "cn" ? "拖拽图片到这里，或点击选择" : "Drag image here, or click to select"}
                          </p>
                          <p className="text-sm text-gray-400">PNG, JPG, WEBP</p>
                        </>
                      )}
                    </div>

                    {/* API Key Input */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Key className="w-4 h-4" />
                        Gemini API Key
                      </Label>
                      {apiKeyFromEnv ? (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 border border-green-200">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span className="text-green-700 font-medium">
                            {language === "cn" ? "✅ 已从配置加载" : "✅ Loaded from Config"}
                          </span>
                          <span className="text-green-600 font-mono text-sm ml-auto">
                            {apiKey.slice(0, 8)}...{apiKey.slice(-4)}
                          </span>
                        </div>
                      ) : (
                        <>
                          <Input
                            type="password"
                            placeholder="AIza..."
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="font-mono"
                          />
                          <p className="text-xs text-gray-500">
                            {language === "cn" 
                              ? "从 Google AI Studio 获取免费 API Key: "
                              : "Get free API Key from Google AI Studio: "}
                            <a 
                              href="https://aistudio.google.com/app/apikey" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              aistudio.google.com
                            </a>
                          </p>
                        </>
                      )}
                    </div>

                    {/* Error Display */}
                    {error && (
                      <div className="p-4 rounded-lg bg-red-50 text-red-600 flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium">{language === "cn" ? "错误" : "Error"}</p>
                          <p className="text-sm">{error}</p>
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <Button
                      onClick={() => {
                        if (uploadedImage && apiKey) {
                          setCurrentStep(2);
                          analyzeImage();
                        } else {
                          toast.error(language === "cn" ? "请上传图片并输入 API Key" : "Please upload image and enter API Key");
                        }
                      }}
                      disabled={!uploadedImage || !apiKey}
                      className="w-full h-14 rounded-full btn-warm text-white font-medium text-base"
                    >
                      <Sparkles className="w-5 h-5 mr-2" />
                      {language === "cn" ? "开始 AI 分析" : "Start AI Analysis"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Processing */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="border-0 shadow-soft-lg">
                  <CardContent className="py-16 text-center">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="inline-block mb-6"
                    >
                      <Sparkles className="w-16 h-16 text-primary" />
                    </motion.div>
                    <h3 className={`text-xl font-semibold text-gray-900 mb-2 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                      {language === "cn" ? "AI 正在分析图片..." : "AI is analyzing the image..."}
                    </h3>
                    <p className={`text-gray-500 ${language === "cn" ? "font-chinese" : ""}`} style={language === "cn" ? { fontFamily: "var(--font-chinese)" } : {}}>
                      {language === "cn" ? "正在提取房源信息，请稍候" : "Extracting listing information, please wait"}
                    </p>
                    
                    {uploadedImage && (
                      <div className="mt-8">
                        <img 
                          src={uploadedImage} 
                          alt="Processing" 
                          className="max-h-48 rounded-lg shadow-md mx-auto opacity-50"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 3: Review & Edit */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="border-0 shadow-soft-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Edit3 className="w-5 h-5 text-primary" />
                      {language === "cn" ? "步骤 3: 检查并编辑" : "Step 3: Review & Edit"}
                    </CardTitle>
                    <CardDescription>
                      {language === "cn" 
                        ? "AI 已提取以下信息，请检查并修正错误"
                        : "AI extracted the following info. Please review and correct any errors."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Preview Image */}
                    {uploadedImage && (
                      <div className="flex justify-center mb-6">
                        <img 
                          src={uploadedImage} 
                          alt="Source" 
                          className="max-h-40 rounded-lg shadow-md"
                        />
                      </div>
                    )}

                    {/* Title */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "标题 (中文)" : "Title (Chinese)"}</Label>
                        <Input
                          value={extractedData.title.cn}
                          onChange={(e) => updateField("title.cn", e.target.value)}
                          placeholder="中文标题"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "标题 (英文)" : "Title (English)"}</Label>
                        <Input
                          value={extractedData.title.en}
                          onChange={(e) => updateField("title.en", e.target.value)}
                          placeholder="English title"
                        />
                      </div>
                    </div>

                    {/* Price */}
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "价格" : "Price"}</Label>
                        <Input
                          type="number"
                          value={extractedData.price.amount}
                          onChange={(e) => updateField("price.amount", parseInt(e.target.value) || 0)}
                          placeholder="1500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "价格备注 (中文)" : "Price Note (CN)"}</Label>
                        <Input
                          value={extractedData.price.notes.cn}
                          onChange={(e) => updateField("price.notes.cn", e.target.value)}
                          placeholder="首月优惠"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "价格备注 (英文)" : "Price Note (EN)"}</Label>
                        <Input
                          value={extractedData.price.notes.en}
                          onChange={(e) => updateField("price.notes.en", e.target.value)}
                          placeholder="First month discount"
                        />
                      </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "地址" : "Address"}</Label>
                        <Input
                          value={extractedData.location.address}
                          onChange={(e) => updateField("location.address", e.target.value)}
                          placeholder="123 Main St, Salt Lake City, UT"
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>{language === "cn" ? "区域 (中文)" : "Area (Chinese)"}</Label>
                          <Input
                            value={extractedData.location.area.cn}
                            onChange={(e) => updateField("location.area.cn", e.target.value)}
                            placeholder="市中心"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>{language === "cn" ? "区域 (英文)" : "Area (English)"}</Label>
                          <Input
                            value={extractedData.location.area.en}
                            onChange={(e) => updateField("location.area.en", e.target.value)}
                            placeholder="Downtown"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Property Type & Availability */}
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "房型" : "Property Type"}</Label>
                        <Input
                          value={extractedData.propertyType}
                          onChange={(e) => updateField("propertyType", e.target.value)}
                          placeholder="1B1B"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "起租日期" : "Start Date"}</Label>
                        <Input
                          value={extractedData.availability.start}
                          onChange={(e) => updateField("availability.start", e.target.value)}
                          placeholder="2024-01-15 or Immediate"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "结束日期" : "End Date"}</Label>
                        <Input
                          value={extractedData.availability.end}
                          onChange={(e) => updateField("availability.end", e.target.value)}
                          placeholder="2024-12-31 or Flexible"
                        />
                      </div>
                    </div>

                    {/* Description */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "描述 (中文)" : "Description (Chinese)"}</Label>
                        <Textarea
                          value={extractedData.description.cn}
                          onChange={(e) => updateField("description.cn", e.target.value)}
                          placeholder="详细描述..."
                          rows={4}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "描述 (英文)" : "Description (English)"}</Label>
                        <Textarea
                          value={extractedData.description.en}
                          onChange={(e) => updateField("description.en", e.target.value)}
                          placeholder="Detailed description..."
                          rows={4}
                        />
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "标签 (中文，逗号分隔)" : "Tags (Chinese, comma-separated)"}</Label>
                        <Input
                          value={tagsInputCn}
                          onChange={(e) => handleTagsChange("cn", e.target.value)}
                          placeholder="急转, 可养宠物, 近地铁"
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                          {extractedData.tags.cn.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="bg-orange-100 text-orange-700">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "标签 (英文，逗号分隔)" : "Tags (English, comma-separated)"}</Label>
                        <Input
                          value={tagsInputEn}
                          onChange={(e) => handleTagsChange("en", e.target.value)}
                          placeholder="Urgent, Pet Friendly, Near Metro"
                        />
                        <div className="flex flex-wrap gap-2 mt-2">
                          {extractedData.tags.en.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="bg-blue-100 text-blue-700">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Contact */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "微信号" : "WeChat ID"}</Label>
                        <Input
                          value={extractedData.contact.wechat}
                          onChange={(e) => updateField("contact.wechat", e.target.value)}
                          placeholder="wechat_id"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{language === "cn" ? "邮箱" : "Email"}</Label>
                        <Input
                          value={extractedData.contact.email}
                          onChange={(e) => updateField("contact.email", e.target.value)}
                          placeholder="host@email.com"
                        />
                      </div>
                    </div>

                    {/* Multi-Image Upload */}
                    <div className="space-y-2">
                      <Label>{language === "cn" ? "房源图片 (支持多张)" : "Listing Images (Multiple)"}</Label>
                      <MultiImageUpload
                        images={extractedData.images}
                        onChange={(newImages) => {
                          updateField("images", newImages);
                          // Set first image as primary imageUrl for backward compatibility
                          if (newImages.length > 0) {
                            updateField("imageUrl", newImages[0]);
                          } else {
                            updateField("imageUrl", "");
                          }
                        }}
                        maxImages={10}
                        maxSizeMB={10}
                        language={language}
                      />
                    </div>

                    {/* Featured Toggle */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 flex items-center justify-center">
                            <Star className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <Label className="text-base font-semibold text-gray-900">
                              {language === "cn" ? "推广到首页 (精选房源)" : "Promote to Homepage (Featured)"}
                            </Label>
                            <p className="text-sm text-gray-600">
                              {language === "cn" 
                                ? "开启后，此房源将在首页精选位置展示"
                                : "When enabled, this listing will appear in the Featured section on Homepage"}
                            </p>
                          </div>
                        </div>
                        <Switch
                          checked={isFeatured}
                          onCheckedChange={setIsFeatured}
                          className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-amber-400 data-[state=checked]:to-orange-500"
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(1)}
                        className="flex-1 h-12 rounded-full"
                      >
                        {language === "cn" ? "重新上传" : "Re-upload"}
                      </Button>
                      <Button
                        onClick={() => setCurrentStep(4)}
                        className="flex-1 h-12 rounded-full btn-warm text-white"
                      >
                        {language === "cn" ? "确认并导出" : "Confirm & Export"}
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 4: Export */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="border-0 shadow-soft-lg">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileJson className="w-5 h-5 text-primary" />
                      {language === "cn" ? "步骤 4: 导出 JSON" : "Step 4: Export JSON"}
                    </CardTitle>
                    <CardDescription>
                      {language === "cn" 
                        ? "复制 JSON 数据或下载文件"
                        : "Copy JSON data or download the file"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* JSON Preview */}
                    <div className="relative">
                      <pre className="p-4 rounded-lg bg-gray-900 text-gray-100 overflow-x-auto text-sm max-h-96">
                        <code>{generateJSON()}</code>
                      </pre>
                    </div>

                    {/* Publish Button - Primary Action */}
                    <Button
                      onClick={publishListing}
                      disabled={isPublishing}
                      className="w-full h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                          {language === "cn" ? "发布中..." : "Publishing..."}
                        </>
                      ) : (
                        <>
                          <Rocket className="w-6 h-6 mr-3" />
                          {language === "cn" ? "🚀 立即发布到网站" : "🚀 Publish to Website Now"}
                        </>
                      )}
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500">
                          {language === "cn" ? "或者导出 JSON" : "or export JSON"}
                        </span>
                      </div>
                    </div>

                    {/* Export Buttons */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <Button
                        onClick={copyToClipboard}
                        variant="outline"
                        className="h-12 rounded-full"
                      >
                        {copied ? (
                          <>
                            <Check className="w-5 h-5 mr-2" />
                            {language === "cn" ? "已复制！" : "Copied!"}
                          </>
                        ) : (
                          <>
                            <Copy className="w-5 h-5 mr-2" />
                            {language === "cn" ? "复制 JSON" : "Copy JSON"}
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={downloadJSON}
                        variant="outline"
                        className="h-12 rounded-full"
                      >
                        <Download className="w-5 h-5 mr-2" />
                        {language === "cn" ? "下载 JSON" : "Download JSON"}
                      </Button>
                    </div>

                    <Separator />

                    {/* Navigation */}
                    <div className="flex gap-4">
                      <Button
                        variant="outline"
                        onClick={() => setCurrentStep(3)}
                        className="flex-1 h-12 rounded-full"
                      >
                        {language === "cn" ? "返回编辑" : "Back to Edit"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setCurrentStep(1);
                          setUploadedImage(null);
                          setUploadedFile(null);
                          setExtractedData(defaultListing);
                          setTagsInputCn("");
                          setTagsInputEn("");
                        }}
                        className="flex-1 h-12 rounded-full"
                      >
                        {language === "cn" ? "处理新图片" : "Process New Image"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Persistence Guidance Modal */}
      <AnimatePresence>
        {showPersistenceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPersistenceModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            >
              <div className="p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {language === "cn" ? "🎉 房源已发布到预览模式！" : "🎉 Listing is Live in Preview Mode!"}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {language === "cn" 
                        ? "您可以在全部房源页面查看新发布的房源"
                        : "You can view the new listing on the All Listings page"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <Info className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800">
                      {language === "cn" ? "重要提示：数据持久化" : "Important: Data Persistence"}
                    </p>
                    <p className="text-sm text-amber-700 mt-1">
                      {language === "cn" 
                        ? "当前房源保存在浏览器本地存储中。如需永久保存供所有用户查看，请复制下方 JSON 并粘贴到代码中。"
                        : "This listing is saved in browser localStorage. To make it permanent for all users, please copy the JSON below and add it to your codebase."}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    {language === "cn" ? "房源 JSON 数据" : "Listing JSON Data"}
                  </Label>
                  <pre className="p-4 rounded-lg bg-gray-900 text-gray-100 overflow-x-auto text-xs max-h-48">
                    <code>{publishedJSON}</code>
                  </pre>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={async () => {
                      await navigator.clipboard.writeText(publishedJSON);
                      toast.success(language === "cn" ? "已复制 JSON" : "JSON copied!");
                    }}
                    variant="outline"
                    className="flex-1 h-12 rounded-full"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {language === "cn" ? "复制 JSON" : "Copy JSON"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPersistenceModal(false);
                      setLocation("/apartments");
                    }}
                    className="flex-1 h-12 rounded-full btn-warm text-white"
                  >
                    {language === "cn" ? "查看全部房源" : "View All Listings"}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>

              <button
                onClick={() => setShowPersistenceModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
