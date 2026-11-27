import { useState } from "react";
import { CalendarCheck2, Check, Copy, ExternalLink, Globe, Lock, Plus } from "lucide-react";
import { useCloudEstherOpcional } from "@/lib/cloud-esther/data";
import { setAjustesAgendaStore, storeAgenda, TRATAMIENTOS, type ConfigReservaOnline } from "@/lib/cloud-esther/agenda-store";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { pedirAClinica } from "@/lib/clinica/api";
import { codigosParaWeb, configReserva, enlaceReserva, useNivelReserva, visibleEnReserva, type NivelReserva } from "@/lib/cloud-esther/reservas-online";
import { TurnosOnlineAdicional } from "@/components/cloud-esther/facturacion/ModulosAdicionales";
import { useClinicSettings } from "@/lib/cloud-esther/settings-store";
import { PLANES_MARCA } from "@/lib/cloud-esther/marca";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";

/* Ubicación: src/components/cloud-esther/TurnosOnline.tsx
   Agenda → «Turnos online»: la clínica arma su página pública de turnos (/turnos/<clínica>).
   Qué se puede reservar, con cuánta anticipación y, según el plan, si se confirma solo. */

const PLAN_TEXTO: Record<NivelReserva, { nombre: string; texto: string }> = {
  start: {
    nombre: "Start",
    texto: "Tu página muestra la clínica, el equipo y un botón para escribirte por WhatsApp. Para que los pacientes reserven solos, sumá «Turnos online» acá abajo o pasá al plan Pro.",
  },
  pro: {
    nombre: "Pro",
    texto: "Los pacientes eligen tratamiento, profesional, día y hora. El turno te llega «Pendiente» a la Agenda y vos lo confirmás.",
  },
  plus: {
    nombre: "Plus",
    texto: "Los pacientes reservan solos y, si querés, el turno queda confirmado sin que nadie lo apruebe. Recibe su enlace para cancelar o cambiar.",
  },
  grupo: {
    nombre: "Grupo",
    texto: "Todo lo de Plus y, además, el paciente elige en qué sede atenderse.",
  },
};

const chip = (on: boolean) =>
  `inline-flex h-8 items-center gap-1 rounded-full border px-3 text-xs font-semibold transition ${
    on ? "border-primary bg-primary text-primary-foreground" : "border-primary/15 bg-white text-muted-foreground hover:border-primary/40 hover:text-primary dark:bg-card"
  }`;

