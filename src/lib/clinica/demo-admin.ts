import type { RolClinica } from "@/lib/clinica/api";
import { claveTenant } from "@/lib/cloud-esther/tenant-store";

/* Ubicación: src/lib/clinica/demo-admin.ts
   ADMINISTRACIÓN DE LA CLÍNICA EN EL DEMO: las mismas pantallas de una clínica real
   (Accesos del equipo, Permisos por rol, Qué ve cada persona, Actividad del equipo) con un
   equipo de ejemplo. Todo vive en la memoria de esta pestaña: no toca ningún servidor y
   se pierde al recargar. La dirección «__demo__» nunca puede ser la de una clínica real
   (las direcciones reales no llevan guiones bajos). */

export const SLUG_DEMO = "__demo__";

const NOMBRE_ROL: Record<RolClinica, string> = {
  admin: "Administrador",
  odontologo: "Odontólogo/a",
  secretaria: "Secretaría",
  asistente: "Asistente",
};

/** El equipo de ejemplo (el mismo de la Comunicación interna del demo) */
export const EQUIPO_DEMO: { id: string; nombre: string; email: string; rol: RolClinica }[] = [
  { id: "demo-yo", nombre: "Carolina Méndez", email: "duenio@tuclinica.com", rol: "admin" },
  { id: "demo-1", nombre: "Mireya Becerra", email: "mireya.becerra@tuclinica.com", rol: "odontologo" },
  { id: "demo-2", nombre: "Andrés Becerra", email: "andres.becerra@tuclinica.com", rol: "odontologo" },
  { id: "demo-4", nombre: "Ketty Margarita", email: "ketty.margarita@tuclinica.com", rol: "secretaria" },
  { id: "demo-5", nombre: "Lucía Fernández", email: "lucia.fernandez@tuclinica.com", rol: "asistente" },
];

const PREDETERMINADOS: Record<"odontologo" | "secretaria" | "asistente", string[]> = {
  odontologo: [
    "dashboard", "agenda", "pacientes", "historia", "odontograma", "odontograma3d", "recetas",
    "estudios", "laboratorio", "tratamientos", "comunicaciones", "notificaciones", "presupuestos", "ia",
  ],
  secretaria: [
    "dashboard", "agenda", "pacientes", "comunicaciones", "notificaciones", "presupuestos", "facturacion",
    "marketing", "portal-paciente",
  ],
  asistente: [
    "dashboard", "agenda", "pacientes", "historia", "odontograma", "odontograma3d", "estudios", "laboratorio",
    "tratamientos", "notificaciones",
  ],
};
const SIEMPRE = ["dashboard", "notificaciones"];
type RolP = keyof typeof PREDETERMINADOS;
/** Todos los módulos se le pueden dar a cualquier rol (lo decide el Administrador) */
const TODOS = [
  "dashboard", "agenda", "pacientes", "historia", "odontograma", "odontograma3d", "recetas", "estudios", "laboratorio",
  "tratamientos", "comunicaciones", "notificaciones", "equipo", "marketing", "portal-paciente", "inventario", "rrhh",
  "presupuestos", "facturacion", "finanzas", "bi", "ia", "automatizaciones", "multiempresa", "integraciones", "configuracion",
];
const MAXIMOS: Record<RolP, string[]> = { odontologo: TODOS, secretaria: TODOS, asistente: TODOS };

const hace = (min: number) => new Date(Date.now() - min * 60_000).toISOString();

/* ROLES PROPIOS en el demo (como en una clínica real con plan Plus o Enterprise):
   «Facturación» (Sandra) y «Recursos humanos» (Luis). En Start y Pro no aparecen. */
type RolPropioDemo = { codigo: string; nombre: string; modulos: string[] };
const conRolesPropios = () => {
  try {
    const plan = localStorage.getItem(claveTenant("cloud-esther-demo:plan")) ?? "avanzada";
    return plan === "avanzada" || plan === "grupo";
  } catch {
    return true;
  }
};
const RESERVADOS = ["administrador", "odontologo", "odontólogo", "odontólogo/a", "secretaria", "secretaría", "asistente"];

type PersonaDemo = {
  id: string;
  nombre: string;
  email: string;
  rol: RolClinica;
  estado: "invitada" | "activa" | "desactivada";
  ultimoIngreso: string | null;
  acceso: string[] | null;
  /** Rol propio (Plus/Enterprise) */
  rolPropio?: string | null;
};

