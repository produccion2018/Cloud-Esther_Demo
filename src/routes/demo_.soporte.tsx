import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Clock3, LifeBuoy, MessageCircle, Send, ShieldCheck } from "lucide-react";

import { AppShell } from "@/components/cloud-esther/AppShell";
import { HeroModulo } from "@/components/clinica/hero-modulo";
import { Seleccion } from "@/components/ui/seleccion";
import { CloudEstherProvider } from "@/lib/cloud-esther/data";
import { pedirAClinica } from "@/lib/clinica/api";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { cn } from "@/lib/utils";

/* Ubicación: src/routes/demo_.soporte.tsx
   SOPORTE DE CLOUD ESTHER: la clínica le escribe al equipo de Cloud Esther (consulta, problema o
   pedido) y sigue la conversación acá. En la clínica real va al panel de Cloud Esther
   (Atención a clínicas) y lo que responde el equipo aparece en la misma conversación.
   En el demo se guarda en este navegador y se simula la primera respuesta. */

export const Route = createFileRoute("/demo_/soporte")({
  head: () => ({ meta: [{ title: "Soporte de Cloud Esther | Cloud Esther" }] }),
  component: () => (
    <CloudEstherProvider>
      <AppShell>
        <Soporte />
      </AppShell>
    </CloudEstherProvider>
  ),
});

type Mensaje = { fecha: string; autor: string; texto: string; deLaClinica?: boolean };
type Caso = { id: string; tipo: string; asunto: string; estado: string; creado: string; mensajes: Mensaje[] };
const TIPOS = [
  ["Consulta", "Tengo una duda de cómo usar algo"],
  ["Incidencia", "Algo no funciona"],
  ["Solicitud administrativa", "Facturación, plan o datos de la cuenta"],
] as const;
const CLAVE_DEMO = "cloud-esther-demo:soporte";
const INPUT =
  "w-full rounded-xl border border-primary/15 bg-card px-3.5 py-2.5 text-sm outline-none focus:border-primary/40";
