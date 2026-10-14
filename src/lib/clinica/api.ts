import { useSyncExternalStore } from "react";

/* Ubicación: src/lib/clinica/api.ts
   ACCESO DE LAS CLÍNICAS (Etapa 8a): la dirección de cada clínica es /c/<slug>.
   La sesión se guarda POR CLÍNICA (una clave distinta para cada dirección) y solo en esta
   pestaña: al cerrarla, hay que volver a ingresar. Quien decide todo es el servidor:
   una sesión de una clínica no sirve en la dirección de otra. */

const API_URL = (import.meta.env["VITE_ADMIN_API_URL"] as string | undefined)?.replace(/\/$/, "");
export const CLINICA_CON_SERVIDOR = Boolean(API_URL);

export type RolClinica = "admin" | "odontologo" | "secretaria" | "asistente";

export const ROLES_CLINICA: { id: RolClinica; nombre: string; detalle: string }[] = [
  { id: "admin", nombre: "Administrador", detalle: "Todo, incluido el Equipo" },
  { id: "odontologo", nombre: "Odontólogo/a", detalle: "Atiende pacientes" },
  { id: "secretaria", nombre: "Secretaría", detalle: "Recepción y turnos" },
  { id: "asistente", nombre: "Asistente", detalle: "Ayuda en el consultorio" },
];

export type UsuarioClinica = {
  id: string;
  nombre: string;
  email: string;
  rol: RolClinica;
  rolNombre: string;
  /** Módulos que el Administrador le dejó ver (null o ausente = todo lo de su rol) */
  modulos?: string[] | null;
};
export type InfoClinica = { nombre: string; slug: string; plan: string | null; modulos: string[] };
export type SesionClinica = { token: string; usuario: UsuarioClinica; clinica: InfoClinica };

export type PersonaEquipo = {
  id: string;
  nombre: string;
  email: string;
  rol: RolClinica;
  rolNombre: string;
  estado: "invitada" | "activa" | "desactivada";
  ultimoIngreso: string | null;
  soyYo: boolean;
  /** Módulos que ve (null = todo: el Administrador) */
  modulos?: string[] | null;
  /** Módulos que se le pueden dar según su rol */
  modulosRol?: string[];
  /** ¿El Administrador eligió a mano qué ve? */
  modulosPersonalizados?: boolean;
};
export type EquipoClinica = { personas: PersonaEquipo[]; usados: number; limite: number | null; plan: string | null };

export class ErrorClinica extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

/* ───────────── Sesión (por clínica, solo esta pestaña) ───────────── */

const clave = (slug: string) => `cloud-esther-clinica:${slug}`;
const oyentes = new Set<() => void>();
const avisar = () => oyentes.forEach((o) => o());

export function leerSesionClinica(slug: string): SesionClinica | null {
  if (typeof window === "undefined") return null;
  try {
    const s = JSON.parse(window.sessionStorage.getItem(clave(slug)) ?? "null") as SesionClinica | null;
    // Defensa extra: una sesión guardada para otra dirección no se usa nunca
    return s && s.clinica?.slug === slug ? s : null;
  } catch {
    return null;
  }
}

export function guardarSesionClinica(s: SesionClinica) {
  try {
    window.sessionStorage.setItem(clave(s.clinica.slug), JSON.stringify(s));
  } catch {
    /* sin almacenamiento: dura mientras la página esté abierta */
  }
  cache.set(s.clinica.slug, s);
  avisar();
}

export function borrarSesionClinica(slug: string) {
  try {
    window.sessionStorage.removeItem(clave(slug));
  } catch {
    /* nada */
  }
  cache.set(slug, null);
  avisar();
}

const cache = new Map<string, SesionClinica | null>();
function instantanea(slug: string): SesionClinica | null {
  if (!cache.has(slug)) cache.set(slug, leerSesionClinica(slug));
  return cache.get(slug) ?? null;
}

