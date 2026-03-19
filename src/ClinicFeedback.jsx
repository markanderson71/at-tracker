import { useState, useMemo } from "react";

// ═══════════════════════════════════════════════════════════════════════
// CLINIC FEEDBACK — Participant Form + Assessor Review
// ═══════════════════════════════════════════════════════════════════════
//
// Two modes:
//   1. PARTICIPANT MODE (default) — mobile-friendly feedback form
//      accessed via QR code. No login, no complexity.
//   2. REVIEW MODE — Mark + assessors see all responses, aggregated
//      scores, and can add their own evaluative notes.
//
// Toggle between modes with the lock icon in the header.
// ═══════════════════════════════════════════════════════════════════════

const QUESTIONS = [
  {
    id: "communicate",
    text: "Did the trainer clearly communicate what we were working on and why it mattered?",
    shortLabel: "Clear Communication of LOs",
    gateRef: "CL-G1, CL-G5",
  },
  {
    id: "adapt",
    text: "Did the trainer adapt to what our group needed?",
    shortLabel: "Adapted to Group Needs",
    gateRef: "CL-G3, CL-G7",
  },
  {
    id: "feedback",
    text: "Was the feedback you received helpful and well-timed?",
    shortLabel: "Helpful & Timely Feedback",
    gateRef: "CL-G8",
  },
  {
    id: "safety",
    text: "Did the trainer exude situational awareness and promote an environment that managed physical and emotional risk?",
    shortLabel: "Situational Awareness & Safety",
    gateRef: "SK-G22 (moved to participant feedback)",
  },
];

const SLIDER_LABELS = {
  1: "Not at all",
  5: "Somewhat",
  10: "Absolutely",
};

const uid = () => Math.random().toString(36).slice(2, 9);

// ── QR Code generator (simple SVG-based) ─────────────────────────────
// Uses a basic QR-like visual. In production, you'd use a real QR library.
// For now we show the URL prominently + a placeholder QR pattern.