const estado = (() => {
  const personas: PersonaDemo[] = EQUIPO_DEMO.map((p, i) => ({
    ...p,
    estado: "activa",
    ultimoIngreso: hace([15, 45, 95, 30, 120][i] ?? 60),
    acceso: null,
  }));
  // Un ejemplo de permiso elegido a mano: Lucía (asistente) no ve Laboratorio
  const lucia = personas.find((p) => p.id === "demo-5");
  if (lucia) lucia.acceso = [...PREDETERMINADOS.asistente.filter((m) => m !== "laboratorio"), "recetas"];
  const porRol: Record<RolP, string[] | null> = {
    odontologo: null,
    // Ejemplo: la Secretaría no ve Marketing
    secretaria: PREDETERMINADOS.secretaria.filter((m) => m !== "marketing"),
    asistente: null,
  };
  const rolesPropios: RolPropioDemo[] = [
    { codigo: "extra-0000fac1", nombre: "Facturación", modulos: ["dashboard", "notificaciones", "presupuestos", "facturacion", "finanzas"] },
    { codigo: "extra-00001aa1", nombre: "Recursos humanos", modulos: ["dashboard", "notificaciones", "equipo", "rrhh"] },
  ];
  personas.push(
    { id: "demo-6", nombre: "Sandra Ruiz", email: "sandra.ruiz@tuclinica.com", rol: "secretaria", estado: "activa", ultimoIngreso: hace(55), acceso: null, rolPropio: "extra-0000fac1" },
    { id: "demo-7", nombre: "Luis Gómez", email: "luis.gomez@tuclinica.com", rol: "secretaria", estado: "activa", ultimoIngreso: hace(200), acceso: null, rolPropio: "extra-00001aa1" },
  );
  return { personas, porRol, limite: 15, rolesPropios };
})();

const rolPropioDe = (p: PersonaDemo) => (p.rolPropio ? estado.rolesPropios.find((r) => r.codigo === p.rolPropio) : undefined);
/** Personas que se ven: en Start y Pro no están las de roles propios */
const visibles = () => estado.personas.filter((p) => conRolesPropios() || !p.rolPropio);

const efectivos = (p: PersonaDemo) =>
  p.rol === "admin"
    ? null
    : (p.acceso ?? (p.rolPropio ? (rolPropioDe(p)?.modulos ?? SIEMPRE) : (estado.porRol[p.rol as RolP] ?? PREDETERMINADOS[p.rol as RolP])));

function equipo() {
  const ocupan = visibles().filter((p) => p.estado !== "desactivada").length;
  const propios = conRolesPropios();
  return {
    personas: visibles().map((p) => ({
      id: p.id,
      nombre: p.nombre,
      email: p.email,
      rol: p.rol,
      rolNombre: rolPropioDe(p)?.nombre ?? NOMBRE_ROL[p.rol],
      rolPropio: p.rolPropio ?? null,
      estado: p.estado,
      ultimoIngreso: p.ultimoIngreso,
      soyYo: p.id === "demo-yo",
      modulos: efectivos(p),
      modulosRol: p.rol === "admin" ? [] : [...MAXIMOS[p.rol as RolP]],
      modulosPersonalizados: p.rol !== "admin" && p.acceso !== null,
    })),
    usados: ocupan,
    limite: estado.limite,
    plan: propios ? "PLUS" : "PRO",
    rolesPropios: propios
      ? estado.rolesPropios.map((r) => ({ ...r, personas: estado.personas.filter((p) => p.rolPropio === r.codigo).length }))
      : [],
    puedeCrearRoles: propios,
  };
}

const limpiar = (rol: RolP, lista: string[] | null) => {
  if (lista === null) return null;
  const out = MAXIMOS[rol].filter((m) => lista.includes(m) || SIEMPRE.includes(m));
  const base = PREDETERMINADOS[rol];
  return out.length === base.length && out.every((m) => base.includes(m)) ? null : out;
};

