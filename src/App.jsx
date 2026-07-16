import React, { useState, useEffect, useMemo } from "react";
import {
  Car, Fuel, Users, Plus, Trash2, MapPin, Ticket, Trophy,
  ExternalLink, Navigation, X, FileText, Save, FolderOpen, Eye, EyeOff,
} from "lucide-react";

const FONT_LINK_ID = "hasha-seisan-fonts";

function useFonts() {
  useEffect(() => {
    if (document.getElementById(FONT_LINK_ID)) return;
    const link = document.createElement("link");
    link.id = FONT_LINK_ID;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Noto+Sans+JP:wght@400;500;700;900&display=swap";
    document.head.appendChild(link);
  }, []);
}

// ---- design tokens (inline styles — this preview does not compile Tailwind
// arbitrary-value classes like bg-[#hex], so every custom color/size below
// is applied via style={} rather than bracket utility classes) ----
const C = {
  bg: "#F6F5F1",
  ink: "#16241D",
  turf: "#2F6B4A",
  turfDeep: "#1E4A34",
  turfDeeper: "#163A29",
  chalk: "#D8DED2",
  amber: "#C6862B",
  amberLight: "#F4C878",
  muted: "#4B5A50",
  mutedLight: "#8A9186",
  cardBorder: "#E4E7DE",
  divider: "#EEF0E9",
  danger: "#B4531E",
  dangerBg: "#FBEDE1",
  fieldBg: "#F1F3EC",
  placeholder: "#B7BDAE",
  scoreLabel: "#BFE0CC",
  subtle: "#9AA396",
  white: "#FFFFFF",
};

const jp = { fontFamily: "'Noto Sans JP', system-ui, sans-serif" };
const num = { fontFamily: "'Space Grotesk','Noto Sans JP',system-ui,sans-serif", fontVariantNumeric: "tabular-nums" };

const yen = (n) => (Number.isFinite(n) ? Math.round(n) : 0).toLocaleString("ja-JP");
const ceilTo10 = (n) => (Number.isFinite(n) ? Math.ceil(n / 10) * 10 : 0);

// 合計 total を count 人（台）に「1円単位」で割り切れるように分配する。
// 基本額 = Math.floor(total/count)。あまり(端数)は先頭から1円ずつ上乗せしていく。
// 呼び出し側で「先頭」に運転手を並べれば、端数は運転手に集中して割り当てられる。
function distributeExact(total, count) {
  if (!count || count <= 0) return [];
  const base = Math.floor(total / count);
  const remainder = total - base * count; // 0 <= remainder < count
  return Array.from({ length: count }, (_, i) => base + (i < remainder ? 1 : 0));
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("storage timeout")), ms)),
  ]);
}

let uidCounter = 0;
const nextUid = () => `p-${++uidCounter}-${Date.now()}`;

const CATEGORIES = [
  { id: "u12", label: "U12" },
  { id: "u11", label: "U11" },
  { id: "u10", label: "U10" },
  { id: "other", label: "その他" },
];

const ROSTER = {
  u12: ["トウリ", "アオイ", "ユウト", "リク", "シュンタ", "リョウヤ", "ケンタ", "リョウセイ"],
  u11: [
    "アオイ", "コウヘイ", "ソラ", "ユウタ", "ユウキ", "アラタ", "アヤタ",
    "ジン", "ソウキ", "ソウシ", "スイ", "シュン", "ユウト",
  ],
  u10: ["ルカス", "ハヤト", "ユウセイ", "シンジ", "クオン", "レン"],
};

function buildDefaultParticipants() {
  const list = [];
  ["u12", "u11", "u10"].forEach((catId) => {
    const names = [...ROSTER[catId]].sort((a, b) => a.localeCompare(b, "ja"));
    names.forEach((name) => {
      list.push({ id: nextUid(), name, driver: false, absent: false, altRouteCost: 0, category: catId });
    });
  });
  return list;
}

const DEFAULT_PARTICIPANTS = buildDefaultParticipants();

function Field({ label, unit, value, onChange, placeholder, step = "1" }) {
  const [focused, setFocused] = useState(false);
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          ...jp,
          display: "block",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.02em",
          color: C.muted,
          marginBottom: "6px",
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          borderRadius: "8px",
          border: `1px solid ${focused ? C.turf : C.chalk}`,
          boxShadow: focused ? `0 0 0 3px ${C.turf}26` : "none",
          background: C.white,
          overflow: "hidden",
          transition: "border-color .15s, box-shadow .15s",
        }}
      >
        <input
          type="number"
          inputMode="decimal"
          step={step}
          value={value}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          style={{
            ...num,
            width: "100%",
            padding: "10px 12px",
            fontSize: "15px",
            fontWeight: 700,
            color: C.ink,
            outline: "none",
            background: "transparent",
            border: "none",
          }}
        />
        {unit && (
          <span
            style={{
              ...jp,
              display: "flex",
              alignItems: "center",
              padding: "0 10px",
              fontSize: "12px",
              fontWeight: 700,
              color: C.mutedLight,
              background: C.fieldBg,
              borderLeft: `1px solid ${C.chalk}`,
              whiteSpace: "nowrap",
            }}
          >
            {unit}
          </span>
        )}
      </div>
    </label>
  );
}

