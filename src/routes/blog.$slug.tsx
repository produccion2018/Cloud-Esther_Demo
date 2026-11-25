import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, MotionConfig, useScroll, useSpring } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Clock, Link2, Linkedin, Share2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PublicLayout } from "@/components/site/PublicLayout";
import { Reveal } from "@/components/site/Reveal";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";
import { PortadaBlog } from "@/components/blog/PortadaBlog";
import { ContenidoArticulo, indiceDe } from "@/components/blog/ContenidoArticulo";
import { CategoriaChip, TarjetaArticulo } from "@/components/blog/TarjetaArticulo";
import { useModoClaroBlog } from "@/lib/blog/modo-claro";
import { fechaLarga, minutosLectura, useArticuloPublico, useArticulosPublicos } from "@/lib/blog/blog";

/* Ubicación: src/routes/blog.$slug.tsx
   Un artículo del blog: portada, texto, índice lateral, compartir y «seguí leyendo». */

export const Route = createFileRoute("/blog/$slug")({
  head: () => ({
    meta: [{ title: "Blog | Cloud Esther" }],
  }),
  component: Articulo,
});

const EASE = [0.22, 1, 0.36, 1] as const;

function iniciales(nombre: string) {
  return nombre
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

function Compartir({ titulo }: { titulo: string }) {
  const [copiado, setCopiado] = useState(false);
  const url = typeof window === "undefined" ? "" : window.location.href;
  const enc = encodeURIComponent;
  const boton =
    "grid size-11 place-items-center rounded-2xl border border-violet-100 bg-white text-[#1b1233]/70 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700";

  const nativo = async () => {
    try {
      await navigator.share({ title: titulo, url });
    } catch {
      /* cancelado */
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      <a className={boton} href={`https://wa.me/?text=${enc(`${titulo} ${url}`)}`} target="_blank" rel="noopener noreferrer" aria-label="Compartir por WhatsApp">
        <IconoWhatsApp className="size-[18px]" />
      </a>
      <a
        className={boton}
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Compartir en LinkedIn"
      >
        <Linkedin className="size-[18px]" />
      </a>
      <button
        type="button"
        className={boton}
        aria-label="Copiar enlace"
        onClick={() => {
          void navigator.clipboard?.writeText(url).then(() => {
            setCopiado(true);
            window.setTimeout(() => setCopiado(false), 1800);
          });
        }}
      >
        {copiado ? <Check className="size-[18px] text-emerald-600" /> : <Link2 className="size-[18px]" />}
      </button>
      {typeof navigator !== "undefined" && "share" in navigator && (
        <button type="button" className={boton} aria-label="Compartir" onClick={() => void nativo()}>
          <Share2 className="size-[18px]" />
        </button>
      )}
    </div>
  );
}

function Indice({ items }: { items: { id: string; texto: string }[] }) {
  const [activo, setActivo] = useState<string | null>(items[0]?.id ?? null);
  useEffect(() => {
    if (!items.length) return;
    const obs = new IntersectionObserver(
      (entradas) => {
        const visible = entradas.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActivo(visible.target.id);
      },
      { rootMargin: "-100px 0px -65% 0px" },
    );
    items.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [items]);

  if (!items.length) return null;
  return (
    <nav aria-label="En este artículo">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-600">En este artículo</p>
      <ul className="mt-4 space-y-1 border-l border-violet-100">
        {items.map((i) => (
          <li key={i.id}>
            <a
              href={`#${i.id}`}
              className={`-ml-px block border-l-2 py-1.5 pl-4 text-[14px] leading-snug transition-colors ${
                activo === i.id ? "border-violet-600 font-semibold text-violet-700" : "border-transparent text-[#1b1233]/55 hover:text-[#1b1233]"
              }`}
            >
              {i.texto}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function Articulo() {
  useModoClaroBlog();
  const { slug } = Route.useParams();
  const { datos: articulo, cargando, error } = useArticuloPublico(slug);
  const { datos: todos } = useArticulosPublicos();
  const { scrollYProgress } = useScroll();
  const progreso = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });

  useEffect(() => {
    if (articulo) document.title = `${articulo.title} | Blog Cloud Esther`;
  }, [articulo]);

  const indice = useMemo(() => indiceDe(articulo?.content ?? ""), [articulo?.content]);
  const relacionados = useMemo(() => {
    if (!articulo) return [];
    const otros = todos.filter((a) => a.slug !== articulo.slug);
    return [...otros.filter((a) => a.category === articulo.category), ...otros.filter((a) => a.category !== articulo.category)].slice(0, 3);
  }, [todos, articulo]);

  if (cargando) {
    return (
      <PublicLayout>
        <div className="min-h-[70vh] bg-[#07060f]">
          <div className="mx-auto max-w-3xl space-y-5 px-5 pt-24">
            <div className="h-4 w-32 animate-pulse rounded-full bg-white/10" />
            <div className="h-12 w-full animate-pulse rounded-2xl bg-white/10" />
            <div className="h-12 w-2/3 animate-pulse rounded-2xl bg-white/10" />
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!articulo) {
    return (
      <PublicLayout>
        <div className="grid min-h-[70vh] place-items-center bg-[#07060f] px-5 text-center text-white">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-300">Blog</p>
            <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">
              {error ?? "No encontramos este artículo."}
            </h1>
            <p className="mt-3 text-white/60">Puede que se haya movido o que todavía no esté publicado.</p>
            <Button asChild variant="hero" size="lg" className="mt-8">
              <Link to="/blog">
                <ArrowLeft className="size-4" />
                Volver al blog
              </Link>
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <MotionConfig reducedMotion="user">
        {/* Progreso de lectura */}
        <motion.div
          aria-hidden
          style={{ scaleX: progreso }}
          className="fixed inset-x-0 top-0 z-[70] h-[3px] origin-left bg-gradient-to-r from-violet-500 via-fuchsia-500 to-sky-400"
        />

        <article>
          {/* ───────── Encabezado ───────── */}
          <header className="relative isolate overflow-hidden bg-[#07060f] text-white">
            <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -left-40 -top-20 size-[520px] rounded-full bg-violet-600/35 blur-[130px]" />
              <div className="absolute -right-32 top-24 size-[460px] rounded-full bg-fuchsia-600/25 blur-[130px]" />
              <div className="absolute inset-0 [background-image:radial-gradient(rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:28px_28px]" />
            </div>
            <div className="mx-auto max-w-4xl px-5 pb-40 pt-12 sm:pb-48 lg:px-8 lg:pt-16">
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-[13px] font-semibold text-white/70 backdrop-blur transition hover:border-white/30 hover:text-white"
              >
                <ArrowLeft className="size-4" />
                Blog
              </Link>
              <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }} className="mt-8">
                <CategoriaChip categoria={articulo.category} claro />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 26, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.9, ease: EASE }}
                className="mt-5 font-display text-[2.1rem] font-bold leading-[1.08] tracking-[-0.025em] sm:text-5xl lg:text-[3.4rem]"
              >
                {articulo.title}
              </motion.h1>
              {articulo.excerpt && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="mt-6 max-w-3xl text-base leading-8 text-white/65 sm:text-lg"
                >
                  {articulo.excerpt}
                </motion.p>
              )}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.45 }}
                className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-3"
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 text-sm font-bold text-white shadow-[0_10px_25px_-10px_rgba(192,38,211,0.9)]">
                    {iniciales(articulo.authorName)}
                  </span>
                  <span className="leading-tight">
                    <span className="block text-sm font-semibold text-white">{articulo.authorName}</span>
                    {articulo.authorRole && <span className="block text-[12.5px] text-white/50">{articulo.authorRole}</span>}
                  </span>
                </span>
                <span aria-hidden className="hidden h-8 w-px bg-white/15 sm:block" />
                <span className="text-[13.5px] text-white/55">{fechaLarga(articulo.publishedAt)}</span>
                <span className="inline-flex items-center gap-1.5 text-[13.5px] text-white/55">
                  <Clock className="size-4" /> {minutosLectura(articulo)} min de lectura
                </span>
              </motion.div>
            </div>
          </header>

          {/* ───────── Portada + texto ───────── */}
          <div className="relative bg-gradient-to-b from-[#fbf8ff] via-white to-[#f7f2ff] pb-20 text-[#1b1233]">
            <div className="mx-auto max-w-6xl px-5 lg:px-8">
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2, ease: EASE }}
                className="-mt-32 sm:-mt-40"
              >
                <PortadaBlog
                  articulo={articulo}
                  grande
                  prioridad
                  className="aspect-[16/9] w-full rounded-[32px] border border-white/60 shadow-[0_60px_120px_-50px_rgba(76,29,149,0.65)]"
                />
              </motion.div>

              <div className="mt-14 grid gap-12 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-16">
                <div className="mx-auto w-full max-w-[720px]">
                  <ContenidoArticulo contenido={articulo.content ?? ""} />

                  {articulo.tags.length > 0 && (
                    <div className="mt-12 flex flex-wrap gap-2 border-t border-violet-100 pt-8">
                      {articulo.tags.map((t) => (
                        <span key={t} className="rounded-full border border-violet-100 bg-white px-3.5 py-1.5 text-[13px] font-medium text-[#1b1233]/60">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Compartir (celular) */}
                  <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-violet-100 bg-white p-5 lg:hidden">
                    <p className="text-sm font-semibold">¿Te sirvió? Compartilo</p>
                    <Compartir titulo={articulo.title} />
                  </div>

                  {/* Llamado a Cloud Esther */}
                  <div className="relative mt-12 overflow-hidden rounded-[32px] bg-[#0d0a1f] p-8 text-white sm:p-10">
                    <div aria-hidden className="absolute -right-16 -top-16 size-64 rounded-full bg-violet-600/40 blur-[80px]" />
                    <div aria-hidden className="absolute -bottom-20 left-10 size-56 rounded-full bg-fuchsia-600/30 blur-[80px]" />
                    <div className="relative">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-violet-300">Cloud Esther</p>
                      <h2 className="mt-3 font-display text-2xl font-bold leading-tight sm:text-3xl">
                        Gestioná tu clínica y hacela crecer, todo en un solo lugar.
                      </h2>
                      <p className="mt-3 max-w-lg text-white/60">
                        Agenda, historia clínica, odontograma 3D, presupuestos, automatizaciones e IA. Probalo gratis.
                      </p>
                      <div className="mt-6 flex flex-wrap gap-3">
                        <Button asChild variant="hero" size="lg">
                          <Link to="/registro">
                            Probar demo gratis
                            <ArrowRight className="size-4" />
                          </Link>
                        </Button>
                        <Button asChild size="lg" variant="ghost" className="border border-white/15 text-white hover:bg-white/10 hover:text-white">
                          <Link to="/planes">Ver planes</Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lateral (escritorio) */}
                <aside className="hidden lg:block">
                  <div className="sticky top-28 space-y-10">
                    <Indice items={indice} />
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-600">Compartir</p>
                      <div className="mt-4">
                        <Compartir titulo={articulo.title} />
                      </div>
                    </div>
                  </div>
                </aside>
              </div>
            </div>

            {/* Seguí leyendo */}
            {relacionados.length > 0 && (
              <section className="mx-auto mt-24 max-w-6xl px-5 lg:px-8">
                <Reveal className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-violet-600">Seguí leyendo</p>
                    <h2 className="mt-2 font-display text-3xl font-bold tracking-tight">Más del blog</h2>
                  </div>
                  <Link to="/blog" className="hidden items-center gap-1.5 text-sm font-semibold text-violet-700 hover:underline sm:inline-flex">
                    Ver todos <ArrowRight className="size-4" />
                  </Link>
                </Reveal>
                <div className="mt-8 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
                  {relacionados.map((a) => (
                    <TarjetaArticulo key={a.id} articulo={a} />
                  ))}
                </div>
              </section>
            )}
          </div>
        </article>
      </MotionConfig>
    </PublicLayout>
  );
}
