import { useMemo } from "react";
import { useKpiBadgeValue } from "@/hooks/useKpiBadgeValue";

function formatUSD(val: number | null): string {
  if (val === null || val === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val);
}

export function DepositOaciKpi() {
  const { data } = useKpiBadgeValue("deposit_oaci");

  if (!data) {
    return (
      <div
        style={{
          padding: "20px",
          borderRadius: "12px",
          border: "1px solid hsl(var(--border))",
          background: "hsl(var(--muted))",
          minHeight: "180px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: "13px", color: "#9CA3AF" }}>⏳ Chargement...</span>
      </div>
    );
  }

  const montantRealise = data.variableValues?.[0]?.value ?? 0;
  const montantCible = data.variableValues?.[0]?.seuilValeur ?? null;
  const montantRestant = montantCible !== null ? montantCible - montantRealise : null;

  const tauxConsommation =
    montantCible && montantCible > 0
      ? Math.min(Math.round((montantRealise / montantCible) * 100), 100)
      : 0;

  // alertThreshold comes ONLY from kpi_seuils (set by super_admin in Administration)
  const allSeuils = data.seuils ?? [];
  const alertSeuilDef = allSeuils.find((s) =>
    s.label_statut?.toLowerCase().includes("alerte")
  );
  const alertThreshold =
    (alertSeuilDef?.conditions?.[0]?.min_value as number | undefined) ?? null;

  // Dynamic marker position formula: (1 - seuil / cible) × 100
  const alertMarkerPct = (() => {
    if (
      !montantCible || montantCible <= 0 ||
      !alertThreshold || alertThreshold <= 0 ||
      alertThreshold >= montantCible
    ) return null;
    return Math.round((1 - alertThreshold / montantCible) * 100 * 100) / 100;
  })();

  const showMarker = alertMarkerPct !== null;
  const markerPctSafe = alertMarkerPct ?? 0;

  const isNotEntered = montantRealise === 0 && montantCible === null;
  const isAlert =
    !isNotEntered &&
    montantRestant !== null &&
    alertThreshold !== null &&
    montantRestant < alertThreshold;

  const barColor = isNotEntered ? "#D1D5DB" : isAlert ? "#EF4444" : "#22C55E";
  const restantColor = isNotEntered ? "#9CA3AF" : isAlert ? "#DC2626" : "#15803D";

  // Override active seuil based on montantRestant vs alertThreshold (not generic logic)
  const activeSeuil = (() => {
    if (isNotEntered) {
      return (
        allSeuils.find((s) => s.label_statut?.toLowerCase().includes("non renseign")) ??
        null
      );
    }
    if (isAlert) {
      return alertSeuilDef ?? null;
    }
    return (
      allSeuils.find((s) => s.label_statut?.toLowerCase().includes("suffisant")) ??
      null
    );
  })();

  return (
    <div
      style={{
        borderRadius: "12px",
        border: `2px solid ${
          isAlert ? "#FECACA" : isNotEntered ? "#E5E7EB" : "#BBF7D0"
        }`,
        background: isAlert ? "#FEF2F2" : isNotEntered ? "#F9FAFB" : "#F0FDF4",
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        transition: "all 0.3s ease",
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <p
            style={{
              fontSize: "11px",
              fontWeight: 700,
              color: "#6B7280",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              margin: 0,
            }}
          >
            💰 Déposit OACI
          </p>
          <p style={{ fontSize: "10px", color: "#9CA3AF", margin: "2px 0 0", fontStyle: "italic" }}>
            Compte No. EI0028 — TRAINAIR PLUS
          </p>
        </div>
      </div>

      {/* THREE AMOUNTS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
        <div
          style={{
            textAlign: "center",
            padding: "8px 4px",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.7)",
            border: "1px solid #E5E7EB",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              color: "#9CA3AF",
              margin: "0 0 3px",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Cible
          </p>
          <p style={{ fontSize: "14px", fontWeight: 800, color: "#1F4E79", margin: 0 }}>
            {formatUSD(montantCible)}
          </p>
        </div>
        <div
          style={{
            textAlign: "center",
            padding: "8px 4px",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.7)",
            border: "1px solid #E5E7EB",
          }}
        >
          <p
            style={{
              fontSize: "10px",
              color: "#9CA3AF",
              margin: "0 0 3px",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Consommé
          </p>
          <p style={{ fontSize: "14px", fontWeight: 800, color: "#374151", margin: 0 }}>
            {formatUSD(montantRealise || null)}
          </p>
        </div>
        <div
          style={{
            textAlign: "center",
            padding: "8px 4px",
            borderRadius: "8px",
            background: "rgba(255,255,255,0.7)",
            border: `1px solid ${isAlert ? "#FECACA" : "#BBF7D0"}`,
          }}
        >
          <p
            style={{
              fontSize: "10px",
              color: "#9CA3AF",
              margin: "0 0 3px",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Restant
          </p>
          <p style={{ fontSize: "14px", fontWeight: 800, color: restantColor, margin: 0 }}>
            {formatUSD(montantRestant)}
          </p>
        </div>
      </div>

      {/* CONSUMPTION % */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: "12px", color: "#6B7280", fontWeight: 600 }}>Consommation</span>
        <span style={{ fontSize: "20px", fontWeight: 900, color: barColor }}>
          {isNotEntered ? "—" : `${tauxConsommation}%`}
        </span>
      </div>

      {/* PROGRESS BAR */}
      {!isNotEntered && (
        <div
          style={{
            position: "relative",
            paddingTop: "20px",
            paddingBottom: "20px",
          }}
        >
          {/* LABEL ABOVE BAR */}
          {showMarker && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: `${alertMarkerPct}%`,
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 3,
              }}
            >
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 800,
                  color: "#B45309",
                  whiteSpace: "nowrap",
                  background: "#FEF3C7",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  border: "1px solid #FDE68A",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                }}
              >
                ⚠️ {formatUSD(alertThreshold)}
              </span>
              <div style={{ width: "1px", height: "4px", background: "#F59E0B" }} />
            </div>
          )}

          {/* PROGRESS BAR TRACK */}
          <div
            style={{
              position: "relative",
              height: "14px",
              borderRadius: "7px",
              background: "#E5E7EB",
              overflow: "visible",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${tauxConsommation}%`,
                background: barColor,
                borderRadius: "7px",
                transition: "width 0.5s ease",
                position: "relative",
                zIndex: 1,
              }}
            />
            {showMarker && (
              <div
                style={{
                  position: "absolute",
                  top: "-3px",
                  left: `${alertMarkerPct}%`,
                  transform: "translateX(-50%)",
                  width: "3px",
                  height: "20px",
                  background: "#F59E0B",
                  borderRadius: "2px",
                  zIndex: 4,
                  boxShadow: "0 0 6px rgba(245,158,11,0.7)",
                }}
              />
            )}
            {tauxConsommation > 15 &&
              (!showMarker || Math.abs(tauxConsommation - alertMarkerPct) > 15) && (
                <div
                  style={{
                    position: "absolute",
                    left: `${tauxConsommation / 2}%`,
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                    fontSize: "9px",
                    fontWeight: 800,
                    color: "white",
                    zIndex: 2,
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tauxConsommation}%
                </div>
              )}
          </div>

          {/* LABEL BELOW BAR */}
          {showMarker && (
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: `${alertMarkerPct}%`,
                transform: "translateX(-50%)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                zIndex: 3,
              }}
            >
              <div style={{ width: "1px", height: "4px", background: "#F59E0B" }} />
              <span
                style={{
                  fontSize: "9px",
                  fontWeight: 600,
                  color: "#B45309",
                  whiteSpace: "nowrap",
                }}
              >
                Seuil d'alerte
              </span>
            </div>
          )}

          {/* SCALE LABELS */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "9px",
              color: "#9CA3AF",
              marginTop: "4px",
            }}
          >
            <span>$0</span>
            <span>{formatUSD(montantCible)}</span>
          </div>
        </div>
      )}

      {/* STATUS */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "6px",
          padding: "8px 12px",
          borderRadius: "8px",
          background: "rgba(255,255,255,0.6)",
          border: `1px solid ${isAlert ? "#FECACA" : isNotEntered ? "#E5E7EB" : "#BBF7D0"}`,
        }}
      >
        <span style={{ fontSize: "16px", flexShrink: 0 }}>
          {activeSeuil?.icon_statut ?? "ℹ️"}
        </span>
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: isAlert ? "#DC2626" : isNotEntered ? "#6B7280" : "#15803D",
            lineHeight: 1.4,
          }}
        >
          {activeSeuil?.label_statut ?? "Solde non renseigné"}
        </span>
      </div>

      <p
        style={{
          fontSize: "10px",
          color: "#9CA3AF",
          margin: 0,
          fontStyle: "italic",
          textAlign: "right",
        }}
      >
        Seuil configurable dans Administration ›
      </p>
    </div>
  );
}

export default DepositOaciKpi;
