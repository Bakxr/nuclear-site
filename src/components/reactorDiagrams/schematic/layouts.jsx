/* eslint-disable react-refresh/only-export-components */
import {
  BalanceOfPlant,
  Capsule,
  Containment,
  ControlRods,
  Core,
  Flow,
  FLUID,
  Label,
  Part,
  PLANT_PARTS,
  Pump,
} from "./kit.jsx";

// Each design: { title, summary, fluids, parts, Drawing }.
// Coordinates are for the shared 1000×560 viewBox (kit.jsx). The reactor
// side sits inside x 40–480; the turbine hall (BalanceOfPlant) is shared.

// Main steam line from a point inside containment to the turbine inlet.
const steamToTurbine = (x, y) => `M${x} ${y} L${x} 112 L580 112 L580 215 L600 215`;
// Feedwater from the feed pump back to the reactor side at (x, y).
const feedFrom = (x, y) => `M546 392 L500 392 L500 ${y} L${x} ${y}`;

function PlantLabels({ turbine = "Turbine" }) {
  return (
    <>
      <Label x={690} y={158} anchor="middle">{turbine}</Label>
      <Label x={868} y={176} anchor="middle">Generator</Label>
      <Label x={700} y={386} anchor="middle">Condenser</Label>
      <Label x={905} y={500} anchor="middle">Cooling tower</Label>
      <Label x={560} y={430} anchor="middle">Feed pump</Label>
    </>
  );
}

// Vertical U-tube bundle inside a steam generator.
function UTubes({ x, w, top, bottom, color = FLUID.hot.color }) {
  const mid = x + w / 2;
  return [0, 1, 2].map((i) => (
    <path
      key={i}
      d={`M${x + 8 + i * 8} ${bottom} L${x + 8 + i * 8} ${top - i * 12} Q${mid} ${top - 24 - i * 12} ${x + w - 8 - i * 8} ${top - i * 12} L${x + w - 8 - i * 8} ${bottom}`}
      fill="none"
      stroke={color}
      strokeOpacity={0.9 - i * 0.2}
      strokeWidth="2.4"
    />
  ));
}

/* ─────────────────────────── PWR ─────────────────────────── */

function PWRDrawing() {
  return (
    <>
      <Containment x={40} w={440} top={70} />

      {/* Primary loop: hot leg → steam generator → pump → cold leg */}
      <Part id="hotleg">
        <Flow d="M220 280 L310 280 L310 418 L345 418" fluid="hot" />
      </Part>
      <Part id="rcp">
        <Flow d="M405 426 L405 452 L294 452" fluid="cold" />
        <Flow d="M266 452 L240 452 L240 305 L220 305" fluid="cold" />
        <Pump cx={280} cy={452} />
      </Part>

      <Part id="vessel">
        <Capsule x={140} y={205} w={80} h={220} />
        <rect x={146} y={250} width={68} height={165} rx="30" fill={FLUID.cold.color} opacity="0.14" />
      </Part>
      <Part id="core">
        <Core x={152} y={322} w={56} h={82} />
      </Part>
      <Part id="rods">
        <ControlRods x={152} y={172} w={56} length={34} count={4} />
        <ControlRods x={152} y={256} w={56} length={70} count={4} />
      </Part>

      <Part id="pressurizer">
        <Flow d="M262 244 L262 280" fluid="hot" width={4} />
        <Capsule x={246} y={150} w={32} h={96} />
        <rect x={250} y={196} width={24} height={44} rx="10" fill={FLUID.hot.color} opacity="0.35" />
      </Part>

      <Part id="sg">
        <Capsule x={335} y={128} w={80} h={306} />
        <UTubes x={335} w={80} top={250} bottom={410} />
        <rect x={343} y={140} width={64} height={46} rx="18" fill={FLUID.steam.color} opacity="0.22" />
      </Part>

      <Part id="steamline">
        <Flow d={steamToTurbine(375, 130)} fluid="steam" />
      </Part>
      <Part id="feedpump">
        <Flow d={feedFrom(415, 262)} fluid="feed" />
      </Part>

      <BalanceOfPlant />

      <Label x={132} y={176} tx={160} ty={190} anchor="end">Control rods</Label>
      <Label x={132} y={236} tx={142} ty={250} anchor="end">Reactor vessel</Label>
      <Label x={132} y={372} tx={152} ty={372} anchor="end">Fuel core</Label>
      <Label x={262} y={134} anchor="middle">Pressurizer</Label>
      <Label x={268} y={266}>Hot leg</Label>
      <Label x={422} y={200} tx={413} ty={214}>Steam generator</Label>
      <Label x={280} y={506} tx={280} ty={468} anchor="middle">Reactor coolant pump</Label>
      <PlantLabels />
    </>
  );
}