function TextField({ label, value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <label style={{ display: "block" }}>
      <span
        style={{
          ...jp,
          display: "block",
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.02em",
          color: C.muted,
          marginBottom: "6px",
        }}
      >
        {label}
      </span>
      <div
        style={{
          borderRadius: "8px",
          border: `1px solid ${focused ? C.turf : C.chalk}`,
          boxShadow: focused ? `0 0 0 3px ${C.turf}26` : "none",
          background: C.white,
          overflow: "hidden",
          transition: "border-color .15s, box-shadow .15s",
        }}
      >
        <input
          type="text"
          value={value}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => onChange(e.target.value)}
          style={{
            ...jp,
            width: "100%",
            padding: "10px 12px",
            fontSize: "14px",
            fontWeight: 700,
            color: C.ink,
            outline: "none",
            background: "transparent",
            border: "none",
          }}
        />
      </div>
    </label>
  );
}

function Chip({ active, onClick, children, tone = "turf" }) {
  const activeBg = tone === "amber" ? C.amber : C.turf;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...jp,
        padding: "5px 10px",
        borderRadius: "999px",
        border: `1px solid ${active ? activeBg : C.chalk}`,
        background: active ? activeBg : C.white,
        color: active ? C.white : C.muted,
        fontSize: "11px",
        fontWeight: 700,
        transition: "transform .1s",
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.95)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children}
    </button>
  );
}

function Card({ children }) {
  return (
    <section
      style={{
        borderRadius: "16px",
        background: C.white,
        border: `1px solid ${C.cardBorder}`,
        padding: "16px",
      }}
    >
      {children}
    </section>
  );
}

function CardTitle({ icon, children }) {
  return (
    <h2
      style={{
        ...jp,
        display: "flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "13px",
        fontWeight: 700,
        color: C.turfDeep,
        marginBottom: "10px",
      }}
    >
      {icon}
      {children}
    </h2>
  );
}

function Row({ label, value, note, bold, isCount, unit, highlight, noBorder }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "12px",
        padding: "8px 0",
        borderBottom: noBorder ? "none" : `1px solid ${C.divider}`,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ ...jp, fontWeight: bold ? 700 : 500, color: bold ? C.ink : C.muted, fontSize: "13px" }}>
          {label}
        </div>
        {note && (
          <div style={{ ...jp, fontSize: "10.5px", color: C.subtle, marginTop: "2px" }} className="truncate">
            {note}
          </div>
        )}
      </div>
      <div
        style={{
          ...num,
          flexShrink: 0,
          fontWeight: 700,
          color: highlight ? C.danger : bold ? C.turfDeep : C.ink,
          fontSize: bold ? "16px" : "13px",
        }}
      >
        {isCount ? `${value}${unit}` : `¥${yen(value)}`}
      </div>
    </div>
  );
}

