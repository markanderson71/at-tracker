import { useState, useCallback, useMemo, useEffect } from "react";

// ═══════════════════════════════════════════════════════════════════════
// DATA — Pre-loaded from AT Dev Plan v5
// ═══════════════════════════════════════════════════════════════════════

const GATES = {
  "Module 1 — Technical / MA": {
    color: "#e07830",
    prefix: "MA",
    gates: [
      { id: "MA-G1", criterion: "Multiple skill-to-skill cause-effect relationships" },
      { id: "MA-G2", criterion: "Blended MA using 3+ skills simultaneously" },
      { id: "MA-G3", criterion: "Prescribe IDP activity + variations as prescription for change" },
      { id: "MA-G4", criterion: "Tactical analysis — speed, line, turn shape, edge grip" },
      { id: "MA-G5", criterion: "Center Line and Common Threads in MA context" },
      { id: "MA-G6", criterion: "Biomechanics, physics, ski design applied to MA" },
      { id: "MA-G7", criterion: "Professionalism & Self-Management" },
    ],
  },
  "Module 2 — Skiing Performance": {
    color: "#3088cc",
    prefix: "SK",
    gates: [
      // ── Individual Fundamentals (L3) ──
      { id: "SK-G1", criterion: "Pivot Slips", category: "Individual Fundamentals" },
      { id: "SK-G2", criterion: "Hop Turns", category: "Individual Fundamentals" },
      { id: "SK-G3", criterion: "White Pass Turn", category: "Individual Fundamentals" },
      { id: "SK-G4", criterion: "Stem Christie", category: "Individual Fundamentals" },
      { id: "SK-G5", criterion: "Short Radius Leapers", category: "Individual Fundamentals" },
      { id: "SK-G6", criterion: "Outside Ski Turn", category: "Individual Fundamentals" },
      { id: "SK-G7", criterion: "Javelin Turns", category: "Individual Fundamentals" },
      { id: "SK-G8", criterion: "Reverse Javelin Turn", category: "Individual Fundamentals" },
      { id: "SK-G9", criterion: "Falling Leaf with Edge Change", category: "Individual Fundamentals" },
      // ── Integrated Fundamentals (Center Line) ──
      { id: "SK-G10", criterion: "Wedge Turn (Center Line L1)", category: "Integrated Fundamentals" },
      { id: "SK-G11", criterion: "Wedge Christie Turn (Center Line L2)", category: "Integrated Fundamentals" },
      { id: "SK-G12", criterion: "Basic Parallel Turn (Center Line L2)", category: "Integrated Fundamentals" },
      { id: "SK-G13", criterion: "Dynamic Parallel Turn (Center Line L3)", category: "Integrated Fundamentals" },
      // ── Versatility ──
      { id: "SK-G14", criterion: "Performance Short Turns — groomed blue to black", category: "Versatility" },
      { id: "SK-G15", criterion: "Performance Medium Turns — groomed blue", category: "Versatility" },
      { id: "SK-G16", criterion: "Variable Conditions and Terrain (Black / double black)", category: "Versatility" },
      { id: "SK-G17", criterion: "Short Turns in Bumps (Black)", category: "Versatility" },
      { id: "SK-G18", criterion: "Large Turns in Bumps", category: "Versatility" },
      // ── AT-Level Performance ──
      { id: "SK-G19", criterion: "Express intent of tactical choices, desired outcome, fundamental focus and blending, and ability to adapt to varying conditions", category: "AT-Level Performance" },
      { id: "SK-G20", criterion: "Professionalism & Self-Management", category: "AT-Level Performance" },
    ],
  },
  "Module 3 — Clinic Leading": {
    color: "#28a858",
    prefix: "CL",
    gates: [
      { id: "CL-G1", criterion: "Create observable, measurable Learning Outcomes" },
      { id: "CL-G2", criterion: "Plan Learning Experiences aligned to LOs" },
      { id: "CL-G3", criterion: "Adapt Learning Experiences to meet LOs established by needs of resort/organization" },
      { id: "CL-G4", criterion: "Foster recognition, reflection, and self-assessment" },
      { id: "CL-G5", criterion: "Maintain meaningful 2-way communication" },
      { id: "CL-G6", criterion: "Build trust and psychological safety" },
      { id: "CL-G7", criterion: "Adapt to interpersonal dynamics as ambassador" },
      { id: "CL-G8", criterion: "Provide timely, relevant, appropriately-sized feedback" },
      { id: "CL-G9", criterion: "Combine technical accuracy and experiential components" },
      { id: "CL-G10", criterion: "Lead a 25-minute assigned clinic on-snow" },
      { id: "CL-G11", criterion: "Foster positive group interaction, encourage group discussion, and facilitate collaborative goal/outcome formation" },
      { id: "CL-G12", criterion: "Professionalism & Self-Management" },
    ],
  },
};

const GATE_LOOKUP = {};
const ALL_GATES = [];
Object.values(GATES).forEach(mod => {
  mod.gates.forEach(g => {
    GATE_LOOKUP[g.id] = { ...g, color: mod.color, prefix: mod.prefix };
    ALL_GATES.push(g.id);
  });
});

const MENTORS = ["Chris", "Gates", "Mike"];
const LO_STATUSES = ["Not Started", "In Progress", "Pending Verification", "Verified"];
const LO_STATUS_COLORS = {
  "Not Started": { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", text: "#4a6080" },
  "In Progress": { bg: "rgba(230,120,48,0.1)", border: "rgba(230,120,48,0.3)", text: "#e07830" },
  "Pending Verification": { bg: "rgba(200,170,50,0.1)", border: "rgba(200,170,50,0.3)", text: "#c8aa32" },
  "Verified": { bg: "rgba(40,168,88,0.12)", border: "rgba(40,168,88,0.35)", text: "#28a858" },
};
const ENTRY_FLAGS = ["For Review", "FYI", "Milestone"];
const FLAG_COLORS = {
  "For Review": { bg: "rgba(230,120,48,0.12)", border: "rgba(230,120,48,0.35)", text: "#e07830" },
  "FYI": { bg: "rgba(100,140,180,0.1)", border: "rgba(100,140,180,0.25)", text: "#7a9ab5" },
  "Milestone": { bg: "rgba(40,168,88,0.1)", border: "rgba(40,168,88,0.3)", text: "#28a858" },
};
const MODULE_KEYS = ["Technical/MA", "Skiing", "Clinic Leading", "General"];
const MODULE_COLORS_SIMPLE = { "Technical/MA": "#e07830", "Skiing": "#3088cc", "Clinic Leading": "#28a858", "General": "#7a9ab5" };

const FITTS_POSNER = [
  { score: 1, label: "Low Cognitive", short: "1" },
  { score: 2, label: "High Cognitive", short: "2" },
  { score: 3, label: "Low Associative", short: "3" },
  { score: 4, label: "High Associative — PASS", short: "4 ✓" },
  { score: 5, label: "Low Autonomous", short: "5" },
  { score: 6, label: "High Autonomous", short: "6" },
];

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().split("T")[0];

// ═══════════════════════════════════════════════════════════════════════
// SMALL COMPONENTS
// ═══════════════════════════════════════════════════════════════════════

const GateChip = ({ gateId, small, onClick, showCriterion }) => {
  const g = GATE_LOOKUP[gateId];
  if (!g) return null;
  return (
    <span
      onClick={onClick}
      title={g.criterion}
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        padding: small ? "2px 6px" : "3px 8px", borderRadius: 5,
        background: `${g.color}15`, border: `1px solid ${g.color}30`,
        fontSize: small ? 10 : 11, fontWeight: 600, color: g.color,
        cursor: onClick ? "pointer" : "default", whiteSpace: "nowrap",
        maxWidth: showCriterion ? 320 : undefined, overflow: "hidden", textOverflow: "ellipsis",
      }}
    >
      {gateId}{showCriterion ? ` — ${g.criterion}` : ""}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const c = LO_STATUS_COLORS[status] || LO_STATUS_COLORS["Not Started"];
  return (
    <span style={{
      padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
    }}>
      {status}
    </span>
  );
};

const SectionLabel = ({ children }) => (
  <div style={{
    fontSize: 10, color: "#506880", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5,
  }}>
    {children}
  </div>
);

const Card = ({ children, style }) => (
  <div style={{
    background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
    borderRadius: 10, padding: "16px", marginBottom: 10, ...style,
  }}>
    {children}
  </div>
);

// ═══════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════

const USERS = {
  mark:  { name: "Mark",  role: "candidate", pin: "1234", color: "#e07830" },
  chris: { name: "Chris", role: "mentor",    pin: "2345", color: "#28a858" },
  gates: { name: "Gates", role: "mentor",    pin: "3456", color: "#28a858" },
  mike:  { name: "Mike",  role: "mentor",    pin: "4567", color: "#3088cc" },
};

// ═══════════════════════════════════════════════════════════════════════
// API CONFIG — Replace with your Google Apps Script deployment URL
// ═══════════════════════════════════════════════════════════════════════
const API_URL = (typeof import.meta !== "undefined" && import.meta.env?.VITE_SHEETS_API_URL)
  || "YOUR_APPS_SCRIPT_URL_HERE";

async function apiGet(sheetName) {
  try {
    const res = await fetch(`${API_URL}?action=getAll&sheet=${sheetName}`);
    const data = await res.json();
    return data.rows || [];
  } catch (e) { console.error("API GET error:", e); return []; }
}

async function apiCreate(sheetName, rowData) {
  try {
    await fetch(`${API_URL}?action=create&sheet=${sheetName}`, {
      method: "POST", body: JSON.stringify(rowData),
    });
  } catch (e) { console.error("API CREATE error:", e); }
}

async function apiUpdate(sheetName, rowData) {
  try {
    await fetch(`${API_URL}?action=update&sheet=${sheetName}`, {
      method: "POST", body: JSON.stringify(rowData),
    });
  } catch (e) { console.error("API UPDATE error:", e); }
}