const PWR = {
  title: "Pressurized water reactor",
  summary: "Two separate water loops. Water in the primary loop is kept at ~155 bar so it never boils; it carries core heat to steam generators, which boil water in a second, non-radioactive loop that drives the turbine.",
  fluids: ["hot", "cold", "steam", "feed", "cooling"],
  Drawing: PWRDrawing,
  parts: {
    ...PLANT_PARTS,
    vessel: { label: "Reactor pressure vessel", description: "A ~20 cm thick steel vessel holding the core under about 155 bar — enough pressure to keep 320 °C water from boiling." },
    core: { label: "Fuel core", description: "Around 190 fuel assemblies of uranium-oxide pellets (3–5% enriched). Fission heat passes into the water flowing up between the rods." },
    rods: { label: "Control rods", description: "Neutron-absorbing rods driven from above the vessel head. Inserting them slows the chain reaction; dropping them in fully shuts the reactor down in seconds." },
    pressurizer: { label: "Pressurizer", description: "A tall tank with a steam bubble on top and electric heaters below. Heating or spraying it holds the whole primary loop at ~155 bar." },
    sg: { label: "Steam generator", description: "Primary water flows through thousands of U-shaped tubes; heat passes through the tube walls and boils the separate secondary water around them." },
    hotleg: { label: "Hot leg", description: "Carries ~320 °C primary coolant from the reactor vessel to the steam generator." },
    rcp: { label: "Reactor coolant pump", description: "Pumps the cooled primary water (~290 °C) back into the vessel — each pump moves roughly 20 m³ of water per second." },
    steamline: { label: "Main steam line", description: "Carries steam from the steam generators out of containment to the turbine. This steam never touched the core." },
  },
};

/* ─────────────────────────── BWR ─────────────────────────── */

function BWRDrawing() {
  return (
    <>
      <Containment x={40} w={440} top={70} />

      <Part id="recirc">
        <Flow d="M172 372 L112 372 L112 432 L172 432" fluid="water" width={6} />
        <Pump cx={112} cy={402} r={13} />
      </Part>

      <Part id="vessel">
        <Capsule x={172} y={150} w={96} h={296} />
        <rect x={179} y={262} width={82} height={176} rx="34" fill={FLUID.water.color} opacity="0.14" />
        <path d="M180 262 L260 262" stroke={FLUID.water.color} strokeOpacity="0.6" strokeWidth="1.5" strokeDasharray="4 4" />
        {[[196, 300], [212, 286], [230, 306], [246, 292], [204, 318], [238, 322], [222, 276]].map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3" fill="none" stroke={FLUID.steam.color} strokeOpacity="0.7" />
        ))}
      </Part>
      <Part id="separators">
        <rect x={184} y={176} width={72} height={70} rx="10" fill={FLUID.steam.color} opacity="0.18" />
        {[196, 212, 228, 244].map((x) => (
          <rect key={x} x={x - 4} y={206} width="8" height="36" rx="2" className="npx-rod" opacity="0.5" />
        ))}
      </Part>
      <Part id="core">
        <Core x={188} y={336} w={64} h={78} rods={8} />
      </Part>
      <Part id="rods">
        <ControlRods x={188} y={396} w={64} length={46} count={4} />
        <ControlRods x={188} y={446} w={64} length={20} count={4} />
      </Part>

      <Part id="steamline">
        <Flow d={steamToTurbine(220, 152)} fluid="steam" />
      </Part>
      <Part id="feedpump">
        <Flow d={feedFrom(268, 300)} fluid="feed" />
      </Part>

      <BalanceOfPlant />

      <Label x={300} y={210} tx={256} ty={214}>Steam separators</Label>
      <Label x={300} y={226}>&amp; dryers</Label>
      <Label x={300} y={266} tx={262} ty={262} sub="boiling in the core">Water level</Label>
      <Label x={300} y={372} tx={252} ty={372}>Fuel core</Label>
      <Label x={300} y={440} tx={252} ty={430} sub="enter from below">Control rods</Label>
      <Label x={112} y={338} anchor="middle">Recirculation</Label>
      <Label x={112} y={354} anchor="middle">pump</Label>
      <PlantLabels turbine="Turbine (shielded)" />
    </>
  );
}

