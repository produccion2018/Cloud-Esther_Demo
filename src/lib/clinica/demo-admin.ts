import type { RolClinica } from "@/lib/clinica/api";

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
  { id: "demo-yo", nombre: "Dueña de la Clínica", email: "duenio@tuclinica.com", rol: "admin" },
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

type PersonaDemo = {
  id: string;
  nombre: string;
  email: string;
  rol: RolClinica;
  estado: "invitada" | "activa" | "desactivada";
  ultimoIngreso: string | null;
  acceso: string[] | null;
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
  return { personas, porRol, limite: 15 };
})();

const efectivos = (p: PersonaDemo) =>
  p.rol === "admin" ? null : (p.acceso ?? estado.porRol[p.rol as RolP] ?? PREDETERMINADOS[p.rol as RolP]);

function equipo() {
  const ocupan = estado.personas.filter((p) => p.estado !== "desactivada").length;
  return {
    personas: estado.personas.map((p) => ({
      id: p.id,
      nombre: p.nombre,
      email: p.email,
      rol: p.rol,
      rolNombre: NOMBRE_ROL[p.rol],
      estado: p.estado,
      ultimoIngreso: p.ultimoIngreso,
      soyYo: p.id === "demo-yo",
      modulos: efectivos(p),
      modulosRol: p.rol === "admin" ? [] : [...MAXIMOS[p.rol as RolP]],
      modulosPersonalizados: p.rol !== "admin" && p.acceso !== null,
    })),
    usados: ocupan,
    limite: estado.limite,
    plan: "PRO",
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
  const personas = estado.personas
    .filter((p) => !persona || p.id === persona)
    .map((p) => {
      const suyos = eventos.filter((e) => e.personaId === p.id);
      return {
        id: p.id,
        nombre: p.nombre,
        rol: p.rol,
        rolNombre: NOMBRE_ROL[p.rol],
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
        rol: (x.rol as RolClinica) ?? "asistente",
        estado: "invitada",
        ultimoIngreso: null,
        acceso: null,
      });
    }
    const e = equipo();
    return r(camino === "/equipo" ? e : { equipo: e, enviadas: lista.length, sinCorreo: [] });
  }
  const m = /^\/equipo\/([\w-]+)(\/reenviar)?$/.exec(camino ?? "");
  if (m) {
    const p = estado.personas.find((x) => x.id === m[1]);
    if (!p) throw new ErrorDemo("Persona no encontrada.", 404);
    if (m[2]) return r(undefined);
    if (body.rol && body.rol !== p.rol) {
      if (p.id === "demo-yo") throw new ErrorDemo("No podés quitarte el rol de Administrador a vos mismo.", 409);
      p.rol = body.rol as RolClinica;
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
      p.acceso = lista === null ? null : MAXIMOS[p.rol as RolP].filter((m) => lista.includes(m) || SIEMPRE.includes(m));
    }
    return r(equipo());
  }
  throw new ErrorDemo("Esto no está disponible en el demo.", 404);
}