const QRPlaceholder = ({ url }) => {
  // Generate a deterministic pattern from URL
  const cells = [];
  const size = 21;
  const hash = url.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Position detection patterns (corners)
      const inTL = r < 7 && c < 7;
      const inTR = r < 7 && c >= size - 7;
      const inBL = r >= size - 7 && c < 7;
      const isFinderOuter = (inTL || inTR || inBL) && (r === 0 || r === 6 || c === 0 || c === 6 || (r >= size-7 && r === size-1) || (r >= size-7 && r === size-7) || (c >= size-7 && c === size-1) || (c >= size-7 && c === size-7));
      const isFinderInner = (inTL || inTR || inBL) && r >= 2 && r <= 4 && c >= 2 && c <= 4 && !(inTR && c < size-5) && !(inBL && r < size-5);
      const isFinder = (inTL || inTR || inBL) && (
        r === 0 || r === 6 || c === 0 || c === 6 ||
        (inTR && (c === size-1 || c === size-7)) ||
        (inBL && (r === size-1 || r === size-7)) ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4 && inTL) ||
        (r >= 2 && r <= 4 && c >= size-5 && c <= size-3 && inTR) ||
        (r >= size-5 && r <= size-3 && c >= 2 && c <= 4 && inBL)
      );

      // Data area - pseudo-random based on hash
      const isData = !inTL && !inTR && !inBL && ((hash * (r * size + c + 1)) % 3 === 0);

      if (isFinder || isData) {
        cells.push(
          <rect key={`${r}-${c}`} x={c * 6} y={r * 6} width={6} height={6} fill="currentColor" />
        );
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${size * 6} ${size * 6}`} width="160" height="160" style={{ color: "#1a2332" }}>
      <rect width={size * 6} height={size * 6} fill="#ffffff" rx="4" />
      {cells}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════

export default function ClinicFeedback() {
  const [mode, setMode] = useState("participant"); // participant | review | qr
  const [responses, setResponses] = useState([]);

  // Participant form state
  const [scores, setScores] = useState({});
  const [comment, setComment] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  // Clinic session metadata
  const [clinicInfo, setClinicInfo] = useState({
    date: new Date().toISOString().split("T")[0],
    topic: "",
    location: "",
    audience: "",
  });

  // Assessor notes per response
  const [assessorNotes, setAssessorNotes] = useState({});

  // ── Derived ───────────────────────────────────────────
  const aggregated = useMemo(() => {
    if (responses.length === 0) return null;
    const agg = {};
    QUESTIONS.forEach(q => {
      const vals = responses.map(r => r.scores[q.id]).filter(v => v > 0);
      agg[q.id] = {
        avg: vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—",
        count: vals.length,
        min: vals.length > 0 ? Math.min(...vals) : 0,
        max: vals.length > 0 ? Math.max(...vals) : 0,
        distribution: Array.from({ length: 10 }, (_, i) => vals.filter(v => v === i + 1).length),
      };
    });
    return agg;
  }, [responses]);

  // ── Submit feedback ───────────────────────────────────
  const submitFeedback = () => {
    const response = {
      id: uid(),
      timestamp: new Date().toISOString(),
      name: participantName.trim() || "Anonymous",
      scores: { ...scores },
      comment: comment.trim(),
    };
    setResponses(prev => [...prev, response]);
    setScores({});
    setComment("");
    setParticipantName("");
    setSubmitted(true);
  };

  const resetForm = () => {
    setSubmitted(false);
    setScores({});
    setComment("");
    setParticipantName("");
  };

  // ── Slider component ──────────────────────────────────
  const Slider = ({ questionId, value, onChange }) => {
    const v = value || 0;
    const pct = v > 0 ? ((v - 1) / 9) * 100 : 0;
    return (
      <div>
        <div style={{ position: "relative", padding: "8px 0" }}>
          <input
            type="range"
            min="1"
            max="10"
            value={v || 5}
            onChange={e => onChange(Number(e.target.value))}
            style={{
              width: "100%",
              height: 6,
              appearance: "none",
              WebkitAppearance: "none",
              background: v > 0
                ? `linear-gradient(to right, #3088cc ${pct}%, rgba(255,255,255,0.1) ${pct}%)`
                : "rgba(255,255,255,0.08)",
              borderRadius: 3,
              outline: "none",
              cursor: "pointer",
            }}
          />
          {v > 0 && (
            <div style={{
              position: "absolute", top: -2, left: `calc(${pct}% - 14px)`,
              width: 28, height: 28, borderRadius: "50%",
              background: "linear-gradient(135deg, #3088cc, #2068a8)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 800, color: "#fff",
              boxShadow: "0 2px 8px rgba(48,136,204,0.3)",
              pointerEvents: "none",
            }}>
              {v}
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 2 }}>
          {Object.entries(SLIDER_LABELS).map(([k, label]) => (
            <span key={k} style={{ fontSize: 9, color: "#4a6080" }}>{label}</span>
          ))}
        </div>
      </div>
    );
  };

  // ── Score bar for review mode ─────────────────────────
  const ScoreBar = ({ value, max = 10 }) => {
    const pct = (value / max) * 100;
    const color = value >= 8 ? "#28a858" : value >= 5 ? "#e8a050" : "#cc4040";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.05)", borderRadius: 3, overflow: "hidden" }}>
          <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.3s ease" }} />
        </div>
        <span style={{ fontSize: 13, fontWeight: 800, color, minWidth: 28, textAlign: "right" }}>{value}</span>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div style={{
      fontFamily: "'Outfit', system-ui, sans-serif",
      minHeight: "100vh",
      background: mode === "participant" || mode === "qr"
        ? "linear-gradient(178deg, #0a1220 0%, #0e1a2c 40%, #122240 100%)"
        : "linear-gradient(178deg, #070c18 0%, #0d1828 35%, #101e34 100%)",
      color: "#e0e8f0",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── HEADER ──────────────────────────────── */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        padding: "16px 16px 12px",
        background: "rgba(255,255,255,0.01)",
      }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.03em" }}>
                {mode === "participant" ? "Clinic Feedback" : mode === "qr" ? "Share Feedback Form" : "Feedback Review"}
              </div>
              <div style={{ fontSize: 10, color: "#3d5470", marginTop: 2 }}>
                {mode === "participant" ? "Help your trainer improve — takes 30 seconds" : mode === "qr" ? "Scan or share this link with participants" : `Mark · AT Candidate · ${responses.length} responses`}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {["participant", "review", "qr"].map(m => {
                const labels = { participant: "Form", review: "Review", qr: "QR" };
                const icons = { participant: "📝", review: "📊", qr: "📱" };
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    style={{
                      padding: "5px 10px", borderRadius: 5, fontSize: 10, fontWeight: 600,
                      border: mode === m ? "1.5px solid rgba(48,136,204,0.4)" : "1.5px solid rgba(255,255,255,0.06)",
                      background: mode === m ? "rgba(48,136,204,0.1)" : "rgba(255,255,255,0.015)",
                      color: mode === m ? "#5ab0e0" : "#3d5470",
                      cursor: "pointer",
                    }}
                  >
                    {icons[m]} {labels[m]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────── */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "16px 16px 60px" }}>

        {/* ═══ QR CODE MODE ═══ */}
        {mode === "qr" && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{
              display: "inline-block", padding: 16, background: "#fff", borderRadius: 12,
              marginBottom: 16, boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            }}>
              <QRPlaceholder url={typeof window !== "undefined" ? window.location.href : "https://your-app-url.vercel.app"} />
            </div>
            <div style={{ fontSize: 12, color: "#6a8098", marginBottom: 16, lineHeight: 1.5 }}>
              In production, this QR code will link directly to the feedback form.
              <br />Share this URL with your clinic participants:
            </div>
            <div style={{
              padding: "12px 16px", background: "rgba(48,136,204,0.08)",
              border: "1px solid rgba(48,136,204,0.2)", borderRadius: 8,
              fontSize: 13, color: "#5ab0e0", fontWeight: 600, wordBreak: "break-all",
              marginBottom: 20,
            }}>
              {typeof window !== "undefined" ? window.location.href : "https://your-app-url.vercel.app"}
            </div>

            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 11, color: "#4a6080", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                Clinic Session Info
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div>
                  <label style={{ fontSize: 10, color: "#4a6080", fontWeight: 600, display: "block", marginBottom: 3 }}>Date</label>
                  <input type="date" value={clinicInfo.date} onChange={e => setClinicInfo(p => ({ ...p, date: e.target.value }))}
                    style={{ width: "100%", padding: "7px 10px", fontSize: 12, color: "#e0e8f0", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#4a6080", fontWeight: 600, display: "block", marginBottom: 3 }}>Location</label>
                  <input value={clinicInfo.location} onChange={e => setClinicInfo(p => ({ ...p, location: e.target.value }))} placeholder="e.g. Keystone — Top of 6"
                    style={{ width: "100%", padding: "7px 10px", fontSize: 12, color: "#e0e8f0", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 10, color: "#4a6080", fontWeight: 600, display: "block", marginBottom: 3 }}>Clinic Topic</label>
                  <input value={clinicInfo.topic} onChange={e => setClinicInfo(p => ({ ...p, topic: e.target.value }))} placeholder="e.g. Dynamic Short Turns"
                    style={{ width: "100%", padding: "7px 10px", fontSize: 12, color: "#e0e8f0", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ fontSize: 10, color: "#4a6080", fontWeight: 600, display: "block", marginBottom: 3 }}>Audience</label>
                  <input value={clinicInfo.audience} onChange={e => setClinicInfo(p => ({ ...p, audience: e.target.value }))} placeholder="e.g. L2 Candidates"
                    style={{ width: "100%", padding: "7px 10px", fontSize: 12, color: "#e0e8f0", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ PARTICIPANT MODE ═══ */}
        {mode === "participant" && !submitted && (
          <div>
            {/* Clinic context banner */}
            {(clinicInfo.topic || clinicInfo.location) && (
              <div style={{
                padding: "10px 14px", marginBottom: 16, borderRadius: 8,
                background: "rgba(48,136,204,0.06)", border: "1px solid rgba(48,136,204,0.12)",
                fontSize: 12, color: "#5ab0e0",
              }}>
                {clinicInfo.topic && <span style={{ fontWeight: 700 }}>{clinicInfo.topic}</span>}
                {clinicInfo.topic && clinicInfo.location && " · "}
                {clinicInfo.location && <span>{clinicInfo.location}</span>}
                {clinicInfo.audience && <span style={{ color: "#4a6080" }}> · {clinicInfo.audience}</span>}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, color: "#4a6080", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>
                Your Name (optional)
              </label>
              <input
                value={participantName}
                onChange={e => setParticipantName(e.target.value)}
                placeholder="Anonymous is fine"
                style={{
                  width: "100%", padding: "10px 12px", fontSize: 14, color: "#e0e8f0",
                  background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                }}
              />
            </div>

            {QUESTIONS.map((q, qi) => (
              <div key={q.id} style={{
                marginBottom: 20, padding: "16px",
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                borderRadius: 10,
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#d0d8e0", marginBottom: 12, lineHeight: 1.45 }}>
                  {q.text}
                </div>
                <Slider
                  questionId={q.id}
                  value={scores[q.id]}
                  onChange={v => setScores(prev => ({ ...prev, [q.id]: v }))}
                />
              </div>
            ))}

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, color: "#4a6080", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>
                Anything else you'd like to share?
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="What worked well? What could be better? Any specific moments that stood out?"
                style={{
                  width: "100%", minHeight: 80, padding: "12px", fontSize: 13, color: "#e0e8f0",
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                  borderRadius: 8, outline: "none", fontFamily: "inherit", resize: "vertical",
                  lineHeight: 1.55, boxSizing: "border-box",
                }}
              />
            </div>

            <button
              onClick={submitFeedback}
              disabled={Object.keys(scores).length === 0}
              style={{
                width: "100%", padding: "14px", borderRadius: 8, border: "none",
                background: Object.keys(scores).length > 0
                  ? "linear-gradient(135deg, #3088cc, #2068a8)"
                  : "rgba(255,255,255,0.05)",
                color: Object.keys(scores).length > 0 ? "#fff" : "#3d5470",
                fontSize: 15, fontWeight: 700, cursor: Object.keys(scores).length > 0 ? "pointer" : "default",
                letterSpacing: "0.01em",
              }}
            >
              Submit Feedback
            </button>
          </div>
        )}

        {/* ═══ SUBMITTED CONFIRMATION ═══ */}
        {mode === "participant" && submitted && (
          <div style={{ textAlign: "center", padding: "60px 20px" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>⛷</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#d0d8e0", marginBottom: 6 }}>Thank you!</div>
            <div style={{ fontSize: 13, color: "#6a8098", lineHeight: 1.5, marginBottom: 24 }}>
              Your feedback helps your trainer develop and improve.
              <br />Have a great day on the mountain.
            </div>
            <button
              onClick={resetForm}
              style={{
                padding: "10px 24px", borderRadius: 7, border: "1px solid rgba(48,136,204,0.3)",
                background: "rgba(48,136,204,0.1)", color: "#5ab0e0",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              Submit Another Response
            </button>
          </div>
        )}

        {/* ═══ REVIEW MODE ═══ */}
        {mode === "review" && (
          <div>
            {/* Clinic info summary */}
            {(clinicInfo.topic || clinicInfo.date) && (
              <div style={{
                padding: "10px 14px", marginBottom: 16, borderRadius: 8,
                background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12,
              }}>
                {clinicInfo.date && <div><span style={{ color: "#4a6080" }}>Date:</span> <span style={{ color: "#a0b0c0" }}>{clinicInfo.date}</span></div>}
                {clinicInfo.topic && <div><span style={{ color: "#4a6080" }}>Topic:</span> <span style={{ color: "#a0b0c0" }}>{clinicInfo.topic}</span></div>}
                {clinicInfo.location && <div><span style={{ color: "#4a6080" }}>Location:</span> <span style={{ color: "#a0b0c0" }}>{clinicInfo.location}</span></div>}
                {clinicInfo.audience && <div><span style={{ color: "#4a6080" }}>Audience:</span> <span style={{ color: "#a0b0c0" }}>{clinicInfo.audience}</span></div>}
              </div>
            )}

            {responses.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#2a3c50" }}>
                <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>📊</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#4a6080" }}>No responses yet</div>
                <div style={{ fontSize: 12, color: "#2a3c50", marginTop: 4 }}>Share the QR code with clinic participants to start collecting feedback.</div>
              </div>
            ) : (
              <>
                {/* ── Aggregated Scores ────────────────── */}
                <div style={{ marginBottom: 24 }}>
                  <div style={{
                    fontSize: 11, color: "#4a6080", fontWeight: 700, textTransform: "uppercase",
                    letterSpacing: "0.07em", marginBottom: 10,
                  }}>
                    Aggregated Scores — {responses.length} response{responses.length !== 1 ? "s" : ""}
                  </div>

                  {QUESTIONS.map(q => {
                    const a = aggregated[q.id];
                    return (
                      <div key={q.id} style={{
                        padding: "14px 16px", marginBottom: 8, borderRadius: 8,
                        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#c0ccd8" }}>{q.shortLabel}</span>
                          <span style={{ fontSize: 9, color: "#3d5470" }}>{q.gateRef}</span>
                        </div>
                        <ScoreBar value={Number(a.avg) || 0} />
                        <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 10, color: "#506880" }}>
                          <span>Avg: <strong style={{ color: "#a0b0c0" }}>{a.avg}</strong></span>
                          <span>Min: <strong style={{ color: "#a0b0c0" }}>{a.min || "—"}</strong></span>
                          <span>Max: <strong style={{ color: "#a0b0c0" }}>{a.max || "—"}</strong></span>
                          <span>n={a.count}</span>
                        </div>
                        {/* Mini distribution */}
                        <div style={{ display: "flex", gap: 2, marginTop: 6, height: 20, alignItems: "flex-end" }}>
                          {a.distribution.map((count, i) => (
                            <div key={i} style={{
                              flex: 1, minHeight: 2, borderRadius: 1,
                              height: count > 0 ? `${Math.max(20, (count / Math.max(...a.distribution)) * 100)}%` : 2,
                              background: count > 0
                                ? i >= 7 ? "rgba(40,168,88,0.4)" : i >= 4 ? "rgba(232,160,80,0.3)" : "rgba(200,60,60,0.3)"
                                : "rgba(255,255,255,0.03)",
                              transition: "height 0.3s ease",
                            }} title={`${i+1}: ${count} responses`} />
                          ))}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: "#3d5470", marginTop: 2 }}>
                          <span>1</span><span>5</span><span>10</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ── Individual Responses ──────────────── */}
                <div style={{
                  fontSize: 11, color: "#4a6080", fontWeight: 700, textTransform: "uppercase",
                  letterSpacing: "0.07em", marginBottom: 10,
                }}>
                  Individual Responses
                </div>

                {responses.map((r, ri) => (
                  <div key={r.id} style={{
                    padding: "14px 16px", marginBottom: 8, borderRadius: 8,
                    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#a0b0c0" }}>{r.name}</span>
                        <span style={{ fontSize: 10, color: "#3d5470", marginLeft: 8 }}>
                          {new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 3 }}>
                        {QUESTIONS.map(q => {
                          const v = r.scores[q.id];
                          const color = v >= 8 ? "#28a858" : v >= 5 ? "#e8a050" : v > 0 ? "#cc4040" : "#2a3c50";
                          return (
                            <div key={q.id} title={q.shortLabel} style={{
                              width: 22, height: 18, borderRadius: 3,
                              background: v > 0 ? `${color}18` : "rgba(255,255,255,0.02)",
                              border: `1px solid ${v > 0 ? `${color}35` : "rgba(255,255,255,0.04)"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 10, fontWeight: 800, color,
                            }}>
                              {v || "—"}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {r.comment && (
                      <div style={{
                        fontSize: 12, color: "#8898a8", lineHeight: 1.5,
                        padding: "8px 10px", background: "rgba(255,255,255,0.015)",
                        borderRadius: 6, marginBottom: 10, fontStyle: "italic",
                      }}>
                        "{r.comment}"
                      </div>
                    )}

                    {/* Assessor notes */}
                    <div>
                      <label style={{ fontSize: 9, color: "#4a6080", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 3 }}>
                        Assessor / Candidate Notes
                      </label>
                      <textarea
                        value={assessorNotes[r.id] || ""}
                        onChange={ev => setAssessorNotes(prev => ({ ...prev, [r.id]: ev.target.value }))}
                        placeholder="How does this feedback inform your CL development? What does it tell you about your clinic leading?"
                        style={{
                          width: "100%", minHeight: 40, padding: "7px 10px", fontSize: 11, color: "#c0ccd8",
                          background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                          borderRadius: 6, outline: "none", fontFamily: "inherit", resize: "vertical",
                          lineHeight: 1.5, boxSizing: "border-box",
                        }}
                      />
                    </div>
                  </div>
                ))}

                {/* ── Overall Assessor Evaluation ──────── */}
                <div style={{
                  marginTop: 16, padding: "16px",
                  background: "rgba(40,168,88,0.03)", border: "1px solid rgba(40,168,88,0.1)",
                  borderRadius: 10,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "#28a858", marginBottom: 10 }}>
                    Overall Clinic Evaluation — Assessor / Candidate
                  </div>
                  <textarea
                    value={assessorNotes._overall || ""}
                    onChange={ev => setAssessorNotes(prev => ({ ...prev, _overall: ev.target.value }))}
                    placeholder="Summarize what the participant feedback reveals about clinic leading performance. Which CL gates does this evidence support? What should change for the next clinic?"
                    style={{
                      width: "100%", minHeight: 70, padding: "10px 12px", fontSize: 12, color: "#c0ccd8",
                      background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                      borderRadius: 8, outline: "none", fontFamily: "inherit", resize: "vertical",
                      lineHeight: 1.55, boxSizing: "border-box",
                    }}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 24px; height: 24px; border-radius: 50%;
          background: linear-gradient(135deg, #3088cc, #2068a8);
          border: 2px solid rgba(255,255,255,0.2);
          cursor: pointer; box-shadow: 0 2px 8px rgba(48,136,204,0.3);
          margin-top: -9px;
        }
        input[type="range"]::-moz-range-thumb {
          width: 24px; height: 24px; border-radius: 50%;
          background: linear-gradient(135deg, #3088cc, #2068a8);
          border: 2px solid rgba(255,255,255,0.2);
          cursor: pointer; box-shadow: 0 2px 8px rgba(48,136,204,0.3);
        }
        input:focus, textarea:focus {
          border-color: rgba(48,136,204,0.35) !important;
          box-shadow: 0 0 0 2px rgba(48,136,204,0.06);
        }
        select { appearance: auto; }
      `}</style>
    </div>
  );
}