const BWR = {
  title: "Boiling water reactor",
  summary: "A single loop: water boils directly in the core at ~70 bar, and the steam goes straight to the turbine. Simpler than a PWR — no steam generators or pressurizer — but the turbine hall handles slightly radioactive steam.",
  fluids: ["water", "steam", "feed", "cooling"],
  Drawing: BWRDrawing,
  parts: {
    ...PLANT_PARTS,
    vessel: { label: "Reactor pressure vessel", description: "Taller than a PWR vessel because steam separation happens inside it. Runs at about 70 bar and 285 °C." },
    separators: { label: "Steam separators & dryers", description: "Swirl-vane separators and chevron dryers strip water droplets from the steam so only dry steam reaches the turbine." },
    core: { label: "Fuel core", description: "Several hundred fuel assemblies. Water boils as it rises through the core — about 15% of the flow leaves as steam." },
    rods: { label: "Control rods", description: "Cruciform blades inserted hydraulically from below the core, because the top of the vessel is full of steam-separation equipment." },
    recirc: { label: "Recirculation pumps", description: "Drive water through jet pumps around the core. Changing their speed changes the steam void fraction — the main way a BWR adjusts power." },
    steamline: { label: "Main steam line", description: "Carries steam straight from the vessel to the turbine. It contains short-lived N-16, so the turbine hall is shielded while running." },
    turbine: { label: "Turbine (shielded)", description: "Driven directly by reactor steam. Radiation from N-16 decays within seconds of shutdown, but the turbine building is shielded during operation." },
  },
};

/* ─────────────────────── PHWR (CANDU) ─────────────────────── */

function PHWRDrawing() {
  return (
    <>
      <Containment x={40} w={440} top={70} />

      {/* Primary heat transport (heavy water): calandria → SG → pump → calandria */}
      <Part id="hotleg">
        <Flow d="M314 330 L346 330 L346 364 L380 364" fluid="hot" />
      </Part>
      <Part id="pumps">
        <Flow d="M430 372 L430 452 L314 452" fluid="cold" />
        <Flow d="M286 452 L84 452 L84 330 L106 330" fluid="cold" />
        <Pump cx={300} cy={452} />
      </Part>

      <Part id="calandria">
        <rect x={106} y={296} width={208} height={100} rx="46" className="npx-shell" />
        <rect x={112} y={302} width={196} height={88} rx="42" fill={FLUID.heavy.color} opacity="0.16" />
      </Part>
      <Part id="channels">
        {[316, 332, 348, 364, 380].map((y) => (
          <g key={y}>
            <rect x={116} y={y - 3} width={188} height={6} rx="3" fill="#ffb04a" opacity="0.9" />
            <rect x={116} y={y - 5} width={188} height={10} rx="5" fill="#ffb04a" opacity="0.12" className="npx-core-glow" />
          </g>
        ))}
      </Part>
      <Part id="moderator">
        <Flow d="M190 396 L190 420 L230 420 L230 396" fluid="heavy" width={4} speed={0.6} />
        <rect x={180} y={414} width={60} height={16} rx="4" className="npx-machine" />
      </Part>
      <Part id="fuelling">
        <rect x={58} y={338} width={26} height={30} rx="4" className="npx-machine" />
        <rect x={326} y={292} width={26} height={30} rx="4" className="npx-machine" />
      </Part>
      <Part id="rods">
        <ControlRods x={150} y={232} w={120} length={78} count={3} />
      </Part>

      <Part id="sg">
        <Capsule x={370} y={128} w={70} h={252} />
        <UTubes x={370} w={70} top={236} bottom={362} />
        <rect x={378} y={140} width={54} height={40} rx="16" fill={FLUID.steam.color} opacity="0.22" />
      </Part>
      <Part id="steamline">
        <Flow d={steamToTurbine(405, 130)} fluid="steam" />
      </Part>
      <Part id="feedpump">
        <Flow d={feedFrom(440, 262)} fluid="feed" />
      </Part>

      <BalanceOfPlant />

      <Label x={210} y={284} anchor="middle">Calandria</Label>
      <Label x={150} y={222} tx={170} ty={240} anchor="end">Shutoff rods</Label>
      <Label x={246} y={424} tx={240} ty={422} sub="heavy water, ~70 °C">Moderator cooler</Label>
      <Label x={96} y={296} tx={70} ty={338} anchor="end">Fuelling</Label>
      <Label x={96} y={312} anchor="end">machines</Label>
      <Label x={448} y={196} tx={440} ty={206}>Steam generator</Label>
      <Label x={300} y={506} tx={300} ty={468} anchor="middle">Heat transport pump</Label>
      <PlantLabels />
    </>
  );
}

