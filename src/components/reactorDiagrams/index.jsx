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

const SCHEMATIC_IMAGES = {
  PWR: "/reactor-schematics/PWR.png",
  BWR: "/reactor-schematics/BWR.png",
  PHWR: "/reactor-schematics/PWR%20CANDU.png",
  VVER: "/reactor-schematics/VVER.png",
  SMR: "/reactor-schematics/SMR.png",
  Other: "/reactor-schematics/Advanced.png",
};

export default function ReactorDiagram({ type, width = 680 }) {
  const Component = DIAGRAMS[type] || DIAGRAMS.Other;
  const imageSrc = SCHEMATIC_IMAGES[type] || SCHEMATIC_IMAGES.Other;

  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      <img
        src={imageSrc}
        alt={`${type} reactor schematic`}
        style={{ display: "block", width: "100%", maxWidth: width, height: "auto", margin: "0 auto", borderRadius: 8 }}
        onError={(event) => {
          event.currentTarget.style.display = "none";
          const fallback = event.currentTarget.nextElementSibling;
          if (fallback) fallback.style.display = "block";
        }}
      />
      <div style={{ display: "none" }}>
        <Component width={width} />
      </div>
    </div>
  );
}