function actividad(dias: number, persona?: string) {
  const ev = [
    { tipo: "cambio", p: "demo-4", modulo: "agenda", detalle: { turnos: { a: 2, m: 1, b: 0 } }, min: 6 },
    { tipo: "consulta", p: "demo-1", modulo: "registros", detalle: null, min: 14 },
    { tipo: "cambio", p: "demo-1", modulo: "registros", detalle: { _: { a: 0, m: 1, b: 0 } }, min: 18 },
    { tipo: "comunicado", p: "demo-yo", modulo: "comunicacion-interna", detalle: null, min: 40 },
    { tipo: "cambio", p: "demo-5", modulo: "radiografias", detalle: { _: { a: 1, m: 0, b: 0 } }, min: 52 },
    { tipo: "ingreso", p: "demo-1", modulo: null, detalle: null, min: 95 },
    { tipo: "cambio", p: "demo-4", modulo: "pacientes", detalle: { pacientes: { a: 1, m: 1, b: 0 } }, min: 110 },
    { tipo: "ingreso", p: "demo-5", modulo: null, detalle: null, min: 120 },
    { tipo: "cambio", p: "demo-2", modulo: "odontograma", detalle: { _: { a: 0, m: 2, b: 0 } }, min: 1500 },
    { tipo: "salida", p: "demo-2", modulo: null, detalle: null, min: 1440, motivo: "Manual" },
    { tipo: "ingreso", p: "demo-2", modulo: null, detalle: null, min: 1700 },
    { tipo: "cambio", p: "demo-4", modulo: "agenda", detalle: { turnos: { a: 3, m: 0, b: 1 }, espera: { a: 1, m: 0, b: 0 } }, min: 1600 },
    { tipo: "cambio", p: "demo-yo", modulo: "configuracion", detalle: { _: { a: 0, m: 1, b: 0 } }, min: 3000 },
  ] as const;
  const desde = Date.now() - dias * 86_400_000;
  const eventos = ev
    .map((e, i) => ({
      id: `demo-e${i}`,
      tipo: e.tipo,
      personaId: e.p,
      modulo: e.modulo,
      detalle: e.detalle,
      motivo: "motivo" in e ? e.motivo : null,
      fecha: hace(e.min),
    }))
    .filter((e) => new Date(e.fecha).getTime() > desde && (!persona || e.personaId === persona))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  const enLinea = new Set(["demo-yo", "demo-4", "demo-1"]);
  const personas = visibles()
    .filter((p) => !persona || p.id === persona)
    .map((p) => {
      const suyos = eventos.filter((e) => e.personaId === p.id);
      return {
        id: p.id,
        nombre: p.nombre,
        rol: p.rol,
        rolNombre: rolPropioDe(p)?.nombre ?? NOMBRE_ROL[p.rol],
        estado: p.estado,
        ultimoIngreso: p.ultimoIngreso,
        ultimaActividad: suyos[0]?.fecha ?? p.ultimoIngreso,
        enLinea: enLinea.has(p.id),
        cambios: suyos.filter((e) => e.tipo === "cambio").length,
        ingresos: suyos.filter((e) => e.tipo === "ingreso").length,
      };
    });
  return { desde: new Date(desde).toISOString(), personas, eventos };
}

class ErrorDemo extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