const PHWR = {
  title: "Pressurized heavy water reactor (CANDU)",
  summary: "Heavy water (D₂O) moderates the neutrons so well that natural, unenriched uranium can be used. Fuel sits in hundreds of horizontal pressure tubes, and the reactor is refuelled while running.",
  fluids: ["hot", "cold", "heavy", "steam", "feed", "cooling"],
  Drawing: PHWRDrawing,
  parts: {
    ...PLANT_PARTS,
    calandria: { label: "Calandria", description: "A large horizontal tank of cool, low-pressure heavy water pierced by ~380–480 fuel channels. Unlike a PWR, there's no single thick pressure vessel." },
    channels: { label: "Fuel channels (pressure tubes)", description: "Each tube holds 12–13 short fuel bundles of natural uranium, with pressurized heavy-water coolant flowing past them at ~300 °C." },
    moderator: { label: "Moderator system", description: "The calandria's heavy water is kept separate and cool (~70 °C) by its own pumps and heat exchangers; it slows neutrons so fission can continue in natural uranium." },
    fuelling: { label: "Fuelling machines", description: "Robotic machines lock onto both ends of a channel and push fresh bundles in while the reactor runs — CANDUs don't need refuelling outages." },
    rods: { label: "Shutoff rods", description: "Neutron-absorbing rods drop vertically into the calandria. A second, independent shutdown system injects gadolinium poison into the moderator." },
    hotleg: { label: "Primary heat transport", description: "Hot heavy-water coolant collects from the channel outlets through feeder pipes and headers and flows to the steam generators." },
    pumps: { label: "Heat transport pumps", description: "Circulate the heavy-water coolant back through the inlet headers and into the fuel channels." },
    sg: { label: "Steam generator", description: "Heavy-water coolant in the tubes boils ordinary light water on the other side, which drives the turbine." },
    steamline: { label: "Main steam line", description: "Carries steam out of containment to the turbine; it's ordinary water that never contacted the fuel." },
  },
};

/* ─────────────────────────── VVER ─────────────────────────── */

function VVERDrawing() {
  return (
    <>
      <Containment x={40} w={440} top={70} label="Double containment" />

      <Part id="hotleg">
        <Flow d="M220 280 L282 280 L282 318 L302 318" fluid="hot" />
      </Part>
      <Part id="rcp">
        <Flow d="M446 358 L446 452 L354 452" fluid="cold" />
        <Flow d="M326 452 L240 452 L240 305 L220 305" fluid="cold" />
        <Pump cx={340} cy={452} />
      </Part>

      <Part id="vessel">
        <Capsule x={140} y={205} w={80} h={220} />
        <rect x={146} y={250} width={68} height={165} rx="30" fill={FLUID.cold.color} opacity="0.14" />
      </Part>
      <Part id="core">
        <Core x={152} y={322} w={56} h={82} />
      </Part>
      <Part id="rods">
        <ControlRods x={152} y={172} w={56} length={34} count={4} />
        <ControlRods x={152} y={256} w={56} length={70} count={4} />
      </Part>
      <Part id="pressurizer">
        <Flow d="M262 244 L262 280" fluid="hot" width={4} />
        <Capsule x={246} y={150} w={32} h={96} />
        <rect x={250} y={196} width={24} height={44} rx="10" fill={FLUID.hot.color} opacity="0.35" />
      </Part>

      <Part id="sg">
        <rect x={300} y={292} width={160} height={70} rx="35" className="npx-shell" />
        {[308, 318, 328, 338, 348].map((y, i) => (
          <path key={y} d={`M${316 + i * 2} ${y} L${444 - i * 2} ${y}`} stroke={FLUID.hot.color} strokeOpacity={0.85 - i * 0.12} strokeWidth="2.2" />
        ))}
        <rect x={340} y={294} width={80} height={10} rx="5" fill={FLUID.steam.color} opacity="0.3" />
      </Part>
      <Part id="steamline">
        <Flow d={steamToTurbine(390, 292)} fluid="steam" />
      </Part>
      <Part id="feedpump">
        <Flow d={feedFrom(460, 342)} fluid="feed" />
      </Part>

      <Part id="corecatcher">
        <path d="M150 440 L210 440 L200 462 L160 462 Z" className="npx-machine" />
      </Part>

      <BalanceOfPlant />

      <Label x={132} y={176} tx={160} ty={190} anchor="end">Control rods</Label>
      <Label x={132} y={236} tx={142} ty={250} anchor="end">Reactor vessel</Label>
      <Label x={132} y={372} tx={152} ty={372} anchor="end">Fuel core</Label>
      <Label x={262} y={134} anchor="middle">Pressurizer</Label>
      <Label x={372} y={384} anchor="middle">Horizontal</Label>
      <Label x={372} y={400} anchor="middle">steam generator</Label>
      <Label x={212} y={512} tx={184} ty={462}>Core catcher</Label>
      <Label x={340} y={506} tx={340} ty={468} anchor="middle">Main coolant pump</Label>
      <PlantLabels />
    </>
  );
}

