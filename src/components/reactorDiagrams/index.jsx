import PWRDiagram from "./PWRDiagram";
import BWRDiagram from "./BWRDiagram";
import PHWRDiagram from "./PHWRDiagram";
import VVERDiagram from "./VVERDiagram";
import SMRDiagram from "./SMRDiagram";
import OtherDiagram from "./OtherDiagram";

const DIAGRAMS = {
  PWR: PWRDiagram,
  BWR: BWRDiagram,
  PHWR: PHWRDiagram,
  VVER: VVERDiagram,
  SMR: SMRDiagram,
  Other: OtherDiagram,
};

export default function ReactorDiagram({ type, width = 680 }) {
  const Component = DIAGRAMS[type] || DIAGRAMS.Other;
  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      <Component width={width} />
    </div>
  );
}
