import { BookOpen, Building2, Mail, Pencil, Phone, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { Cargando, Seccion, StatusBadge, Vacio } from "@/components/admin/bits";
import { Campo, DialogoFormulario, INPUT, Pildora, Tabla, confirmar } from "@/components/admin/formularios";
import { RegistroLlamadas, enlaceLlamar, useAutor } from "@/components/admin/herramientas-atencion";
import { puede, useRole } from "@/components/admin/role";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { borrarDe, guardarEn, nuevoIdLocal } from "@/lib/admin/api";
import { useAccion, useClinicas, useColeccion } from "@/lib/admin/consultas";
import { NOMBRE_PLAN, enlaceWhatsApp, fecha, haceCuanto } from "@/lib/admin/formato";
import type { Guia, TicketSoporte } from "@/lib/admin/tipos-empresa";

/* Ubicación: src/components/admin/herramientas-soporte.tsx
   Herramientas del técnico de Soporte:
   · TIEMPOS DE RESPUESTA: cuánto lleva cada ticket abierto y aviso en rojo si se pasa.
   · FICHA TÉCNICA de cada clínica: plan, pago, contacto, tickets, casos y llamadas juntos.
   · GUÍAS Y SOLUCIONES: problemas comunes y cómo se resolvieron. */

/** Tiempo máximo para resolver un ticket según su prioridad (horas). */
export const LIMITE_HORAS: Record<TicketSoporte["prioridad"], number> = { Alta: 4, Media: 24, Baja: 72 };
const ABIERTOS: TicketSoporte["estado"][] = ["Nuevo", "En revisión", "En progreso", "En espera"];

/** Horas que lleva abierto (o que tardó, si ya se resolvió). */
export function horasTicket(t: TicketSoporte, ahora = Date.now()): number {
  const fin = t.resuelto ? new Date(t.resuelto).getTime() : ahora;
  return Math.max(0, (fin - new Date(t.abierto).getTime()) / 3_600_000);
}
export const fueraDeTiempo = (t: TicketSoporte, ahora = Date.now()) =>
  ABIERTOS.includes(t.estado) && horasTicket(t, ahora) > LIMITE_HORAS[t.prioridad];

export function textoHoras(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(h < 10 ? 1 : 0)} h`;
  return `${Math.round(h / 24)} días`;
}

/** Celda «Tiempo»: verde dentro del plazo, rojo si se pasó. */
export function TiempoTicket({ t }: { t: TicketSoporte }) {
  const h = horasTicket(t);
  const limite = LIMITE_HORAS[t.prioridad];
  if (!ABIERTOS.includes(t.estado)) {
    return <span className="text-xs text-muted-foreground">Resuelto en {textoHoras(h)}</span>;
  }
  const tarde = h > limite;
  return (
    <span className={`text-xs font-semibold ${tarde ? "text-destructive" : h > limite * 0.75 ? "text-warning-foreground" : "text-success"}`}>
      {textoHoras(h)} / {limite} h{tarde ? " · fuera de tiempo" : ""}
    </span>
  );
}

/* ───────────── Ficha técnica de una clínica ───────────── */

export function FichaClinica({ onAbrirTicket }: { onAbrirTicket: (id: string) => void }) {
  const { role } = useRole();
  const { data: clinicas, isLoading } = useClinicas();
  const { data: tickets } = useColeccion("ticketsSoporte");
  const { data: incidentes } = useColeccion("incidentes");
  const verCasos = puede(role, "atencion", "soporte");
  const { data: casos } = useColeccion("atencionClinicas");
  const [id, setId] = useState("");
  if (isLoading) return <Cargando />;
  const lista = clinicas ?? [];
  const c = lista.find((x) => x.id === id) ?? null;
  const susTickets = c ? (tickets ?? []).filter((t) => t.clinica === c.nombre).sort((a, b) => b.abierto.localeCompare(a.abierto)) : [];
  const susCasos = c && verCasos ? (casos ?? []).filter((x) => x.clinica === c.nombre) : [];
  const incidentesAbiertos = (incidentes ?? []).filter((i) => i.estado !== "Resuelto");
  const tel = c ? enlaceLlamar(c.contacto.telefono) : null;
  const wa = c ? enlaceWhatsApp(c.contacto.telefono) : null;

  return (
    <>
      <Seccion titulo="Ficha técnica de una clínica" descripcion="Elegí la clínica: ves su plan, su estado, cómo contactarla y todo su historial de soporte.">
        <select value={id} onChange={(e) => setId(e.target.value)} className={INPUT} aria-label="Clínica">
          <option value="">Elegí una clínica…</option>
          {lista.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nombre} · {x.pais}
            </option>
          ))}
        </select>
        {lista.length === 0 && <p className="mt-3 text-sm text-muted-foreground">Todavía no hay clínicas clientes.</p>}
      </Seccion>

      {c && (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4 lg:col-span-2">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold">{c.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.ciudad ? `${c.ciudad}, ` : ""}
                    {c.pais}
                    {c.slug ? ` · cloudesther.com/${c.slug}` : ""}
                  </p>
                </div>
                <StatusBadge status={c.estadoPago} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                {[
                  ["Plan", `${NOMBRE_PLAN[c.plan]} · ${c.ciclo}`],
                  ["Cliente desde", fecha(c.clienteDesde)],
                  ["Próximo cobro", fecha(c.proximoCobro)],
                  ["Último ingreso", c.ultimoAcceso ? haceCuanto(c.ultimoAcceso) : "—"],
                  ["Sucursales", String(c.uso.sucursales)],
                  ["Usuarios", String(c.uso.usuariosInternos)],
                  ["Pacientes activos", String(c.uso.pacientesActivos)],
                  ["Minutos de IA", String(c.uso.minutosIA)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{k}</dt>
                    <dd className="font-semibold">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-bold">Contacto</p>
              <p className="mt-1 text-sm">{c.contacto.nombre || "—"}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {tel && (
                  <Button asChild size="sm" variant="outline">
                    <a href={tel}>
                      <Phone className="mr-1 h-3.5 w-3.5" /> Llamar
                    </a>
                  </Button>
                )}
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" className="btn-wa !min-h-8 !text-xs">
                    <IconoWhatsApp /> WhatsApp
                  </a>
                )}
                {c.contacto.email && (
                  <Button asChild size="sm" variant="outline">
                    <a href={`mailto:${c.contacto.email}`}>
                      <Mail className="mr-1 h-3.5 w-3.5" /> Correo
                    </a>
                  </Button>
                )}
              </div>
              {incidentesAbiertos.length > 0 && (
                <p className="mt-4 rounded-xl bg-destructive/10 p-2.5 text-xs font-semibold text-destructive">
                  Hay {incidentesAbiertos.length} incidente{incidentesAbiertos.length === 1 ? "" : "s"} de la plataforma abierto
                  {incidentesAbiertos.length === 1 ? "" : "s"}: puede afectar a esta clínica.
                </p>
              )}
            </div>
          </div>

          <Seccion titulo={`Tickets de ${c.nombre}`} descripcion="Tocá uno para abrirlo." sinPadding>
            {susTickets.length === 0 ? (
              <div className="p-5">
                <Vacio titulo="Esta clínica no tiene tickets" />
              </div>
            ) : (
              <Tabla columnas={["Ticket", "Prioridad", "Estado", "Tiempo"]} minimo={600}>
                {susTickets.map((t) => (
                  <tr key={t.id} onClick={() => onAbrirTicket(t.id)} className="cursor-pointer border-t border-border/60 hover:bg-primary/[0.03]">
                    <td className="py-3 pl-5 pr-3">
                      <p className="font-semibold">{t.asunto}</p>
                      <p className="text-xs text-muted-foreground">
                        {t.id} · {t.categoria} · {fecha(t.abierto, true)}
                      </p>
                    </td>
                    <td className="px-3 py-3">
                      <Pildora tono={t.prioridad === "Alta" ? "peligro" : t.prioridad === "Media" ? "alerta" : "neutro"}>{t.prioridad}</Pildora>
                    </td>
                    <td className="px-3 py-3 text-xs">{t.estado}</td>
                    <td className="py-3 pl-3 pr-5">
                      <TiempoTicket t={t} />
                    </td>
                  </tr>
                ))}
              </Tabla>
            )}
          </Seccion>

          {verCasos && (
            <Seccion titulo="Casos de atención" descripcion="Lo que la clínica habló con las secretarias.">
              {susCasos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin casos de atención.</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {susCasos.map((x) => (
                    <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                      <span>
                        <b>{x.asunto}</b>{" "}
                        <span className="text-xs text-muted-foreground">
                          · {x.tipo} · {fecha(x.creado)}
                        </span>
                      </span>
                      <Pildora tono={x.estado === "Resuelto" ? "ok" : "alerta"}>{x.estado}</Pildora>
                    </li>
                  ))}
                </ul>
              )}
            </Seccion>
          )}

          <RegistroLlamadas editable={puede(role, "atencion", "soporte")} clinica={c.nombre} />
        </>
      )}
    </>
  );
}

/* ───────────── Guías y soluciones ───────────── */

const CATEGORIAS: Guia["categoria"][] = ["Acceso", "Facturación", "Error del sistema", "Consulta", "Mejora", "Integraciones"];

export function Guias({ editable }: { editable: boolean }) {
  const { data, isLoading } = useColeccion("guias");
  const borrar = useAccion((id: string) => borrarDe("guias", id), ["guias"], "Guía eliminada");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<"" | Guia["categoria"]>("");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [editando, setEditando] = useState<Guia | "nueva" | null>(null);
  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data ?? [])
      .filter((g) => !cat || g.categoria === cat)
      .filter((g) => !t || `${g.titulo} ${g.problema} ${g.solucion} ${g.etiquetas.join(" ")}`.toLowerCase().includes(t))
      .sort((a, b) => b.actualizada.localeCompare(a.actualizada));
  }, [data, q, cat]);

  return (
    <Seccion
      titulo="Guías y soluciones"
      descripcion="Problemas comunes y cómo se resolvieron. Antes de abrir un ticket, buscá acá."
      acciones={
        editable ? (
          <Button size="sm" onClick={() => setEditando("nueva")}>
            <Plus className="mr-1 h-4 w-4" /> Nueva guía
          </Button>
        ) : undefined
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: «no carga la agenda», «factura»…" className={`${INPUT} pl-9`} />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value as typeof cat)} className={`${INPUT} w-auto`} aria-label="Categoría">
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      {isLoading ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <Vacio titulo="Todavía no hay guías" texto="Cada vez que resuelvas algo que se puede repetir, guardalo acá." />
      ) : (
        <ul className="space-y-2">
          {lista.map((g) => (
            <li key={g.id} className="rounded-2xl border border-border">
              <button
                type="button"
                onClick={() => setAbierta(abierta === g.id ? null : g.id)}
                className="flex w-full items-start gap-3 p-4 text-left"
              >
                <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="flex-1">
                  <span className="block font-semibold">{g.titulo}</span>
                  <span className="text-xs text-muted-foreground">
                    {g.categoria} · actualizada {fecha(g.actualizada)} · {g.autor}
                  </span>
                </span>
                <Pildora tono="primario">{abierta === g.id ? "Cerrar" : "Ver"}</Pildora>
              </button>
              {abierta === g.id && (
                <div className="space-y-3 border-t border-border/60 p-4 text-sm">
                  {g.problema && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Problema</p>
                      <p className="whitespace-pre-wrap">{g.problema}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Solución</p>
                    <p className="whitespace-pre-wrap">{g.solucion}</p>
                  </div>
                  {g.etiquetas.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {g.etiquetas.map((e) => (
                        <Pildora key={e}>{e}</Pildora>
                      ))}
                    </div>
                  )}
                  {editable && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setEditando(g)}>
                        <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => confirmar(`¿Eliminar la guía «${g.titulo}»?`) && borrar.mutate(g.id)}
                      >
                        <Trash2 className="mr-1 h-3.5 w-3.5" /> Eliminar
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {editando && <DialogoGuia inicial={editando === "nueva" ? null : editando} onCerrar={() => setEditando(null)} />}
    </Seccion>
  );
}

function DialogoGuia({ inicial, onCerrar }: { inicial: Guia | null; onCerrar: () => void }) {
  const autor = useAutor();
  const guardar = useAccion((g: Guia) => guardarEn("guias", g), ["guias"], "Guía guardada");
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<Guia>(
    inicial ?? {
      id: nuevoIdLocal("gu"),
      titulo: "",
      categoria: "Error del sistema",
      problema: "",
      solucion: "",
      etiquetas: [],
      autor,
      actualizada: "",
    },
  );
  const [etiquetas, setEtiquetas] = useState(f.etiquetas.join(", "));
  const enviar = () => {
    if (!f.titulo.trim() || !f.solucion.trim()) return setError("Escribí el título y la solución.");
    setError(null);
    guardar.mutate(
      {
        ...f,
        titulo: f.titulo.trim(),
        problema: f.problema.trim(),
        solucion: f.solucion.trim(),
        autor,
        actualizada: new Date().toISOString().slice(0, 10),
        etiquetas: etiquetas
          .split(",")
          .map((e) => e.trim())
          .filter(Boolean)
          .slice(0, 20),
      },
      { onSuccess: onCerrar },
    );
  };
  return (
    <DialogoFormulario
      abierto
      titulo={inicial ? "Editar guía" : "Nueva guía"}
      onCerrar={onCerrar}
      onGuardar={enviar}
      guardando={guardar.isPending}
      error={error}
      ancho="sm:max-w-2xl"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Título" className="sm:col-span-2">
          <input value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} maxLength={200} className={INPUT} placeholder="Ej.: La agenda queda en blanco" />
        </Campo>
        <Campo label="Categoría">
          <select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value as Guia["categoria"] })} className={INPUT}>
            {CATEGORIAS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Etiquetas" ayuda="Separadas por coma">
          <input value={etiquetas} onChange={(e) => setEtiquetas(e.target.value)} className={INPUT} placeholder="agenda, navegador" />
        </Campo>
        <Campo label="Problema (qué le pasa a la clínica)" className="sm:col-span-2">
          <Textarea value={f.problema} onChange={(e) => setF({ ...f, problema: e.target.value })} rows={3} maxLength={4000} />
        </Campo>
        <Campo label="Solución (paso a paso)" className="sm:col-span-2">
          <Textarea value={f.solucion} onChange={(e) => setF({ ...f, solucion: e.target.value })} rows={6} maxLength={8000} />
        </Campo>
      </div>
    </DialogoFormulario>
  );
}
