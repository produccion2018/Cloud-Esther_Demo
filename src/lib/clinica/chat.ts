import { useEffect, useSyncExternalStore } from "react";
import { pedirAClinica, nombrePersona, type RolClinica } from "@/lib/clinica/api";
import { clinicaReal } from "@/lib/clinica/modo-clinica";
import { EQUIPO_DEMO } from "@/lib/clinica/demo-admin";

/* Ubicación: src/lib/clinica/chat.ts
   COMUNICACIÓN INTERNA (estilo Teams) — todos los planes.
   - Clínica real: todo pasa por el servidor (/c/<clínica>/chat…). Los mensajes y archivos
     se guardan cifrados y cada clínica ve solo los suyos. Nada queda en el navegador.
   - Demo: la misma pantalla con una conversación de ejemplo (en memoria, se pierde al recargar). */

export type PermisosChat = { comunicados: boolean; canales: boolean; directos: boolean; archivos: boolean };
export type RolChat = Exclude<RolClinica, "admin">;
export type PersonaChat = { id: string; nombre: string; rol: RolClinica; rolNombre: string; estado: string };
export type CanalChat = {
  id: string;
  tipo: "general" | "area" | "directo";
  nombre: string;
  descripcion: string;
  area: string;
  miembros: string[];
  soyMiembro: boolean;
  puedoAdministrar: boolean;
  noLeidos: number;
  pendientes: number;
  ultimo: { autor: string; texto: string; tipo: "mensaje" | "comunicado"; fecha: string; archivo: boolean } | null;
  creado: string;
};
export type ResumenChat = {
  yo: { id: string; rol: RolClinica; permisos: PermisosChat };
  personas: PersonaChat[];
  canales: CanalChat[];
  permisosPorRol: Record<RolChat, PermisosChat> | null;
  avisos: { noLeidos: number; pendientes: number };
};
export type ArchivoChat = { id: string; nombre: string; tipo: string; tamano: number };
export type MensajeChat = {
  id: string;
  canalId: string;
  autor: { id: string; nombre: string };
  tipo: "mensaje" | "comunicado";
  texto: string;
  archivo: ArchivoChat | null;
  fecha: string;
  quitado: boolean;
  mio: boolean;
  confirmaciones: {
    yoConfirme: boolean;
    leyeron: { id: string; nombre: string; fecha: string }[];
    faltan: { id: string; nombre: string }[];
  } | null;
};
export type AvisosChat = {
  noLeidos: number;
  pendientes: number;
  ultimo: { id: string; canalId: string; autor: string; texto: string; tipo: "mensaje" | "comunicado"; fecha: string } | null;
};
export type ArchivoNuevo = { nombre: string; tipo: string; contenido: string };

export const ARCHIVO_MAX_BYTES = 5 * 1024 * 1024;
export const TIPOS_ARCHIVO = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
export const AREAS_SUGERIDAS = ["Recepción", "Clínica", "Laboratorio", "Esterilización", "Administración", "Dirección"];

export const PERMISOS_CHAT_INFO: { id: keyof PermisosChat; titulo: string; detalle: string }[] = [
  { id: "comunicados", titulo: "Mandar comunicados", detalle: "A toda la clínica o a personas, con confirmación de lectura" },
  { id: "canales", titulo: "Crear canales", detalle: "Canales por área (Recepción, Clínica…)" },
  { id: "directos", titulo: "Mensajes privados", detalle: "Escribirle a cualquier compañero (al Administrador siempre se puede)" },
  { id: "archivos", titulo: "Compartir archivos", detalle: "Imágenes, PDF, Word, Excel (hasta 5 MB)" },
];

/** ¿Es una clínica real con servidor? (si no, es el demo) */
const slugReal = () => clinicaReal()?.slug ?? null;

/* ───────────── Cambios (para refrescar todas las pantallas a la vez) ───────────── */
let version = 0;
const oyentes = new Set<() => void>();
export function avisarCambioChat() {
  version++;
  oyentes.forEach((o) => o());
}
export function useVersionChat() {
  return useSyncExternalStore(
    (cb) => {
      oyentes.add(cb);
      return () => oyentes.delete(cb);
    },
    () => version,
    () => 0,
  );
}

