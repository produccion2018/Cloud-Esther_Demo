import * as THREE from "three";

export type ToothType = "central" | "lateral" | "canine" | "premolar1" | "premolar2" | "molar1" | "molar2";

// Mesiodistal width, buccolingual depth, crown height, root length (mm)
const DIMS: Record<"upper" | "lower", Record<ToothType, [number, number, number, number]>> = {
  upper: {
    central: [8.6, 7.0, 10.5, 13],
    lateral: [6.6, 6.0, 9.0, 13],
    canine: [7.6, 8.0, 10.0, 17],
    premolar1: [7.0, 9.0, 8.5, 14],
    premolar2: [6.6, 9.0, 7.8, 14],
    molar1: [10.2, 11.0, 7.5, 12],
    molar2: [9.2, 11.0, 7.0, 11],
  },
  lower: {
    central: [5.2, 5.8, 9.0, 12],
    lateral: [5.8, 6.2, 9.5, 13],
    canine: [7.0, 7.6, 10.5, 15],
    premolar1: [7.0, 7.8, 8.5, 14],
    premolar2: [7.1, 8.2, 8.0, 14],
    molar1: [11.2, 10.4, 7.5, 13],
    molar2: [10.5, 10.0, 7.0, 12],
  },
};

export const ORDER: ToothType[] = ["central", "lateral", "canine", "premolar1", "premolar2", "molar1", "molar2"];

export const TYPE_LABEL: Record<ToothType, string> = {
  central: "Incisivo central",
  lateral: "Incisivo lateral",
  canine: "Canino",
  premolar1: "Primer premolar",
  premolar2: "Segundo premolar",
  molar1: "Primer molar",
  molar2: "Segundo molar",
};

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const gauss = (x: number, s: number) => Math.exp(-(x * x) / (s * s));

// Cheap deterministic noise
function hash(n: number) {
  const s = Math.sin(n) * 43758.5453;
  return s - Math.floor(s);
}
function noise3(x: number, y: number, z: number) {
  return (
    Math.sin(x * 1.7 + y * 2.3) * 0.5 +
    Math.sin(y * 3.1 - z * 1.3) * 0.3 +
    Math.sin(z * 2.7 + x * 1.1) * 0.2
  );
}

/**
 * Build a tooth in local space: crown points to +Y, cervical line at y=0,
 * X = mesiodistal, Z = buccal (+) / lingual (-).
 */
