/* Utilidades de imagen para Cloud Esther IA (en el navegador, sin subir nada a servidores).
   TODO backend: enviar la imagen al servicio de visión (modelo de detección odontológico y
   modelo generativo para la simulación) y guardar el archivo en el almacenamiento del tenant. */

/** Lee un archivo de imagen y lo reduce (máx. `max` px de lado) para guardarlo liviano. */
export function leerImagen(archivo: File, max = 900): Promise<string> {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error("No se pudo leer el archivo"));
    lector.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("El archivo no es una imagen válida"));
      img.onload = () => resolve(reducir(img, max));
      img.src = String(lector.result);
    };
    lector.readAsDataURL(archivo);
  });
}

export function reducir(img: HTMLImageElement | HTMLCanvasElement, max = 900, calidad = 0.82) {
  const w = img.width;
  const h = img.height;
  const k = Math.min(1, max / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * k);
  c.height = Math.round(h * k);
  c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", calidad);
}

export function cargar(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen"));
    img.src = src;
  });
}

function rnd(seed: number) {
  let a = seed;
  return () => {
    a = (a * 1664525 + 1013904223) % 4294967296;
    return a / 4294967296;
  };
}

/** Radiografía panorámica de ejemplo (dibujada), para practicar sin un archivo real. */
export function radiografiaEjemplo(): string {
  const c = document.createElement("canvas");
  c.width = 900;
  c.height = 440;
  const g = c.getContext("2d");
  if (!g) return "";
  const r = rnd(7);
  const fondo = g.createRadialGradient(450, 220, 40, 450, 220, 520);
  fondo.addColorStop(0, "#3a3a3a");
  fondo.addColorStop(1, "#0b0b0b");
  g.fillStyle = fondo;
  g.fillRect(0, 0, 900, 440);
  // Maxilar y mandíbula
  g.fillStyle = "rgba(160,160,160,0.18)";
  g.beginPath();
  g.ellipse(450, 170, 380, 120, 0, Math.PI, 0);
  g.fill();
  g.beginPath();
  g.ellipse(450, 270, 390, 150, 0, 0, Math.PI);
  g.fill();
  const pieza = (x: number, y: number, arriba: boolean, ancho: number) => {
    const alto = 70 + r() * 14;
    const raiz = 60 + r() * 20;
    const grad = g.createLinearGradient(x, y, x, arriba ? y - alto - raiz : y + alto + raiz);
    grad.addColorStop(0, "rgba(235,235,235,0.95)");
    grad.addColorStop(0.45, "rgba(200,200,200,0.85)");
    grad.addColorStop(1, "rgba(120,120,120,0.25)");
    g.fillStyle = grad;
    g.beginPath();
    if (arriba) {
      g.roundRect(x - ancho / 2, y - alto, ancho, alto, 10);
      g.fill();
      g.beginPath();
      g.moveTo(x - ancho / 3, y - alto + 4);
      g.lineTo(x, y - alto - raiz);
      g.lineTo(x + ancho / 3, y - alto + 4);
    } else {
      g.roundRect(x - ancho / 2, y, ancho, alto, 10);
      g.fill();
      g.beginPath();
      g.moveTo(x - ancho / 3, y + alto - 4);
      g.lineTo(x, y + alto + raiz);
      g.lineTo(x + ancho / 3, y + alto - 4);
    }
    g.fill();
  };
  for (let i = 0; i < 16; i++) {
    const t = (i - 7.5) / 7.5;
    const x = 450 + t * 360;
    const ancho = i < 3 || i > 12 ? 44 : i < 5 || i > 10 ? 36 : 30;
    pieza(x, 205 - Math.abs(t) * 30, true, ancho);
    pieza(x, 235 + Math.abs(t) * 30, false, ancho);
  }
  // Restauraciones (muy blancas) y zonas oscuras
  g.fillStyle = "rgba(255,255,255,0.95)";
  g.fillRect(234, 150, 26, 16);
  g.fillRect(640, 258, 24, 14);
  g.fillStyle = "rgba(20,20,20,0.75)";
  g.beginPath();
  g.arc(318, 165, 9, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(575, 372, 13, 0, Math.PI * 2);
  g.fill();
  return c.toDataURL("image/jpeg", 0.85);
}

/** Foto frontal de sonrisa de ejemplo (ilustrada), para practicar el simulador. */
export function sonrisaEjemplo(): string {
  const c = document.createElement("canvas");
  c.width = 720;
  c.height = 520;
  const g = c.getContext("2d");
  if (!g) return "";
  const piel = g.createLinearGradient(0, 0, 0, 520);
  piel.addColorStop(0, "#e9bf9f");
  piel.addColorStop(1, "#d7a381");
  g.fillStyle = piel;
  g.fillRect(0, 0, 720, 520);
  // Boca
  g.fillStyle = "#6e2230";
  g.beginPath();
  g.ellipse(360, 300, 205, 88, 0, 0, Math.PI * 2);
  g.fill();
  // Dientes superiores (algo amarillos, con diferencias de tono)
  const tonos = [
    "#e6d5a6",
    "#e9d9ad",
    "#efe0b6",
    "#f1e3ba",
    "#f1e3ba",
    "#efe0b6",
    "#e9d9ad",
    "#e6d5a6",
  ];
  for (let i = 0; i < 8; i++) {
    const x = 180 + i * 45;
    g.fillStyle = tonos[i] ?? "#eadcb0";
    g.beginPath();
    g.roundRect(x, 240, 42, 70 - Math.abs(i - 3.5) * 5, [4, 4, 12, 12]);
    g.fill();
  }
  for (let i = 0; i < 8; i++) {
    const x = 196 + i * 41;
    g.fillStyle = "#dcc996";
    g.beginPath();
    g.roundRect(x, 318, 38, 34 - Math.abs(i - 3.5) * 3, [10, 10, 3, 3]);
    g.fill();
  }
  // Labios
  g.strokeStyle = "#b85c68";
  g.lineWidth = 26;
  g.beginPath();
  g.ellipse(360, 300, 212, 95, 0, 0, Math.PI * 2);
  g.stroke();
  return c.toDataURL("image/jpeg", 0.88);
}
