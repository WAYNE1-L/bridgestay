import { motion } from "framer-motion";

interface BridgeStayLogoProps {
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  className?: string;
}

// Minimalist bridge arch icon as SVG
function BridgeIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bridge arch */}
      <path
        d="M4 28C4 28 8 12 20 12C32 12 36 28 36 28"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Left pillar */}
      <path
        d="M8 28V34"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Right pillar */}
      <path
        d="M32 28V34"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Bridge deck */}
      <path
        d="M4 28H36"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function BridgeStayLogo({ size = "md", showIcon = true, className = "" }: BridgeStayLogoProps) {
  const sizes = {
    sm: {
      icon: "w-8 h-8",
      iconWrapper: "w-9 h-9",
      bridge: "text-lg",
      stay: "text-lg",
      gap: "gap-2",
    },
    md: {
      icon: "w-9 h-9",
      iconWrapper: "w-10 h-10",
      bridge: "text-xl",
      stay: "text-xl",
      gap: "gap-2.5",
    },
    lg: {
      icon: "w-12 h-12",
      iconWrapper: "w-14 h-14",
      bridge: "text-2xl",
      stay: "text-2xl",
      gap: "gap-3",
    },
  };

  const s = sizes[size];

  return (
    <div className={`flex items-center ${s.gap} ${className}`}>
      {showIcon && (
        <motion.div
          className={`${s.iconWrapper} rounded-xl bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center shadow-sm`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <BridgeIcon className={`${s.icon} text-white`} />
        </motion.div>
      )}
      <div className="flex items-baseline gap-1">
        <span 
          className={`${s.bridge} font-bold text-gray-900`}
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Bridge
        </span>
        <span className={`${s.stay} font-light text-gray-600`}>
          Stay
        </span>
      </div>
    </div>
  );
}

// Compact version for tight spaces
export function BridgeStayLogoCompact({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center shadow-sm">
        <BridgeIcon className="w-6 h-6 text-white" />
      </div>
      <div className="flex items-baseline">
        <span 
          className="text-base font-bold text-gray-900"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Bridge
        </span>
        <span className="text-base font-light text-gray-600">Stay</span>
      </div>
    </div>
  );
}

export { BridgeIcon };
