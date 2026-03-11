import { useNavigate } from "react-router-dom";
import { Crown, Shield, Sparkles } from "lucide-react";

const cards = [
  {
    icon: Crown,
    label: "Net Worth",
    value: "$2,430,000",
    desc: "Your total wealth snapshot",
    delay: 400,
  },
  {
    icon: Shield,
    label: "Financial Score",
    value: "78 / 100",
    desc: "Your financial health rating",
    delay: 500,
  },
  {
    icon: Sparkles,
    label: "AI Insight",
    value: null,
    text: "You could reach $8.2M in net worth in 20 years.",
    desc: "Powered by AI analysis",
    delay: 600,
  },
] as const;

export default function ValuePreview() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center overflow-y-auto px-4 sm:px-5 lg:px-6 pb-8"
      style={{
        background: "linear-gradient(135deg, #0f2818 0%, #1a472a 50%, #0f2818 100%)",
      }}
    >
      {/* Vignette */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-[1000px] py-8 sm:py-12 lg:py-16">
        {/* Logo */}
        <img
          src="/images/logo-CL-Verde-dourado-Gold-claro.png"
          alt="Crown & Legacy Logo"
          loading="lazy"
          className="w-[120px] h-[120px] sm:w-[160px] sm:h-[160px] lg:w-[200px] lg:h-[200px] mb-5 sm:mb-[22px] lg:mb-6 rounded-3xl object-cover animate-[fadeInScale_300ms_ease-out_both]"
        />

        {/* Title */}
        <h1
          className="font-display font-bold text-center leading-tight tracking-[2px] mb-2 animate-[fadeInUp_300ms_ease-out_100ms_both]"
          style={{ color: "#F0D58A", fontSize: "clamp(36px, 5vw, 52px)" }}
        >
          Crown &amp; Legacy
        </h1>

        {/* Tagline */}
        <p
          className="text-base sm:text-[17px] lg:text-lg text-center mb-2 animate-[fadeInUp_300ms_ease-out_200ms_both]"
          style={{ color: "#E8E8E8" }}
        >
          Protect. Grow. Wealth.
        </p>

        {/* Subtitle */}
        <p
          className="text-[11px] sm:text-xs lg:text-[13px] font-medium uppercase tracking-[3px] text-center mb-8 sm:mb-10 lg:mb-12 animate-[fadeInUp_300ms_ease-out_300ms_both]"
          style={{ color: "#E8E8E8" }}
        >
          WEALTH INTELLIGENCE PLATFORM
        </p>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-[18px] lg:gap-5 w-full mb-8 sm:mb-10 lg:mb-12">
          {cards.map((card) => (
            <div
              key={card.label}
              className="flex flex-col items-center justify-center text-center rounded-xl p-5 sm:p-6 lg:p-7 transition-all duration-200 hover:shadow-[0_12px_40px_rgba(0,0,0,0.4)]"
              style={{
                background: "rgba(255,255,255,0.05)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                border: "1px solid rgba(240,213,138,0.2)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                animation: `fadeInUp 300ms ease-out ${card.delay}ms both`,
              }}
            >
              <card.icon size={32} style={{ color: "#F0D58A" }} className="mb-3" />
              <span
                className="text-sm font-medium mb-2"
                style={{ color: "#E8E8E8" }}
              >
                {card.label}
              </span>
              {card.value ? (
                <span
                  className="font-mono font-bold text-[28px] lg:text-[32px] mb-2"
                  style={{ color: "#F0D58A", letterSpacing: "0.5px" }}
                >
                  {card.value}
                </span>
              ) : (
                <p
                  className="text-base leading-relaxed mb-2"
                  style={{ color: "#E8E8E8" }}
                >
                  {(card as any).text}
                </p>
              )}
              <span className="text-[13px]" style={{ color: "#A0AEC0" }}>
                {card.desc}
              </span>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div
          className="flex flex-col gap-2.5 w-full max-w-[400px] animate-[fadeInUp_300ms_ease-out_700ms_both]"
        >
          <button
            onClick={() => navigate("/auth?tab=signup")}
            aria-label="Create Account"
            className="w-full h-10 rounded-lg text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: "linear-gradient(135deg, #F0D58A 0%, #E8C547 100%)",
              color: "#1a472a",
              outline: "none",
            }}
          >
            Create Account
          </button>
          <button
            onClick={() => navigate("/auth?tab=login")}
            aria-label="Sign In"
            className="w-full h-10 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-[rgba(240,213,138,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2"
            style={{
              background: "transparent",
              border: "1px solid rgba(240,213,138,0.3)",
              color: "#F0D58A",
              outline: "none",
            }}
          >
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
