/* Ubicación: src/lib/descargas.ts
   Descargas de archivos de Cloud Esther, iguales en la PC, el celular y la app instalada:
   - descargarBlob: baja un archivo (CSV para Excel, Word, calendario…). El enlace se agrega a
     la página antes del clic y la dirección temporal se libera recién al minuto, porque si se
     libera enseguida algunos navegadores cancelan la descarga.
   - descargarPDF: arma un PDF real (A4) a partir del documento HTML y lo descarga. No abre
     ventanas nuevas ni el diálogo de impresión (los navegadores y la app instalada los bloquean
     y el usuario ve «descargar» pero no baja nada).
   TODO backend: los documentos oficiales (recetas firmadas, comprobantes fiscales) los genera el
   servidor como PDF firmado; esto queda como respaldo del lado del navegador. */

export function descargarBlob(nombre: string, blob: Blob) {
  if (typeof document === "undefined") return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Nombre de archivo seguro a partir de un título («Receta R-0001» → «receta-r-0001»). */
export function nombreArchivo(titulo: string, extension: string) {
  const base =
    titulo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "documento";
  return `${base}.${extension}`;
}

const ANCHO_A4_PX = 794; // 210 mm a 96 ppp

/** Convierte un documento HTML completo (con sus estilos) en un PDF A4 y lo descarga. */
const ANCHO_A5_PX = 559; // 148 mm a 96 ppp

/** Convierte un documento HTML completo en un PDF (A4 o A5, ej. recetas) y devuelve el archivo
 *  (Blob) para adjuntarlo o descargarlo; null si el PDF no se pudo armar. */
export async function pdfBlobDeHtml(html: string, formato: "a4" | "a5" = "a4"): Promise<Blob | null> {
  const anchoPx = formato === "a5" ? ANCHO_A5_PX : ANCHO_A4_PX;
  if (typeof document === "undefined") return null;
  // Sin scripts: los documentos traían «window.print()» al cargar.
  const limpio = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  Object.assign(iframe.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${anchoPx}px`,
    height: "200px",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  });
  document.body.appendChild(iframe);
  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("sin documento");
    doc.open();
    doc.write(limpio);
    doc.close();
    // Fondo blanco y márgenes de hoja aunque el documento no los traiga.
    const base = doc.createElement("style");
    base.textContent = `html,body{background:#fff !important;-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;padding:${formato === "a5" ? "20px 22px" : "28px 32px"};box-sizing:border-box;width:${anchoPx}px}`;
    doc.head?.appendChild(base);
    await esperarCarga(doc);

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas-pro"),
      import("jspdf"),
    ]);
    const cuerpo = doc.body;
    const canvas = await html2canvas(cuerpo, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      width: anchoPx,
      windowWidth: anchoPx,
      height: cuerpo.scrollHeight,
      windowHeight: cuerpo.scrollHeight,
    });

    const pdf = new jsPDF({ unit: "mm", format: formato, orientation: "portrait" });
    const anchoMm = formato === "a5" ? 148 : 210;
    const altoMm = formato === "a5" ? 210 : 297;
    const pxPorPagina = Math.floor((canvas.width * altoMm) / anchoMm);
    let desde = 0;
    let pagina = 0;
    // Se ignora un sobrante mínimo al final (evita una hoja en blanco).
    while (desde < canvas.height - 24) {
      const alto = Math.min(pxPorPagina, canvas.height - desde);
      const trozo = document.createElement("canvas");
      trozo.width = canvas.width;
      trozo.height = alto;
      const ctx = trozo.getContext("2d");
      if (!ctx) break;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, trozo.width, alto);
      ctx.drawImage(canvas, 0, desde, canvas.width, alto, 0, 0, canvas.width, alto);
      if (pagina > 0) pdf.addPage();
      pdf.addImage(
        trozo.toDataURL("image/jpeg", 0.92),
        "JPEG",
        0,
        0,
        anchoMm,
        (alto * anchoMm) / canvas.width,
      );
      desde += alto;
      pagina += 1;
    }
    return pdf.output("blob");
  } catch {
    return null;
  } finally {
    window.setTimeout(() => iframe.remove(), 1000);
  }
}