export function buildToothGeometry(type: ToothType, jaw: "upper" | "lower", seed: number) {
  const [w, d, ch, rl] = DIMS[jaw][type];
  const geo = new THREE.SphereGeometry(1, 72, 72);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const colors: number[] = [];
  const v = new THREE.Vector3();
  const isIncisor = type === "central" || type === "lateral";
  const isMolar = type === "molar1" || type === "molar2";
  const isPremolar = type === "premolar1" || type === "premolar2";

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const h = (v.y + 1) / 2; // 0 apex -> 1 occlusal
    const rlen = Math.hypot(v.x, v.z) || 1e-6;
    const nx = v.x / rlen;
    const nz = v.z / rlen;
    const ring = Math.sqrt(Math.max(0, 1 - v.y * v.y)); // natural closure

    let y: number;
    let rx: number;
    let rz: number;
    const C = 0.42; // cervical in h-space
    if (h < C) {
      // root: taper to apex
      const t = h / C;
      y = -rl * 0.55 * (1 - t);
      const taper = Math.pow(t, 0.55) * 0.62 + 0.04;
      rx = (w / 2) * taper * (isMolar ? 1.0 : 0.82);
      rz = (d / 2) * taper * 0.9;
    } else {
      const t = (h - C) / (1 - C); // 0 cervical -> 1 occlusal
      y = ch * Math.min(1, t * 1.05);
      // crown bulge: narrow at neck, widest near contact area
      const bulge = 0.66 + 0.34 * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.62);
      rx = (w / 2) * bulge;
      rz = (d / 2) * (0.78 + 0.22 * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.55));
      if (isIncisor) {
        // shovel / chisel: thin toward incisal edge, labial convex
        rz *= 1 - 0.68 * smooth(0.25, 1, t);
        rx *= 1 + 0.08 * smooth(0.4, 1, t);
      }
      if (type === "canine") {
        rz *= 1 - 0.45 * smooth(0.4, 1, t);
      }
      // closure of the dome near the top
      const close = Math.min(1, ring * 1.8);
      rx *= close;
      rz *= close;
    }

    let px = nx * rx;
    let pz = nz * rz;

    // Labial face flatter, lingual more concave
    if (h >= C && nz > 0) pz *= 0.94 + 0.06 * Math.abs(nx);

    if (h > C) {
      const t = (h - C) / (1 - C);
      const top = smooth(0.7, 1, t);
      if (isIncisor) {
        // straight incisal edge + mamelons
        y = Math.min(y, ch);
        y -= top * 0.25 * (1 - Math.abs(Math.cos(px * 2.2)));
        // lingual fossa
        if (nz < 0) pz += 0.5 * smooth(0.3, 0.8, t) * gauss(px / (w / 2), 0.6);
      } else if (type === "canine") {
        const cusp = 1 - Math.abs(px) / (w / 2);
        y += top * cusp * 1.8;
        y = Math.min(y, ch + 1.6 - Math.abs(px) * 0.55);
      } else {
        // occlusal table with cusps
        const ox = px / (w / 2);
        const oz = pz / (d / 2);
        let cusps = 0;
        if (isPremolar) {
          cusps = 1.6 * gauss(ox, 0.6) * gauss(oz - 0.45, 0.45) + 1.1 * gauss(ox, 0.6) * gauss(oz + 0.45, 0.45);
        } else {
          const pts = [
            [-0.45, 0.45, 1.3],
            [0.45, 0.45, 1.2],
            [-0.45, -0.45, 1.4],
            [0.45, -0.45, 1.1],
            [0.0, 0.7, type === "molar1" ? 0.5 : 0],
          ];
          for (const [cx = 0, cz = 0, a = 0] of pts) cusps += a * gauss(ox - cx, 0.42) * gauss(oz - cz, 0.42);
          // central fissure
          cusps -= 0.5 * gauss(oz, 0.12) * (1 - Math.abs(ox));
        }
        const flatTop = ch - 1.2;
        if (y > flatTop) y = flatTop + (y - flatTop) * 0.35;
        y += top * cusps;
      }
      // subtle surface perikymata / wear
      const n = noise3(px * 3 + seed, y * 3, pz * 3) * 0.025;
      px += nx * n;
      pz += nz * n;
    }

    pos.setXYZ(i, px, y, pz);

    // vertex color: dentin-yellow cervical -> translucent bluish incisal
    const t = Math.max(0, (y) / (ch + 1));
    const base = new THREE.Color("#e9dcc0");
    const mid = new THREE.Color("#f3ecdc");
    const tip = new THREE.Color("#dfe4e6");
    const c = y < 0 ? new THREE.Color("#d8c39a") : base.clone().lerp(mid, smooth(0, 0.6, t));
    if (isIncisor || type === "canine") c.lerp(tip, smooth(0.75, 1, t) * 0.7);
    const j = (hash(i + seed * 13.1) - 0.5) * 0.025;
    colors.push(c.r + j, c.g + j, c.b + j * 0.5);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  return { geo, w, d, ch };
}

export interface PlacedTooth {
  id: number; // FDI
  type: ToothType;
  jaw: "upper" | "lower";
  side: "right" | "left";
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
  w: number;
  d: number;
  ch: number;
  u: number; // arc param
}

export interface Arch {
  jaw: "upper" | "lower";
  curve: THREE.CatmullRomCurve3;
  teeth: PlacedTooth[];
  contacts: number[]; // arc params of interproximal points
}

function archCurve(jaw: "upper" | "lower", targetLen: number) {
  const base =
    jaw === "upper"
      ? [
          [-24, -24], [-23.5, -12], [-21, -1], [-16, 8], [-8.5, 14.2], [0, 16],
        ]
      : [
          [-22, -24], [-21.5, -12], [-19.2, -1.5], [-14.5, 6.5], [-7.5, 11.6], [0, 13],
        ];
  const pts = [...base, ...base.slice(0, -1).reverse().map(([x = 0, z = 0]) => [-x, z])].map(
    ([x = 0, z = 0]) => new THREE.Vector3(x, 0, z),
  );
  let curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
  const s = targetLen / curve.getLength();
  curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p.x * s, 0, (p.z - 16) * s + 16)), false, "centripetal");
  return curve;
}