async function apiDelete(sheetName, id) {
  try {
    await fetch(`${API_URL}?action=delete&sheet=${sheetName}&id=${id}`);
  } catch (e) { console.error("API DELETE error:", e); }
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════

export default function ATDevelopmentTracker() {
  // ── Auth State ────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(null);
  const [loginId, setLoginId] = useState("");
  const [loginPin, setLoginPin] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLogin = () => {
    const key = loginId.trim().toLowerCase();
    const user = USERS[key];
    if (!user) {
      setLoginError("User not found");
      return;
    }
    if (user.pin !== loginPin.trim()) {
      setLoginError("Incorrect PIN");
      return;
    }
    setCurrentUser({ key, ...user });
    setLoginError("");
    setLoginId("");
    setLoginPin("");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginPin("");
  };

  // ── App State (must be before any conditional return — React hooks rule) ──
  const [tab, setTab] = useState("baseline");
  const [los, setLos] = useState([]);
  const [entries, setEntries] = useState([]);
  const [baselineScores, setBaselineScores] = useState({});
  const [baselineNotes, setBaselineNotes] = useState({});
  const [gateScores, setGateScores] = useState({});
  const [editingLO, setEditingLO] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [viewingEntry, setViewingEntry] = useState(null);
  const [viewingLO, setViewingLO] = useState(null);
  const [gateFilter, setGateFilter] = useState(null);
  const [dataLoaded, setDataLoaded] = useState(false);

  // ── Load data from Google Sheets on mount ─────────────
  useEffect(() => {
    if (API_URL === "YOUR_APPS_SCRIPT_URL_HERE") {
      setDataLoaded(true);
      return;
    }

    async function loadAll() {
      try {
        // Load LOs
        const loRows = await apiGet("LearningObjectives");
        const parsedLOs = loRows.filter(r => r.id).map(r => ({
          ...r,
          gates: r.gates ? r.gates.split(",").map(g => g.trim()).filter(Boolean) : [],
          score: r.score ? Number(r.score) : null,
          activeLOIds: r.activeLOIds ? r.activeLOIds.split(",").map(s => s.trim()).filter(Boolean) : [],
        }));
        setLos(parsedLOs);

        // Load Diary Entries
        const entryRows = await apiGet("DiaryEntries");
        const parsedEntries = entryRows.filter(r => r.id).map(r => ({
          ...r,
          activeLOIds: r.activeLOIds ? r.activeLOIds.split(",").map(s => s.trim()).filter(Boolean) : [],
          attachments: r.attachments ? JSON.parse(r.attachments) : [],
          comments: r.comments ? JSON.parse(r.comments) : [],
        }));
        setEntries(parsedEntries);

        // Load Gate Status (for examiner scores)
        const gateRows = await apiGet("GateStatus");
        const gScores = {};
        const bScores = {};
        const bNotes = {};
        gateRows.forEach(r => {
          if (!r.gateId) return;
          // Gate examiner scores
          if (r.chrisScore || r.gatesScore || r.mikeScore) {
            gScores[r.gateId] = {
              chris: r.chrisScore ? Number(r.chrisScore) : 0,
              gates: r.gatesScore ? Number(r.gatesScore) : 0,
              mike: r.mikeScore ? Number(r.mikeScore) : 0,
            };
          }
          // Baseline scores
          if (r.baselineMark || r.baselineChris || r.baselineGates || r.baselineMike) {
            bScores[r.gateId] = {
              mark: r.baselineMark ? Number(r.baselineMark) : 0,
              chris: r.baselineChris ? Number(r.baselineChris) : 0,
              gates: r.baselineGates ? Number(r.baselineGates) : 0,
              mike: r.baselineMike ? Number(r.baselineMike) : 0,
            };
          }
          if (r.baselineNotes) {
            bNotes[r.gateId] = r.baselineNotes;
          }
        });
        setGateScores(gScores);
        setBaselineScores(bScores);
        setBaselineNotes(bNotes);
      } catch (e) {
        console.error("Failed to load data:", e);
      }
      setDataLoaded(true);
    }

    loadAll();
  }, []);

  const gateToLOs = useMemo(() => {
    const map = {};
    ALL_GATES.forEach(id => { map[id] = []; });
    los.forEach(lo => {
      (lo.gates || []).forEach(gId => {
        if (map[gId]) map[gId].push(lo);
      });
    });
    return map;
  }, [los]);

  const gateToEntries = useMemo(() => {
    const map = {};
    ALL_GATES.forEach(id => { map[id] = []; });
    entries.forEach(e => {
      (e.activeLOIds || []).forEach(loId => {
        const lo = los.find(l => l.id === loId);
        if (lo) {
          (lo.gates || []).forEach(gId => {
            if (map[gId] && !map[gId].find(x => x.id === e.id)) map[gId].push(e);
          });
        }
      });
    });
    return map;
  }, [entries, los]);

  // ── Login Screen ──────────────────────────────────────
  if (!currentUser) {
    return (
      <div style={{
        fontFamily: "'Outfit', system-ui, sans-serif",
        minHeight: "100vh",
        background: "linear-gradient(178deg, #070c18 0%, #0d1828 35%, #101e34 100%)",
        color: "#e0e8f0",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <div style={{ width: "100%", maxWidth: 340, padding: "0 20px" }}>
          {/* Logo / Title */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>⛷</div>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.04em", color: "#f0f4f8" }}>
              AT Development Tracker
            </div>
            <div style={{ fontSize: 12, color: "#3d5470", marginTop: 4 }}>
              Mark · PSIA-RM · Keystone
            </div>
          </div>

          {/* Login Card */}
          <div style={{
            padding: "24px",
            background: "rgba(255,255,255,0.025)",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: 12,
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#c0ccd8", marginBottom: 16 }}>
              Sign In
            </div>

            {/* User Select */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 10, color: "#4a6080", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>
                Who are you?
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                {Object.entries(USERS).map(([key, user]) => (
                  <button
                    key={key}
                    onClick={() => { setLoginId(key); setLoginError(""); }}
                    style={{
                      padding: "10px 12px", borderRadius: 8, cursor: "pointer",
                      border: loginId === key ? `2px solid ${user.color}` : "2px solid rgba(255,255,255,0.06)",
                      background: loginId === key ? `${user.color}12` : "rgba(255,255,255,0.02)",
                      display: "flex", alignItems: "center", gap: 8,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%",
                      background: `${user.color}20`, border: `1.5px solid ${user.color}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, fontWeight: 800, color: user.color,
                    }}>
                      {user.name[0]}
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: loginId === key ? "#e0e8f0" : "#6a8098" }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: 9, color: "#3d5470", textTransform: "capitalize" }}>
                        {user.role === "candidate" ? "Candidate" : "Mentor / Assessor"}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* PIN */}
            {loginId && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 10, color: "#4a6080", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>
                  PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={loginPin}
                  onChange={e => { setLoginPin(e.target.value.replace(/\D/g, "")); setLoginError(""); }}
                  onKeyDown={e => { if (e.key === "Enter") handleLogin(); }}
                  placeholder="4-digit PIN"
                  autoFocus
                  style={{
                    width: "100%", padding: "12px 14px", fontSize: 18, fontWeight: 700,
                    textAlign: "center", letterSpacing: "0.3em",
                    color: "#e0e8f0", background: "rgba(255,255,255,0.04)",
                    border: loginError ? "1.5px solid rgba(200,50,50,0.4)" : "1.5px solid rgba(255,255,255,0.1)",
                    borderRadius: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                  }}
                />
                {loginError && (
                  <div style={{ fontSize: 11, color: "#cc4040", marginTop: 6, textAlign: "center" }}>
                    {loginError}
                  </div>
                )}
              </div>
            )}

            {/* Sign In Button */}
            <button
              onClick={handleLogin}
              disabled={!loginId || loginPin.length < 4}
              style={{
                width: "100%", padding: "12px", borderRadius: 8, border: "none",
                background: loginId && loginPin.length >= 4
                  ? `linear-gradient(135deg, ${USERS[loginId]?.color || "#e07830"}, ${USERS[loginId]?.color || "#e07830"}cc)`
                  : "rgba(255,255,255,0.04)",
                color: loginId && loginPin.length >= 4 ? "#fff" : "#3d5470",
                fontSize: 14, fontWeight: 700, cursor: loginId && loginPin.length >= 4 ? "pointer" : "default",
                transition: "all 0.15s ease",
              }}
            >
              Sign In as {loginId ? USERS[loginId]?.name : "..."}
            </button>
          </div>

          <div style={{ fontSize: 10, color: "#2a3c50", textAlign: "center", marginTop: 16 }}>
            Alpine Trainer Development · PSIA-RM Rocky Mountain
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // MAIN APP (authenticated)
  // ═══════════════════════════════════════════════════════════════════

  // ── Loading Screen ─────────────────────────────────────
  if (!dataLoaded) {
    return (
      <div style={{
        fontFamily: "'Outfit', system-ui, sans-serif",
        minHeight: "100vh",
        background: "linear-gradient(178deg, #070c18 0%, #0d1828 35%, #101e34 100%)",
        color: "#e0e8f0",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16,
      }}>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <div style={{
          width: 40, height: 40, border: "3px solid rgba(224,120,48,0.15)",
          borderTop: "3px solid #e07830", borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: "#6a8098" }}>
          Loading your data...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Mark sees all tabs; mentors see only what's been rolled out
  // ── ROLLOUT CONTROL: add tab ids here as you introduce them ──
  const MENTOR_VISIBLE_TABS = ["baseline", "diary"];
  // ROLLOUT OPTIONS — copy/paste the line you want:
  // const MENTOR_VISIBLE_TABS = ["baseline"];
  // const MENTOR_VISIBLE_TABS = ["baseline", "diary"];
  // const MENTOR_VISIBLE_TABS = ["baseline", "los"];
  // const MENTOR_VISIBLE_TABS = ["baseline", "los", "diary"];
  // const MENTOR_VISIBLE_TABS = ["baseline", "los", "diary", "gates"];

  const ALL_TABS_LIST = ["baseline", "los", "diary", "gates"];
  const VISIBLE_TABS = currentUser.role === "candidate" ? ALL_TABS_LIST : MENTOR_VISIBLE_TABS;

  // ── Styles ────────────────────────────────────────────
  const inp = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7,
    padding: "8px 11px", fontSize: 13, color: "#e0e8f0",
    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };
  const txta = { ...inp, minHeight: 64, resize: "vertical", lineHeight: 1.55 };
  const lbl = {
    fontSize: 10, color: "#506880", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4, display: "block",
  };

  // ── LO CRUD ───────────────────────────────────────────
  const newLO = () => {
    const nextNum = los.length + 1;
    setEditingLO({
      id: uid(), objId: `LO-${String(nextNum).padStart(2, "0")}`,
      objective: "", activity: "", assignedBy: "Chris",
      module: "Technical/MA", gates: [], status: "Not Started",
      targetDate: "", score: null, notes: "",
    });
  };

  const saveLO = () => {
    if (!editingLO) return;
    const isNew = !los.find(l => l.id === editingLO.id);
    setLos(prev => {
      const idx = prev.findIndex(l => l.id === editingLO.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = editingLO; return n; }
      return [...prev, editingLO];
    });
    // Sync to Google Sheets
    const sheetRow = {
      ...editingLO,
      gates: (editingLO.gates || []).join(","),
      score: editingLO.score || "",
    };
    if (isNew) { apiCreate("LearningObjectives", sheetRow); }
    else { apiUpdate("LearningObjectives", sheetRow); }
    setEditingLO(null);
  };

  const deleteLO = (id) => {
    setLos(prev => prev.filter(l => l.id !== id));
    if (editingLO?.id === id) setEditingLO(null);
    if (viewingLO?.id === id) setViewingLO(null);
    apiDelete("LearningObjectives", id);
  };

  // ── Entry CRUD ────────────────────────────────────────
  const newEntry = () => {
    setEditingEntry({
      id: uid(), date: today(), seasonWeek: "", location: "", duration: "",
      moduleFocus: "Technical/MA", flag: "FYI", activeLOIds: [], attachments: [], comments: [],
      workedOn: "", observed: "", wentWell: "", struggling: "",
      questionsForMentors: "", nextSteps: "", mentorNotes: "",
    });
  };

  const saveEntry = () => {
    if (!editingEntry) return;
    const isNew = !entries.find(e => e.id === editingEntry.id);
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === editingEntry.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = editingEntry; return n; }
      return [editingEntry, ...prev];
    });
    // Sync to Google Sheets
    const sheetRow = {
      ...editingEntry,
      activeLOIds: (editingEntry.activeLOIds || []).join(","),
      attachments: JSON.stringify(editingEntry.attachments || []),
      comments: JSON.stringify(editingEntry.comments || []),
    };
    if (isNew) { apiCreate("DiaryEntries", sheetRow); }
    else { apiUpdate("DiaryEntries", sheetRow); }
    setEditingEntry(null);
  };

  const deleteEntry = (id) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    if (viewingEntry?.id === id) setViewingEntry(null);
    apiDelete("DiaryEntries", id);
  };

  // ── Save baseline & gate scores to Sheets ─────────────
  const saveGateToSheet = useCallback((gateId, baseScore, gateScore, note) => {
    apiUpdate("GateStatus", {
      gateId,
      baselineMark: baseScore?.mark || "",
      baselineChris: baseScore?.chris || "",
      baselineGates: baseScore?.gates || "",
      baselineMike: baseScore?.mike || "",
      baselineNotes: note || "",
      chrisScore: gateScore?.chris || "",
      gatesScore: gateScore?.gates || "",
      mikeScore: gateScore?.mike || "",
    });
  }, []);

  // Debounced save for baseline scores (fires 1s after last change)
  const [saveTimer, setSaveTimer] = useState(null);
  const debouncedSaveGate = useCallback((gateId) => {
    if (saveTimer) clearTimeout(saveTimer);
    setSaveTimer(setTimeout(() => {
      saveGateToSheet(
        gateId,
        baselineScores[gateId],
        gateScores[gateId],
        baselineNotes[gateId]
      );
    }, 1000));
  }, [saveTimer, baselineScores, gateScores, baselineNotes, saveGateToSheet]);

  // Wrap baseline/gate score setters to trigger save
  const updateBaselineScore = (gateId, who, val) => {
    setBaselineScores(prev => {
      const next = { ...prev, [gateId]: { ...prev[gateId], [who]: val ? Number(val) : 0 } };
      return next;
    });
    setTimeout(() => debouncedSaveGate(gateId), 0);
  };

  const updateBaselineNote = (gateId, val) => {
    setBaselineNotes(prev => ({ ...prev, [gateId]: val }));
    setTimeout(() => debouncedSaveGate(gateId), 0);
  };

  const updateGateExaminerScore = (gateId, who, val) => {
    setGateScores(prev => {
      const next = { ...prev, [gateId]: { ...prev[gateId], [who]: val ? Number(val) : 0 } };
      return next;
    });
    setTimeout(() => debouncedSaveGate(gateId), 0);
  };

  // Save comments back to sheet when they change
  const saveEntryComments = useCallback((entryId, comments) => {
    apiUpdate("DiaryEntries", { id: entryId, comments: JSON.stringify(comments) });
  }, []);

  // ── Gate selector for LO editing ─────────────────────
  const GatePicker = ({ selected, onChange }) => {
    const [openMod, setOpenMod] = useState(null);
    const toggle = (gId) => onChange(selected.includes(gId) ? selected.filter(x => x !== gId) : [...selected, gId]);
    return (
      <div>
        {selected.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 8 }}>
            {selected.map(g => <GateChip key={g} gateId={g} small onClick={() => toggle(g)} />)}
          </div>
        )}
        {Object.entries(GATES).map(([modName, mod]) => {
          const isOpen = openMod === modName;
          return (
            <div key={modName} style={{ marginBottom: 3 }}>
              <button onClick={() => setOpenMod(isOpen ? null : modName)} style={{
                width: "100%", textAlign: "left", padding: "7px 10px",
                background: isOpen ? `${mod.color}0c` : "rgba(255,255,255,0.02)",
                border: `1px solid ${isOpen ? `${mod.color}25` : "rgba(255,255,255,0.05)"}`,
                borderRadius: 6, color: "#b0bcc8", fontSize: 11, fontWeight: 600, cursor: "pointer",
                display: "flex", justifyContent: "space-between",
              }}>
                <span>{modName}</span>
                <span style={{ fontSize: 10, color: "#4a6080" }}>{mod.gates.filter(g => selected.includes(g.id)).length}/{mod.gates.length}</span>
              </button>
              {isOpen && (
                <div style={{ padding: "4px 0 2px 2px" }}>
                  {mod.gates.map(gate => {
                    const on = selected.includes(gate.id);
                    return (
                      <label key={gate.id} style={{
                        display: "flex", alignItems: "flex-start", gap: 7,
                        padding: "4px 6px", borderRadius: 4, cursor: "pointer",
                        background: on ? `${mod.color}08` : "transparent",
                      }}>
                        <input type="checkbox" checked={on} onChange={() => toggle(gate.id)}
                          style={{ marginTop: 2, accentColor: mod.color }} />
                        <span style={{ fontSize: 11, color: on ? "#d0d8e0" : "#506880", lineHeight: 1.35 }}>
                          <strong style={{ color: on ? mod.color : "#6a8098" }}>{gate.id}</strong> {gate.criterion}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // ── LO Picker for diary entries ──────────────────────
  const LOPicker = ({ selected, onChange }) => {
    if (los.length === 0) return <div style={{ fontSize: 12, color: "#4a6080" }}>No LOs assigned yet — add them in the Learning Objectives tab.</div>;
    const toggle = (id) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {los.filter(l => l.status !== "Verified").map(lo => {
          const on = selected.includes(lo.id);
          const mc = MODULE_COLORS_SIMPLE[lo.module] || "#7a9ab5";
          return (
            <label key={lo.id} style={{
              display: "flex", alignItems: "flex-start", gap: 8, padding: "6px 8px",
              borderRadius: 6, cursor: "pointer",
              background: on ? `${mc}10` : "rgba(255,255,255,0.015)",
              border: `1px solid ${on ? `${mc}30` : "rgba(255,255,255,0.04)"}`,
            }}>
              <input type="checkbox" checked={on} onChange={() => toggle(lo.id)}
                style={{ marginTop: 3, accentColor: mc }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: on ? "#d0d8e0" : "#6a8098" }}>
                  <span style={{ color: mc }}>{lo.objId}</span> — {lo.objective || "Untitled"}
                </div>
                {lo.gates.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 3 }}>
                    {lo.gates.map(g => <GateChip key={g} gateId={g} small />)}
                  </div>
                )}
              </div>
            </label>
          );
        })}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  const isSubView = editingLO || editingEntry || viewingEntry || viewingLO;

  return (
    <div style={{
      fontFamily: "'Outfit', system-ui, sans-serif",
      minHeight: "100vh",
      background: "linear-gradient(178deg, #070c18 0%, #0d1828 35%, #101e34 100%)",
      color: "#e0e8f0",
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* ── HEADER ──────────────────────────────────── */}
      <div style={{
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        padding: "20px 16px 14px",
        background: "rgba(255,255,255,0.01)",
      }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.04em", color: "#f0f4f8" }}>
                AT Development Tracker
              </span>
              <span style={{ fontSize: 11, color: "#3d5470", fontWeight: 500 }}>
                Mark · PSIA-RM · Keystone
              </span>
            </div>
            {/* User badge + logout */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "5px 10px", borderRadius: 6,
                background: `${currentUser.color}10`,
                border: `1px solid ${currentUser.color}30`,
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: `${currentUser.color}25`, border: `1.5px solid ${currentUser.color}50`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 10, fontWeight: 800, color: currentUser.color,
                }}>
                  {currentUser.name[0]}
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: currentUser.color }}>
                  {currentUser.name}
                </span>
                <span style={{ fontSize: 8, color: "#4a6080", textTransform: "uppercase", fontWeight: 600 }}>
                  {currentUser.role === "candidate" ? "Candidate" : "Mentor"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: "5px 8px", borderRadius: 5, fontSize: 10, fontWeight: 600,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                  color: "#4a6080", cursor: "pointer",
                }}
              >
                Sign Out
              </button>
            </div>
          </div>

          {!isSubView && (
            <div style={{ display: "flex", gap: 4, marginTop: 12, flexWrap: "wrap" }}>
              {[
                { id: "baseline", label: "Baseline Scorecard" },
                { id: "los", label: `Learning Objectives (${los.length})` },
                { id: "diary", label: `Diary (${entries.length})` },
                { id: "gates", label: "Gate Readiness" },
              ].filter(t => VISIBLE_TABS.includes(t.id)).map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setGateFilter(null); }} style={{
                  padding: "7px 13px", borderRadius: 6, fontSize: 11, fontWeight: 600,
                  border: tab === t.id ? "1.5px solid rgba(224,120,48,0.45)" : "1.5px solid rgba(255,255,255,0.07)",
                  background: tab === t.id ? "rgba(224,120,48,0.1)" : "rgba(255,255,255,0.015)",
                  color: tab === t.id ? "#e8a050" : "#4a6080",
                  cursor: "pointer",
                }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 60px" }}>

        {/* ═══ LO DETAIL VIEW ═══ */}
        {viewingLO && !editingLO && (() => {
          const lo = viewingLO;
          const mc = MODULE_COLORS_SIMPLE[lo.module] || "#7a9ab5";
          const linkedEntries = entries.filter(e => (e.activeLOIds || []).includes(lo.id));
          return (
            <div>
              <button onClick={() => setViewingLO(null)} style={{ background: "none", border: "none", color: "#4a6080", fontSize: 12, cursor: "pointer", padding: "0 0 10px", fontWeight: 600 }}>← Back</button>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <span style={{ fontSize: 16, fontWeight: 700, color: mc }}>{lo.objId}</span>
                    <StatusBadge status={lo.status} />
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => setEditingLO({ ...lo, gates: [...lo.gates] })} style={{ padding: "4px 10px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#7a9ab5", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Edit</button>
                    <button onClick={() => { if (confirm("Delete this LO?")) deleteLO(lo.id); }} style={{ padding: "4px 10px", borderRadius: 5, background: "rgba(200,50,50,0.06)", border: "1px solid rgba(200,50,50,0.2)", color: "#b04040", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Delete</button>
                  </div>
                </div>
                <SectionLabel>Objective</SectionLabel>
                <p style={{ fontSize: 13, color: "#c0ccd8", lineHeight: 1.6, margin: "0 0 14px" }}>{lo.objective || "—"}</p>
                <SectionLabel>Mentor-Assigned Activity</SectionLabel>
                <p style={{ fontSize: 13, color: "#c0ccd8", lineHeight: 1.6, margin: "0 0 14px" }}>{lo.activity || "—"}</p>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 14 }}>
                  <div><SectionLabel>Assigned By</SectionLabel><span style={{ fontSize: 13, color: "#c0ccd8" }}>{lo.assignedBy}</span></div>
                  <div><SectionLabel>Module</SectionLabel><span style={{ fontSize: 13, color: mc }}>{lo.module}</span></div>
                  <div><SectionLabel>Target Date</SectionLabel><span style={{ fontSize: 13, color: "#c0ccd8" }}>{lo.targetDate || "—"}</span></div>
                  {lo.score && <div><SectionLabel>Fitts & Posner</SectionLabel><span style={{ fontSize: 13, color: lo.score >= 4 ? "#28a858" : "#e07830" }}>{lo.score} — {FITTS_POSNER.find(f => f.score === lo.score)?.label}</span></div>}
                </div>
                {lo.gates.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <SectionLabel>Gates Developed</SectionLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {lo.gates.map(g => <GateChip key={g} gateId={g} showCriterion />)}
                    </div>
                  </div>
                )}
                {lo.notes && <><SectionLabel>Notes</SectionLabel><p style={{ fontSize: 12, color: "#7a9ab5", lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap" }}>{lo.notes}</p></>}
                {linkedEntries.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <SectionLabel>Diary Entries ({linkedEntries.length})</SectionLabel>
                    {linkedEntries.map(e => (
                      <div key={e.id} onClick={() => { setViewingLO(null); setViewingEntry(e); }} style={{
                        padding: "8px 10px", borderRadius: 6, marginBottom: 4, cursor: "pointer",
                        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                        fontSize: 12, color: "#7a9ab5",
                      }}>
                        <strong style={{ color: "#a0b0c0" }}>{e.date}</strong> — {e.workedOn?.slice(0, 80) || "No description"}{e.workedOn?.length > 80 ? "…" : ""}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          );
        })()}

        {/* ═══ LO EDIT/CREATE ═══ */}
        {editingLO && (() => {
          const lo = editingLO;
          const update = (f, v) => setEditingLO(p => ({ ...p, [f]: v }));
          return (
            <div>
              <button onClick={() => setEditingLO(null)} style={{ background: "none", border: "none", color: "#4a6080", fontSize: 12, cursor: "pointer", padding: "0 0 10px", fontWeight: 600 }}>← Cancel</button>
              <Card>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, color: "#e0e8f0" }}>
                  {los.find(l => l.id === lo.id) ? `Edit ${lo.objId}` : "New Learning Objective"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={lbl}>Obj ID</label>
                    <input value={lo.objId} onChange={e => update("objId", e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Assigned By</label>
                    <select value={lo.assignedBy} onChange={e => update("assignedBy", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                      {MENTORS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Module</label>
                    <select value={lo.module} onChange={e => update("module", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                      {MODULE_KEYS.filter(m => m !== "General").map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>Learning Objective (what Mark must achieve)</label>
                  <textarea value={lo.objective} onChange={e => update("objective", e.target.value)} placeholder="Mentor defines the objective..." style={txta} />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lbl}>Mentor-Assigned Activity (how to achieve it)</label>
                  <textarea value={lo.activity} onChange={e => update("activity", e.target.value)} placeholder="Activity — mentor's own design or drawn from AT Guide suggested activities..." style={txta} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Status</label>
                    <select value={lo.status} onChange={e => update("status", e.target.value)} style={{ ...inp, cursor: "pointer" }}>
                      {LO_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Target Date</label>
                    <input type="date" value={lo.targetDate} onChange={e => update("targetDate", e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Fitts & Posner Score</label>
                    <select value={lo.score || ""} onChange={e => update("score", e.target.value ? Number(e.target.value) : null)} style={{ ...inp, cursor: "pointer" }}>
                      <option value="">—</option>
                      {FITTS_POSNER.map(f => <option key={f.score} value={f.score}>{f.score} — {f.label}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Gates This LO Develops</label>
                  <div style={{ padding: "10px", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8 }}>
                    <GatePicker selected={lo.gates} onChange={g => update("gates", g)} />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Notes</label>
                  <textarea value={lo.notes} onChange={e => update("notes", e.target.value)} placeholder="Additional context, mentor notes..." style={txta} />
                </div>
                <button onClick={saveLO} style={{
                  width: "100%", padding: "11px", borderRadius: 7, border: "none",
                  background: "linear-gradient(135deg, #e07830, #c06020)", color: "#fff",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>
                  Save Learning Objective
                </button>
              </Card>
            </div>
          );
        })()}

        {/* ═══ ENTRY DETAIL ═══ */}
        {viewingEntry && !editingEntry && (() => {
          const e = viewingEntry;
          const fc = FLAG_COLORS[e.flag] || FLAG_COLORS["FYI"];
          const linkedLOs = los.filter(l => (e.activeLOIds || []).includes(l.id));
          const derivedGates = [...new Set(linkedLOs.flatMap(l => l.gates || []))];
          const sections = [
            { label: "What I Worked On", val: e.workedOn },
            { label: "What I Noticed / Observed (Self-MA)", val: e.observed },
            { label: "What Went Well", val: e.wentWell },
            { label: "Where I'm Struggling", val: e.struggling },
            { label: "Questions for Mentors", val: e.questionsForMentors },
            { label: "Next Steps", val: e.nextSteps },
            { label: "Mentor Notes", val: e.mentorNotes },
          ].filter(s => s.val);
          return (
            <div>
              <button onClick={() => setViewingEntry(null)} style={{ background: "none", border: "none", color: "#4a6080", fontSize: 12, cursor: "pointer", padding: "0 0 10px", fontWeight: 600 }}>← Back</button>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 17, fontWeight: 700 }}>{e.date}</div>
                    <div style={{ fontSize: 11, color: "#4a6080", marginTop: 2 }}>
                      {[e.seasonWeek, e.location, e.duration].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: fc.bg, border: `1px solid ${fc.border}`, color: fc.text }}>{e.flag}</span>
                    <button onClick={() => setEditingEntry({ ...e, activeLOIds: [...(e.activeLOIds || [])], attachments: [...(e.attachments || [])], comments: [...(e.comments || [])] })} style={{ padding: "3px 9px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#7a9ab5", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Edit</button>
                    <button onClick={() => { if (confirm("Delete?")) deleteEntry(e.id); }} style={{ padding: "3px 9px", borderRadius: 5, background: "rgba(200,50,50,0.06)", border: "1px solid rgba(200,50,50,0.2)", color: "#b04040", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>Delete</button>
                  </div>
                </div>
                {linkedLOs.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <SectionLabel>Active Learning Objectives</SectionLabel>
                    {linkedLOs.map(lo => {
                      const mc = MODULE_COLORS_SIMPLE[lo.module] || "#7a9ab5";
                      return (
                        <div key={lo.id} style={{ fontSize: 12, color: "#a0b0c0", marginBottom: 3 }}>
                          <span style={{ color: mc, fontWeight: 700 }}>{lo.objId}</span> — {lo.objective?.slice(0, 100) || "Untitled"}
                        </div>
                      );
                    })}
                  </div>
                )}
                {derivedGates.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <SectionLabel>Gates Developed (via LOs)</SectionLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                      {derivedGates.map(g => <GateChip key={g} gateId={g} small />)}
                    </div>
                  </div>
                )}
                {sections.map(s => (
                  <div key={s.label} style={{ marginBottom: 14 }}>
                    <SectionLabel>{s.label}</SectionLabel>
                    <div style={{ fontSize: 13, color: "#b0bcc8", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{s.val}</div>
                  </div>
                ))}
                {(e.attachments || []).length > 0 && (
                  <div style={{ marginBottom: 4 }}>
                    <SectionLabel>Links & Attachments</SectionLabel>
                    {(e.attachments || []).map((att, ai) => {
                      const isYT = att.url && (att.url.includes("youtube.com") || att.url.includes("youtu.be"));
                      const isDoc = att.url && (att.url.includes("docs.google") || att.url.includes("drive.google") || att.url.includes(".pdf") || att.url.includes(".docx"));
                      const icon = isYT ? "🎬" : isDoc ? "📄" : "🔗";

                      // Extract YouTube video ID for thumbnail
                      let ytId = null;
                      if (isYT) {
                        const m = att.url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                        if (m) ytId = m[1];
                      }

                      return (
                        <a
                          key={ai}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex", alignItems: "center", gap: 10,
                            padding: "8px 12px", marginBottom: 5, borderRadius: 7,
                            background: isYT ? "rgba(255,0,0,0.04)" : isDoc ? "rgba(66,133,244,0.04)" : "rgba(255,255,255,0.02)",
                            border: `1px solid ${isYT ? "rgba(255,0,0,0.12)" : isDoc ? "rgba(66,133,244,0.12)" : "rgba(255,255,255,0.06)"}`,
                            textDecoration: "none", cursor: "pointer",
                            transition: "border-color 0.15s ease",
                          }}
                        >
                          {ytId ? (
                            <div style={{
                              width: 64, height: 36, borderRadius: 4, overflow: "hidden", flexShrink: 0,
                              background: "#000", display: "flex", alignItems: "center", justifyContent: "center",
                              position: "relative",
                            }}>
                              <img
                                src={`https://img.youtube.com/vi/${ytId}/default.jpg`}
                                alt=""
                                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              />
                              <div style={{
                                position: "absolute", width: 20, height: 14, borderRadius: 3,
                                background: "rgba(255,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center",
                              }}>
                                <span style={{ fontSize: 8, color: "#fff" }}>▶</span>
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 12, fontWeight: 600,
                              color: isYT ? "#cc3030" : isDoc ? "#4285f4" : "#7a9ab5",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {att.label || (isYT ? "YouTube Video" : isDoc ? "Document" : "Link")}
                            </div>
                            <div style={{
                              fontSize: 10, color: "#4a6080",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {att.url}
                            </div>
                          </div>
                          <span style={{ fontSize: 10, color: "#3d5470", flexShrink: 0 }}>↗</span>
                        </a>
                      );
                    })}
                  </div>
                )}

                {/* ── Comment Thread ───────────────────── */}
                <div style={{
                  marginTop: 16, paddingTop: 14,
                  borderTop: "1px solid rgba(255,255,255,0.05)",
                }}>
                  <SectionLabel>Comments ({(e.comments || []).length})</SectionLabel>

                  {(e.comments || []).length === 0 && (
                    <div style={{ fontSize: 12, color: "#3d5470", marginBottom: 12, fontStyle: "italic" }}>
                      No comments yet — mentors and Mark can leave feedback here.
                    </div>
                  )}

                  {(e.comments || []).map((c, ci) => {
                    const commenter = USERS[c.userId] || { name: c.userId, color: "#7a9ab5" };
                    return (
                      <div key={ci} style={{
                        display: "flex", gap: 10, marginBottom: 10,
                        padding: "10px 12px", borderRadius: 8,
                        background: c.userId === currentUser?.key ? "rgba(224,120,48,0.04)" : "rgba(40,168,88,0.03)",
                        border: `1px solid ${c.userId === currentUser?.key ? "rgba(224,120,48,0.1)" : "rgba(40,168,88,0.08)"}`,
                      }}>
                        <div style={{
                          width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                          background: `${commenter.color}20`, border: `1.5px solid ${commenter.color}40`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 800, color: commenter.color,
                        }}>
                          {commenter.name[0]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: commenter.color }}>{commenter.name}</span>
                            <span style={{ fontSize: 9, color: "#3d5470" }}>
                              {c.timestamp ? new Date(c.timestamp).toLocaleDateString("en", { month: "short", day: "numeric" }) : ""}
                              {c.timestamp ? " · " + new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "#b0bcc8", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
                            {c.text}
                          </div>
                        </div>
                        {c.userId === currentUser?.key && (
                          <button
                            onClick={() => {
                              const updated = { ...e, comments: (e.comments || []).filter((_, i) => i !== ci) };
                              setEntries(prev => prev.map(en => en.id === e.id ? updated : en));
                              setViewingEntry(updated);
                              saveEntryComments(e.id, updated.comments);
                            }}
                            style={{
                              padding: "2px 5px", borderRadius: 3, fontSize: 9, fontWeight: 600,
                              background: "rgba(200,50,50,0.06)", border: "1px solid rgba(200,50,50,0.12)",
                              color: "#b04040", cursor: "pointer", flexShrink: 0, alignSelf: "flex-start",
                            }}
                          >✕</button>
                        )}
                      </div>
                    );
                  })}

                  {/* Add comment */}
                  <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                      background: `${currentUser?.color || "#7a9ab5"}20`,
                      border: `1.5px solid ${currentUser?.color || "#7a9ab5"}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 10, fontWeight: 800, color: currentUser?.color || "#7a9ab5",
                    }}>
                      {currentUser?.name?.[0] || "?"}
                    </div>
                    <textarea
                      id={`comment-${e.id}`}
                      placeholder={currentUser?.role === "mentor" ? "Leave feedback for Mark..." : "Add a note or respond to mentor feedback..."}
                      style={{
                        flex: 1, minHeight: 40, padding: "8px 10px", fontSize: 12, color: "#c0ccd8",
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                        borderRadius: 8, outline: "none", fontFamily: "inherit", resize: "vertical",
                        lineHeight: 1.5, boxSizing: "border-box",
                      }}
                      onKeyDown={(ev) => {
                        if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) {
                          const textarea = document.getElementById(`comment-${e.id}`);
                          const text = textarea.value.trim();
                          if (!text) return;
                          const newComment = {
                            userId: currentUser?.key || "unknown",
                            text,
                            timestamp: new Date().toISOString(),
                          };
                          const updated = { ...e, comments: [...(e.comments || []), newComment] };
                          setEntries(prev => prev.map(en => en.id === e.id ? updated : en));
                          setViewingEntry(updated);
                          saveEntryComments(e.id, updated.comments);
                          textarea.value = "";
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        const textarea = document.getElementById(`comment-${e.id}`);
                        const text = textarea.value.trim();
                        if (!text) return;
                        const newComment = {
                          userId: currentUser?.key || "unknown",
                          text,
                          timestamp: new Date().toISOString(),
                        };
                        const updated = { ...e, comments: [...(e.comments || []), newComment] };
                        setEntries(prev => prev.map(en => en.id === e.id ? updated : en));
                        setViewingEntry(updated);
                        saveEntryComments(e.id, updated.comments);
                        textarea.value = "";
                      }}
                      style={{
                        padding: "8px 14px", borderRadius: 7, fontSize: 11, fontWeight: 700,
                        background: `${currentUser?.color || "#3088cc"}15`,
                        border: `1px solid ${currentUser?.color || "#3088cc"}35`,
                        color: currentUser?.color || "#3088cc",
                        cursor: "pointer", flexShrink: 0, alignSelf: "flex-end",
                      }}
                    >
                      Post
                    </button>
                  </div>
                  <div style={{ fontSize: 9, color: "#2a3c50", marginTop: 4 }}>
                    Ctrl+Enter to post quickly
                  </div>
                </div>

              </Card>
            </div>
          );
        })()}

        {/* ═══ ENTRY EDIT/CREATE ═══ */}
        {editingEntry && (() => {
          const e = editingEntry;
          const upd = (f, v) => setEditingEntry(p => ({ ...p, [f]: v }));
          return (
            <div>
              <button onClick={() => setEditingEntry(null)} style={{ background: "none", border: "none", color: "#4a6080", fontSize: 12, cursor: "pointer", padding: "0 0 10px", fontWeight: 600 }}>← Cancel</button>
              <Card>
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>
                  {entries.find(x => x.id === e.id) ? "Edit Entry" : "New Diary Entry"}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div><label style={lbl}>Date</label><input type="date" value={e.date} onChange={ev => upd("date", ev.target.value)} style={inp} /></div>
                  <div><label style={lbl}>Season / Week</label><input value={e.seasonWeek} onChange={ev => upd("seasonWeek", ev.target.value)} placeholder="e.g. 25/26 — Week 4" style={inp} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div><label style={lbl}>Location / Terrain</label><input value={e.location} onChange={ev => upd("location", ev.target.value)} placeholder="e.g. Keystone — Bergman Bowl" style={inp} /></div>
                  <div><label style={lbl}>Duration</label><input value={e.duration} onChange={ev => upd("duration", ev.target.value)} placeholder="e.g. 2 hours on snow" style={inp} /></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={lbl}>Module Focus</label>
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {MODULE_KEYS.map(m => (
                        <button key={m} onClick={() => upd("moduleFocus", m)} style={{
                          padding: "5px 9px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer",
                          border: e.moduleFocus === m ? `1.5px solid ${MODULE_COLORS_SIMPLE[m]}` : "1.5px solid rgba(255,255,255,0.06)",
                          background: e.moduleFocus === m ? `${MODULE_COLORS_SIMPLE[m]}14` : "rgba(255,255,255,0.015)",
                          color: e.moduleFocus === m ? MODULE_COLORS_SIMPLE[m] : "#4a6080",
                        }}>{m}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={lbl}>Flag</label>
                    <div style={{ display: "flex", gap: 3 }}>
                      {ENTRY_FLAGS.map(f => {
                        const fc = FLAG_COLORS[f];
                        return (
                          <button key={f} onClick={() => upd("flag", f)} style={{
                            padding: "5px 9px", borderRadius: 5, fontSize: 10, fontWeight: 600, cursor: "pointer",
                            border: e.flag === f ? `1.5px solid ${fc.border}` : "1.5px solid rgba(255,255,255,0.06)",
                            background: e.flag === f ? fc.bg : "rgba(255,255,255,0.015)",
                            color: e.flag === f ? fc.text : "#4a6080",
                          }}>{f}</button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Link to Active Learning Objectives</label>
                  <div style={{ padding: "10px", background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8 }}>
                    <LOPicker selected={e.activeLOIds || []} onChange={ids => upd("activeLOIds", ids)} />
                  </div>
                </div>
                {[
                  { f: "workedOn", l: "What I Worked On", p: "Describe the session..." },
                  { f: "observed", l: "What I Noticed / Observed (Self-MA)", p: "What did I see in my skiing or teaching?" },
                  { f: "wentWell", l: "What Went Well", p: "Breakthroughs, progress..." },
                  { f: "struggling", l: "Where I'm Struggling", p: "Blocks, frustrations..." },
                  { f: "questionsForMentors", l: "Questions for Mentors", p: "What do I need help with?" },
                  { f: "nextSteps", l: "Next Steps", p: "Plan for next session..." },
                ].map(s => (
                  <div key={s.f} style={{ marginBottom: 12 }}>
                    <label style={lbl}>{s.l}</label>
                    <textarea value={e[s.f]} onChange={ev => upd(s.f, ev.target.value)} placeholder={s.p} style={txta} />
                  </div>
                ))}

                {/* ── Attachments ──────────────────────────── */}
                <div style={{ marginBottom: 14 }}>
                  <label style={lbl}>Links & Attachments</label>
                  <div style={{
                    padding: "12px", background: "rgba(255,255,255,0.01)",
                    border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8,
                  }}>
                    {(e.attachments || []).length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        {(e.attachments || []).map((att, ai) => {
                          const isYT = att.url && (att.url.includes("youtube.com") || att.url.includes("youtu.be"));
                          const isDoc = att.url && (att.url.includes("docs.google") || att.url.includes("drive.google") || att.url.includes(".pdf") || att.url.includes(".docx"));
                          const icon = isYT ? "🎬" : isDoc ? "📄" : "🔗";
                          return (
                            <div key={ai} style={{
                              display: "flex", alignItems: "center", gap: 8,
                              padding: "7px 10px", marginBottom: 4, borderRadius: 6,
                              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                            }}>
                              <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: 11, fontWeight: 600, color: "#a0b0c0",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                  {att.label || att.url}
                                </div>
                                <div style={{
                                  fontSize: 10, color: "#4a6080",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                  {att.url}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  const next = [...(e.attachments || [])];
                                  next.splice(ai, 1);
                                  upd("attachments", next);
                                }}
                                style={{
                                  padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700,
                                  background: "rgba(200,50,50,0.06)", border: "1px solid rgba(200,50,50,0.15)",
                                  color: "#b04040", cursor: "pointer", flexShrink: 0,
                                }}
                              >✕</button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Add new link form */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <input
                        id="att-url"
                        placeholder="Paste URL (YouTube, Google Doc, any link)"
                        style={{ ...inp, flex: "2 1 200px", fontSize: 11 }}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") {
                            ev.preventDefault();
                            const urlEl = document.getElementById("att-url");
                            const lblEl = document.getElementById("att-label");
                            const url = urlEl.value.trim();
                            if (!url) return;
                            const label = lblEl.value.trim();
                            upd("attachments", [...(e.attachments || []), { url, label: label || "", type: "link" }]);
                            urlEl.value = "";
                            lblEl.value = "";
                          }
                        }}
                      />
                      <input
                        id="att-label"
                        placeholder="Label (optional)"
                        style={{ ...inp, flex: "1 1 120px", fontSize: 11 }}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") {
                            ev.preventDefault();
                            const urlEl = document.getElementById("att-url");
                            const lblEl = document.getElementById("att-label");
                            const url = urlEl.value.trim();
                            if (!url) return;
                            const label = lblEl.value.trim();
                            upd("attachments", [...(e.attachments || []), { url, label: label || "", type: "link" }]);
                            urlEl.value = "";
                            lblEl.value = "";
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          const urlEl = document.getElementById("att-url");
                          const lblEl = document.getElementById("att-label");
                          const url = urlEl.value.trim();
                          if (!url) return;
                          const label = lblEl.value.trim();
                          upd("attachments", [...(e.attachments || []), { url, label: label || "", type: "link" }]);
                          urlEl.value = "";
                          lblEl.value = "";
                        }}
                        style={{
                          padding: "8px 14px", borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: "rgba(48,136,204,0.12)", border: "1px solid rgba(48,136,204,0.3)",
                          color: "#3088cc", cursor: "pointer", flexShrink: 0,
                        }}
                      >+ Add</button>
                    </div>
                    <div style={{ fontSize: 10, color: "#3d5470", marginTop: 6 }}>
                      YouTube videos, Google Docs, Drive files, or any URL. Press Enter or click Add.
                    </div>
                  </div>
                </div>

                <button onClick={saveEntry} style={{
                  width: "100%", padding: "11px", borderRadius: 7, border: "none",
                  background: "linear-gradient(135deg, #e07830, #c06020)", color: "#fff",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>Save Entry</button>
              </Card>
            </div>
          );
        })()}

        {/* ═══ TAB: BASELINE SCORECARD ═══ */}
        {tab === "baseline" && !isSubView && (() => {
          const totalScored = Object.keys(baselineScores).filter(k => baselineScores[k]?.mark > 0).length;
          const totalGates = ALL_GATES.length;
          const avgScore = totalScored > 0
            ? (Object.values(baselineScores).reduce((sum, s) => sum + (s?.mark || 0), 0) / totalScored).toFixed(1)
            : "—";

          return (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#4a6080", lineHeight: 1.55, marginBottom: 12 }}>
                  One-time development snapshot. Score yourself on the Fitts & Posner 1–6 scale. Mentors (Chris, Gates, Mike) score independently — compare in the baseline conversation to agree on strengths, gaps, and first LOs.
                </div>

                {/* Summary bar */}
                <div style={{
                  display: "flex", gap: 16, padding: "12px 14px", marginBottom: 6,
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8,
                  flexWrap: "wrap",
                }}>
                  <div>
                    <div style={{ fontSize: 9, color: "#4a6080", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Scored</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#d0d8e0" }}>{totalScored}<span style={{ fontSize: 11, color: "#4a6080", fontWeight: 500 }}>/{totalGates}</span></div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#4a6080", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Avg Score</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: Number(avgScore) >= 4 ? "#28a858" : "#e07830" }}>{avgScore}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#4a6080", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>At or Above 4</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#28a858" }}>
                      {Object.values(baselineScores).filter(s => (s?.mark || 0) >= 4).length}
                    </div>
                  </div>
                </div>

                {/* Fitts & Posner legend - compact */}
                <div style={{
                  display: "flex", gap: 2, flexWrap: "wrap", marginBottom: 16, padding: "8px 10px",
                  background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: 6,
                }}>
                  {FITTS_POSNER.map(f => (
                    <span key={f.score} style={{
                      fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 3,
                      background: f.score >= 4 ? "rgba(40,168,88,0.08)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${f.score >= 4 ? "rgba(40,168,88,0.18)" : "rgba(255,255,255,0.04)"}`,
                      color: f.score >= 4 ? "#28a858" : "#4a6080",
                    }}>
                      {f.score} {f.label}
                    </span>
                  ))}
                </div>
              </div>

              {Object.entries(GATES).map(([modName, mod]) => {
                const modScored = mod.gates.filter(g => baselineScores[g.id]?.mark > 0).length;
                return (
                  <div key={modName} style={{ marginBottom: 24 }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "baseline",
                      marginBottom: 8, paddingBottom: 6, borderBottom: `2px solid ${mod.color}30`,
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: mod.color }}>{modName}</span>
                      <span style={{ fontSize: 10, color: "#4a6080" }}>{modScored}/{mod.gates.length} scored</span>
                    </div>

                    {/* Column headers */}
                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr 42px 42px 42px 42px 1fr",
                      gap: 4, padding: "6px 8px", marginBottom: 2,
                      background: "rgba(255,255,255,0.02)", borderRadius: 6,
                    }}>
                      <span style={{ fontSize: 9, color: "#4a6080", fontWeight: 700, textTransform: "uppercase" }}>Criterion</span>
                      <span style={{ fontSize: 9, color: "#e8a050", fontWeight: 700, textAlign: "center" }}>Mark</span>
                      <span style={{ fontSize: 9, color: "#28a858", fontWeight: 700, textAlign: "center" }}>Chris</span>
                      <span style={{ fontSize: 9, color: "#28a858", fontWeight: 700, textAlign: "center" }}>Gates</span>
                      <span style={{ fontSize: 9, color: "#28a858", fontWeight: 700, textAlign: "center" }}>Mike</span>
                      <span style={{ fontSize: 9, color: "#4a6080", fontWeight: 700 }}>Notes</span>
                    </div>

                    {mod.gates.map((gate, gi) => {
                      const scores = baselineScores[gate.id] || { mark: 0, chris: 0, gates: 0, mike: 0 };
                      const note = baselineNotes[gate.id] || "";
                      const prevCategory = gi > 0 ? mod.gates[gi - 1].category : null;
                      const showCategoryHeader = gate.category && gate.category !== prevCategory;
                      const updateScore = (who, val) => {
                        updateBaselineScore(gate.id, who, val);
                      };
                      const updateNote = (val) => {
                        updateBaselineNote(gate.id, val);
                      };

                      const scoreSelect = (who, value) => (
                        <select
                          value={value || ""}
                          onChange={ev => updateScore(who, ev.target.value)}
                          style={{
                            width: "100%", padding: "4px 2px", fontSize: 12, fontWeight: 700,
                            textAlign: "center", borderRadius: 4, cursor: "pointer",
                            background: value >= 4 ? "rgba(40,168,88,0.12)" : value > 0 ? "rgba(224,120,48,0.1)" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${value >= 4 ? "rgba(40,168,88,0.3)" : value > 0 ? "rgba(224,120,48,0.2)" : "rgba(255,255,255,0.06)"}`,
                            color: value >= 4 ? "#28a858" : value > 0 ? "#e07830" : "#3d5470",
                            outline: "none", fontFamily: "inherit", appearance: "auto",
                          }}
                        >
                          <option value="">—</option>
                          {FITTS_POSNER.map(f => (
                            <option key={f.score} value={f.score}>{f.score}</option>
                          ))}
                        </select>
                      );

                      return (
                        <div key={gate.id}>
                          {showCategoryHeader && (
                            <div style={{
                              padding: "6px 8px 3px",
                              marginTop: gi > 0 ? 8 : 0,
                              borderBottom: `1.5px solid ${mod.color}25`,
                              marginBottom: 2,
                            }}>
                              <span style={{
                                fontSize: 9, fontWeight: 800, color: mod.color,
                                textTransform: "uppercase", letterSpacing: "0.08em",
                              }}>
                                {gate.category}
                              </span>
                            </div>
                          )}
                          <div style={{
                            display: "grid", gridTemplateColumns: "1fr 42px 42px 42px 42px 1fr",
                            gap: 4, padding: "6px 8px", alignItems: "center",
                            background: gi % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
                            borderRadius: 4,
                          }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: mod.color, flexShrink: 0 }}>{gate.id}</span>
                            <span style={{ fontSize: 11, color: "#a0b0c0", lineHeight: 1.3 }}>{gate.criterion}</span>
                          </div>
                          {scoreSelect("mark", scores.mark)}
                          {scoreSelect("chris", scores.chris)}
                          {scoreSelect("gates", scores.gates)}
                          {scoreSelect("mike", scores.mike)}
                          <input
                            value={note}
                            onChange={ev => updateNote(ev.target.value)}
                            placeholder="Priority / notes"
                            style={{
                              width: "100%", padding: "4px 6px", fontSize: 10, color: "#a0b0c0",
                              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)",
                              borderRadius: 4, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                            }}
                          />
                        </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Baseline Conversation Summary */}
              <Card style={{ marginTop: 10, borderLeft: "3px solid #e07830" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#e8a050", marginBottom: 12 }}>
                  Baseline Conversation Summary
                </div>
                <div style={{ fontSize: 10, color: "#4a6080", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Top Strengths (agreed)
                </div>
                <textarea
                  value={baselineNotes._strengths || ""}
                  onChange={e => setBaselineNotes(p => ({ ...p, _strengths: e.target.value }))}
                  placeholder="Agreed strengths from the baseline conversation..."
                  style={{ width: "100%", minHeight: 50, padding: "8px 10px", fontSize: 12, color: "#c0ccd8", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box", marginBottom: 12 }}
                />
                <div style={{ fontSize: 10, color: "#4a6080", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Top Development Priorities (agreed)
                </div>
                <textarea
                  value={baselineNotes._priorities || ""}
                  onChange={e => setBaselineNotes(p => ({ ...p, _priorities: e.target.value }))}
                  placeholder="Agreed development priorities..."
                  style={{ width: "100%", minHeight: 50, padding: "8px 10px", fontSize: 12, color: "#c0ccd8", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box", marginBottom: 12 }}
                />
                <div style={{ fontSize: 10, color: "#4a6080", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Mentor Notes from Baseline Conversation
                </div>
                <textarea
                  value={baselineNotes._mentorNotes || ""}
                  onChange={e => setBaselineNotes(p => ({ ...p, _mentorNotes: e.target.value }))}
                  placeholder="Chris / Gates / Mike notes..."
                  style={{ width: "100%", minHeight: 50, padding: "8px 10px", fontSize: 12, color: "#c0ccd8", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }}
                />
              </Card>
            </>
          );
        })()}

        {/* ═══ TAB: LEARNING OBJECTIVES LIST ═══ */}
        {tab === "los" && !isSubView && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#4a6080" }}>
                Mentor-defined objectives tied to assessment gates. Mentors: create LOs here — Mark tracks progress.
              </div>
              <button onClick={newLO} style={{
                padding: "7px 14px", borderRadius: 6, border: "1px solid rgba(224,120,48,0.4)",
                background: "rgba(224,120,48,0.1)", color: "#e8a050", fontSize: 11, fontWeight: 700, cursor: "pointer",
                whiteSpace: "nowrap", flexShrink: 0, marginLeft: 10,
              }}>+ Add LO</button>
            </div>
            {los.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#2a3c50" }}>
                <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>📋</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#4a6080" }}>No Learning Objectives yet</div>
                <div style={{ fontSize: 12, color: "#2a3c50", marginTop: 4 }}>Mentors: tap "+ Add LO" to assign Mark's first objective.</div>
              </div>
            ) : (
              los.map(lo => {
                const mc = MODULE_COLORS_SIMPLE[lo.module] || "#7a9ab5";
                const entryCount = entries.filter(e => (e.activeLOIds || []).includes(lo.id)).length;
                return (
                  <div key={lo.id} onClick={() => setViewingLO(lo)} style={{ cursor: "pointer" }}>
                    <Card style={{ borderLeft: `3px solid ${mc}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: mc }}>{lo.objId}</span>
                            <StatusBadge status={lo.status} />
                            <span style={{ fontSize: 10, color: "#3d5470" }}>by {lo.assignedBy}</span>
                            {entryCount > 0 && <span style={{ fontSize: 10, color: "#506880" }}>{entryCount} {entryCount === 1 ? "entry" : "entries"}</span>}
                          </div>
                          <div style={{ fontSize: 13, color: "#a0b0c0", lineHeight: 1.45, marginBottom: lo.gates.length > 0 ? 6 : 0 }}>
                            {lo.objective || "Objective not yet defined"}
                          </div>
                          {lo.gates.length > 0 && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                              {lo.gates.map(g => <GateChip key={g} gateId={g} small />)}
                            </div>
                          )}
                        </div>
                        {lo.score && (
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%", flexShrink: 0, marginLeft: 10,
                            background: lo.score >= 4 ? "rgba(40,168,88,0.15)" : "rgba(224,120,48,0.12)",
                            border: `1.5px solid ${lo.score >= 4 ? "rgba(40,168,88,0.4)" : "rgba(224,120,48,0.3)"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 13, fontWeight: 800, color: lo.score >= 4 ? "#28a858" : "#e07830",
                          }}>
                            {lo.score}
                          </div>
                        )}
                      </div>
                    </Card>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ═══ TAB: DIARY ═══ */}
        {tab === "diary" && !isSubView && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 12, color: "#4a6080" }}>Sessions linked to LOs — gates auto-derived.</div>
              <button onClick={newEntry} style={{
                padding: "7px 14px", borderRadius: 6, border: "1px solid rgba(224,120,48,0.4)",
                background: "rgba(224,120,48,0.1)", color: "#e8a050", fontSize: 11, fontWeight: 700, cursor: "pointer",
                whiteSpace: "nowrap", flexShrink: 0,
              }}>+ New Entry</button>
            </div>
            {entries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#2a3c50" }}>
                <div style={{ fontSize: 32, marginBottom: 8, opacity: 0.4 }}>⛷</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#4a6080" }}>No diary entries yet</div>
                <div style={{ fontSize: 12, color: "#2a3c50", marginTop: 4 }}>After your next session, tap "+ New Entry" to log it.</div>
              </div>
            ) : (
              entries.map(e => {
                const fc = FLAG_COLORS[e.flag] || FLAG_COLORS["FYI"];
                const mc = MODULE_COLORS_SIMPLE[e.moduleFocus] || "#7a9ab5";
                const linkedLOs = los.filter(l => (e.activeLOIds || []).includes(l.id));
                const derivedGates = [...new Set(linkedLOs.flatMap(l => l.gates || []))];
                return (
                  <div key={e.id} onClick={() => setViewingEntry(e)} style={{ cursor: "pointer" }}>
                    <Card>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{
                          width: 44, flexShrink: 0, textAlign: "center", padding: "5px 0",
                          borderRadius: 6, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)",
                        }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#b0bcc8", lineHeight: 1 }}>
                            {new Date(e.date + "T12:00:00").getDate()}
                          </div>
                          <div style={{ fontSize: 8, color: "#3d5470", fontWeight: 700, textTransform: "uppercase", marginTop: 1 }}>
                            {new Date(e.date + "T12:00:00").toLocaleString("en", { month: "short" })}
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 3 }}>
                            <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 700, background: fc.bg, border: `1px solid ${fc.border}`, color: fc.text }}>{e.flag}</span>
                            <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 9, fontWeight: 600, background: `${mc}12`, border: `1px solid ${mc}25`, color: mc }}>{e.moduleFocus}</span>
                            {e.location && <span style={{ fontSize: 10, color: "#3d5470" }}>{e.location}</span>}
                            {(e.attachments || []).length > 0 && <span style={{ fontSize: 9, color: "#3088cc" }}>📎 {e.attachments.length}</span>}
                            {(e.comments || []).length > 0 && <span style={{ fontSize: 9, color: "#28a858" }}>💬 {e.comments.length}</span>}
                          </div>
                          <div style={{ fontSize: 12, color: "#8898a8", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                            {e.workedOn || "No description"}
                          </div>
                          {(linkedLOs.length > 0 || derivedGates.length > 0) && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 5 }}>
                              {linkedLOs.map(lo => (
                                <span key={lo.id} style={{ fontSize: 9, fontWeight: 700, color: MODULE_COLORS_SIMPLE[lo.module], padding: "1px 5px", borderRadius: 3, background: `${MODULE_COLORS_SIMPLE[lo.module]}12`, border: `1px solid ${MODULE_COLORS_SIMPLE[lo.module]}20` }}>
                                  {lo.objId}
                                </span>
                              ))}
                              {derivedGates.slice(0, 5).map(g => <GateChip key={g} gateId={g} small />)}
                              {derivedGates.length > 5 && <span style={{ fontSize: 9, color: "#3d5470", alignSelf: "center" }}>+{derivedGates.length - 5}</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })
            )}
          </>
        )}

        {/* ═══ TAB: GATE READINESS ═══ */}
        {tab === "gates" && !isSubView && (
          <>
            <div style={{ fontSize: 12, color: "#4a6080", marginBottom: 16, lineHeight: 1.5 }}>
              Each gate is an exam readiness criterion. Gates light up as LOs develop them. A gate is ready when a mentor verifies the linked LO at 4+ (High Associative).
            </div>

            {/* Fitts & Posner Legend */}
            <div style={{
              display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 10, padding: "10px 12px",
              background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8,
            }}>
              {FITTS_POSNER.map(f => (
                <span key={f.score} style={{
                  fontSize: 9, fontWeight: 600, padding: "3px 7px", borderRadius: 4,
                  background: f.score >= 4 ? "rgba(40,168,88,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${f.score >= 4 ? "rgba(40,168,88,0.2)" : "rgba(255,255,255,0.05)"}`,
                  color: f.score >= 4 ? "#28a858" : "#506880",
                }}>
                  {f.score} {f.label}
                </span>
              ))}
            </div>

            {/* Score column legend */}
            <div style={{
              display: "flex", gap: 14, alignItems: "center", marginBottom: 18, padding: "8px 12px",
              background: "rgba(255,255,255,0.01)", border: "1px solid rgba(255,255,255,0.03)", borderRadius: 6,
              flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 20, height: 16, borderRadius: 3, background: "rgba(40,168,88,0.12)", border: "1px solid rgba(40,168,88,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: "#28a858" }}>✓</div>
                <span style={{ fontSize: 10, color: "#6a8098" }}>Best examiner score (gate passes at 4+)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 20, height: 16, borderRadius: 3, background: "rgba(180,80,40,0.06)", border: "1px dashed rgba(180,80,40,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 800, color: "#b45028" }}>2</div>
                <span style={{ fontSize: 10, color: "#6a8098" }}>Baseline lowest (hover for breakdown)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#28a858" }}>C</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#28a858" }}>G</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: "#28a858" }}>M</span>
                <span style={{ fontSize: 10, color: "#6a8098" }}>= Chris · Gates · Mike sign-off scores</span>
              </div>
            </div>

            {Object.entries(GATES).map(([modName, mod]) => {
              const verifiedCount = mod.gates.filter(g => {
                const gs = gateScores[g.id] || {};
                return [gs.chris, gs.gates, gs.mike].some(s => s >= 4);
              }).length;
              const inProgressCount = mod.gates.filter(g => {
                const gs = gateScores[g.id] || {};
                const hasAnyScore = [gs.chris, gs.gates, gs.mike].some(s => s > 0);
                const passed = [gs.chris, gs.gates, gs.mike].some(s => s >= 4);
                return hasAnyScore && !passed;
              }).length;

              return (
                <div key={modName} style={{ marginBottom: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: mod.color }}>{modName}</span>
                    <span style={{ fontSize: 11, color: "#4a6080" }}>
                      <span style={{ color: "#28a858", fontWeight: 700 }}>{verifiedCount}</span> passed · <span style={{ color: "#e07830", fontWeight: 600 }}>{inProgressCount}</span> in progress · {mod.gates.length} total
                    </span>
                  </div>
                  <div style={{ height: 3, background: "rgba(255,255,255,0.04)", borderRadius: 2, marginBottom: 8, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(verifiedCount / mod.gates.length) * 100}%`, background: mod.color, borderRadius: 2, transition: "width 0.4s ease" }} />
                  </div>

                  {/* Column headers */}
                  <div style={{
                    display: "grid", gridTemplateColumns: "28px 28px 1fr 38px 38px 38px",
                    gap: 5, padding: "4px 10px", marginBottom: 2,
                  }}>
                    <span style={{ fontSize: 8, color: "#4a6080", fontWeight: 700, textAlign: "center" }}>NOW</span>
                    <span style={{ fontSize: 8, color: "#4a6080", fontWeight: 700, textAlign: "center" }}>BASE</span>
                    <span style={{ fontSize: 8, color: "#4a6080", fontWeight: 700 }}>CRITERION</span>
                    <span style={{ fontSize: 8, color: "#28a858", fontWeight: 700, textAlign: "center" }}>C</span>
                    <span style={{ fontSize: 8, color: "#28a858", fontWeight: 700, textAlign: "center" }}>G</span>
                    <span style={{ fontSize: 8, color: "#28a858", fontWeight: 700, textAlign: "center" }}>M</span>
                  </div>

                  {mod.gates.map((gate, gi) => {
                    const linkedLOs = gateToLOs[gate.id] || [];
                    const entryCount = (gateToEntries[gate.id] || []).length;
                    const hasLO = linkedLOs.length > 0;

                    // Show category subheading when it changes
                    const prevCategory = gi > 0 ? mod.gates[gi - 1].category : null;
                    const showCategoryHeader = gate.category && gate.category !== prevCategory;

                    // Gate scores from examiners — this is the real gate status
                    const gs = gateScores[gate.id] || { chris: 0, gates: 0, mike: 0 };
                    const examinerScores = [gs.chris, gs.gates, gs.mike].filter(s => s > 0);
                    const bestGateScore = examinerScores.length > 0 ? Math.max(...examinerScores) : 0;
                    const isPassed = examinerScores.some(s => s >= 4);

                    // Baseline: lowest non-zero score across all scorers
                    const bs = baselineScores[gate.id] || {};
                    const allBaselineScores = [bs.mark, bs.chris, bs.gates, bs.mike].filter(s => s > 0);
                    const lowestBaseline = allBaselineScores.length > 0 ? Math.min(...allBaselineScores) : 0;
                    const hasBaseline = allBaselineScores.length > 0;

                    const updateGateScore = (who, val) => {
                      updateGateExaminerScore(gate.id, who, val);
                    };

                    const examinerSelect = (who, value) => (
                      <select
                        value={value || ""}
                        onChange={ev => updateGateScore(who, ev.target.value)}
                        style={{
                          width: "100%", padding: "3px 1px", fontSize: 11, fontWeight: 700,
                          textAlign: "center", borderRadius: 4, cursor: "pointer",
                          background: value >= 4 ? "rgba(40,168,88,0.15)" : value > 0 ? "rgba(224,120,48,0.1)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${value >= 4 ? "rgba(40,168,88,0.35)" : value > 0 ? "rgba(224,120,48,0.2)" : "rgba(255,255,255,0.06)"}`,
                          color: value >= 4 ? "#28a858" : value > 0 ? "#e07830" : "#3d5470",
                          outline: "none", fontFamily: "inherit", appearance: "auto",
                        }}
                      >
                        <option value="">—</option>
                        {FITTS_POSNER.map(f => (
                          <option key={f.score} value={f.score}>{f.score}</option>
                        ))}
                      </select>
                    );

                    return (
                      <div key={gate.id}>
                        {showCategoryHeader && (
                          <div style={{
                            padding: "8px 10px 4px",
                            marginTop: gi > 0 ? 10 : 0,
                            borderBottom: `1.5px solid ${mod.color}25`,
                            marginBottom: 4,
                          }}>
                            <span style={{
                              fontSize: 10, fontWeight: 800, color: mod.color,
                              textTransform: "uppercase", letterSpacing: "0.08em",
                            }}>
                              {gate.category}
                            </span>
                          </div>
                        )}
                        <div style={{
                          display: "grid", gridTemplateColumns: "28px 28px 1fr 38px 38px 38px",
                          gap: 5, padding: "8px 10px", alignItems: "start",
                          borderBottom: "1px solid rgba(255,255,255,0.025)",
                          opacity: isPassed ? 0.65 : 1,
                        }}>
                        {/* Current best gate score */}
                        <div style={{
                          width: 28, height: 22, borderRadius: 4,
                          background: isPassed ? "rgba(40,168,88,0.15)" : bestGateScore > 0 ? `${mod.color}12` : "rgba(255,255,255,0.02)",
                          border: `1px solid ${isPassed ? "rgba(40,168,88,0.35)" : bestGateScore > 0 ? `${mod.color}25` : "rgba(255,255,255,0.05)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 800,
                          color: isPassed ? "#28a858" : bestGateScore > 0 ? mod.color : "#2a3c50",
                        }}>
                          {isPassed ? "✓" : bestGateScore > 0 ? bestGateScore : "—"}
                        </div>
                        {/* Baseline lowest score */}
                        <div title={hasBaseline ? `Baseline lowest: ${lowestBaseline} (M:${bs.mark||"—"} C:${bs.chris||"—"} G:${bs.gates||"—"} Mk:${bs.mike||"—"})` : "No baseline scored"}
                          style={{
                            width: 28, height: 22, borderRadius: 4,
                            background: hasBaseline
                              ? lowestBaseline >= 4 ? "rgba(40,168,88,0.08)" : "rgba(180,80,40,0.08)"
                              : "rgba(255,255,255,0.01)",
                            border: `1px dashed ${hasBaseline
                              ? lowestBaseline >= 4 ? "rgba(40,168,88,0.3)" : "rgba(180,80,40,0.25)"
                              : "rgba(255,255,255,0.04)"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 9, fontWeight: 700,
                            color: hasBaseline
                              ? lowestBaseline >= 4 ? "#28a858" : "#b45028"
                              : "#2a3c50",
                          }}>
                          {hasBaseline ? lowestBaseline : "·"}
                        </div>
                        {/* Criterion + LO badges */}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: mod.color }}>{gate.id}</span>
                            <span style={{
                              fontSize: 12, color: isPassed ? "#6a8098" : hasLO ? "#a0b0c0" : "#3d5470",
                              textDecoration: isPassed ? "line-through" : "none",
                            }}>
                              {gate.criterion}
                            </span>
                          </div>
                          {(hasLO || entryCount > 0) && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 3 }}>
                              {linkedLOs.map(lo => (
                                <span key={lo.id} onClick={(ev) => { ev.stopPropagation(); setViewingLO(lo); }} style={{
                                  fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 3, cursor: "pointer",
                                  background: LO_STATUS_COLORS[lo.status].bg,
                                  border: `1px solid ${LO_STATUS_COLORS[lo.status].border}`,
                                  color: LO_STATUS_COLORS[lo.status].text,
                                }}>
                                  {lo.objId} · {lo.status}
                                </span>
                              ))}
                              {entryCount > 0 && (
                                <span style={{ fontSize: 9, color: "#506880", alignSelf: "center" }}>
                                  {entryCount} {entryCount === 1 ? "entry" : "entries"}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Examiner score dropdowns */}
                        {examinerSelect("chris", gs.chris)}
                        {examinerSelect("gates", gs.gates)}
                        {examinerSelect("mike", gs.mike)}
                      </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </div>

      <style>{`
        input:focus, textarea:focus, select:focus {
          border-color: rgba(224,120,48,0.35) !important;
          box-shadow: 0 0 0 2px rgba(224,120,48,0.06);
        }
        select { appearance: auto; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 3px; }
      `}</style>
    </div>
  );
}
