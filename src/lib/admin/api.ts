import {
  ACTIVIDAD_INICIAL,
  ADMINS_INICIALES,
  CLAVES_PRUEBA,
  CLINICAS_INICIALES,
  CONSUMO_IA_INICIAL,
  CRECIMIENTO_INICIAL,
  DEMOS_INICIALES,
  PLANES_INICIALES,
} from "./datos-ejemplo";
import { leerSesion } from "./sesion";
import { completarPaises } from "@/lib/paises";
import {
  ANTICIPOS_INICIALES,
  ASISTENCIAS_INICIALES,
  AUSENCIAS_INICIALES,
  CONTRATOS_INICIALES,
  DOCUMENTOS_INICIALES,
  EMPLEADOS_INICIALES,
  GASTOS_INICIALES,
  INCIDENTES_INICIALES,
  LIQUIDACIONES_INICIALES,
  NOTIFICACIONES_INICIALES,
  PAISES_INICIALES,
  SESIONES_INICIALES,
  INTENTOS_INICIALES,
  PAGOS_NOMINA_INICIALES,
  PROVEEDORES_INICIALES,
  TAREAS_INICIALES,
  TICKETS_SOPORTE_INICIALES,
} from "./datos-ejemplo-empresa";
import type {
  Anticipo,
  Asistencia,
  Ausencia,
  Contrato,
  DocumentoInterno,
  Empleado,
  Gasto,
  Incidente,
  IntentoFallido,
  Liquidacion,
  Notificacion,
  PagoNomina,
  PaisOperacion,
  Proveedor,
  SesionPanel,
  TareaInterna,
  TicketSoporte,
} from "./tipos-empresa";
import type {
  AdminRole,
  AdminUser,
  Clinica,
  ConsumoIAMensual,
  ConfigDemo,
  CuentaDemo,
  EventoActividad,
  PlanConfig,
  PlanId,
  SesionAdmin,
} from "./tipos";

/* Ubicación: src/lib/admin/api.ts
   Única puerta de datos del panel. Todas las pantallas usan estas funciones.

   ─── Con backend ───
   Configurar VITE_ADMIN_API_URL (por ejemplo https://api.cloudesther.com). Cada función llama al
   endpoint indicado con el token de la sesión (Authorization: Bearer <token>). El backend SIEMPRE
   valida el rol: el panel solo oculta lo que cada rol no debe ver.

   CONTRATO (lo que tiene que implementar el backend)
   POST   /admin/auth/login              { email, clave }            → SesionAdmin
   POST   /admin/auth/logout             { motivo: "Manual" | "Inactividad" } (cierra la sesión auditada)
   POST   /admin/auth/recuperar          { email }                   → 204 (envía el enlace por correo)
   POST   /admin/auth/restablecer        { token, clave }            → 204
   POST   /admin/auth/cambiar-clave      { actual, nueva }           → 204
   PATCH  /admin/perfil                  { nombre, telefono }        → AdminUser
   GET    /admin/equipo                                              → AdminUser[]
   POST   /admin/equipo                  { nombre, email, rol }      → AdminUser (envía invitación)
   PATCH  /admin/equipo/:id              { rol?, activo? }           → AdminUser
   GET    /admin/planes                                              → PlanConfig[]
   PUT    /admin/planes/:id              Partial<PlanConfig>         → PlanConfig  (lo lee la web y la app)
   GET    /admin/clinicas                                            → Clinica[]
   POST   /admin/clinicas/:id/recordatorio                           → 204 (aviso de pago por correo/WhatsApp)
   GET    /admin/demos                                               → CuentaDemo[]
   PATCH  /admin/demos/:id               { estado?, notas?, responsable? } → CuentaDemo
   POST   /demo/eventos                  (lo envía la app del demo: registro, ingreso, módulo,
                                          plan, cierre, expiración, solicitud) → el backend arma
                                          CuentaDemo (ingresos y solicitudes) y valida los 30 min
                                          y la espera para volver a entrar
   GET    /admin/demo/config                                         → ConfigDemo
   PUT    /admin/demo/config             ConfigDemo                  → ConfigDemo (límites del demo)
   GET    /demo/config                   (público, lo lee el SaaS)   → ConfigDemo
   GET    /admin/notificaciones                                      → Notificacion[]
   PATCH  /admin/notificaciones          { ids | "todas", cambios }  → 204
   GET    /admin/auditoria/sesiones                                  → SesionPanel[] (con IP)
   GET    /admin/auditoria/intentos                                  → IntentoFallido[]
   GET    /admin/empresa/:coleccion                                  → lista (empleados, asistencias,
          ausencias, documentos, liquidaciones, pagosNomina, anticipos, proveedores, gastos,
          contratos, ticketsSoporte, incidentes, tareas)
   PUT    /admin/empresa/:coleccion/:id   item                       → item (crea o actualiza)
   DELETE /admin/empresa/:coleccion/:id                              → 204
   GET    /admin/actividad                                           → EventoActividad[]
   GET    /admin/ia/mensual                                          → ConsumoIAMensual[]
   GET    /admin/clinicas/crecimiento                                → { mes, nuevas, total }[]

   ─── Sin backend (ahora) ───
   Funciona con DATOS DE EJEMPLO guardados en este navegador, para revisar el panel completo.
   El panel lo indica con la etiqueta «Datos de ejemplo». */