export function buildArch(jaw: "upper" | "lower"): Arch {
  const widths = ORDER.map((t) => DIMS[jaw][t][0] * 0.97);
  const half = widths.reduce((a, b) => a + b, 0);
  const total = half * 2;
  const margin = 2.5;
  const curve = archCurve(jaw, total + margin * 2);
  const L = curve.getLength();
  const teeth: PlacedTooth[] = [];
  const contacts: number[] = [];
  const sequence: { type: ToothType; side: "right" | "left"; idx: number }[] = [];
  // patient right is viewer's left (-x)
  for (let i = ORDER.length - 1; i >= 0; i--) sequence.push({ type: ORDER[i]!, side: "right", idx: i });
  for (let i = 0; i < ORDER.length; i++) sequence.push({ type: ORDER[i]!, side: "left", idx: i });

  let acc = margin;
  contacts.push(acc / L);
  sequence.forEach(({ type, side, idx }) => {
    const wd = widths[idx]!;
    const u = (acc + wd / 2) / L;
    acc += wd;
    contacts.push(acc / L);
    const p = curve.getPointAt(u);
    const tan = curve.getTangentAt(u).normalize();
    const out = new THREE.Vector3(tan.z, 0, -tan.x).normalize(); // outward (buccal)
    if (out.z < 0 && Math.abs(p.x) < 5) out.negate();
    const center = new THREE.Vector3(0, 0, -6);
    if (out.dot(p.clone().sub(center)) < 0) out.negate();

    const up = new THREE.Vector3(0, jaw === "upper" ? -1 : 1, 0);
    const xAxis = tan.clone();
    const zAxis = out.clone();
    const yAxis = up.clone();
    // ensure right-handed
    if (new THREE.Vector3().crossVectors(xAxis, yAxis).dot(zAxis) < 0) xAxis.negate();
    const m = new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis);
    const q = new THREE.Quaternion().setFromRotationMatrix(m);
    // inclinations: incisors labially proclined, molars slightly lingual
    const incl = { central: 0.32, lateral: 0.28, canine: 0.18, premolar1: 0.06, premolar2: 0.02, molar1: -0.06, molar2: -0.1 }[type];
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), incl * (jaw === "upper" ? -1 : 0.6));
    q.multiply(tilt);

    const quad = jaw === "upper" ? (side === "right" ? 1 : 2) : side === "right" ? 4 : 3;
    const [w, d, ch] = DIMS[jaw][type];
    // curve of Spee / occlusal plane
    const spee = jaw === "lower" ? -0.04 * Math.pow(idx - 2, 2) * 0.3 : 0;
    const cervY = jaw === "upper" ? ch + 0.2 : -(ch - 0.4) + spee;
    teeth.push({
      id: quad * 10 + idx + 1,
      type,
      jaw,
      side,
      position: new THREE.Vector3(p.x, cervY, p.z),
      quaternion: q,
      w,
      d,
      ch,
      u,
    });
  });
  return { jaw, curve, teeth, contacts };
}

