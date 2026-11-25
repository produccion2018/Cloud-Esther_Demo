import { useSyncExternalStore } from "react";
import { SLUG_DEMO, pedidoDemo } from "@/lib/clinica/demo-admin";

/* Ubicación: src/lib/clinica/api.ts
   ACCESO DE LAS CLÍNICAS (Etapa 8a): la dirección de cada clínica es /c/<slug>.
   La sesión se guarda POR CLÍNICA (una clave distinta para cada dirección) y solo en esta
   pestaña: al cerrarla, hay que volver a ingresar. Quien decide todo es el servidor:
   una sesión de una clínica no sirve en la dirección de otra. */

export const API_URL = (import.meta.env["VITE_ADMIN_API_URL"] as string | undefined)?.replace(/\/$/, "");
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
  /** Código del rol propio de la clínica (ej.: «Facturación»), si tiene uno */
  rolPropio?: string | null;
  /** Módulos que el Administrador le dejó ver (null o ausente = todo lo de su rol) */
  modulos?: string[] | null;
};
export type InfoClinica = {
  nombre: string;
  slug: string;
  plan: string | null;
  modulos: string[];
  /** Topes de la clínica: los de su plan + la capacidad extra que le dio Cloud Esther (null = sin límite) */
  limites?: { pacientes: number | null; usuarios: number | null; sucursales: number | null };
  /** País de la clínica (AR, UY, MX…): la app usa sus términos (DNI, RUT, CURP…) */
  pais?: string;
};
export type SesionClinica = {
  token: string;
  usuario: UsuarioClinica;
  clinica: InfoClinica;
  /** MODO SOPORTE (lo abre el equipo de Cloud Esther desde el panel): solo lectura.
   *  nombre = quién del equipo entró · vence = hasta cuándo dura (ISO). */
  soporte?: { nombre: string; vence: string } | null;
};