const API_URL = (import.meta.env["VITE_ADMIN_API_URL"] as string | undefined)?.replace(/\/$/, "");
export const CON_BACKEND = Boolean(API_URL);

export class ErrorApi extends Error {}

async function http<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  const token = leerSesion()?.token;
  const r = await fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
  });
  if (!r.ok) {
    const texto = await r.text().catch(() => "");
    throw new ErrorApi(texto || `Error ${r.status}`);
  }
  return (r.status === 204 ? undefined : await r.json()) as T;
}

/* ───────────── Base local (modo sin backend) ───────────── */

/** Mismos valores por defecto que usa el SaaS si no hay configuración. */
export const CONFIG_DEMO_INICIAL: ConfigDemo = {
  limiteActivo: false,
  minutos: 30,
  esperaMinutos: 60,
  avisoMinutos: 5,
  exentos: [],
};

/** Colecciones de los módulos internos de la empresa (CRUD genérico). */
export type Colecciones = {
  empleados: Empleado[];
  asistencias: Asistencia[];
  ausencias: Ausencia[];
  documentos: DocumentoInterno[];
  liquidaciones: Liquidacion[];
  pagosNomina: PagoNomina[];
  anticipos: Anticipo[];
  proveedores: Proveedor[];
  gastos: Gasto[];
  contratos: Contrato[];
  ticketsSoporte: TicketSoporte[];
  incidentes: Incidente[];
  tareas: TareaInterna[];
  paises: PaisOperacion[];
};

const COLECCIONES_INICIALES: Colecciones = {
  empleados: EMPLEADOS_INICIALES,
  asistencias: ASISTENCIAS_INICIALES,
  ausencias: AUSENCIAS_INICIALES,
  documentos: DOCUMENTOS_INICIALES,
  liquidaciones: LIQUIDACIONES_INICIALES,
  pagosNomina: PAGOS_NOMINA_INICIALES,
  anticipos: ANTICIPOS_INICIALES,
  proveedores: PROVEEDORES_INICIALES,
  gastos: GASTOS_INICIALES,
  contratos: CONTRATOS_INICIALES,
  ticketsSoporte: TICKETS_SOPORTE_INICIALES,
  incidentes: INCIDENTES_INICIALES,
  tareas: TAREAS_INICIALES,
  paises: PAISES_INICIALES,
};