const VVER = {
  title: "VVER (Russian pressurized water reactor)",
  summary: "The Soviet/Russian PWR family. The physics matches a Western PWR, but VVERs use hexagonal fuel assemblies and distinctive horizontal steam generators; modern VVER-1200s add a core catcher and double containment.",
  fluids: ["hot", "cold", "steam", "feed", "cooling"],
  Drawing: VVERDrawing,
  parts: {
    ...PLANT_PARTS,
    containment: { label: "Double containment", description: "VVER-1200 units have an inner pre-stressed concrete containment and an outer shell designed against external hazards such as aircraft impact." },
    vessel: { label: "Reactor pressure vessel", description: "Forged steel vessel operating at ~160 bar. VVER vessels are slimmer so they can be shipped by rail." },
    core: { label: "Fuel core", description: "163 hexagonal fuel assemblies — a hallmark of VVER designs, versus the square assemblies of Western PWRs." },
    rods: { label: "Control rods", description: "Absorber clusters driven from above the head adjust power and shut the reactor down." },
    pressurizer: { label: "Pressurizer", description: "Maintains primary-loop pressure with heaters and spray, as in any PWR." },
    sg: { label: "Horizontal steam generator", description: "VVERs lay their steam generators on their side. The large water inventory and easy tube inspection are cited as safety advantages." },
    hotleg: { label: "Hot leg", description: "Carries ~320 °C coolant from the vessel to the horizontal steam generator." },
    rcp: { label: "Main coolant pump", description: "Returns cooled primary water to the reactor vessel; a VVER-1200 has four loops, each with its own pump." },
    corecatcher: { label: "Core catcher", description: "A crucible below the vessel designed to capture and cool molten core material in a severe accident, keeping it inside containment." },
    steamline: { label: "Main steam line", description: "Carries secondary steam to the turbine; it never touched the core." },
  },
};

/* ─────────────────────── SMR (integral PWR) ─────────────────────── */

