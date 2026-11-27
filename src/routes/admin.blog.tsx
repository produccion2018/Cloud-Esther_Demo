import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  Bold,
  Eye,
  EyeOff,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Pencil,
  Plus,
  Quote,
  RotateCcw,
  Search,
  Send,
  Pin,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Cargando, KpiCard, Seccion, Vacio } from "@/components/admin/bits";
import { Campo, INPUT, Pestanas, Pildora, confirmar } from "@/components/admin/formularios";
import { RestrictedView } from "@/components/admin/restricted";
import { canAccess, useRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { ContenidoArticulo } from "@/components/blog/ContenidoArticulo";
import { PortadaBlog } from "@/components/blog/PortadaBlog";
import { Button } from "@/components/ui/button";
import {
  BLOG_CON_BACKEND,
  CATEGORIAS_BLOG,
  borrarArticulo,
  fechaLarga,
  guardarArticulo,
  minutosLectura,
  obtenerArticulo,
  restablecerBlogLocal,
  slugify,
  subirImagenBlog,
  useArticulosPanel,
  type ArticuloBlog,
  type CambiosArticulo,
} from "@/lib/blog/blog";
import { cn } from "@/lib/utils";

/* Ubicación: src/routes/admin.blog.tsx
   Blog de la web pública (/blog), administrado desde el panel. Lo usan quienes tienen el permiso
   «Redes, marketing y blog» (Dueño, Socio con ese permiso, Asistente / Secretaría).
   Crear, editar, cambiar la portada y las imágenes, destacar, publicar o pasar a borrador y borrar. */

export const Route = createFileRoute("/admin/blog")({
  head: () => ({
    meta: [
      { title: "Blog — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: BlogPanel,
});

type Filtro = "todos" | "published" | "draft";

const VACIO: CambiosArticulo = {
  slug: "",
  title: "",
  excerpt: "",
  category: CATEGORIAS_BLOG[0] ?? "Novedades",
  tags: [],
  content: "",
  coverUrl: null,
  coverAlt: "",
  authorName: "Equipo Cloud Esther",
  authorRole: "",
  status: "draft",
  featured: false,
  publishedAt: null,
};

function BlogPanel() {
  const { role } = useRole();
  const { articulos, cargando, error, recargar } = useArticulosPanel();
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [editando, setEditando] = useState<ArticuloBlog | "nuevo" | null>(null);
  const [abriendo, setAbriendo] = useState<string | null>(null);

  if (!canAccess(role, "/admin/blog")) return <RestrictedView />;

  const publicados = articulos.filter((a) => a.status === "published").length;
  const borradores = articulos.length - publicados;
  const destacado = articulos.find((a) => a.featured);

  const q = busqueda.trim().toLowerCase();
  const filas = articulos.filter(
    (a) =>
      (filtro === "todos" || a.status === filtro) &&
      (!q || `${a.title} ${a.category} ${a.tags.join(" ")}`.toLowerCase().includes(q)),
  );

  const abrir = async (a: ArticuloBlog) => {
    setAbriendo(a.id);
    try {
      setEditando(await obtenerArticulo(a.id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo abrir el artículo.");
    } finally {
      setAbriendo(null);
    }
  };

  const cambioRapido = async (a: ArticuloBlog, cambios: Partial<CambiosArticulo>, mensaje: string) => {
    try {
      const completo = await obtenerArticulo(a.id);
      const { id: _id, updatedAt: _u, readingMinutes: _r, ...resto } = completo;
      await guardarArticulo({ ...resto, ...cambios }, a.id);
      toast.success(mensaje);
      await recargar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    }
  };

  if (editando) {
    return (
      <Editor
        inicial={editando === "nuevo" ? null : editando}
        onCerrar={() => setEditando(null)}
        onGuardado={async () => {
          await recargar();
        }}
      />
    );
  }

  return (
    <AdminShell
      title="Blog de la web"
      description="Los artículos de la pestaña «Blog» de la web pública. Creá, editá, cambiá imágenes y publicá cuando esté listo."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href="/blog" target="_blank" rel="noopener noreferrer">
              <Eye className="mr-1.5 h-4 w-4" /> Ver el blog
            </a>
          </Button>
          <Button onClick={() => setEditando("nuevo")}>
            <Plus className="mr-1.5 h-4 w-4" /> Nuevo artículo
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {!BLOG_CON_BACKEND && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-xs">
            <p>
              <b>Modo de prueba:</b> sin servidor conectado, los artículos se guardan en este navegador y se ven en
              el blog de este mismo navegador.
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                if (confirmar("¿Volver a los artículos iniciales? Se pierden los cambios de prueba.")) {
                  restablecerBlogLocal();
                  toast.success("Artículos iniciales restablecidos");
                }
              }}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Restablecer
            </Button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Publicados" value={String(publicados)} hint="Se ven en la web" />
          <KpiCard label="Borradores" value={String(borradores)} hint="Solo los ve el equipo" />
          <KpiCard label="Destacado" value={destacado ? "1" : "—"} hint={destacado ? destacado.title : "Ninguno"} />
        </div>

        <Seccion
          titulo="Artículos"
          descripcion="El destacado se ve grande arriba del blog. Solo puede haber uno."
          acciones={
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar…"
                className={cn(INPUT, "h-9 w-48 pl-9")}
              />
            </label>
          }
        >
          <div className="mb-5">
            <Pestanas
              valor={filtro}
              onCambiar={setFiltro}
              opciones={[
                { id: "todos", label: "Todos", cantidad: articulos.length },
                { id: "published", label: "Publicados", cantidad: publicados },
                { id: "draft", label: "Borradores", cantidad: borradores },
              ]}
            />
          </div>

          {cargando ? (
            <Cargando />
          ) : error ? (
            <Vacio titulo="No pudimos cargar el blog" texto={error} />
          ) : filas.length === 0 ? (
            <Vacio
              titulo={articulos.length === 0 ? "Todavía no hay artículos" : "Sin resultados"}
              texto={articulos.length === 0 ? "Tocá «Nuevo artículo» para escribir el primero." : "Probá con otra búsqueda o filtro."}
            />
          ) : (
            <ul className="space-y-3">
              {filas.map((a) => (
                <li
                  key={a.id}
                  className="group flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-3 transition hover:border-primary/30 sm:flex-row sm:items-center"
                >
                  <PortadaBlog articulo={a} className="aspect-[16/10] w-full shrink-0 rounded-xl sm:w-40" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {a.status === "published" ? <Pildora tono="ok">Publicado</Pildora> : <Pildora>Borrador</Pildora>}
                      {a.featured && (
                        <Pildora tono="primario">
                          <Pin className="mr-1 h-3 w-3" /> Destacado
                        </Pildora>
                      )}
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{a.category}</span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 font-semibold leading-snug">{a.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {a.status === "published" ? fechaLarga(a.publishedAt) : `Editado ${fechaLarga(a.updatedAt)}`} ·{" "}
                      {minutosLectura(a)} min · /blog/{a.slug}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 sm:justify-end">
                    <Button size="sm" onClick={() => void abrir(a)} disabled={abriendo === a.id}>
                      {abriendo === a.id ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Pencil className="mr-1 h-3.5 w-3.5" />}
                      Editar
                    </Button>
                    {a.status === "published" && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`/blog/${a.slug}`} target="_blank" rel="noopener noreferrer" aria-label="Ver en la web">
                          <Eye className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      title={a.featured ? "Quitar destacado" : "Destacar"}
                      aria-label={a.featured ? "Quitar destacado" : "Destacar"}
                      onClick={() => void cambioRapido(a, { featured: !a.featured }, a.featured ? "Ya no está destacado" : "Artículo destacado")}
                    >
                      <Pin className={cn("h-3.5 w-3.5", a.featured && "text-primary")} />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      title={a.status === "published" ? "Pasar a borrador" : "Publicar"}
                      aria-label={a.status === "published" ? "Pasar a borrador" : "Publicar"}
                      onClick={() =>
                        void cambioRapido(
                          a,
                          { status: a.status === "published" ? "draft" : "published" },
                          a.status === "published" ? "Pasó a borrador (ya no se ve en la web)" : "Publicado en la web",
                        )
                      }
                    >
                      {a.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Send className="h-3.5 w-3.5" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive hover:text-destructive"
                      aria-label="Borrar"
                      onClick={async () => {
                        if (!confirmar(`¿Borrar «${a.title}»? No se puede deshacer.`)) return;
                        try {
                          await borrarArticulo(a.id);
                          toast.success("Artículo borrado");
                          await recargar();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : "No se pudo borrar.");
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Seccion>

        <Seccion titulo="Cómo dar formato al texto" descripcion="Usá los botones del editor o escribí así:">
          <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
            {[
              ["## Título de sección", "Título grande (aparece en el índice)"],
              ["### Subtítulo", "Título chico"],
              ["- Ítem", "Lista con viñetas"],
              ["1. Ítem", "Lista numerada"],
              ["> Frase", "Cita destacada"],
              ["**texto**  ·  *texto*", "Negrita · cursiva"],
              ["[texto](https://…)", "Enlace"],
              ["![descripción](https://…)", "Imagen dentro del artículo"],
              ["Línea en blanco", "Separa párrafos"],
            ].map(([c, d]) => (
              <div key={c} className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
                <code className="font-mono text-[11.5px] text-primary">{c}</code>
                <p className="mt-0.5 text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </Seccion>
      </div>
    </AdminShell>
  );
}

/* ═════════════════════════════ Editor ═════════════════════════════ */

function BotonHerramienta({ titulo, onClick, children }: { titulo: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
    >
      {children}
    </button>
  );
}

function aFechaLocal(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function Editor({
  inicial,
  onCerrar,
  onGuardado,
}: {
  inicial: ArticuloBlog | null;
  onCerrar: () => void;
  onGuardado: () => Promise<void>;
}) {
  const [f, setF] = useState<CambiosArticulo>(() => {
    if (!inicial) return VACIO;
    const { id: _id, updatedAt: _u, readingMinutes: _r, ...resto } = inicial;
    return { ...VACIO, ...resto, content: resto.content ?? "" };
  });
  const [id, setId] = useState<string | undefined>(inicial?.id);
  const [slugManual, setSlugManual] = useState(Boolean(inicial));
  const [etiquetas, setEtiquetas] = useState((inicial?.tags ?? []).join(", "));
  const [guardando, setGuardando] = useState<"draft" | "published" | null>(null);
  const [subiendo, setSubiendo] = useState<"portada" | "texto" | null>(null);
  const [vista, setVista] = useState<"escribir" | "vista">("escribir");
  const [cambios, setCambios] = useState(false);
  const texto = useRef<HTMLTextAreaElement>(null);
  const archivoPortada = useRef<HTMLInputElement>(null);
  const archivoTexto = useRef<HTMLInputElement>(null);

  const set = <K extends keyof CambiosArticulo>(k: K, v: CambiosArticulo[K]) => {
    setF((x) => ({ ...x, [k]: v }));
    setCambios(true);
  };

  useEffect(() => {
    if (!slugManual) setF((x) => ({ ...x, slug: slugify(x.title) }));
  }, [f.title, slugManual]);

  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => {
      if (cambios) e.preventDefault();
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [cambios]);

  const tags = useMemo(
    () =>
      etiquetas
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12),
    [etiquetas],
  );
  const vistaPrevia: ArticuloBlog = { ...f, tags, id: id ?? "nuevo", updatedAt: new Date().toISOString() };

  /** Envuelve la selección o inserta al principio de la línea. */
  const formato = (antes: string, despues = "", deLinea = false, ejemplo = "texto") => {
    const el = texto.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b, value } = el;
    let nuevo: string;
    let cursor: number;
    if (deLinea) {
      const inicioLinea = value.lastIndexOf("\n", a - 1) + 1;
      nuevo = value.slice(0, inicioLinea) + antes + value.slice(inicioLinea);
      cursor = b + antes.length;
    } else {
      const sel = value.slice(a, b) || ejemplo;
      nuevo = value.slice(0, a) + antes + sel + despues + value.slice(b);
      cursor = a + antes.length + sel.length;
    }
    set("content", nuevo);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  const insertarBloque = (bloque: string) => {
    const el = texto.current;
    const v = f.content ?? "";
    const pos = el ? el.selectionStart : v.length;
    const nuevo = `${v.slice(0, pos)}${pos > 0 && !v.slice(0, pos).endsWith("\n\n") ? "\n\n" : ""}${bloque}\n\n${v.slice(pos)}`;
    set("content", nuevo);
  };

  const subir = async (archivo: File | undefined, destino: "portada" | "texto") => {
    if (!archivo) return;
    setSubiendo(destino);
    try {
      const url = await subirImagenBlog(archivo);
      if (destino === "portada") set("coverUrl", url);
      else {
        const nombre = archivo.name.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ");
        insertarBloque(`![${nombre}](${url})`);
      }
      toast.success(destino === "portada" ? "Portada cargada" : "Imagen agregada al texto");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(null);
    }
  };

  const guardar = async (estado: "draft" | "published") => {
    if (f.title.trim().length < 3) {
      toast.error("Escribí un título.");
      return;
    }
    if (estado === "published" && (f.content ?? "").trim().length < 20) {
      toast.error("El artículo está vacío. Escribí el texto antes de publicar.");
      return;
    }
    setGuardando(estado);
    try {
      const guardado = await guardarArticulo({ ...f, tags, status: estado, slug: f.slug || slugify(f.title) }, id);
      setId(guardado.id);
      setF((x) => ({ ...x, slug: guardado.slug, status: guardado.status, publishedAt: guardado.publishedAt }));
      setSlugManual(true);
      setCambios(false);
      toast.success(estado === "published" ? "Publicado: ya se ve en la web" : "Borrador guardado");
      await onGuardado();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(null);
    }
  };

  const cerrar = () => {
    if (cambios && !confirmar("Hay cambios sin guardar. ¿Salir igual?")) return;
    onCerrar();
  };

  const publicado = f.status === "published";

  return (
    <AdminShell
      title={inicial ? "Editar artículo" : "Nuevo artículo"}
      description={publicado ? "Está publicado: al guardar, los cambios se ven enseguida en la web." : "Es un borrador: solo lo ve el equipo hasta que lo publiques."}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={cerrar}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Volver
          </Button>
          {!publicado && (
            <Button variant="outline" onClick={() => void guardar("draft")} disabled={!!guardando}>
              {guardando === "draft" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Guardar borrador
            </Button>
          )}
          {publicado && (
            <Button variant="outline" onClick={() => void guardar("draft")} disabled={!!guardando}>
              {guardando === "draft" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <EyeOff className="mr-1.5 h-4 w-4" />}
              Pasar a borrador
            </Button>
          )}
          <Button onClick={() => void guardar("published")} disabled={!!guardando}>
            {guardando === "published" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Send className="mr-1.5 h-4 w-4" />}
            {publicado ? "Guardar cambios" : "Publicar"}
          </Button>
        </div>
      }
    >
      <div className="mb-4 lg:hidden">
        <Pestanas
          valor={vista}
          onCambiar={setVista}
          opciones={[
            { id: "escribir", label: "Escribir" },
            { id: "vista", label: "Vista previa" },
          ]}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ── Formulario ── */}
        <div className={cn("space-y-6", vista === "vista" && "hidden lg:block")}>
          <Seccion titulo="Datos del artículo">
            <div className="space-y-4">
              <Campo label="Título">
                <input
                  className={cn(INPUT, "h-11 text-base font-semibold")}
                  value={f.title}
                  maxLength={160}
                  onChange={(e) => set("title", e.target.value)}
                  placeholder="Ej.: Cómo reducir el ausentismo de pacientes"
                />
              </Campo>
              <Campo label="Dirección en la web" ayuda="Se arma sola con el título. Solo letras, números y guiones.">
                <div className="flex items-center rounded-xl border border-input bg-muted/30 pl-3 text-sm focus-within:border-primary/50">
                  <span className="shrink-0 text-muted-foreground">/blog/</span>
                  <input
                    className="h-10 min-w-0 flex-1 bg-transparent px-1 outline-none"
                    value={f.slug}
                    onChange={(e) => {
                      setSlugManual(true);
                      set("slug", slugify(e.target.value));
                    }}
                  />
                </div>
              </Campo>
              <Campo label="Resumen" ayuda="Se ve en las tarjetas del blog y al compartir. Máx. 400 caracteres.">
                <textarea
                  className={cn(INPUT, "h-auto min-h-[84px] py-2")}
                  maxLength={400}
                  value={f.excerpt}
                  onChange={(e) => set("excerpt", e.target.value)}
                  placeholder="Dos o tres líneas que inviten a leer."
                />
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="Categoría" ayuda="Elegí una o escribí una nueva.">
                  <input
                    className={INPUT}
                    list="categorias-blog"
                    value={f.category}
                    maxLength={60}
                    onChange={(e) => set("category", e.target.value)}
                  />
                  <datalist id="categorias-blog">
                    {CATEGORIAS_BLOG.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </Campo>
                <Campo label="Etiquetas" ayuda="Separadas por coma (máx. 12).">
                  <input
                    className={INPUT}
                    value={etiquetas}
                    onChange={(e) => {
                      setEtiquetas(e.target.value);
                      setCambios(true);
                    }}
                    placeholder="agenda, recordatorios"
                  />
                </Campo>
                <Campo label="Autor">
                  <input className={INPUT} value={f.authorName} maxLength={80} onChange={(e) => set("authorName", e.target.value)} />
                </Campo>
                <Campo label="Cargo del autor (opcional)">
                  <input
                    className={INPUT}
                    value={f.authorRole}
                    maxLength={80}
                    onChange={(e) => set("authorRole", e.target.value)}
                    placeholder="Ej.: Odontóloga, directora clínica"
                  />
                </Campo>
                <Campo label="Fecha de publicación" ayuda="Vacía = el día que se publica.">
                  <input
                    type="date"
                    className={INPUT}
                    value={aFechaLocal(f.publishedAt)}
                    onChange={(e) => set("publishedAt", e.target.value ? new Date(`${e.target.value}T12:00:00`).toISOString() : null)}
                  />
                </Campo>
                <label className="flex cursor-pointer items-center gap-3 self-end rounded-xl border border-border/70 px-3 py-2.5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                    checked={f.featured}
                    onChange={(e) => set("featured", e.target.checked)}
                  />
                  <span className="text-sm">
                    <b>Destacado</b>
                    <span className="block text-[11px] text-muted-foreground">Se ve grande arriba del blog</span>
                  </span>
                </label>
              </div>
            </div>
          </Seccion>

          <Seccion titulo="Portada" descripcion="Foto horizontal (ideal 1600 × 1000). Sin foto se usa una ilustración según la categoría.">
            <div className="space-y-3">
              <div className="relative">
                <PortadaBlog articulo={vistaPrevia} className="aspect-[16/9] w-full rounded-2xl" />
                {subiendo === "portada" && (
                  <div className="absolute inset-0 grid place-items-center rounded-2xl bg-black/40 text-white">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => archivoPortada.current?.click()} disabled={!!subiendo}>
                  <Upload className="mr-1.5 h-4 w-4" /> {f.coverUrl ? "Cambiar foto" : "Subir foto"}
                </Button>
                {f.coverUrl && (
                  <Button type="button" variant="outline" onClick={() => set("coverUrl", null)}>
                    <X className="mr-1.5 h-4 w-4" /> Quitar foto
                  </Button>
                )}
                <input
                  ref={archivoPortada}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    void subir(e.target.files?.[0], "portada");
                    e.target.value = "";
                  }}
                />
              </div>
              <Campo label="Descripción de la imagen" ayuda="Para accesibilidad y buscadores. Ej.: «Odontóloga mostrando el odontograma 3D».">
                <input className={INPUT} value={f.coverAlt} maxLength={200} onChange={(e) => set("coverAlt", e.target.value)} />
              </Campo>
            </div>
          </Seccion>

          <Seccion titulo="Texto del artículo" descripcion={`${minutosLectura({ content: f.content })} min de lectura`} sinPadding>
            <div className="flex flex-wrap items-center gap-0.5 border-b border-border/60 px-3 py-1.5">
              <BotonHerramienta titulo="Título de sección" onClick={() => formato("## ", "", true)}>
                <Heading2 className="h-4 w-4" />
              </BotonHerramienta>
              <BotonHerramienta titulo="Subtítulo" onClick={() => formato("### ", "", true)}>
                <Heading3 className="h-4 w-4" />
              </BotonHerramienta>
              <span className="mx-1 h-5 w-px bg-border" />
              <BotonHerramienta titulo="Negrita" onClick={() => formato("**", "**")}>
                <Bold className="h-4 w-4" />
              </BotonHerramienta>
              <BotonHerramienta titulo="Cursiva" onClick={() => formato("*", "*")}>
                <Italic className="h-4 w-4" />
              </BotonHerramienta>
              <BotonHerramienta
                titulo="Enlace"
                onClick={() => {
                  const url = window.prompt("Dirección del enlace (https://…)", "https://");
                  if (url && /^https?:\/\/\S+$/.test(url)) formato("[", `](${url})`, false, "texto del enlace");
                }}
              >
                <Link2 className="h-4 w-4" />
              </BotonHerramienta>
              <span className="mx-1 h-5 w-px bg-border" />
              <BotonHerramienta titulo="Lista" onClick={() => formato("- ", "", true)}>
                <List className="h-4 w-4" />
              </BotonHerramienta>
              <BotonHerramienta titulo="Lista numerada" onClick={() => formato("1. ", "", true)}>
                <ListOrdered className="h-4 w-4" />
              </BotonHerramienta>
              <BotonHerramienta titulo="Cita destacada" onClick={() => formato("> ", "", true)}>
                <Quote className="h-4 w-4" />
              </BotonHerramienta>
              <BotonHerramienta titulo="Imagen dentro del texto" onClick={() => archivoTexto.current?.click()}>
                {subiendo === "texto" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              </BotonHerramienta>
              <input
                ref={archivoTexto}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  void subir(e.target.files?.[0], "texto");
                  e.target.value = "";
                }}
              />
            </div>
            <textarea
              ref={texto}
              value={f.content}
              onChange={(e) => set("content", e.target.value)}
              placeholder={"Escribí el artículo acá.\n\n## Un título de sección\n\nUn párrafo…\n\n- Un punto\n- Otro punto"}
              className="block min-h-[460px] w-full resize-y bg-card px-5 py-4 font-mono text-[13.5px] leading-relaxed outline-none"
            />
          </Seccion>
        </div>

        {/* ── Vista previa ── */}
        <div className={cn(vista === "escribir" && "hidden lg:block")}>
          <div className="lg:sticky lg:top-20">
            <div className="overflow-hidden rounded-[24px] border border-border/70 bg-white text-[#1b1233]" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="flex items-center justify-between border-b border-violet-100 bg-violet-50/60 px-4 py-2.5">
                <span className="text-xs font-semibold text-violet-700">Vista previa · así se verá en la web</span>
                <span className="text-[11px] text-[#1b1233]/50">/blog/{f.slug || "…"}</span>
              </div>
              <div className="max-h-[calc(100vh-11rem)] overflow-y-auto">
                <div className="bg-[#07060f] px-6 pb-6 pt-7 text-white">
                  <span className="inline-flex rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]">
                    {f.category || "Categoría"}
                  </span>
                  <h1 className="mt-3 font-display text-2xl font-bold leading-tight">{f.title || "Título del artículo"}</h1>
                  {f.excerpt && <p className="mt-3 text-sm leading-relaxed text-white/60">{f.excerpt}</p>}
                  <p className="mt-4 text-xs text-white/45">
                    {f.authorName} · {fechaLarga(f.publishedAt ?? new Date().toISOString())} · {minutosLectura({ content: f.content })} min
                  </p>
                </div>
                <div className="p-6">
                  <PortadaBlog articulo={vistaPrevia} grande className="aspect-[16/9] w-full rounded-2xl" />
                  <div className="mt-6 [&_h2]:text-2xl">
                    {(f.content ?? "").trim() ? (
                      <ContenidoArticulo contenido={f.content ?? ""} />
                    ) : (
                      <p className="text-sm text-[#1b1233]/40">El texto aparece acá mientras escribís.</p>
                    )}
                  </div>
                  {tags.length > 0 && (
                    <div className="mt-6 flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <span key={t} className="rounded-full border border-violet-100 px-2.5 py-1 text-xs text-[#1b1233]/60">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