/** Convierte un documento HTML completo en PDF (A4 o A5, ej. recetas) y lo descarga. */
export async function descargarPDF(html: string, titulo: string, formato: "a4" | "a5" = "a4"): Promise<boolean> {
  const blob = await pdfBlobDeHtml(html, formato);
  if (blob) {
    descargarBlob(nombreArchivo(titulo, "pdf"), blob);
    return true;
  }
  // Respaldo: si el PDF no se pudo armar, se descarga el HTML para abrir e imprimir.
  if (typeof document === "undefined") return false;
  const limpio = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  descargarBlob(nombreArchivo(titulo, "html"), new Blob([limpio], { type: "text/html" }));
  return false;
}

/** Lee un Blob y devuelve su contenido en base64 (sin el prefijo "data:...;base64,"). */
export function blobABase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => {
      const s = String(fr.result);
      resolve(s.includes(",") ? s.slice(s.indexOf(",") + 1) : s);
    };
    fr.onerror = () => reject(fr.error ?? new Error("No se pudo leer el archivo"));
    fr.readAsDataURL(blob);
  });
}

async function esperarCarga(doc: Document) {
  const imagenes = Array.from(doc.images).filter((i) => !i.complete);
  await Promise.all(
    imagenes.map(
      (i) =>
        new Promise<void>((ok) => {
          i.addEventListener("load", () => ok(), { once: true });
          i.addEventListener("error", () => ok(), { once: true });
          window.setTimeout(ok, 4000);
        }),
    ),
  );
  try {
    await (doc as Document & { fonts?: FontFaceSet }).fonts?.ready;
  } catch {
    /* sin fuentes que esperar */
  }
  await new Promise((r) => window.setTimeout(r, 150));
}

/** Reemplazo de «window.open + document.write» de los documentos imprimibles: junta el HTML
 *  que se escribe y, al cerrar, lo descarga como PDF real. */
export function documentoPDF(titulo: string) {
  let html = "";
  return {
    document: {
      write: (parte: string) => {
        html += parte;
      },
      close: () => {
        void descargarPDF(html, titulo);
      },
    },
  };
}

/** Descarga como PDF una parte de la pantalla (por ejemplo, el tablero de la clínica). */
export async function descargarPDFdeElemento(el: HTMLElement, titulo: string): Promise<boolean> {
  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import("html2canvas-pro"),
      import("jspdf"),
    ]);
    const fondo = getComputedStyle(document.body).backgroundColor || "#ffffff";
    const canvas = await html2canvas(el, { scale: 2, backgroundColor: fondo, useCORS: true });
    const horizontal = canvas.width > canvas.height;
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: horizontal ? "l" : "p" });
    const anchoMm = horizontal ? 297 : 210;
    const altoMm = horizontal ? 210 : 297;
    const pxPorPagina = Math.floor((canvas.width * altoMm) / anchoMm);
    for (let desde = 0, pagina = 0; desde < canvas.height; desde += pxPorPagina, pagina++) {
      const alto = Math.min(pxPorPagina, canvas.height - desde);
      const trozo = document.createElement("canvas");
      trozo.width = canvas.width;
      trozo.height = alto;
      trozo
        .getContext("2d")
        ?.drawImage(canvas, 0, desde, canvas.width, alto, 0, 0, canvas.width, alto);
      if (pagina > 0) pdf.addPage();
      pdf.addImage(
        trozo.toDataURL("image/jpeg", 0.9),
        "JPEG",
        0,
        0,
        anchoMm,
        (alto * anchoMm) / canvas.width,
      );
    }
    descargarBlob(nombreArchivo(titulo, "pdf"), pdf.output("blob"));
    return true;
  } catch {
    return false;
  }
}