/* ───────────── Clínica real: servidor ───────────── */
const conNombres = (r: ResumenChat): ResumenChat => ({
  ...r,
  personas: r.personas.map((p) => ({ ...p, nombre: nombrePersona(p.nombre) })),
  canales: r.canales.map((c) => (c.tipo === "directo" ? { ...c, nombre: nombrePersona(c.nombre) } : c)),
});
const mensajesProlijos = (m: MensajeChat): MensajeChat => ({
  ...m,
  autor: { ...m.autor, nombre: nombrePersona(m.autor.nombre) },
  confirmaciones: m.confirmaciones
    ? {
        ...m.confirmaciones,
        leyeron: m.confirmaciones.leyeron.map((x) => ({ ...x, nombre: nombrePersona(x.nombre) })),
        faltan: m.confirmaciones.faltan.map((x) => ({ ...x, nombre: nombrePersona(x.nombre) })),
      }
    : null,
});

export async function verChat(): Promise<ResumenChat> {
  const slug = slugReal();
  if (!slug) return demo.resumen();
  return conNombres(await pedirAClinica<ResumenChat>(slug, "GET", "/chat"));
}

export async function verMensajes(canalId: string, antes?: string): Promise<{ mensajes: MensajeChat[]; hayMas: boolean }> {
  const slug = slugReal();
  if (!slug) return demo.mensajes(canalId);
  const q = antes ? `?antes=${encodeURIComponent(antes)}` : "";
  const r = await pedirAClinica<{ mensajes: MensajeChat[]; hayMas: boolean }>(
    slug,
    "GET",
    `/chat/canales/${encodeURIComponent(canalId)}/mensajes${q}`,
  );
  return { ...r, mensajes: r.mensajes.map(mensajesProlijos) };
}

export async function enviarMensaje(
  canalId: string,
  datos: { texto: string; tipo: "mensaje" | "comunicado"; archivo?: ArchivoNuevo | undefined },
): Promise<MensajeChat> {
  const slug = slugReal();
  const m = slug
    ? mensajesProlijos(
        await pedirAClinica<MensajeChat>(slug, "POST", `/chat/canales/${encodeURIComponent(canalId)}/mensajes`, datos),
      )
    : demo.enviar(canalId, datos);
  avisarCambioChat();
  return m;
}

export async function enviarComunicado(datos: {
  texto: string;
  destino: "todos" | string[];
  archivo?: ArchivoNuevo | undefined;
}): Promise<{ enviados: number; canales: string[] }> {
  const slug = slugReal();
  const r = slug
    ? await pedirAClinica<{ enviados: number; canales: string[] }>(slug, "POST", "/chat/comunicados", datos)
    : demo.comunicado(datos);
  avisarCambioChat();
  return r;
}

export async function confirmarLectura(mensajeId: string): Promise<void> {
  const slug = slugReal();
  if (slug) await pedirAClinica(slug, "POST", `/chat/mensajes/${encodeURIComponent(mensajeId)}/confirmar`, {});
  else demo.confirmar(mensajeId);
  avisarCambioChat();
}

export async function quitarMensaje(mensajeId: string): Promise<void> {
  const slug = slugReal();
  if (slug) await pedirAClinica(slug, "DELETE", `/chat/mensajes/${encodeURIComponent(mensajeId)}`);
  else demo.quitar(mensajeId);
  avisarCambioChat();
}

export async function abrirDirecto(personaId: string): Promise<string> {
  const slug = slugReal();
  const id = slug
    ? (await pedirAClinica<{ id: string }>(slug, "POST", "/chat/directos", { persona: personaId })).id
    : demo.directo(personaId);
  avisarCambioChat();
  return id;
}

export async function crearCanal(datos: { nombre: string; descripcion: string; area: string; miembros: string[] }): Promise<string> {
  const slug = slugReal();
  const id = slug ? (await pedirAClinica<{ id: string }>(slug, "POST", "/chat/canales", datos)).id : demo.crearCanal(datos);
  avisarCambioChat();
  return id;
}

