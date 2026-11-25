import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { leerSesion } from "@/lib/admin/sesion";
import { ARTICULOS_INICIALES } from "./articulos-iniciales";

/* Ubicación: src/lib/blog/blog.ts
   Blog público de Cloud Esther (pestaña «Blog» de la web) y su administración desde el panel
   (/admin/blog, permiso «Redes, marketing y blog»).

   ─── Con backend (VITE_ADMIN_API_URL) ───
   GET  /blog · GET /blog/:slug            → web pública (solo publicados)
   GET  /admin/blog · GET /admin/blog/:id   → panel (todos, también borradores)
   POST /admin/blog · PUT/DELETE /admin/blog/:id
   POST /admin/blog/imagenes/firma          → subir la portada a Cloudinary (si está configurado)

   ─── Sin backend ───
   Todo se guarda en este navegador (una sola clave, compartida por la web y el panel porque son
   la misma aplicación): lo que se cambia en el panel se ve al instante en /blog. */

export type EstadoArticulo = "draft" | "published";

export type ArticuloBlog = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  /** Texto con formato simple: «## Título», «### Subtítulo», «- lista», «1. lista», «> cita», **negrita**. */
  content?: string;
  coverUrl: string | null;
  coverAlt: string;
  authorName: string;
  authorRole: string;
  status: EstadoArticulo;
  featured: boolean;
  publishedAt: string | null;
  updatedAt: string;
  readingMinutes?: number;
};

export type CambiosArticulo = Omit<ArticuloBlog, "id" | "updatedAt" | "readingMinutes">;

export const CATEGORIAS_BLOG = [
  "Odontología digital",
  "Gestión de la clínica",
  "Clínica",
  "Inteligencia artificial",
  "Seguridad y datos",
  "Marketing dental",
  "Novedades",
];

const API_URL = (import.meta.env["VITE_ADMIN_API_URL"] as string | undefined)?.replace(/\/$/, "");
export const BLOG_CON_BACKEND = Boolean(API_URL);

/* ───────────── Utilidades ───────────── */

export function minutosLectura(a: { content?: string | undefined; readingMinutes?: number | undefined }) {
  if (a.readingMinutes) return a.readingMinutes;
  const palabras = (a.content ?? "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palabras / 200));
}

export function slugify(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/g, "");
}

export function fechaLarga(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
}

const publicado = (a: ArticuloBlog) =>
  a.status === "published" && !!a.publishedAt && new Date(a.publishedAt).getTime() <= Date.now();

function ordenar(lista: ArticuloBlog[]) {
  return [...lista].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt);
  });
}

/* ───────────── Modo sin backend: guardado en el navegador ───────────── */

const CLAVE = "cloud-esther:blog";
const oyentes = new Set<() => void>();
let cache: ArticuloBlog[] | null = null;

function leerLocal(): ArticuloBlog[] {
  if (cache) return cache;
  if (typeof window === "undefined") return ARTICULOS_INICIALES;
  try {
    const raw = window.localStorage.getItem(CLAVE);
    cache = raw ? (JSON.parse(raw) as ArticuloBlog[]) : ARTICULOS_INICIALES;
  } catch {
    cache = ARTICULOS_INICIALES;
  }
  return cache;
}

function escribirLocal(lista: ArticuloBlog[]) {
  cache = lista;
  try {
    window.localStorage.setItem(CLAVE, JSON.stringify(lista));
  } catch {
    throw new Error("No hay espacio en este navegador para guardar la imagen. Probá con una más chica.");
  }
  oyentes.forEach((o) => o());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== CLAVE) return;
    cache = null;
    oyentes.forEach((o) => o());
  });
}

function useLocal() {
  return useSyncExternalStore(
    (cb) => {
      oyentes.add(cb);
      return () => oyentes.delete(cb);
    },
    leerLocal,
    () => ARTICULOS_INICIALES,
  );
}

/* ───────────── Pedidos al backend ───────────── */

async function http<T>(metodo: string, ruta: string, cuerpo?: unknown, conSesion = false): Promise<T> {
  const token = conSesion ? leerSesion()?.token : undefined;
  const r = await fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers: {
      ...(cuerpo !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
  });
  if (!r.ok) {
    const texto = await r.text().catch(() => "");
    let mensaje = texto;
    try {
      const j = JSON.parse(texto) as { message?: string; error?: string };
      mensaje = j.message ?? j.error ?? texto;
    } catch {
      /* texto plano */
    }
    const e = new Error(mensaje || `Error ${r.status}`) as Error & { status?: number };
    e.status = r.status;
    throw e;
  }
  return (r.status === 204 ? undefined : await r.json()) as T;
}