export function useSesionClinica(slug: string): SesionClinica | null {
  return useSyncExternalStore(
    (cb) => {
      oyentes.add(cb);
      return () => oyentes.delete(cb);
    },
    () => instantanea(slug),
    () => null,
  );
}

/* ───────────── Nombres prolijos ─────────────
   El servidor ya los guarda así; esto acomoda también los que se cargaron antes
   ("ricardo pinto" → "Ricardo Pinto", "maría de los ángeles" → "María de los Ángeles"). */
const PARTICULAS = new Set(["de", "del", "la", "las", "los", "y", "e", "da", "das", "do", "dos", "van", "von", "di"]);
const mayuscula = (w: string) => (w ? w.charAt(0).toLocaleUpperCase("es") + w.slice(1) : w);
export function nombrePersona(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es")
    .split(" ")
    .map((w, i) =>
      i > 0 && PARTICULAS.has(w)
        ? w
        : w
            .split("-")
            .map((p) => p.split("'").map(mayuscula).join("'"))
            .join("-"),
    )
    .join(" ");
}
const conNombres = (e: EquipoClinica): EquipoClinica => ({
  ...e,
  personas: e.personas.map((p) => ({ ...p, nombre: nombrePersona(p.nombre) })),
});
function sesionProlija<T extends { usuario: UsuarioClinica }>(s: T): T {
  return { ...s, usuario: { ...s.usuario, nombre: nombrePersona(s.usuario.nombre) } };
}

/* ───────────── Pedidos al servidor ───────────── */

async function http<T>(slug: string, metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  if (!API_URL) throw new ErrorClinica("El acceso de las clínicas no está disponible en la vista previa.", 503);
  const token = leerSesionClinica(slug)?.token;
  let r: Response;
  try {
    r = await fetch(`${API_URL}/c/${encodeURIComponent(slug)}${ruta}`, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
    });
  } catch {
    throw new ErrorClinica("No pudimos conectarnos. Revisá tu internet y probá de nuevo.", 0);
  }
  if (!r.ok) {
    const texto = await r.text().catch(() => "");
    // Sesión vencida o desactivada: se borra la sesión guardada y vuelve al ingreso
    if (r.status === 401 && token) borrarSesionClinica(slug);
    throw new ErrorClinica(texto || `Error ${r.status}`, r.status);
  }
  return (r.status === 204 ? undefined : await r.json()) as T;
}

/** Pedido con la sesión de la clínica (lo usa la sincronización de los módulos). */
export const pedirAClinica = <T,>(slug: string, metodo: string, ruta: string, cuerpo?: unknown) =>
  http<T>(slug, metodo, ruta, cuerpo);

export const infoPublicaClinica = (slug: string) => http<{ nombre: string }>(slug, "GET", "");

export async function ingresarClinica(slug: string, email: string, claveIngreso: string): Promise<SesionClinica> {
  const s = sesionProlija(await http<SesionClinica>(slug, "POST", "/ingresar", { email, clave: claveIngreso }));
  guardarSesionClinica(s);
  return s;
}

export async function salirClinica(slug: string, motivo: "Manual" | "Inactividad" = "Manual") {
  try {
    await http<void>(slug, "POST", "/salir", { motivo });
  } finally {
    borrarSesionClinica(slug);
  }
}

/** Refresca mis datos (rol, plan) desde el servidor */
export async function refrescarSesionClinica(slug: string): Promise<SesionClinica | null> {
  const actual = leerSesionClinica(slug);
  if (!actual) return null;
  const datos = sesionProlija(await http<Omit<SesionClinica, "token">>(slug, "GET", "/sesion"));
  const nueva = { ...datos, token: actual.token };
  guardarSesionClinica(nueva);
  return nueva;
}

export const recuperarClaveClinica = (slug: string, email: string) => http<void>(slug, "POST", "/recuperar", { email });
export const elegirClaveClinica = (slug: string, token: string, nueva: string) =>
  http<void>(slug, "POST", "/clave", { token, clave: nueva });
