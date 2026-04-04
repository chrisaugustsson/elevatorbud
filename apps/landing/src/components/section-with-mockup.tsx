import React from "react";

type SecondaryStyle =
  | "gradient-blue"
  | "gradient-mesh"
  | "geometric-lines"
  | "noise-texture"
  | "dots-grid"
  | "concentric-circles";

interface SectionWithMockupProps {
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  primaryImageSrc?: string;
  secondaryStyle?: SecondaryStyle;
  reverseLayout?: boolean;
}

// Primary card abstract art — each one is unique and visually rich
function PrimaryAbstract({ style }: { style: SecondaryStyle }) {
  switch (style) {
    case "gradient-blue":
      return (
        <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 400 500" fill="none" className="w-full h-full">
            <rect width="400" height="500" fill="#f8fafc" />
            <circle cx="200" cy="180" r="120" fill="#3b82f6" opacity="0.08" />
            <circle cx="200" cy="180" r="80" fill="#3b82f6" opacity="0.12" />
            <rect x="80" y="280" width="240" height="8" rx="4" fill="#3b82f6" opacity="0.15" />
            <rect x="80" y="300" width="180" height="8" rx="4" fill="#3b82f6" opacity="0.1" />
            <rect x="80" y="320" width="210" height="8" rx="4" fill="#3b82f6" opacity="0.1" />
            <rect x="80" y="360" width="100" height="32" rx="8" fill="#3b82f6" opacity="0.9" />
            <rect x="200" y="360" width="100" height="32" rx="8" fill="#e2e8f0" />
            <path d="M60 100 L340 100" stroke="#e2e8f0" strokeWidth="1" />
            <path d="M60 260 L340 260" stroke="#e2e8f0" strokeWidth="1" />
          </svg>
        </div>
      );
    case "gradient-mesh":
      return (
        <div className="w-full h-full bg-slate-900 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(59,130,246,0.5),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_80%,rgba(139,92,246,0.4),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(14,165,233,0.25),transparent_50%)]" />
          <svg viewBox="0 0 400 500" fill="none" className="absolute inset-0 w-full h-full">
            {Array.from({ length: 6 }).map((_, i) => (
              <circle
                key={i}
                cx={120 + (i % 3) * 80}
                cy={150 + Math.floor(i / 3) * 180}
                r={30 + (i * 7)}
                stroke="rgba(255,255,255,0.1)"
                strokeWidth="1"
                fill="none"
              />
            ))}
          </svg>
        </div>
      );
    case "geometric-lines":
      return (
        <div className="w-full h-full bg-white overflow-hidden">
          <svg viewBox="0 0 400 500" fill="none" className="w-full h-full">
            <rect width="400" height="500" fill="#fafafa" />
            {Array.from({ length: 20 }).map((_, i) => (
              <line
                key={i}
                x1={0}
                y1={i * 25}
                x2={400}
                y2={i * 25 + 60}
                stroke="#3b82f6"
                strokeWidth={i % 3 === 0 ? "2" : "1"}
                opacity={0.06 + (i % 4) * 0.04}
              />
            ))}
            {Array.from({ length: 15 }).map((_, i) => (
              <line
                key={`v-${i}`}
                x1={i * 30}
                y1={0}
                x2={i * 30 + 20}
                y2={500}
                stroke="#6366f1"
                strokeWidth="1"
                opacity={0.04 + (i % 3) * 0.03}
              />
            ))}
            <rect x="60" y="120" width="280" height="260" rx="12" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.15" />
            <rect x="80" y="140" width="240" height="220" rx="8" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.1" />
          </svg>
        </div>
      );
    case "noise-texture":
      return (
        <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-t from-blue-600/10 to-transparent" />
          <svg viewBox="0 0 400 500" fill="none" className="absolute inset-0 w-full h-full">
            <rect x="60" y="80" width="280" height="40" rx="6" fill="rgba(255,255,255,0.06)" />
            <rect x="60" y="140" width="200" height="12" rx="4" fill="rgba(255,255,255,0.08)" />
            <rect x="60" y="165" width="240" height="12" rx="4" fill="rgba(255,255,255,0.05)" />
            <rect x="60" y="190" width="160" height="12" rx="4" fill="rgba(255,255,255,0.05)" />
            <rect x="60" y="240" width="280" height="160" rx="8" fill="rgba(255,255,255,0.04)" />
            <line x1="60" y1="300" x2="340" y2="300" stroke="rgba(255,255,255,0.06)" />
            <line x1="200" y1="240" x2="200" y2="400" stroke="rgba(255,255,255,0.06)" />
            <circle cx="130" cy="270" r="8" fill="#3b82f6" opacity="0.6" />
            <circle cx="270" cy="350" r="12" fill="#6366f1" opacity="0.4" />
          </svg>
        </div>
      );
    case "dots-grid":
      return (
        <div className="w-full h-full bg-white overflow-hidden relative">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle, #3b82f6 1.2px, transparent 1.2px)",
              backgroundSize: "24px 24px",
              opacity: 0.12,
            }}
          />
          <svg viewBox="0 0 400 500" fill="none" className="absolute inset-0 w-full h-full">
            <rect x="80" y="100" width="240" height="300" rx="16" fill="none" stroke="#3b82f6" strokeWidth="2" opacity="0.12" />
            <rect x="100" y="130" width="90" height="90" rx="8" fill="#3b82f6" opacity="0.06" />
            <rect x="210" y="130" width="90" height="90" rx="8" fill="#6366f1" opacity="0.06" />
            <rect x="100" y="240" width="200" height="12" rx="4" fill="#3b82f6" opacity="0.1" />
            <rect x="100" y="265" width="150" height="12" rx="4" fill="#3b82f6" opacity="0.07" />
            <rect x="100" y="310" width="80" height="36" rx="8" fill="#3b82f6" opacity="0.15" />
          </svg>
        </div>
      );
    case "concentric-circles":
      return (
        <div className="w-full h-full bg-gradient-to-br from-emerald-50 to-teal-50 overflow-hidden">
          <svg viewBox="0 0 400 500" fill="none" className="w-full h-full">
            {Array.from({ length: 10 }).map((_, i) => (
              <circle
                key={i}
                cx="200"
                cy="250"
                r={30 + i * 25}
                stroke="#10b981"
                strokeWidth="1"
                opacity={0.05 + i * 0.02}
              />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <circle
                key={`s-${i}`}
                cx="320"
                cy="120"
                r={15 + i * 20}
                stroke="#14b8a6"
                strokeWidth="1"
                opacity={0.04 + i * 0.015}
              />
            ))}
            <circle cx="200" cy="250" r="6" fill="#10b981" opacity="0.5" />
            <circle cx="320" cy="120" r="4" fill="#14b8a6" opacity="0.4" />
          </svg>
        </div>
      );
  }
}

