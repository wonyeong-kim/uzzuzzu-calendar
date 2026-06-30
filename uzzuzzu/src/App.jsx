import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Trash2,
  Calendar as CalendarIcon,
  Building2,
  Plus,
  Pencil,
  ArrowLeft,
  Briefcase,
  Coffee,
  Wallet,
  Receipt,
  Users,
  ClipboardList,
  Copy,
  Check,
} from "lucide-react";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const QUICK_VALUES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3];

const PALETTE = [
  "#b8391d",
  "#2d5f4e",
  "#8b5a2b",
  "#3b5998",
  "#c69a1f",
  "#6b4c7a",
  "#d97556",
  "#4a5568",
];

// 휴무 카테고리
const OFFDAY_TYPES = [
  { id: "holiday", label: "휴일", color: "#3b5998", short: "휴" },
  { id: "company_off", label: "회사휴무", color: "#6b4c7a", short: "회" },
  { id: "hospital", label: "병원", color: "#c53030", short: "병" },
  { id: "personal", label: "개인업무", color: "#c69a1f", short: "개" },
  { id: "other", label: "기타", color: "#8c8070", short: "기" },
];

// 경비 분류
const EXPENSE_TYPES = [
  { id: "transport", label: "교통비", icon: "🚗" },
  { id: "meal", label: "식대", icon: "🍱" },
  { id: "material", label: "자재비", icon: "🔧" },
  { id: "gear", label: "장비·작업복", icon: "👷" },
  { id: "other", label: "기타", icon: "📝" },
];

const C = {
  bg: "#f4efe6",
  surface: "#faf6ed",
  card: "#ffffff",
  ink: "#1f1b16",
  inkSoft: "#4a4238",
  muted: "#8c8070",
  border: "#e4dccb",
  borderSoft: "#eee6d5",
  accent: "#b8391d",
  accentSoft: "#f5e4de",
  accentDark: "#8e2a14",
  green: "#2d5f4e",
  greenSoft: "#e0ebe5",
  orange: "#c47533",
  orangeSoft: "#f5e9dc",
  sun: "#c53030",
  sat: "#2b6cb0",
};

const FONT_DISPLAY = "'Gowun Batang', 'Noto Serif KR', serif";
const FONT_BODY = "'IBM Plex Sans KR', 'Pretendard', -apple-system, sans-serif";

const pad = (n) => String(n).padStart(2, "0");
const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const isSameDay = (a, b) => dateKey(a) === dateKey(b);
const won = (n) => Math.round(n).toLocaleString("ko-KR");
const fmtUnits = (n) =>
  Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
const genId = (prefix = "s") =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
const suggestAbbr = (name) => {
  if (!name) return "";
  const cleaned = name.replace(/\s+/g, "");
  return cleaned.slice(0, 2);
};