export default function App() {
  useFonts();

  const [tripName, setTripName] = useState("");
  const [tripDate, setTripDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [origin, setOrigin] = useState("サンドーム福井");
  const [destination, setDestination] = useState("伊佐津川運動公園");
  const [distanceOneWay, setDistanceOneWay] = useState(124);
  const [fuelEfficiency, setFuelEfficiency] = useState(10);
  const [fuelPrice, setFuelPrice] = useState(159);
  const [carCount, setCarCount] = useState(3);
  const [tollPerCar, setTollPerCar] = useState(4300);
  const [participants, setParticipants] = useState(DEFAULT_PARTICIPANTS);
  const [hiddenCategories, setHiddenCategories] = useState({});
  const [showDriverPanel, setShowDriverPanel] = useState(true);
  const [nameFocused, setNameFocused] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const [currentTripId, setCurrentTripId] = useState(null);
  const [savedTrips, setSavedTrips] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState(null); // null | "saving" | "saved" | "error"
  const [storageReady, setStorageReady] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (typeof window === "undefined" || !window.storage) {
        if (!cancelled) {
          setStorageReady(false);
          setListLoading(false);
        }
        return;
      }
      try {
        const res = await withTimeout(window.storage.get("trip-index", true), 6000);
        const list = res ? JSON.parse(res.value) : [];
        if (!cancelled) setSavedTrips(Array.isArray(list) ? list : []);
      } catch (e) {
        if (!cancelled) setSavedTrips([]);
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const saveTrip = async () => {
    if (!storageReady) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
      return;
    }
    setSaveStatus("saving");
    try {
      const id = currentTripId || `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const data = {
        id,
        tripName,
        tripDate,
        origin,
        destination,
        distanceOneWay,
        fuelEfficiency,
        fuelPrice,
        carCount,
        tollPerCar,
        participants,
        showDriverPanel,
      };
      await withTimeout(window.storage.set(`trip:${id}`, JSON.stringify(data), true), 6000);

      let list = [];
      try {
        const idxRes = await withTimeout(window.storage.get("trip-index", true), 6000);
        list = idxRes ? JSON.parse(idxRes.value) : [];
      } catch (e) {
        list = [];
      }
      if (!Array.isArray(list)) list = [];
      const entry = { id, tripName: tripName || "（無題の遠征）", tripDate };
      const next = [entry, ...list.filter((t) => t.id !== id)].sort((a, b) =>
        (b.tripDate || "").localeCompare(a.tripDate || "")
      );
      await withTimeout(window.storage.set("trip-index", JSON.stringify(next), true), 6000);

      setSavedTrips(next);
      setCurrentTripId(id);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (e) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const loadTrip = async (id) => {
    try {
      const res = await withTimeout(window.storage.get(`trip:${id}`, true), 6000);
      if (!res) return;
      const data = JSON.parse(res.value);
      setTripName(data.tripName ?? "");
      setTripDate(data.tripDate ?? new Date().toISOString().slice(0, 10));
      setOrigin(data.origin ?? "");
      setDestination(data.destination ?? "");
      setDistanceOneWay(data.distanceOneWay ?? 0);
      setFuelEfficiency(data.fuelEfficiency ?? 10);
      setFuelPrice(data.fuelPrice ?? 0);
      setCarCount(data.carCount ?? 0);
      setTollPerCar(data.tollPerCar ?? 0);
      setParticipants(
        Array.isArray(data.participants)
          ? data.participants.map((p) => ({
              ...p,
              altRouteCost: Number(p.altRouteCost) || 0,
              category: p.category || "other",
            }))
          : []
      );
      setShowDriverPanel(data.showDriverPanel ?? true);
      setCurrentTripId(id);
      setShowSummary(false);
    } catch (e) {
      // ignore load failure
    }
  };

  const deleteTrip = async (id) => {
    try {
      await withTimeout(window.storage.delete(`trip:${id}`, true), 6000).catch(() => {});
      let list = [];
      try {
        const idxRes = await withTimeout(window.storage.get("trip-index", true), 6000);
        list = idxRes ? JSON.parse(idxRes.value) : [];
      } catch (e) {
        list = [];
      }
      const next = (Array.isArray(list) ? list : []).filter((t) => t.id !== id);
      await withTimeout(window.storage.set("trip-index", JSON.stringify(next), true), 6000);
      setSavedTrips(next);
      if (currentTripId === id) setCurrentTripId(null);
    } catch (e) {
      // ignore delete failure
    }
  };

  const newTrip = () => {
    setCurrentTripId(null);
    setTripName("");
    setTripDate(new Date().toISOString().slice(0, 10));
    setOrigin("");
    setDestination("");
    setDistanceOneWay(0);
    setFuelEfficiency(10);
    setFuelPrice(0);
    setCarCount(0);
    setTollPerCar(0);
    setParticipants([]);
  };

  const calc = useMemo(() => {
    const dOneWay = Number(distanceOneWay) || 0;
    const eff = Number(fuelEfficiency) || 1;
    const price = Number(fuelPrice) || 0;
    const cars = Number(carCount) || 0;
    const toll = Number(tollPerCar) || 0;

    const active = participants.filter((p) => !p.absent);
    const drivers = active.filter((p) => p.driver);
    const nonDrivers = active.filter((p) => !p.driver);
    const participantCount = active.length;
    const driverCount = drivers.length;

    const distanceRT = dOneWay * 2;
    const fuelUsedPerCar = distanceRT / eff;
    const fuelCostPerCar = fuelUsedPerCar * price;
    const tollTotal = toll * cars;
    const fuelCostTotal = fuelCostPerCar * cars;
    const subtotal = tollTotal + fuelCostTotal; // 端数(小数)を含む可能性がある実費

    // --- 運転手への配車代（基本額）は全員同額。10円未満は切り上げ。 ---
    const perCarPayout = driverCount ? ceilTo10(subtotal / driverCount) : 0;

    // --- 別ルート代：手入力の返金額。運転手ごとに異なってよいが、費用は全選手で負担する ---
    const carPayout = {};
    let altRouteTotal = 0;
    drivers.forEach((p) => {
      const altRoute = Number(p.altRouteCost) || 0;
      carPayout[p.id] = perCarPayout + altRoute;
      altRouteTotal += altRoute;
    });
    const totalCarPayout = perCarPayout * driverCount + altRouteTotal;

    // --- 集金額（配車代の合計＝共通費用＋別ルート代 を全員で負担。円単位で必ず割り切れる） ---
    // 全員の基本額 = 配車代合計 ÷ 参加人数（切り捨て）。あまり(端数)は運転手だけで山分けする。
    const basePerson = participantCount ? Math.floor(totalCarPayout / participantCount) : 0;
    const personRemainder = totalCarPayout - basePerson * participantCount;

    const personCollect = {};
    nonDrivers.forEach((p) => {
      personCollect[p.id] = basePerson;
    });
    if (driverCount > 0) {
      const driverExtras = distributeExact(personRemainder, driverCount);
      drivers.forEach((p, i) => {
        personCollect[p.id] = basePerson + driverExtras[i];
      });
    } else if (personRemainder > 0) {
      // 運転手がいない場合のみ、やむを得ず全員で端数を按分する
      const fallback = distributeExact(totalCarPayout, participantCount);
      active.forEach((p, i) => {
        personCollect[p.id] = fallback[i];
      });
    }
    const totalCollected = active.reduce((s, p) => s + (personCollect[p.id] || 0), 0);

    // 集金額の合計と配車代の合計は常に一致するため、繰越は基本的に0円。
    // 例外は運転手が1人もいない場合（配れないため差額が残る）。
    const carryOver = totalCollected - totalCarPayout;

    const avgCarPayout = perCarPayout;

    return {
      distanceRT,
      tollTotal,
      fuelCostTotal,
      subtotal,
      participantCount,
      driverCount,
      basePerson,
      personCollect,
      carPayout,
      totalCollected,
      totalCarPayout,
      avgCarPayout,
      carryOver,
      carMismatch: driverCount !== cars,
    };
  }, [distanceOneWay, fuelEfficiency, fuelPrice, carCount, tollPerCar, participants]);

  const updateParticipant = (id, patch) =>
    setParticipants((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const addParticipant = (categoryId = "other") =>
    setParticipants((ps) => [
      ...ps,
      { id: nextUid(), name: "", driver: false, absent: false, altRouteCost: 0, category: categoryId },
    ]);

  const removeParticipant = (id) =>
    setParticipants((ps) => ps.filter((p) => p.id !== id));

  const toggleCategoryHidden = (id) =>
    setHiddenCategories((h) => ({ ...h, [id]: !h[id] }));

  const mapsUrl =
    origin.trim() && destination.trim()
      ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
          origin.trim()
        )}&destination=${encodeURIComponent(destination.trim())}&travelmode=driving`
      : null;

  const groupedParticipants = CATEGORIES.map((cat) => ({
    ...cat,
    members: participants.filter((p) => (p.category || "other") === cat.id),
  }));
  const orderedForDisplay = groupedParticipants.flatMap((g) => g.members);

  return (
    <div style={{ ...jp, minHeight: "100vh", background: C.bg, color: C.ink, paddingBottom: "64px" }}>
      {/* Scoreboard header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: `linear-gradient(180deg, ${C.turfDeep} 0%, ${C.turfDeeper} 100%)`,
          color: C.white,
          boxShadow: "0 2px 10px rgba(0,0,0,0.25)",
        }}
      >
        <div style={{ maxWidth: "448px", margin: "0 auto", padding: "16px 16px 14px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: C.scoreLabel,
              textTransform: "uppercase",
              marginBottom: "6px",
            }}
          >
            <Trophy size={12} strokeWidth={2.5} />
            遠征交通費 精算スコアボード
          </div>
          <input
            value={tripName}
            onChange={(e) => setTripName(e.target.value)}
            placeholder="遠征内容を入力"
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
            style={{
              ...jp,
              width: "100%",
              background: "transparent",
              fontSize: "18px",
              fontWeight: 700,
              color: C.white,
              outline: "none",
              border: "none",
              borderBottom: `1px solid ${nameFocused ? "rgba(255,255,255,0.5)" : "transparent"}`,
              paddingBottom: "4px",
              marginBottom: "8px",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", flexWrap: "wrap" }}>
            <input
              type="date"
              value={tripDate}
              onChange={(e) => setTripDate(e.target.value)}
              style={{
                ...num,
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: "8px",
                color: C.white,
                fontSize: "12px",
                fontWeight: 700,
                padding: "5px 8px",
                colorScheme: "dark",
              }}
            />
            <button
              type="button"
              onClick={saveTrip}
              disabled={saveStatus === "saving"}
              style={{
                ...jp,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                borderRadius: "999px",
                background: C.white,
                color: C.turfDeep,
                fontSize: "11px",
                fontWeight: 700,
                padding: "6px 10px",
                border: "none",
                opacity: saveStatus === "saving" ? 0.7 : 1,
                cursor: saveStatus === "saving" ? "default" : "pointer",
              }}
            >
              <Save size={11} />
              {saveStatus === "saving"
                ? "保存中…"
                : saveStatus === "saved"
                ? "保存しました"
                : saveStatus === "error"
                ? "保存できません"
                : currentTripId
                ? "この内容で保存"
                : "この遠征を保存"}
            </button>
            {currentTripId && (
              <button
                type="button"
                onClick={newTrip}
                style={{
                  ...jp,
                  borderRadius: "999px",
                  background: "rgba(255,255,255,0.1)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: C.white,
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "6px 10px",
                  cursor: "pointer",
                }}
              >
                ＋ 新規遠征
              </button>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <div
              style={{
                borderRadius: "12px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                padding: "10px 12px",
              }}
            >
              <div style={{ fontSize: "10px", fontWeight: 700, color: C.scoreLabel, marginBottom: "2px" }}>
                1人当たり集金額（基本）
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span style={{ ...num, fontSize: "28px", lineHeight: 1, fontWeight: 700, color: C.amberLight }}>
                  {yen(calc.basePerson)}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: C.amberLight }}>円</span>
              </div>
            </div>
            <div
              style={{
                borderRadius: "12px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                padding: "10px 12px",
              }}
            >
              <div style={{ fontSize: "10px", fontWeight: 700, color: C.scoreLabel, marginBottom: "2px" }}>
                1台当たり車代（基本額）
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "4px" }}>
                <span style={{ ...num, fontSize: "28px", lineHeight: 1, fontWeight: 700, color: C.amberLight }}>
                  {yen(calc.avgCarPayout)}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 700, color: C.amberLight }}>円</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: "448px", margin: "0 auto", padding: "16px 16px 0", display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Trip input card */}
        <Card>
          <CardTitle icon={<MapPin size={15} strokeWidth={2.5} />}>遠征情報を入力</CardTitle>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "10px" }}>
            <TextField label="出発地" value={origin} onChange={setOrigin} placeholder="サンドーム福井" />
            <TextField label="目的地" value={destination} onChange={setDestination} placeholder="伊佐津川運動公園" />
          </div>
          <div
            style={{
              marginBottom: "12px",
              borderRadius: "10px",
              background: C.fieldBg,
              border: `1px solid ${C.cardBorder}`,
              padding: "10px",
            }}
          >
            {mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  ...jp,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  borderRadius: "999px",
                  background: C.turf,
                  color: C.white,
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "5px 10px",
                  textDecoration: "none",
                }}
              >
                <Navigation size={11} />
                Googleマップでルートを確認
              </a>
            ) : (
              <p style={{ ...jp, fontSize: "11px", color: C.mutedLight, margin: 0 }}>
                出発地と目的地を入力するとルートを開けます
              </p>
            )}
            <p style={{ ...jp, fontSize: "10.5px", color: C.subtle, margin: "6px 0 0" }}>
              開いた画面で片道距離と高速代を確認し、下の欄に入力してください（料金はGoogleマップの経路案内内の「詳細」で表示されます）
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <Field label="片道距離" unit="km" value={distanceOneWay} onChange={setDistanceOneWay} placeholder="124" />
            <Field label="ガソリン単価" unit="円/L" value={fuelPrice} onChange={setFuelPrice} placeholder="159" />
            <Field label="配車数" unit="台" value={carCount} onChange={setCarCount} placeholder="3" />
            <Field label="高速代（1台往復）" unit="円" value={tollPerCar} onChange={setTollPerCar} placeholder="4300" />
          </div>

          <div
            style={{
              marginTop: "10px",
              borderRadius: "10px",
              background: C.fieldBg,
              border: `1px solid ${C.cardBorder}`,
              padding: "10px",
            }}
          >
            <a
              href="https://gogo.gs/18207?device=pc"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                ...jp,
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                borderRadius: "999px",
                background: C.white,
                border: `1px solid ${C.chalk}`,
                color: C.muted,
                fontSize: "11px",
                fontWeight: 700,
                padding: "5px 10px",
                textDecoration: "none",
              }}
            >
              <ExternalLink size={11} />
              gogo.gsで地域価格を確認
            </a>
          </div>

          <details style={{ marginTop: "10px" }}>
            <summary style={{ fontSize: "11px", fontWeight: 700, color: C.mutedLight, cursor: "pointer" }}>
              燃費の設定（初期値 10km/L）
            </summary>
            <div style={{ paddingTop: "8px", maxWidth: "140px" }}>
              <Field label="燃費" unit="km/L" value={fuelEfficiency} onChange={setFuelEfficiency} step="0.1" />
            </div>
          </details>
        </Card>

        {/* Cost breakdown card */}
        <Card>
          <CardTitle icon={<Fuel size={15} strokeWidth={2.5} />}>費用の内訳</CardTitle>
          <div>
            <Row label="高速代合計" value={calc.tollTotal} note={`${yen(tollPerCar)}円 × ${carCount}台`} />
            <Row
              label="ガソリン代合計"
              value={calc.fuelCostTotal}
              note={`往復${yen(calc.distanceRT)}km ÷ ${fuelEfficiency}km/L × ${yen(fuelPrice)}円 × ${carCount}台`}
            />
            <Row label="小計" value={calc.subtotal} bold />
            <Row label="参加人数" value={calc.participantCount} isCount unit="人" />
            <Row label="配車台数" value={Number(carCount) || 0} isCount unit="台" noBorder />
          </div>
          {calc.carMismatch && (
            <p
              style={{
                marginTop: "8px",
                fontSize: "11px",
                fontWeight: 700,
                color: C.danger,
                background: C.dangerBg,
                borderRadius: "8px",
                padding: "6px 10px",
              }}
            >
              ※ 運転手として登録した人数（{calc.driverCount}人）が配車数（{carCount}台）と一致していません。
            </p>
          )}
          {calc.driverCount === 0 && (
            <p
              style={{
                marginTop: "8px",
                fontSize: "11px",
                fontWeight: 700,
                color: C.danger,
                background: C.dangerBg,
                borderRadius: "8px",
                padding: "6px 10px",
              }}
            >
              ※ 運転手が1人も登録されていないため、配車代を配分できません。下の一覧で運転手を設定してください。
            </p>
          )}
        </Card>

        {/* Participants card */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
            <CardTitle icon={<Users size={15} strokeWidth={2.5} />}>
              <span style={{ marginBottom: 0 }}>参加者・集金一覧</span>
            </CardTitle>
            <button
              onClick={() => setShowDriverPanel((v) => !v)}
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: C.turf,
                textDecoration: "underline",
                textDecorationStyle: "dotted",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              {showDriverPanel ? "運転手設定を隠す" : "運転手を設定"}
            </button>
          </div>
          <p style={{ ...jp, fontSize: "10px", color: C.subtle, margin: "0 0 12px" }}>
            カテゴリを非表示にしても集計対象からは外れません。除外したい場合は各選手を「欠席にする」にしてください。
          </p>

          {groupedParticipants.map((g) => {
            const hidden = !!hiddenCategories[g.id];
            if (g.members.length === 0 && g.id === "other") return null;
            return (
              <div key={g.id} style={{ marginBottom: "14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ ...jp, fontSize: "12.5px", fontWeight: 700, color: C.turfDeep }}>{g.label}</span>
                    <span
                      style={{
                        ...num,
                        fontSize: "10px",
                        fontWeight: 700,
                        color: C.mutedLight,
                        background: C.fieldBg,
                        borderRadius: "999px",
                        padding: "1px 7px",
                      }}
                    >
                      {g.members.length}人
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleCategoryHidden(g.id)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "10.5px",
                      fontWeight: 700,
                      color: C.turf,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {hidden ? <Eye size={12} /> : <EyeOff size={12} />}
                    {hidden ? "表示する" : "非表示にする"}
                  </button>
                </div>

                {!hidden && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {g.members.map((p) => {
                      const displayIdx = orderedForDisplay.indexOf(p) + 1;
                      const collect = p.absent ? 0 : calc.personCollect[p.id] || 0;
                      const carPay = p.driver && !p.absent ? calc.carPayout[p.id] || 0 : 0;
                      const net = carPay - collect;
                      const isExtra = p.driver && !p.absent && collect > calc.basePerson;
                      return (
                        <div
                          key={p.id}
                          style={{
                            borderRadius: "12px",
                            border: `1px solid ${p.absent ? C.divider : C.cardBorder}`,
                            background: p.absent ? "#FAFAF7" : C.white,
                            opacity: p.absent ? 0.6 : 1,
                            padding: "8px 10px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              style={{
                                ...num,
                                flexShrink: 0,
                                width: "24px",
                                height: "24px",
                                borderRadius: "999px",
                                background: C.divider,
                                color: C.muted,
                                fontSize: "11px",
                                fontWeight: 700,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              {displayIdx}
                            </span>
                            <input
                              value={p.name}
                              onChange={(e) => updateParticipant(p.id, { name: e.target.value })}
                              placeholder="選手名"
                              style={{
                                ...jp,
                                minWidth: 0,
                                flex: 1,
                                fontSize: "13px",
                                fontWeight: 700,
                                outline: "none",
                                background: "transparent",
                                border: "none",
                                color: C.ink,
                              }}
                            />
                            <span style={{ ...num, flexShrink: 0, fontWeight: 700, fontSize: "13px", color: isExtra ? C.amber : C.turfDeep }}>
                              {p.absent ? "—" : `¥${yen(collect)}`}
                            </span>
                            <button
                              onClick={() => removeParticipant(p.id)}
                              aria-label="この選手を削除"
                              style={{ flexShrink: 0, background: "none", border: "none", color: "#C7CCC0", cursor: "pointer", padding: "2px" }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", paddingLeft: "32px", flexWrap: "wrap" }}>
                            <Chip tone="amber" active={p.absent} onClick={() => updateParticipant(p.id, { absent: !p.absent })}>
                              {p.absent ? "欠席中（集計から除外）" : "欠席にする"}
                            </Chip>
                            {showDriverPanel && !p.absent && (
                              <Chip active={p.driver} onClick={() => updateParticipant(p.id, { driver: !p.driver })}>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <Car size={11} /> 運転手
                                </span>
                              </Chip>
                            )}
                          </div>
                          {showDriverPanel && p.driver && !p.absent && (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "8px",
                                marginTop: "6px",
                                paddingLeft: "32px",
                                flexWrap: "wrap",
                              }}
                            >
                              <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ ...jp, fontSize: "10.5px", fontWeight: 700, color: C.mutedLight, whiteSpace: "nowrap" }}>
                                  別ルート代
                                </span>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "stretch",
                                    borderRadius: "6px",
                                    border: `1px solid ${C.chalk}`,
                                    background: C.white,
                                    overflow: "hidden",
                                  }}
                                >
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    value={p.altRouteCost || 0}
                                    onChange={(e) =>
                                      updateParticipant(p.id, {
                                        altRouteCost: e.target.value === "" ? 0 : Number(e.target.value),
                                      })
                                    }
                                    style={{
                                      ...num,
                                      width: "68px",
                                      fontSize: "12px",
                                      fontWeight: 700,
                                      padding: "3px 6px",
                                      outline: "none",
                                      border: "none",
                                      color: C.ink,
                                      background: "transparent",
                                    }}
                                  />
                                  <span
                                    style={{
                                      ...jp,
                                      display: "flex",
                                      alignItems: "center",
                                      padding: "0 6px",
                                      fontSize: "10px",
                                      fontWeight: 700,
                                      color: C.mutedLight,
                                      background: C.fieldBg,
                                      borderLeft: `1px solid ${C.chalk}`,
                                    }}
                                  >
                                    円
                                  </span>
                                </div>
                              </label>
                              <span style={{ ...num, fontSize: "11px", fontWeight: 700, color: C.amber, whiteSpace: "nowrap" }}>
                                配車代 ¥{yen(carPay)}（相殺 {net >= 0 ? "+" : ""}
                                {yen(net)}）
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={() => addParticipant(g.id)}
                  style={{
                    ...jp,
                    width: "100%",
                    marginTop: "6px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4px",
                    borderRadius: "10px",
                    border: `1px dashed ${C.placeholder}`,
                    background: "none",
                    padding: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    color: C.muted,
                    cursor: "pointer",
                  }}
                >
                  <Plus size={12} /> {g.label}に選手を追加
                </button>
              </div>
            );
          })}

          <button
            onClick={() => addParticipant("other")}
            style={{
              ...jp,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              borderRadius: "12px",
              border: `1px dashed ${C.placeholder}`,
              background: "none",
              padding: "8px",
              fontSize: "12px",
              fontWeight: 700,
              color: C.muted,
              cursor: "pointer",
            }}
          >
            <Plus size={14} /> その他の選手を追加
          </button>
        </Card>

        {/* Totals card */}
        <Card>
          <CardTitle icon={<Ticket size={15} strokeWidth={2.5} />}>集計結果</CardTitle>
          <div>
            <Row
              label="集金額 合計"
              value={calc.totalCollected}
              note={`基本¥${yen(calc.basePerson)} × ${calc.participantCount}人（端数は運転手が負担）`}
              bold
            />
            <Row
              label="運転手への配車代 合計"
              value={calc.totalCarPayout}
              note={`基本1台¥${yen(calc.avgCarPayout)}（10円未満切り上げ）× ${calc.driverCount}人 + 別ルート代`}
            />
            <Row
              label={calc.carryOver === 0 ? "過不足" : calc.carryOver > 0 ? "不足（要配分先）" : "不足額"}
              value={Math.abs(calc.carryOver)}
              highlight={calc.carryOver !== 0}
              note={
                calc.carryOver === 0
                  ? "繰越金なし・きっちり割り切れています"
                  : "運転手が未設定のため精算できていません"
              }
              noBorder
            />
          </div>
        </Card>

        <button
          onClick={() => setShowSummary(true)}
          style={{
            ...jp,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            borderRadius: "14px",
            background: C.turfDeep,
            color: C.white,
            padding: "14px",
            fontSize: "14px",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 14px rgba(30,74,52,0.25)",
          }}
        >
          <FileText size={16} /> 結果を出力する
        </button>

        <p style={{ textAlign: "center", fontSize: "10.5px", color: C.subtle, lineHeight: 1.6, padding: "0 16px" }}>
          燃費は{fuelEfficiency}km/L固定で計算。配車代は基本額（全台同額・10円未満切り上げ）に別ルート代を加算し、その分も含めて全選手で公平に負担するため繰越は出ません。
        </p>

        {/* Saved trips */}
        <Card>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
            <CardTitle icon={<FolderOpen size={15} strokeWidth={2.5} />}>保存済みの遠征</CardTitle>
            {savedTrips.length > 0 && (
              <button
                type="button"
                onClick={newTrip}
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: C.turf,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ＋ 新規遠征
              </button>
            )}
          </div>
          <p style={{ ...jp, fontSize: "10px", color: C.subtle, margin: "0 0 10px" }}>
            このアプリを開いた人全員が同じ一覧を見られます
          </p>

          {!storageReady ? (
            <p style={{ ...jp, fontSize: "12px", color: C.danger, margin: 0 }}>
              この環境では保存機能を利用できません。入力内容はこの画面を開いている間のみ有効です。
            </p>
          ) : listLoading ? (
            <p style={{ ...jp, fontSize: "12px", color: C.mutedLight, margin: 0 }}>読み込み中…</p>
          ) : savedTrips.length === 0 ? (
            <p style={{ ...jp, fontSize: "12px", color: C.mutedLight, margin: 0 }}>
              まだ保存された遠征はありません。上の「この遠征を保存」から保存できます。
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {savedTrips.map((t) => {
                const active = t.id === currentTripId;
                return (
                  <div
                    key={t.id}
                    onClick={() => loadTrip(t.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "8px",
                      borderRadius: "12px",
                      border: `1px solid ${active ? C.turf : C.cardBorder}`,
                      background: active ? "#EEF5F0" : C.white,
                      padding: "9px 10px",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ ...num, fontSize: "10.5px", fontWeight: 700, color: C.mutedLight }}>
                        {t.tripDate || "日付未設定"}
                      </div>
                      <div style={{ ...jp, fontSize: "13px", fontWeight: 700, color: C.ink }} className="truncate">
                        {t.tripName || "（無題の遠征）"}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteTrip(t.id);
                      }}
                      aria-label="この遠征を削除"
                      style={{
                        flexShrink: 0,
                        background: "none",
                        border: "none",
                        color: "#C7CCC0",
                        cursor: "pointer",
                        padding: "4px",
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {showSummary && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            background: C.bg,
            overflowY: "auto",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div style={{ width: "100%", maxWidth: "430px", padding: "12px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ ...jp, fontSize: "11px", fontWeight: 700, color: C.mutedLight }}>
                精算結果（スクリーンショットで共有できます）
              </span>
              <button
                onClick={() => setShowSummary(false)}
                aria-label="閉じる"
                style={{
                  background: C.white,
                  border: `1px solid ${C.cardBorder}`,
                  borderRadius: "999px",
                  width: "24px",
                  height: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: C.muted,
                  flexShrink: 0,
                }}
              >
                <X size={13} />
              </button>
            </div>

            {/* Header block */}
            <div
              style={{
                borderRadius: "14px",
                background: `linear-gradient(180deg, ${C.turfDeep} 0%, ${C.turfDeeper} 100%)`,
                color: C.white,
                padding: "12px",
                marginBottom: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "9px", fontWeight: 700, color: C.scoreLabel, letterSpacing: "0.08em", marginBottom: "3px" }}>
                <Trophy size={11} strokeWidth={2.5} />
                遠征交通費 精算結果
              </div>
              <div style={{ fontSize: "15px", fontWeight: 700, marginBottom: origin || destination ? "1px" : "8px" }} className="truncate">
                {tripName || "（タイトル未入力）"}
              </div>
              {(origin || destination) && (
                <div style={{ fontSize: "10px", color: C.scoreLabel, marginBottom: "8px" }} className="truncate">
                  {origin || "?"} → {destination || "?"}
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
                <div style={{ borderRadius: "9px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", padding: "6px 9px" }}>
                  <div style={{ fontSize: "8.5px", fontWeight: 700, color: C.scoreLabel, marginBottom: "1px" }}>1人当たり集金額（基本）</div>
                  <div style={{ ...num, fontSize: "19px", lineHeight: 1, fontWeight: 700, color: C.amberLight }}>
                    ¥{yen(calc.basePerson)}
                  </div>
                </div>
                <div style={{ borderRadius: "9px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", padding: "6px 9px" }}>
                  <div style={{ fontSize: "8.5px", fontWeight: 700, color: C.scoreLabel, marginBottom: "1px" }}>1台当たり車代（基本額）</div>
                  <div style={{ ...num, fontSize: "19px", lineHeight: 1, fontWeight: 700, color: C.amberLight }}>
                    ¥{yen(calc.avgCarPayout)}
                  </div>
                </div>
              </div>
            </div>

            {/* Cost basis */}
            <div style={{ borderRadius: "12px", background: C.white, border: `1px solid ${C.cardBorder}`, padding: "8px 10px", marginBottom: "8px" }}>
              <div style={{ ...jp, fontSize: "9.5px", color: C.subtle, marginBottom: "4px" }}>
                片道{yen(Number(distanceOneWay) || 0)}km（往復{yen(calc.distanceRT)}km）・{fuelEfficiency}km/L・{yen(fuelPrice)}円/L・高速代{yen(tollPerCar)}円/台・{carCount}台
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr auto", columnGap: "6px", rowGap: "2px", fontSize: "11px", alignItems: "baseline" }}>
                <span style={{ ...jp, color: C.muted }}>高速代計</span>
                <span style={{ ...num, fontWeight: 700 }}>¥{yen(calc.tollTotal)}</span>
                <span style={{ ...jp, color: C.muted }}>ガソリン計</span>
                <span style={{ ...num, fontWeight: 700 }}>¥{yen(calc.fuelCostTotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: `1px solid ${C.divider}`, marginTop: "4px", paddingTop: "4px" }}>
                <span style={{ ...jp, fontSize: "11px", fontWeight: 700, color: C.ink }}>小計</span>
                <span style={{ ...num, fontSize: "13px", fontWeight: 700, color: C.turfDeep }}>¥{yen(calc.subtotal)}</span>
              </div>
            </div>

            {/* Collection & settlement */}
            <div style={{ borderRadius: "12px", background: C.white, border: `1px solid ${C.cardBorder}`, padding: "8px 10px", marginBottom: "8px" }}>
              <div style={{ ...jp, fontSize: "10.5px", fontWeight: 700, color: C.turfDeep, marginBottom: "5px" }}>
                集金額一覧（{calc.participantCount}人）
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 6px", marginBottom: "6px" }}>
                {participants
                  .filter((p) => !p.absent)
                  .map((p, i) => {
                    const amt = calc.personCollect[p.id] || 0;
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "4px",
                          borderRadius: "7px",
                          background: C.fieldBg,
                          padding: "3px 6px",
                        }}
                      >
                        <span style={{ ...jp, fontSize: "11px", fontWeight: 700, color: C.ink, display: "flex", alignItems: "center", gap: "3px", minWidth: 0 }} className="truncate">
                          {p.driver && <Car size={9} color={C.amber} />}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.name || `選手${i + 1}`}
                          </span>
                        </span>
                        <span style={{ ...num, fontSize: "11px", fontWeight: 700, color: p.driver ? C.amber : C.ink, flexShrink: 0 }}>
                          ¥{yen(amt)}
                        </span>
                      </div>
                    );
                  })}
              </div>

              {calc.driverCount > 0 && (
                <>
                  <div style={{ borderTop: `1px solid ${C.divider}`, paddingTop: "6px", marginBottom: "5px" }}>
                    <div style={{ ...jp, fontSize: "10.5px", fontWeight: 700, color: C.amber, display: "flex", alignItems: "center", gap: "4px" }}>
                      <Car size={11} color={C.amber} />
                      運転手への返金額
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "6px" }}>
                    {participants
                      .filter((p) => p.driver && !p.absent)
                      .map((p, i) => {
                        const collect = calc.personCollect[p.id] || 0;
                        const payout = calc.carPayout[p.id] || 0;
                        const net = payout - collect;
                        const altRoute = Number(p.altRouteCost) || 0;
                        return (
                          <div
                            key={p.id}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "6px",
                              borderRadius: "8px",
                              background: "#FBF3E4",
                              padding: "4px 8px",
                            }}
                          >
                            <span style={{ ...jp, fontSize: "11px", fontWeight: 700, color: C.ink, minWidth: 0 }} className="truncate">
                              {p.name || `運転手${i + 1}`}
                              {altRoute > 0 && (
                                <span style={{ ...jp, fontSize: "9px", fontWeight: 700, color: C.subtle, marginLeft: "4px" }}>
                                  (別ルート代¥{yen(altRoute)}含む)
                                </span>
                              )}
                            </span>
                            <span style={{ ...num, fontSize: "12.5px", fontWeight: 700, color: net < 0 ? C.danger : C.amber, flexShrink: 0 }}>
                              {net >= 0 ? "+" : "−"}¥{yen(Math.abs(net))}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                  <div style={{ ...jp, fontSize: "9px", color: C.subtle, marginBottom: "6px" }}>
                    配車代は基本額(全台同額・10円未満切り上げ)＋別ルート代。別ルート代は全選手の集金額に薄く上乗せして負担します。
                  </div>
                </>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr auto", rowGap: "2px", fontSize: "11px", borderTop: `1px solid ${C.divider}`, paddingTop: "5px" }}>
                <span style={{ ...jp, fontWeight: 700, color: C.ink }}>集金額 合計</span>
                <span style={{ ...num, fontWeight: 700, color: C.turfDeep }}>¥{yen(calc.totalCollected)}</span>
                <span style={{ ...jp, color: C.muted }}>配車代 合計</span>
                <span style={{ ...num, fontWeight: 700 }}>¥{yen(calc.totalCarPayout)}</span>
                <span style={{ ...jp, color: calc.carryOver !== 0 ? C.danger : C.muted }}>
                  {calc.carryOver === 0 ? "過不足" : "不足額"}
                </span>
                <span style={{ ...num, fontWeight: 700, color: calc.carryOver !== 0 ? C.danger : C.ink }}>
                  ¥{yen(Math.abs(calc.carryOver))}
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowSummary(false)}
              style={{
                ...jp,
                width: "100%",
                borderRadius: "12px",
                background: C.white,
                border: `1px solid ${C.cardBorder}`,
                color: C.muted,
                padding: "9px",
                fontSize: "11.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              入力画面に戻る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
