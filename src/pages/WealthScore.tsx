import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Trophy, Copy, Zap, Share2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";

/* ─── Questions ─── */
const QUESTIONS = [
  {
    question: "What is your monthly income?",
    options: [
      { label: "Less than $2,000", weight: 1 },
      { label: "$2,000 – $5,000", weight: 2 },
      { label: "$5,000 – $10,000", weight: 3 },
      { label: "$10,000 – $25,000", weight: 4 },
      { label: "More than $25,000", weight: 5 },
    ],
  },
  {
    question: "What is your current net worth?",
    options: [
      { label: "Less than $10,000", weight: 1 },
      { label: "$10,000 – $100,000", weight: 2 },
      { label: "$100,000 – $500,000", weight: 3 },
      { label: "$500,000 – $2,000,000", weight: 4 },
      { label: "More than $2,000,000", weight: 5 },
    ],
  },
  {
    question: "How often do you invest?",
    options: [
      { label: "Never", weight: 1 },
      { label: "Rarely (once a year)", weight: 2 },
      { label: "Sometimes (quarterly)", weight: 3 },
      { label: "Regularly (monthly)", weight: 4 },
      { label: "Actively (weekly or more)", weight: 5 },
    ],
  },
  {
    question: "What percentage of your income do you save?",
    options: [
      { label: "0% – I spend it all", weight: 1 },
      { label: "1% – 10%", weight: 2 },
      { label: "10% – 25%", weight: 3 },
      { label: "25% – 50%", weight: 4 },
      { label: "More than 50%", weight: 5 },
    ],
  },
  {
    question: "What is your debt level relative to your assets?",
    options: [
      { label: "Very high – debt exceeds assets", weight: 1 },
      { label: "High – close to equal", weight: 2 },
      { label: "Moderate – manageable debt", weight: 3 },
      { label: "Low – mostly debt-free", weight: 4 },
      { label: "None – completely debt-free", weight: 5 },
    ],
  },
];

function getCategory(score: number) {
  if (score >= 90) return { label: "Elite", color: "#F0D58A" };
  if (score >= 70) return { label: "Advanced", color: "#10b981" };
  if (score >= 40) return { label: "Stable", color: "#f97316" };
  return { label: "Beginner", color: "#ef4444" };
}

function getExplanation(score: number) {
  if (score >= 90)
    return "You're a wealth master! Continue leveraging your financial knowledge and consider mentoring others.";
  if (score >= 70)
    return "You're above average in financial discipline. Keep optimizing your portfolio and explore advanced strategies.";
  if (score >= 40)
    return "You have solid financial foundations. Consider diversifying your investments and increasing your savings rate.";
  return "You're just starting your wealth journey. Focus on building emergency savings and understanding basic investments.";
}

const SHARE_URL = () => window.location.origin + "/wealth-score";