function SMRDrawing() {
  // Module is centred at x ≈ 310 to leave room for left-hand labels.
  const mx = 272;
  return (
    <>
      <Part id="pool">
        <path d="M60 470 L60 170 L470 170 L470 470" fill="none" className="npx-containment" />
        <rect x={80} y={214} width={370} height={250} rx="6" className="npx-pool" />
        <text x={74} y={492} className="npx-caption">REACTOR BUILDING · BELOW-GRADE POOL</text>
      </Part>

      <Part id="cnv">
        <Capsule x={mx - 16} y={136} w={108} h={320} className="npx-shell" />
      </Part>
      <Part id="module">
        <Capsule x={mx} y={150} w={76} h={292} />
      </Part>
      <Part id="pressurizer">
        <rect x={mx + 10} y={162} width={56} height={34} rx="14" fill={FLUID.hot.color} opacity="0.3" />
      </Part>
      <Part id="riser">
        <Flow d={`M${mx + 38} 380 L${mx + 38} 214`} fluid="hot" width={6} speed={0.6} />
        <Flow d={`M${mx + 20} 222 L${mx + 20} 372`} fluid="cold" width={4} speed={0.6} />
        <Flow d={`M${mx + 56} 222 L${mx + 56} 372`} fluid="cold" width={4} speed={0.6} />
      </Part>
      <Part id="hcsg">
        {[236, 250, 264, 278, 292, 306].map((y) => (
          <g key={y}>
            <path d={`M${mx + 10} ${y} L${mx + 28} ${y + 7}`} stroke={FLUID.feed.color} strokeWidth="2.2" strokeOpacity="0.9" />
            <path d={`M${mx + 48} ${y + 7} L${mx + 66} ${y}`} stroke={FLUID.feed.color} strokeWidth="2.2" strokeOpacity="0.9" />
          </g>
        ))}
      </Part>
      <Part id="core">
        <Core x={mx + 16} y={382} w={44} h={48} rods={5} />
      </Part>

      <Part id="steamline">
        <Flow d={steamToTurbine(mx + 38, 138)} fluid="steam" />
      </Part>
      <Part id="feedpump">
        <Flow d={feedFrom(mx + 92, 300)} fluid="feed" />
      </Part>

      <BalanceOfPlant />

      <Label x={mx - 30} y={182} tx={mx + 10} ty={178} anchor="end">Integral pressurizer</Label>
      <Label x={mx - 30} y={258} tx={mx + 10} ty={262} anchor="end">Helical-coil</Label>
      <Label x={mx - 30} y={274} anchor="end">steam generator</Label>
      <Label x={mx - 30} y={330} tx={mx + 20} ty={330} anchor="end" sub="natural circulation">Riser</Label>
      <Label x={mx - 30} y={410} tx={mx + 16} ty={406} anchor="end">Fuel core</Label>
      <Label x={mx + 104} y={206} tx={mx + 92} ty={216}>Containment</Label>
      <Label x={mx + 104} y={222}>vessel</Label>
      <Label x={400} y={440} anchor="middle" sub="passive heat sink">Reactor pool</Label>
      <PlantLabels />
    </>
  );
}

const SMR = {
  title: "Small modular reactor (integral PWR)",
  summary: "The whole primary system — core, steam generator and pressurizer — sits in one factory-built vessel. Designs like NuScale's need no primary pumps: hot water rises, cools, and sinks on its own, and the module sits in a pool that can absorb decay heat without power.",
  fluids: ["hot", "cold", "steam", "feed", "cooling"],
  Drawing: SMRDrawing,
  parts: {
    ...PLANT_PARTS,
    module: { label: "Reactor module", description: "A single vessel (about 20 m tall for NuScale) built in a factory and shipped by truck, rail or barge; several modules can share one plant." },
    core: { label: "Fuel core", description: "A small core of standard PWR-type fuel, shorter than a large reactor's, producing ~250 MW of heat per module." },
    riser: { label: "Riser & natural circulation", description: "Heated water rises through the central riser, gives up heat at the steam generator, and sinks down the outer annulus — no reactor coolant pumps required." },
    hcsg: { label: "Helical-coil steam generator", description: "Feedwater flows inside coiled tubes wrapped around the riser and boils into steam, all within the reactor vessel." },
    pressurizer: { label: "Integral pressurizer", description: "The top of the vessel doubles as the pressurizer, removing large-bore piping and the break scenarios that come with it." },
    cnv: { label: "Containment vessel", description: "A compact steel containment around each module replaces the large concrete dome; it's partly evacuated to insulate the module in normal operation." },
    pool: { label: "Reactor pool", description: "Modules sit below grade in a large pool that can remove decay heat passively for extended periods without pumps, power or operator action." },
    steamline: { label: "Main steam line", description: "Carries steam from the module's steam generator to the turbine." },
  },
};

/* ─────────────────── Other → HTGR (pebble bed) ─────────────────── */

