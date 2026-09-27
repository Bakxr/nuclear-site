import { useMemo, useState } from "react";
import { useTerminal } from "../context.jsx";
import TerminalPanel from "../components/TerminalPanel.jsx";
import DataTable from "./DataTable.jsx";
import { isNum } from "./format.js";

const num = (value, digits = 0) => (isNum(value) ? value.toFixed(digits) : "—");

export function CountryTable() {
  const { snapshot, selectEntity, selectedEntity } = useTerminal();
  const rows = useMemo(() => {
    // Some country records lack a reactor count; fall back to operating units
    // from the unit-level data so the column is never blank for a live fleet.
    const operatingUnits = new Map();
    for (const unit of snapshot?.entities?.reactorUnits || []) {
      if (unit.status === "Operating") operatingUnits.set(unit.country, (operatingUnits.get(unit.country) || 0) + 1);
    }
    return (snapshot?.entities?.countries || [])
      .filter((c) => (c.capacityGw || 0) > 0 || c.constructionCount > 0)
      .map((c) => (c.reactors ? c : { ...c, reactors: operatingUnits.get(c.country) || null }));
  }, [snapshot]);

  const columns = [
    { id: "country", label: "Country", render: (r) => <span style={{ fontWeight: 500 }}>{r.country}</span>, sort: (r) => r.country, defaultDesc: false },
    { id: "reactors", label: "Units", align: "right", render: (r) => <span className="npt-num">{r.reactors || "—"}</span>, sort: (r) => r.reactors },
    { id: "gw", label: "GW", align: "right", render: (r) => <span className="npt-num">{num(r.capacityGw, 1)}</span>, sort: (r) => r.capacityGw },
    {
      id: "share",
      label: "Share",
      align: "right",
      render: (r) => (isNum(r.nuclearShare) ? (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span className="npt-meter" style={{ width: 44, display: "inline-block" }} aria-hidden="true"><i style={{ width: `${Math.min(100, r.nuclearShare)}%`, background: "var(--np-terminal-cyan)" }} /></span>
          <span className="npt-num">{r.nuclearShare.toFixed(0)}%</span>
        </span>
      ) : <span className="npt-subtle">—</span>),
      sort: (r) => r.nuclearShare,
    },
    { id: "building", label: "Building", align: "right", render: (r) => <span className={`npt-num ${r.constructionCount ? "npt-gold" : "npt-subtle"}`}>{r.constructionCount || "—"}</span>, sort: (r) => r.constructionCount },
    { id: "projects", label: "Projects", align: "right", render: (r) => <span className="npt-num npt-muted">{r.activeProjects || "—"}</span>, sort: (r) => r.activeProjects },
  ];

  return (
    <TerminalPanel
      panelId="terminal-panel-countries"
      title="Fleet by country"
      count={rows.length}
      subtitle="Operating capacity, nuclear share of generation, and units under construction. Click a header to sort."
      bodyStyle={{ padding: "6px 0 0" }}
    >
      <DataTable
        columns={columns}
        rows={rows}
        initialSort="gw"
        onRowClick={selectEntity}
        isSelected={(row) => selectedEntity?.id === row.id}
      />
    </TerminalPanel>
  );
}

const STATUS_TONE = { Operational: "up", Construction: "gold", Licensing: "cyan", Licensed: "cyan", Design: undefined };
const STATUS_ORDER = { Operational: 0, Construction: 1, Licensed: 2, Licensing: 3, Design: 4 };

export function ProjectTable() {
  const { snapshot, selectEntity, selectedEntity } = useTerminal();
  const [lane, setLane] = useState("advanced");
  const all = snapshot?.entities?.projectPipeline || [];
  const rows = lane === "advanced"
    ? all.filter((p) => /advanced/i.test(p.lane || ""))
    : all.filter((p) => !/advanced/i.test(p.lane || ""));

  const columns = [
    {
      id: "name",
      label: "Project",
      render: (r) => (
        <>
          <span style={{ fontWeight: 500 }}>{r.name}</span>
          <span className="npt-subline" style={{ maxWidth: 200 }}>{r.company}</span>
        </>
      ),
      sort: (r) => r.name,
      defaultDesc: false,
    },
    { id: "country", label: "Country", render: (r) => <span className="npt-muted">{r.country}</span>, sort: (r) => r.country, defaultDesc: false },
    { id: "type", label: "Design", render: (r) => <span className="npt-num npt-muted">{r.type}</span>, sort: (r) => r.type, defaultDesc: false },
    { id: "mw", label: "MW", align: "right", render: (r) => <span className="npt-num">{isNum(r.capacityMw) ? r.capacityMw.toLocaleString("en-US") : "—"}</span>, sort: (r) => r.capacityMw },
    { id: "status", label: "Stage", render: (r) => <span className="npt-chip" data-tone={STATUS_TONE[r.status]}>{r.status}</span>, sort: (r) => STATUS_ORDER[r.status] ?? 9, defaultDesc: false },
    { id: "target", label: "Target", align: "right", render: (r) => <span className="npt-num npt-muted">{r.targetYear || "—"}</span>, sort: (r) => r.targetYear, defaultDesc: false },
  ];

  return (
    <TerminalPanel
      panelId="terminal-panel-pipeline"
      title="Project pipeline"
      count={rows.length}
      subtitle="Tracked new-build projects. Advanced = SMRs and Gen-IV designs; Large = gigawatt-scale builds."
      actions={(
        <div className="npt-seg" role="group" aria-label="Pipeline lane">
          <button type="button" aria-pressed={lane === "advanced"} onClick={() => setLane("advanced")}>Advanced</button>
          <button type="button" aria-pressed={lane === "large"} onClick={() => setLane("large")}>Large</button>
        </div>
      )}
      bodyStyle={{ padding: "6px 0 0" }}
    >
      <DataTable
        columns={columns}
        rows={rows}
        initialSort="status"
        initialDesc={false}
        onRowClick={selectEntity}
        isSelected={(row) => selectedEntity?.id === row.id}
      />
    </TerminalPanel>
  );
}