export const cambiarClaveClinica = (slug: string, actual: string, nueva: string) =>
  http<void>(slug, "POST", "/cambiar-clave", { actual, nueva });

export const verEquipo = async (slug: string) => conNombres(await http<EquipoClinica>(slug, "GET", "/equipo"));
export const invitarAlEquipo = async (slug: string, datos: { nombre: string; email: string; rol: RolClinica }) =>
  conNombres(await http<EquipoClinica>(slug, "POST", "/equipo", datos));
/** Varias personas a la vez (todo o nada). Devuelve el equipo y a quién no le salió el correo. */
export const invitarVarios = async (slug: string, personas: { nombre: string; email: string; rol: RolClinica }[]) => {
  const r = await http<{ equipo: EquipoClinica; enviadas: number; sinCorreo: string[] }>(slug, "POST", "/equipo/varios", { personas });
  return { ...r, equipo: conNombres(r.equipo) };
};
export const cambiarPersonaEquipo = async (
  slug: string,
  id: string,
  cambios: { rol?: RolClinica; activo?: boolean; modulos?: string[] | null },
) =>
  conNombres(await http<EquipoClinica>(slug, "PATCH", `/equipo/${id}`, cambios));
/* ───────────── Actividad del equipo (solo el Administrador) ───────────── */
export type CambioCantidad = { a: number; m: number; b: number };
export type ActividadPersona = {
  id: string;
  nombre: string;
  rol: RolClinica;
  rolNombre: string;
  estado: "invitada" | "activa" | "desactivada";
  ultimoIngreso: string | null;
  ultimaActividad: string | null;
  enLinea: boolean;
  cambios: number;
  ingresos: number;
};
export type ActividadEvento = {
  id: string;
  tipo: "cambio" | "consulta" | "ingreso" | "salida" | "comunicado";
  personaId: string;
  modulo: string | null;
  detalle: Record<string, CambioCantidad> | null;
  motivo: string | null;
  fecha: string;
};
export type ActividadEquipo = { desde: string; personas: ActividadPersona[]; eventos: ActividadEvento[] };
export const verActividad = async (slug: string, dias: number, persona?: string) => {
  const q = `?dias=${dias}${persona ? `&persona=${encodeURIComponent(persona)}` : ""}`;
  const r = await http<ActividadEquipo>(slug, "GET", `/actividad${q}`);
  return { ...r, personas: r.personas.map((p) => ({ ...p, nombre: nombrePersona(p.nombre) })) };
};

/* ───────────── Permisos por rol (solo el Administrador) ───────────── */
export type RolConPermisos = "odontologo" | "secretaria" | "asistente";
export type PermisosPorRol = {
  /** Lo elegido para cada rol (null = todo lo que permite el rol) */
  roles: Record<RolConPermisos, string[] | null>;
  /** Lo máximo que puede ver cada rol */
  maximos: Record<RolConPermisos, string[]>;
  siempre: string[];
};
export const verPermisosPorRol = (slug: string) => http<PermisosPorRol>(slug, "GET", "/equipo/permisos");
export const guardarPermisosPorRol = (slug: string, roles: Partial<Record<RolConPermisos, string[] | null>>) =>
  http<PermisosPorRol>(slug, "PUT", "/equipo/permisos", roles);

export const reenviarInvitacion = (slug: string, id: string) => http<void>(slug, "POST", `/equipo/${id}/reenviar`, {});

/** Las mismas reglas que el servidor */
export function problemaClaveClinica(c: string): string | null {
  if (c.length < 10) return "Usá al menos 10 caracteres.";
  if (!/[A-Z]/.test(c) || !/[a-z]/.test(c)) return "Combiná mayúsculas y minúsculas.";
  if (!/[0-9]/.test(c)) return "Agregá al menos un número.";
  return null;
}
