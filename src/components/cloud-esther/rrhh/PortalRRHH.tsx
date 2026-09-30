import { useState } from "react";
import { CalendarPlus, Check, Megaphone, Palmtree, Pin, Printer, Receipt } from "lucide-react";
import { TIPOS_AUSENCIA, useEquipo, type TipoAusencia } from "@/lib/cloud-esther/equipo-store";
import type { TeamMember } from "@/lib/cloud-esther/equipo-profesional-data";
import {
  calcularRecibo,
  diaISO,
  legajoDe,
  marcas,
  nombreDe,
  nombrePeriodo,
  saldoVacaciones,
  setRRHH,
  solicitarLicencia,
  storeRRHH,
} from "@/lib/cloud-esther/rrhh-store";
import { imprimirRecibo } from "./Nomina";
import { formatoMoneda } from "@/lib/cloud-esther/nomina-paises";
import { ars, fecha, hace } from "./ui";

/* Bloques de RRHH dentro del portal del equipo: comunicados, vacaciones y recibos de sueldo. */

const TARJETA = "card-grad p-4";
const BTN = "btn-ce-outline";

export function ComunicadosPortal({
  yo,
  vista,
  onToast,
}: {
  yo: TeamMember;
  vista: boolean;
  onToast: (m: string) => void;
}) {
  const { comunicados } = storeRRHH.usar();
  const mios = comunicados
    .filter((c) => c.destino === "Todos" || c.destino === yo.role)
    .sort((a, b) => Number(b.fijado) - Number(a.fijado) || b.fecha.localeCompare(a.fecha))
    .slice(0, 6);
  if (!mios.length) return null;
  return (
    <div className={TARJETA}>
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Megaphone className="size-4 text-primary" /> Comunicados de la clínica
      </p>
      <ul className="mt-2 space-y-2">
        {mios.map((c) => {
          const leido = c.leidos.includes(yo.id);
          return (
            <li
              key={c.id}
              className={`rounded-xl px-3 py-2.5 ring-1 ${leido ? "bg-white/70 ring-primary/10" : "bg-primary/[0.06] ring-primary/25"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  {c.fijado && <Pin className="size-3.5 text-primary" />}
                  {c.titulo}
                </p>
                {!leido && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
              </div>
              <p className="mt-1 whitespace-pre-line text-xs leading-5 text-muted-foreground">
                {c.texto}
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[10.5px] text-muted-foreground">
                <span>
                  {c.autor} · {hace(c.fecha)}
                </span>
                {leido ? (
                  <span className="flex items-center gap-1 font-semibold text-emerald-600">
                    <Check className="size-3" /> Leído
                  </span>
                ) : (
                  <button
                    type="button"
                    className="rounded-full bg-primary px-2.5 py-0.5 font-semibold text-primary-foreground"
                    onClick={() => {
                      if (vista) return onToast("En la vista previa no se marcan lecturas.");
                      setRRHH("comunicados", (p) =>
                        p.map((x) => (x.id === c.id ? { ...x, leidos: [...x.leidos, yo.id] } : x)),
                      );
                      onToast("Marcado como leído");
                    }}
                  >
                    Marcar como leído
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function MiRRHHPortal({
  yo,
  vista,
  onToast,
}: {
  yo: TeamMember;
  vista: boolean;
  onToast: (m: string) => void;
}) {
  const { miembros, ausencias } = useEquipo();
  const { legajos, solicitudes, periodos, config, fichajes } = storeRRHH.usar();
  const l = legajoDe(yo, legajos);
  const s = saldoVacaciones(yo.id, l.ingreso, ausencias);
  const [abrir, setAbrir] = useState(false);
  const [tipo, setTipo] = useState<TipoAusencia>("Vacaciones");
  const [desde, setDesde] = useState(diaISO(14));
  const [hasta, setHasta] = useState(diaISO(20));
  const [motivo, setMotivo] = useState("");
  const misSolicitudes = solicitudes.filter((x) => x.miembroId === yo.id).slice(0, 4);
  const pagados = periodos
    .filter((p) => p.estado === "Pagada")
    .slice(-3)
    .reverse();
  const todas = marcas(fichajes, miembros, config.toleranciaMin);
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className={TARJETA}>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Palmtree className="size-4 text-primary" /> Mis vacaciones y licencias
        </p>
        <div className="mt-2 flex items-end gap-2">
          <p className="text-3xl font-bold text-primary">{s.disponibles}</p>
          <p className="pb-1 text-xs text-muted-foreground">
            de {s.total} días disponibles en {diaISO().slice(0, 4)}
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-primary"
            style={{ width: `${s.total ? (s.disponibles / s.total) * 100 : 0}%` }}
          />
        </div>
        {misSolicitudes.length > 0 && (
          <ul className="mt-3 space-y-1">
            {misSolicitudes.map((x) => (
              <li
                key={x.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-white/80 px-3 py-1.5 text-xs"
              >
                <span className="truncate">
                  {x.tipo} · {fecha(x.desde)} al {fecha(x.hasta)}
                </span>
                <span
                  className={`shrink-0 font-semibold ${x.estado === "Aprobada" ? "text-emerald-600" : x.estado === "Rechazada" ? "text-rose-600" : "text-amber-700"}`}
                >
                  {x.estado}
                </span>
              </li>
            ))}
          </ul>
        )}
        {abrir ? (
          <form
            className="mt-3 space-y-2 rounded-xl bg-white/80 p-3 ring-1 ring-primary/10"
            onSubmit={(e) => {
              e.preventDefault();
              if (vista) return onToast("En la vista previa no se envían solicitudes.");
              if (hasta < desde) return onToast("La fecha de fin no puede ser anterior al inicio.");
              solicitarLicencia({
                miembroId: yo.id,
                tipo,
                desde,
                hasta,
                motivo: motivo.trim(),
                origen: "Portal del equipo",
              });
              setAbrir(false);
              setMotivo("");
              onToast("Solicitud enviada a RRHH: te avisamos cuando la respondan");
            }}
          >
            <select
              aria-label="Tipo de licencia"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoAusencia)}
              className="h-10 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm"
            >
              {TIPOS_AUSENCIA.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                aria-label="Desde"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                className="h-10 rounded-xl border border-primary/15 bg-white px-3 text-sm"
              />
              <input
                type="date"
                aria-label="Hasta"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                className="h-10 rounded-xl border border-primary/15 bg-white px-3 text-sm"
              />
            </div>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Motivo (opcional)"
              className="h-10 w-full rounded-xl border border-primary/15 bg-white px-3 text-sm"
            />
            <div className="flex gap-2">
              <button type="button" className={`${BTN} flex-1`} onClick={() => setAbrir(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-ce flex-1">
                Enviar
              </button>
            </div>
          </form>
        ) : (
          <button type="button" className={`${BTN} mt-3 w-full`} onClick={() => setAbrir(true)}>
            <CalendarPlus className="size-3.5" /> Pedir vacaciones o licencia
          </button>
        )}
      </div>
      <div className={TARJETA}>
        <p className="flex items-center gap-2 text-sm font-semibold">
          <Receipt className="size-4 text-primary" /> Mis recibos de sueldo
        </p>
        {pagados.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">Todavía no hay recibos pagados.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {pagados.map((p) => {
              const r = calcularRecibo(yo, l, p, config, todas, ausencias);
              return (
                <li
                  key={p.periodo}
                  className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-primary/10"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{nombrePeriodo(p.periodo)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      Neto {formatoMoneda(r.neto, r.moneda)} · pagado {fecha(p.pagado)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Descargar recibo ${nombrePeriodo(p.periodo)}`}
                    className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary"
                    onClick={() => imprimirRecibo(r, yo, l, "Clínica Dental Esther")}
                  >
                    <Printer className="size-4" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Legajo {l.numero} · {l.modalidad} · ingreso {fecha(l.ingreso)}
        </p>
        <p className="text-[11px] text-muted-foreground">{nombreDe(yo)}</p>
      </div>
    </div>
  );
}