/** Responde como el servidor, pero con el equipo de ejemplo (solo para el demo) */
export async function pedidoDemo<T>(metodo: string, ruta: string, cuerpo?: unknown): Promise<T> {
  await new Promise((r) => setTimeout(r, 180)); // se siente como una pantalla real
  const [camino, query = ""] = ruta.split("?");
  const q = new URLSearchParams(query);
  const body = (cuerpo ?? {}) as Record<string, unknown>;
  const r = <X,>(x: X) => x as unknown as T;

  if (camino === "/equipo" && metodo === "GET") return r(equipo());
  if (camino === "/equipo/permisos") {
    if (metodo === "PUT") {
      for (const rol of Object.keys(MAXIMOS) as RolP[]) {
        if (rol in body) estado.porRol[rol] = limpiar(rol, body[rol] as string[] | null);
      }
    }
    return r({ roles: { ...estado.porRol }, maximos: MAXIMOS, predeterminados: PREDETERMINADOS, siempre: SIEMPRE });
  }
  if (camino === "/actividad") return r(actividad(Number(q.get("dias") ?? 7), q.get("persona") ?? undefined));
  if (camino === "/equipo/varios" || (camino === "/equipo" && metodo === "POST")) {
    const lista = (camino === "/equipo" ? [body] : (body.personas as Record<string, unknown>[])) ?? [];
    const libres = estado.limite - estado.personas.filter((p) => p.estado !== "desactivada").length;
    if (lista.length > libres) throw new ErrorDemo(`Tu plan permite hasta ${estado.limite} personas.`, 409);
    for (const x of lista) {
      const email = String(x.email ?? "").toLowerCase();
      if (estado.personas.some((p) => p.email === email)) throw new ErrorDemo(`Ya está en tu equipo: ${email}`, 409);
      estado.personas.push({
        id: `demo-n${estado.personas.length + 1}`,
        nombre: String(x.nombre ?? "Persona"),
        email,
        ...(String(x.rol ?? "").startsWith("extra-")
          ? { rol: "secretaria" as RolClinica, rolPropio: String(x.rol) }
          : { rol: (x.rol as RolClinica) ?? "asistente", rolPropio: null }),
        estado: "invitada",
        ultimoIngreso: null,
        acceso: null,
      });
    }
    const e = equipo();
    return r(camino === "/equipo" ? e : { equipo: e, enviadas: lista.length, sinCorreo: [] });
  }
  // Roles propios (Plus y Enterprise)
  const mr = /^\/equipo\/roles(?:\/(extra-[0-9a-f]{8}))?$/.exec(camino ?? "");
  if (mr) {
    if (!conRolesPropios()) throw new ErrorDemo("Los roles propios son de los planes Plus y Enterprise.", 403);
    const limpiarLista = (l: unknown) =>
      TODOS.filter((m) => (Array.isArray(l) ? (l as string[]).includes(m) : false) || SIEMPRE.includes(m));
    const validarNombre = (n: unknown, salvo?: string) => {
      const nombre = String(n ?? "").trim().replace(/\s+/g, " ");
      if (nombre.length < 2) throw new ErrorDemo("Escribí el nombre del rol.", 400);
      if (nombre.length > 40) throw new ErrorDemo("El nombre del rol es demasiado largo (máximo 40).", 400);
      if (RESERVADOS.includes(nombre.toLowerCase())) throw new ErrorDemo("Ese nombre ya es un rol de siempre. Elegí otro.", 409);
      if (estado.rolesPropios.some((r) => r.codigo !== salvo && r.nombre.toLowerCase() === nombre.toLowerCase()))
        throw new ErrorDemo("Ya hay un rol con ese nombre.", 409);
      return nombre;
    };
    if (!mr[1] && metodo === "POST") {
      const codigo = `extra-${Math.random().toString(16).slice(2, 10).padEnd(8, "0")}`;
      estado.rolesPropios.push({ codigo, nombre: validarNombre(body.nombre), modulos: limpiarLista(body.modulos) });
      return r(equipo());
    }
    const rol = estado.rolesPropios.find((x) => x.codigo === mr[1]);
    if (!rol) throw new ErrorDemo("Ese rol no existe.", 404);
    if (metodo === "PATCH") {
      if (body.nombre !== undefined) rol.nombre = validarNombre(body.nombre, rol.codigo);
      if (body.modulos !== undefined) rol.modulos = limpiarLista(body.modulos);
      return r(equipo());
    }
    if (metodo === "DELETE") {
      const n = estado.personas.filter((p) => p.rolPropio === rol.codigo).length;
      if (n > 0) throw new ErrorDemo(`Hay ${n === 1 ? "1 persona" : `${n} personas`} con este rol. Primero cambiales el rol.`, 409);
      estado.rolesPropios = estado.rolesPropios.filter((x) => x !== rol);
      return r(equipo());
    }
  }
  const m = /^\/equipo\/([\w-]+)(\/reenviar)?$/.exec(camino ?? "");
  if (m) {
    const p = estado.personas.find((x) => x.id === m[1]);
    if (!p) throw new ErrorDemo("Persona no encontrada.", 404);
    if (m[2]) return r(undefined);
    const actual = p.rolPropio ?? p.rol;
    if (body.rol && body.rol !== actual) {
      if (p.id === "demo-yo") throw new ErrorDemo("No podés quitarte el rol de Administrador a vos mismo.", 409);
      if (String(body.rol).startsWith("extra-")) {
        if (!estado.rolesPropios.some((x) => x.codigo === body.rol)) throw new ErrorDemo("Ese rol ya no existe en tu clínica.", 409);
        p.rol = "secretaria";
        p.rolPropio = String(body.rol);
      } else {
        p.rol = body.rol as RolClinica;
        p.rolPropio = null;
      }
      p.acceso = null;
    }
    if (body.activo === false) {
      if (p.id === "demo-yo") throw new ErrorDemo("No podés desactivarte a vos mismo.", 409);
      p.estado = "desactivada";
    }
    if (body.activo === true) p.estado = p.ultimoIngreso ? "activa" : "invitada";
    if ("modulos" in body) {
      if (p.rol === "admin") throw new ErrorDemo("El Administrador ve toda la clínica.", 409);
      const lista = body.modulos as string[] | null;
      p.acceso = lista === null ? null : TODOS.filter((m) => lista.includes(m) || SIEMPRE.includes(m));
    }
    return r(equipo());
  }
  throw new ErrorDemo("Esto no está disponible en el demo.", 404);
}