/* ───────────── Web pública ───────────── */

type Carga<T> = { datos: T; cargando: boolean; error: string | null };

/** Lista de artículos publicados (sin el texto completo). */
export function useArticulosPublicos(): Carga<ArticuloBlog[]> {
  const local = useLocal();
  const [estado, setEstado] = useState<Carga<ArticuloBlog[]>>({ datos: [], cargando: BLOG_CON_BACKEND, error: null });

  useEffect(() => {
    if (!BLOG_CON_BACKEND) return;
    let vivo = true;
    http<ArticuloBlog[]>("GET", "/blog")
      .then((d) => vivo && setEstado({ datos: d, cargando: false, error: null }))
      .catch(() => vivo && setEstado({ datos: [], cargando: false, error: "No pudimos cargar los artículos." }));
    return () => {
      vivo = false;
    };
  }, []);

  if (!BLOG_CON_BACKEND) return { datos: ordenar(local.filter(publicado)), cargando: false, error: null };
  return estado;
}

/** Un artículo publicado, con el texto completo. null = no existe (o es un borrador). */
export function useArticuloPublico(slug: string): Carga<ArticuloBlog | null> {
  const local = useLocal();
  const [estado, setEstado] = useState<Carga<ArticuloBlog | null>>({ datos: null, cargando: BLOG_CON_BACKEND, error: null });

  useEffect(() => {
    if (!BLOG_CON_BACKEND) return;
    let vivo = true;
    setEstado({ datos: null, cargando: true, error: null });
    http<ArticuloBlog>("GET", `/blog/${encodeURIComponent(slug)}`)
      .then((d) => vivo && setEstado({ datos: d, cargando: false, error: null }))
      .catch((e: Error & { status?: number }) =>
        vivo && setEstado({ datos: null, cargando: false, error: e.status === 404 ? null : "No pudimos cargar el artículo." }),
      );
    return () => {
      vivo = false;
    };
  }, [slug]);

  if (!BLOG_CON_BACKEND) {
    return { datos: local.find((a) => a.slug === slug && publicado(a)) ?? null, cargando: false, error: null };
  }
  return estado;
}

/* ───────────── Panel ───────────── */