// Secondary card abstract backgrounds
function SecondaryAbstract({ style }: { style: SecondaryStyle }) {
  switch (style) {
    case "gradient-blue":
      return (
        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700" />
      );
    case "gradient-mesh":
      return (
        <div className="w-full h-full rounded-2xl bg-slate-950 overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,rgba(59,130,246,0.3),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_70%,rgba(139,92,246,0.25),transparent_60%)]" />
        </div>
      );
    case "geometric-lines":
      return (
        <div className="w-full h-full rounded-2xl bg-slate-50 border border-slate-200 overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 400 400" fill="none">
            {Array.from({ length: 12 }).map((_, i) => (
              <line
                key={i}
                x1={0} y1={i * 35} x2={400} y2={i * 35 + 80}
                stroke="#6366f1" strokeWidth="1" opacity={0.08 + (i % 3) * 0.05}
              />
            ))}
          </svg>
        </div>
      );
    case "noise-texture":
      return (
        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900" />
      );
    case "dots-grid":
      return (
        <div className="w-full h-full rounded-2xl bg-blue-50 border border-blue-100 overflow-hidden">
          <div
            className="w-full h-full"
            style={{
              backgroundImage: "radial-gradient(circle, #3b82f6 1px, transparent 1px)",
              backgroundSize: "16px 16px",
              opacity: 0.15,
            }}
          />
        </div>
      );
    case "concentric-circles":
      return (
        <div className="w-full h-full rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 border border-emerald-200" />
      );
  }
}

const SectionWithMockup: React.FC<SectionWithMockupProps> = ({
  title,
  description,
  primaryImageSrc,
  secondaryStyle = "gradient-blue",
  reverseLayout = false,
}) => {
  const layoutClasses = reverseLayout
    ? "md:grid-cols-2 md:grid-flow-col-dense"
    : "md:grid-cols-2";

  const textOrderClass = reverseLayout ? "md:col-start-2" : "";
  const imageOrderClass = reverseLayout ? "md:col-start-1" : "";
  const hasImage = primaryImageSrc && primaryImageSrc.length > 0;

  return (
    <section className="relative py-10 md:py-14 bg-white overflow-hidden">
      <div className="mx-auto max-w-5xl w-full px-6 md:px-10 relative z-10">
        <div
          className={`grid grid-cols-1 gap-8 md:gap-10 w-full items-center ${layoutClasses}`}
        >
          {/* Text Content */}
          <div
            className={`flex flex-col items-start gap-4 max-w-[480px] mx-auto md:mx-0 ${textOrderClass}`}
          >
            <h2 className="text-slate-900 text-2xl md:text-[32px] font-semibold leading-tight md:leading-[42px]">
              {title}
            </h2>
            <p className="text-slate-500 text-sm md:text-[15px] leading-6">
              {description}
            </p>
          </div>

          {/* Visual Content */}
          <div
            className={`relative w-full max-w-[200px] md:max-w-[280px] ${reverseLayout ? "mr-auto ml-0" : "ml-auto mr-0"} ${imageOrderClass}`}
          >
            {/* Back card — image or abstract art */}
            <div
              className="absolute w-[180px] h-[190px] md:w-[260px] md:h-[280px] rounded-2xl z-0 overflow-hidden"
              style={{
                top: reverseLayout ? "auto" : "8%",
                bottom: reverseLayout ? "8%" : "auto",
                left: reverseLayout ? "auto" : "-15%",
                right: reverseLayout ? "-15%" : "auto",
              }}
            >
              {hasImage ? (
                <div
                  className="w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${primaryImageSrc})` }}
                />
              ) : (
                <SecondaryAbstract style={secondaryStyle} />
              )}
            </div>

            {/* Front card — frosted glass overlay */}
            <div className="relative w-full h-[250px] md:h-[360px] rounded-2xl shadow-xl shadow-slate-200/50 z-10 overflow-hidden bg-white/20 backdrop-blur-md ring-1 ring-white/40 border border-white/20" />
          </div>
        </div>
      </div>

      {/* Decorative bottom border */}
      <div className="absolute w-full h-px bottom-0 left-0 bg-slate-200" />
    </section>
  );
};

export default SectionWithMockup;
