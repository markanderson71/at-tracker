import { useState, useMemo, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════════
// CLINIC FEEDBACK — Anonymous participant feedback for Mark's clinics
//
// PARTICIPANT VIEW: form → thank you (no access to other responses)
// TRAINER VIEW: setup session → QR code (accessed via "I'm the trainer" link)
// REVIEW: only in main tracker app (not here)
// ═══════════════════════════════════════════════════════════════════════

const QUESTIONS = [
  { id: "communication", text: "Was it clear what we were working on today and why?", shortLabel: "Clear Communication", gateRef: "CL-G1, CL-G5" },
  { id: "adapt", text: "Did the trainer adjust the session to fit what our group needed?", shortLabel: "Adapted to Group", gateRef: "CL-G3, CL-G7" },
  { id: "feedback_quality", text: "Was the feedback you received useful and easy to apply?", shortLabel: "Useful Feedback", gateRef: "CL-G8" },
  { id: "safety", text: "Did you feel safe — both physically on the mountain and comfortable asking questions?", shortLabel: "Safety & Comfort", gateRef: "CL-G6, CL-G11" },
  { id: "engagement", text: "Did the trainer encourage everyone to participate and share their thoughts?", shortLabel: "Group Participation", gateRef: "CL-G5, CL-G11" },
  { id: "learning", text: "Do you feel you improved or learned something valuable today?", shortLabel: "I Learned Something", gateRef: "CL-G1, CL-G4, CL-G9" },
];

const SLIDER_LABELS = { 1: "Not at all", 3: "A little", 5: "Somewhat", 7: "Mostly", 10: "Absolutely" };
const uid = () => Math.random().toString(36).slice(2, 9);

function getApiUrl() {
  return (typeof window !== "undefined" && window.__AT_API_URL__) || "";
}

async function saveFeedback(data) {
  const url = getApiUrl();
  if (!url) { console.log("No API — feedback not persisted"); return; }
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ ...data, _action: "create", _sheet: "ClinicFeedback" }),
    });
  } catch (e) { console.error("Save feedback error:", e); }
}

async function loadSessionConfig() {
  const url = getApiUrl();
  if (!url) return null;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ _action: "getAll", _sheet: "ClinicFeedback" }),
    });
    const data = await res.json();
    const rows = data.rows || [];
    const configRow = rows.find(r => r.id === "_SESSION_CONFIG");
    if (configRow && configRow.data) {
      try { return JSON.parse(configRow.data); } catch(e) {}
    }
    return null;
  } catch (e) { return null; }
}

async function saveSessionConfig(config) {
  const url = getApiUrl();
  if (!url) return;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ id: "_SESSION_CONFIG", data: JSON.stringify(config), _action: "update", _sheet: "ClinicFeedback" }),
    });
  } catch (e) { console.error("Save session config error:", e); }
}

// QR Code
const QRCode = ({ url }) => {
  const cells = [];
  const size = 25;
  const hash = url.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const inTL = r < 7 && c < 7;
      const inTR = r < 7 && c >= size - 7;
      const inBL = r >= size - 7 && c < 7;
      const isFinder = (inTL || inTR || inBL) && (
        r === 0 || r === 6 || c === 0 || c === 6 ||
        (inTR && (c === size - 1 || c === size - 7)) ||
        (inBL && (r === size - 1 || r === size - 7)) ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4 && inTL) ||
        (r >= 2 && r <= 4 && c >= size - 5 && c <= size - 3 && inTR) ||
        (r >= size - 5 && r <= size - 3 && c >= 2 && c <= 4 && inBL)
      );
      const isData = !inTL && !inTR && !inBL && ((hash * (r * size + c + 1)) % 3 === 0);
      if (isFinder || isData) {
        cells.push(<rect key={`${r}-${c}`} x={c * 5} y={r * 5} width={5} height={5} fill="currentColor" />);
      }
    }
  }
  return (
    <svg viewBox={`0 0 ${size * 5} ${size * 5}`} width="180" height="180" style={{ color: "#1a2332" }}>
      <rect width={size * 5} height={size * 5} fill="#ffffff" rx="4" />
      {cells}
    </svg>
  );
};

