import { descargarExcel } from "@/components/cloud-esther/rrhh/excel";
import { nombrePersona, type EquipoClinica, type RolClinica } from "@/lib/clinica/api";

/* Ubicación: src/lib/clinica/excel-equipo.ts
   EXCEL DEL PERSONAL (Accesos del equipo, solo el Administrador)
   - Descargar el equipo como planilla de Excel.
   - Descargar una plantilla vacía para completar.
   - Subir un Excel (o CSV) con el personal: se lee en el navegador (no se guarda el archivo)
     y las personas pasan a la lista de «Sumar personas» para revisarlas antes de invitar. */

const NOMBRE_ROL_EXCEL: Record<RolClinica, string> = {
  admin: "Administrador",
  odontologo: "Odontólogo/a",
  secretaria: "Secretaría",
  asistente: "Asistente",
};

const ESTADO: Record<string, string> = {
  activa: "Activa",
  invitada: "Invitada (falta su contraseña)",
  desactivada: "Sin acceso",
};

export async function descargarEquipoExcel(equipo: EquipoClinica, clinica: string) {
  const fecha = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short" }) : "Nunca";
  await descargarExcel(`equipo-${clinica.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.xlsx`, [
    {
      nombre: "Equipo",
      nota: `Equipo de ${clinica} · ${new Date().toLocaleDateString("es-AR")}`,
      columnas: [
        { titulo: "Nombre y apellido", clave: "nombre", ancho: 30 },
        { titulo: "Correo", clave: "email", ancho: 32 },
        { titulo: "Rol", clave: "rol", ancho: 18 },
        { titulo: "Estado", clave: "estado", ancho: 28 },
        { titulo: "Último ingreso", clave: "ultimo", ancho: 20 },
      ],
      filas: equipo.personas.map((p) => ({
        nombre: nombrePersona(p.nombre),
        email: p.email,
        rol: NOMBRE_ROL_EXCEL[p.rol] ?? p.rolNombre,
        estado: ESTADO[p.estado] ?? p.estado,
        ultimo: fecha(p.ultimoIngreso),
      })),
    },
  ]);
}

export async function descargarPlantillaEquipo() {
  await descargarExcel("plantilla-personal-cloud-esther.xlsx", [
    {
      nombre: "Personal",
      nota: "Una persona por fila. Rol: Odontólogo, Secretaría, Asistente o Administrador (si lo dejás vacío, se usa el que elijas al subirlo).",
      columnas: [
        { titulo: "Nombre y apellido", clave: "nombre", ancho: 30 },
        { titulo: "Correo", clave: "email", ancho: 32 },
        { titulo: "Rol", clave: "rol", ancho: 18 },
      ],
      filas: [
        { nombre: "Laura Gómez", email: "laura@ejemplo.com", rol: "Odontólogo" },
        { nombre: "Martín Ruiz", email: "martin@ejemplo.com", rol: "Secretaría" },
      ],
    },
  ]);
}

const sinAcentos = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** Texto de la columna Rol → rol del sistema (o null si no se entiende) */
export function rolDesdeTexto(t: string): RolClinica | null {
  const x = sinAcentos(t);
  if (!x) return null;
  if (x.length > 30) return null;
  if (x.startsWith("odont") || x.startsWith("dentist") || /^(dr|dra|doctor|doctora)\.?$/.test(x)) return "odontologo";
  if (x.startsWith("secret") || x.startsWith("recep") || x.startsWith("admision")) return "secretaria";
  if (x.startsWith("asist") || x.startsWith("auxil") || x.startsWith("higien")) return "asistente";
  if (x.startsWith("admin") || x.startsWith("direct") || x.startsWith("duen") || x.startsWith("gerent")) return "admin";
  return null;
}

export type PersonaDeExcel = { nombre: string; email: string; rol: RolClinica | null };

const CORREO = /[^\s,;<>"']+@[^\s,;<>"']+\.[^\s,;<>"']+/;

/** Lee un .xlsx o .csv y devuelve las personas (nombre, correo y rol si lo trae). */
export async function leerPersonasDeArchivo(archivo: File): Promise<PersonaDeExcel[]> {
  let filas: string[][] = [];
  if (/\.csv$/i.test(archivo.name) || archivo.type === "text/csv") {
    const texto = (await archivo.text()).replace(/^﻿/, "");
    const lineas = texto.split(/\r?\n/).filter((x) => x.trim());
    const sep = (lineas.find((l) => CORREO.test(l)) ?? lineas[0] ?? "").includes(";") ? ";" : ",";
    filas = lineas.map((l) => l.split(sep).map((x) => x.replace(/^"|"$/g, "").trim()));
  } else {
    const { default: ExcelJS } = await import("exceljs");
    const libro = new ExcelJS.Workbook();
    await libro.xlsx.load(await archivo.arrayBuffer());
    const hoja = libro.worksheets[0];
    if (!hoja) return [];
    hoja.eachRow((fila) => {
      const valores: string[] = [];
      fila.eachCell({ includeEmpty: true }, (c, col) => {
        const v = c.value as unknown;
        valores[col - 1] =
          v && typeof v === "object" && "text" in (v as Record<string, unknown>)
            ? String((v as { text: unknown }).text) // celdas con enlace (correo)
            : v && typeof v === "object" && "result" in (v as Record<string, unknown>)
              ? String((v as { result: unknown }).result)
              : String(v ?? "").trim();
      });
      filas.push(valores.map((x) => (x ?? "").trim()));
    });
  }

  // Cabecera: la primera fila que nombra la columna del correo (si no hay, se adivina por fila)
  const iCab = filas.findIndex((f) => f.some((c) => /^(correo|e-?mail|mail)/i.test(sinAcentos(c))));
  let colNombre = -1;
  let colCorreo = -1;
  let colRol = -1;
  if (iCab >= 0) {
    (filas[iCab] ?? []).forEach((c, i) => {
      const x = sinAcentos(c);
      if (colCorreo < 0 && /^(correo|e-?mail|mail)/.test(x)) colCorreo = i;
      else if (colNombre < 0 && /^(nombre|apellido|persona|profesional|integrante)/.test(x)) colNombre = i;
      else if (colRol < 0 && /^(rol|cargo|puesto|funcion)/.test(x)) colRol = i;
    });
  }
  const datos = iCab >= 0 ? filas.slice(iCab + 1) : filas;
  const vistos = new Set<string>();
  const personas: PersonaDeExcel[] = [];
  for (const f of datos) {
    const email = (colCorreo >= 0 ? f[colCorreo] : f.find((c) => CORREO.test(c)))?.match(CORREO)?.[0]?.toLowerCase();
    if (!email || vistos.has(email)) continue;
    vistos.add(email);
    const nombre =
      colNombre >= 0
        ? (f[colNombre] ?? "")
        : f
            .map((c) => c.replace(CORREO, " "))
            .filter((c) => c.trim() && !rolDesdeTexto(c))
            .join(" ");
    const rolTexto = colRol >= 0 ? (f[colRol] ?? "") : (f.find((c) => rolDesdeTexto(c)) ?? "");
    personas.push({ nombre: nombre.replace(/\s+/g, " ").trim(), email, rol: rolDesdeTexto(rolTexto) });
  }
  return personas;
}
