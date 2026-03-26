import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Star, Zap, Crown, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
}

type Plan = "7_days" | "30_days" | "90_days";

const PLANS = [
  {
    id: "7_days" as Plan,
    duration: 7,
    price: 9.99,
    icon: Star,
    popular: false,
    labelEn: "1 Week",
    labelCn: "1 周",
    descEn: "Great for testing",
    descCn: "适合测试效果",
  },
  {
    id: "30_days" as Plan,
    duration: 30,
    price: 24.99,
    icon: Zap,
    popular: true,
    labelEn: "1 Month",
    labelCn: "1 个月",
    descEn: "Most popular choice",
    descCn: "最受欢迎的选择",
  },
  {
    id: "90_days" as Plan,
    duration: 90,
    price: 59.99,
    icon: Crown,
    popular: false,
    labelEn: "3 Months",
    labelCn: "3 个月",
    descEn: "Best value",
    descCn: "最划算",
  },
];

export function PromotionModal({ isOpen, onClose, listingId, listingTitle }: PromotionModalProps) {
  const { language } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("30_days");
  const [isProcessing, setIsProcessing] = useState(false);

  const createPromotionMutation = trpc.promotions.create.useMutation({
    onSuccess: (data) => {
      toast.success(language === "cn" ? "推广订单已创建" : "Promotion order created");
      // In a real implementation, redirect to Stripe checkout
      // For now, just show success
      onClose();
    },
    onError: (error) => {
      toast.error(error.message);
      setIsProcessing(false);
    },
  });

  const handlePurchase = async () => {
    setIsProcessing(true);
    createPromotionMutation.mutate({
      listingId,
      plan: selectedPlan,
    });
  };

  const selectedPlanData = PLANS.find((p) => p.id === selectedPlan)!;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-8 text-white">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <Star className="w-8 h-8" />
                <h2 className="text-2xl font-bold">
                  {language === "cn" ? "推广到首页" : "Promote to Homepage"}
                </h2>
              </div>
              <p className="text-white/90 text-sm">
                {language === "cn"
                  ? "让您的房源在首页精选位置展示，获得更多曝光"
                  : "Feature your listing on the homepage for maximum visibility"}
              </p>
            </div>

            {/* Listing Info */}
            <div className="px-6 py-4 bg-gray-50 border-b">
              <p className="text-sm text-gray-500">
                {language === "cn" ? "推广房源" : "Promoting listing"}:
              </p>
              <p className="font-medium text-gray-900 line-clamp-1">{listingTitle}</p>
            </div>

            {/* Plans */}
            <div className="px-6 py-6">
              <div className="space-y-3">
                {PLANS.map((plan) => {
                  const Icon = plan.icon;
                  const isSelected = selectedPlan === plan.id;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan.id)}
                      className={`w-full p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          isSelected ? "bg-primary text-white" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">
                            {language === "cn" ? plan.labelCn : plan.labelEn}
                          </span>
                          {plan.popular && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-primary text-white rounded-full">
                              {language === "cn" ? "热门" : "Popular"}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {language === "cn" ? plan.descCn : plan.descEn}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-900">${plan.price}</p>
                        <p className="text-xs text-gray-500">
                          ${(plan.price / plan.duration).toFixed(2)}/{language === "cn" ? "天" : "day"}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Benefits */}
              <div className="mt-6 p-4 bg-amber-50 rounded-xl">
                <h4 className="font-medium text-amber-900 mb-2">
                  {language === "cn" ? "推广权益" : "Promotion Benefits"}
                </h4>
                <ul className="space-y-2 text-sm text-amber-800">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-600" />
                    {language === "cn" ? "首页精选位置展示" : "Featured placement on homepage"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-600" />
                    {language === "cn" ? "金色精选徽章" : "Gold featured badge"}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-600" />
                    {language === "cn" ? "搜索结果优先排序" : "Priority in search results"}
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                {language === "cn" ? "取消" : "Cancel"}
              </Button>
              <Button
                onClick={handlePurchase}
                disabled={isProcessing}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === "cn" ? "处理中..." : "Processing..."}
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4 mr-2" />
                    {language === "cn" ? `支付 $${selectedPlanData.price}` : `Pay $${selectedPlanData.price}`}
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