// ═══════════════════════════════════════════════════════════════════════
export default function ClinicFeedback() {
  const [mode, setMode] = useState("loading"); // loading | participant | thankyou | setup | qr
  const [scores, setScores] = useState({});
  const [comments, setComments] = useState({});
  const [goalComment, setGoalComment] = useState("");
  const [goalMet, setGoalMet] = useState(null);
  const [generalComment, setGeneralComment] = useState("");
  const [participantName, setParticipantName] = useState("");
  const [saving, setSaving] = useState(false);

  const [session, setSession] = useState({
    date: new Date().toISOString().split("T")[0],
    topic: "", goal: "", location: "", trainerName: "Mark",
  });
  const [sessionReady, setSessionReady] = useState(false);

  // Load session config on mount
  useEffect(() => {
    loadSessionConfig().then(config => {
      if (config && config.topic) {
        setSession(config);
        setSessionReady(true);
        setMode("participant");
      } else {
        setMode("participant");
      }
    });
  }, []);

  const submitFeedback = async () => {
    const hasAnyScore = Object.values(scores).some(v => v > 0);
    if (!hasAnyScore) return;
    setSaving(true);
    const row = {
      id: uid(),
      timestamp: new Date().toISOString(),
      name: participantName.trim() || "Anonymous",
      scores: JSON.stringify(scores),
      comments: JSON.stringify(comments),
      goalMet: goalMet || "",
      goalComment: goalComment.trim(),
      generalComment: generalComment.trim(),
      sessionTopic: session.topic,
      sessionGoal: session.goal,
      sessionDate: session.date,
    };
    await saveFeedback(row);
    setSaving(false);
    setMode("thankyou");
  };

  const resetForm = () => {
    setMode("participant");
    setScores({}); setComments({}); setGeneralComment("");
    setGoalComment(""); setGoalMet(null); setParticipantName("");
  };

  const startSession = async () => {
    if (!session.topic.trim()) return;
    setSessionReady(true);
    await saveSessionConfig(session);
    setMode("qr");
  };

  const feedbackUrl = typeof window !== "undefined" ? window.location.href.split("?")[0] : "/feedback";

  const Card = ({ children, style = {} }) => (
    <div style={{
      background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: 12, padding: "18px 16px", marginBottom: 12, ...style,
    }}>{children}</div>
  );

  const inp = {
    padding: "8px 12px", fontSize: 14, color: "#c0ccd8",
    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 6, outline: "none", fontFamily: "inherit", boxSizing: "border-box", width: "100%",
  };

  if (mode === "loading") {
    return (
      <div style={{ fontFamily: "'Outfit', system-ui, sans-serif", minHeight: "100vh",
        background: "linear-gradient(178deg, #070c18 0%, #0d1828 35%, #101e34 100%)",
        display: "flex", alignItems: "center", justifyContent: "center", color: "#7a9ab5" }}>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        Loading...
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: "'Outfit', system-ui, sans-serif", minHeight: "100vh",
      background: "linear-gradient(178deg, #070c18 0%, #0d1828 35%, #101e34 100%)",
      color: "#e0e8f0",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "20px 16px 60px" }}>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#e8a050", letterSpacing: "-0.03em" }}>⛷ Clinic Feedback</div>
          {sessionReady && (
            <div style={{ fontSize: 13, color: "#7a9ab5", marginTop: 4 }}>
              {session.trainerName} · {session.date}{session.location ? ` · ${session.location}` : ""}
            </div>
          )}
          {(mode === "setup" || mode === "qr") && (
            <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 12 }}>
              {[{ id: "setup", label: "Setup" }, { id: "qr", label: "QR Code" }].map(t => (
                <button key={t.id} onClick={() => setMode(t.id)} style={{
                  padding: "5px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  border: mode === t.id ? "1.5px solid rgba(224,120,48,0.45)" : "1.5px solid rgba(255,255,255,0.07)",
                  background: mode === t.id ? "rgba(224,120,48,0.1)" : "rgba(255,255,255,0.015)",
                  color: mode === t.id ? "#e8a050" : "#7a9ab5",
                }}>{t.label}</button>
              ))}
              <button onClick={() => setMode("participant")} style={{
                padding: "5px 12px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                border: "1.5px solid rgba(255,255,255,0.07)",
                background: "rgba(255,255,255,0.015)", color: "#7a9ab5",
              }}>Preview Form</button>
            </div>
          )}
        </div>

        {/* ═══ SETUP ═══ */}
        {mode === "setup" && (
          <Card style={{ borderLeft: "3px solid #e07830" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e8a050", marginBottom: 4 }}>Set Up Your Clinic</div>
            <div style={{ fontSize: 13, color: "#7a9ab5", marginBottom: 16, lineHeight: 1.5 }}>
              Fill this out before sharing the QR code. Participants will see the topic and goal.
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: "#7a9ab5", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>Your Name</label>
              <input value={session.trainerName} onChange={e => setSession(p => ({ ...p, trainerName: e.target.value }))} style={inp} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: "#7a9ab5", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>Date</label>
                <input type="date" value={session.date} onChange={e => setSession(p => ({ ...p, date: e.target.value }))} style={inp} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: "#7a9ab5", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>Location</label>
                <input value={session.location} onChange={e => setSession(p => ({ ...p, location: e.target.value }))} placeholder="e.g., Keystone" style={inp} />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: "#7a9ab5", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>What was today's session about?</label>
              <input value={session.topic} onChange={e => setSession(p => ({ ...p, topic: e.target.value }))} placeholder="e.g., Improving your short turns in bumps" style={{ ...inp, fontSize: 15 }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: "#7a9ab5", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>What should participants have learned?</label>
              <textarea value={session.goal} onChange={e => setSession(p => ({ ...p, goal: e.target.value }))}
                placeholder="e.g., By the end you should feel more confident linking short turns through moguls..."
                style={{ ...inp, minHeight: 70, resize: "vertical", lineHeight: 1.5 }} />
              <div style={{ fontSize: 11, color: "#4d6888", marginTop: 3 }}>Plain language — no jargon.</div>
            </div>
            <button onClick={startSession} disabled={!session.topic.trim()} style={{
              width: "100%", padding: "12px", borderRadius: 8, border: "none",
              background: session.topic.trim() ? "linear-gradient(135deg, #e07830, #c06020)" : "rgba(255,255,255,0.05)",
              color: session.topic.trim() ? "#fff" : "#4d6888",
              fontSize: 15, fontWeight: 700, cursor: session.topic.trim() ? "pointer" : "default",
            }}>{sessionReady ? "Update & Show QR" : "Save & Show QR Code"}</button>
          </Card>
        )}

        {/* ═══ PARTICIPANT FORM ═══ */}
        {mode === "participant" && (<>
          {sessionReady && session.topic && (
            <Card style={{ borderLeft: "3px solid #28a858", background: "rgba(40,168,88,0.03)" }}>
              <div style={{ fontSize: 11, color: "#28a858", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Today's Session</div>
              <div style={{ fontSize: 17, fontWeight: 700, color: "#d0d8e0", marginBottom: 4 }}>{session.topic}</div>
              {session.goal && <div style={{ fontSize: 14, color: "#7a9ab5", lineHeight: 1.5 }}><strong style={{ color: "#d0d8e0" }}>Goal: </strong>{session.goal}</div>}
            </Card>
          )}

          <Card>
            <input value={participantName} onChange={e => setParticipantName(e.target.value)}
              placeholder="Your name (optional — feedback is anonymous)"
              style={{ ...inp, background: "transparent", border: "none", padding: "0", fontSize: 14 }} />
          </Card>

          {QUESTIONS.map((q, qi) => (
            <Card key={q.id}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#d0d8e0", lineHeight: 1.5, marginBottom: 14 }}>
                <span style={{ color: "#e8a050", fontWeight: 700 }}>{qi + 1}. </span>{q.text}
              </div>
              <div style={{ padding: "0 4px", marginBottom: 8 }}>
                <input type="range" min="1" max="10" value={scores[q.id] || 5}
                  onChange={e => setScores(p => ({ ...p, [q.id]: Number(e.target.value) }))}
                  style={{ width: "100%", accentColor: "#e07830" }} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  {Object.entries(SLIDER_LABELS).map(([val, label]) => (
                    <span key={val} style={{ fontSize: 10, color: "#4d6888", fontWeight: 600,
                      opacity: Math.abs((scores[q.id] || 5) - Number(val)) < 2 ? 1 : 0.4 }}>{label}</span>
                  ))}
                </div>
              </div>
              <div style={{ textAlign: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 30, fontWeight: 800,
                  color: (scores[q.id] || 5) >= 7 ? "#28a858" : (scores[q.id] || 5) >= 4 ? "#e07830" : "#e05028",
                }}>{scores[q.id] || 5}</span>
                <span style={{ fontSize: 14, color: "#7a9ab5" }}>/10</span>
              </div>
              <input value={comments[q.id] || ""} onChange={e => setComments(p => ({ ...p, [q.id]: e.target.value }))}
                placeholder="Want to add more detail? (optional)"
                style={{ ...inp, fontSize: 13, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }} />
            </Card>
          ))}

          {session.goal && (
            <Card style={{ borderLeft: "3px solid #3088cc" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#d0d8e0", lineHeight: 1.5, marginBottom: 12 }}>
                Thinking about the goal — <em style={{ color: "#7a9ab5" }}>"{session.goal}"</em> — how well was it achieved?
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                {[
                  { id: "yes", label: "Yes — I got it", color: "#28a858" },
                  { id: "partially", label: "Partially", color: "#e07830" },
                  { id: "no", label: "Not really", color: "#e05028" },
                ].map(opt => (
                  <button key={opt.id} onClick={() => setGoalMet(opt.id)} style={{
                    flex: 1, minWidth: 90, padding: "10px 12px", borderRadius: 7, fontSize: 14, fontWeight: 600, cursor: "pointer",
                    background: goalMet === opt.id ? `${opt.color}18` : "rgba(255,255,255,0.02)",
                    border: `2px solid ${goalMet === opt.id ? opt.color : "rgba(255,255,255,0.06)"}`,
                    color: goalMet === opt.id ? opt.color : "#7a9ab5",
                  }}>{opt.label}</button>
                ))}
              </div>
              <input value={goalComment} onChange={e => setGoalComment(e.target.value)}
                placeholder="What helped? What would have helped more?"
                style={{ ...inp, fontSize: 13, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }} />
            </Card>
          )}

          <Card>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#d0d8e0", marginBottom: 8 }}>Anything else?</div>
            <textarea value={generalComment} onChange={e => setGeneralComment(e.target.value)}
              placeholder="What stood out? What could be improved?"
              style={{ ...inp, minHeight: 60, resize: "vertical", lineHeight: 1.5 }} />
          </Card>

          <button onClick={submitFeedback} disabled={saving} style={{
            width: "100%", padding: "14px", borderRadius: 8, border: "none",
            background: saving ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #e07830, #c06020)",
            color: saving ? "#7a9ab5" : "#fff",
            fontSize: 16, fontWeight: 700, cursor: saving ? "default" : "pointer",
          }}>{saving ? "Saving..." : "Submit Feedback"}</button>

          {/* Trainer access — subtle link at bottom */}
          <div style={{ textAlign: "center", marginTop: 20 }}>
            <button onClick={() => setMode("setup")} style={{
              background: "none", border: "none", color: "#3a5068", fontSize: 11, cursor: "pointer",
            }}>I'm the trainer →</button>
          </div>
        </>)}

        {/* ═══ THANK YOU ═══ */}
        {mode === "thankyou" && (
          <Card style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎿</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#28a858", marginBottom: 8 }}>Thank you!</div>
            <div style={{ fontSize: 15, color: "#7a9ab5", lineHeight: 1.5, marginBottom: 20 }}>
              Your feedback is really appreciated and helps your trainer improve.
            </div>
            <button onClick={resetForm} style={{
              padding: "10px 24px", borderRadius: 7, border: "1px solid rgba(224,120,48,0.3)",
              background: "rgba(224,120,48,0.08)", color: "#e8a050", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>Submit Another Response</button>
          </Card>
        )}

        {/* ═══ QR CODE ═══ */}
        {mode === "qr" && (
          <Card style={{ textAlign: "center", padding: "30px 20px" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#e8a050", marginBottom: 6 }}>Share with Your Group</div>
            <div style={{ fontSize: 14, color: "#7a9ab5", marginBottom: 6, lineHeight: 1.5 }}>
              Have participants scan this at the end of the session. Takes about 2 minutes.
            </div>
            {session.topic && (
              <div style={{ fontSize: 13, color: "#d0d8e0", marginBottom: 16, padding: "8px 12px", borderRadius: 6, background: "rgba(40,168,88,0.04)", border: "1px solid rgba(40,168,88,0.1)", display: "inline-block" }}>
                <strong>{session.topic}</strong>
              </div>
            )}
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: "inline-block", padding: 16, background: "#ffffff", borderRadius: 12 }}>
                <QRCode url={feedbackUrl} />
              </div>
            </div>
            <div style={{
              padding: "10px 14px", borderRadius: 8, fontSize: 13, color: "#e8a050",
              background: "rgba(224,120,48,0.06)", border: "1px solid rgba(224,120,48,0.15)",
              wordBreak: "break-all", marginBottom: 12,
            }}>{feedbackUrl}</div>
            <button onClick={() => { if (navigator.clipboard) navigator.clipboard.writeText(feedbackUrl); }}
              style={{ padding: "8px 20px", borderRadius: 6, border: "1px solid rgba(224,120,48,0.3)",
                background: "rgba(224,120,48,0.08)", color: "#e8a050", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Copy Link
            </button>
          </Card>
        )}
      </div>

      <style>{`
        input:focus, textarea:focus, select:focus {
          border-color: rgba(224,120,48,0.35) !important;
          box-shadow: 0 0 0 2px rgba(224,120,48,0.06);
        }
        input[type="range"] { height: 6px; }
        input[type="range"]::-webkit-slider-thumb { width: 20px; height: 20px; }
      `}</style>
    </div>
  );
}