export async function cambiarCanal(
  canalId: string,
  datos: { nombre?: string; descripcion?: string; area?: string; miembros?: string[]; archivar?: boolean },
): Promise<void> {
  const slug = slugReal();
  if (slug) await pedirAClinica(slug, "PATCH", `/chat/canales/${encodeURIComponent(canalId)}`, datos);
  else demo.cambiarCanal(canalId, datos);
  avisarCambioChat();
}

export async function guardarPermisosChat(p: Record<RolChat, PermisosChat>): Promise<Record<RolChat, PermisosChat>> {
  const slug = slugReal();
  const r = slug
    ? await pedirAClinica<Record<RolChat, PermisosChat>>(slug, "PUT", "/chat/permisos", p)
    : demo.permisos(p);
  avisarCambioChat();
  return r;
}

export async function bajarArchivo(a: ArchivoChat): Promise<void> {
  const slug = slugReal();
  let contenido: string;
  let tipo = a.tipo;
  if (slug) {
    const r = await pedirAClinica<{ nombre: string; tipo: string; contenido: string }>(
      slug,
      "GET",
      `/chat/archivos/${encodeURIComponent(a.id)}`,
    );
    contenido = r.contenido;
    tipo = r.tipo;
  } else {
    contenido = demo.archivo(a.id);
  }
  const bin = atob(contenido);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const url = URL.createObjectURL(new Blob([bytes], { type: tipo }));
  const link = document.createElement("a");
  link.href = url;
  link.download = a.nombre;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

/** Lee un archivo elegido y lo deja listo para mandar (base64). Devuelve el problema si no se puede. */
export async function prepararArchivo(f: File): Promise<ArchivoNuevo | string> {
  const tipo = f.type || (/\.csv$/i.test(f.name) ? "text/csv" : /\.txt$/i.test(f.name) ? "text/plain" : "");
  if (!TIPOS_ARCHIVO.includes(tipo)) return "Ese tipo de archivo no se puede compartir. Usá imágenes, PDF, Word, Excel o texto.";
  if (f.size === 0) return "El archivo está vacío.";
  if (f.size > ARCHIVO_MAX_BYTES) return "El archivo pesa más de 5 MB.";
  const buf = new Uint8Array(await f.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { nombre: f.name, tipo, contenido: btoa(bin) };
}

export const pesoArchivo = (b: number) =>
  b < 1024 ? `${b} B` : b < 1024 * 1024 ? `${Math.round(b / 1024)} KB` : `${(b / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;

/* ───────────── Avisos: la pantalla pregunta cada tanto si hay mensajes nuevos ───────────── */
let avisos: AvisosChat = { noLeidos: 0, pendientes: 0, ultimo: null };
const oyentesAvisos = new Set<() => void>();
let ultimoVisto: string | null = null;
let reloj: ReturnType<typeof setInterval> | null = null;
let usuarios = 0;
type AlLlegar = (a: NonNullable<AvisosChat["ultimo"]>) => void;
const alLlegar = new Set<AlLlegar>();

async function consultarAvisos() {
  const slug = slugReal();
  try {
    const nuevo = slug ? await pedirAClinica<AvisosChat>(slug, "GET", "/chat/avisos") : demo.avisos();
    const anterior = ultimoVisto;
    avisos = nuevo;
    if (nuevo.ultimo && nuevo.ultimo.id !== anterior) {
      ultimoVisto = nuevo.ultimo.id;
      // La primera consulta no avisa (solo lo que llega mientras la persona trabaja)
      if (anterior !== null || version > 0) alLlegar.forEach((f) => f(nuevo.ultimo!));
    }
    if (!nuevo.ultimo && ultimoVisto === null) ultimoVisto = "";
    oyentesAvisos.forEach((o) => o());
  } catch {
    /* sin conexión: se vuelve a probar en el próximo turno */
  }
}

/** Cantidad de mensajes sin leer y comunicados por confirmar (se actualiza solo cada 25 s). */
export function useAvisosChat(onNuevo?: AlLlegar): AvisosChat {
  const v = useVersionChat();
  useEffect(() => {
    usuarios++;
    if (!reloj && typeof window !== "undefined") {
      void consultarAvisos();
      reloj = setInterval(() => {
        if (document.visibilityState === "visible") void consultarAvisos();
      }, 25_000);
    }
    return () => {
      usuarios--;
      if (usuarios === 0 && reloj) {
        clearInterval(reloj);
        reloj = null;
      }
    };
  }, []);
  useEffect(() => {
    if (v > 0) void consultarAvisos();
  }, [v]);
  useEffect(() => {
    if (!onNuevo) return;
    alLlegar.add(onNuevo);
    return () => {
      alLlegar.delete(onNuevo);
    };
  }, [onNuevo]);
  return useSyncExternalStore(
    (cb) => {
      oyentesAvisos.add(cb);
      return () => oyentesAvisos.delete(cb);
    },
    () => avisos,
    () => avisos,
  );
}

/* ───────────── DEMO: una conversación de ejemplo (en memoria) ───────────── */
const demo = (() => {
  const NOMBRE_ROL: Record<RolClinica, string> = {
    admin: "Administrador",
    odontologo: "Odontólogo/a",
    secretaria: "Secretaría",
    asistente: "Asistente",
  };
  const YO = "demo-yo";
  const personas: PersonaChat[] = EQUIPO_DEMO.map((p) => ({ id: p.id, nombre: p.nombre, rol: p.rol, rolNombre: NOMBRE_ROL[p.rol], estado: "activa" }));
  const otros = personas.filter((p) => p.id !== YO);
  const hace = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
  let permisos: Record<RolChat, PermisosChat> = {
    odontologo: { comunicados: false, canales: false, directos: true, archivos: true },
    secretaria: { comunicados: false, canales: false, directos: true, archivos: true },
    asistente: { comunicados: false, canales: false, directos: true, archivos: true },
  };
  type CanalDemo = Omit<CanalChat, "noLeidos" | "pendientes" | "ultimo" | "soyMiembro" | "puedoAdministrar"> & { leido: string };
  const recepcionistas = otros.filter((p) => p.rol === "secretaria" || p.rol === "asistente").map((p) => p.id);
  const clinicos = otros.filter((p) => p.rol === "odontologo" || p.rol === "asistente").map((p) => p.id);
  const canales: CanalDemo[] = [
    { id: "demo-general", tipo: "general", nombre: "General", descripcion: "Toda la clínica", area: "", miembros: personas.map((p) => p.id), creado: hace(9000), leido: hace(200) },
    { id: "demo-recepcion", tipo: "area", nombre: "Recepción", descripcion: "Turnos, llamados y sala de espera", area: "Recepción", miembros: [YO, ...recepcionistas], creado: hace(8000), leido: hace(30) },
    { id: "demo-clinica", tipo: "area", nombre: "Clínica", descripcion: "Casos, interconsultas y materiales", area: "Clínica", miembros: [YO, ...clinicos], creado: hace(7000), leido: hace(400) },
  ];
  if (otros[0]) canales.push({ id: `demo-dm-${otros[0].id}`, tipo: "directo", nombre: otros[0].nombre, descripcion: "", area: "", miembros: [YO, otros[0].id], creado: hace(600), leido: hace(100) });
  const pid = (i: number) => otros[i % Math.max(1, otros.length)]?.id ?? YO;
  const nom = (id: string) => personas.find((p) => p.id === id)?.nombre ?? "Persona";
  type MsgDemo = { id: string; canalId: string; autor: string; tipo: "mensaje" | "comunicado"; texto: string; archivo: ArchivoChat | null; fecha: string; quitado: boolean; acks: Record<string, string> };
  let seq = 0;
  const m = (canalId: string, autor: string, texto: string, min: number, extra: Partial<MsgDemo> = {}): MsgDemo => ({
    id: `demo-m${++seq}`, canalId, autor, tipo: "mensaje", texto, archivo: null, fecha: hace(min), quitado: false, acks: {}, ...extra,
  });
  const archivos: Record<string, string> = { "demo-a1": btoa("Protocolo de esterilizacion (ejemplo del demo)") };
  const mensajes: MsgDemo[] = [
    m("demo-general", YO, "¡Bienvenidos a la comunicación interna de la clínica! Acá van los avisos importantes y las novedades del día.", 600, {
      tipo: "comunicado",
      acks: Object.fromEntries(otros.slice(0, 3).map((p, i) => [p.id, hace(590 - i * 20)])),
    }),
    m("demo-general", pid(0), "¡Genial! Ya lo vi 👌", 580),
    m("demo-general", YO, "Recordatorio: el viernes cerramos a las 16 hs por capacitación. Confirmen que lo leyeron, por favor.", 120, {
      tipo: "comunicado",
      acks: Object.fromEntries(otros.slice(0, 2).map((p, i) => [p.id, hace(100 - i * 10)])),
    }),
    m("demo-recepcion", "demo-4", "Llegó Mauro Pinto para su control de las 10:30, lo hago pasar a sala de espera.", 45),
    m("demo-recepcion", YO, "Perfecto, avisale que en 5 minutos lo atiende la Dra. Becerra.", 43),
    m("demo-recepcion", "demo-4", "Alejo Becerra pidió pasar su limpieza al jueves a las 15 hs. Ya lo cambié en la agenda ✅", 12),
    m("demo-clinica", "demo-1", "Mauro Pinto: le actualicé el odontograma después del control. Queda pendiente la restauración de la 16.", 420),
    m("demo-clinica", "demo-5", "Les comparto el protocolo actualizado de esterilización.", 380, {
      archivo: { id: "demo-a1", nombre: "protocolo-esterilizacion.pdf", tipo: "application/pdf", tamano: 182_400 },
    }),
    m("demo-clinica", "demo-2", "Gracias Lucía, lo imprimo para el gabinete 2. Mañana evalúo el implante de Alejo Becerra.", 360),
  ];
  if (otros[0]) mensajes.push(m(`demo-dm-${otros[0].id}`, otros[0].id, "¿Mañana puedo entrar 30 minutos más tarde? El primer turno es Mauro Pinto a las 10:30, llego bien.", 90));

  const visible = (c: CanalDemo) => c.tipo !== "directo" || c.miembros.includes(YO);
  const aDto = (x: MsgDemo): MensajeChat => {
    const canal = canales.find((c) => c.id === x.canalId);
    const dest = (canal?.miembros ?? []).filter((id) => id !== x.autor);
    return {
      id: x.id,
      canalId: x.canalId,
      autor: { id: x.autor, nombre: nom(x.autor) },
      tipo: x.tipo,
      texto: x.quitado ? "" : x.texto,
      archivo: x.quitado ? null : x.archivo,
      fecha: x.fecha,
      quitado: x.quitado,
      mio: x.autor === YO,
      confirmaciones:
        x.tipo === "comunicado" && !x.quitado
          ? {
              yoConfirme: !!x.acks[YO],
              leyeron: Object.entries(x.acks).map(([id, fecha]) => ({ id, nombre: nom(id), fecha })),
              faltan: dest.filter((id) => !x.acks[id]).map((id) => ({ id, nombre: nom(id) })),
            }
          : null,
    };
  };
  const nuevoMsg = (canalId: string, d: { texto: string; tipo: "mensaje" | "comunicado"; archivo?: ArchivoNuevo | undefined }) => {
    let archivo: ArchivoChat | null = null;
    if (d.archivo) {
      const id = `demo-a${++seq}`;
      archivos[id] = d.archivo.contenido;
      archivo = { id, nombre: d.archivo.nombre, tipo: d.archivo.tipo, tamano: Math.round((d.archivo.contenido.length * 3) / 4) };
    }
    const x = m(canalId, YO, d.texto, 0, { tipo: d.tipo, archivo });
    mensajes.push(x);
    const c = canales.find((k) => k.id === canalId);
    if (c) c.leido = new Date().toISOString();
    return x;
  };
  return {
    resumen(): ResumenChat {
      const lista = canales.filter(visible).map((c) => {
        const suyos = mensajes.filter((x) => x.canalId === c.id && !x.quitado);
        const ult = suyos[suyos.length - 1];
        return {
          ...c,
          soyMiembro: true,
          puedoAdministrar: c.tipo === "area",
          noLeidos: suyos.filter((x) => x.autor !== YO && x.fecha > c.leido).length,
          pendientes: suyos.filter((x) => x.tipo === "comunicado" && x.autor !== YO && !x.acks[YO]).length,
          ultimo: ult
            ? { autor: ult.autor === YO ? "Vos" : nom(ult.autor), texto: ult.texto.slice(0, 140), tipo: ult.tipo, fecha: ult.fecha, archivo: !!ult.archivo }
            : null,
        };
      });
      return {
        yo: { id: YO, rol: "admin", permisos: { comunicados: true, canales: true, directos: true, archivos: true } },
        personas,
        canales: lista,
        permisosPorRol: permisos,
        avisos: { noLeidos: lista.reduce((s, c) => s + c.noLeidos, 0), pendientes: lista.reduce((s, c) => s + c.pendientes, 0) },
      };
    },
    mensajes(canalId: string) {
      const c = canales.find((k) => k.id === canalId);
      if (c) c.leido = new Date().toISOString();
      return { mensajes: mensajes.filter((x) => x.canalId === canalId).map(aDto), hayMas: false };
    },
    enviar(canalId: string, d: { texto: string; tipo: "mensaje" | "comunicado"; archivo?: ArchivoNuevo | undefined }) {
      return aDto(nuevoMsg(canalId, d));
    },
    comunicado(d: { texto: string; destino: "todos" | string[]; archivo?: ArchivoNuevo | undefined }) {
      if (d.destino === "todos") {
        nuevoMsg("demo-general", { texto: d.texto, tipo: "comunicado", archivo: d.archivo });
        return { enviados: 1, canales: ["demo-general"] };
      }
      const ids = d.destino.map((p) => this.directo(p));
      ids.forEach((id) => nuevoMsg(id, { texto: d.texto, tipo: "comunicado", archivo: d.archivo }));
      return { enviados: ids.length, canales: ids };
    },
    confirmar(id: string) {
      const x = mensajes.find((k) => k.id === id);
      if (x) x.acks[YO] = new Date().toISOString();
    },
    quitar(id: string) {
      const x = mensajes.find((k) => k.id === id);
      if (x) x.quitado = true;
    },
    directo(personaId: string) {
      const id = `demo-dm-${personaId}`;
      if (!canales.some((c) => c.id === id)) {
        canales.push({ id, tipo: "directo", nombre: nom(personaId), descripcion: "", area: "", miembros: [YO, personaId], creado: new Date().toISOString(), leido: new Date().toISOString() });
      }
      return id;
    },
    crearCanal(d: { nombre: string; descripcion: string; area: string; miembros: string[] }) {
      const id = `demo-c${++seq}`;
      canales.push({ id, tipo: "area", nombre: d.nombre, descripcion: d.descripcion, area: d.area, miembros: [...new Set([YO, ...d.miembros])], creado: new Date().toISOString(), leido: new Date().toISOString() });
      return id;
    },
    cambiarCanal(id: string, d: { nombre?: string; descripcion?: string; area?: string; miembros?: string[]; archivar?: boolean }) {
      const c = canales.find((k) => k.id === id);
      if (!c) return;
      if (d.nombre !== undefined) c.nombre = d.nombre;
      if (d.descripcion !== undefined) c.descripcion = d.descripcion;
      if (d.area !== undefined) c.area = d.area;
      if (d.miembros !== undefined) c.miembros = [...new Set([YO, ...d.miembros])];
      if (d.archivar) canales.splice(canales.indexOf(c), 1);
    },
    permisos(p: Record<RolChat, PermisosChat>) {
      permisos = p;
      return permisos;
    },
    archivo(id: string) {
      return archivos[id] ?? btoa("Archivo de ejemplo");
    },
    avisos(): AvisosChat {
      const r = this.resumen();
      return { noLeidos: r.avisos.noLeidos, pendientes: r.avisos.pendientes, ultimo: null };
    },
  };
})();
