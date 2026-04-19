import React, { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { SHEETS_API_URL as _configUrl } from "./config";

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
const LO_STATUSES = ["Not Started", "In Progress", "Ready for Review", "Verified"];
const LO_STATUS_COLORS = {
  "Not Started": { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)", text: "#5a7898" },
  "In Progress": { bg: "rgba(230,120,48,0.1)", border: "rgba(230,120,48,0.3)", text: "#e07830" },
  "Ready for Review": { bg: "rgba(200,170,50,0.1)", border: "rgba(200,170,50,0.3)", text: "#c8aa32" },
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

// ── Seasons ──────────────────────────────────────────────
const SEASONS = ["25/26", "26/27", "27/28"];
const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  // Season runs Oct–Apr: Oct 2025 through Apr 2026 = "25/26"
  if (month >= 9) return `${String(year).slice(2)}/${String(year + 1).slice(2)}`;
  return `${String(year - 1).slice(2)}/${String(year).slice(2)}`;
};
const DEFAULT_SEASON = getCurrentSeason();

const FITTS_POSNER = [
  { score: 1, label: "Low Cognitive", short: "1" },
  { score: 2, label: "High Cognitive", short: "2" },
  { score: 3, label: "Low Associative", short: "3" },
  { score: 4, label: "High Associative — PASS", short: "4 ✓" },
  { score: 5, label: "Low Autonomous", short: "5" },
  { score: 6, label: "High Autonomous", short: "6" },
];

// ═══════════════════════════════════════════════════════════════════════
// SUGGESTED ACTIVITIES — AT Program Guide Learning Experiences
// ═══════════════════════════════════════════════════════════════════════

const LEARNING_EXPERIENCES = {
  "Professionalism": {
    color: "#8a70b8",
    items: [
      { id: "LE-P1", title: "Responding When Plans Change", desc: "Reflect on how you respond and interact with others when things don't go according to plan (sudden weather change, terrain change, shift in group social structure)." },
      { id: "LE-P2", title: "Emotional & Physical Self-Awareness", desc: "Identify what you need to pay attention to emotionally and physically to adjust and adapt in a training environment. What drives you nuts, and how do you manage it externally?" },
      { id: "LE-P3", title: "Supporting Others", desc: "Reflect on situations where things were going your way but not for others. How did you support them without detracting from their experience?" },
    ],
  },
  "Module 1 — Technical / MA": {
    color: "#e07830",
    items: [
      { id: "LE-MA1", title: "Analyzing Ideal Skiing Performance", desc: "Analyze a world-class skier on or off-piste using observations, physics/skiing mechanics, biomechanics, ski design and tuning, and/or boot alignment." },
      { id: "LE-MA2", title: "Differences Between Cert Levels", desc: "Outline differences in PSIA standards (L1, L2, L3) for MA and Technical Understanding. Reference IDP, National Standards, PSIA-RM Assessment Forms." },
      { id: "LE-MA3", title: "Prioritization", desc: "Using video of a cert candidate, prioritize Fundamentals/Skills they should develop. Reflect on different ways to set priorities." },
      { id: "LE-MA4", title: "Multiple Skill-to-Skill Relationships", desc: "Identify and describe body-to-ski cause and effect; describe relationships from both directions; use biomechanics and physics." },
      { id: "LE-MA5", title: "Personal Alignment & Boot-fitting", desc: "Participate in or observe a boot fitting. Identify how alignment affects body-to-ski performance and how to spot misalignment in a skier." },
      { id: "LE-MA6", title: "Tactics", desc: "Using video, identify a candidate's tactical choices and describe how changes would force skill-to-skill changes and enhance performance." },
      { id: "LE-MA7", title: "Physics, Ski Design & Biomechanics", desc: "Attend a Basic Skiing Physics, Ski Design & Tuning, or Biomechanics/Anatomy clinic or seminar." },
      { id: "LE-MA8", title: "MA Practice Sessions", desc: "Participate in a minimum of two MA practice sessions with a mentor — watching candidates from multiple levels; deliver AT-level analysis using multiple and blended skill-to-skill relationships." },
      { id: "LE-MA9", title: "Center Line & Common Threads", desc: "Explain how Common Threads highlight mechanical focuses observable at all levels; identify activities from the IDP that develop a chosen Common Thread." },
    ],
  },
  "Module 2 — Skiing": {
    color: "#3088cc",
    items: [
      { id: "LE-SK1", title: "Personal Skiing vs. Ideals", desc: "Analyze your skiing vs. a skier who more closely represents ideal. Identify specific skill-to-skill differences and your plan to minimize them." },
      { id: "LE-SK2", title: "Personal Development Over Time", desc: "Analyze your skiing at two distinct points in time. What was learned, what changed, how do you know learning occurred?" },
      { id: "LE-SK3", title: "Race/Drill-Based Practice", desc: "On-piste closed environment race/drill-based practice session — use stubbies and/or brushes for skill development; develop ideas for setting up environments with varied learning opportunities." },
      { id: "LE-SK4", title: "Problem Solving / Skill Development", desc: "Structured training using a 50/50 failure-success mix. Variations to tasks, combining tasks for accuracy, changing environment without changing speed, changing speed without changing environment, varying skill blends." },
      { id: "LE-SK5", title: "Center Line & Common Threads (Skiing)", desc: "Ski through Center Line milestones using Common Threads to maintain consistent mechanics; alternate between Center Line milestones and similar-speed tasks." },
    ],
  },
  "Module 3 — Clinic Leading": {
    color: "#28a858",
    items: [
      { id: "LE-CL1", title: "What Makes a Great Trainer?", desc: "Analyze a trainer/clinic leader/examiner you consider a truly great educator. How do they use the Learning Connection Model?" },
      { id: "LE-CL2", title: "Creating Learning Outcomes", desc: "Create observable, measurable LOs for 1-hour, 1-day, and 2-day clinics across various audiences (New Hires, L1–L3 candidates) and settings." },
      { id: "LE-CL3", title: "Progressions — Skills to Ski Design", desc: "Create two progressions of 3–5 steps each connecting Skills/Fundamentals to Ski Design, Turning, and Speed Control." },
      { id: "LE-CL4", title: "Experiential Learning", desc: "Create 5 tasks that develop skills through skill-to-skill relationships for a defined audience; include modifications for higher and lower skill levels." },
      { id: "LE-CL5", title: "Variations & Lateral Learning", desc: "Build a 3-task progression from an Individual Fundamental Assessment Activity using Speed, Environment, and/or Accuracy modifications; demonstrate Center Line improvement through Lateral Learning." },
      { id: "LE-CL6", title: "Feedback", desc: "Reflect on timeliness, detail and accuracy, right amount, and relevance of feedback in a training clinic." },
      { id: "LE-CL7", title: "Clinic Auditing", desc: "Audit a training clinic using reflective observation (not evaluation)." },
      { id: "LE-CL8", title: "Reverse Audit", desc: "Lead a training clinic and debrief using reflective observation. What will you do the same / differently next time?" },
    ],
  },
};

const ALL_LEs = Object.values(LEARNING_EXPERIENCES).flatMap(mod => mod.items);

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
      padding: "3px 8px", borderRadius: 5, fontSize: 14, fontWeight: 700,
      background: c.bg, border: `1px solid ${c.border}`, color: c.text,
    }}>
      {status}
    </span>
  );
};

const SectionLabel = ({ children }) => (
  <div style={{
    fontSize: 14, color: "#607898", fontWeight: 700,
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
// API CONFIG
// ═══════════════════════════════════════════════════════════════════════
const API_URL = _configUrl || "";

const API_ENABLED = !!API_URL;

if (API_ENABLED) { console.log("AT Tracker API connected"); }
else { console.log("AT Tracker API: NOT CONFIGURED — set VITE_SHEETS_API_URL in .env.local or Vercel"); }

// Google Apps Script API helpers
// GAS redirects GET requests (302) which causes CORS issues
// Solution: use POST for everything — GAS handles POST without redirect issues via doPost

async function apiGet(sheetName) {
  if (!API_ENABLED) return [];
  try {
    // Send as POST with action in the body to avoid GET redirect
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ _action: "getAll", _sheet: sheetName }),
    });
    const data = await res.json();
    console.log(`Loaded ${sheetName}:`, (data.rows || []).length, "rows");
    return data.rows || [];
  } catch (e) {
    console.error("API GET error for", sheetName, e);
    return [];
  }
}

async function apiPost(action, sheetName, rowData, id) {
  if (!API_ENABLED) return;
  try {
    const payload = { ...rowData, _action: action, _sheet: sheetName };
    if (id) payload._id = id;
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
  } catch (e) { console.error(`API ${action} error:`, e); }
}