export type PersonaEquipo = {
  id: string;
  nombre: string;
  email: string;
  rol: RolClinica;
  rolNombre: string;
  /** Código del rol propio (Plus y Enterprise) o null */
  rolPropio?: string | null;
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
/** Rol propio de la clínica (Plus y Enterprise): lo crea el Administrador, ej.: «Facturación» */
export type RolPropio = { codigo: string; nombre: string; modulos: string[]; personas: number };
export type EquipoClinica = {
  personas: PersonaEquipo[];
  usados: number;
  limite: number | null;
  plan: string | null;
  rolesPropios?: RolPropio[];
  /** ¿Su plan le deja crear roles propios? (Plus y Enterprise) */
  puedeCrearRoles?: boolean;
};
/** Rol al invitar o cambiar: uno de siempre o el código de un rol propio («extra-…») */
export type RolElegido = RolClinica | string;

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

let comprimeEnvios = true;
async function http<T>(slug: string, metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  // Demo: la administración de la clínica con un equipo de ejemplo (sin servidor)
  if (slug === SLUG_DEMO) return pedidoDemo<T>(metodo, ruta, cuerpo);
  if (!API_URL) throw new ErrorClinica("El acceso de las clínicas no está disponible en la vista previa.", 503);
  const token = leerSesionClinica(slug)?.token;
  const texto = cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined;
  // Los envíos grandes (ej. 15.000 pacientes) viajan comprimidos: ~8 veces menos datos
  const comprimir = !!texto && texto.length > 32_768 && comprimeEnvios && typeof CompressionStream !== "undefined";
  const pedir = async (gz: boolean) =>
    fetch(`${API_URL}/c/${encodeURIComponent(slug)}${ruta}`, {
      method: metodo,
      headers: {
        "Content-Type": "application/json",
        ...(gz ? { "Content-Encoding": "gzip" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(texto !== undefined
        ? {
            body: gz
              ? await new Response(new Blob([texto]).stream().pipeThrough(new CompressionStream("gzip"))).blob()
              : texto,
          }
        : {}),
    });
  let r: Response;
  try {
    r = await pedir(comprimir);
    // Un servidor viejo que no acepta comprimido: se manda normal (y no se vuelve a intentar)
    if (comprimir && r.status === 415) {
      comprimeEnvios = false;
      r = await pedir(false);
    }
  } catch {
    throw new ErrorClinica("No pudimos conectarnos. Revisá tu internet y probá de nuevo.", 0);
  }
  if (!r.ok) {
    const texto = await r.text().catch(() => "");
    // Sesión vencida o desactivada: se borra la sesión guardada y vuelve al ingreso
    if (r.status === 401 && token) {
      // Si se cerró por entrar desde otro dispositivo (límite del plan), el ingreso lo explica
      if (/entraste desde otro/i.test(texto)) guardarMotivoSalida(slug, texto);
      borrarSesionClinica(slug);
    }
    throw new ErrorClinica(texto || `Error ${r.status}`, r.status);
  }
  return (r.status === 204 ? undefined : await r.json()) as T;
}

/** Pedido con la sesión de la clínica (lo usa la sincronización de los módulos). */
export const pedirAClinica = <T,>(slug: string, metodo: string, ruta: string, cuerpo?: unknown) =>
  http<T>(slug, metodo, ruta, cuerpo);

export const infoPublicaClinica = (slug: string) => http<{ nombre: string }>(slug, "GET", "");

/** Tipo de dispositivo para el límite del plan (el iPad se presenta como Mac: se mira la pantalla táctil). */
export function tipoDispositivo(): "computadora" | "celular" | "tablet" {
  if (typeof navigator === "undefined") return "computadora";
  const ua = navigator.userAgent;
  const tactil = (navigator.maxTouchPoints ?? 0) > 1;
  if (/iPad|Tablet|Kindle|Silk/i.test(ua) || (/Macintosh/i.test(ua) && tactil)) return "tablet";
  if (/Mobi|iPhone|iPod|Windows Phone/i.test(ua)) return "celular";
  if (/Android/i.test(ua)) return "tablet"; // Android sin «Mobile» = tablet
  return "computadora";
}

const claveMotivo = (slug: string) => `ce-clinica-motivo-salida:${slug}`;
function guardarMotivoSalida(slug: string, texto: string) {
  try {
    window.sessionStorage.setItem(claveMotivo(slug), texto.slice(0, 300));
  } catch {
    /* nada */
  }
}
/** Por qué se cerró la sesión (una sola vez): para mostrarlo en el ingreso. */
export function tomarMotivoSalida(slug: string): string | null {
  try {
    const t = window.sessionStorage.getItem(claveMotivo(slug));
    window.sessionStorage.removeItem(claveMotivo(slug));
    return t;
  } catch {
    return null;
  }
}

export async function ingresarClinica(
  slug: string,
  email: string,
  claveIngreso: string,
): Promise<SesionClinica & { aviso?: string }> {
  const r = await http<SesionClinica & { aviso?: string }>(slug, "POST", "/ingresar", {
    email,
    clave: claveIngreso,
    dispositivo: tipoDispositivo(),
  });
  const { aviso, ...sinAviso } = r;
  const s = sesionProlija(sinAviso);
  guardarSesionClinica(s);
  return { ...s, ...(aviso ? { aviso } : {}) };
}

/** Modo SOPORTE: el panel abre /c/<dirección>#soporte=<token> en otra pestaña.
 *  Se valida el token con el servidor y queda como la sesión de esta pestaña (solo lectura). */
export async function entrarComoSoporteClinica(slug: string, token: string): Promise<SesionClinica> {
  if (!API_URL) throw new ErrorClinica("El acceso de las clínicas no está disponible en la vista previa.", 503);
  if (!/^[A-Za-z0-9_-]{20,200}$/.test(token)) throw new ErrorClinica("El acceso de soporte no es válido.", 401);
  let r: Response;
  try {
    r = await fetch(`${API_URL}/c/${encodeURIComponent(slug)}/sesion`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new ErrorClinica("No pudimos conectarnos. Revisá tu internet y probá de nuevo.", 0);
  }
  if (!r.ok) {
    const texto = await r.text().catch(() => "");
    throw new ErrorClinica(
      r.status === 401 ? "El acceso de soporte venció o ya se usó. Volvé a abrirlo desde el panel." : texto || `Error ${r.status}`,
      r.status,
    );
  }
  const datos = (await r.json()) as Omit<SesionClinica, "token">;
  const s = sesionProlija({ ...datos, token });
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
export const invitarAlEquipo = async (slug: string, datos: { nombre: string; email: string; rol: RolElegido }) =>
  conNombres(await http<EquipoClinica>(slug, "POST", "/equipo", datos));
/** Varias personas a la vez (todo o nada). Devuelve el equipo y a quién no le salió el correo. */
export const invitarVarios = async (slug: string, personas: { nombre: string; email: string; rol: RolElegido }[]) => {
  const r = await http<{ equipo: EquipoClinica; enviadas: number; sinCorreo: string[] }>(slug, "POST", "/equipo/varios", { personas });
  return { ...r, equipo: conNombres(r.equipo) };
};
export const cambiarPersonaEquipo = async (
  slug: string,
  id: string,
  cambios: { rol?: RolElegido; activo?: boolean; modulos?: string[] | null },
) =>
  conNombres(await http<EquipoClinica>(slug, "PATCH", `/equipo/${id}`, cambios));

/* ───────────── Roles propios (Plus y Enterprise, solo el Administrador) ───────────── */
export const crearRolPropio = async (slug: string, datos: { nombre: string; modulos: string[] }) =>
  conNombres(await http<EquipoClinica>(slug, "POST", "/equipo/roles", datos));
export const editarRolPropio = async (slug: string, codigo: string, datos: { nombre?: string; modulos?: string[] }) =>
  conNombres(await http<EquipoClinica>(slug, "PATCH", `/equipo/roles/${encodeURIComponent(codigo)}`, datos));
export const borrarRolPropio = async (slug: string, codigo: string) =>
  conNombres(await http<EquipoClinica>(slug, "DELETE", `/equipo/roles/${encodeURIComponent(codigo)}`));
export const esRolPropio = (rol: string): boolean => /^extra-[0-9a-f]{8}$/.test(rol);
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
  /** Lo que se le puede dar a cada rol (todos los módulos) */
  maximos: Record<RolConPermisos, string[]>;
  /** Con qué arranca cada rol si el Administrador no eligió nada */
  predeterminados?: Record<RolConPermisos, string[]>;
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

/* ───────────── Módulos adicionales: aviso al panel de Cloud Esther para facturarlo ───────────── */
/* ───────────── Capacidad del plan (pacientes, equipo, sucursales) ───────────── */

export type TipoCapacidad = "pacientes" | "usuarios" | "sucursales";
/** Precio publicado por Cloud Esther: `mensual` USD por cada `cada` (ej. cada 100 pacientes) */
export type PrecioCapacidad = { cada: number; mensual: number; porPeriodo: number } | null;
export type Limites = { pacientes: number | null; usuarios: number | null; sucursales: number | null };
export type CapacidadClinica = {
  limites: Limites;
  plan?: Limites;
  extra: { pacientes: number; usuarios: number; sucursales: number };
  uso: { pacientes: number; archivados: number; usuarios: number };
  ciclo?: CicloClinica;
  descuentoAnual?: number;
  cobroAutomatico?: boolean;
  proximoCobro?: string | null;
  precios?: Record<TipoCapacidad, PrecioCapacidad>;
  /** Lo que ya paga por capacidad extra por período (0 = nada) */
  importeActual?: number;
};
export const verCapacidad = (slug: string) => http<CapacidadClinica>(slug, "GET", "/capacidad");
export const pedirCapacidad = (slug: string, d: { tipo: TipoCapacidad; cantidad: number | null; mensaje: string }) =>
  http<void>(slug, "POST", "/capacidad/pedido", d);
/** Sumar capacidad YA con el precio publicado: el límite sube al instante y va a la próxima factura */
export const comprarCapacidad = (slug: string, d: { tipo: TipoCapacidad; cantidad: number }) =>
  http<{ limites: Limites; suma: number; total: number; ciclo: CicloClinica; cobro: "paddle" | "manual" }>(
    slug,
    "POST",
    "/capacidad/comprar",
    d,
  );

/** Después de sumar capacidad: los nuevos topes quedan en la sesión (se aplican sin recargar) */
export function actualizarLimitesSesion(slug: string, limites: Limites) {
  const s = leerSesionClinica(slug);
  if (!s) return;
  guardarSesionClinica({ ...s, clinica: { ...s.clinica, limites } });
}

/* ───────────── Módulos adicionales (precio para MI clínica y cobro) ───────────── */

export type CicloClinica = "mensual" | "anual";
export type ModulosDeMiClinica = {
  ciclo: CicloClinica;
  /** 0,15 = 15 % (el mismo descuento anual de su plan) */
  descuentoAnual: number;
  /** true = paga con Paddle: el módulo se suma a su suscripción y se cobra solo */
  cobroAutomatico: boolean;
  proximoCobro: string | null;
  /** Lo que paga por mes por el plan (lo carga Cloud Esther). null = no cargado */
  planMensual?: number | null;
  /** { módulo: { mensual, porPeriodo } } (porPeriodo = por mes o por año, según su ciclo) */
  precios: Record<string, { mensual: number; porPeriodo: number }>;
  activos: { modulo: string; nombre: string; importe: number; ciclo: CicloClinica; desde: string; cobro: "paddle" | "manual" }[];
};
export type VistaPreviaModulo = {
  modulo: string;
  nombre: string;
  ciclo: CicloClinica;
  mensual: number;
  porPeriodo: number;
  descuentoAnual: number;
  cobroAutomatico: boolean;
  proximoCobro: string | null;
  /** Lo que Paddle cobra HOY (proporcional, con impuestos). null = se factura después */
  hoy: { subtotal: number; impuesto: number; total: number } | null;
  /** Paddle: cuánto queda la PRÓXIMA factura completa (plan + módulos + este, con impuestos) */
  proxima?: { subtotal: number; impuesto: number; total: number } | null;
};

export const verModulosDeMiClinica = (slug: string) => http<ModulosDeMiClinica>(slug, "GET", "/modulos-adicionales");
export const vistaPreviaModulo = (slug: string, modulo: string) =>
  http<VistaPreviaModulo>(slug, "POST", "/modulos-adicionales/vista-previa", { modulo });
export const avisarModuloAdicional = (slug: string, modulo: string, accion: "agregar" | "quitar") =>
  http<{ cobro: "paddle" | "manual"; importe: number; ciclo: CicloClinica } | undefined>(
    slug,
    "POST",
    "/modulos-adicionales",
    { modulo, accion },
  );

/* ───────────── Automatizaciones, WhatsApp Business e IA (en el servidor) ───────────── */

export type EstadoAutomatizaciones = {
  habilitado: boolean;
  ia: { habilitada: boolean; conLlave: boolean };
  whatsapp: {
    conectado: boolean;
    phoneId: string;
    numero: string;
    token: string;
    appSecret: string;
    plantilla: string;
    idioma: string;
    webhook: string;
    verifyToken: string;
  };
  n8n: { eventosUrl: string; webhookAcciones: string; secreto: string };
  agente: { activo: boolean };
  flujosActivos: number;
};
export type EjecucionServidor = {
  id: string;
  flujoId: string;
  flujo: string;
  fecha: string;
  disparador: string;
  sede: string;
  estado: "En curso" | "En espera" | "Completada" | "Detenida" | "Error";
  pasos: { tipo: string; titulo: string; resultado: string; estado: "ok" | "omitido" | "espera" | "error" }[];
  modo: "Manual" | "Automática";
  retomaEl: string | null;
};
export type ItemBandeja = { id: string; tipo: "tarea" | "aviso" | "seguimiento"; datos: Record<string, unknown>; fecha: string };
export type MensajeWhatsapp = {
  id: string;
  telefono: string;
  nombre: string;
  direccion: "entrante" | "saliente";
  texto: string;
  por: string;
  estado: string;
  fecha: string;
};

export const verEstadoAutomatizaciones = (slug: string) => http<EstadoAutomatizaciones>(slug, "GET", "/automatizaciones/estado");
export const guardarConexionAutomatizaciones = (
  slug: string,
  d: {
    n8nEventsUrl?: string;
    whatsapp?: { phoneId: string; token?: string; appSecret?: string; plantilla: string; idioma: string; desconectar?: boolean };
  },
) => http<EstadoAutomatizaciones>(slug, "PUT", "/automatizaciones/conexion", d);
export const probarWhatsappBusiness = (slug: string, telefono: string) =>
  http<{ ok: true }>(slug, "POST", "/automatizaciones/probar-whatsapp", { telefono });
export const probarN8n = (slug: string) => http<{ ok: true }>(slug, "POST", "/automatizaciones/probar-n8n");
export const renovarSecretoAutomatizaciones = (slug: string) =>
  http<EstadoAutomatizaciones>(slug, "POST", "/automatizaciones/secreto");
export const sincronizarFlujos = (slug: string, d: { flujos: unknown[]; agente?: { estado: string; config: unknown } }) =>
  http<{ ok: true; activos: number; habilitado: boolean }>(slug, "PUT", "/automatizaciones/flujos", d);
export const ejecutarFlujoEnServidor = (slug: string, flujoId: string, disparo: Record<string, unknown>) =>
  http<EjecucionServidor>(slug, "POST", `/automatizaciones/flujos/${encodeURIComponent(flujoId)}/ejecutar`, { disparo });
export const verEjecucionesServidor = (slug: string) => http<EjecucionServidor[]>(slug, "GET", "/automatizaciones/ejecuciones");
export const tomarBandejaAutomatizaciones = (slug: string) => http<ItemBandeja[]>(slug, "POST", "/automatizaciones/bandeja");
export const verMensajesWhatsapp = (slug: string, telefono?: string) =>
  http<MensajeWhatsapp[]>(slug, "GET", `/whatsapp/mensajes${telefono ? `?telefono=${encodeURIComponent(telefono)}` : ""}`);
export const enviarWhatsappBusiness = (slug: string, d: { telefono: string; texto: string; paciente?: string }) =>
  http<{ ok: true }>(slug, "POST", "/whatsapp/enviar", d);
export const preguntarIAServidor = (slug: string, d: { pregunta: string; contexto: string }) =>
  http<{ texto: string | null; motivo: "sin-llave" | "limite" | "error" | null }>(slug, "POST", "/ia/preguntar", d);