/* ─── Component ─── */
export default function WealthScore() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const friendResult = searchParams.get("result");
  const friendScore =
    friendResult !== null
      ? Math.max(0, Math.min(100, parseInt(friendResult, 10) || 0))
      : null;

  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    Array(QUESTIONS.length).fill(null)
  );
  const [score, setScore] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [showChallenge, setShowChallenge] = useState(friendScore !== null);

  /* Restore from localStorage */
  useEffect(() => {
    if (friendScore !== null) return;
    try {
      const stored = localStorage.getItem("wealthScoreResult");
      if (stored) {
        const { score: s, answers: a } = JSON.parse(stored);
        if (typeof s === "number") {
          setScore(s);
          setAnswers(a);
          setShowResult(true);
        }
      }
    } catch {
      /* ignore */
    }
  }, [friendScore]);

  const handleSelect = (weight: number) => {
    const next = [...answers];
    next[currentQ] = weight;
    setAnswers(next);
  };

  const calculateScore = useCallback(() => {
    const sum = answers.reduce<number>((a, b) => a + (b ?? 0), 0);
    const s = Math.round(Math.max(0, Math.min(100, (sum / 25) * 100)));
    setScore(s);
    setShowResult(true);
    try {
      localStorage.setItem(
        "wealthScoreResult",
        JSON.stringify({ score: s, answers, timestamp: Date.now() })
      );
    } catch {
      /* ignore */
    }
  }, [answers]);

  const handleNext = () => {
    if (currentQ < QUESTIONS.length - 1) setCurrentQ((p) => p + 1);
    else calculateScore();
  };

  const handleShare = async (
    platform: "twitter" | "linkedin" | "copy" | "web"
  ) => {
    const link = `${SHARE_URL()}?result=${score}`;
    const text = `I scored ${score} on the Wealth Intelligence Score by Crown & Legacy! Test yours:`;

    if (platform === "copy") {
      try {
        await navigator.clipboard.writeText(link);
        toast.success("Link copied to clipboard!");
      } catch {
        toast.error("Failed to copy link");
      }
    } else if (platform === "twitter") {
      window.open(
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(text + " " + link)}`,
        "_blank"
      );
    } else if (platform === "linkedin") {
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`,
        "_blank"
      );
    } else if (platform === "web" && navigator.share) {
      try {
        await navigator.share({ title: "Wealth Intelligence Score", text, url: link });
      } catch {
        /* cancelled */
      }
    }
  };

  const startQuiz = () => {
    setShowChallenge(false);
    setShowResult(false);
    setScore(null);
    setCurrentQ(0);
    setAnswers(Array(QUESTIONS.length).fill(null));
  };

  const cat = score !== null ? getCategory(score) : null;
  const friendCat = friendScore !== null ? getCategory(friendScore) : null;
  const progress =
    showResult ? 100 : ((currentQ + (answers[currentQ] !== null ? 1 : 0)) / QUESTIONS.length) * 100;

  /* ─── Challenge screen ─── */
  if (showChallenge && friendScore !== null && !showResult) {
    return (
      <Shell progress={0}>
        <div className="flex flex-col items-center animate-[fadeInUp_300ms_ease-out_both]">
          <Zap size={48} style={{ color: "#F0D58A" }} className="mb-4" />
          <h2
            className="font-display text-[28px] sm:text-[36px] lg:text-[40px] font-bold text-center mb-2"
            style={{ color: "#F0D58A" }}
          >
            Your Friend's Challenge
          </h2>
          <p className="text-sm text-center mb-6" style={{ color: "#E8E8E8" }}>
            Your friend scored{" "}
            <span className="font-mono font-bold" style={{ color: friendCat!.color }}>
              {friendScore}
            </span>
            ! Can you beat it?
          </p>
          <div
            className="font-mono text-[56px] font-bold mb-2"
            style={{ color: friendCat!.color }}
          >
            {friendScore}
          </div>
          <p className="text-sm mb-8" style={{ color: friendCat!.color }}>
            {friendCat!.label}
          </p>
          <button
            onClick={startQuiz}
            className="w-full max-w-[320px] rounded-lg h-11 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            style={{
              background: "linear-gradient(135deg, #F0D58A 0%, #E8C547 100%)",
              color: "#1a472a",
            }}
          >
            Take the Test
          </button>
        </div>
      </Shell>
    );
  }

  /* ─── Result screen ─── */
  if (showResult && score !== null && cat) {
    const comparison =
      friendScore !== null
        ? score > friendScore
          ? `You beat your friend! ${score} > ${friendScore} 🎉`
          : score === friendScore
            ? `You tied! ${score} = ${friendScore}`
            : `Your friend is ahead. ${score} < ${friendScore}`
        : null;

    return (
      <Shell progress={100}>
        <div className="flex flex-col items-center animate-[fadeInUp_300ms_ease-out_both]">
          <Trophy
            size={48}
            style={{ color: cat.color }}
            className="mb-4 animate-[fadeInScale_300ms_ease-out_both]"
          />

          <h2
            className="font-display text-[28px] sm:text-[36px] lg:text-[40px] font-bold text-center mb-6"
            style={{ color: "#F0D58A" }}
          >
            Your Wealth Intelligence Score
          </h2>

          <div
            className="font-mono text-[48px] sm:text-[56px] lg:text-[64px] font-bold leading-none mb-1"
            style={{ color: cat.color }}
          >
            {score}
          </div>
          <p className="text-lg font-medium mb-6" style={{ color: cat.color }}>
            {cat.label}
          </p>

          {comparison && (
            <p className="text-sm text-center font-medium mb-4" style={{ color: "#F0D58A" }}>
              {comparison}
            </p>
          )}

          <p
            className="text-sm text-center leading-relaxed mb-8 max-w-[400px]"
            style={{ color: "#E8E8E8" }}
          >
            {getExplanation(score)}
          </p>

          {/* Shareable Card */}
          <div
            className="w-full max-w-[400px] rounded-xl p-6 mb-8 flex flex-col items-center"
            style={{
              background: "linear-gradient(135deg, #0f2818, #1a472a)",
              border: "2px solid #F0D58A",
            }}
          >
            <img
              src="/images/logo-CL-Verde-dourado-Gold-claro.png"
              alt="Crown & Legacy"
              className="w-20 h-20 rounded-2xl object-cover mb-4"
              loading="lazy"
            />
            <p className="text-sm font-medium mb-1" style={{ color: "#E8E8E8" }}>
              My Wealth Score
            </p>
            <div className="font-mono text-5xl font-bold mb-1" style={{ color: "#F0D58A" }}>
              {score}
            </div>
            <p className="text-xs mb-4" style={{ color: "#9ca3af" }}>
              {cat.label}
            </p>
            <p className="text-[11px]" style={{ color: "#9ca3af" }}>
              Crown & Legacy · Wealth Intelligence Platform
            </p>
          </div>

          {/* Share Buttons */}
          <div className="flex flex-wrap gap-3 justify-center mb-8">
            {[
              { label: "Copy Link", icon: Copy, platform: "copy" as const },
              { label: "Twitter", icon: Share2, platform: "twitter" as const },
              { label: "LinkedIn", icon: Share2, platform: "linkedin" as const },
            ].map((btn) => (
              <button
                key={btn.platform}
                onClick={() => handleShare(btn.platform)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 hover:bg-[rgba(240,213,138,0.15)]"
                style={{
                  background: "rgba(240, 213, 138, 0.1)",
                  border: "1px solid rgba(240, 213, 138, 0.3)",
                  color: "#F0D58A",
                }}
                aria-label={`Share on ${btn.label}`}
              >
                <btn.icon size={16} />
                {btn.label}
              </button>
            ))}
            {"share" in navigator && (
              <button
                onClick={() => handleShare("web")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all duration-200 hover:bg-[rgba(240,213,138,0.15)]"
                style={{
                  background: "rgba(240, 213, 138, 0.1)",
                  border: "1px solid rgba(240, 213, 138, 0.3)",
                  color: "#F0D58A",
                }}
                aria-label="Share via device"
              >
                <Share2 size={16} />
                Share
              </button>
            )}
          </div>

          {/* CTA */}
          <div className="w-full max-w-[400px] flex flex-col gap-3">
            <button
              onClick={() => navigate(`/auth?tab=signup&score=${score}`)}
              className="w-full rounded-lg h-11 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
              style={{
                background: "linear-gradient(135deg, #F0D58A 0%, #E8C547 100%)",
                color: "#1a472a",
                boxShadow: "0 4px 16px rgba(240, 213, 138, 0.3)",
              }}
              aria-label="Create Account"
            >
              Create Account to Improve Your Score
            </button>
            <button
              onClick={() => navigate("/auth?tab=login")}
              className="w-full rounded-lg h-11 text-sm font-medium transition-all duration-200 hover:bg-[rgba(240,213,138,0.1)]"
              style={{
                background: "transparent",
                border: "1px solid rgba(240, 213, 138, 0.3)",
                color: "#F0D58A",
              }}
              aria-label="Sign In"
            >
              Sign In
            </button>
            <button
              onClick={startQuiz}
              className="text-xs mt-2 transition-colors hover:underline"
              style={{ color: "#9ca3af" }}
            >
              Take Again
            </button>
          </div>
        </div>
      </Shell>
    );
  }

  /* ─── Quiz screen ─── */
  const q = QUESTIONS[currentQ];

  return (
    <Shell progress={progress}>
      {/* Back button */}
      {currentQ > 0 && (
        <button
          onClick={() => setCurrentQ((p) => p - 1)}
          className="absolute top-4 left-4 p-1 transition-colors"
          style={{ color: "#10b981" }}
          aria-label="Previous question"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      <div
        key={currentQ}
        className="animate-[slideInRight_300ms_ease-out_both]"
      >
        <p className="text-xs mb-4" style={{ color: "#9ca3af" }}>
          Question {currentQ + 1} of {QUESTIONS.length}
        </p>

        <h3 className="text-base font-medium mb-6" style={{ color: "#E8E8E8" }}>
          {q.question}
        </h3>

        <div role="radiogroup" aria-label={q.question} className="flex flex-col gap-3">
          {q.options.map((opt, i) => {
            const selected = answers[currentQ] === opt.weight;
            return (
              <label
                key={i}
                className="flex items-center gap-3 p-3 px-4 rounded-lg cursor-pointer transition-all duration-200"
                style={{
                  background: selected
                    ? "rgba(240, 213, 138, 0.2)"
                    : "rgba(255, 255, 255, 0.05)",
                  border: `1px solid ${selected ? "#F0D58A" : "rgba(240, 213, 138, 0.2)"}`,
                }}
              >
                <input
                  type="radio"
                  name={`q-${currentQ}`}
                  value={opt.weight}
                  checked={selected}
                  onChange={() => handleSelect(opt.weight)}
                  className="sr-only"
                />
                <span
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: selected ? "#F0D58A" : "rgba(240, 213, 138, 0.4)" }}
                >
                  {selected && (
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ background: "#F0D58A" }}
                    />
                  )}
                </span>
                <span className="text-sm" style={{ color: "#E8E8E8" }}>
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>

        <div className="flex gap-3 mt-6">
          {currentQ > 0 && (
            <button
              onClick={() => setCurrentQ((p) => p - 1)}
              className="flex-1 rounded-lg h-10 text-sm font-medium transition-all duration-200 hover:bg-[rgba(240,213,138,0.1)]"
              style={{
                background: "transparent",
                border: "1px solid rgba(240, 213, 138, 0.3)",
                color: "#F0D58A",
              }}
            >
              Previous
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={answers[currentQ] === null}
            className="flex-1 rounded-lg h-10 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            style={{
              background: "linear-gradient(135deg, #F0D58A 0%, #E8C547 100%)",
              color: "#1a472a",
            }}
          >
            {currentQ === QUESTIONS.length - 1 ? "Calculate Score" : "Next"}
          </button>
        </div>
      </div>
    </Shell>
  );
}

/* ─── Shell wrapper ─── */
function Shell({
  children,
  progress,
}: {
  children: React.ReactNode;
  progress: number;
}) {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center overflow-y-auto px-4 sm:px-6"
      style={{
        background:
          "linear-gradient(135deg, #0f2818 0%, #1a472a 50%, #0f2818 100%)",
      }}
    >
      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      {/* Progress bar */}
      <div
        className="fixed top-0 left-0 right-0 h-[3px] z-10"
        style={{ background: "rgba(240, 213, 138, 0.2)" }}
      >
        <div
          className="h-full transition-all duration-300 ease-in-out"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(to right, #F0D58A, #E8C547)",
          }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full max-w-[600px] py-12">
        {/* Logo */}
        <img
          src="/images/logo-CL-Verde-dourado-Gold-claro.png"
          alt="Crown & Legacy Logo"
          className="w-[100px] h-[100px] sm:w-[120px] sm:h-[120px] lg:w-[140px] lg:h-[140px] mb-4 animate-[fadeInScale_300ms_ease-out_both] object-cover rounded-3xl"
          loading="lazy"
        />

        <h1
          className="font-display text-[28px] sm:text-[36px] lg:text-[44px] font-bold text-center tracking-[2px] mb-1 animate-[fadeInUp_300ms_ease-out_100ms_both]"
          style={{ color: "#F0D58A" }}
        >
          Wealth Intelligence Score
        </h1>

        <p
          className="text-sm text-center mb-8 animate-[fadeInUp_300ms_ease-out_200ms_both]"
          style={{ color: "#E8E8E8" }}
        >
          Discover Your Financial Health
        </p>

        {/* Card */}
        <div
          className="relative w-full rounded-xl p-5 sm:p-6 lg:p-7 shadow-[0_8px_32px_rgba(0,0,0,0.3)] animate-[fadeInUp_300ms_ease-out_300ms_both]"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(240, 213, 138, 0.2)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