function apiCreate(sheetName, rowData) { return apiPost("create", sheetName, rowData); }
function apiUpdate(sheetName, rowData) { return apiPost("update", sheetName, rowData); }
function apiDelete(sheetName, id) { return apiPost("delete", sheetName, null, id); }

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
  const [diaryFilter, setDiaryFilter] = useState("all");
  const [leStatus, setLeStatus] = useState({});
  const [videoData, setVideoData] = useState({});
  const [baselineComments, setBaselineComments] = useState({});
  const [expandedBaselineGate, setExpandedBaselineGate] = useState(null);
  const [catFilter, setCatFilter] = useState("all");
  const [compareMode, setCompareMode] = useState(false);
  const [compareA, setCompareA] = useState(null);
  const [compareB, setCompareB] = useState(null);
  const [selectedSeason, setSelectedSeason] = useState(DEFAULT_SEASON);
  const [showAllSeasons, setShowAllSeasons] = useState(false);
  const saveTimerRef = useRef({});

  // ── Load data from Google Sheets on mount ─────────────
  useEffect(() => {
    if (!API_ENABLED) {
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
        const parsedEntries = entryRows.filter(r => r.id).map(r => {
          let attachments = [];
          let comments = [];
          let readBy = [];
          try { attachments = r.attachments ? JSON.parse(r.attachments) : []; } catch(e) {}
          try { comments = r.comments ? JSON.parse(r.comments) : []; } catch(e) {}
          try { readBy = r.readBy ? JSON.parse(r.readBy) : []; } catch(e) {}
          return {
            ...r,
            activeLOIds: r.activeLOIds ? r.activeLOIds.split(",").map(s => s.trim()).filter(Boolean) : [],
            attachments,
            comments,
            readBy,
          };
        });
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

        // Load LE completion status (stored as a special row in GateStatus)
        const leRow = gateRows.find(r => r.gateId === "_LE_STATUS");
        if (leRow && leRow.leData) {
          try { setLeStatus(JSON.parse(leRow.leData)); } catch(e) {}
        }

        // Load video progress data
        const videoRow = gateRows.find(r => r.gateId === "_VIDEO_DATA");
        if (videoRow && videoRow.leData) {
          try { setVideoData(JSON.parse(videoRow.leData)); } catch(e) {}
        }

        // Load baseline comments
        const blcRow = gateRows.find(r => r.gateId === "_BASELINE_COMMENTS");
        if (blcRow && blcRow.leData) {
          try { setBaselineComments(JSON.parse(blcRow.leData)); } catch(e) {}
        }
      } catch (e) {
        console.error("Failed to load data:", e);
      }
      setDataLoaded(true);
    }

    loadAll();
  }, []);

  // ── Season-filtered data ─────────────────────────────
  const seasonLos = useMemo(() => showAllSeasons ? los : los.filter(l => (l.season || DEFAULT_SEASON) === selectedSeason), [los, selectedSeason, showAllSeasons]);
  const seasonEntries = useMemo(() => showAllSeasons ? entries : entries.filter(e => (e.season || DEFAULT_SEASON) === selectedSeason), [entries, selectedSeason, showAllSeasons]);

  const gateToLOs = useMemo(() => {
    const map = {};
    ALL_GATES.forEach(id => { map[id] = []; });
    seasonLos.forEach(lo => {
      (lo.gates || []).forEach(gId => {
        if (map[gId]) map[gId].push(lo);
      });
    });
    return map;
  }, [seasonLos]);

  const gateToEntries = useMemo(() => {
    const map = {};
    ALL_GATES.forEach(id => { map[id] = []; });
    seasonEntries.forEach(e => {
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
  }, [seasonEntries, los]);

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
            <div style={{ fontSize: 40, marginBottom: 8 }}>⛷</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.04em", color: "#f0f4f8" }}>
              AT Development Tracker
            </div>
            <div style={{ fontSize: 16, color: "#4d6888", marginTop: 4 }}>
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
            <div style={{ fontSize: 18, fontWeight: 600, color: "#c0ccd8", marginBottom: 16 }}>
              Sign In
            </div>

            {/* User Select */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 14, color: "#5a7898", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>
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
                      fontSize: 15, fontWeight: 800, color: user.color,
                    }}>
                      {user.name[0]}
                    </div>
                    <div style={{ textAlign: "left" }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: loginId === key ? "#e0e8f0" : "#6a8098" }}>
                        {user.name}
                      </div>
                      <div style={{ fontSize: 13, color: "#4d6888", textTransform: "capitalize" }}>
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
                <label style={{ fontSize: 14, color: "#5a7898", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>
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
                    width: "100%", padding: "12px 14px", fontSize: 22, fontWeight: 700,
                    textAlign: "center", letterSpacing: "0.3em",
                    color: "#e0e8f0", background: "rgba(255,255,255,0.04)",
                    border: loginError ? "1.5px solid rgba(200,50,50,0.4)" : "1.5px solid rgba(255,255,255,0.1)",
                    borderRadius: 8, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                  }}
                />
                {loginError && (
                  <div style={{ fontSize: 15, color: "#cc4040", marginTop: 6, textAlign: "center" }}>
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
                color: loginId && loginPin.length >= 4 ? "#fff" : "#4d6888",
                fontSize: 18, fontWeight: 700, cursor: loginId && loginPin.length >= 4 ? "pointer" : "default",
                transition: "all 0.15s ease",
              }}
            >
              Sign In as {loginId ? USERS[loginId]?.name : "..."}
            </button>
          </div>

          <div style={{ fontSize: 14, color: "#3a5068", textAlign: "center", marginTop: 16 }}>
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
        <div style={{ fontSize: 18, fontWeight: 600, color: "#6a8098" }}>
          Loading your data...
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Mark sees all tabs; mentors see only what's been rolled out
  // ── ROLLOUT CONTROL: add tab ids here as you introduce them ──
  const MENTOR_VISIBLE_TABS = ["baseline", "los", "diary", "gates", "activities", "video", "timeline"];
  // ROLLOUT OPTIONS — copy/paste the line you want:
  // const MENTOR_VISIBLE_TABS = ["baseline"];
  // const MENTOR_VISIBLE_TABS = ["baseline", "diary"];
  // const MENTOR_VISIBLE_TABS = ["baseline", "los"];
  // const MENTOR_VISIBLE_TABS = ["baseline", "los", "diary"];
  // const MENTOR_VISIBLE_TABS = ["baseline", "los", "diary", "gates"];
  // const MENTOR_VISIBLE_TABS = ["baseline", "los", "diary", "gates", "activities"];
  // const MENTOR_VISIBLE_TABS = ["baseline", "los", "diary", "gates", "activities", "video"];

  const ALL_TABS_LIST = ["baseline", "los", "diary", "gates", "activities", "video", "timeline"];
  const VISIBLE_TABS = currentUser.role === "candidate" ? ALL_TABS_LIST : MENTOR_VISIBLE_TABS;

  // ── Styles ────────────────────────────────────────────
  const inp = {
    width: "100%", background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7,
    padding: "8px 11px", fontSize: 17, color: "#e0e8f0",
    outline: "none", fontFamily: "inherit", boxSizing: "border-box",
  };
  const txta = { ...inp, minHeight: 64, resize: "vertical", lineHeight: 1.55 };
  const lbl = {
    fontSize: 14, color: "#607898", fontWeight: 700,
    textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4, display: "block",
  };

  // ── LO CRUD ───────────────────────────────────────────
  const newLO = () => {
    const nextNum = los.length + 1;
    setEditingLO({
      id: uid(), objId: `LO-${String(nextNum).padStart(2, "0")}`,
      objective: "", activity: "", assignedBy: "Chris",
      module: "Technical/MA", gates: [], status: "Not Started",
      targetDate: "", score: null, notes: "", season: selectedSeason,
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
      readBy: currentUser ? [{ userId: currentUser.key, timestamp: new Date().toISOString() }] : [],
      season: selectedSeason,
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

    // Auto-set linked LOs to "In Progress" if they are "Not Started"
    const linkedLOIds = editingEntry.activeLOIds || [];
    if (linkedLOIds.length > 0) {
      setLos(prev => {
        let changed = false;
        const next = prev.map(lo => {
          if (linkedLOIds.includes(lo.id) && lo.status === "Not Started") {
            changed = true;
            const updated = { ...lo, status: "In Progress" };
            apiUpdate("LearningObjectives", { ...updated, gates: (updated.gates || []).join(","), score: updated.score || "" });
            return updated;
          }
          return lo;
        });
        return changed ? next : prev;
      });
    }

    // Sync to Google Sheets
    const sheetRow = {
      ...editingEntry,
      activeLOIds: (editingEntry.activeLOIds || []).join(","),
      attachments: JSON.stringify(editingEntry.attachments || []),
      comments: JSON.stringify(editingEntry.comments || []),
      readBy: JSON.stringify(editingEntry.readBy || []),
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

  const saveGateToSheet = (gateId) => {
    // Clear any pending save for this gate
    if (saveTimerRef.current[gateId]) clearTimeout(saveTimerRef.current[gateId]);
    // Debounce: save 1s after last change
    saveTimerRef.current[gateId] = setTimeout(() => {
      // Read latest state at save time via DOM-independent closures
      setBaselineScores(bs => {
        setGateScores(gs => {
          setBaselineNotes(bn => {
            apiUpdate("GateStatus", {
              gateId,
              baselineMark: bs[gateId]?.mark || "",
              baselineChris: bs[gateId]?.chris || "",
              baselineGates: bs[gateId]?.gates || "",
              baselineMike: bs[gateId]?.mike || "",
              baselineNotes: bn[gateId] || "",
              chrisScore: gs[gateId]?.chris || "",
              gatesScore: gs[gateId]?.gates || "",
              mikeScore: gs[gateId]?.mike || "",
            });
            return bn; // don't change state
          });
          return gs;
        });
        return bs;
      });
    }, 1000);
  };

  // Wrap baseline/gate score setters to trigger save
  const updateBaselineScore = (gateId, who, val) => {
    setBaselineScores(prev => ({
      ...prev, [gateId]: { ...prev[gateId], [who]: val ? Number(val) : 0 }
    }));
    saveGateToSheet(gateId);
  };

  const updateBaselineNote = (gateId, val) => {
    setBaselineNotes(prev => ({ ...prev, [gateId]: val }));
    saveGateToSheet(gateId);
  };

  const updateGateExaminerScore = (gateId, who, val) => {
    setGateScores(prev => ({
      ...prev, [gateId]: { ...prev[gateId], [who]: val ? Number(val) : 0 }
    }));
    saveGateToSheet(gateId);
  };

  // Save comments back to sheet when they change
  const saveEntryComments = (entryId, comments) => {
    apiUpdate("DiaryEntries", { id: entryId, comments: JSON.stringify(comments) });
  };

  // Mark entry as read by current user — updates timestamp on every visit
  const markAsRead = (entry) => {
    if (!currentUser) return;
    const readBy = entry.readBy || [];
    const now = new Date().toISOString();
    // Remove existing entry for this user and add fresh one with current timestamp
    const filtered = readBy.filter(r => r.userId !== currentUser.key);
    const newReadBy = [...filtered, { userId: currentUser.key, timestamp: now }];
    const updated = { ...entry, readBy: newReadBy };
    setEntries(prev => prev.map(en => en.id === entry.id ? updated : en));
    apiUpdate("DiaryEntries", { id: entry.id, readBy: JSON.stringify(newReadBy) });
    return updated;
  };

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
                borderRadius: 6, color: "#b0bcc8", fontSize: 15, fontWeight: 600, cursor: "pointer",
                display: "flex", justifyContent: "space-between",
              }}>
                <span>{modName}</span>
                <span style={{ fontSize: 14, color: "#5a7898" }}>{mod.gates.filter(g => selected.includes(g.id)).length}/{mod.gates.length}</span>
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
                        <span style={{ fontSize: 15, color: on ? "#d0d8e0" : "#607898", lineHeight: 1.35 }}>
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
    if (seasonLos.length === 0) return <div style={{ fontSize: 16, color: "#5a7898" }}>No LOs assigned yet — add them in the Learning Objectives tab.</div>;
    const toggle = (id) => onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {seasonLos.filter(l => l.status !== "Verified").map(lo => {
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
                <div style={{ fontSize: 16, fontWeight: 600, color: on ? "#d0d8e0" : "#6a8098" }}>
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
        <div className="at-container">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em", color: "#f0f4f8" }}>
                AT Development Tracker
              </span>
              <span style={{ fontSize: 15, color: "#4d6888", fontWeight: 500 }}>
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
                  fontSize: 14, fontWeight: 800, color: currentUser.color,
                }}>
                  {currentUser.name[0]}
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: currentUser.color }}>
                  {currentUser.name}
                </span>
                <span style={{ fontSize: 12, color: "#5a7898", textTransform: "uppercase", fontWeight: 600 }}>
                  {currentUser.role === "candidate" ? "Candidate" : "Mentor"}
                </span>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  padding: "5px 8px", borderRadius: 5, fontSize: 14, fontWeight: 600,
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                  color: "#5a7898", cursor: "pointer",
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
                { id: "los", label: `Learning Objectives (${seasonLos.length})` },
                { id: "diary", label: `Diary (${seasonEntries.length})` },
                { id: "gates", label: "Gate Readiness" },
                { id: "activities", label: `Activities (${Object.values(leStatus).filter(s => s.status === "Complete").length}/${ALL_LEs.length})` },
                { id: "video", label: "Video Progress" },
                { id: "timeline", label: "Timeline" },
              ].filter(t => VISIBLE_TABS.includes(t.id)).map(t => (
                <button key={t.id} onClick={() => { setTab(t.id); setGateFilter(null); }} style={{
                  padding: "7px 13px", borderRadius: 6, fontSize: 15, fontWeight: 600,
                  border: tab === t.id ? "1.5px solid rgba(224,120,48,0.45)" : "1.5px solid rgba(255,255,255,0.07)",
                  background: tab === t.id ? "rgba(224,120,48,0.1)" : "rgba(255,255,255,0.015)",
                  color: tab === t.id ? "#e8a050" : "#5a7898",
                  cursor: "pointer",
                }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Season picker */}
          {!isSubView && (
            <div style={{
              display: "flex", alignItems: "center", gap: 8, marginTop: 8,
              padding: "6px 10px", borderRadius: 6,
              background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)",
            }}>
              <span style={{ fontSize: 12, color: "#5a7898", fontWeight: 600 }}>Season:</span>
              {SEASONS.map(s => (
                <button
                  key={s}
                  onClick={() => { setSelectedSeason(s); setShowAllSeasons(false); }}
                  style={{
                    padding: "3px 10px", borderRadius: 5, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    background: !showAllSeasons && selectedSeason === s ? "rgba(224,120,48,0.12)" : "rgba(255,255,255,0.02)",
                    border: `1.5px solid ${!showAllSeasons && selectedSeason === s ? "rgba(224,120,48,0.4)" : "rgba(255,255,255,0.06)"}`,
                    color: !showAllSeasons && selectedSeason === s ? "#e8a050" : "#5a7898",
                  }}
                >{s}</button>
              ))}
              <button
                onClick={() => setShowAllSeasons(!showAllSeasons)}
                style={{
                  padding: "3px 10px", borderRadius: 5, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  background: showAllSeasons ? "rgba(138,112,184,0.12)" : "rgba(255,255,255,0.02)",
                  border: `1.5px solid ${showAllSeasons ? "rgba(138,112,184,0.4)" : "rgba(255,255,255,0.06)"}`,
                  color: showAllSeasons ? "#a890d0" : "#5a7898",
                  marginLeft: 4,
                }}
              >{showAllSeasons ? "✓ All Seasons" : "All Seasons"}</button>
            </div>
          )}
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────── */}
      <div className="at-container" style={{ padding: "16px 16px 60px" }}>

        {/* ═══ NOTIFICATION SUMMARY ═══ */}
        {!isSubView && (() => {
          const userKey = currentUser?.key;
          if (!userKey) return null;

          // Entries needing attention: flagged "For Review" and this user hasn't commented
          const needsAttention = seasonEntries.filter(e =>
            e.flag === "For Review" &&
            !(e.comments || []).some(c => c.userId === userKey)
          );

          // Unread entries: not in this user's readBy
          const unread = seasonEntries.filter(e =>
            !(e.readBy || []).some(r => r.userId === userKey)
          );

          // New comments from others since last read
          const entriesWithNewComments = seasonEntries.filter(e => {
            const myRead = (e.readBy || []).find(r => r.userId === userKey);
            if (!myRead) return (e.comments || []).length > 0;
            return (e.comments || []).some(c => c.userId !== userKey && c.timestamp > myRead.timestamp);
          });

          // LOs pending verification
          const pendingVerification = seasonLos.filter(l => l.status === "Ready for Review");

          const hasNotifications = needsAttention.length > 0 || unread.length > 0 || entriesWithNewComments.length > 0 || pendingVerification.length > 0;

          if (!hasNotifications) return null;

          return (
            <div style={{
              padding: "12px 14px", marginBottom: 14, borderRadius: 10,
              background: "rgba(224,120,48,0.05)",
              border: "1px solid rgba(224,120,48,0.15)",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e8a050", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Since your last visit
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {needsAttention.length > 0 && (
                  <button
                    onClick={() => { setTab("diary"); setDiaryFilter("attention"); }}
                    style={{
                      padding: "6px 12px", borderRadius: 6, cursor: "pointer",
                      background: "rgba(230,80,40,0.1)", border: "1px solid rgba(230,80,40,0.25)",
                      color: "#e05028", fontSize: 14, fontWeight: 700,
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    <span style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: "#e05028", color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 800,
                    }}>{needsAttention.length}</span>
                    need{needsAttention.length === 1 ? "s" : ""} your feedback
                  </button>
                )}
                {unread.length > 0 && (
                  <button
                    onClick={() => { setTab("diary"); setDiaryFilter("unread"); }}
                    style={{
                      padding: "6px 12px", borderRadius: 6, cursor: "pointer",
                      background: "rgba(48,136,204,0.08)", border: "1px solid rgba(48,136,204,0.2)",
                      color: "#3088cc", fontSize: 14, fontWeight: 700,
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    <span style={{
                      width: 20, height: 20, borderRadius: "50%",
                      background: "#3088cc", color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 12, fontWeight: 800,
                    }}>{unread.length}</span>
                    unread {unread.length === 1 ? "entry" : "entries"}
                  </button>
                )}
                {entriesWithNewComments.length > 0 && (
                  <button
                    onClick={() => { setTab("diary"); setDiaryFilter("newcomments"); }}
                    style={{
                      padding: "6px 12px", borderRadius: 6, cursor: "pointer",
                      background: "rgba(40,168,88,0.08)", border: "1px solid rgba(40,168,88,0.2)",
                      color: "#28a858", fontSize: 14, fontWeight: 700,
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    💬 {entriesWithNewComments.length} with new comments
                  </button>
                )}
                {pendingVerification.length > 0 && (
                  <button
                    onClick={() => { setTab("los"); }}
                    style={{
                      padding: "6px 12px", borderRadius: 6, cursor: "pointer",
                      background: "rgba(200,170,50,0.08)", border: "1px solid rgba(200,170,50,0.2)",
                      color: "#c8aa32", fontSize: 14, fontWeight: 700,
                      display: "flex", alignItems: "center", gap: 5,
                    }}
                  >
                    {pendingVerification.length} LO{pendingVerification.length !== 1 ? "s" : ""} pending verification
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {/* ═══ LO DETAIL VIEW ═══ */}
        {viewingLO && !editingLO && (() => {
          const lo = viewingLO;
          const mc = MODULE_COLORS_SIMPLE[lo.module] || "#7a9ab5";
          const linkedEntries = entries.filter(e => (e.activeLOIds || []).includes(lo.id));
          return (
            <div>
              <button onClick={() => setViewingLO(null)} style={{ background: "none", border: "none", color: "#5a7898", fontSize: 16, cursor: "pointer", padding: "0 0 10px", fontWeight: 600 }}>← Back</button>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <span style={{ fontSize: 20, fontWeight: 700, color: mc }}>{lo.objId}</span>
                    <StatusBadge status={lo.status} />
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => setEditingLO({ ...lo, gates: [...lo.gates] })} style={{ padding: "4px 10px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#7a9ab5", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Edit</button>
                    <button onClick={() => { if (confirm("Delete this LO?")) deleteLO(lo.id); }} style={{ padding: "4px 10px", borderRadius: 5, background: "rgba(200,50,50,0.06)", border: "1px solid rgba(200,50,50,0.2)", color: "#b04040", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Delete</button>
                  </div>
                </div>
                <SectionLabel>Objective</SectionLabel>
                <p style={{ fontSize: 17, color: "#c0ccd8", lineHeight: 1.6, margin: "0 0 14px" }}>{lo.objective || "—"}</p>
                <SectionLabel>Mentor-Assigned Activity</SectionLabel>
                <p style={{ fontSize: 17, color: "#c0ccd8", lineHeight: 1.6, margin: "0 0 14px" }}>{lo.activity || "—"}</p>
                <div style={{ display: "flex", gap: 20, flexWrap: "wrap", marginBottom: 14 }}>
                  <div><SectionLabel>Assigned By</SectionLabel><span style={{ fontSize: 17, color: "#c0ccd8" }}>{lo.assignedBy}</span></div>
                  <div><SectionLabel>Module</SectionLabel><span style={{ fontSize: 17, color: mc }}>{lo.module}</span></div>
                  <div><SectionLabel>Target Date</SectionLabel><span style={{ fontSize: 17, color: "#c0ccd8" }}>{lo.targetDate || "—"}</span></div>
                  {lo.score && <div><SectionLabel>Fitts & Posner</SectionLabel><span style={{ fontSize: 17, color: lo.score >= 4 ? "#28a858" : "#e07830" }}>{lo.score} — {FITTS_POSNER.find(f => f.score === lo.score)?.label}</span></div>}
                </div>
                {lo.gates.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <SectionLabel>Gates Developed</SectionLabel>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {lo.gates.map(g => <GateChip key={g} gateId={g} showCriterion />)}
                    </div>
                  </div>
                )}
                {lo.notes && <><SectionLabel>Notes</SectionLabel><p style={{ fontSize: 16, color: "#7a9ab5", lineHeight: 1.55, margin: 0, whiteSpace: "pre-wrap" }}>{lo.notes}</p></>}
                {linkedEntries.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <SectionLabel>Diary Entries ({linkedEntries.length})</SectionLabel>
                    {linkedEntries.map(e => (
                      <div key={e.id} onClick={() => { setViewingLO(null); setViewingEntry(e); }} style={{
                        padding: "8px 10px", borderRadius: 6, marginBottom: 4, cursor: "pointer",
                        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)",
                        fontSize: 16, color: "#7a9ab5",
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
              <button onClick={() => setEditingLO(null)} style={{ background: "none", border: "none", color: "#5a7898", fontSize: 16, cursor: "pointer", padding: "0 0 10px", fontWeight: 600 }}>← Cancel</button>
              <Card>
                <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 16, color: "#e0e8f0" }}>
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
                      {currentUser?.role === "candidate"
                        ? ["Not Started", "In Progress", "Ready for Review"].map(s => <option key={s} value={s}>{s}</option>)
                        : LO_STATUSES.map(s => <option key={s} value={s}>{s}</option>)
                      }
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
                  fontSize: 17, fontWeight: 700, cursor: "pointer",
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
              <button onClick={() => setViewingEntry(null)} style={{ background: "none", border: "none", color: "#5a7898", fontSize: 16, cursor: "pointer", padding: "0 0 10px", fontWeight: 600 }}>← Back</button>
              <Card>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 21, fontWeight: 700 }}>{e.date}</div>
                    <div style={{ fontSize: 15, color: "#5a7898", marginTop: 2 }}>
                      {[e.seasonWeek, e.location, e.duration].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 14, fontWeight: 700, background: fc.bg, border: `1px solid ${fc.border}`, color: fc.text }}>{e.flag}</span>
                    <button onClick={() => setEditingEntry({ ...e, activeLOIds: [...(e.activeLOIds || [])], attachments: [...(e.attachments || [])], comments: [...(e.comments || [])], readBy: [...(e.readBy || [])] })} style={{ padding: "3px 9px", borderRadius: 5, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#7a9ab5", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Edit</button>
                    <button onClick={() => { if (confirm("Delete?")) deleteEntry(e.id); }} style={{ padding: "3px 9px", borderRadius: 5, background: "rgba(200,50,50,0.06)", border: "1px solid rgba(200,50,50,0.2)", color: "#b04040", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>Delete</button>
                  </div>
                </div>

                {/* Read-by indicators */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
                  padding: "8px 10px", borderRadius: 7,
                  background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.03)",
                }}>
                  <span style={{ fontSize: 13, color: "#5a7898", fontWeight: 600 }}>Seen by:</span>
                  <div style={{ display: "flex", gap: 4 }}>
                    {["mark", "chris", "gates", "mike"].map(userId => {
                      const user = USERS[userId];
                      const readEntry = (e.readBy || []).find(r => r.userId === userId);
                      const hasCommented = (e.comments || []).some(c => c.userId === userId);
                      const isRead = !!readEntry;
                      return (
                        <div
                          key={userId}
                          title={isRead
                            ? `${user.name} — viewed ${new Date(readEntry.timestamp).toLocaleDateString("en", { month: "short", day: "numeric" })}${hasCommented ? " · commented" : ""}`
                            : `${user.name} — not yet viewed`
                          }
                          style={{
                            width: 28, height: 28, borderRadius: "50%",
                            background: isRead ? `${user.color}25` : "rgba(255,255,255,0.03)",
                            border: `2px solid ${isRead ? `${user.color}60` : "rgba(255,255,255,0.06)"}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 12, fontWeight: 800,
                            color: isRead ? user.color : "#3a5068",
                            position: "relative",
                            cursor: "default",
                          }}
                        >
                          {user.name[0]}
                          {hasCommented && (
                            <div style={{
                              position: "absolute", bottom: -2, right: -2,
                              width: 12, height: 12, borderRadius: "50%",
                              background: "#28a858", border: "2px solid #0d1828",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 8, color: "#fff",
                            }}>💬</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {linkedLOs.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <SectionLabel>Active Learning Objectives</SectionLabel>
                    {linkedLOs.map(lo => {
                      const mc = MODULE_COLORS_SIMPLE[lo.module] || "#7a9ab5";
                      return (
                        <div key={lo.id} style={{ fontSize: 16, color: "#a0b0c0", marginBottom: 3 }}>
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
                    <div style={{ fontSize: 17, color: "#b0bcc8", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{s.val}</div>
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
                                <span style={{ fontSize: 12, color: "#fff" }}>▶</span>
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 16, fontWeight: 600,
                              color: isYT ? "#cc3030" : isDoc ? "#4285f4" : "#7a9ab5",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {att.label || (isYT ? "YouTube Video" : isDoc ? "Document" : "Link")}
                            </div>
                            <div style={{
                              fontSize: 14, color: "#5a7898",
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            }}>
                              {att.url}
                            </div>
                          </div>
                          <span style={{ fontSize: 14, color: "#4d6888", flexShrink: 0 }}>↗</span>
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
                    <div style={{ fontSize: 16, color: "#4d6888", marginBottom: 12, fontStyle: "italic" }}>
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
                          fontSize: 14, fontWeight: 800, color: commenter.color,
                        }}>
                          {commenter.name[0]}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
                            <span style={{ fontSize: 16, fontWeight: 700, color: commenter.color }}>{commenter.name}</span>
                            <span style={{ fontSize: 13, color: "#4d6888" }}>
                              {c.timestamp ? new Date(c.timestamp).toLocaleDateString("en", { month: "short", day: "numeric" }) : ""}
                              {c.timestamp ? " · " + new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                          <div style={{ fontSize: 16, color: "#b0bcc8", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
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
                              padding: "2px 5px", borderRadius: 3, fontSize: 13, fontWeight: 600,
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
                      fontSize: 14, fontWeight: 800, color: currentUser?.color || "#7a9ab5",
                    }}>
                      {currentUser?.name?.[0] || "?"}
                    </div>
                    <textarea
                      id={`comment-${e.id}`}
                      placeholder={currentUser?.role === "mentor" ? "Leave feedback for Mark..." : "Add a note or respond to mentor feedback..."}
                      style={{
                        flex: 1, minHeight: 40, padding: "8px 10px", fontSize: 16, color: "#c0ccd8",
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
                        padding: "8px 14px", borderRadius: 7, fontSize: 15, fontWeight: 700,
                        background: `${currentUser?.color || "#3088cc"}15`,
                        border: `1px solid ${currentUser?.color || "#3088cc"}35`,
                        color: currentUser?.color || "#3088cc",
                        cursor: "pointer", flexShrink: 0, alignSelf: "flex-end",
                      }}
                    >
                      Post
                    </button>
                  </div>
                  <div style={{ fontSize: 13, color: "#3a5068", marginTop: 4 }}>
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
              <button onClick={() => setEditingEntry(null)} style={{ background: "none", border: "none", color: "#5a7898", fontSize: 16, cursor: "pointer", padding: "0 0 10px", fontWeight: 600 }}>← Cancel</button>
              <Card>
                <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 16 }}>
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
                          padding: "5px 9px", borderRadius: 5, fontSize: 14, fontWeight: 600, cursor: "pointer",
                          border: e.moduleFocus === m ? `1.5px solid ${MODULE_COLORS_SIMPLE[m]}` : "1.5px solid rgba(255,255,255,0.06)",
                          background: e.moduleFocus === m ? `${MODULE_COLORS_SIMPLE[m]}14` : "rgba(255,255,255,0.015)",
                          color: e.moduleFocus === m ? MODULE_COLORS_SIMPLE[m] : "#5a7898",
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
                            padding: "5px 9px", borderRadius: 5, fontSize: 14, fontWeight: 600, cursor: "pointer",
                            border: e.flag === f ? `1.5px solid ${fc.border}` : "1.5px solid rgba(255,255,255,0.06)",
                            background: e.flag === f ? fc.bg : "rgba(255,255,255,0.015)",
                            color: e.flag === f ? fc.text : "#5a7898",
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
                              <span style={{ fontSize: 18, flexShrink: 0 }}>{icon}</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: 15, fontWeight: 600, color: "#a0b0c0",
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                  {att.label || att.url}
                                </div>
                                <div style={{
                                  fontSize: 14, color: "#5a7898",
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
                                  padding: "2px 6px", borderRadius: 4, fontSize: 14, fontWeight: 700,
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
                        style={{ ...inp, flex: "2 1 200px", fontSize: 15 }}
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
                        style={{ ...inp, flex: "1 1 120px", fontSize: 15 }}
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
                          padding: "8px 14px", borderRadius: 6, fontSize: 15, fontWeight: 700,
                          background: "rgba(48,136,204,0.12)", border: "1px solid rgba(48,136,204,0.3)",
                          color: "#3088cc", cursor: "pointer", flexShrink: 0,
                        }}
                      >+ Add</button>
                    </div>
                    <div style={{ fontSize: 14, color: "#4d6888", marginTop: 6 }}>
                      YouTube videos, Google Docs, Drive files, or any URL. Press Enter or click Add.
                    </div>
                  </div>
                </div>

                <button onClick={saveEntry} style={{
                  width: "100%", padding: "11px", borderRadius: 7, border: "none",
                  background: "linear-gradient(135deg, #e07830, #c06020)", color: "#fff",
                  fontSize: 17, fontWeight: 700, cursor: "pointer",
                }}>Save Entry</button>
              </Card>
            </div>
          );
        })()}

        {/* ═══ TAB: ACTIVITIES (Learning Experiences) ═══ */}
        {tab === "activities" && !isSubView && (() => {
          const totalComplete = Object.values(leStatus).filter(s => s.status === "Complete").length;
          const totalInProgress = Object.values(leStatus).filter(s => s.status === "In Progress").length;
          const totalAssigned = Object.values(leStatus).filter(s => s.status === "Assigned").length;

          const updateLE = (leId, field, value) => {
            setLeStatus(prev => {
              const next = { ...prev, [leId]: { ...prev[leId], [field]: value } };
              // Debounced save to sheet — store all LE statuses as one row
              if (saveTimerRef.current._le) clearTimeout(saveTimerRef.current._le);
              saveTimerRef.current._le = setTimeout(() => {
                apiUpdate("GateStatus", { gateId: "_LE_STATUS", leData: JSON.stringify(next) });
              }, 1500);
              return next;
            });
          };

          return (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 16, color: "#5a7898", lineHeight: 1.55, marginBottom: 12 }}>
                  Suggested activities from the AT Program Guide. These are not requirements — mentors may draw on these when designing Learning Objectives, or design entirely their own. Track your progress here.
                </div>

                {/* Summary */}
                <div style={{
                  display: "flex", gap: 16, padding: "12px 14px", marginBottom: 16,
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8,
                  flexWrap: "wrap",
                }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#5a7898", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Complete</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#28a858" }}>{totalComplete}<span style={{ fontSize: 15, color: "#5a7898", fontWeight: 500 }}>/{ALL_LEs.length}</span></div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "#5a7898", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>In Progress</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#e07830" }}>{totalInProgress}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "#5a7898", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Assigned</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#3088cc" }}>{totalAssigned}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "#5a7898", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Not Started</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#5a7898" }}>{ALL_LEs.length - totalComplete - totalInProgress - totalAssigned}</div>
                  </div>
                </div>
              </div>

              {Object.entries(LEARNING_EXPERIENCES).map(([modName, mod]) => {
                const modComplete = mod.items.filter(le => leStatus[le.id]?.status === "Complete").length;
                return (
                  <div key={modName} style={{ marginBottom: 24 }}>
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "baseline",
                      marginBottom: 8, paddingBottom: 6, borderBottom: `2px solid ${mod.color}30`,
                    }}>
                      <span style={{ fontSize: 17, fontWeight: 700, color: mod.color }}>{modName}</span>
                      <span style={{ fontSize: 14, color: "#5a7898" }}>{modComplete}/{mod.items.length} complete</span>
                    </div>

                    {/* Progress bar */}
                    <div style={{ height: 3, background: "rgba(255,255,255,0.04)", borderRadius: 2, marginBottom: 10, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${(modComplete / mod.items.length) * 100}%`, background: mod.color, borderRadius: 2, transition: "width 0.4s ease" }} />
                    </div>

                    {mod.items.map((le, li) => {
                      const s = leStatus[le.id] || {};
                      const status = s.status || "Not Started";
                      const statusColor = status === "Complete" ? "#28a858" : status === "In Progress" ? "#e07830" : status === "Assigned" ? "#3088cc" : status === "Ready for Review" ? "#c8aa32" : "#4d6888";
                      const isMentor = currentUser?.role === "mentor";
                      const isCandidate = currentUser?.role === "candidate";
                      return (
                        <div key={le.id} style={{
                          padding: "12px 14px", marginBottom: 6, borderRadius: 8,
                          background: status === "Complete" ? "rgba(40,168,88,0.03)" : status === "Assigned" ? "rgba(48,136,204,0.03)" : "rgba(255,255,255,0.02)",
                          border: `1px solid ${status === "Complete" ? "rgba(40,168,88,0.1)" : status === "Assigned" ? "rgba(48,136,204,0.1)" : "rgba(255,255,255,0.05)"}`,
                          opacity: status === "Complete" ? 0.7 : 1,
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                                <span style={{ fontSize: 14, fontWeight: 700, color: mod.color }}>{le.id}</span>
                                <span style={{ fontSize: 16, fontWeight: 600, color: status === "Complete" ? "#6a8098" : "#c0ccd8", textDecoration: status === "Complete" ? "line-through" : "none" }}>
                                  {le.title}
                                </span>
                                {s.assignedBy && (
                                  <span style={{ fontSize: 13, color: (USERS[s.assignedBy] || {}).color || "#6a8098" }}>
                                    assigned by {(USERS[s.assignedBy] || {}).name || s.assignedBy}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 14, color: "#6a8098", lineHeight: 1.5 }}>
                                {le.desc}
                              </div>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
                              {/* Mentors can assign; Mark can set In Progress or Complete */}
                              {isMentor && status === "Not Started" && (
                                <button
                                  onClick={() => {
                                    updateLE(le.id, "status", "Assigned");
                                    updateLE(le.id, "assignedBy", currentUser?.key);
                                  }}
                                  style={{
                                    padding: "5px 10px", fontSize: 13, fontWeight: 700, borderRadius: 5,
                                    background: "rgba(48,136,204,0.12)", border: "1px solid rgba(48,136,204,0.3)",
                                    color: "#3088cc", cursor: "pointer",
                                  }}
                                >Assign</button>
                              )}
                              {(isCandidate || status !== "Not Started") && (
                                <select
                                  value={status}
                                  onChange={ev => {
                                    const newStatus = ev.target.value;
                                    updateLE(le.id, "status", newStatus);
                                    if (newStatus === "Assigned" && !s.assignedBy) {
                                      updateLE(le.id, "assignedBy", currentUser?.key);
                                    }
                                  }}
                                  style={{
                                    padding: "5px 6px", fontSize: 13, fontWeight: 700, borderRadius: 5,
                                    background: `${statusColor}15`, border: `1px solid ${statusColor}35`,
                                    color: statusColor, outline: "none", fontFamily: "inherit",
                                    appearance: "auto", cursor: "pointer",
                                  }}
                                >
                                  {isCandidate ? (
                                    <>
                                      <option value="Not Started">Not Started</option>
                                      <option value="Assigned">Assigned</option>
                                      <option value="In Progress">In Progress</option>
                                      <option value="Ready for Review">Ready for Review</option>
                                    </>
                                  ) : (
                                    <>
                                      <option value="Not Started">Not Started</option>
                                      <option value="Assigned">Assigned</option>
                                      <option value="In Progress">In Progress</option>
                                      <option value="Ready for Review">Ready for Review</option>
                                      <option value="Complete">Complete</option>
                                    </>
                                  )}
                                </select>
                              )}
                            </div>
                          </div>

                          {/* Details — show when Assigned, In Progress or Complete */}
                          {status !== "Not Started" && (
                            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                              <input
                                type="date"
                                value={s.date || ""}
                                onChange={ev => updateLE(le.id, "date", ev.target.value)}
                                placeholder="Date"
                                style={{
                                  padding: "4px 8px", fontSize: 13, color: "#a0b0c0",
                                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                                  borderRadius: 5, outline: "none", fontFamily: "inherit",
                                }}
                              />
                              <input
                                value={s.notes || ""}
                                onChange={ev => updateLE(le.id, "notes", ev.target.value)}
                                placeholder="Notes — what you did, who was involved, what you learned"
                                style={{
                                  flex: 1, minWidth: 180, padding: "4px 8px", fontSize: 13, color: "#a0b0c0",
                                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                                  borderRadius: 5, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                                }}
                              />
                              {s.linkedLO && (
                                <span style={{ fontSize: 12, color: "#e07830", padding: "4px 8px", borderRadius: 4, background: "rgba(224,120,48,0.08)", border: "1px solid rgba(224,120,48,0.15)" }}>
                                  → {s.linkedLO}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          );
        })()}

        {/* ═══ TAB: VIDEO PROGRESS ═══ */}
        {tab === "video" && !isSubView && (() => {
          const skiingMod = GATES["Module 2 — Skiing Performance"];
          const skiGates = skiingMod ? skiingMod.gates : [];
          const totalWithVideos = skiGates.filter(g => (videoData[g.id]?.videos || []).length > 0).length;

          const saveVideoData = (newData) => {
            setVideoData(newData);
            if (saveTimerRef.current._video) clearTimeout(saveTimerRef.current._video);
            saveTimerRef.current._video = setTimeout(() => {
              apiUpdate("GateStatus", { gateId: "_VIDEO_DATA", leData: JSON.stringify(newData) });
            }, 1500);
          };

          const updateCues = (gateId, cues) => {
            saveVideoData({ ...videoData, [gateId]: { ...videoData[gateId], cues, videos: videoData[gateId]?.videos || [] } });
          };

          const addVideo = (gateId) => {
            const urlEl = document.getElementById(`vid-url-${gateId}`);
            const noteEl = document.getElementById(`vid-note-${gateId}`);
            const dateEl = document.getElementById(`vid-date-${gateId}`);
            if (!urlEl) return;
            const url = urlEl.value.trim();
            if (!url) return;
            const note = noteEl ? noteEl.value.trim() : "";
            const date = dateEl ? dateEl.value : today();
            const existing = videoData[gateId] || { cues: "", videos: [] };
            const newVideo = { url, date: date || today(), notes: note, addedBy: currentUser?.key || "mark", comments: [] };
            saveVideoData({ ...videoData, [gateId]: { ...existing, videos: [...existing.videos, newVideo] } });
            urlEl.value = "";
            if (noteEl) noteEl.value = "";
            if (dateEl) dateEl.value = today();
          };

          const removeVideo = (gateId, vidIdx) => {
            const existing = videoData[gateId] || { cues: "", videos: [] };
            const newVideos = existing.videos.filter((_, i) => i !== vidIdx);
            saveVideoData({ ...videoData, [gateId]: { ...existing, videos: newVideos } });
          };

          const addVideoComment = (gateId, vidIdx, text) => {
            if (!text.trim()) return;
            const existing = videoData[gateId] || { cues: "", videos: [] };
            const newVideos = [...existing.videos];
            const vid = { ...newVideos[vidIdx] };
            vid.comments = [...(vid.comments || []), { userId: currentUser?.key || "mark", text: text.trim(), timestamp: new Date().toISOString() }];
            newVideos[vidIdx] = vid;
            saveVideoData({ ...videoData, [gateId]: { ...existing, videos: newVideos } });
          };

          // Extract YouTube ID
          const getYtId = (url) => {
            const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            return m ? m[1] : null;
          };

          // Group gates by category
          let lastCategory = null;

          return (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 16, color: "#5a7898", lineHeight: 1.55, marginBottom: 12 }}>
                  Track your skiing development over time with video. For each task, record your personal cues, upload YouTube videos across the season, and get mentor feedback on each one.
                </div>
                <div style={{
                  display: "flex", gap: 16, padding: "12px 14px", marginBottom: 16,
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8,
                }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#5a7898", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Tasks with Video</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#3088cc" }}>{totalWithVideos}<span style={{ fontSize: 15, color: "#5a7898", fontWeight: 500 }}>/{skiGates.length}</span></div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "#5a7898", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total Videos</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#e07830" }}>{skiGates.reduce((sum, g) => sum + (videoData[g.id]?.videos || []).length, 0)}</div>
                  </div>
                </div>
              </div>

              {skiGates.map((gate, gi) => {
                const data = videoData[gate.id] || { cues: "", videos: [] };
                const videos = data.videos || [];
                const showCategory = gate.category && gate.category !== lastCategory;
                if (gate.category) lastCategory = gate.category;

                return (
                  <div key={gate.id}>
                    {showCategory && (
                      <div style={{
                        padding: "8px 10px 4px", marginTop: gi > 0 ? 14 : 0,
                        borderBottom: "2px solid rgba(48,136,204,0.25)", marginBottom: 6,
                      }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: "#3088cc", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                          {gate.category}
                        </span>
                      </div>
                    )}
                    <div style={{
                      marginBottom: 8, borderRadius: 10,
                      background: videos.length > 0 ? "rgba(48,136,204,0.03)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${videos.length > 0 ? "rgba(48,136,204,0.1)" : "rgba(255,255,255,0.05)"}`,
                      overflow: "hidden",
                    }}>
                      {/* Gate header */}
                      <div style={{ padding: "12px 14px", borderBottom: videos.length > 0 || data.cues ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#3088cc" }}>{gate.id}</span>
                          <span style={{ fontSize: 16, fontWeight: 600, color: "#c0ccd8" }}>{gate.criterion}</span>
                          {videos.length > 0 && (
                            <span style={{ fontSize: 13, color: "#5a7898", marginLeft: "auto" }}>🎬 {videos.length} video{videos.length !== 1 ? "s" : ""}</span>
                          )}
                        </div>

                        {/* Personal cues */}
                        <div style={{ marginBottom: 8 }}>
                          <label style={{ fontSize: 12, color: "#607898", fontWeight: 700, display: "block", marginBottom: 3 }}>
                            My Cues & Focus Points
                          </label>
                          <textarea
                            value={data.cues || ""}
                            onChange={ev => updateCues(gate.id, ev.target.value)}
                            placeholder="What do I focus on? Key feelings, timing cues, body positions..."
                            style={{
                              width: "100%", minHeight: 36, padding: "6px 10px", fontSize: 14, color: "#a0b0c0",
                              background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)",
                              borderRadius: 6, outline: "none", fontFamily: "inherit", resize: "vertical",
                              lineHeight: 1.5, boxSizing: "border-box",
                            }}
                          />
                        </div>

                        {/* Add video */}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                          <input
                            id={`vid-date-${gate.id}`}
                            type="date"
                            defaultValue={today()}
                            style={{
                              padding: "6px 8px", fontSize: 14, color: "#e0e8f0",
                              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                              borderRadius: 5, outline: "none", fontFamily: "inherit",
                            }}
                          />
                          <input
                            id={`vid-url-${gate.id}`}
                            placeholder="YouTube URL"
                            style={{
                              flex: "2 1 160px", padding: "6px 10px", fontSize: 14, color: "#e0e8f0",
                              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                              borderRadius: 5, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                            }}
                            onKeyDown={ev => { if (ev.key === "Enter") addVideo(gate.id); }}
                          />
                          <input
                            id={`vid-note-${gate.id}`}
                            placeholder="What was your focus?"
                            style={{
                              flex: "1 1 140px", padding: "6px 10px", fontSize: 14, color: "#e0e8f0",
                              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                              borderRadius: 5, outline: "none", fontFamily: "inherit", boxSizing: "border-box",
                            }}
                            onKeyDown={ev => { if (ev.key === "Enter") addVideo(gate.id); }}
                          />
                          <button onClick={() => addVideo(gate.id)} style={{
                            padding: "6px 12px", borderRadius: 5, fontSize: 14, fontWeight: 700,
                            background: "rgba(48,136,204,0.12)", border: "1px solid rgba(48,136,204,0.3)",
                            color: "#3088cc", cursor: "pointer", flexShrink: 0,
                          }}>+ Add</button>
                        </div>
                      </div>

                      {/* Video timeline */}
                      {videos.length > 0 && (
                        <div style={{ padding: "8px 14px 12px" }}>
                          {videos.map((vid, vi) => {
                            const ytId = getYtId(vid.url);
                            const addedByUser = USERS[vid.addedBy] || { name: vid.addedBy || "?", color: "#7a9ab5" };
                            return (
                              <div key={vi} style={{
                                display: "flex", gap: 10, padding: "10px 0",
                                borderBottom: vi < videos.length - 1 ? "1px solid rgba(255,255,255,0.03)" : "none",
                              }}>
                                {/* Thumbnail */}
                                {ytId ? (
                                  <a href={vid.url} target="_blank" rel="noopener noreferrer" style={{
                                    width: 96, height: 54, borderRadius: 5, overflow: "hidden", flexShrink: 0,
                                    background: "#000", display: "flex", alignItems: "center", justifyContent: "center",
                                    position: "relative",
                                  }}>
                                    <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                    <div style={{
                                      position: "absolute", width: 24, height: 17, borderRadius: 4,
                                      background: "rgba(255,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center",
                                    }}>
                                      <span style={{ fontSize: 10, color: "#fff" }}>▶</span>
                                    </div>
                                  </a>
                                ) : (
                                  <a href={vid.url} target="_blank" rel="noopener noreferrer" style={{
                                    width: 96, height: 54, borderRadius: 5, flexShrink: 0,
                                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 23, textDecoration: "none",
                                  }}>🎬</a>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 15, fontWeight: 700, color: "#c0ccd8" }}>{vid.date}</span>
                                    <span style={{ fontSize: 14, color: addedByUser.color, fontWeight: 600 }}>by {addedByUser.name}</span>
                                    {/* 💬 expand button */}
                                    <button
                                      onClick={() => {
                                        const key = `${gate.id}-${vi}`;
                                        setExpandedBaselineGate(expandedBaselineGate === key ? null : key);
                                      }}
                                      style={{
                                        padding: "2px 8px", borderRadius: 4, cursor: "pointer",
                                        background: (vid.comments || []).length > 0 ? "rgba(40,168,88,0.1)" : "rgba(255,255,255,0.02)",
                                        border: `1px solid ${(vid.comments || []).length > 0 ? "rgba(40,168,88,0.25)" : "rgba(255,255,255,0.06)"}`,
                                        color: (vid.comments || []).length > 0 ? "#28a858" : "#4d6888",
                                        fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 2,
                                      }}
                                    >
                                      💬 {(vid.comments || []).length > 0 ? (vid.comments || []).length : ""}
                                    </button>
                                    <button onClick={() => { if (confirm("Remove this video?")) removeVideo(gate.id, vi); }} style={{
                                      marginLeft: "auto", padding: "1px 5px", borderRadius: 3, fontSize: 12,
                                      background: "rgba(200,50,50,0.06)", border: "1px solid rgba(200,50,50,0.12)",
                                      color: "#b04040", cursor: "pointer",
                                    }}>✕</button>
                                  </div>
                                  {vid.notes && (
                                    <div style={{ fontSize: 14, color: "#6a8098", lineHeight: 1.4, marginBottom: 4 }}>{vid.notes}</div>
                                  )}

                                  {/* Expandable comment thread — same pattern as baseline */}
                                  {expandedBaselineGate === `${gate.id}-${vi}` && (
                                    <div style={{
                                      marginTop: 8, padding: "10px 12px",
                                      background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)",
                                      borderRadius: 8,
                                    }}>
                                      {(vid.comments || []).length === 0 && (
                                        <div style={{ fontSize: 14, color: "#4d6888", marginBottom: 8, fontStyle: "italic" }}>
                                          No comments yet — mentors can leave feedback on this video.
                                        </div>
                                      )}
                                      {(vid.comments || []).map((c, ci) => {
                                        const commenter = USERS[c.userId] || { name: c.userId, color: "#7a9ab5" };
                                        return (
                                          <div key={ci} style={{
                                            display: "flex", gap: 8, marginBottom: 8,
                                            padding: "8px 10px", borderRadius: 6,
                                            background: `${commenter.color}06`, border: `1px solid ${commenter.color}12`,
                                          }}>
                                            <div style={{
                                              width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                                              background: `${commenter.color}20`, border: `1.5px solid ${commenter.color}40`,
                                              display: "flex", alignItems: "center", justifyContent: "center",
                                              fontSize: 12, fontWeight: 800, color: commenter.color,
                                            }}>{commenter.name[0]}</div>
                                            <div style={{ flex: 1 }}>
                                              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
                                                <span style={{ fontSize: 14, fontWeight: 700, color: commenter.color }}>{commenter.name}</span>
                                                <span style={{ fontSize: 12, color: "#4d6888" }}>
                                                  {c.timestamp ? new Date(c.timestamp).toLocaleDateString("en", { month: "short", day: "numeric" }) : ""}
                                                  {c.timestamp ? " · " + new Date(c.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                                </span>
                                              </div>
                                              <div style={{ fontSize: 15, color: "#b0bcc8", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{c.text}</div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                      <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                                        <div style={{
                                          width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                                          background: `${currentUser?.color || "#7a9ab5"}20`,
                                          border: `1.5px solid ${currentUser?.color || "#7a9ab5"}40`,
                                          display: "flex", alignItems: "center", justifyContent: "center",
                                          fontSize: 12, fontWeight: 800, color: currentUser?.color || "#7a9ab5",
                                        }}>{currentUser?.name?.[0] || "?"}</div>
                                        <textarea
                                          id={`vid-comment-${gate.id}-${vi}`}
                                          placeholder="Leave feedback on this video..."
                                          style={{
                                            flex: 1, minHeight: 36, padding: "6px 10px", fontSize: 14, color: "#c0ccd8",
                                            background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)",
                                            borderRadius: 6, outline: "none", fontFamily: "inherit", resize: "vertical",
                                            lineHeight: 1.5, boxSizing: "border-box",
                                          }}
                                          onKeyDown={ev => {
                                            if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) {
                                              const el = document.getElementById(`vid-comment-${gate.id}-${vi}`);
                                              addVideoComment(gate.id, vi, el.value);
                                              el.value = "";
                                            }
                                          }}
                                        />
                                        <button onClick={() => {
                                          const el = document.getElementById(`vid-comment-${gate.id}-${vi}`);
                                          addVideoComment(gate.id, vi, el.value);
                                          el.value = "";
                                        }} style={{
                                          padding: "6px 12px", borderRadius: 5, fontSize: 14, fontWeight: 700,
                                          background: `${currentUser?.color || "#3088cc"}12`,
                                          border: `1px solid ${currentUser?.color || "#3088cc"}30`,
                                          color: currentUser?.color || "#3088cc", cursor: "pointer", flexShrink: 0,
                                        }}>Post</button>
                                      </div>
                                      <div style={{ fontSize: 12, color: "#3a5068", marginTop: 3 }}>Ctrl+Enter to post</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          );
        })()}

        {/* ═══ TAB: TIMELINE ═══ */}
        {tab === "timeline" && !isSubView && (() => {
          const skiingMod = GATES["Module 2 — Skiing Performance"];
          const skiGates = skiingMod ? skiingMod.gates : [];

          // Collect all videos with their task info into a flat list
          const allVideos = [];
          skiGates.forEach(gate => {
            const data = videoData[gate.id] || { cues: "", videos: [] };
            (data.videos || []).forEach((vid, vi) => {
              allVideos.push({ ...vid, gateId: gate.id, criterion: gate.criterion, category: gate.category, vidIdx: vi });
            });
          });

          // Sort by date descending
          const sorted = [...allVideos].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

          // Get unique categories for filtering
          const categories = [...new Set(skiGates.map(g => g.category).filter(Boolean))];

          const filtered = catFilter === "all" ? sorted : sorted.filter(v => v.category === catFilter);

          const getYtId = (url) => {
            const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
            return m ? m[1] : null;
          };

          const VideoCard = ({ vid, selectable, selected, onSelect }) => {
            const ytId = getYtId(vid.url);
            const addedByUser = USERS[vid.addedBy] || { name: vid.addedBy || "?", color: "#7a9ab5" };
            const gateColor = vid.gateId.startsWith("SK") ? "#3088cc" : "#7a9ab5";
            return (
              <div
                onClick={() => selectable && onSelect && onSelect(vid)}
                style={{
                  padding: "12px", borderRadius: 8,
                  background: selected ? "rgba(48,136,204,0.08)" : "rgba(255,255,255,0.02)",
                  border: `1.5px solid ${selected ? "rgba(48,136,204,0.35)" : "rgba(255,255,255,0.05)"}`,
                  cursor: selectable ? "pointer" : "default",
                  transition: "border-color 0.15s ease",
                }}
              >
                <div style={{ display: "flex", gap: 10 }}>
                  {ytId ? (
                    <a href={vid.url} target="_blank" rel="noopener noreferrer" onClick={e => { if (selectable) e.preventDefault(); }} style={{
                      width: 120, height: 68, borderRadius: 5, overflow: "hidden", flexShrink: 0,
                      background: "#000", display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
                    }}>
                      <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", width: 28, height: 20, borderRadius: 4, background: "rgba(255,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontSize: 11, color: "#fff" }}>▶</span>
                      </div>
                    </a>
                  ) : (
                    <div style={{ width: 120, height: 68, borderRadius: 5, background: "rgba(255,255,255,0.03)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 25, flexShrink: 0 }}>🎬</div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#c0ccd8" }}>{vid.date}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: gateColor, padding: "1px 6px", borderRadius: 3, background: `${gateColor}12`, border: `1px solid ${gateColor}20` }}>{vid.gateId}</span>
                      <span style={{ fontSize: 14, color: "#6a8098" }}>{vid.criterion}</span>
                    </div>
                    {vid.notes && <div style={{ fontSize: 14, color: "#6a8098", lineHeight: 1.4, marginBottom: 3 }}>{vid.notes}</div>}
                    <div style={{ fontSize: 13, color: addedByUser.color }}>by {addedByUser.name}</div>
                    {(vid.comments || []).length > 0 && (
                      <div style={{ fontSize: 13, color: "#28a858", marginTop: 3 }}>💬 {vid.comments.length} comment{vid.comments.length !== 1 ? "s" : ""}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          };

          return (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 16, color: "#5a7898", lineHeight: 1.55, marginBottom: 12 }}>
                  All skiing videos across all tasks, sorted by date. Use comparison mode to view two videos side by side.
                </div>

                {/* Controls */}
                <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                  {/* Category filter */}
                  <select
                    value={catFilter}
                    onChange={ev => setCatFilter(ev.target.value)}
                    style={{
                      padding: "6px 10px", fontSize: 14, fontWeight: 600, borderRadius: 6,
                      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                      color: "#a0b0c0", outline: "none", fontFamily: "inherit", appearance: "auto", cursor: "pointer",
                    }}
                  >
                    <option value="all">All Categories</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>

                  {/* Compare toggle */}
                  <button
                    onClick={() => { setCompareMode(!compareMode); setCompareA(null); setCompareB(null); }}
                    style={{
                      padding: "6px 14px", borderRadius: 6, fontSize: 14, fontWeight: 700, cursor: "pointer",
                      background: compareMode ? "rgba(48,136,204,0.15)" : "rgba(255,255,255,0.03)",
                      border: `1.5px solid ${compareMode ? "rgba(48,136,204,0.4)" : "rgba(255,255,255,0.08)"}`,
                      color: compareMode ? "#5ab0e0" : "#6a8098",
                    }}
                  >
                    {compareMode ? "✕ Exit Compare" : "⇆ Compare Two Videos"}
                  </button>

                  <span style={{ fontSize: 14, color: "#5a7898", marginLeft: "auto" }}>{filtered.length} video{filtered.length !== 1 ? "s" : ""}</span>
                </div>
              </div>

              {/* Compare mode instruction */}
              {compareMode && (!compareA || !compareB) && (
                <div style={{
                  padding: "10px 14px", marginBottom: 14, borderRadius: 8,
                  background: "rgba(48,136,204,0.06)", border: "1px solid rgba(48,136,204,0.15)",
                  fontSize: 15, color: "#5ab0e0",
                }}>
                  {!compareA ? "Select the first video to compare" : "Now select the second video"}
                </div>
              )}

              {/* Side-by-side comparison */}
              {compareMode && compareA && compareB && (
                <div style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20,
                  padding: "14px", borderRadius: 10,
                  background: "rgba(48,136,204,0.04)", border: "1px solid rgba(48,136,204,0.12)",
                }}>
                  {[compareA, compareB].map((vid, si) => {
                    const ytId = getYtId(vid.url);
                    const gateData = videoData[vid.gateId] || {};
                    return (
                      <div key={si}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#3088cc", marginBottom: 4 }}>{vid.gateId} — {vid.criterion}</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: "#c0ccd8", marginBottom: 6 }}>{vid.date}</div>
                        {ytId && (
                          <a href={vid.url} target="_blank" rel="noopener noreferrer" style={{
                            display: "block", width: "100%", aspectRatio: "16/9", borderRadius: 6, overflow: "hidden",
                            background: "#000", marginBottom: 8, position: "relative",
                          }}>
                            <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 36, height: 25, borderRadius: 5, background: "rgba(255,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <span style={{ fontSize: 13, color: "#fff" }}>▶</span>
                            </div>
                          </a>
                        )}
                        {vid.notes && <div style={{ fontSize: 14, color: "#6a8098", lineHeight: 1.4, marginBottom: 6 }}>{vid.notes}</div>}
                        {gateData.cues && (
                          <div style={{ fontSize: 13, color: "#607898", padding: "6px 8px", borderRadius: 5, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", marginBottom: 6 }}>
                            <span style={{ fontWeight: 700, color: "#6a8098" }}>Cues: </span>{gateData.cues}
                          </div>
                        )}
                        {(vid.comments || []).map((c, ci) => {
                          const commenter = USERS[c.userId] || { name: c.userId, color: "#7a9ab5" };
                          return (
                            <div key={ci} style={{ display: "flex", gap: 5, alignItems: "flex-start", marginBottom: 4 }}>
                              <span style={{ width: 16, height: 16, borderRadius: "50%", background: `${commenter.color}20`, border: `1px solid ${commenter.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 800, color: commenter.color, flexShrink: 0 }}>{commenter.name[0]}</span>
                              <div style={{ fontSize: 13, color: "#a0b0c0", lineHeight: 1.4 }}>
                                <strong style={{ color: commenter.color }}>{commenter.name}</strong> {c.text}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Video list */}
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "50px 20px", color: "#3a5068" }}>
                  <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>🎬</div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: "#5a7898" }}>No videos yet</div>
                  <div style={{ fontSize: 16, color: "#3a5068", marginTop: 4 }}>Add videos in the Video Progress tab to see them here.</div>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filtered.map((vid, vi) => {
                    const isA = compareA && compareA.url === vid.url && compareA.gateId === vid.gateId && compareA.date === vid.date;
                    const isB = compareB && compareB.url === vid.url && compareB.gateId === vid.gateId && compareB.date === vid.date;
                    return (
                      <VideoCard
                        key={`${vid.gateId}-${vi}`}
                        vid={vid}
                        selectable={compareMode}
                        selected={isA || isB}
                        onSelect={(v) => {
                          if (!compareA) setCompareA(v);
                          else if (!compareB && !(compareA.url === v.url && compareA.gateId === v.gateId && compareA.date === v.date)) setCompareB(v);
                          else { setCompareA(v); setCompareB(null); }
                        }}
                      />
                    );
                  })}
                </div>
              )}
            </>
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
                <div style={{ fontSize: 16, color: "#5a7898", lineHeight: 1.55, marginBottom: 12 }}>
                  One-time development snapshot. Score yourself on the Fitts & Posner 1–6 scale. Mentors (Chris, Gates, Mike) score independently — compare in the baseline conversation to agree on strengths, gaps, and first LOs.
                </div>

                {/* Summary bar */}
                <div style={{
                  display: "flex", gap: 16, padding: "12px 14px", marginBottom: 6,
                  background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 8,
                  flexWrap: "wrap",
                }}>
                  <div>
                    <div style={{ fontSize: 13, color: "#5a7898", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Scored</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#d0d8e0" }}>{totalScored}<span style={{ fontSize: 15, color: "#5a7898", fontWeight: 500 }}>/{totalGates}</span></div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "#5a7898", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Avg Score</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: Number(avgScore) >= 4 ? "#28a858" : "#e07830" }}>{avgScore}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, color: "#5a7898", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>At or Above 4</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "#28a858" }}>
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
                      fontSize: 13, fontWeight: 600, padding: "2px 6px", borderRadius: 3,
                      background: f.score >= 4 ? "rgba(40,168,88,0.08)" : "rgba(255,255,255,0.02)",
                      border: `1px solid ${f.score >= 4 ? "rgba(40,168,88,0.18)" : "rgba(255,255,255,0.04)"}`,
                      color: f.score >= 4 ? "#28a858" : "#5a7898",
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
                      <span style={{ fontSize: 17, fontWeight: 700, color: mod.color }}>{modName}</span>
                      <span style={{ fontSize: 14, color: "#5a7898" }}>{modScored}/{mod.gates.length} scored</span>
                    </div>

                    {/* Column headers */}
                    <div style={{
                      display: "grid", gridTemplateColumns: "1fr 42px 42px 42px 42px 36px",
                      gap: 4, padding: "6px 8px", marginBottom: 2,
                      background: "rgba(255,255,255,0.02)", borderRadius: 6,
                    }}>
                      <span style={{ fontSize: 13, color: "#5a7898", fontWeight: 700, textTransform: "uppercase" }}>Criterion</span>
                      <span style={{ fontSize: 13, color: "#e8a050", fontWeight: 700, textAlign: "center" }}>Mark</span>
                      <span style={{ fontSize: 13, color: "#28a858", fontWeight: 700, textAlign: "center" }}>Chris</span>
                      <span style={{ fontSize: 13, color: "#28a858", fontWeight: 700, textAlign: "center" }}>Gates</span>
                      <span style={{ fontSize: 13, color: "#28a858", fontWeight: 700, textAlign: "center" }}>Mike</span>
                      <span style={{ fontSize: 13, color: "#5a7898", fontWeight: 700, textAlign: "center" }}>💬</span>
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
                            width: "100%", padding: "4px 2px", fontSize: 16, fontWeight: 700,
                            textAlign: "center", borderRadius: 4, cursor: "pointer",
                            background: value >= 4 ? "rgba(40,168,88,0.12)" : value > 0 ? "rgba(224,120,48,0.1)" : "rgba(255,255,255,0.03)",
                            border: `1px solid ${value >= 4 ? "rgba(40,168,88,0.3)" : value > 0 ? "rgba(224,120,48,0.2)" : "rgba(255,255,255,0.06)"}`,
                            color: value >= 4 ? "#28a858" : value > 0 ? "#e07830" : "#4d6888",
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
                                fontSize: 13, fontWeight: 800, color: mod.color,
                                textTransform: "uppercase", letterSpacing: "0.08em",
                              }}>
                                {gate.category}
                              </span>
                            </div>
                          )}
                          <div style={{
                            display: "grid", gridTemplateColumns: "1fr 42px 42px 42px 42px 36px",
                            gap: 4, padding: "6px 8px", alignItems: "center",
                            background: gi % 2 === 0 ? "transparent" : "rgba(255,255,255,0.012)",
                            borderRadius: 4,
                          }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: mod.color, flexShrink: 0 }}>{gate.id}</span>
                            <span style={{ fontSize: 15, color: "#a0b0c0", lineHeight: 1.3 }}>{gate.criterion}</span>
                          </div>
                          {scoreSelect("mark", scores.mark)}
                          {scoreSelect("chris", scores.chris)}
                          {scoreSelect("gates", scores.gates)}
                          {scoreSelect("mike", scores.mike)}
                          <button
                            onClick={() => setExpandedBaselineGate(expandedBaselineGate === gate.id ? null : gate.id)}
                            style={{
                              width: 36, height: 28, borderRadius: 5, cursor: "pointer",
                              background: (baselineComments[gate.id] || []).length > 0 ? "rgba(40,168,88,0.1)" : "rgba(255,255,255,0.02)",
                              border: `1px solid ${(baselineComments[gate.id] || []).length > 0 ? "rgba(40,168,88,0.25)" : "rgba(255,255,255,0.06)"}`,
                              color: (baselineComments[gate.id] || []).length > 0 ? "#28a858" : "#4d6888",
                              fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 2,
                            }}
                          >
                            💬 {(baselineComments[gate.id] || []).length > 0 ? (baselineComments[gate.id] || []).length : ""}
                          </button>
                        </div>

                        {/* Expandable comment thread */}
                        {expandedBaselineGate === gate.id && (
                          <div style={{
                            margin: "0 8px 8px", padding: "12px",
                            background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)",
                            borderRadius: 8,
                          }}>
                            {(baselineComments[gate.id] || []).length === 0 && (
                              <div style={{ fontSize: 14, color: "#4d6888", marginBottom: 10, fontStyle: "italic" }}>
                                No notes yet — add observations about this criterion.
                              </div>
                            )}
                            {(baselineComments[gate.id] || []).map((c, ci) => {
                              const commenter = USERS[c.userId] || { name: c.userId, color: "#7a9ab5" };
                              return (
                                <div key={ci} style={{
                                  display: "flex", gap: 8, marginBottom: 8,
                                  padding: "8px 10px", borderRadius: 6,
                                  background: `${commenter.color}06`,
                                  border: `1px solid ${commenter.color}12`,
                                }}>
                                  <div style={{
                                    width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                                    background: `${commenter.color}20`, border: `1.5px solid ${commenter.color}40`,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 12, fontWeight: 800, color: commenter.color,
                                  }}>{commenter.name[0]}</div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
                                      <span style={{ fontSize: 14, fontWeight: 700, color: commenter.color }}>{commenter.name}</span>
                                      <span style={{ fontSize: 12, color: "#4d6888" }}>
                                        {c.timestamp ? new Date(c.timestamp).toLocaleDateString("en", { month: "short", day: "numeric" }) : ""}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: 15, color: "#b0bcc8", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{c.text}</div>
                                  </div>
                                </div>
                              );
                            })}
                            <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                              <div style={{
                                width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                                background: `${currentUser?.color || "#7a9ab5"}20`,
                                border: `1.5px solid ${currentUser?.color || "#7a9ab5"}40`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 12, fontWeight: 800, color: currentUser?.color || "#7a9ab5",
                              }}>{currentUser?.name?.[0] || "?"}</div>
                              <textarea
                                id={`bl-comment-${gate.id}`}
                                placeholder="Add a note about this criterion..."
                                style={{
                                  flex: 1, minHeight: 36, padding: "6px 10px", fontSize: 14, color: "#c0ccd8",
                                  background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)",
                                  borderRadius: 6, outline: "none", fontFamily: "inherit", resize: "vertical",
                                  lineHeight: 1.5, boxSizing: "border-box",
                                }}
                                onKeyDown={ev => {
                                  if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) {
                                    const el = document.getElementById(`bl-comment-${gate.id}`);
                                    const text = el.value.trim();
                                    if (!text) return;
                                    const newComments = [...(baselineComments[gate.id] || []), { userId: currentUser?.key, text, timestamp: new Date().toISOString() }];
                                    const updated = { ...baselineComments, [gate.id]: newComments };
                                    setBaselineComments(updated);
                                    apiUpdate("GateStatus", { gateId: "_BASELINE_COMMENTS", leData: JSON.stringify(updated) });
                                    el.value = "";
                                  }
                                }}
                              />
                              <button onClick={() => {
                                const el = document.getElementById(`bl-comment-${gate.id}`);
                                const text = el.value.trim();
                                if (!text) return;
                                const newComments = [...(baselineComments[gate.id] || []), { userId: currentUser?.key, text, timestamp: new Date().toISOString() }];
                                const updated = { ...baselineComments, [gate.id]: newComments };
                                setBaselineComments(updated);
                                apiUpdate("GateStatus", { gateId: "_BASELINE_COMMENTS", leData: JSON.stringify(updated) });
                                el.value = "";
                              }} style={{
                                padding: "6px 12px", borderRadius: 5, fontSize: 14, fontWeight: 700,
                                background: `${currentUser?.color || "#3088cc"}12`,
                                border: `1px solid ${currentUser?.color || "#3088cc"}30`,
                                color: currentUser?.color || "#3088cc", cursor: "pointer", flexShrink: 0,
                              }}>Post</button>
                            </div>
                            <div style={{ fontSize: 12, color: "#3a5068", marginTop: 3 }}>Ctrl+Enter to post</div>
                          </div>
                        )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {/* Baseline Conversation Summary */}
              <Card style={{ marginTop: 10, borderLeft: "3px solid #e07830" }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#e8a050", marginBottom: 12 }}>
                  Baseline Conversation Summary
                </div>
                <div style={{ fontSize: 14, color: "#5a7898", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Top Strengths (agreed)
                </div>
                <textarea
                  value={baselineNotes._strengths || ""}
                  onChange={e => setBaselineNotes(p => ({ ...p, _strengths: e.target.value }))}
                  placeholder="Agreed strengths from the baseline conversation..."
                  style={{ width: "100%", minHeight: 50, padding: "8px 10px", fontSize: 16, color: "#c0ccd8", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box", marginBottom: 12 }}
                />
                <div style={{ fontSize: 14, color: "#5a7898", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Top Development Priorities (agreed)
                </div>
                <textarea
                  value={baselineNotes._priorities || ""}
                  onChange={e => setBaselineNotes(p => ({ ...p, _priorities: e.target.value }))}
                  placeholder="Agreed development priorities..."
                  style={{ width: "100%", minHeight: 50, padding: "8px 10px", fontSize: 16, color: "#c0ccd8", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box", marginBottom: 12 }}
                />
                <div style={{ fontSize: 14, color: "#5a7898", marginBottom: 4, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                  Mentor Notes from Baseline Conversation
                </div>
                <textarea
                  value={baselineNotes._mentorNotes || ""}
                  onChange={e => setBaselineNotes(p => ({ ...p, _mentorNotes: e.target.value }))}
                  placeholder="Chris / Gates / Mike notes..."
                  style={{ width: "100%", minHeight: 50, padding: "8px 10px", fontSize: 16, color: "#c0ccd8", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 6, outline: "none", fontFamily: "inherit", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box" }}
                />
              </Card>
            </>
          );
        })()}

        {/* ═══ TAB: LEARNING OBJECTIVES LIST ═══ */}
        {tab === "los" && !isSubView && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 16, color: "#5a7898" }}>
                Mentor-defined objectives tied to assessment gates. Mentors: create LOs here — Mark tracks progress.
              </div>
              <button onClick={newLO} style={{
                padding: "7px 14px", borderRadius: 6, border: "1px solid rgba(224,120,48,0.4)",
                background: "rgba(224,120,48,0.1)", color: "#e8a050", fontSize: 15, fontWeight: 700, cursor: "pointer",
                whiteSpace: "nowrap", flexShrink: 0, marginLeft: 10,
              }}>+ Add LO</button>
            </div>
            {seasonLos.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#3a5068" }}>
                <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>📋</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#5a7898" }}>No Learning Objectives yet</div>
                <div style={{ fontSize: 16, color: "#3a5068", marginTop: 4 }}>Mentors: tap "+ Add LO" to assign Mark's first objective.</div>
              </div>
            ) : (
              seasonLos.map(lo => {
                const mc = MODULE_COLORS_SIMPLE[lo.module] || "#7a9ab5";
                const entryCount = seasonEntries.filter(e => (e.activeLOIds || []).includes(lo.id)).length;
                return (
                  <div key={lo.id} onClick={() => setViewingLO(lo)} style={{ cursor: "pointer" }}>
                    <Card style={{ borderLeft: `3px solid ${mc}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 17, fontWeight: 700, color: mc }}>{lo.objId}</span>
                            <StatusBadge status={lo.status} />
                            <span style={{ fontSize: 14, color: "#4d6888" }}>by {lo.assignedBy}</span>
                            {entryCount > 0 && <span style={{ fontSize: 14, color: "#607898" }}>{entryCount} {entryCount === 1 ? "entry" : "entries"}</span>}
                          </div>
                          <div style={{ fontSize: 17, color: "#a0b0c0", lineHeight: 1.45, marginBottom: lo.gates.length > 0 ? 6 : 0 }}>
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
                            fontSize: 17, fontWeight: 800, color: lo.score >= 4 ? "#28a858" : "#e07830",
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
        {tab === "diary" && !isSubView && (() => {
          const userKey = currentUser?.key;

          // Compute filtered entries
          const needsAttentionEntries = seasonEntries.filter(e =>
            e.flag === "For Review" &&
            !(e.comments || []).some(c => c.userId === userKey)
          );
          const unreadEntries = seasonEntries.filter(e =>
            !(e.readBy || []).some(r => r.userId === userKey)
          );
          const newCommentEntries = seasonEntries.filter(e => {
            const myRead = (e.readBy || []).find(r => r.userId === userKey);
            if (!myRead) return (e.comments || []).some(c => c.userId !== userKey);
            return (e.comments || []).some(c => c.userId !== userKey && c.timestamp > myRead.timestamp);
          });

          const filteredEntries = (diaryFilter === "attention"
            ? needsAttentionEntries
            : diaryFilter === "unread"
            ? unreadEntries
            : diaryFilter === "newcomments"
            ? newCommentEntries
            : seasonEntries
          ).slice().sort((a, b) => (b.date || "").localeCompare(a.date || ""));

          return (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ fontSize: 16, color: "#5a7898" }}>Sessions linked to LOs — gates auto-derived.</div>
              <button onClick={newEntry} style={{
                padding: "7px 14px", borderRadius: 6, border: "1px solid rgba(224,120,48,0.4)",
                background: "rgba(224,120,48,0.1)", color: "#e8a050", fontSize: 15, fontWeight: 700, cursor: "pointer",
                whiteSpace: "nowrap", flexShrink: 0,
              }}>+ New Entry</button>
            </div>

            {/* Filter buttons */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14, flexWrap: "wrap" }}>
              {[
                { id: "all", label: `All (${seasonEntries.length})`, color: "#7a9ab5" },
                { id: "attention", label: `Needs Feedback (${needsAttentionEntries.length})`, color: "#e05028" },
                { id: "unread", label: `Unread (${unreadEntries.length})`, color: "#3088cc" },
                { id: "newcomments", label: `New Comments (${newCommentEntries.length})`, color: "#28a858" },
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setDiaryFilter(f.id)}
                  style={{
                    padding: "5px 11px", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    border: diaryFilter === f.id ? `1.5px solid ${f.color}` : "1.5px solid rgba(255,255,255,0.06)",
                    background: diaryFilter === f.id ? `${f.color}15` : "rgba(255,255,255,0.015)",
                    color: diaryFilter === f.id ? f.color : "#5a7898",
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {filteredEntries.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#3a5068" }}>
                <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>
                  {diaryFilter === "attention" ? "✅" : diaryFilter === "unread" ? "👀" : diaryFilter === "newcomments" ? "💬" : "⛷"}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "#5a7898" }}>
                  {diaryFilter === "attention" ? "All caught up — no entries need your feedback"
                    : diaryFilter === "unread" ? "You've read everything"
                    : diaryFilter === "newcomments" ? "No new comments to review"
                    : "No diary entries yet"}
                </div>
                {diaryFilter !== "all" && (
                  <button onClick={() => setDiaryFilter("all")} style={{
                    marginTop: 12, padding: "6px 14px", borderRadius: 6, fontSize: 14, fontWeight: 600,
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                    color: "#6a8098", cursor: "pointer",
                  }}>Show all entries</button>
                )}
              </div>
            ) : (
              filteredEntries.map(e => {
                const fc = FLAG_COLORS[e.flag] || FLAG_COLORS["FYI"];
                const mc = MODULE_COLORS_SIMPLE[e.moduleFocus] || "#7a9ab5";
                const linkedLOs = los.filter(l => (e.activeLOIds || []).includes(l.id));
                const derivedGates = [...new Set(linkedLOs.flatMap(l => l.gates || []))];
                const isUnread = !(e.readBy || []).some(r => r.userId === userKey);
                const hasNewComments = (() => {
                  const myRead = (e.readBy || []).find(r => r.userId === userKey);
                  if (!myRead) return (e.comments || []).some(c => c.userId !== userKey);
                  return (e.comments || []).some(c => c.userId !== userKey && c.timestamp > myRead.timestamp);
                })();
                return (
                  <div key={e.id} onClick={() => { const updated = markAsRead(e); setViewingEntry(updated || e); }} style={{ cursor: "pointer" }}>
                    <Card style={{
                      borderLeft: isUnread ? "3px solid #3088cc" : hasNewComments ? "3px solid #28a858" : e.flag === "For Review" && !(e.comments || []).some(c => c.userId === userKey) ? "3px solid #e05028" : undefined,
                    }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <div style={{
                          width: 44, flexShrink: 0, textAlign: "center", padding: "5px 0",
                          borderRadius: 6, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)",
                        }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: "#b0bcc8", lineHeight: 1 }}>
                            {new Date(e.date + "T12:00:00").getDate()}
                          </div>
                          <div style={{ fontSize: 12, color: "#4d6888", fontWeight: 700, textTransform: "uppercase", marginTop: 1 }}>
                            {new Date(e.date + "T12:00:00").toLocaleString("en", { month: "short" })}
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", marginBottom: 3 }}>
                            <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 13, fontWeight: 700, background: fc.bg, border: `1px solid ${fc.border}`, color: fc.text }}>{e.flag}</span>
                            <span style={{ padding: "2px 6px", borderRadius: 4, fontSize: 13, fontWeight: 600, background: `${mc}12`, border: `1px solid ${mc}25`, color: mc }}>{e.moduleFocus}</span>
                            {e.location && <span style={{ fontSize: 14, color: "#4d6888" }}>{e.location}</span>}
                            {(e.attachments || []).length > 0 && <span style={{ fontSize: 13, color: "#3088cc" }}>📎 {e.attachments.length}</span>}
                            {(e.comments || []).length > 0 && <span style={{ fontSize: 13, color: "#28a858" }}>💬 {e.comments.length}</span>}
                            {/* Read-by mini avatars */}
                            <span style={{ display: "inline-flex", gap: 2, marginLeft: 2 }}>
                              {["mark", "chris", "gates", "mike"].map(userId => {
                                const user = USERS[userId];
                                const isRead = (e.readBy || []).some(r => r.userId === userId);
                                const hasCommented = (e.comments || []).some(c => c.userId === userId);
                                if (!isRead && !hasCommented) return null;
                                return (
                                  <span key={userId} title={`${user.name}${hasCommented ? " (commented)" : " (viewed)"}`} style={{
                                    width: 16, height: 16, borderRadius: "50%",
                                    background: `${user.color}20`, border: `1.5px solid ${user.color}50`,
                                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 9, fontWeight: 800, color: user.color,
                                  }}>
                                    {user.name[0]}
                                  </span>
                                );
                              })}
                            </span>
                          </div>
                          <div style={{ fontSize: 16, color: "#8898a8", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                            {e.workedOn || "No description"}
                          </div>
                          {(linkedLOs.length > 0 || derivedGates.length > 0) && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 5 }}>
                              {linkedLOs.map(lo => (
                                <span key={lo.id} style={{ fontSize: 13, fontWeight: 700, color: MODULE_COLORS_SIMPLE[lo.module], padding: "1px 5px", borderRadius: 3, background: `${MODULE_COLORS_SIMPLE[lo.module]}12`, border: `1px solid ${MODULE_COLORS_SIMPLE[lo.module]}20` }}>
                                  {lo.objId}
                                </span>
                              ))}
                              {derivedGates.slice(0, 5).map(g => <GateChip key={g} gateId={g} small />)}
                              {derivedGates.length > 5 && <span style={{ fontSize: 13, color: "#4d6888", alignSelf: "center" }}>+{derivedGates.length - 5}</span>}
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
          );
        })()}

        {/* ═══ TAB: GATE READINESS ═══ */}
        {tab === "gates" && !isSubView && (
          <>
            <div style={{ fontSize: 16, color: "#5a7898", marginBottom: 16, lineHeight: 1.5 }}>
              Each gate is an exam readiness criterion. Gates light up as LOs develop them. A gate is ready when a mentor verifies the linked LO at 4+ (High Associative).
            </div>

            {/* Fitts & Posner Legend */}
            <div style={{
              display: "flex", gap: 3, flexWrap: "wrap", marginBottom: 10, padding: "10px 12px",
              background: "rgba(255,255,255,0.015)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 8,
            }}>
              {FITTS_POSNER.map(f => (
                <span key={f.score} style={{
                  fontSize: 13, fontWeight: 600, padding: "3px 7px", borderRadius: 4,
                  background: f.score >= 4 ? "rgba(40,168,88,0.08)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${f.score >= 4 ? "rgba(40,168,88,0.2)" : "rgba(255,255,255,0.05)"}`,
                  color: f.score >= 4 ? "#28a858" : "#607898",
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
                <div style={{ width: 20, height: 16, borderRadius: 3, background: "rgba(40,168,88,0.12)", border: "1px solid rgba(40,168,88,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#28a858" }}>✓</div>
                <span style={{ fontSize: 14, color: "#6a8098" }}>Best examiner score (gate passes at 4+)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 20, height: 16, borderRadius: 3, background: "rgba(180,80,40,0.06)", border: "1px dashed rgba(180,80,40,0.25)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#b45028" }}>2</div>
                <span style={{ fontSize: 14, color: "#6a8098" }}>Baseline lowest (hover for breakdown)</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#28a858" }}>C</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#28a858" }}>G</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#28a858" }}>M</span>
                <span style={{ fontSize: 14, color: "#6a8098" }}>= Chris · Gates · Mike sign-off scores</span>
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
                    <span style={{ fontSize: 17, fontWeight: 700, color: mod.color }}>{modName}</span>
                    <span style={{ fontSize: 15, color: "#5a7898" }}>
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
                    <span style={{ fontSize: 12, color: "#5a7898", fontWeight: 700, textAlign: "center" }}>NOW</span>
                    <span style={{ fontSize: 12, color: "#5a7898", fontWeight: 700, textAlign: "center" }}>BASE</span>
                    <span style={{ fontSize: 12, color: "#5a7898", fontWeight: 700 }}>CRITERION</span>
                    <span style={{ fontSize: 12, color: "#28a858", fontWeight: 700, textAlign: "center" }}>C</span>
                    <span style={{ fontSize: 12, color: "#28a858", fontWeight: 700, textAlign: "center" }}>G</span>
                    <span style={{ fontSize: 12, color: "#28a858", fontWeight: 700, textAlign: "center" }}>M</span>
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
                          width: "100%", padding: "3px 1px", fontSize: 15, fontWeight: 700,
                          textAlign: "center", borderRadius: 4, cursor: "pointer",
                          background: value >= 4 ? "rgba(40,168,88,0.15)" : value > 0 ? "rgba(224,120,48,0.1)" : "rgba(255,255,255,0.03)",
                          border: `1px solid ${value >= 4 ? "rgba(40,168,88,0.35)" : value > 0 ? "rgba(224,120,48,0.2)" : "rgba(255,255,255,0.06)"}`,
                          color: value >= 4 ? "#28a858" : value > 0 ? "#e07830" : "#4d6888",
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
                              fontSize: 14, fontWeight: 800, color: mod.color,
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
                          fontSize: 15, fontWeight: 800,
                          color: isPassed ? "#28a858" : bestGateScore > 0 ? mod.color : "#3a5068",
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
                            fontSize: 13, fontWeight: 700,
                            color: hasBaseline
                              ? lowestBaseline >= 4 ? "#28a858" : "#b45028"
                              : "#3a5068",
                          }}>
                          {hasBaseline ? lowestBaseline : "·"}
                        </div>
                        {/* Criterion + LO badges */}
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: mod.color }}>{gate.id}</span>
                            <span style={{
                              fontSize: 16, color: isPassed ? "#6a8098" : hasLO ? "#a0b0c0" : "#4d6888",
                              textDecoration: isPassed ? "line-through" : "none",
                            }}>
                              {gate.criterion}
                            </span>
                          </div>
                          {(hasLO || entryCount > 0) && (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginTop: 3 }}>
                              {linkedLOs.map(lo => (
                                <span key={lo.id} onClick={(ev) => { ev.stopPropagation(); setViewingLO(lo); }} style={{
                                  fontSize: 13, fontWeight: 600, padding: "2px 6px", borderRadius: 3, cursor: "pointer",
                                  background: LO_STATUS_COLORS[lo.status].bg,
                                  border: `1px solid ${LO_STATUS_COLORS[lo.status].border}`,
                                  color: LO_STATUS_COLORS[lo.status].text,
                                }}>
                                  {lo.objId} · {lo.status}
                                </span>
                              ))}
                              {entryCount > 0 && (
                                <span style={{ fontSize: 13, color: "#607898", alignSelf: "center" }}>
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
        .at-container { max-width: 720px; margin: 0 auto; }
        @media (min-width: 768px) { .at-container { max-width: 1024px; } }
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
