import ReactorSchematic from "./ReactorSchematic.jsx";

// Reactor schematic by design type (PWR, BWR, PHWR, VVER, SMR, Other).
// Interactive SVG — see ReactorSchematic.jsx and schematic/layouts.jsx.
export default function ReactorDiagram({ type, bare = false }) {
  return <ReactorSchematic type={type} bare={bare} />;
}