/** Gingiva as a continuous swept surface with scalloped margin and papillae. */
export function buildGumGeometry(arch: Arch) {
  const { curve, teeth, contacts, jaw } = arch;
  const S = 360;
  const P = 40;
  const sign = jaw === "upper" ? 1 : -1; // direction away from occlusal plane
  const verts: number[] = [];
  const cols: number[] = [];
  const idx: number[] = [];

  const toothAt = (u: number) => {
    let best = teeth[0]!;
    let bd = 1e9;
    for (const t of teeth) {
      const dd = Math.abs(t.u - u);
      if (dd < bd) {
        bd = dd;
        best = t;
      }
    }
    return best;
  };
  const L = curve.getLength();

  for (let i = 0; i <= S; i++) {
    const u = i / S;
    const p = curve.getPointAt(u);
    const tan = curve.getTangentAt(u);
    const out = new THREE.Vector3(tan.z, 0, -tan.x).normalize();
    const center = new THREE.Vector3(0, 0, -6);
    if (out.dot(p.clone().sub(center)) < 0) out.negate();
    const t = toothAt(u);
    // distance in mm to nearest contact (papilla)
    let dc = 1e9;
    for (const c of contacts) dc = Math.min(dc, Math.abs(c - u) * L);
    const papilla = 2.6 * gauss(dc, 1.7);
    const endFade = smooth(0, 0.035, u) * smooth(1, 0.965, u);
    const halfD = (t.d / 2) * 0.82 + 0.5;
    const cervY = t.position.y;
    // margin baseline sits slightly onto the crown (scallop low point)
    const marginH = 0.6 + papilla; // toward occlusal from cervical line
    const marginY = cervY - sign * marginH;
    const depth = 10;
    const bw = halfD * (0.6 + 0.4 * endFade);

    // profile (n = outward offset, y = vertical), from buccal margin -> around -> lingual margin
    const prof: [number, number][] = [];
    for (let k = 0; k <= P; k++) {
      const a = (k / P) * Math.PI; // 0 buccal margin .. PI lingual margin
      const s = Math.sin(a);
      const c = Math.cos(a);
      // horseshoe: bulge outward on the alveolar ridge, rounded base
      const bulge = 1 + 0.42 * s * (1 - 0.4 * s) + 0.15 * gauss(a - 0.35, 0.3);
      const n = c * bw * bulge + (c > 0 ? 0.3 : -0.6) * s;
      const yy = marginY + sign * (depth * Math.pow(s, 0.9) * endFade + 0.6 * (1 - Math.abs(c)));
      prof.push([n, yy]);
    }
    for (let k = 0; k <= P; k++) {
      const [n, yy] = prof[k]!;
      // margin rolls slightly over the tooth near papillae
      const roll = k === 0 || k === P ? 0 : 0;
      const nn = 0;
      verts.push(p.x + out.x * (n + roll + nn), yy + noise3(p.x * 0.6, yy * 0.6, p.z * 0.6) * 0.12, p.z + out.z * (n + roll + nn));
      // color: attached gingiva coral-pink at margin, deeper mucosa red away
      const a = k / P;
      const edge = Math.min(a, 1 - a) * 2;
      const c1 = new THREE.Color("#e59a98");
      const c2 = new THREE.Color("#c25a64");
      const c3 = new THREE.Color("#a8414f");
      const c = c1.clone().lerp(c2, smooth(0.03, 0.35, edge)).lerp(c3, smooth(0.45, 1, edge) * 0.6);
      const stip = (hash(i * 97 + k * 13) - 0.5) * 0.03;
      cols.push(c.r + stip, c.g + stip, c.b + stip);
    }
  }
  for (let i = 0; i < S; i++) {
    for (let k = 0; k < P; k++) {
      const a = i * (P + 1) + k;
      const b = a + P + 1;
      if (sign > 0) idx.push(a, b, a + 1, b, b + 1, a + 1);
      else idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** Palate (upper) or floor/tongue base (lower) closing the arch interior. */
export function buildPalateGeometry(arch: Arch) {
  const { curve, jaw, teeth } = arch;
  const sign = jaw === "upper" ? 1 : -1;
  const S = 120;
  const R = 24;
  const center = new THREE.Vector3(0, 0, -6);
  const verts: number[] = [];
  const cols: number[] = [];
  const idx: number[] = [];
  const baseY = teeth[0]!.position.y;
  for (let i = 0; i <= S; i++) {
    const u = 0.02 + (i / S) * 0.96;
    const p = curve.getPointAt(u);
    const tan = curve.getTangentAt(u);
    const out = new THREE.Vector3(tan.z, 0, -tan.x).normalize();
    if (out.dot(p.clone().sub(center)) < 0) out.negate();
    const edge = p.clone().addScaledVector(out, -4.2);
    const target = new THREE.Vector3(p.x * 0.05, 0, Math.min(p.z, -18));
    for (let r = 0; r <= R; r++) {
      const t = r / R;
      const x = THREE.MathUtils.lerp(edge.x, target.x, t);
      const z = THREE.MathUtils.lerp(edge.z, target.z, t);
      const vault = jaw === "upper" ? 13 : 4;
      const y = baseY + sign * (2 + vault * Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5));
      // palatal rugae
      const rug = jaw === "upper" && z > -2 ? 0.35 * Math.sin(z * 1.4 + x * 0.3) * smooth(0, 0.3, t) * (1 - t) : 0;
      verts.push(x, y + sign * rug, z);
      const c = new THREE.Color(jaw === "upper" ? "#d6858a" : "#b85060");
      cols.push(c.r, c.g, c.b);
    }
  }
  for (let i = 0; i < S; i++)
    for (let r = 0; r < R; r++) {
      const a = i * (R + 1) + r;
      const b = a + R + 1;
      if (sign > 0) idx.push(a, a + 1, b, b, a + 1, b + 1);
      else idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
  geo.setAttribute("color", new THREE.Float32BufferAttribute(cols, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}