const tint = (hex, alpha) => {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

// ===== localStorage wrapper =====
const storage = {
  get: (key) => {
    try {
      const v = localStorage.getItem(key);
      return v ? { value: v } : null;
    } catch {
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
};

export default function App() {
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [sites, setSites] = useState([]);
  const [workUnits, setWorkUnits] = useState({}); // { dateKey: {siteId, value} }
  const [offDays, setOffDays] = useState({}); // { dateKey: {type, memo} }
  const [expenses, setExpenses] = useState({}); // { dateKey: [{id, type, amount, memo, siteId|null}] }

  // ===== Team management (팀장 기능) =====
  const [workers, setWorkers] = useState([]); // [{id, name, role, siteId, rate, active}]
  const [teamWork, setTeamWork] = useState({}); // { dateKey: { workerId: value } }
  const [dailyReports, setDailyReports] = useState({}); // { dateKey: { siteId, content, note } }
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [editingWorker, setEditingWorker] = useState(null); // worker obj or {new:true}
  const [confirmDeleteWorker, setConfirmDeleteWorker] = useState(null);

  // Tab in day modal: "work" | "off" | "expense"
  const [selectedKey, setSelectedKey] = useState(null);
  const [modalTab, setModalTab] = useState("work");

  // Work tab state
  const [draftSiteId, setDraftSiteId] = useState(null);
  const [inputValue, setInputValue] = useState("");

  // Off tab state
  const [draftOffType, setDraftOffType] = useState("holiday");
  const [draftOffMemo, setDraftOffMemo] = useState("");

  const [showSitesList, setShowSitesList] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [confirmDeleteSite, setConfirmDeleteSite] = useState(null);

  // Expense editing
  const [editingExpense, setEditingExpense] = useState(null); // {dateKey, expense} or {dateKey, new: true}

  const [loaded, setLoaded] = useState(false);

  // Google Fonts
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@300;400;500;600;700&display=swap";
    document.head.appendChild(link);
    return () => {
      try {
        document.head.removeChild(link);
      } catch {}
    };
  }, []);

  // Load
  useEffect(() => {
    let loadedSites = null;
    let loadedWU = null;
    let loadedOff = null;
    let loadedExp = null;

    try {
      const r = storage.get("uzzuzzu:sites");
      if (r?.value) loadedSites = JSON.parse(r.value);
    } catch {}
    try {
      const r = storage.get("uzzuzzu:workUnits");
      if (r?.value) loadedWU = JSON.parse(r.value);
    } catch {}
    try {
      const r = storage.get("uzzuzzu:offDays");
      if (r?.value) loadedOff = JSON.parse(r.value);
    } catch {}
    try {
      const r = storage.get("uzzuzzu:expenses");
      if (r?.value) loadedExp = JSON.parse(r.value);
    } catch {}

    let loadedWorkers = null;
    let loadedTeamWork = null;
    let loadedReports = null;
    try {
      const r = storage.get("uzzuzzu:workers");
      if (r?.value) loadedWorkers = JSON.parse(r.value);
    } catch {}
    try {
      const r = storage.get("uzzuzzu:teamWork");
      if (r?.value) loadedTeamWork = JSON.parse(r.value);
    } catch {}
    try {
      const r = storage.get("uzzuzzu:dailyReports");
      if (r?.value) loadedReports = JSON.parse(r.value);
    } catch {}

    if (!loadedSites) {
      const defaultSite = {
        id: genId(),
        name: "기본 현장",
        abbr: "기본",
        rate: 200000,
        color: PALETTE[0],
      };
      loadedSites = [defaultSite];
    }

    setSites(loadedSites || []);
    setWorkUnits(loadedWU || {});
    setOffDays(loadedOff || {});
    setExpenses(loadedExp || {});
    setWorkers(loadedWorkers || []);
    setTeamWork(loadedTeamWork || {});
    setDailyReports(loadedReports || {});
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    storage.set("uzzuzzu:sites", JSON.stringify(sites));
  }, [sites, loaded]);
  useEffect(() => {
    if (!loaded) return;
    storage.set("uzzuzzu:workUnits", JSON.stringify(workUnits));
  }, [workUnits, loaded]);
  useEffect(() => {
    if (!loaded) return;
    storage.set("uzzuzzu:offDays", JSON.stringify(offDays));
  }, [offDays, loaded]);
  useEffect(() => {
    if (!loaded) return;
    storage.set("uzzuzzu:expenses", JSON.stringify(expenses));
  }, [expenses, loaded]);
  useEffect(() => {
    if (!loaded) return;
    storage.set("uzzuzzu:workers", JSON.stringify(workers));
  }, [workers, loaded]);
  useEffect(() => {
    if (!loaded) return;
    storage.set("uzzuzzu:teamWork", JSON.stringify(teamWork));
  }, [teamWork, loaded]);
  useEffect(() => {
    if (!loaded) return;
    storage.set("uzzuzzu:dailyReports", JSON.stringify(dailyReports));
  }, [dailyReports, loaded]);

  const siteById = useMemo(() => {
    const m = {};
    for (const s of sites) m[s.id] = s;
    return m;
  }, [sites]);

  const offTypeById = useMemo(() => {
    const m = {};
    for (const t of OFFDAY_TYPES) m[t.id] = t;
    return m;
  }, []);

  const expTypeById = useMemo(() => {
    const m = {};
    for (const t of EXPENSE_TYPES) m[t.id] = t;
    return m;
  }, []);

  const cells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const startWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < startWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [cursor]);

  const summary = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const perSiteMap = {};
    for (const s of sites) {
      perSiteMap[s.id] = {
        site: s,
        workDays: 0,
        totalUnits: 0,
        gross: 0,
        net: 0,
        tax: 0,
        expenses: 0,
      };
    }
    let unsitedExpenses = 0; // 현장 미지정 경비

    const entries = [];
    for (const [k, e] of Object.entries(workUnits)) {
      if (!e || typeof e.value !== "number" || e.value <= 0) continue;
      const d = parseKey(k);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      const site = siteById[e.siteId];
      if (!site) continue;
      const ps = perSiteMap[site.id];
      ps.workDays += 1;
      ps.totalUnits += e.value;
      ps.gross += e.value * site.rate;
      entries.push({ key: k, date: d, value: e.value, site });
    }

    // Expenses
    const expEntries = [];
    let totalExpenses = 0;
    const expensesByType = {};
    for (const t of EXPENSE_TYPES) expensesByType[t.id] = 0;

    for (const [k, list] of Object.entries(expenses)) {
      if (!Array.isArray(list)) continue;
      const d = parseKey(k);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      for (const item of list) {
        if (!item || typeof item.amount !== "number" || item.amount <= 0) continue;
        totalExpenses += item.amount;
        expensesByType[item.type] = (expensesByType[item.type] || 0) + item.amount;
        if (item.siteId && perSiteMap[item.siteId]) {
          perSiteMap[item.siteId].expenses += item.amount;
        } else {
          unsitedExpenses += item.amount;
        }
        expEntries.push({ key: k, date: d, ...item });
      }
    }
    expEntries.sort((a, b) => a.date - b.date);

    // Off days
    const offEntries = [];
    let totalOffDays = 0;
    const offByType = {};
    for (const t of OFFDAY_TYPES) offByType[t.id] = 0;

    for (const [k, e] of Object.entries(offDays)) {
      if (!e || !e.type) continue;
      const d = parseKey(k);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      totalOffDays += 1;
      offByType[e.type] = (offByType[e.type] || 0) + 1;
      offEntries.push({ key: k, date: d, ...e });
    }
    offEntries.sort((a, b) => a.date - b.date);

    for (const id in perSiteMap) {
      const p = perSiteMap[id];
      p.net = p.gross / 1.033;
      p.tax = p.gross - p.net;
    }
    entries.sort((a, b) => a.date - b.date);

    let totalDays = 0;
    let totalUnits = 0;
    let totalGross = 0;
    for (const id in perSiteMap) {
      totalDays += perSiteMap[id].workDays;
      totalUnits += perSiteMap[id].totalUnits;
      totalGross += perSiteMap[id].gross;
    }
    const totalNet = totalGross / 1.033;
    const totalTax = totalGross - totalNet;
    const finalProfit = totalNet - totalExpenses;

    const perSite = Object.values(perSiteMap)
      .filter((p) => p.workDays > 0 || p.expenses > 0)
      .sort((a, b) => b.gross - a.gross);

    return {
      perSite,
      entries,
      totalDays,
      totalUnits,
      totalGross,
      totalNet,
      totalTax,
      totalExpenses,
      unsitedExpenses,
      finalProfit,
      expensesByType,
      expEntries,
      offEntries,
      totalOffDays,
      offByType,
    };
  }, [workUnits, sites, siteById, cursor, expenses, offDays]);

  const openDay = (d) => {
    const k = dateKey(d);
    setSelectedKey(k);
    const existing = workUnits[k];
    const off = offDays[k];

    // Default tab logic
    if (existing) {
      setModalTab("work");
      setDraftSiteId(existing.siteId);
      setInputValue(String(existing.value));
    } else if (off) {
      setModalTab("off");
    } else {
      setModalTab("work");
      setDraftSiteId(sites[0]?.id || null);
      setInputValue("");
    }

    setDraftOffType(off?.type || "holiday");
    setDraftOffMemo(off?.memo || "");
  };

  const saveDay = () => {
    if (!selectedKey || !draftSiteId) return;
    const v = parseFloat(inputValue);
    setWorkUnits((prev) => {
      const next = { ...prev };
      if (!Number.isFinite(v) || v <= 0) {
        delete next[selectedKey];
      } else {
        next[selectedKey] = { siteId: draftSiteId, value: Math.round(v * 100) / 100 };
      }
      return next;
    });
    // If saving work, remove off-day
    if (parseFloat(inputValue) > 0) {
      setOffDays((prev) => {
        const next = { ...prev };
        delete next[selectedKey];
        return next;
      });
    }
    setSelectedKey(null);
  };

  const deleteDay = () => {
    if (!selectedKey) return;
    setWorkUnits((prev) => {
      const next = { ...prev };
      delete next[selectedKey];
      return next;
    });
    setSelectedKey(null);
  };

  const saveOffDay = () => {
    if (!selectedKey) return;
    setOffDays((prev) => {
      const next = { ...prev };
      if (!draftOffType) {
        delete next[selectedKey];
      } else {
        next[selectedKey] = { type: draftOffType, memo: draftOffMemo.trim() };
      }
      return next;
    });
    // If saving off-day, remove work entry
    setWorkUnits((prev) => {
      const next = { ...prev };
      delete next[selectedKey];
      return next;
    });
    setSelectedKey(null);
  };

  const deleteOffDay = () => {
    if (!selectedKey) return;
    setOffDays((prev) => {
      const next = { ...prev };
      delete next[selectedKey];
      return next;
    });
    setSelectedKey(null);
  };

  const addExpense = (dateKeyStr, expenseData) => {
    setExpenses((prev) => {
      const next = { ...prev };
      const list = next[dateKeyStr] ? [...next[dateKeyStr]] : [];
      if (expenseData.id) {
        // edit
        const idx = list.findIndex((e) => e.id === expenseData.id);
        if (idx >= 0) list[idx] = expenseData;
        else list.push(expenseData);
      } else {
        list.push({ ...expenseData, id: genId("e") });
      }
      next[dateKeyStr] = list;
      return next;
    });
  };

  const deleteExpense = (dateKeyStr, expenseId) => {
    setExpenses((prev) => {
      const next = { ...prev };
      if (!next[dateKeyStr]) return next;
      const filtered = next[dateKeyStr].filter((e) => e.id !== expenseId);
      if (filtered.length === 0) delete next[dateKeyStr];
      else next[dateKeyStr] = filtered;
      return next;
    });
  };

  const prevMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const nextMonth = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const goToday = () => setCursor(new Date(today.getFullYear(), today.getMonth(), 1));

  const upsertSite = (site) => {
    setSites((prev) => {
      const exists = prev.find((s) => s.id === site.id);
      if (exists) return prev.map((s) => (s.id === site.id ? site : s));
      return [...prev, site];
    });
  };

  const deleteSiteCascade = (siteId) => {
    setWorkUnits((prev) => {
      const next = {};
      for (const [k, e] of Object.entries(prev)) {
        if (e.siteId !== siteId) next[k] = e;
      }
      return next;
    });
    // Also remove site from expenses
    setExpenses((prev) => {
      const next = {};
      for (const [k, list] of Object.entries(prev)) {
        const filtered = list.map((e) =>
          e.siteId === siteId ? { ...e, siteId: null } : e
        );
        next[k] = filtered;
      }
      return next;
    });
    setSites((prev) => prev.filter((s) => s.id !== siteId));
  };

  const entriesCountForSite = (siteId) =>
    Object.values(workUnits).filter((e) => e.siteId === siteId).length;

  // ===== Team management functions =====
  const upsertWorker = (worker) => {
    setWorkers((prev) => {
      const exists = prev.find((w) => w.id === worker.id);
      if (exists) return prev.map((w) => (w.id === worker.id ? worker : w));
      return [...prev, worker];
    });
  };

  const deleteWorkerCascade = (workerId) => {
    setTeamWork((prev) => {
      const next = {};
      for (const [k, m] of Object.entries(prev)) {
        if (!m[workerId]) {
          next[k] = m;
          continue;
        }
        const { [workerId]: _omit, ...rest } = m;
        next[k] = rest;
      }
      return next;
    });
    setWorkers((prev) => prev.filter((w) => w.id !== workerId));
  };

  const setTeamWorkValue = (dateKeyStr, workerId, value) => {
    setTeamWork((prev) => {
      const next = { ...prev };
      const dayMap = { ...(next[dateKeyStr] || {}) };
      if (value === null || value === 0) {
        delete dayMap[workerId];
      } else {
        dayMap[workerId] = value;
      }
      if (Object.keys(dayMap).length === 0) {
        delete next[dateKeyStr];
      } else {
        next[dateKeyStr] = dayMap;
      }
      return next;
    });
  };

  const upsertDailyReport = (dateKeyStr, data) => {
    setDailyReports((prev) => ({ ...prev, [dateKeyStr]: data }));
  };

  const selectedDate = selectedKey ? parseKey(selectedKey) : null;
  const selectedEntry = selectedKey ? workUnits[selectedKey] : null;
  const selectedOff = selectedKey ? offDays[selectedKey] : null;
  const selectedExpenses = selectedKey ? expenses[selectedKey] || [] : [];
  const draftSite = draftSiteId ? siteById[draftSiteId] : null;
  const previewValue = parseFloat(inputValue);
  const previewGross =
    Number.isFinite(previewValue) && previewValue > 0 && draftSite
      ? previewValue * draftSite.rate
      : 0;
  const previewNet = previewGross / 1.033;

  return (
    <div
      className="min-h-screen w-full"
      style={{ background: C.bg, color: C.ink, fontFamily: FONT_BODY }}
    >
      <style>{`
        * { box-sizing: border-box; }
        button { transition: transform 0.1s ease, opacity 0.15s ease, background 0.15s ease; -webkit-tap-highlight-color: transparent; }
        button:active { transform: scale(0.97); }
        .num { font-variant-numeric: tabular-nums; }
        input:focus, textarea:focus { outline: 2px solid ${C.accent}; outline-offset: 1px; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        <header className="flex items-start justify-between mb-6 md:mb-8 gap-3">
          <div className="flex items-center gap-3 md:gap-4">
            <div
              className="flex items-center justify-center rounded-md shrink-0"
              style={{
                width: 56,
                height: 56,
                background: C.accent,
                color: "#f8efd8",
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 20,
                letterSpacing: "-0.04em",
                lineHeight: 1,
                boxShadow: "2px 2px 0 rgba(31, 27, 22, 0.15)",
              }}
            >
              우쭈쭈
            </div>
            <div className="min-w-0">
              <h1
                className="tracking-tight leading-none whitespace-nowrap"
                style={{
                  fontFamily: FONT_DISPLAY,
                  fontWeight: 700,
                  color: C.ink,
                  fontSize: "clamp(18px, 5.2vw, 30px)",
                }}
              >
                오늘도 우쭈쭈
              </h1>
              <p className="mt-1.5 text-xs md:text-sm" style={{ color: C.muted }}>
                공수 · 휴무 · 경비를 한 곳에
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTeamModal(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg shrink-0"
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                color: C.inkSoft,
              }}
            >
              <Users size={16} />
              <span className="hidden sm:inline">팀 관리</span>
              <span
                className="num text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: C.surface, color: C.muted }}
              >
                {workers.length}
              </span>
            </button>

            <button
              onClick={() => setShowSitesList(true)}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg shrink-0"
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                color: C.inkSoft,
              }}
            >
              <Building2 size={16} />
              <span className="hidden sm:inline">현장 관리</span>
              <span
                className="num text-xs px-1.5 py-0.5 rounded-full"
                style={{ background: C.surface, color: C.muted }}
              >
                {sites.length}
              </span>
            </button>
          </div>
        </header>

        <div className="grid lg:grid-cols-5 gap-4 md:gap-5">
          {/* Calendar */}
          <div className="lg:col-span-3">
            <div
              className="rounded-2xl p-3 md:p-5"
              style={{
                background: C.card,
                border: `1px solid ${C.border}`,
                boxShadow: "0 1px 2px rgba(31, 27, 22, 0.04)",
              }}
            >
              <div className="flex items-center justify-between mb-4 md:mb-5">
                <button
                  onClick={prevMonth}
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: 40, height: 40, background: C.surface, color: C.ink }}
                  aria-label="이전 달"
                >
                  <ChevronLeft size={20} />
                </button>

                <div className="text-center">
                  <div
                    className="leading-none num"
                    style={{
                      fontFamily: FONT_DISPLAY,
                      fontWeight: 700,
                      fontSize: "clamp(22px, 5vw, 30px)",
                    }}
                  >
                    <span>{cursor.getFullYear()}</span>
                    <span style={{ fontSize: "0.6em", color: C.muted, margin: "0 2px 0 3px" }}>
                      년
                    </span>
                    <span style={{ color: C.accent, marginLeft: 6 }}>{cursor.getMonth() + 1}</span>
                    <span style={{ fontSize: "0.6em", color: C.muted, marginLeft: 2 }}>월</span>
                  </div>
                  <button
                    onClick={goToday}
                    className="mt-1.5 text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                    style={{
                      color: C.muted,
                      background: C.surface,
                      border: `1px solid ${C.borderSoft}`,
                    }}
                  >
                    <CalendarIcon size={11} /> 오늘
                  </button>
                </div>

                <button
                  onClick={nextMonth}
                  className="flex items-center justify-center rounded-lg"
                  style={{ width: 40, height: 40, background: C.surface, color: C.ink }}
                  aria-label="다음 달"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-1.5">
                {WEEKDAYS.map((w, i) => (
                  <div
                    key={w}
                    className="text-center text-xs py-1 font-medium"
                    style={{ color: i === 0 ? C.sun : i === 6 ? C.sat : C.muted }}
                  >
                    {w}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 md:gap-1.5">
                {cells.map((d, i) => {
                  if (!d) return <div key={i} className="aspect-square" />;
                  const k = dateKey(d);
                  const entry = workUnits[k];
                  const site = entry ? siteById[entry.siteId] : null;
                  const off = offDays[k];
                  const offType = off ? offTypeById[off.type] : null;
                  const dayExpenses = expenses[k] || [];
                  const expenseTotal = dayExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

                  const isToday = isSameDay(d, today);
                  const dow = d.getDay();
                  const hasWork = entry && entry.value > 0 && site;
                  const hasOff = !!off && !hasWork;
                  const hasExp = expenseTotal > 0;

                  let cellBg = C.surface;
                  let cellBorder = `1px solid ${C.borderSoft}`;
                  if (hasWork) {
                    cellBg = tint(site.color, 0.12);
                    cellBorder = `1px solid ${tint(site.color, 0.3)}`;
                  } else if (hasOff && offType) {
                    cellBg = tint(offType.color, 0.1);
                    cellBorder = `1px solid ${tint(offType.color, 0.3)}`;
                  }
                  if (isToday) cellBorder = `2px solid ${C.accent}`;

                  return (
                    <button
                      key={i}
                      onClick={() => openDay(d)}
                      className="aspect-square rounded-lg flex flex-col p-1 md:p-1.5 relative overflow-hidden"
                      style={{ background: cellBg, border: cellBorder, color: C.ink }}
                    >
                      <div className="flex items-start justify-between w-full gap-1">
                        <span
                          className="text-[11px] md:text-xs leading-none font-medium num"
                          style={{
                            color: hasWork
                              ? site.color
                              : hasOff && offType
                              ? offType.color
                              : dow === 0
                              ? C.sun
                              : dow === 6
                              ? C.sat
                              : C.inkSoft,
                          }}
                        >
                          {d.getDate()}
                        </span>
                        {hasWork && (
                          <span
                            className="text-[8px] md:text-[9px] rounded leading-tight"
                            style={{
                              background: site.color,
                              color: "#fff",
                              fontWeight: 600,
                              maxWidth: "65%",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              padding: "1px 4px",
                            }}
                          >
                            {site.abbr}
                          </span>
                        )}
                        {hasOff && offType && (
                          <span
                            className="text-[8px] md:text-[9px] rounded leading-tight"
                            style={{
                              background: offType.color,
                              color: "#fff",
                              fontWeight: 600,
                              padding: "1px 4px",
                            }}
                          >
                            {offType.short}
                          </span>
                        )}
                      </div>

                      {hasWork && (
                        <div className="flex-1 flex items-center justify-center">
                          <span
                            className="leading-none num"
                            style={{
                              fontFamily: FONT_DISPLAY,
                              fontWeight: 700,
                              color: site.color,
                              fontSize: "clamp(14px, 3.6vw, 22px)",
                            }}
                          >
                            {fmtUnits(entry.value)}
                          </span>
                        </div>
                      )}

                      {hasOff && !hasWork && offType && (
                        <div className="flex-1 flex items-center justify-center">
                          <span
                            className="text-[10px] md:text-xs"
                            style={{
                              fontFamily: FONT_DISPLAY,
                              fontWeight: 600,
                              color: offType.color,
                            }}
                          >
                            {offType.label}
                          </span>
                        </div>
                      )}

                      {isToday && !hasWork && !hasOff && (
                        <div className="flex-1 flex items-center justify-center">
                          <span
                            className="text-[9px] uppercase tracking-widest"
                            style={{ color: C.accent, fontWeight: 600 }}
                          >
                            TODAY
                          </span>
                        </div>
                      )}

                      {/* Expense indicator dot at bottom */}
                      {hasExp && (
                        <div
                          className="absolute bottom-0.5 right-0.5 rounded-full"
                          style={{
                            width: 6,
                            height: 6,
                            background: C.orange,
                          }}
                          title={`경비 ${won(expenseTotal)}원`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

              <div
                className="mt-4 pt-3 flex items-center gap-3 flex-wrap text-xs"
                style={{ borderTop: `1px dashed ${C.border}`, color: C.muted }}
              >
                {summary.perSite.length > 0 &&
                  summary.perSite.map((p) => (
                    <div key={p.site.id} className="flex items-center gap-1.5">
                      <span
                        className="inline-block rounded-full"
                        style={{ width: 10, height: 10, background: p.site.color }}
                      />
                      <span style={{ color: C.inkSoft }}>{p.site.name}</span>
                    </div>
                  ))}
                <div className="flex items-center gap-1.5">
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 6, height: 6, background: C.orange }}
                  />
                  <span>경비</span>
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          <aside className="lg:col-span-2 space-y-4">
            {/* Grand total */}
            <div
              className="rounded-2xl p-5 md:p-6"
              style={{ background: C.card, border: `1px solid ${C.border}` }}
            >
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-lg" style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
                  {cursor.getMonth() + 1}월 종합
                </h2>
                <span className="text-xs" style={{ color: C.muted }}>
                  전체 합계
                </span>
              </div>

              <div
                className="space-y-2.5 mb-4 pb-4"
                style={{ borderBottom: `1px dashed ${C.border}` }}
              >
                <StatRow label="작업 일수" value={summary.totalDays} unit="일" />
                <StatRow
                  label="총 공수"
                  value={summary.totalUnits === 0 ? "0" : fmtUnits(summary.totalUnits)}
                  unit="공수"
                  displayFont
                  big
                />
                {summary.totalOffDays > 0 && (
                  <StatRow label="휴무 일수" value={summary.totalOffDays} unit="일" />
                )}
              </div>

              <div className="space-y-2.5 mb-4">
                <AmountRow label="총 지급액" value={summary.totalGross} color={C.inkSoft} />
                <AmountRow label="세금 (3.3%)" value={summary.totalTax} color={C.muted} minus />
                <AmountRow
                  label="실수령액"
                  value={summary.totalNet}
                  color={C.green}
                  bold
                />
                {summary.totalExpenses > 0 && (
                  <AmountRow
                    label="경비 지출"
                    value={summary.totalExpenses}
                    color={C.orange}
                    minus
                  />
                )}
              </div>

              <div className="rounded-xl p-4" style={{ background: C.greenSoft }}>
                <div
                  className="text-xs mb-1"
                  style={{ color: C.green, fontWeight: 600, letterSpacing: "0.02em" }}
                >
                  {summary.totalExpenses > 0 ? "순수익 (경비 차감)" : "이번 달 실수령액"}
                </div>
                <div
                  className="leading-none num"
                  style={{
                    fontFamily: FONT_DISPLAY,
                    fontWeight: 700,
                    color: C.green,
                    fontSize: "clamp(24px, 5vw, 32px)",
                  }}
                >
                  {won(summary.finalProfit)}
                  <span className="text-base ml-1" style={{ fontWeight: 500 }}>
                    원
                  </span>
                </div>
              </div>
            </div>

            {/* Per-site breakdown */}
            {summary.perSite.length > 0 && (
              <div
                className="rounded-2xl p-5 md:p-6"
                style={{ background: C.card, border: `1px solid ${C.border}` }}
              >
                <h3
                  className="text-base mb-3"
                  style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}
                >
                  현장별 내역
                </h3>
                <div className="space-y-2.5">
                  {summary.perSite.map((p) => (
                    <div
                      key={p.site.id}
                      className="rounded-xl p-3"
                      style={{
                        background: tint(p.site.color, 0.08),
                        border: `1px solid ${tint(p.site.color, 0.2)}`,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1.5 gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="inline-block rounded-full shrink-0"
                            style={{ width: 10, height: 10, background: p.site.color }}
                          />
                          <span
                            className="font-semibold truncate"
                            style={{ color: C.ink, fontSize: "0.95rem" }}
                          >
                            {p.site.name}
                          </span>
                        </div>
                        <span className="text-xs num shrink-0" style={{ color: C.muted }}>
                          1공수 {won(p.site.rate)}원
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-xs num" style={{ color: C.muted }}>
                          {p.workDays}일 · {fmtUnits(p.totalUnits)}공수
                        </span>
                        <span className="text-xs num" style={{ color: C.muted }}>
                          지급 {won(p.gross)}원
                        </span>
                      </div>

                      {p.expenses > 0 && (
                        <div className="flex items-baseline justify-between mb-1">
                          <span className="text-xs" style={{ color: C.orange }}>
                            경비
                          </span>
                          <span className="text-xs num" style={{ color: C.orange }}>
                            −{won(p.expenses)}원
                          </span>
                        </div>
                      )}

                      <div
                        className="flex items-baseline justify-between pt-1.5"
                        style={{ borderTop: `1px dashed ${tint(p.site.color, 0.25)}` }}
                      >
                        <span className="text-xs" style={{ color: C.green, fontWeight: 600 }}>
                          {p.expenses > 0 ? "순수익" : "실수령"}
                        </span>
                        <span
                          className="num"
                          style={{
                            color: C.green,
                            fontFamily: FONT_DISPLAY,
                            fontWeight: 700,
                            fontSize: "1.05rem",
                          }}
                        >
                          {won(p.net - p.expenses)}원
                        </span>
                      </div>
                    </div>
                  ))}

                  {summary.unsitedExpenses > 0 && (
                    <div
                      className="rounded-xl p-3"
                      style={{
                        background: tint(C.orange, 0.08),
                        border: `1px dashed ${tint(C.orange, 0.3)}`,
                      }}
                    >
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold" style={{ color: C.inkSoft }}>
                          공통 / 미지정 경비
                        </span>
                        <span
                          className="num"
                          style={{ color: C.orange, fontWeight: 600 }}
                        >
                          {won(summary.unsitedExpenses)}원
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Expense breakdown */}
            {summary.totalExpenses > 0 && (
              <div
                className="rounded-2xl p-5 md:p-6"
                style={{ background: C.card, border: `1px solid ${C.border}` }}
              >
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-base" style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
                    경비 분류
                  </h3>
                  <span className="text-xs num" style={{ color: C.orange, fontWeight: 600 }}>
                    총 {won(summary.totalExpenses)}원
                  </span>
                </div>
                <div className="space-y-1.5">
                  {EXPENSE_TYPES.map((t) => {
                    const amount = summary.expensesByType[t.id] || 0;
                    if (amount === 0) return null;
                    const pct = (amount / summary.totalExpenses) * 100;
                    return (
                      <div key={t.id} className="space-y-1">
                        <div className="flex items-baseline justify-between text-sm">
                          <span style={{ color: C.inkSoft }}>
                            {t.icon} {t.label}
                          </span>
                          <span className="num" style={{ color: C.inkSoft }}>
                            {won(amount)}원
                          </span>
                        </div>
                        <div
                          className="h-1.5 rounded-full overflow-hidden"
                          style={{ background: C.surface }}
                        >
                          <div
                            className="h-full"
                            style={{
                              width: `${pct}%`,
                              background: C.orange,
                              borderRadius: "inherit",
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Off-day breakdown */}
            {summary.totalOffDays > 0 && (
              <div
                className="rounded-2xl p-5 md:p-6"
                style={{ background: C.card, border: `1px solid ${C.border}` }}
              >
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="text-base" style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
                    휴무 내역
                  </h3>
                  <span className="text-xs num" style={{ color: C.muted }}>
                    총 {summary.totalOffDays}일
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {OFFDAY_TYPES.map((t) => {
                    const cnt = summary.offByType[t.id] || 0;
                    if (cnt === 0) return null;
                    return (
                      <div
                        key={t.id}
                        className="px-2.5 py-1 rounded-full text-xs flex items-center gap-1.5"
                        style={{
                          background: tint(t.color, 0.1),
                          border: `1px solid ${tint(t.color, 0.25)}`,
                          color: t.color,
                          fontWeight: 600,
                        }}
                      >
                        {t.label} <span className="num">{cnt}일</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Daily log */}
            {(summary.entries.length > 0 || summary.expEntries.length > 0 || summary.offEntries.length > 0) && (
              <div
                className="rounded-2xl p-5 md:p-6"
                style={{ background: C.card, border: `1px solid ${C.border}` }}
              >
                <h3
                  className="text-base mb-3"
                  style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}
                >
                  일자별 내역
                </h3>
                <div
                  className="space-y-0.5 hide-scrollbar"
                  style={{ maxHeight: 280, overflowY: "auto" }}
                >
                  {[
                    ...summary.entries.map((e) => ({ ...e, kind: "work" })),
                    ...summary.offEntries.map((e) => ({ ...e, kind: "off" })),
                    ...summary.expEntries.map((e) => ({ ...e, kind: "exp" })),
                  ]
                    .sort((a, b) => a.date - b.date)
                    .map((e, idx) => {
                      if (e.kind === "work") {
                        return (
                          <button
                            key={`w-${e.key}-${idx}`}
                            onClick={() => openDay(e.date)}
                            className="w-full flex items-center justify-between text-sm py-1.5 px-2 rounded gap-2"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span
                                className="inline-block rounded-full shrink-0"
                                style={{ width: 8, height: 8, background: e.site.color }}
                              />
                              <span className="num shrink-0" style={{ color: C.inkSoft }}>
                                {e.date.getMonth() + 1}/{e.date.getDate()}
                              </span>
                              <span className="text-xs truncate" style={{ color: C.muted }}>
                                {e.site.abbr}
                              </span>
                            </span>
                            <span className="flex items-baseline gap-2 shrink-0">
                              <span
                                className="num font-semibold"
                                style={{
                                  color: e.site.color,
                                  fontFamily: FONT_DISPLAY,
                                  fontSize: "1.05em",
                                }}
                              >
                                {fmtUnits(e.value)}
                              </span>
                              <span
                                className="text-xs num"
                                style={{ color: C.muted, minWidth: 68, textAlign: "right" }}
                              >
                                {won(e.value * e.site.rate)}원
                              </span>
                            </span>
                          </button>
                        );
                      }
                      if (e.kind === "off") {
                        const offType = offTypeById[e.type];
                        return (
                          <button
                            key={`o-${e.key}-${idx}`}
                            onClick={() => openDay(e.date)}
                            className="w-full flex items-center justify-between text-sm py-1.5 px-2 rounded gap-2"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              <span
                                className="inline-block rounded-full shrink-0"
                                style={{ width: 8, height: 8, background: offType?.color }}
                              />
                              <span className="num shrink-0" style={{ color: C.inkSoft }}>
                                {e.date.getMonth() + 1}/{e.date.getDate()}
                              </span>
                              <span
                                className="text-xs truncate"
                                style={{ color: offType?.color, fontWeight: 600 }}
                              >
                                {offType?.label}
                              </span>
                              {e.memo && (
                                <span
                                  className="text-xs truncate"
                                  style={{ color: C.muted }}
                                >
                                  · {e.memo}
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      }
                      // expense
                      const expType = expTypeById[e.type];
                      const site = e.siteId ? siteById[e.siteId] : null;
                      return (
                        <button
                          key={`e-${e.id}-${idx}`}
                          onClick={() => openDay(e.date)}
                          className="w-full flex items-center justify-between text-sm py-1.5 px-2 rounded gap-2"
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span style={{ fontSize: "0.9em" }}>{expType?.icon}</span>
                            <span className="num shrink-0" style={{ color: C.inkSoft }}>
                              {e.date.getMonth() + 1}/{e.date.getDate()}
                            </span>
                            <span className="text-xs truncate" style={{ color: C.muted }}>
                              {expType?.label}
                              {site && ` · ${site.abbr}`}
                            </span>
                          </span>
                          <span
                            className="text-xs num shrink-0"
                            style={{ color: C.orange, fontWeight: 600 }}
                          >
                            −{won(e.amount)}원
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}

            {sites.length === 0 && (
              <div
                className="rounded-2xl p-5 md:p-6 text-center"
                style={{ background: C.card, border: `1px dashed ${C.accent}` }}
              >
                <Building2 size={28} style={{ color: C.accent, margin: "0 auto 8px" }} />
                <p className="text-sm mb-3" style={{ color: C.inkSoft }}>
                  먼저 일하는 현장을 등록해주세요
                </p>
                <button
                  onClick={() => setEditingSite("new")}
                  className="px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ background: C.accent, color: "#fff" }}
                >
                  첫 현장 추가하기
                </button>
              </div>
            )}
          </aside>
        </div>

        <footer className="mt-6 text-center text-xs" style={{ color: C.muted }}>
          실수령 = 공수 × 단가 ÷ 1.033 · 순수익 = 실수령 − 경비 · 자동 저장
        </footer>
      </div>

      {/* Day Modal with Tabs */}
      {selectedDate && (
        <Modal onClose={() => setSelectedKey(null)}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-xs num" style={{ color: C.muted }}>
                {selectedDate.getFullYear()}년
              </div>
              <div
                className="text-2xl num"
                style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}
              >
                {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
                <span
                  className="text-base ml-2"
                  style={{
                    color:
                      selectedDate.getDay() === 0
                        ? C.sun
                        : selectedDate.getDay() === 6
                        ? C.sat
                        : C.muted,
                    fontWeight: 400,
                  }}
                >
                  ({WEEKDAYS[selectedDate.getDay()]})
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedKey(null)}
              className="flex items-center justify-center rounded-lg"
              style={{ width: 36, height: 36, background: C.surface, color: C.ink }}
              aria-label="닫기"
            >
              <X size={18} />
            </button>
          </div>

          {/* Tab buttons */}
          <div className="flex gap-1 mb-4 p-1 rounded-lg" style={{ background: C.surface }}>
            <TabButton
              active={modalTab === "work"}
              onClick={() => setModalTab("work")}
              icon={<Briefcase size={14} />}
              label="공수"
              badge={selectedEntry ? "●" : null}
            />
            <TabButton
              active={modalTab === "off"}
              onClick={() => setModalTab("off")}
              icon={<Coffee size={14} />}
              label="휴무"
              badge={selectedOff ? "●" : null}
            />
            <TabButton
              active={modalTab === "expense"}
              onClick={() => setModalTab("expense")}
              icon={<Wallet size={14} />}
              label="경비"
              badge={selectedExpenses.length > 0 ? String(selectedExpenses.length) : null}
            />
          </div>

          {/* Work tab */}
          {modalTab === "work" && (
            <>
              {sites.length === 0 ? (
                <div className="text-center py-6">
                  <Building2 size={32} style={{ color: C.muted, margin: "0 auto 10px" }} />
                  <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
                    등록된 현장이 없어요.
                  </p>
                  <button
                    onClick={() => {
                      setSelectedKey(null);
                      setEditingSite("new");
                    }}
                    className="px-4 py-2.5 rounded-lg text-sm font-semibold"
                    style={{ background: C.accent, color: "#fff" }}
                  >
                    현장 추가하기
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="text-xs mb-2 block font-medium" style={{ color: C.muted }}>
                      현장 선택
                    </label>
                    <div
                      className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 -mx-1 px-1"
                      style={{ scrollSnapType: "x mandatory" }}
                    >
                      {sites.map((s) => {
                        const active = draftSiteId === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => setDraftSiteId(s.id)}
                            className="rounded-lg px-3 py-2 shrink-0 text-left"
                            style={{
                              background: active ? tint(s.color, 0.15) : C.surface,
                              border: `1.5px solid ${active ? s.color : C.border}`,
                              minWidth: 110,
                              scrollSnapAlign: "start",
                            }}
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span
                                className="inline-block rounded-full shrink-0"
                                style={{ width: 8, height: 8, background: s.color }}
                              />
                              <span
                                className="text-sm font-semibold truncate"
                                style={{ color: active ? s.color : C.ink }}
                              >
                                {s.name}
                              </span>
                            </div>
                            <div className="text-[11px] num" style={{ color: C.muted }}>
                              {won(s.rate)}원
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs mb-2 block font-medium" style={{ color: C.muted }}>
                      공수 빠른 선택
                    </label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {QUICK_VALUES.map((v) => {
                        const active = parseFloat(inputValue) === v;
                        return (
                          <button
                            key={v}
                            onClick={() => setInputValue(String(v))}
                            className="py-2.5 rounded-lg text-sm num"
                            style={{
                              background: active ? C.accent : C.surface,
                              color: active ? "#fff" : C.ink,
                              border: `1px solid ${active ? C.accent : C.border}`,
                              fontFamily: FONT_DISPLAY,
                              fontWeight: 600,
                            }}
                          >
                            {v}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="text-xs mb-2 block font-medium" style={{ color: C.muted }}>
                      직접 입력
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.25"
                      min="0"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="예: 1.5"
                      className="w-full px-3 py-3 rounded-lg text-lg num"
                      style={{
                        background: C.surface,
                        border: `1px solid ${C.border}`,
                        color: C.ink,
                        fontFamily: FONT_DISPLAY,
                        fontWeight: 600,
                      }}
                    />
                  </div>

                  {Number.isFinite(previewValue) && previewValue > 0 && draftSite && (
                    <div
                      className="mb-4 p-3 rounded-lg space-y-1.5"
                      style={{
                        background: tint(draftSite.color, 0.08),
                        border: `1px dashed ${tint(draftSite.color, 0.3)}`,
                      }}
                    >
                      <div className="flex justify-between text-xs">
                        <span style={{ color: C.muted }}>
                          {draftSite.name} × {fmtUnits(previewValue)}공수
                        </span>
                        <span className="num" style={{ color: C.inkSoft }}>
                          {won(previewGross)}원
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span style={{ color: C.muted }}>세금 (3.3%)</span>
                        <span className="num" style={{ color: C.muted }}>
                          −{won(previewGross - previewNet)}원
                        </span>
                      </div>
                      <div
                        className="flex justify-between text-sm pt-1.5"
                        style={{ borderTop: `1px dashed ${tint(draftSite.color, 0.3)}` }}
                      >
                        <span style={{ color: C.green, fontWeight: 600 }}>실수령</span>
                        <span
                          className="num font-semibold"
                          style={{ color: C.green, fontFamily: FONT_DISPLAY }}
                        >
                          {won(previewNet)}원
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    {selectedEntry && (
                      <button
                        onClick={deleteDay}
                        className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg text-sm"
                        style={{
                          background: C.surface,
                          color: C.muted,
                          border: `1px solid ${C.border}`,
                        }}
                      >
                        <Trash2 size={16} /> 삭제
                      </button>
                    )}
                    <button
                      onClick={saveDay}
                      disabled={!draftSiteId}
                      className="flex-1 py-3 rounded-lg text-sm font-semibold"
                      style={{
                        background: draftSiteId ? C.accent : C.border,
                        color: "#fff",
                        opacity: draftSiteId ? 1 : 0.6,
                      }}
                    >
                      저장
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* Off-day tab */}
          {modalTab === "off" && (
            <>
              <div className="mb-4">
                <label className="text-xs mb-2 block font-medium" style={{ color: C.muted }}>
                  휴무 사유
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {OFFDAY_TYPES.map((t) => {
                    const active = draftOffType === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => setDraftOffType(t.id)}
                        className="py-2.5 rounded-lg text-xs"
                        style={{
                          background: active ? t.color : C.surface,
                          color: active ? "#fff" : C.ink,
                          border: `1px solid ${active ? t.color : C.border}`,
                          fontWeight: 600,
                        }}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs mb-2 block font-medium" style={{ color: C.muted }}>
                  메모 (선택)
                </label>
                <textarea
                  value={draftOffMemo}
                  onChange={(e) => setDraftOffMemo(e.target.value)}
                  placeholder="예: 정기 건강검진"
                  rows={3}
                  maxLength={100}
                  className="w-full px-3 py-3 rounded-lg text-sm resize-none"
                  style={{
                    background: C.surface,
                    border: `1px solid ${C.border}`,
                    color: C.ink,
                  }}
                />
              </div>

              {selectedEntry && (
                <div
                  className="mb-4 p-3 rounded-lg text-xs"
                  style={{
                    background: tint(C.accent, 0.08),
                    border: `1px dashed ${tint(C.accent, 0.3)}`,
                    color: C.accentDark,
                  }}
                >
                  ⚠️ 이 날에 공수 기록({fmtUnits(selectedEntry.value)})이 있어요.
                  휴무로 저장하면 공수 기록은 삭제됩니다.
                </div>
              )}

              <div className="flex gap-2">
                {selectedOff && (
                  <button
                    onClick={deleteOffDay}
                    className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-lg text-sm"
                    style={{
                      background: C.surface,
                      color: C.muted,
                      border: `1px solid ${C.border}`,
                    }}
                  >
                    <Trash2 size={16} /> 삭제
                  </button>
                )}
                <button
                  onClick={saveOffDay}
                  className="flex-1 py-3 rounded-lg text-sm font-semibold"
                  style={{ background: C.accent, color: "#fff" }}
                >
                  저장
                </button>
              </div>
            </>
          )}

          {/* Expense tab */}
          {modalTab === "expense" && (
            <>
              {selectedExpenses.length === 0 ? (
                <div className="text-center py-6" style={{ color: C.muted }}>
                  <Receipt size={32} style={{ margin: "0 auto 10px" }} />
                  <p className="text-sm">이 날 등록된 경비가 없어요</p>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {selectedExpenses.map((exp) => {
                    const expType = expTypeById[exp.type];
                    const site = exp.siteId ? siteById[exp.siteId] : null;
                    return (
                      <div
                        key={exp.id}
                        className="rounded-xl p-3"
                        style={{
                          background: tint(C.orange, 0.08),
                          border: `1px solid ${tint(C.orange, 0.2)}`,
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span style={{ fontSize: "1.2em" }}>{expType?.icon}</span>
                            <div className="min-w-0">
                              <div
                                className="text-sm font-semibold truncate"
                                style={{ color: C.ink }}
                              >
                                {expType?.label}
                              </div>
                              <div className="text-xs" style={{ color: C.muted }}>
                                {site ? site.name : "공통/미지정"}
                                {exp.memo && ` · ${exp.memo}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className="num font-semibold"
                              style={{ color: C.orange, fontFamily: FONT_DISPLAY }}
                            >
                              {won(exp.amount)}원
                            </span>
                            <button
                              onClick={() =>
                                setEditingExpense({ dateKey: selectedKey, expense: exp })
                              }
                              className="flex items-center justify-center rounded ml-1"
                              style={{
                                width: 28,
                                height: 28,
                                background: C.card,
                                color: C.inkSoft,
                                border: `1px solid ${C.border}`,
                              }}
                              aria-label="편집"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => deleteExpense(selectedKey, exp.id)}
                              className="flex items-center justify-center rounded"
                              style={{
                                width: 28,
                                height: 28,
                                background: C.card,
                                color: C.muted,
                                border: `1px solid ${C.border}`,
                              }}
                              aria-label="삭제"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div
                    className="flex items-baseline justify-between pt-2"
                    style={{ borderTop: `1px dashed ${C.border}` }}
                  >
                    <span className="text-sm" style={{ color: C.muted }}>
                      합계
                    </span>
                    <span
                      className="num"
                      style={{
                        color: C.orange,
                        fontFamily: FONT_DISPLAY,
                        fontWeight: 700,
                        fontSize: "1.1rem",
                      }}
                    >
                      {won(selectedExpenses.reduce((s, e) => s + e.amount, 0))}원
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() =>
                  setEditingExpense({
                    dateKey: selectedKey,
                    expense: { type: "transport", amount: 0, memo: "", siteId: null },
                  })
                }
                className="w-full flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-semibold"
                style={{ background: C.orange, color: "#fff" }}
              >
                <Plus size={16} /> 경비 추가
              </button>
            </>
          )}
        </Modal>
      )}

      {/* Expense Edit Modal */}
      {editingExpense && (
        <ExpenseEditModal
          dateKey={editingExpense.dateKey}
          expense={editingExpense.expense}
          sites={sites}
          siteById={siteById}
          workUnits={workUnits}
          onClose={() => setEditingExpense(null)}
          onSave={(data) => {
            addExpense(editingExpense.dateKey, data);
            setEditingExpense(null);
          }}
        />
      )}

      {/* Sites List Modal */}
      {showSitesList && !editingSite && (
        <Modal onClose={() => setShowSitesList(false)}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-xl" style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
              현장 관리
            </h3>
            <button
              onClick={() => setShowSitesList(false)}
              className="flex items-center justify-center rounded-lg"
              style={{ width: 36, height: 36, background: C.surface, color: C.ink }}
              aria-label="닫기"
            >
              <X size={18} />
            </button>
          </div>

          {sites.length === 0 ? (
            <div className="text-center py-8">
              <Building2 size={36} style={{ color: C.muted, margin: "0 auto 10px" }} />
              <p className="text-sm" style={{ color: C.muted }}>
                등록된 현장이 없어요
              </p>
            </div>
          ) : (
            <div className="space-y-2 mb-4">
              {sites.map((s) => {
                const count = entriesCountForSite(s.id);
                return (
                  <div
                    key={s.id}
                    className="rounded-xl p-3 flex items-center gap-3"
                    style={{
                      background: tint(s.color, 0.08),
                      border: `1px solid ${tint(s.color, 0.25)}`,
                    }}
                  >
                    <div
                      className="flex items-center justify-center rounded-md shrink-0"
                      style={{
                        width: 40,
                        height: 40,
                        background: s.color,
                        color: "#fff",
                        fontFamily: FONT_DISPLAY,
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {s.abbr}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate" style={{ color: C.ink }}>
                        {s.name}
                      </div>
                      <div className="text-xs num" style={{ color: C.muted }}>
                        1공수 {won(s.rate)}원 {count > 0 && `· ${count}건 기록`}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingSite(s)}
                      className="flex items-center justify-center rounded-lg shrink-0"
                      style={{
                        width: 34,
                        height: 34,
                        background: C.card,
                        color: C.inkSoft,
                        border: `1px solid ${C.border}`,
                      }}
                      aria-label="편집"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => setConfirmDeleteSite(s)}
                      className="flex items-center justify-center rounded-lg shrink-0"
                      style={{
                        width: 34,
                        height: 34,
                        background: C.card,
                        color: C.muted,
                        border: `1px solid ${C.border}`,
                      }}
                      aria-label="삭제"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button
            onClick={() => setEditingSite("new")}
            className="w-full flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-semibold"
            style={{ background: C.accent, color: "#fff" }}
          >
            <Plus size={16} /> 현장 추가
          </button>
        </Modal>
      )}

      {editingSite && (
        <SiteEditModal
          site={editingSite === "new" ? null : editingSite}
          onClose={() => setEditingSite(null)}
          onSave={(s) => {
            upsertSite(s);
            setEditingSite(null);
          }}
          existingColors={sites.map((s) => s.color)}
        />
      )}

      {confirmDeleteSite && (
        <Modal onClose={() => setConfirmDeleteSite(null)}>
          <h3 className="text-lg mb-2" style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
            현장 삭제
          </h3>
          <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
            <span className="font-semibold" style={{ color: confirmDeleteSite.color }}>
              {confirmDeleteSite.name}
            </span>{" "}
            을(를) 삭제할까요?
            {entriesCountForSite(confirmDeleteSite.id) > 0 && (
              <>
                <br />
                <span style={{ color: C.accent }}>
                  이 현장의 공수 기록 {entriesCountForSite(confirmDeleteSite.id)}건이 함께
                  삭제됩니다. (경비는 미지정으로 변경)
                </span>
              </>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDeleteSite(null)}
              className="flex-1 py-3 rounded-lg text-sm"
              style={{
                background: C.surface,
                color: C.inkSoft,
                border: `1px solid ${C.border}`,
              }}
            >
              취소
            </button>
            <button
              onClick={() => {
                deleteSiteCascade(confirmDeleteSite.id);
                setConfirmDeleteSite(null);
              }}
              className="flex-1 py-3 rounded-lg text-sm font-semibold"
              style={{ background: C.accent, color: "#fff" }}
            >
              삭제
            </button>
          </div>
        </Modal>
      )}

      {showTeamModal && (
        <TeamModal
          workers={workers}
          sites={sites}
          siteById={siteById}
          teamWork={teamWork}
          dailyReports={dailyReports}
          today={today}
          onClose={() => setShowTeamModal(false)}
          onAddWorker={() => setEditingWorker({ new: true })}
          onEditWorker={(w) => setEditingWorker(w)}
          onDeleteWorker={(w) => setConfirmDeleteWorker(w)}
          onSetTeamWork={setTeamWorkValue}
          onSaveReport={upsertDailyReport}
        />
      )}

      {editingWorker && (
        <WorkerEditor
          worker={editingWorker.new ? null : editingWorker}
          sites={sites}
          onClose={() => setEditingWorker(null)}
          onSave={(w) => {
            upsertWorker(w);
            setEditingWorker(null);
          }}
        />
      )}

      {confirmDeleteWorker && (
        <Modal onClose={() => setConfirmDeleteWorker(null)}>
          <h3
            className="text-lg mb-2"
            style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color: C.ink }}
          >
            팀원 삭제
          </h3>
          <p className="text-sm mb-5" style={{ color: C.inkSoft }}>
            "{confirmDeleteWorker.name}" 님을 삭제하면 기록된 공수 데이터도 함께 삭제됩니다.
            계속할까요?
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDeleteWorker(null)}
              className="flex-1 py-3 rounded-lg text-sm"
              style={{
                background: C.surface,
                color: C.inkSoft,
                border: `1px solid ${C.border}`,
              }}
            >
              취소
            </button>
            <button
              onClick={() => {
                deleteWorkerCascade(confirmDeleteWorker.id);
                setConfirmDeleteWorker(null);
              }}
              className="flex-1 py-3 rounded-lg text-sm font-semibold"
              style={{ background: C.accent, color: "#fff" }}
            >
              삭제
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ==================== Tab Button ====================
function TabButton({ active, onClick, icon, label, badge }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1 py-2 rounded-md text-sm relative"
      style={{
        background: active ? C.card : "transparent",
        color: active ? C.ink : C.muted,
        fontWeight: active ? 600 : 500,
        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
      }}
    >
      {icon}
      <span>{label}</span>
      {badge && (
        <span
          style={{
            fontSize: "0.7em",
            color: C.accent,
            fontWeight: 700,
            marginLeft: 2,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// ==================== Expense Edit Modal ====================
function ExpenseEditModal({ dateKey, expense, sites, siteById, workUnits, onClose, onSave }) {
  const isNew = !expense.id;
  const [type, setType] = useState(expense.type || "transport");
  const [amount, setAmount] = useState(expense.amount ? String(expense.amount) : "");
  const [memo, setMemo] = useState(expense.memo || "");

  // Auto-link site: if work entry exists on this day, default to that site
  const workEntry = workUnits[dateKey];
  const [siteId, setSiteId] = useState(
    expense.siteId !== undefined ? expense.siteId : workEntry ? workEntry.siteId : null
  );

  const canSave = Number(amount) > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: expense.id,
      type,
      amount: Math.round(Number(amount)),
      memo: memo.trim(),
      siteId: siteId,
    });
  };

  const d = parseKey(dateKey);

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded-lg"
          style={{ width: 36, height: 36, background: C.surface, color: C.ink }}
          aria-label="뒤로"
        >
          <ArrowLeft size={18} />
        </button>
        <h3 className="text-xl flex-1" style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
          {isNew ? "경비 추가" : "경비 편집"}
        </h3>
        <span className="text-xs num" style={{ color: C.muted }}>
          {d.getMonth() + 1}/{d.getDate()}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs mb-2 block font-medium" style={{ color: C.muted }}>
            분류
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {EXPENSE_TYPES.map((t) => {
              const active = type === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setType(t.id)}
                  className="py-2.5 rounded-lg text-xs flex flex-col items-center gap-0.5"
                  style={{
                    background: active ? tint(C.orange, 0.15) : C.surface,
                    color: active ? C.orange : C.ink,
                    border: `1px solid ${active ? C.orange : C.border}`,
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  <span style={{ fontSize: "1.2em" }}>{t.icon}</span>
                  <span style={{ fontSize: "0.85em" }}>{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: C.muted }}>
            금액 (원)
          </label>
          <input
            type="number"
            inputMode="numeric"
            step="1000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="예: 8000"
            autoFocus={isNew}
            className="w-full px-3 py-3 rounded-lg text-lg num"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              color: C.ink,
              fontFamily: FONT_DISPLAY,
              fontWeight: 600,
            }}
          />
        </div>

        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: C.muted }}>
            연결 현장 {workEntry && <span style={{ color: C.green }}>(근무일 자동 연결됨)</span>}
          </label>
          <div
            className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1 -mx-1 px-1"
            style={{ scrollSnapType: "x mandatory" }}
          >
            <button
              onClick={() => setSiteId(null)}
              className="rounded-lg px-3 py-2 shrink-0 text-left"
              style={{
                background: siteId === null ? tint(C.orange, 0.15) : C.surface,
                border: `1.5px solid ${siteId === null ? C.orange : C.border}`,
                minWidth: 100,
                scrollSnapAlign: "start",
              }}
            >
              <div className="text-sm font-semibold" style={{ color: siteId === null ? C.orange : C.ink }}>
                공통/미지정
              </div>
              <div className="text-[11px]" style={{ color: C.muted }}>
                개인비용 등
              </div>
            </button>
            {sites.map((s) => {
              const active = siteId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSiteId(s.id)}
                  className="rounded-lg px-3 py-2 shrink-0 text-left"
                  style={{
                    background: active ? tint(s.color, 0.15) : C.surface,
                    border: `1.5px solid ${active ? s.color : C.border}`,
                    minWidth: 110,
                    scrollSnapAlign: "start",
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block rounded-full shrink-0"
                      style={{ width: 8, height: 8, background: s.color }}
                    />
                    <span
                      className="text-sm font-semibold truncate"
                      style={{ color: active ? s.color : C.ink }}
                    >
                      {s.name}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: C.muted }}>
            메모 (선택)
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="예: 점심 식사"
            maxLength={50}
            className="w-full px-3 py-3 rounded-lg text-sm"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              color: C.ink,
            }}
          />
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!canSave}
        className="w-full mt-5 py-3 rounded-lg text-sm font-semibold"
        style={{
          background: canSave ? C.orange : C.border,
          color: "#fff",
          opacity: canSave ? 1 : 0.6,
        }}
      >
        {isNew ? "추가" : "저장"}
      </button>
    </Modal>
  );
}

// ==================== Site Edit Modal (same as before) ====================
function SiteEditModal({ site, onClose, onSave, existingColors }) {
  const isNew = !site;
  const [name, setName] = useState(site?.name || "");
  const [abbr, setAbbr] = useState(site?.abbr || "");
  const [rate, setRate] = useState(site?.rate ? String(site.rate) : "200000");
  const [color, setColor] = useState(
    site?.color ||
      PALETTE.find((c) => !existingColors.includes(c)) ||
      PALETTE[0]
  );
  const [abbrEdited, setAbbrEdited] = useState(!!site?.abbr);

  useEffect(() => {
    if (!abbrEdited) {
      setAbbr(suggestAbbr(name));
    }
  }, [name, abbrEdited]);

  const canSave = name.trim().length > 0 && abbr.trim().length > 0 && Number(rate) > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      id: site?.id || genId(),
      name: name.trim(),
      abbr: abbr.trim().slice(0, 3),
      rate: Number(rate),
      color,
    });
  };

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-2 mb-5">
        {!isNew && (
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg"
            style={{ width: 36, height: 36, background: C.surface, color: C.ink }}
            aria-label="뒤로"
          >
            <ArrowLeft size={18} />
          </button>
        )}
        <h3 className="text-xl flex-1" style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}>
          {isNew ? "현장 추가" : "현장 편집"}
        </h3>
        {isNew && (
          <button
            onClick={onClose}
            className="flex items-center justify-center rounded-lg"
            style={{ width: 36, height: 36, background: C.surface, color: C.ink }}
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: C.muted }}>
            현장 이름
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 강남 A빌딩"
            maxLength={20}
            className="w-full px-3 py-3 rounded-lg"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              color: C.ink,
              fontSize: "1rem",
            }}
          />
        </div>

        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: C.muted }}>
            약자 (달력 표시용, 1~3자)
          </label>
          <input
            type="text"
            value={abbr}
            onChange={(e) => {
              setAbbr(e.target.value.slice(0, 3));
              setAbbrEdited(true);
            }}
            placeholder="예: 강A"
            maxLength={3}
            className="w-full px-3 py-3 rounded-lg"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              color: C.ink,
              fontSize: "1rem",
              fontFamily: FONT_DISPLAY,
              fontWeight: 600,
            }}
          />
        </div>

        <div>
          <label className="text-xs mb-1.5 block font-medium" style={{ color: C.muted }}>
            1공수 단가 (원)
          </label>
          <input
            type="number"
            inputMode="numeric"
            step="1000"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full px-3 py-3 rounded-lg num"
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              color: C.ink,
              fontSize: "1.1rem",
              fontFamily: FONT_DISPLAY,
              fontWeight: 600,
            }}
          />
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {[150000, 180000, 200000, 220000, 250000, 300000].map((v) => (
              <button
                key={v}
                onClick={() => setRate(String(v))}
                className="px-3 py-1 rounded-full text-xs num"
                style={{
                  background: Number(rate) === v ? C.accentSoft : C.surface,
                  border: `1px solid ${Number(rate) === v ? C.accent : C.border}`,
                  color: Number(rate) === v ? C.accentDark : C.inkSoft,
                }}
              >
                {won(v)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs mb-2 block font-medium" style={{ color: C.muted }}>
            색상
          </label>
          <div className="flex gap-2 flex-wrap">
            {PALETTE.map((c) => {
              const active = color === c;
              return (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="rounded-full flex items-center justify-center"
                  style={{
                    width: 36,
                    height: 36,
                    background: c,
                    border: active ? `3px solid ${C.ink}` : `2px solid ${C.border}`,
                    color: "#fff",
                  }}
                  aria-label={`색상 ${c}`}
                >
                  {active && (
                    <span style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>✓</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!canSave}
        className="w-full mt-5 py-3 rounded-lg text-sm font-semibold"
        style={{
          background: canSave ? C.accent : C.border,
          color: "#fff",
          opacity: canSave ? 1 : 0.6,
        }}
      >
        {isNew ? "추가" : "저장"}
      </button>
    </Modal>
  );
}

function StatRow({ label, value, unit, displayFont = false, big = false }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm" style={{ color: C.muted }}>
        {label}
      </span>
      <span className="flex items-baseline gap-1">
        <span
          className="num"
          style={{
            fontWeight: 700,
            fontFamily: displayFont ? FONT_DISPLAY : "inherit",
            color: C.ink,
            fontSize: big ? "1.5rem" : "1.15rem",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
        <span className="text-xs" style={{ color: C.muted }}>
          {unit}
        </span>
      </span>
    </div>
  );
}

function AmountRow({ label, value, color, minus = false, bold = false }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm" style={{ color: C.muted }}>
        {label}
      </span>
      <span
        className="num"
        style={{ color, fontWeight: bold ? 700 : 500, fontSize: "0.95rem" }}
      >
        {minus && value > 0 ? "−" : ""}
        {won(value)}원
      </span>
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "rgba(31, 27, 22, 0.55)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 sm:p-6"
        style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 -8px 32px rgba(31, 27, 22, 0.2)",
        }}
      >
        {children}
      </div>
    </div>
  );
}

// ==================== Team Modal (팀 관리: 팀원/공수체크/작업일보) ====================
function TeamModal({
  workers,
  sites,
  siteById,
  teamWork,
  dailyReports,
  today,
  onClose,
  onAddWorker,
  onEditWorker,
  onDeleteWorker,
  onSetTeamWork,
  onSaveReport,
}) {
  const [tab, setTab] = useState("workers"); // workers | gongsu | report
  const [selDate, setSelDate] = useState(dateKey(today));

  const activeWorkers = workers.filter((w) => w.active !== false);
  const dayMap = teamWork[selDate] || {};

  // 월간 합계 (선택한 날짜가 속한 달)
  const [y, m] = selDate.split("-").map(Number);
  const monthTotals = useMemo(() => {
    const totals = {};
    for (const w of workers) totals[w.id] = 0;
    for (const [k, map] of Object.entries(teamWork)) {
      const [ky, km] = k.split("-").map(Number);
      if (ky === y && km === m) {
        for (const [wid, val] of Object.entries(map)) {
          totals[wid] = (totals[wid] || 0) + val;
        }
      }
    }
    return totals;
  }, [teamWork, y, m, workers]);

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-lg flex items-center gap-2"
          style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color: C.ink }}
        >
          <Users size={18} /> 팀 관리
        </h3>
        <button onClick={onClose} style={{ color: C.muted }}>
          <X size={20} />
        </button>
      </div>

      <div
        className="grid grid-cols-3 gap-1 p-1 rounded-lg mb-4"
        style={{ background: C.surface }}
      >
        <TabButton
          active={tab === "workers"}
          onClick={() => setTab("workers")}
          icon={<Users size={14} />}
          label="팀원"
        />
        <TabButton
          active={tab === "gongsu"}
          onClick={() => setTab("gongsu")}
          icon={<Briefcase size={14} />}
          label="공수체크"
        />
        <TabButton
          active={tab === "report"}
          onClick={() => setTab("report")}
          icon={<ClipboardList size={14} />}
          label="작업일보"
        />
      </div>

      {tab === "workers" && (
        <div>
          <button
            onClick={onAddWorker}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium mb-3"
            style={{ background: C.accent, color: "#fff" }}
          >
            <Plus size={16} /> 팀원 추가
          </button>
          {activeWorkers.length === 0 && (
            <p className="text-sm text-center py-6" style={{ color: C.muted }}>
              아직 등록된 팀원이 없어요
            </p>
          )}
          <div className="space-y-2">
            {workers.map((w) => {
              const site = w.siteId ? siteById[w.siteId] : null;
              return (
                <div
                  key={w.id}
                  className="flex items-center justify-between p-3 rounded-lg"
                  style={{ background: C.surface, border: `1px solid ${C.borderSoft}` }}
                >
                  <div>
                    <div className="text-sm font-medium" style={{ color: C.ink }}>
                      {w.name}
                      {w.active === false && (
                        <span className="ml-1.5 text-xs" style={{ color: C.muted }}>
                          (비활성)
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: C.muted }}>
                      {w.role || "팀원"}
                      {site ? ` · ${site.name}` : ""}
                      {w.rate ? ` · ${won(w.rate)}원/공수` : ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onEditWorker(w)} style={{ color: C.muted }}>
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => onDeleteWorker(w)} style={{ color: C.muted }}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "gongsu" && (
        <div>
          <input
            type="date"
            value={selDate}
            onChange={(e) => setSelDate(e.target.value)}
            className="w-full mb-3 px-3 py-2 rounded-lg text-sm"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.ink }}
          />
          {activeWorkers.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: C.muted }}>
              먼저 "팀원" 탭에서 팀원을 등록해주세요
            </p>
          ) : (
            <div className="space-y-3">
              {activeWorkers.map((w) => {
                const val = dayMap[w.id] || 0;
                return (
                  <div
                    key={w.id}
                    className="p-3 rounded-lg"
                    style={{ background: C.surface, border: `1px solid ${C.borderSoft}` }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium" style={{ color: C.ink }}>
                        {w.name}
                      </span>
                      <span className="text-sm num" style={{ color: C.accent, fontWeight: 700 }}>
                        {val > 0 ? val : "-"}
                      </span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {[0, 0.5, 1, 1.5, 2].map((v) => (
                        <button
                          key={v}
                          onClick={() => onSetTeamWork(selDate, w.id, v === 0 ? null : v)}
                          className="px-2.5 py-1.5 rounded-md text-xs num"
                          style={{
                            background: val === v ? C.accent : C.card,
                            color: val === v ? "#fff" : C.inkSoft,
                            border: `1px solid ${val === v ? C.accent : C.border}`,
                            fontWeight: val === v ? 700 : 500,
                          }}
                        >
                          {v === 0 ? "없음" : v}
                        </button>
                      ))}
                    </div>

                    <WorkerMiniCalendar
                      year={y}
                      month={m}
                      workerId={w.id}
                      teamWork={teamWork}
                      selDate={selDate}
                    />
                  </div>
                );
              })}

              <div
                className="mt-4 p-3 rounded-lg"
                style={{ background: tint(C.accent, 0.08) }}
              >
                <div className="text-xs mb-2" style={{ color: C.muted }}>
                  {y}년 {m}월 팀원별 공수 합계
                </div>
                <div className="space-y-1">
                  {activeWorkers.map((w) => (
                    <div key={w.id} className="flex justify-between text-sm">
                      <span style={{ color: C.inkSoft }}>{w.name}</span>
                      <span className="num" style={{ color: C.ink, fontWeight: 600 }}>
                        {monthTotals[w.id] || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "report" && (
        <DailyReportEditor
          selDate={selDate}
          setSelDate={setSelDate}
          sites={sites}
          workers={activeWorkers}
          dayMap={dayMap}
          report={dailyReports[selDate]}
          onSave={(data) => onSaveReport(selDate, data)}
        />
      )}
    </Modal>
  );
}

// ==================== Worker Editor ====================
function WorkerEditor({ worker, sites, onClose, onSave }) {
  const [name, setName] = useState(worker?.name || "");
  const [role, setRole] = useState(worker?.role || "");
  const [siteId, setSiteId] = useState(worker?.siteId || (sites[0]?.id ?? null));
  const [rate, setRate] = useState(worker?.rate ? String(worker.rate) : "150000");
  const [active, setActive] = useState(worker?.active !== false);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id: worker?.id || genId("w"),
      name: name.trim(),
      role: role.trim(),
      siteId,
      rate: Number(rate) || 0,
      active,
    });
  };

  return (
    <Modal onClose={onClose}>
      <h3
        className="text-lg mb-4"
        style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color: C.ink }}
      >
        {worker ? "팀원 수정" : "팀원 추가"}
      </h3>

      <div className="space-y-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: C.muted }}>
            이름
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 김철수"
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.ink }}
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: C.muted }}>
            직급 / 역할
          </label>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="예: 계장공, 보조"
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.ink }}
          />
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: C.muted }}>
            소속 현장
          </label>
          <select
            value={siteId || ""}
            onChange={(e) => setSiteId(e.target.value || null)}
            className="w-full px-3 py-2.5 rounded-lg text-sm"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.ink }}
          >
            <option value="">미지정</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: C.muted }}>
            공수 단가 (원)
          </label>
          <input
            type="number"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg text-sm num"
            style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.ink }}
          />
        </div>
        <label className="flex items-center gap-2 text-sm" style={{ color: C.inkSoft }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          활성 (현재 근무 중)
        </label>
      </div>

      <div className="flex gap-2 mt-5">
        <button
          onClick={onClose}
          className="flex-1 py-3 rounded-lg text-sm"
          style={{ background: C.surface, color: C.inkSoft, border: `1px solid ${C.border}` }}
        >
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={!name.trim()}
          className="flex-1 py-3 rounded-lg text-sm font-semibold"
          style={{ background: C.accent, color: "#fff", opacity: name.trim() ? 1 : 0.5 }}
        >
          저장
        </button>
      </div>
    </Modal>
  );
}

