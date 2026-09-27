import { useState } from "react";
import { FLUID, PartProvider, VIEW_H, VIEW_W, Ground } from "./schematic/kit.jsx";
import { SCHEMATICS } from "./schematic/layouts.jsx";
import "./schematic/schematic.css";

// Interactive flow schematic for a reactor design. Hover, focus or tap any
// component to read what it does; coolant, steam and cooling water animate
// in their direction of flow.
export default function ReactorSchematic({ type = "PWR", bare = false }) {
  const design = SCHEMATICS[type] || SCHEMATICS.Other || SCHEMATICS.PWR;
  const [active, setActive] = useState(null);
  const part = active ? design.parts[active] : null;
  const { Drawing } = design;

  return (
    <figure className={bare ? "npx npx--bare" : "npx"} onMouseLeave={() => setActive(null)}>
      <div className="npx-canvas" onClick={() => setActive(null)}>
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" aria-label={`${design.title} schematic`}>
          <PartProvider value={{ active, setActive }}>
            <Ground />
            <Drawing />
          </PartProvider>
        </svg>
      </div>
      <figcaption className="npx-caption-bar" aria-live="polite">
        <div className="npx-caption-main">
          <strong>{part ? part.label : design.title}</strong>
          <span>{part ? part.description : design.summary}</span>
        </div>
        <ul className="npx-legend" aria-label="Legend">
          {design.fluids.map((key) => (
            <li key={key}><i style={{ background: FLUID[key].color }} />{FLUID[key].label}</li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