type BaseLocal = {
  version: 1 | 2;
  colecciones: Colecciones;
  notificaciones: Notificacion[];
  sesiones: SesionPanel[];
  intentos: IntentoFallido[];
  admins: AdminUser[];
  claves: Record<string, string>; // email → hash
  planes: PlanConfig[];
  clinicas: Clinica[];
  demos: CuentaDemo[];
  configDemo: ConfigDemo;
  actividad: EventoActividad[];
  recuperaciones: { token: string; email: string; vence: number }[];
};

const KEY = "cloud-esther-admin:datos";
let base: BaseLocal | null = null;

async function hash(texto: string) {
  const datos = new TextEncoder().encode(`cloud-esther-admin:${texto}`);
  // Desde el celular por la IP de la red local (http) el navegador no habilita crypto.subtle:
  // en ese caso se usa un resumen local simple (solo modo demo; el backend valida de verdad).
  if (typeof crypto === "undefined" || !crypto.subtle) {
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (const b of datos) {
      h1 = Math.imul(h1 ^ b, 0x01000193) >>> 0;
      h2 = Math.imul(h2 ^ b, 0x85ebca6b) >>> 0;
    }
    return `local-${h1.toString(16)}${h2.toString(16)}`;
  }
  const digest = await crypto.subtle.digest("SHA-256", datos);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function db(): Promise<BaseLocal> {
  if (base) return base;
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    if (raw) {
      const guardada = JSON.parse(raw) as BaseLocal;
      // Datos guardados antes de los módulos internos: se agregan sin perder lo cargado.
      base = {
        ...guardada,
        version: 2,
        colecciones: {
          ...COLECCIONES_INICIALES,
          ...(guardada.colecciones ?? {}),
          // Países nuevos del catálogo (sin pisar los que ya editó el dueño).
          paises: completarPaises(guardada.colecciones?.paises ?? PAISES_INICIALES),
        },
        notificaciones: guardada.notificaciones ?? NOTIFICACIONES_INICIALES,
        sesiones: guardada.sesiones ?? SESIONES_INICIALES,
        intentos: guardada.intentos ?? INTENTOS_INICIALES,
        configDemo: guardada.configDemo ?? CONFIG_DEMO_INICIAL,
      };
      return base;
    }
  } catch {
    /* se regenera */
  }
  const claves: Record<string, string> = {};
  for (const [email, clave] of Object.entries(CLAVES_PRUEBA)) claves[email] = await hash(clave);
  base = {
    version: 2,
    colecciones: COLECCIONES_INICIALES,
    notificaciones: NOTIFICACIONES_INICIALES,
    sesiones: SESIONES_INICIALES,
    intentos: INTENTOS_INICIALES,
    admins: ADMINS_INICIALES,
    claves,
    planes: PLANES_INICIALES,
    clinicas: CLINICAS_INICIALES,
    demos: DEMOS_INICIALES,
    configDemo: CONFIG_DEMO_INICIAL,
    actividad: ACTIVIDAD_INICIAL,
    recuperaciones: [],
  };
  guardar();
  return base;
}

function guardar() {
  try {
    if (base) window.localStorage.setItem(KEY, JSON.stringify(base));
  } catch {
    /* sin almacenamiento */
  }
}

/** Copia para que las pantallas nunca compartan objetos con la base local. */
const copia = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

