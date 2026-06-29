import { useState, useEffect, useRef, useCallback } from "react";

const SYSTEM_PROMPT = `You are an expert AI autocorrect and writing assistant engine. Analyze the given text and return ONLY a valid JSON object with this exact structure:

{
  "corrected": "the fully corrected text with all fixes applied",
  "errors": [
    {
      "type": "spelling|grammar|punctuation|style|context",
      "original": "the wrong word or phrase",
      "suggestion": "the corrected word or phrase",
      "explanation": "brief reason for correction (under 10 words)"
    }
  ],
  "fluency_score": 85,
  "tone": "formal|casual|neutral|technical",
  "word_count": 12,
  "improvements": ["Short tip 1", "Short tip 2"]
}

Rules:
- fluency_score is 0-100 (100 = perfect)
- Only flag real errors, do not over-correct
- Keep corrections minimal and contextual
- improvements array should have 1-3 actionable tips
- Return ONLY the JSON object, no markdown, no explanation`;

async function analyzeText(text) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Analyze this text:\n\n"${text}"` }],
    }),
  });
  const data = await response.json();
  const raw = data.content?.map((i) => i.text || "").join("") || "{}";
  const clean = raw.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

const ERROR_COLORS = {
  spelling: { bg: "#fef2f2", border: "#fca5a5", badge: "#ef4444", text: "#991b1b" },
  grammar: { bg: "#fffbeb", border: "#fcd34d", badge: "#f59e0b", text: "#92400e" },
  punctuation: { bg: "#f0fdf4", border: "#86efac", badge: "#22c55e", text: "#166534" },
  style: { bg: "#faf5ff", border: "#d8b4fe", badge: "#a855f7", text: "#6b21a8" },
  context: { bg: "#eff6ff", border: "#93c5fd", badge: "#3b82f6", text: "#1e40af" },
};

const SCORE_COLOR = (s) =>
  s >= 85 ? "#22c55e" : s >= 65 ? "#f59e0b" : "#ef4444";

const SCORE_LABEL = (s) =>
  s >= 85 ? "Excellent" : s >= 65 ? "Good" : s >= 45 ? "Fair" : "Needs Work";

const EXAMPLES = [
  "i went to the store yestarday and buyed some apple's and orange's. their was a sale.",
  "She dont know nothing about the situation, its very frustrating for everyone involve.",
  "The meeting will be hold tommorow at 3pm, please insure you attend it on time.",
];

export default function AutocorrectTool() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("corrected");
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const debounceRef = useRef(null);
  const textareaRef = useRef(null);

  const analyze = useCallback(async (text) => {
    if (!text.trim() || text.trim().split(/\s+/).length < 3) return;
    setLoading(true);
    setError("");
    try {
      const res = await analyzeText(text);
      setResult(res);
      setHistory((h) => [{ text, result: res, ts: Date.now() }, ...h.slice(0, 9)]);
    } catch (e) {
      setError("Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (input.trim().split(/\s+/).length >= 3) {
      debounceRef.current = setTimeout(() => analyze(input), 1400);
    } else {
      setResult(null);
    }
    return () => clearTimeout(debounceRef.current);
  }, [input, analyze]);

  const handleCopy = () => {
    navigator.clipboard.writeText(result?.corrected || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (result?.corrected) {
      setInput(result.corrected);
      setResult(null);
      textareaRef.current?.focus();
    }
  };

  const loadExample = (ex) => {
    setInput(ex);
    setResult(null);
  };

  const score = result?.fluency_score ?? null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      padding: "24px 16px",
      color: "#f1f5f9",
    }}>
      {/* Header */}
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 10,
            background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.4)",
            borderRadius: 40, padding: "6px 18px", marginBottom: 16,
            fontSize: 13, color: "#c4b5fd", fontWeight: 600, letterSpacing: "0.05em"
          }}>
            <span style={{ fontSize: 16 }}>✦</span> AI-POWERED
          </div>
          <h1 style={{
            fontSize: "clamp(28px, 5vw, 48px)", fontWeight: 800,
            background: "linear-gradient(90deg, #a78bfa, #60a5fa, #34d399)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            margin: "0 0 10px", lineHeight: 1.15
          }}>
            AutoCorrect Intelligence
          </h1>
          <p style={{ color: "#94a3b8", fontSize: 16, margin: 0 }}>
            Real-time spelling, grammar, style & fluency correction
          </p>
        </div>

        {/* Example Prompts */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 12, color: "#64748b", marginBottom: 8, fontWeight: 600, letterSpacing: "0.08em" }}>
            TRY AN EXAMPLE
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => loadExample(ex)} style={{
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, padding: "6px 12px", color: "#94a3b8", fontSize: 12,
                cursor: "pointer", transition: "all 0.2s", maxWidth: 260,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
              }}
                onMouseEnter={e => { e.target.style.background = "rgba(139,92,246,0.2)"; e.target.style.color = "#c4b5fd"; }}
                onMouseLeave={e => { e.target.style.background = "rgba(255,255,255,0.05)"; e.target.style.color = "#94a3b8"; }}
              >
                Example {i + 1}: {ex.slice(0, 40)}…
              </button>
            ))}
          </div>
        </div>

        {/* Main Input Card */}
        <div style={{
          background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20,
          padding: 24, marginBottom: 20,
          boxShadow: "0 25px 50px rgba(0,0,0,0.4)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#64748b", letterSpacing: "0.06em" }}>
              INPUT TEXT
            </span>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {input && (
                <span style={{ fontSize: 12, color: "#64748b" }}>
                  {input.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              )}
              {input && (
                <button onClick={() => { setInput(""); setResult(null); }} style={{
                  background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)",
                  color: "#f87171", borderRadius: 6, padding: "3px 10px", fontSize: 12, cursor: "pointer"
                }}>Clear</button>
              )}
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Start typing your text here... (auto-analyzes after you pause)"
            style={{
              width: "100%", minHeight: 140, background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12,
              color: "#f1f5f9", fontSize: 16, lineHeight: 1.7, padding: "14px 16px",
              resize: "vertical", outline: "none", boxSizing: "border-box",
              fontFamily: "inherit", transition: "border 0.2s"
            }}
            onFocus={e => e.target.style.borderColor = "rgba(139,92,246,0.5)"}
            onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
          />

          {/* Status bar */}
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, minHeight: 24 }}>
            {loading && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#a78bfa", fontSize: 13 }}>
                <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span>
                Analyzing with AI…
              </div>
            )}
            {!loading && input && input.trim().split(/\s+/).length < 3 && (
              <span style={{ fontSize: 13, color: "#64748b" }}>Type at least 3 words to analyze</span>
            )}
            {error && <span style={{ fontSize: 13, color: "#f87171" }}>⚠ {error}</span>}
          </div>
        </div>

        {/* Results Section */}
        {result && (
          <div style={{
            background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20,
            overflow: "hidden", boxShadow: "0 25px 50px rgba(0,0,0,0.4)"
          }}>
            {/* Score Bar */}
            <div style={{
              background: "linear-gradient(90deg, rgba(139,92,246,0.2), rgba(59,130,246,0.2))",
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              padding: "16px 24px",
              display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center"
            }}>
              {/* Fluency Score */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative", width: 56, height: 56 }}>
                  <svg viewBox="0 0 56 56" width="56" height="56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                    <circle cx="28" cy="28" r="24" fill="none"
                      stroke={SCORE_COLOR(score)} strokeWidth="5"
                      strokeDasharray={`${(score / 100) * 150.8} 150.8`}
                      strokeLinecap="round"
                      transform="rotate(-90 28 28)"
                      style={{ transition: "stroke-dasharray 1s ease" }}
                    />
                  </svg>
                  <div style={{
                    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                    fontSize: 13, fontWeight: 800, color: SCORE_COLOR(score)
                  }}>{score}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: "#64748b", fontWeight: 600, letterSpacing: "0.08em" }}>FLUENCY</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: SCORE_COLOR(score) }}>{SCORE_LABEL(score)}</div>
                </div>
              </div>

              {/* Stats */}
              {[
                { label: "ERRORS", value: result.errors?.length ?? 0, color: result.errors?.length ? "#f87171" : "#34d399" },
                { label: "WORDS", value: result.word_count ?? "—", color: "#60a5fa" },
                { label: "TONE", value: result.tone ?? "—", color: "#a78bfa" },
              ].map(({ label, value, color }) => (
                <div key={label} style={{
                  background: "rgba(0,0,0,0.2)", borderRadius: 10, padding: "8px 16px", textAlign: "center"
                }}>
                  <div style={{ fontSize: 10, color: "#64748b", fontWeight: 700, letterSpacing: "0.1em" }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color, textTransform: "capitalize" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{
              display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(0,0,0,0.2)"
            }}>
              {["corrected", "errors", "tips"].map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  padding: "12px 20px", border: "none", background: "none",
                  color: activeTab === tab ? "#a78bfa" : "#64748b",
                  fontWeight: activeTab === tab ? 700 : 500,
                  fontSize: 13, cursor: "pointer", letterSpacing: "0.05em",
                  borderBottom: activeTab === tab ? "2px solid #a78bfa" : "2px solid transparent",
                  transition: "all 0.2s", textTransform: "capitalize"
                }}>
                  {tab === "errors" ? `Errors (${result.errors?.length ?? 0})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div style={{ padding: 24 }}>
              {/* Corrected Text Tab */}
              {activeTab === "corrected" && (
                <div>
                  <div style={{
                    background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)",
                    borderRadius: 12, padding: 18, fontSize: 16, lineHeight: 1.8,
                    color: "#f1f5f9", marginBottom: 16
                  }}>
                    {result.corrected || input}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={handleCopy} style={{
                      background: "rgba(139,92,246,0.2)", border: "1px solid rgba(139,92,246,0.4)",
                      color: "#c4b5fd", borderRadius: 8, padding: "8px 18px",
                      fontSize: 13, cursor: "pointer", fontWeight: 600, transition: "all 0.2s"
                    }}>
                      {copied ? "✓ Copied!" : "Copy Text"}
                    </button>
                    <button onClick={handleApply} style={{
                      background: "linear-gradient(90deg, #7c3aed, #2563eb)",
                      border: "none", color: "#fff", borderRadius: 8, padding: "8px 18px",
                      fontSize: 13, cursor: "pointer", fontWeight: 600
                    }}>
                      Apply Correction →
                    </button>
                  </div>
                </div>
              )}

              {/* Errors Tab */}
              {activeTab === "errors" && (
                <div>
                  {result.errors?.length === 0 ? (
                    <div style={{
                      textAlign: "center", padding: "32px 0",
                      color: "#34d399", fontSize: 16
                    }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>✓</div>
                      No errors detected! Your text looks great.
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {result.errors?.map((err, i) => {
                        const c = ERROR_COLORS[err.type] || ERROR_COLORS.spelling;
                        return (
                          <div key={i} style={{
                            background: c.bg.replace(")", ", 0.12)").replace("rgb", "rgba"),
                            border: `1px solid ${c.border}44`,
                            borderRadius: 10, padding: "12px 16px",
                            display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-start"
                          }}>
                            <span style={{
                              background: c.badge, color: "#fff",
                              borderRadius: 5, padding: "2px 8px", fontSize: 10,
                              fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                              whiteSpace: "nowrap", alignSelf: "center"
                            }}>{err.type}</span>
                            <div style={{ flex: 1, minWidth: 160 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                <span style={{
                                  textDecoration: "line-through", color: "#ef4444",
                                  fontWeight: 600, fontSize: 14
                                }}>{err.original}</span>
                                <span style={{ color: "#64748b" }}>→</span>
                                <span style={{ color: "#34d399", fontWeight: 700, fontSize: 14 }}>{err.suggestion}</span>
                              </div>
                              <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{err.explanation}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tips Tab */}
              {activeTab === "tips" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {result.improvements?.length === 0 ? (
                    <p style={{ color: "#64748b" }}>No additional tips — great writing!</p>
                  ) : (
                    result.improvements?.map((tip, i) => (
                      <div key={i} style={{
                        background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)",
                        borderRadius: 10, padding: "12px 16px",
                        display: "flex", gap: 12, alignItems: "flex-start"
                      }}>
                        <span style={{
                          background: "linear-gradient(135deg,#7c3aed,#2563eb)",
                          color: "#fff", borderRadius: 6, width: 22, height: 22,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 800, flexShrink: 0, marginTop: 1
                        }}>{i + 1}</span>
                        <p style={{ margin: 0, color: "#c4b5fd", fontSize: 14, lineHeight: 1.6 }}>{tip}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <button onClick={() => setShowHistory(!showHistory)} style={{
              background: "none", border: "1px solid rgba(255,255,255,0.1)",
              color: "#64748b", borderRadius: 8, padding: "6px 14px", fontSize: 12,
              cursor: "pointer", fontWeight: 600
            }}>
              {showHistory ? "▲ Hide" : "▼ Show"} History ({history.length})
            </button>
            {showHistory && (
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                {history.map((h, i) => (
                  <div key={i} onClick={() => { setInput(h.text); setResult(h.result); }}
                    style={{
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                      borderRadius: 10, padding: "10px 14px", cursor: "pointer",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      transition: "background 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(139,92,246,0.1)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  >
                    <span style={{ fontSize: 13, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "75%" }}>
                      {h.text.slice(0, 80)}{h.text.length > 80 ? "…" : ""}
                    </span>
                    <span style={{
                      fontSize: 12, fontWeight: 700, color: SCORE_COLOR(h.result.fluency_score),
                      background: "rgba(0,0,0,0.3)", borderRadius: 5, padding: "2px 8px"
                    }}>
                      {h.result.fluency_score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: "center", color: "#334155", fontSize: 12, marginTop: 32 }}>
          Powered by Claude · Context-aware correction · Personalized analysis
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        textarea::placeholder { color: #475569; }
      `}</style>
    </div>
  );
}
