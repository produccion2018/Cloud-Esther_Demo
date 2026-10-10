/* Excel real (.xlsx) para RRHH: exportar planillas con formato e importar novedades.
   La librería se carga solo cuando se usa (no pesa en la carga inicial de la app). */

export type ColumnaExcel = {
  titulo: string;
  clave: string;
  ancho?: number;
  moneda?: boolean;
};
export type HojaExcel = {
  nombre: string;
  columnas: ColumnaExcel[];
  filas: Record<string, string | number>[];
  totales?: Record<string, string | number>;
  nota?: string;
};

const VIOLETA = "FF6D28D9";
const VIOLETA_SUAVE = "FFF3EEFF";

export async function descargarExcel(nombreArchivo: string, hojas: HojaExcel[]) {
  const { default: ExcelJS } = await import("exceljs");
  const libro = new ExcelJS.Workbook();
  libro.creator = "Cloud Esther";
  libro.created = new Date();
  for (const h of hojas) {
    const hoja = libro.addWorksheet(h.nombre.slice(0, 31), {
      views: [{ state: "frozen", ySplit: h.nota ? 3 : 1 }],
    });
    if (h.nota) {
      hoja.addRow([h.nota]).font = { italic: true, color: { argb: "FF6B7280" } };
      hoja.addRow([]);
    }
    const cab = hoja.addRow(h.columnas.map((c) => c.titulo));
    cab.eachCell((celda) => {
      celda.font = { bold: true, color: { argb: "FFFFFFFF" } };
      celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VIOLETA } };
      celda.alignment = { vertical: "middle" };
    });
    cab.height = 20;
    h.columnas.forEach((c, i) => {
      hoja.getColumn(i + 1).width = c.ancho ?? Math.max(12, c.titulo.length + 4);
      if (c.moneda) hoja.getColumn(i + 1).numFmt = "#,##0.00";
    });
    h.filas.forEach((f, n) => {
      const fila = hoja.addRow(h.columnas.map((c) => f[c.clave] ?? ""));
      if (n % 2)
        fila.eachCell(
          (celda) =>
            (celda.fill = { type: "pattern", pattern: "solid", fgColor: { argb: VIOLETA_SUAVE } }),
        );
    });
    if (h.totales) {
      const t = hoja.addRow(h.columnas.map((c) => h.totales?.[c.clave] ?? ""));
      t.font = { bold: true, color: { argb: VIOLETA } };
      t.eachCell((celda) => (celda.border = { top: { style: "thin", color: { argb: VIOLETA } } }));
    }
    const filaCab = h.nota ? 3 : 1;
    hoja.autoFilter = {
      from: { row: filaCab, column: 1 },
      to: { row: filaCab, column: h.columnas.length },
    };
  }
  const buffer = await libro.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Lee la primera hoja (xlsx) o un CSV y devuelve una fila por objeto usando la cabecera. */
export async function leerPlanilla(archivo: File): Promise<Record<string, string | number>[]> {
  if (/\.csv$/i.test(archivo.name)) {
    const texto = (await archivo.text()).replace(/^\uFEFF/, "");
    const lineas = texto.split(/\r?\n/).filter((x) => x.trim());
    const sep = (lineas[0] ?? "").includes(";") ? ";" : ",";
    const [cab = "", ...resto] = lineas;
    const claves = cab.split(sep).map((x) => x.replace(/^"|"$/g, "").trim());
    return resto.map((l) => {
      const v = l.split(sep).map((x) => x.replace(/^"|"$/g, "").trim());
      return Object.fromEntries(claves.map((k, i) => [k, v[i] ?? ""]));
    });
  }
  const { default: ExcelJS } = await import("exceljs");
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(await archivo.arrayBuffer());
  const hoja = libro.worksheets[0];
  if (!hoja) return [];
  // La cabecera es la primera fila con 3 o más celdas completas (las planillas propias traen una nota arriba).
  let filaCab = 0;
  hoja.eachRow((fila, n) => {
    if (filaCab) return;
    let llenas = 0;
    fila.eachCell((c) => {
      if (String(c.value ?? "").trim()) llenas++;
    });
    if (llenas >= 3) filaCab = n;
  });
  if (!filaCab) return [];
  const cab: string[] = [];
  hoja.getRow(filaCab).eachCell((c, col) => (cab[col] = String(c.value ?? "").trim()));
  const filas: Record<string, string | number>[] = [];
  hoja.eachRow((fila, n) => {
    if (n <= filaCab) return;
    const obj: Record<string, string | number> = {};
    fila.eachCell((c, col) => {
      const k = cab[col];
      if (!k) return;
      const v = c.value;
      obj[k] =
        typeof v === "number"
          ? v
          : v && typeof v === "object" && "result" in v
            ? Number(v.result)
            : String(v ?? "").trim();
    });
    if (Object.keys(obj).length) filas.push(obj);
  });
  return filas;
}