const TONO: Record<string, string> = {
  Nuevo: "bg-primary/10 text-primary",
  "En curso": "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  "Esperando a la clínica": "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  Resuelto: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
};
const ESTADO_TEXTO: Record<string, string> = {
  Nuevo: "Recibido",
  "En curso": "En curso",
  "Esperando a la clínica": "Te respondimos",
  Resuelto: "Resuelto",
};
const fechaCorta = (iso: string) =>
  new Date(iso).toLocaleString("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

function leerDemo(): Caso[] {
  try {
    return JSON.parse(window.localStorage.getItem(CLAVE_DEMO) ?? "[]") as Caso[];
  } catch {
    return [];
  }
}
function guardarDemo(c: Caso[]) {
  try {
    window.localStorage.setItem(CLAVE_DEMO, JSON.stringify(c));
  } catch {
    /* sin almacenamiento */
  }
}

function Soporte() {
  const real = useClinicaReal();
  const [casos, setCasos] = useState<Caso[] | null>(null);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = async () => {
    if (!real) return setCasos(leerDemo());
    try {
      setCasos(await pedirAClinica<Caso[]>(real.slug, "GET", "/soporte"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar.");
      setCasos([]);
    }
  };
  useEffect(() => {
    void cargar();
    if (!real) return;
    // Mira cada minuto si el equipo respondió
    const t = window.setInterval(() => void cargar(), 60_000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [real?.slug]);

  const actualizar = (c: Caso) => {
    setCasos((prev) => {
      const lista = [c, ...(prev ?? []).filter((x) => x.id !== c.id)];
      if (!real) guardarDemo(lista);
      return lista;
    });
  };

  const caso = casos?.find((c) => c.id === abierto) ?? null;
  const abiertos = (casos ?? []).filter((c) => c.estado !== "Resuelto").length;

  return (
    <div className="ce-clinica mx-auto w-full max-w-[1100px] space-y-5 px-4 py-6 md:px-6 lg:px-8">
      <HeroModulo
        chip="Soporte"
        icon={LifeBuoy}
        titulo="Soporte de Cloud Esther"
        descripcion="Escribile al equipo de Cloud Esther: dudas, algo que no funciona o pedidos de tu cuenta. Te respondemos acá mismo y te avisamos."
        kpis={[
          { l: "Abiertas", v: String(abiertos), s: "conversaciones en curso", i: MessageCircle },
          { l: "Respuesta", v: "< 24 h", s: "días hábiles", i: Clock3 },
          { l: "Privado", v: "Solo tu clínica", s: "nadie más ve tus mensajes", i: ShieldCheck },
        ]}
      />
      {error && <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>}
      {caso ? (
        <Conversacion
          caso={caso}
          slug={real?.slug ?? null}
          onVolver={() => setAbierto(null)}
          onCambio={actualizar}
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <NuevoCaso
            slug={real?.slug ?? null}
            onCreado={(c) => {
              actualizar(c);
              setAbierto(c.id);
            }}
          />
          <section className="card-premium p-5">
            <h2 className="text-base font-semibold">Tus conversaciones</h2>
            {casos === null ? (
              <p className="mt-3 animate-pulse text-sm text-muted-foreground">Cargando…</p>
            ) : casos.length === 0 ? (
              <p className="mt-3 rounded-2xl border border-dashed border-primary/20 p-5 text-center text-sm text-muted-foreground">
                Todavía no escribiste a soporte. Cuando lo hagas, la conversación queda acá.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {casos.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setAbierto(c.id)}
                      className="flex w-full items-start gap-3 rounded-2xl border border-primary/10 bg-card p-3 text-left transition hover:border-primary/30 hover:bg-primary/[0.03]"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <MessageCircle className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{c.asunto}</span>
                        <span className="block text-xs text-muted-foreground">
                          {c.tipo} · {fechaCorta(c.mensajes.at(-1)?.fecha ?? c.creado)}
                        </span>
                      </span>
                      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold", TONO[c.estado])}>
                        {ESTADO_TEXTO[c.estado] ?? c.estado}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function NuevoCaso({ slug, onCreado }: { slug: string | null; onCreado: (c: Caso) => void }) {
  const [tipo, setTipo] = useState<string>("Consulta");
  const [asunto, setAsunto] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [urgente, setUrgente] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    if (asunto.trim().length < 3) return setError("Escribí un asunto corto.");
    if (mensaje.trim().length < 5) return setError("Contanos un poco más.");
    setError(null);
    setEnviando(true);
    try {
      let c: Caso;
      if (slug) {
        c = await pedirAClinica<Caso>(slug, "POST", "/soporte", {
          tipo,
          asunto: asunto.trim(),
          mensaje: mensaje.trim(),
          urgente,
        });
      } else {
        const ahora = new Date().toISOString();
        c = {
          id: `demo-${Date.now()}`,
          tipo,
          asunto: asunto.trim(),
          estado: "Esperando a la clínica",
          creado: ahora,
          mensajes: [
            { fecha: ahora, autor: "Vos", texto: mensaje.trim(), deLaClinica: true },
            {
              fecha: new Date(Date.now() + 1000).toISOString(),
              autor: "Equipo de Cloud Esther",
              texto:
                "¡Hola! Recibimos tu mensaje y ya lo estamos viendo. Te respondemos por acá en menos de 24 horas hábiles. (En el demo esta respuesta es automática.)",
            },
          ],
        };
      }
      setAsunto("");
      setMensaje("");
      setUrgente(false);
      onCreado(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section className="card-premium space-y-4 p-5">
      <div>
        <h2 className="text-base font-semibold">Escribir a soporte</h2>
        <p className="text-xs text-muted-foreground">Contanos qué pasa y te respondemos acá.</p>
      </div>
      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">¿De qué se trata?</span>
        <Seleccion value={tipo} onChange={(e) => setTipo(e.target.value)} className={INPUT}>
          {TIPOS.map(([v, t]) => (
            <option key={v} value={v}>
              {t}
            </option>
          ))}
        </Seleccion>
      </label>
      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Asunto</span>
        <input
          value={asunto}
          onChange={(e) => setAsunto(e.target.value)}
          maxLength={160}
          placeholder="Ej.: no puedo imprimir las recetas"
          className={INPUT}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Mensaje</span>
        <textarea
          value={mensaje}
          onChange={(e) => setMensaje(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="Contanos qué estabas haciendo y qué pasó."
          className={cn(INPUT, "resize-none")}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={urgente} onChange={(e) => setUrgente(e.target.checked)} />
        Es urgente (no puedo trabajar)
      </label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <button type="button" disabled={enviando} onClick={() => void enviar()} className="btn-ce w-full justify-center">
        <Send className="size-4" /> {enviando ? "Enviando…" : "Enviar a soporte"}
      </button>
    </section>
  );
}

function Conversacion({
  caso,
  slug,
  onVolver,
  onCambio,
}: {
  caso: Caso;
  slug: string | null;
  onVolver: () => void;
  onCambio: (c: Caso) => void;
}) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async () => {
    if (!texto.trim()) return;
    setEnviando(true);
    setError(null);
    try {
      const c = slug
        ? await pedirAClinica<Caso>(slug, "POST", `/soporte/${caso.id}/mensajes`, { texto: texto.trim() })
        : {
            ...caso,
            estado: "En curso",
            mensajes: [
              ...caso.mensajes,
              { fecha: new Date().toISOString(), autor: "Vos", texto: texto.trim(), deLaClinica: true },
            ],
          };
      setTexto("");
      onCambio(c);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar.");
    } finally {
      setEnviando(false);
    }
  };

  const esEquipo = (m: Mensaje) => (m.deLaClinica === undefined ? m.autor !== "Vos" : !m.deLaClinica);

  return (
    <section className="card-premium p-5">
      <button type="button" onClick={onVolver} className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
        <ArrowLeft className="size-3.5" /> Volver
      </button>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{caso.asunto}</h2>
          <p className="text-xs text-muted-foreground">
            {caso.tipo} · iniciada el {fechaCorta(caso.creado)}
          </p>
        </div>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", TONO[caso.estado])}>
          {ESTADO_TEXTO[caso.estado] ?? caso.estado}
        </span>
      </div>
      <ul className="mt-4 space-y-3">
        {caso.mensajes.map((m, i) => {
          const equipo = esEquipo(m);
          return (
            <li key={i} className={cn("flex", equipo ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  equipo
                    ? "rounded-tl-md border border-primary/15 bg-primary/[0.05]"
                    : "rounded-tr-md bg-gradient-to-br from-primary to-fuchsia-500 text-white",
                )}
              >
                <p className={cn("mb-0.5 text-[11px] font-semibold", equipo ? "text-primary" : "text-white/80")}>
                  {equipo ? m.autor || "Equipo de Cloud Esther" : "Vos"} · {fechaCorta(m.fecha)}
                </p>
                <p className="whitespace-pre-line">{m.texto}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 flex items-end gap-2">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={2}
          maxLength={4000}
          placeholder="Escribí tu respuesta…"
          className={cn(INPUT, "flex-1 resize-none")}
        />
        <button
          type="button"
          disabled={enviando || !texto.trim()}
          onClick={() => void enviar()}
          aria-label="Enviar"
          className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-white shadow-[0_10px_22px_-12px_rgba(124,58,237,0.9)] disabled:opacity-50"
        >
          <Send className="size-4" />
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </section>
  );
}
