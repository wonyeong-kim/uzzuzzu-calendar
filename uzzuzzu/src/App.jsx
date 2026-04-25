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
const genId = () => `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
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

// ===== localStorage wrapper (replaces window.storage from Claude artifact) =====
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
  const [workUnits, setWorkUnits] = useState({});

  const [selectedKey, setSelectedKey] = useState(null);
  const [draftSiteId, setDraftSiteId] = useState(null);
  const [inputValue, setInputValue] = useState("");

  const [showSitesList, setShowSitesList] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
  const [confirmDeleteSite, setConfirmDeleteSite] = useState(null);

  const [loaded, setLoaded] = useState(false);

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

  useEffect(() => {
    let loadedSites = null;
    let loadedWU = null;

    try {
      const r = storage.get("uzzuzzu:sites");
      if (r?.value) loadedSites = JSON.parse(r.value);
    } catch {}
    try {
      const r = storage.get("uzzuzzu:workUnits");
      if (r?.value) loadedWU = JSON.parse(r.value);
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

  const siteById = useMemo(() => {
    const m = {};
    for (const s of sites) m[s.id] = s;
    return m;
  }, [sites]);

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
      };
    }
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

    const perSite = Object.values(perSiteMap)
      .filter((p) => p.workDays > 0)
      .sort((a, b) => b.gross - a.gross);

    return { perSite, entries, totalDays, totalUnits, totalGross, totalNet, totalTax };
  }, [workUnits, sites, siteById, cursor]);

  const openDay = (d) => {
    const k = dateKey(d);
    setSelectedKey(k);
    const existing = workUnits[k];
    if (existing) {
      setDraftSiteId(existing.siteId);
      setInputValue(String(existing.value));
    } else {
      setDraftSiteId(sites[0]?.id || null);
      setInputValue("");
    }
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
    setSites((prev) => prev.filter((s) => s.id !== siteId));
  };

  const entriesCountForSite = (siteId) =>
    Object.values(workUnits).filter((e) => e.siteId === siteId).length;

  const selectedDate = selectedKey ? parseKey(selectedKey) : null;
  const selectedEntry = selectedKey ? workUnits[selectedKey] : null;
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
            <div>
              <h1
                className="text-2xl md:text-3xl tracking-tight leading-none"
                style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color: C.ink }}
              >
                오늘도 우쭈쭈
              </h1>
              <p className="mt-1.5 text-xs md:text-sm" style={{ color: C.muted }}>
                수고한 나에게 — 현장별 공수 기록
              </p>
            </div>
          </div>

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
        </header>

        <div className="grid lg:grid-cols-5 gap-4 md:gap-5">
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
                  const isToday = isSameDay(d, today);
                  const dow = d.getDay();
                  const hasValue = entry && entry.value > 0 && site;

                  const cellBg = hasValue ? tint(site.color, 0.12) : C.surface;
                  const cellBorder = isToday
                    ? `2px solid ${C.accent}`
                    : hasValue
                    ? `1px solid ${tint(site.color, 0.3)}`
                    : `1px solid ${C.borderSoft}`;

                  return (
                    <button
                      key={i}
                      onClick={() => openDay(d)}
                      className="aspect-square rounded-lg flex flex-col p-1 md:p-1.5 relative overflow-hidden"
                      style={{
                        background: cellBg,
                        border: cellBorder,
                        color: C.ink,
                      }}
                    >
                      <div className="flex items-start justify-between w-full gap-1">
                        <span
                          className="text-[11px] md:text-xs leading-none font-medium num"
                          style={{
                            color: hasValue
                              ? site.color
                              : dow === 0
                              ? C.sun
                              : dow === 6
                              ? C.sat
                              : C.inkSoft,
                          }}
                        >
                          {d.getDate()}
                        </span>
                        {hasValue && (
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
                      </div>

                      {hasValue && (
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

                      {isToday && !hasValue && (
                        <div className="flex-1 flex items-center justify-center">
                          <span
                            className="text-[9px] uppercase tracking-widest"
                            style={{ color: C.accent, fontWeight: 600 }}
                          >
                            TODAY
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>

              {summary.perSite.length > 0 && (
                <div
                  className="mt-4 pt-3 flex items-center gap-3 flex-wrap text-xs"
                  style={{ borderTop: `1px dashed ${C.border}`, color: C.muted }}
                >
                  {summary.perSite.map((p) => (
                    <div key={p.site.id} className="flex items-center gap-1.5">
                      <span
                        className="inline-block rounded-full"
                        style={{ width: 10, height: 10, background: p.site.color }}
                      />
                      <span style={{ color: C.inkSoft }}>{p.site.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="lg:col-span-2 space-y-4">
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
              </div>

              <div className="space-y-2.5 mb-4">
                <AmountRow label="총 지급액" value={summary.totalGross} color={C.inkSoft} />
                <AmountRow label="세금 (3.3%)" value={summary.totalTax} color={C.muted} minus />
              </div>

              <div className="rounded-xl p-4" style={{ background: C.greenSoft }}>
                <div
                  className="text-xs mb-1"
                  style={{ color: C.green, fontWeight: 600, letterSpacing: "0.02em" }}
                >
                  이번 달 실수령액
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
                  {won(summary.totalNet)}
                  <span className="text-base ml-1" style={{ fontWeight: 500 }}>
                    원
                  </span>
                </div>
              </div>
            </div>

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

                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className="text-xs num" style={{ color: C.muted }}>
                          {p.workDays}일 · {fmtUnits(p.totalUnits)}공수
                        </span>
                        <span className="text-xs num" style={{ color: C.muted }}>
                          지급 {won(p.gross)}원
                        </span>
                      </div>

                      <div
                        className="flex items-baseline justify-between pt-1.5"
                        style={{ borderTop: `1px dashed ${tint(p.site.color, 0.25)}` }}
                      >
                        <span className="text-xs" style={{ color: C.green, fontWeight: 600 }}>
                          실수령
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
                          {won(p.net)}원
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.entries.length > 0 && (
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
                  style={{ maxHeight: 240, overflowY: "auto" }}
                >
                  {summary.entries.map((e) => (
                    <button
                      key={e.key}
                      onClick={() => openDay(e.date)}
                      className="w-full flex items-center justify-between text-sm py-1.5 px-2 rounded gap-2"
                      style={{ background: "transparent" }}
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
                  ))}
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
          실수령 = 공수 × 단가 ÷ 1.033 · 자동 저장
        </footer>
      </div>

      {selectedDate && (
        <Modal onClose={() => setSelectedKey(null)}>
          <div className="flex items-center justify-between mb-5">
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

          {sites.length === 0 ? (
            <div className="text-center py-6">
              <Building2 size={32} style={{ color: C.muted, margin: "0 auto 10px" }} />
              <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
                등록된 현장이 없어요.
                <br />
                먼저 현장을 추가해주세요.
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
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium" style={{ color: C.muted }}>
                    현장 선택
                  </label>
                  <button
                    onClick={() => {
                      setSelectedKey(null);
                      setShowSitesList(true);
                    }}
                    className="text-xs"
                    style={{
                      color: C.accent,
                      textDecoration: "underline",
                      textUnderlineOffset: 2,
                    }}
                  >
                    현장 관리
                  </button>
                </div>
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
        </Modal>
      )}

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
          <h3
            className="text-lg mb-2"
            style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}
          >
            현장 삭제
          </h3>
          <p className="text-sm mb-4" style={{ color: C.inkSoft }}>
            <span className="font-semibold" style={{ color: confirmDeleteSite.color }}>
              {confirmDeleteSite.name}
            </span>
            {" "}을(를) 삭제할까요?
            {entriesCountForSite(confirmDeleteSite.id) > 0 && (
              <>
                <br />
                <span style={{ color: C.accent }}>
                  이 현장의 기록 {entriesCountForSite(confirmDeleteSite.id)}건도 함께 삭제됩니다.
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
    </div>
  );
}

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
        <h3
          className="text-xl flex-1"
          style={{ fontFamily: FONT_DISPLAY, fontWeight: 700 }}
        >
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

        {name && abbr && Number(rate) > 0 && (
          <div
            className="p-3 rounded-lg flex items-center gap-3"
            style={{
              background: tint(color, 0.08),
              border: `1px dashed ${tint(color, 0.3)}`,
            }}
          >
            <div
              className="flex items-center justify-center rounded-md shrink-0"
              style={{
                width: 40,
                height: 40,
                background: color,
                color: "#fff",
                fontFamily: FONT_DISPLAY,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {abbr}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs" style={{ color: C.muted }}>
                미리보기
              </div>
              <div className="font-semibold truncate" style={{ color: C.ink }}>
                {name}
              </div>
              <div className="text-xs num" style={{ color: C.muted }}>
                1공수 {won(Number(rate))}원
              </div>
            </div>
          </div>
        )}
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

function AmountRow({ label, value, color, minus = false }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-sm" style={{ color: C.muted }}>
        {label}
      </span>
      <span className="num" style={{ color, fontWeight: 500, fontSize: "0.95rem" }}>
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
