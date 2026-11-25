import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { ArrowRight, ArrowUpRight, Clock, Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Reveal } from "@/components/site/Reveal";
import { PortadaBlog } from "@/components/blog/PortadaBlog";
import { CategoriaChip, TarjetaArticulo } from "@/components/blog/TarjetaArticulo";
import { fechaLarga, minutosLectura, useArticulosPublicos, type ArticuloBlog } from "@/lib/blog/blog";

/* Ubicación: src/routes/blog.index.tsx
   Blog de Cloud Esther: odontología, gestión de la clínica, tecnología y novedades.
   Los artículos los escribe el equipo desde el panel (/admin/blog). */

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog de odontología | Cloud Esther" },
      {
        name: "description",
        content:
          "Artículos sobre odontología digital, gestión de clínicas, inteligencia artificial, marketing dental y novedades de Cloud Esther.",
      },
      { property: "og:title", content: "Blog de odontología — Cloud Esther" },
      {
        property: "og:description",
        content: "Ideas, guías y novedades para clínicas odontológicas que quieren crecer.",
      },
    ],
  }),
  component: Blog,
});

const EASE = [0.22, 1, 0.36, 1] as const;
const POR_PAGINA = 9;

function Aurora() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <motion.div
        animate={{ x: [-60, 90, -60], y: [0, 50, 0], scale: [1, 1.15, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-32 top-0 size-[560px] rounded-full bg-violet-600/35 blur-[130px]"
      />
      <motion.div
        animate={{ x: [80, -70, 80], y: [0, -40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 19, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-24 top-20 size-[520px] rounded-full bg-sky-500/25 blur-[130px]"
      />
      <motion.div
        animate={{ x: [0, 60, 0], y: [0, -50, 0], opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-[-160px] left-1/3 size-[480px] rounded-full bg-fuchsia-600/25 blur-[130px]"
      />
      <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:28px_28px]" />
    </div>
  );
}

function GradientText({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      animate={{ backgroundPosition: ["0% center", "200% center"] }}
      transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      className="bg-[linear-gradient(90deg,#a78bfa,#60a5fa,#c084fc,#a78bfa)] bg-[length:200%_auto] bg-clip-text text-transparent [-webkit-text-fill-color:transparent]"
    >
      {children}
    </motion.span>
  );
}

/** El artículo destacado, grande, arriba de todo. */
function Destacado({ articulo }: { articulo: ArticuloBlog }) {
  return (
    <Link
      to="/blog/$slug"
      params={{ slug: articulo.slug }}
      className="group relative grid overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.04] shadow-[0_50px_120px_-50px_rgba(124,58,237,0.7)] backdrop-blur-xl transition-all duration-500 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 lg:grid-cols-[1.15fr_1fr]"
    >
      <PortadaBlog articulo={articulo} grande prioridad className="aspect-[16/10] w-full lg:aspect-auto lg:min-h-[420px]" />
      <div className="flex flex-col justify-center p-7 sm:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
            Destacado
          </span>
          <CategoriaChip categoria={articulo.category} claro />
        </div>
        <h2 className="mt-5 font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl lg:text-[2.1rem]">
          {articulo.title}
        </h2>
        <p className="mt-4 line-clamp-4 text-[15.5px] leading-relaxed text-white/65">{articulo.excerpt}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/50">
          <span>{articulo.authorName}</span>
          <span aria-hidden>·</span>
          <span>{fechaLarga(articulo.publishedAt)}</span>
          <span aria-hidden>·</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" /> {minutosLectura(articulo)} min
          </span>
        </div>
        <span className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#1b1233] shadow-lg transition-transform duration-300 group-hover:-translate-y-0.5">
          Leer artículo
          <ArrowUpRight className="size-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

function Esqueleto() {
  return (
    <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-[28px] border border-violet-100 bg-white">
          <div className="aspect-[16/10] animate-pulse bg-violet-100/70" />
          <div className="space-y-3 p-6">
            <div className="h-3 w-1/3 animate-pulse rounded-full bg-violet-100" />
            <div className="h-5 w-4/5 animate-pulse rounded-full bg-violet-100" />
            <div className="h-3 w-full animate-pulse rounded-full bg-violet-50" />
            <div className="h-3 w-2/3 animate-pulse rounded-full bg-violet-50" />
          </div>
        </div>
      ))}
    </div>
  );
}

function sinAcentos(t: string) {
  return t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function Blog() {
  const { datos, cargando, error } = useArticulosPublicos();
  const [categoria, setCategoria] = useState<string>("Todas");
  const [busqueda, setBusqueda] = useState("");
  const [visibles, setVisibles] = useState(POR_PAGINA);

  const destacado = datos.find((a) => a.featured) ?? datos[0];
  const categorias = useMemo(() => ["Todas", ...Array.from(new Set(datos.map((a) => a.category)))], [datos]);

  const filtrando = categoria !== "Todas" || busqueda.trim() !== "";
  const lista = useMemo(() => {
    const q = sinAcentos(busqueda.trim());
    return datos.filter((a) => {
      if (!filtrando && destacado && a.id === destacado.id) return false;
      if (categoria !== "Todas" && a.category !== categoria) return false;
      if (!q) return true;
      return sinAcentos(`${a.title} ${a.excerpt} ${a.category} ${a.tags.join(" ")}`).includes(q);
    });
  }, [datos, categoria, busqueda, filtrando, destacado]);

  return (
    <PublicLayout>
      <MotionConfig reducedMotion="user">
        <div className="relative bg-[#07060f] text-white">
          {/* ───────── Encabezado ───────── */}
          <section className="relative isolate overflow-hidden">
            <Aurora />
            <div className="mx-auto max-w-6xl px-5 pb-14 pt-16 lg:px-8 lg:pb-20 lg:pt-24">
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: EASE }}
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[12px] font-semibold uppercase tracking-[0.2em] text-violet-200 backdrop-blur"
              >
                <span className="size-1.5 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" />
                Blog Cloud Esther
              </motion.p>
              <h1 className="mt-6 max-w-4xl font-display text-[2.6rem] font-bold leading-[1.04] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
                <motion.span
                  initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.9, ease: EASE }}
                  className="block"
                >
                  Odontología que
                </motion.span>
                <motion.span
                  initial={{ opacity: 0, y: 30, filter: "blur(10px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.9, delay: 0.2, ease: EASE }}
                  className="block"
                >
                  <GradientText>inspira a crecer.</GradientText>
                </motion.span>
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="mt-6 max-w-2xl text-base leading-8 text-white/65 lg:text-lg"
              >
                Guías, ideas y novedades sobre odontología digital, gestión de la clínica, inteligencia artificial y
                la experiencia del paciente. Escrito por el equipo de Cloud Esther.
              </motion.p>

              {/* Buscador */}
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.65, ease: EASE }}
                className="mt-9 max-w-xl"
              >
                <label className="group relative flex items-center">
                  <span className="sr-only">Buscar en el blog</span>
                  <Search className="pointer-events-none absolute left-5 size-5 text-white/40 transition-colors group-focus-within:text-violet-300" />
                  <input
                    type="search"
                    value={busqueda}
                    onChange={(e) => {
                      setBusqueda(e.target.value);
                      setVisibles(POR_PAGINA);
                    }}
                    placeholder="Buscar artículos, temas o etiquetas…"
                    className="h-14 w-full rounded-2xl border border-white/15 bg-white/[0.06] pl-14 pr-12 text-base text-white placeholder:text-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl transition focus:border-violet-400/60 focus:bg-white/[0.09] focus:outline-none focus:ring-4 focus:ring-violet-500/20"
                  />
                  {busqueda && (
                    <button
                      type="button"
                      onClick={() => setBusqueda("")}
                      aria-label="Borrar búsqueda"
                      className="absolute right-3 grid size-8 place-items-center rounded-xl text-white/50 transition hover:bg-white/10 hover:text-white"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </label>
              </motion.div>

              {/* Destacado */}
              {!cargando && destacado && !filtrando && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.9, delay: 0.8, ease: EASE }}
                  className="mt-14"
                >
                  <Destacado articulo={destacado} />
                </motion.div>
              )}
            </div>
          </section>

          {/* ───────── Artículos ───────── */}
          <section className="relative overflow-hidden bg-gradient-to-b from-[#fbf8ff] via-white to-[#f7f2ff] px-5 py-16 text-[#1b1233] lg:px-8 lg:py-24">
            <div className="mx-auto max-w-6xl">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <Reveal className="shrink-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-600">
                    {filtrando ? "Resultados" : "Últimos artículos"}
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
                    {categoria === "Todas" ? "Todo el blog" : categoria}
                  </h2>
                </Reveal>

                {/* Categorías (desliza en el celular) */}
                {/* En la computadora bajan de renglón (así no se corta ninguna) */}
                <div className="-mx-5 min-w-0 overflow-x-auto px-5 pb-1 [scrollbar-width:none] lg:mx-0 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
                  <div className="flex w-max gap-2 lg:w-auto lg:flex-wrap lg:justify-end">
                    {categorias.map((c) => {
                      const activa = c === categoria;
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setCategoria(c);
                            setVisibles(POR_PAGINA);
                          }}
                          aria-pressed={activa}
                          className={`relative h-10 rounded-full px-4 text-sm font-semibold transition-colors ${
                            activa ? "text-white" : "border border-violet-200 bg-white text-[#1b1233]/70 hover:border-violet-300 hover:text-[#1b1233]"
                          }`}
                        >
                          {activa && (
                            <motion.span
                              layoutId="chip-categoria"
                              className="absolute inset-0 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 shadow-[0_10px_25px_-10px_rgba(124,58,237,0.8)]"
                              transition={{ type: "spring", stiffness: 380, damping: 32 }}
                            />
                          )}
                          <span className="relative">{c}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-10">
                {cargando ? (
                  <Esqueleto />
                ) : error ? (
                  <p className="rounded-3xl border border-violet-100 bg-white p-10 text-center text-[#1b1233]/60">{error}</p>
                ) : lista.length === 0 ? (
                  <div className="rounded-[28px] border border-dashed border-violet-200 bg-white/70 p-12 text-center">
                    <p className="font-display text-xl font-semibold">
                      {datos.length === 0 ? "Muy pronto, nuevos artículos." : "No encontramos artículos con esa búsqueda."}
                    </p>
                    <p className="mt-2 text-[#1b1233]/55">
                      {datos.length === 0 ? "Estamos preparando contenido para vos." : "Probá con otra palabra o elegí otra categoría."}
                    </p>
                    {filtrando && (
                      <button
                        type="button"
                        onClick={() => {
                          setBusqueda("");
                          setCategoria("Todas");
                        }}
                        className="mt-5 rounded-full bg-violet-100 px-5 py-2 text-sm font-semibold text-violet-700 transition hover:bg-violet-200"
                      >
                        Ver todos los artículos
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    <motion.div layout className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                      <AnimatePresence mode="popLayout">
                        {lista.slice(0, visibles).map((a, i) => (
                          <motion.div
                            key={a.id}
                            layout
                            initial={{ opacity: 0, y: 24 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96 }}
                            transition={{ duration: 0.5, delay: Math.min(i, 5) * 0.05, ease: EASE }}
                          >
                            <TarjetaArticulo articulo={a} />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                    {lista.length > visibles && (
                      <div className="mt-12 text-center">
                        <button
                          type="button"
                          onClick={() => setVisibles((v) => v + POR_PAGINA)}
                          className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-6 py-3 text-sm font-semibold text-violet-700 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:shadow-md"
                        >
                          {cargando ? <Loader2 className="size-4 animate-spin" /> : null}
                          Ver más artículos
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </section>

          {/* ───────── Llamado final ───────── */}
          <section className="relative isolate overflow-hidden px-5 py-24 text-center lg:px-8">
            <motion.div
              aria-hidden="true"
              animate={{ opacity: [0.25, 0.55, 0.25], scale: [0.95, 1.1, 0.95] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="pointer-events-none absolute left-1/2 top-1/2 -z-10 size-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/30 blur-[130px]"
            />
            <Reveal className="mx-auto max-w-2xl">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                <GradientText>Llevá estas ideas a tu clínica.</GradientText>
              </h2>
              <p className="mt-4 text-white/60">
                Agenda, historia clínica, odontograma 3D, automatizaciones e IA en una sola plataforma.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button asChild variant="hero" size="xl">
                  <Link to="/registro">
                    Probar demo gratis
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="xl"
                  variant="ghost"
                  className="border border-white/15 text-white hover:bg-white/10 hover:text-white"
                >
                  <Link to="/planes">Ver planes</Link>
                </Button>
              </div>
            </Reveal>
          </section>
        </div>
      </MotionConfig>
    </PublicLayout>
  );
}