function HTGRDrawing() {
  const vx = 150; // reactor vessel left edge
  const pebbles = [];
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      pebbles.push([vx + 22 + col * 13 + (row % 2) * 6, 246 + row * 20]);
    }
  }
  return (
    <>
      <Part id="building">
        <path d="M40 470 L40 124 L474 124 L474 470" fill="none" className="npx-containment" />
        <text x={54} y={492} className="npx-caption">REACTOR BUILDING (CONFINEMENT)</text>
      </Part>

      <Part id="duct">
        <rect x={vx + 92} y={292} width={334 - vx - 92} height={26} rx="6" className="npx-machine" />
        <Flow d={`M${vx + 92} 300 L334 300`} fluid="helium" width={5} />
        <Flow d={`M334 312 L${vx + 92} 312`} fluid="heliumCold" width={4} />
      </Part>

      <Part id="vessel">
        <Capsule x={vx} y={160} w={96} h={292} />
        <rect x={vx + 8} y={232} width={80} height={150} rx="6" fill="#2b2016" opacity="0.08" stroke="var(--np-text)" strokeOpacity="0.2" />
      </Part>
      <Part id="pebbles">
        {pebbles.map(([cx, cy]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="6" fill="#ffb04a" fillOpacity="0.85" stroke="#ffcf87" strokeOpacity="0.6" />
        ))}
        <rect x={vx + 12} y={236} width={72} height={142} rx="6" fill="#ffb04a" opacity="0.12" className="npx-core-glow" />
      </Part>
      <Part id="rods">
        <ControlRods x={vx + 4} y={196} w={88} length={60} count={2} />
      </Part>

      <Part id="sg">
        <Capsule x={334} y={168} w={76} h={284} />
        {[210, 236, 262, 288, 340, 366, 392].map((y) => (
          <path key={y} d={`M346 ${y} Q372 ${y + 10} 398 ${y}`} fill="none" stroke={FLUID.feed.color} strokeWidth="2.2" strokeOpacity="0.9" />
        ))}
      </Part>
      <Part id="circulator">
        <Pump cx={372} cy={150} r={13} />
      </Part>

      <Part id="steamline">
        <Flow d="M410 214 L560 214 L560 215 L600 215" fluid="steam" />
      </Part>
      <Part id="feedpump">
        <Flow d={feedFrom(410, 400)} fluid="feed" />
      </Part>

      <BalanceOfPlant />

      <Label x={vx - 10} y={204} tx={vx + 26} ty={206} anchor="end">Control rods</Label>
      <Label x={vx - 10} y={296} tx={vx + 20} ty={300} anchor="end">Pebble-bed</Label>
      <Label x={vx - 10} y={312} anchor="end">core</Label>
      <Label x={vx - 10} y={420} tx={vx + 10} ty={420} anchor="end">Graphite</Label>
      <Label x={vx - 10} y={436} anchor="end">reflector</Label>
      <Label x={290} y={282} anchor="middle">Hot gas duct</Label>
      <Label x={352} y={146} tx={359} ty={150} anchor="end">Helium circulator</Label>
      <Label x={290} y={366} tx={334} ty={372} anchor="middle">Steam</Label>
      <Label x={290} y={382} anchor="middle">generator</Label>
      <PlantLabels />
    </>
  );
}

const Other = {
  title: "High-temperature gas-cooled reactor (pebble bed)",
  summary: "“Other” covers gas-cooled (AGR, HTGR), fast-breeder and molten-salt designs. Shown here is a pebble-bed HTGR like China's HTR-PM or X-energy's Xe-100: helium carries heat at 750 °C, hot enough for industrial process heat as well as power.",
  fluids: ["helium", "heliumCold", "steam", "feed", "cooling"],
  Drawing: HTGRDrawing,
  parts: {
    ...PLANT_PARTS,
    building: { label: "Reactor building", description: "HTGRs rely on the fuel itself to retain fission products, so they use a vented confinement building rather than a large pressure-retaining dome." },
    vessel: { label: "Reactor pressure vessel", description: "A steel vessel lined with graphite blocks that reflect neutrons back into the core and form the core cavity." },
    pebbles: { label: "Pebble-bed core", description: "Hundreds of thousands of tennis-ball-sized graphite pebbles, each holding thousands of TRISO fuel particles, cycle slowly through the core while it runs." },
    rods: { label: "Control rods", description: "Absorber rods move in channels in the graphite side reflector; a separate small-absorber-sphere system provides backup shutdown." },
    duct: { label: "Hot gas duct", description: "A coaxial duct: 750 °C helium flows out through the inner pipe while cooler ~250 °C return helium flows back around it." },
    sg: { label: "Steam generator", description: "Helium flows over helical tubes, boiling water inside them into high-temperature steam." },
    circulator: { label: "Helium circulator", description: "An electrically driven blower on top of the steam generator that keeps helium moving around the loop." },
    steamline: { label: "Main steam line", description: "Carries ~565 °C steam to the turbine — hotter than light-water reactors, for higher efficiency." },
  },
};

export const SCHEMATICS = { PWR, BWR, PHWR, VVER, SMR, Other };