// ==================== Daily Report Editor (일일 작업일보) ====================
function DailyReportEditor({ selDate, setSelDate, sites, workers, dayMap, report, onSave }) {
  const presentWorkerIds = Object.keys(dayMap || {});
  const presentWorkers = workers.filter((w) => presentWorkerIds.includes(w.id));

  const [siteId, setSiteId] = useState(report?.siteId || sites[0]?.id || null);
  const [content, setContent] = useState(report?.content || "");
  const [note, setNote] = useState(report?.note || "");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSiteId(report?.siteId || sites[0]?.id || null);
    setContent(report?.content || "");
    setNote(report?.note || "");
    setCopied(false);
    setSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selDate]);

  const siteName = sites.find((s) => s.id === siteId)?.name || "";

  const buildReportText = () => {
    const lines = [];
    lines.push(`[일일 작업일보] ${selDate}`);
    if (siteName) lines.push(`현장: ${siteName}`);
    lines.push(
      `참여 인원: ${
        presentWorkers.length > 0
          ? presentWorkers.map((w) => `${w.name}(${dayMap[w.id]})`).join(", ")
          : "없음"
      }`
    );
    lines.push("");
    lines.push("[작업 내용]");
    lines.push(content || "(미입력)");
    if (note.trim()) {
      lines.push("");
      lines.push("[특이사항]");
      lines.push(note);
    }
    return lines.join("\n");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildReportText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const handleSave = () => {
    onSave({ siteId, content, note });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div>
      <input
        type="date"
        value={selDate}
        onChange={(e) => setSelDate(e.target.value)}
        className="w-full mb-3 px-3 py-2 rounded-lg text-sm"
        style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.ink }}
      />

      <div className="mb-3">
        <label className="text-xs mb-1 block" style={{ color: C.muted }}>
          현장
        </label>
        <select
          value={siteId || ""}
          onChange={(e) => setSiteId(e.target.value || null)}
          className="w-full px-3 py-2.5 rounded-lg text-sm"
          style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.ink }}
        >
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      <div
        className="mb-3 p-3 rounded-lg"
        style={{ background: tint(C.accent, 0.08) }}
      >
        <div className="text-xs mb-1.5" style={{ color: C.muted }}>
          참여 인원 (해당일 공수입력 기준)
        </div>
        <div className="text-sm" style={{ color: C.ink }}>
          {presentWorkers.length > 0
            ? presentWorkers.map((w) => `${w.name}(${dayMap[w.id]})`).join(", ")
            : "공수체크 탭에서 먼저 인원별 공수를 입력해주세요"}
        </div>
      </div>

      <div className="mb-3">
        <label className="text-xs mb-1 block" style={{ color: C.muted }}>
          작업 내용
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={4}
          placeholder="오늘 진행한 작업 내용을 적어주세요"
          className="w-full px-3 py-2.5 rounded-lg text-sm"
          style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.ink }}
        />
      </div>

      <div className="mb-4">
        <label className="text-xs mb-1 block" style={{ color: C.muted }}>
          특이사항 (안전·자재·지연 등)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="없으면 비워두세요"
          className="w-full px-3 py-2.5 rounded-lg text-sm"
          style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.ink }}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm"
          style={{ background: C.surface, color: C.inkSoft, border: `1px solid ${C.border}` }}
        >
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "복사됨" : "텍스트 복사"}
        </button>
        <button
          onClick={handleSave}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-semibold"
          style={{ background: saved ? "#2d5f4e" : C.accent, color: "#fff" }}
        >
          {saved ? <Check size={15} /> : null}
          {saved ? "저장됨" : "저장"}
        </button>
      </div>
      {saved && (
        <p className="text-xs text-center mt-2" style={{ color: "#2d5f4e" }}>
          작업일보가 저장되었습니다
        </p>
      )}
    </div>
  );
}