/** Todos los artículos (también borradores) para el panel. */
export function useArticulosPanel() {
  const local = useLocal();
  const [remoto, setRemoto] = useState<ArticuloBlog[]>([]);
  const [cargando, setCargando] = useState(BLOG_CON_BACKEND);
  const [error, setError] = useState<string | null>(null);

  const recargar = useCallback(async () => {
    if (!BLOG_CON_BACKEND) return;
    setCargando(true);
    try {
      setRemoto(await http<ArticuloBlog[]>("GET", "/admin/blog", undefined, true));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos cargar los artículos.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const lista = BLOG_CON_BACKEND
    ? remoto
    : [...local].sort((a, b) => (b.publishedAt ?? b.updatedAt).localeCompare(a.publishedAt ?? a.updatedAt));
  return { articulos: lista, cargando, error, recargar };
}

/** Un artículo completo (para editarlo). */
export async function obtenerArticulo(id: string): Promise<ArticuloBlog> {
  if (BLOG_CON_BACKEND) return http<ArticuloBlog>("GET", `/admin/blog/${id}`, undefined, true);
  const a = leerLocal().find((x) => x.id === id);
  if (!a) throw new Error("No encontramos ese artículo.");
  return a;
}

function slugLibreLocal(base: string, exceptoId?: string) {
  const lista = leerLocal();
  const limpio = base || "articulo";
  for (let i = 0; i < 100; i++) {
    const c = i === 0 ? limpio : `${limpio}-${i + 1}`;
    if (!lista.some((a) => a.slug === c && a.id !== exceptoId)) return c;
  }
  return `${limpio}-${Date.now()}`;
}

/** Crea (sin id) o actualiza (con id) un artículo. */
export async function guardarArticulo(cambios: CambiosArticulo, id?: string): Promise<ArticuloBlog> {
  if (BLOG_CON_BACKEND) {
    return id
      ? http<ArticuloBlog>("PUT", `/admin/blog/${id}`, cambios, true)
      : http<ArticuloBlog>("POST", "/admin/blog", cambios, true);
  }
  const ahora = new Date().toISOString();
  const lista = leerLocal();
  const anterior = id ? lista.find((a) => a.id === id) : undefined;
  const publishedAt =
    cambios.status === "published"
      ? (cambios.publishedAt ?? anterior?.publishedAt ?? ahora)
      : (cambios.publishedAt ?? anterior?.publishedAt ?? null);
  const nuevo: ArticuloBlog = {
    ...cambios,
    id: id ?? `art-${Date.now().toString(36)}`,
    slug: slugLibreLocal(cambios.slug || slugify(cambios.title), id),
    coverUrl: cambios.coverUrl || null,
    publishedAt,
    updatedAt: ahora,
  };
  let siguiente = id ? lista.map((a) => (a.id === id ? nuevo : a)) : [nuevo, ...lista];
  if (nuevo.featured) siguiente = siguiente.map((a) => (a.id === nuevo.id ? a : { ...a, featured: false }));
  escribirLocal(siguiente);
  return nuevo;
}

export async function borrarArticulo(id: string): Promise<void> {
  if (BLOG_CON_BACKEND) {
    await http<void>("DELETE", `/admin/blog/${id}`, undefined, true);
    return;
  }
  escribirLocal(leerLocal().filter((a) => a.id !== id));
}

/** Vuelve a los artículos iniciales (solo sin backend: para la demo del panel). */
export function restablecerBlogLocal() {
  escribirLocal(ARTICULOS_INICIALES);
}

/* ───────────── Imágenes ───────────── */

/** Achica y comprime una foto en el navegador (máx. 1600 px de ancho, ≈ 700 KB). */
export async function comprimirImagen(archivo: File, anchoMax = 1600): Promise<string> {
  if (!/^image\/(jpeg|png|webp)$/.test(archivo.type)) {
    throw new Error("Subí una imagen JPG, PNG o WebP.");
  }
  const url = URL.createObjectURL(archivo);
  try {
    const img = await new Promise<HTMLImageElement>((ok, mal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => mal(new Error("No pudimos leer la imagen."));
      i.src = url;
    });
    let ancho = Math.min(anchoMax, img.naturalWidth);
    let calidad = 0.84;
    for (let intento = 0; intento < 6; intento++) {
      const alto = Math.round((img.naturalHeight * ancho) / img.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = ancho;
      canvas.height = alto;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No pudimos procesar la imagen.");
      ctx.drawImage(img, 0, 0, ancho, alto);
      const dato = canvas.toDataURL("image/jpeg", calidad);
      if (dato.length <= 950_000) return dato;
      ancho = Math.round(ancho * 0.8);
      calidad = Math.max(0.6, calidad - 0.06);
    }
    throw new Error("La imagen es demasiado pesada. Probá con una más chica.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

type Firma = { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string };

/**
 * Sube una imagen para el blog y devuelve la dirección para guardar en el artículo.
 * Con backend: SIEMPRE a Cloudinary (nunca se guardan imágenes en la base de datos). Si Cloudinary
 * no está configurado, avisa y no la guarda.
 * Sin backend (panel de demostración, todo en este navegador): la comprime y queda en el navegador.
 */
export async function subirImagenBlog(archivo: File): Promise<string> {
  if (archivo.size > 15 * 1024 * 1024) throw new Error("La imagen pesa más de 15 MB.");
  if (!/^image\/(jpeg|png|webp|gif|avif)$/.test(archivo.type)) throw new Error("Subí una imagen JPG, PNG o WebP.");
  if (!BLOG_CON_BACKEND) return comprimirImagen(archivo);
  let firma: Firma;
  try {
    firma = await http<Firma>("POST", "/admin/blog/imagenes/firma", undefined, true);
  } catch (e) {
    if ((e as { status?: number }).status === 503) {
      throw new Error("Las imágenes se guardan en Cloudinary y todavía no está configurado. Cargá las llaves de Cloudinary en el servidor.");
    }
    throw e;
  }
  const form = new FormData();
  form.append("file", archivo);
  form.append("api_key", firma.apiKey);
  form.append("timestamp", String(firma.timestamp));
  form.append("signature", firma.signature);
  form.append("folder", firma.folder);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${firma.cloudName}/image/upload`, { method: "POST", body: form });
  if (!r.ok) throw new Error("No se pudo subir la imagen. Probá de nuevo.");
  const j = (await r.json()) as { secure_url?: string };
  if (!j.secure_url) throw new Error("No se pudo subir la imagen. Probá de nuevo.");
  return j.secure_url.replace("/upload/", "/upload/f_auto,q_auto,w_1600/");
}