const espera = () => new Promise((r) => setTimeout(r, 250));
const nuevoId = (p: string) =>
  `${p}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

async function registrar(accion: string, tipo: EventoActividad["tipo"]) {
  const b = await db();
  const actor = leerSesion()?.usuario.nombre ?? "Sistema";
  b.actividad = [
    { id: nuevoId("a"), fecha: new Date().toISOString(), actor, accion, tipo },
    ...b.actividad,
  ].slice(0, 300);
  guardar();
}

/** Borra los datos de ejemplo guardados en este navegador (vuelven los iniciales). */
export function reiniciarDatosEjemplo() {
  base = null;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* sin almacenamiento */
  }
}

/* ───────────── Autenticación ───────────── */

export async function iniciarSesionAdmin(email: string, clave: string): Promise<SesionAdmin> {
  const correo = email.trim().toLowerCase();
  if (CON_BACKEND) return http<SesionAdmin>("POST", "/admin/auth/login", { email: correo, clave });
  await espera();
  const b = await db();
  const usuario = b.admins.find((a) => a.email === correo);
  const fallo = (motivo: string) => {
    b.intentos = [
      {
        id: nuevoId("int"),
        fecha: new Date().toISOString(),
        email: correo,
        motivo,
        ...dispositivo(),
      },
      ...b.intentos,
    ].slice(0, 300);
    guardar();
  };
  if (!usuario || b.claves[correo] !== (await hash(clave))) {
    fallo(usuario ? "Contraseña incorrecta" : "Correo sin acceso al panel");
    throw new ErrorApi("El correo o la contraseña no son correctos.");
  }
  if (!usuario.activo) {
    fallo("Acceso desactivado");
    throw new ErrorApi("Tu acceso está desactivado. Hablá con el Dueño.");
  }
  usuario.ultimoAcceso = new Date().toISOString();
  const token = nuevoId("local");
  b.sesiones = [
    {
      id: token,
      usuario: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      inicio: usuario.ultimoAcceso,
      ultimaActividad: usuario.ultimoAcceso,
      fin: null,
      cierre: null,
      ...dispositivo(),
    },
    ...b.sesiones,
  ].slice(0, 500);
  guardar();
  const sesion: SesionAdmin = { usuario, token, inicio: usuario.ultimoAcceso };
  await registrar("Ingresó al panel", "acceso");
  return sesion;
}

/** Devuelve el enlace solo en modo sin backend (para poder probar sin correo). */
export async function solicitarRecuperacion(email: string): Promise<{ enlacePrueba?: string }> {
  const correo = email.trim().toLowerCase();
  if (CON_BACKEND) {
    await http("POST", "/admin/auth/recuperar", { email: correo });
    return {};
  }
  await espera();
  const b = await db();
  // Por seguridad la respuesta es la misma exista o no el correo.
  if (!b.admins.some((a) => a.email === correo)) return {};
  const token = nuevoId("rec") + nuevoId("x");
  b.recuperaciones = [
    ...b.recuperaciones.filter((r) => r.email !== correo),
    { token, email: correo, vence: Date.now() + 30 * 60 * 1000 },
  ];
  guardar();
  return { enlacePrueba: `/admin/restablecer?token=${token}` };
}

export async function restablecerClave(token: string, clave: string) {
  if (CON_BACKEND) return http<void>("POST", "/admin/auth/restablecer", { token, clave });
  await espera();
  const b = await db();
  const rec = b.recuperaciones.find((r) => r.token === token);
  if (!rec || rec.vence < Date.now())
    throw new ErrorApi("El enlace venció o ya se usó. Pedí uno nuevo.");
  b.claves[rec.email] = await hash(clave);
  b.recuperaciones = b.recuperaciones.filter((r) => r.token !== token);
  guardar();
}

export async function cambiarClave(actual: string, nueva: string) {
  if (CON_BACKEND) return http<void>("POST", "/admin/auth/cambiar-clave", { actual, nueva });
  await espera();
  const b = await db();
  const email = leerSesion()?.usuario.email ?? "";
  if (b.claves[email] !== (await hash(actual)))
    throw new ErrorApi("La contraseña actual no es correcta.");
  b.claves[email] = await hash(nueva);
  guardar();
  await registrar("Cambió su contraseña", "acceso");
}

/** Reglas mínimas de contraseña (las mismas que debe validar el backend). */
export function problemaClave(clave: string): string | null {
  if (clave.length < 10) return "Usá al menos 10 caracteres.";
  if (!/[A-Z]/.test(clave) || !/[a-z]/.test(clave)) return "Combiná mayúsculas y minúsculas.";
  if (!/[0-9]/.test(clave)) return "Agregá al menos un número.";
  return null;
}

export async function actualizarPerfil(datos: { nombre: string; telefono: string }) {
  if (CON_BACKEND) return http<AdminUser>("PATCH", "/admin/perfil", datos);
  await espera();
  const b = await db();
  const id = leerSesion()?.usuario.id;
  const u = b.admins.find((a) => a.id === id);
  if (!u) throw new ErrorApi("No se encontró tu usuario.");
  Object.assign(u, datos);
  guardar();
  return copia(u);
}

/* ───────────── Equipo interno ───────────── */

export async function obtenerEquipo(): Promise<AdminUser[]> {
  if (CON_BACKEND) return http("GET", "/admin/equipo");
  return copia((await db()).admins);
}

export async function invitarAdmin(datos: {
  nombre: string;
  email: string;
  rol: AdminRole;
}): Promise<{ usuario: AdminUser; clavePrueba?: string }> {
  if (CON_BACKEND) return { usuario: await http<AdminUser>("POST", "/admin/equipo", datos) };
  await espera();
  const b = await db();
  const email = datos.email.trim().toLowerCase();
  if (b.admins.some((a) => a.email === email))
    throw new ErrorApi("Ese correo ya tiene acceso al panel.");
  const usuario: AdminUser = {
    id: nuevoId("adm"),
    nombre: datos.nombre.trim(),
    email,
    telefono: "",
    rol: datos.rol,
    activo: true,
    ultimoAcceso: null,
    creado: new Date().toISOString(),
  };
  const clavePrueba = `Temporal${Math.floor(1000 + Math.random() * 9000)}`;
  b.admins = [...b.admins, usuario];
  b.claves[email] = await hash(clavePrueba);
  guardar();
  await registrar(`Dio acceso a ${usuario.nombre}`, "equipo");
  return { usuario, clavePrueba };
}

export async function actualizarAdmin(id: string, cambios: { rol?: AdminRole; activo?: boolean }) {
  if (CON_BACKEND) return http<AdminUser>("PATCH", `/admin/equipo/${id}`, cambios);
  await espera();
  const b = await db();
  const u = b.admins.find((a) => a.id === id);
  if (!u) throw new ErrorApi("Usuario no encontrado.");
  if (u.rol === "owner" && cambios.activo === false)
    throw new ErrorApi("No se puede desactivar al Dueño.");
  Object.assign(u, cambios);
  guardar();
  await registrar(
    cambios.activo === false
      ? `Quitó el acceso de ${u.nombre}`
      : `Actualizó el acceso de ${u.nombre}`,
    "equipo",
  );
  return u;
}

/* ───────────── Auditoría de sesiones del panel ───────────── */

/** Dispositivo y navegador aproximados (la IP la informa el backend). */
function dispositivo() {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const navegador = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : "Otro";
  const tipo = /Mobi|Android|iPhone/.test(ua) ? "Celular" : "Computadora";
  const so = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return { dispositivo: so ? `${tipo} · ${so}` : tipo, navegador };
}

/** Cierre de sesión (manual o por inactividad). TODO backend: POST /admin/auth/logout. */
export async function registrarSalida(motivo: "Manual" | "Inactividad") {
  const token = leerSesion()?.token;
  if (CON_BACKEND) return http<void>("POST", "/admin/auth/logout", { motivo });
  const b = await db();
  const s = b.sesiones.find((x) => x.id === token);
  if (s && !s.fin) {
    s.fin = new Date().toISOString();
    s.cierre = motivo;
    guardar();
    await registrar(
      motivo === "Manual" ? "Cerró sesión" : "Sesión cerrada por inactividad",
      "acceso",
    );
  }
}

/** Última actividad de la sesión abierta (se llama cada tanto mientras se usa el panel). */
export async function marcarActividadSesion() {
  if (CON_BACKEND) return;
  const token = leerSesion()?.token;
  const b = await db();
  const s = b.sesiones.find((x) => x.id === token);
  if (s && !s.fin) {
    s.ultimaActividad = new Date().toISOString();
    guardar();
  }
}

/** Agrega la sección visitada a la sesión abierta (módulo utilizado). TODO backend: lo registra
 *  el servidor con cada pedido autenticado. */
export async function registrarSeccionSesion(seccion: string) {
  if (CON_BACKEND) return;
  const token = leerSesion()?.token;
  const b = await db();
  const s = b.sesiones.find((x) => x.id === token);
  if (!s || s.fin) return;
  const previas = s.secciones ?? [];
  if (!previas.includes(seccion)) {
    s.secciones = [...previas, seccion].slice(-40);
    guardar();
  }
}

export async function obtenerSesiones(): Promise<SesionPanel[]> {
  if (CON_BACKEND) return http("GET", "/admin/auditoria/sesiones");
  return copia((await db()).sesiones);
}

export async function obtenerIntentos(): Promise<IntentoFallido[]> {
  if (CON_BACKEND) return http("GET", "/admin/auditoria/intentos");
  return copia((await db()).intentos);
}

/* ───────────── Notificaciones ───────────── */

export async function obtenerNotificaciones(): Promise<Notificacion[]> {
  if (CON_BACKEND) return http("GET", "/admin/notificaciones");
  return copia((await db()).notificaciones);
}

export async function actualizarNotificaciones(
  ids: string[] | "todas",
  cambios: Partial<Pick<Notificacion, "leida" | "archivada">>,
) {
  if (CON_BACKEND) return http<void>("PATCH", "/admin/notificaciones", { ids, cambios });
  const b = await db();
  b.notificaciones = b.notificaciones.map((n) =>
    ids === "todas" || ids.includes(n.id) ? { ...n, ...cambios } : n,
  );
  guardar();
}

/* ───────────── Módulos internos (CRUD genérico) ───────────── */

export async function listar<K extends keyof Colecciones>(k: K): Promise<Colecciones[K]> {
  if (CON_BACKEND) return http("GET", `/admin/empresa/${k}`);
  return copia((await db()).colecciones[k]);
}

/** Crea o actualiza (por id). */
export async function guardarEn<K extends keyof Colecciones>(
  k: K,
  item: Colecciones[K][number],
  accion?: string,
) {
  if (CON_BACKEND)
    return http<Colecciones[K][number]>("PUT", `/admin/empresa/${k}/${item.id}`, item);
  await espera();
  const b = await db();
  const lista = b.colecciones[k] as Colecciones[K][number][];
  const existe = lista.some((x) => x.id === item.id);
  (b.colecciones[k] as Colecciones[K][number][]) = existe
    ? lista.map((x) => (x.id === item.id ? item : x))
    : [item, ...lista];
  guardar();
  if (accion) await registrar(accion, "sistema");
  return item;
}

export async function borrarDe<K extends keyof Colecciones>(k: K, id: string, accion?: string) {
  if (CON_BACKEND) return http<void>("DELETE", `/admin/empresa/${k}/${id}`);
  await espera();
  const b = await db();
  (b.colecciones[k] as { id: string }[]) = (b.colecciones[k] as { id: string }[]).filter(
    (x) => x.id !== id,
  );
  guardar();
  if (accion) await registrar(accion, "sistema");
}

export const nuevoIdLocal = nuevoId;

/* ───────────── Planes ───────────── */

export async function obtenerPlanes(): Promise<PlanConfig[]> {
  if (CON_BACKEND) return http("GET", "/admin/planes");
  return copia((await db()).planes);
}

export async function guardarPlan(
  id: PlanId,
  cambios: Partial<Omit<PlanConfig, "id" | "nombre" | "odontograma">>,
) {
  if (CON_BACKEND) return http<PlanConfig>("PUT", `/admin/planes/${id}`, cambios);
  await espera();
  const b = await db();
  const p = b.planes.find((x) => x.id === id);
  if (!p) throw new ErrorApi("Plan no encontrado.");
  Object.assign(p, cambios);
  guardar();
  await registrar(`Actualizó el plan ${p.nombre}`, "plan");
  return p;
}

/* ───────────── Clínicas, demos y operación ───────────── */

export async function obtenerClinicas(): Promise<Clinica[]> {
  if (CON_BACKEND) return http("GET", "/admin/clinicas");
  return copia((await db()).clinicas);
}

/** Montos del contrato de una clínica (tenant): monto inicial y monto mensual, en US$.
 *  null = sin definir. TODO backend: PATCH /admin/clinicas/:id/montos (solo Dueño). */
export async function guardarMontosClinica(a: {
  id: string;
  montoInicial: number | null;
  montoMensual: number | null;
}) {
  if (CON_BACKEND)
    return http<void>("PATCH", `/admin/clinicas/${a.id}/montos`, {
      montoInicial: a.montoInicial,
      montoMensual: a.montoMensual,
    });
  await espera();
  const b = await db();
  const c = b.clinicas.find((x) => x.id === a.id);
  if (!c) throw new Error("No se encontró la clínica.");
  c.montoInicial = a.montoInicial;
  c.importe = a.montoMensual;
  guardar();
  await registrar(`Actualizó los montos de ${c.nombre}`, "plan");
}

export async function enviarRecordatorioPago(id: string) {
  if (CON_BACKEND) return http<void>("POST", `/admin/clinicas/${id}/recordatorio`);
  await espera();
  const c = (await db()).clinicas.find((x) => x.id === id);
  await registrar(`Envió recordatorio de pago a ${c?.nombre ?? id}`, "pago");
}

export async function obtenerDemos(): Promise<CuentaDemo[]> {
  if (CON_BACKEND) return http("GET", "/admin/demos");
  return copia((await db()).demos);
}

export async function obtenerConfigDemo(): Promise<ConfigDemo> {
  if (CON_BACKEND) return http("GET", "/admin/demo/config");
  return copia((await db()).configDemo);
}

export async function guardarConfigDemo(c: ConfigDemo, accion: string) {
  if (CON_BACKEND) return http<ConfigDemo>("PUT", "/admin/demo/config", c);
  await espera();
  const b = await db();
  b.configDemo = c;
  guardar();
  // El panel vive en la misma aplicación que el SaaS: sin backend, se aplica en este navegador.
  try {
    window.localStorage.setItem("cloud-esther:demo:config", JSON.stringify(c));
  } catch {
    /* sin almacenamiento */
  }
  await registrar(accion, "demo");
  return c;
}

export async function actualizarDemo(
  id: string,
  cambios: Partial<Pick<CuentaDemo, "estado" | "notas" | "responsable">>,
) {
  if (CON_BACKEND) return http<CuentaDemo>("PATCH", `/admin/demos/${id}`, cambios);
  await espera();
  const b = await db();
  const d = b.demos.find((x) => x.id === id);
  if (!d) throw new ErrorApi("Demo no encontrada.");
  Object.assign(d, cambios);
  guardar();
  if (cambios.estado)
    await registrar(`Marcó la demo de ${d.clinica} como «${cambios.estado}»`, "demo");
  return d;
}

export async function obtenerActividad(): Promise<EventoActividad[]> {
  if (CON_BACKEND) return http("GET", "/admin/actividad");
  return copia((await db()).actividad);
}

export async function obtenerConsumoIA(): Promise<ConsumoIAMensual[]> {
  if (CON_BACKEND) return http("GET", "/admin/ia/mensual");
  return CONSUMO_IA_INICIAL;
}

export async function obtenerCrecimiento(): Promise<
  { mes: string; nuevas: number; total: number }[]
> {
  if (CON_BACKEND) return http("GET", "/admin/clinicas/crecimiento");
  return CRECIMIENTO_INICIAL;
}