// ==================== Worker Mini Calendar (개인별 공수 달력) ====================
function WorkerMiniCalendar({ year, month, workerId, teamWork, selDate }) {
  const first = new Date(year, month - 1, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(year, month, 0).getDate();

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="mt-3 pt-3" style={{ borderTop: `1px dashed ${C.borderSoft}` }}>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="text-center"
            style={{ fontSize: 9, color: C.muted }}
          >
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const k = `${year}-${pad(month)}-${pad(d)}`;
          const val = teamWork[k]?.[workerId];
          const isSel = k === selDate;
          const isToday = (() => {
            const t = new Date();
            return (
              t.getFullYear() === year &&
              t.getMonth() + 1 === month &&
              t.getDate() === d
            );
          })();
          return (
            <div
              key={i}
              className="aspect-square flex flex-col items-center justify-center rounded"
              style={{
                background: val ? tint(C.accent, 0.16) : "transparent",
                border: isSel
                  ? `1.5px solid ${C.accent}`
                  : isToday
                  ? `1px solid ${C.border}`
                  : "1px solid transparent",
              }}
            >
              <span style={{ fontSize: 9, color: val ? C.ink : C.muted }}>{d}</span>
              {val ? (
                <span
                  className="num"
                  style={{ fontSize: 9, color: C.accent, fontWeight: 700, lineHeight: 1 }}
                >
                  {val}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
