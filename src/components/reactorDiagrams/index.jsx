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
  PWR: "/reactor-schematics/PWR.webp",
  BWR: "/reactor-schematics/BWR.webp",
  PHWR: "/reactor-schematics/PWR-CANDU.webp",
  VVER: "/reactor-schematics/VVER.webp",
  SMR: "/reactor-schematics/SMR.webp",
  Other: "/reactor-schematics/Advanced.webp",
};

export default function ReactorDiagram({ type, width = 680 }) {
  const Component = DIAGRAMS[type] || DIAGRAMS.Other;
  const imageSrc = SCHEMATIC_IMAGES[type] || SCHEMATIC_IMAGES.Other;

  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      <img
        src={imageSrc}
        alt={`${type} reactor schematic`}
        width={1360}
        height={907}
        loading="lazy"
        decoding="async"
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