export function TurnosOnlinePanel({ onToast }: { onToast: (m: string) => void }) {
  const { ajustes } = storeAgenda.usar();
  const { miembros } = useEquipo();
  const ctx = useCloudEstherOpcional();
  const real = useClinicaReal();
  const { nivel, porAdicional } = useNivelReserva(ctx?.plan);
  const ajustesClinica = useClinicSettings(ctx?.clinic ?? "demo");
  const puedeEditar = !real || real.rol === "admin";
  const c = configReserva(ajustes?.reservaOnline);
  const slug = real?.slug ?? "demo";
  const link = enlaceReserva(slug);
  const visibles = miembros.filter(visibleEnReserva);
  const conHorario = visibles.filter((m) => m.schedule.some((d) => d.active && d.start && d.end));
  const [nuevo, setNuevo] = useState("");
  const set = (p: Partial<ConfigReservaOnline>) =>
    setAjustesAgendaStore((prev) => ({ ...(prev ?? {}), reservaOnline: { ...configReserva(prev?.reservaOnline), ...p } }));
  const opciones = [...new Set([...TRATAMIENTOS, ...c.tratamientos])];
  const reservaPosible = nivel !== "start";

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-fuchsia-600 p-4 text-white shadow-lg">
        <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-white/10 blur-xl" />
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-white/80">
          <Globe className="size-3.5" /> Tu página de turnos · {porAdicional ? "Start + Turnos online" : `plan ${PLAN_TEXTO[nivel].nombre}`}
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-white/95">{PLAN_TEXTO[nivel].texto}</p>
        <p className="mt-3 truncate rounded-xl bg-white/15 px-3 py-2 font-mono text-[11px] ring-1 ring-white/25">{link}</p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <a href={link} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white px-3 text-xs font-semibold text-primary shadow-sm">
            <ExternalLink className="size-3.5" /> Ver mi página
          </a>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(link).catch(() => {});
              onToast("Link copiado: pegalo en tu Instagram, Google o WhatsApp");
            }}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-semibold ring-1 ring-white/30 hover:bg-white/25"
          >
            <Copy className="size-3.5" /> Copiar link
          </button>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Sacá tu turno online acá: ${link}`)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/15 px-3 text-xs font-semibold ring-1 ring-white/30 hover:bg-white/25"
          >
            <IconoWhatsApp /> Compartir
          </a>
        </div>
      </div>

      <PaginaCompleta
        pasos={[
          ...(PLANES_MARCA.has(ctx?.plan ?? "")
            ? [{ ok: !!ajustesClinica.marca?.logo, titulo: "Logo y color de la clínica", donde: "Configuración → Tu marca", ir: "/demo/configuracion" }]
            : []),
          {
            ok: !!(ajustesClinica.datosClinica?.telefono && ajustesClinica.datosClinica?.direccion),
            titulo: "Teléfono (WhatsApp) y dirección",
            donde: "Configuración → Datos de la clínica",
            ir: "/demo/configuracion",
          },
          {
            ok: conHorario.length > 0,
            titulo: "Profesionales con días y horarios",
            donde: "Equipo → Agendas y horarios",
            ir: "/demo/equipo-profesional/agendas-horarios",
          },
          ...(reservaPosible ? [{ ok: c.activa, titulo: "Reservas online prendidas", donde: "Acá abajo", ir: "" }] : []),
        ]}
        puedeEditar={puedeEditar}
      />

      {nivel === "start" && <TurnosOnlineAdicional onToast={onToast} compacto />}

      <ParaTuWeb slug={slug} color={ajustesClinica.marca?.color || "#7c3aed"} onToast={onToast} puedeEditar={puedeEditar} />

      {!puedeEditar && (
        <p className="rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">Solo el dueño o la dirección cambian estos ajustes. Podés copiar y compartir el link.</p>
      )}

      {reservaPosible && (
        <label className={`flex items-center justify-between gap-3 rounded-2xl border border-primary/12 bg-white p-3.5 dark:bg-card ${puedeEditar ? "cursor-pointer" : "opacity-70"}`}>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Reservas online activas</span>
            <span className="block text-[11px] text-muted-foreground">
              {c.activa ? "Los pacientes ya pueden sacar turno solos desde tu página." : "Apagado: la página muestra la clínica y el botón de WhatsApp."}
            </span>
          </span>
          <input
            type="checkbox"
            checked={c.activa}
            disabled={!puedeEditar}
            onChange={(e) => {
              set({ activa: e.target.checked });
              onToast(e.target.checked ? "Reservas online activadas" : "Reservas online pausadas");
            }}
            className="size-5 shrink-0 accent-[var(--color-primary)]"
          />
        </label>
      )}

      {reservaPosible && c.activa && conHorario.length === 0 && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
          Ningún profesional tiene horario cargado. Cargalo en <b>Equipo</b> (días y horas de atención) para que aparezcan horarios libres.
        </p>
      )}

      {reservaPosible && (
        <fieldset disabled={!puedeEditar} className="min-w-0 space-y-5 disabled:opacity-70">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Qué pueden reservar</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {opciones.map((t) => {
                const on = c.tratamientos.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      const lista = on ? c.tratamientos.filter((x) => x !== t) : [...c.tratamientos, t];
                      if (lista.length === 0) return onToast("Dejá al menos un tratamiento");
                      set({ tratamientos: lista });
                    }}
                    className={chip(on)}
                  >
                    {on && <Check className="size-3" />} {t}
                  </button>
                );
              })}
            </div>
            <form
              className="mt-2 flex gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                const t = nuevo.trim();
                if (!t) return;
                if (!c.tratamientos.includes(t)) set({ tratamientos: [...c.tratamientos, t] });
                setNuevo("");
              }}
            >
              <input
                value={nuevo}
                onChange={(e) => setNuevo(e.target.value)}
                placeholder="Agregar otro (ej. Evaluación de ortodoncia)"
                maxLength={60}
                className="h-9 min-w-0 flex-1 rounded-xl border border-primary/12 bg-white px-3 text-sm outline-none focus:border-primary/45 focus:ring-4 focus:ring-primary/10 dark:bg-card"
              />
              <button type="submit" className="btn-ce-outline !h-9">
                <Plus className="size-3.5" /> Agregar
              </button>
            </form>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Hasta cuántos días adelante</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[7, 14, 30, 60, 90].map((n) => (
                  <button key={n} type="button" aria-pressed={c.diasAdelante === n} onClick={() => set({ diasAdelante: n })} className={chip(c.diasAdelante === n)}>
                    {n} días
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Anticipación mínima</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[0, 1, 2, 4, 12, 24, 48].map((n) => (
                  <button key={n} type="button" aria-pressed={c.horasAnticipacion === n} onClick={() => set({ horasAnticipacion: n })} className={chip(c.horasAnticipacion === n)}>
                    {n === 0 ? "Sin mínimo" : `${n} h`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className={`flex items-center justify-between gap-3 rounded-2xl border p-3.5 ${nivel === "pro" ? "border-dashed border-primary/20 bg-primary/[0.03]" : "border-primary/12 bg-white dark:bg-card"}`}>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-sm font-semibold">
                Confirmar solo {nivel === "pro" && <Lock className="size-3.5 text-muted-foreground" />}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                {nivel === "pro"
                  ? "Desde el plan Plus, el turno puede quedar «Confirmada» sin que nadie lo apruebe."
                  : c.confirmarSolo
                    ? "El turno entra «Confirmada» y el paciente recibe su enlace."
                    : "El turno entra «Pendiente» y lo confirma la recepción."}
              </span>
            </span>
            <input
              type="checkbox"
              checked={nivel !== "pro" && c.confirmarSolo}
              disabled={nivel === "pro"}
              onChange={(e) => set({ confirmarSolo: e.target.checked })}
              className="size-5 shrink-0 accent-[var(--color-primary)]"
            />
          </label>
        </fieldset>
      )}

      <fieldset disabled={!puedeEditar} className="min-w-0 space-y-4 disabled:opacity-70">
        <label className="flex items-center justify-between gap-3 rounded-2xl border border-primary/12 bg-white p-3.5 dark:bg-card">
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Mostrar el equipo</span>
            <span className="block text-[11px] text-muted-foreground">
              Foto y presentación de {visibles.length ? `${visibles.length} profesional${visibles.length === 1 ? "" : "es"}` : "los profesionales"} (se cargan en Equipo → Ficha para pacientes).
            </span>
          </span>
          <input type="checkbox" checked={c.mostrarEquipo} onChange={(e) => set({ mostrarEquipo: e.target.checked })} className="size-5 shrink-0 accent-[var(--color-primary)]" />
        </label>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Mensaje de bienvenida (opcional)</p>
          <textarea
            value={c.bienvenida}
            maxLength={300}
            rows={2}
            onChange={(e) => set({ bienvenida: e.target.value })}
            placeholder="Ej.: Atendemos con turno. Si es una urgencia, escribinos por WhatsApp."
            className="mt-2 w-full resize-none rounded-xl border border-primary/12 bg-white p-3 text-sm outline-none focus:border-primary/45 focus:ring-4 focus:ring-primary/10 dark:bg-card"
          />
        </div>
      </fieldset>

      <p className="flex items-start gap-2 rounded-xl bg-primary/[0.05] px-3 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
        <CalendarCheck2 className="mt-0.5 size-3.5 shrink-0 text-primary" />
        Los horarios salen de tu agenda real: el horario de cada profesional, sus ausencias, los turnos ya dados, los bloqueos y los feriados. Nunca se da un horario ocupado.
      </p>
    </div>
  );
}



/** ¿La clínica ya tiene su página web? Lo conecta el equipo de Cloud Esther: la clínica solo deja la dirección. */
function ParaTuWeb({ slug, color, onToast, puedeEditar }: { slug: string; color: string; onToast: (m: string) => void; puedeEditar: boolean }) {
  const { ajustes } = storeAgenda.usar();
  const pedido = ajustes?.reservaOnline?.pedidoWeb;
  const real = useClinicaReal();
  const [web, setWeb] = useState("");
  const [contacto, setContacto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const pedir = async () => {
    const dir = web.trim();
    if (!/\.[a-z]{2,}/i.test(dir)) return onToast("Escribí la dirección de tu página (ej. www.miclinica.com)");
    setEnviando(true);
    try {
      if (real) {
        const { link, boton, turnero } = codigosParaWeb(slug, color);
        await pedirAClinica(real.slug, "POST", "/soporte", {
          tipo: "Solicitud administrativa",
          asunto: "Conectar los turnos online a la página web de la clínica",
          mensaje:
            `Página web de la clínica: ${dir}\n` +
            (contacto.trim() ? `Quién maneja la web: ${contacto.trim()}\n` : "") +
            `\nLink de turnos: ${link}\n\nBotón para pegar:\n${boton}\n\nTurnero dentro de la web:\n${turnero}`,
        });
      }
      setAjustesAgendaStore((prev) => ({
        ...(prev ?? {}),
        reservaOnline: { ...configReserva(prev?.reservaOnline), pedidoWeb: { web: dir, fecha: new Date().toISOString() } },
      }));
      onToast("¡Listo! Nuestro equipo lo conecta y te avisa");
    } catch (e) {
      onToast(e instanceof Error ? e.message : "No se pudo enviar. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div className="rounded-2xl border border-primary/12 bg-white p-4 dark:bg-card">
      <p className="text-sm font-semibold">¿Ya tenés página web?</p>
      {pedido ? (
        <p className="mt-1.5 flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-[12px] text-emerald-800 ring-1 ring-emerald-200">
          <Check className="mt-0.5 size-4 shrink-0" />
          <span>
            Pedido enviado para <b>{pedido.web}</b>. Nuestro equipo pone el botón de turnos en tu web y te avisa cuando esté listo. No tenés que hacer nada.
          </span>
        </p>
      ) : (
        <>
          <p className="text-[12px] text-muted-foreground">Nosotros lo conectamos por vos: dejanos la dirección y ponemos el botón de turnos en tu web. No tenés que hacer nada técnico.</p>
          <fieldset disabled={!puedeEditar || enviando} className="mt-3 min-w-0 space-y-2">
            <input
              value={web}
              onChange={(e) => setWeb(e.target.value)}
              placeholder="Dirección de tu web (ej. www.miclinica.com)"
              inputMode="url"
              maxLength={160}
              className="h-10 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm outline-none focus:border-primary/45 focus:ring-4 focus:ring-primary/10 dark:bg-card"
            />
            <input
              value={contacto}
              onChange={(e) => setContacto(e.target.value)}
              placeholder="¿Quién te hace la web? WhatsApp o correo (opcional)"
              maxLength={160}
              className="h-10 w-full rounded-xl border border-primary/12 bg-white px-3 text-sm outline-none focus:border-primary/45 focus:ring-4 focus:ring-primary/10 dark:bg-card"
            />
            <button type="button" onClick={() => void pedir()} className="btn-ce w-full justify-center">
              {enviando ? "Enviando…" : "Que lo conecten por mí"}
            </button>
          </fieldset>
        </>
      )}
    </div>
  );
}

/** Lo que le falta a la página para verse completa (logo, teléfono, profesionales…). */
function PaginaCompleta({
  pasos,
  puedeEditar,
}: {
  pasos: { ok: boolean; titulo: string; donde: string; ir: string }[];
  puedeEditar: boolean;
}) {
  const hechos = pasos.filter((p) => p.ok).length;
  if (hechos === pasos.length) {
    return (
      <p className="flex items-center gap-2 rounded-2xl bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-200">
        <Check className="size-4" /> Tu página está completa: logo, datos y profesionales a la vista.
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-primary/12 bg-white p-3.5 dark:bg-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Dejá tu página completa</p>
        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
          {hechos} de {pasos.length}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/10">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-fuchsia-500" style={{ width: `${(hechos / pasos.length) * 100}%` }} />
      </div>
      <ul className="mt-3 space-y-1.5">
        {pasos.map((p) => (
          <li key={p.titulo} className="flex items-center gap-2.5 rounded-xl bg-primary/[0.035] px-3 py-2">
            <span className={`grid size-5 shrink-0 place-items-center rounded-full ${p.ok ? "bg-emerald-500 text-white" : "bg-white ring-1 ring-primary/25"}`}>
              {p.ok && <Check className="size-3" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className={`block text-xs font-semibold ${p.ok ? "text-muted-foreground line-through" : ""}`}>{p.titulo}</span>
              {!p.ok && <span className="block text-[10px] text-muted-foreground">{p.donde}</span>}
            </span>
            {!p.ok && p.ir && puedeEditar && (
              <a href={p.ir} className="shrink-0 rounded-full bg-primary px-2.5 py-1 text-[10px] font-semibold text-white">
                Completar
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
