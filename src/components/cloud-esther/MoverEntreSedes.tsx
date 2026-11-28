import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Landmark, Lock, MessageCircle, Unlock } from "lucide-react";
import { storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import { useCloudEsther } from "@/lib/cloud-esther/data";
import { useClinicSettings } from "@/lib/cloud-esther/settings-store";
import { trabajaEnSede } from "@/lib/cloud-esther/equipo-profesional-data";
import { storeFacturacion, paisFiscal } from "@/lib/cloud-esther/facturacion-store";
import { formatoMoneda } from "@/lib/cloud-esther/nomina-paises";
import { numeroWhatsApp, telefonoInternacional } from "@/lib/clinica/whatsapp";
import { Seleccion } from "@/components/ui/seleccion";

/* Ubicación: src/components/cloud-esther/MoverEntreSedes.tsx
   MOVER COSAS ENTRE SEDES (Multiempresa):
   · Pasar turnos de una sede a otra (un día que una sede no abre, una mudanza…): se ve antes
     cuáles pasan y cuáles no (el profesional no atiende en la otra sede), y después se le avisa
     a cada paciente por WhatsApp con la dirección nueva.
   · Las cajas de todas las sedes: cuál está abierta, quién la abrió, cuánto efectivo debería
     haber y cómo cerró la última vez (con su diferencia).
   (Los insumos ya se pasan entre sedes en Inventario → Comparativo por sede.) */

const INPUT =
  "h-10 w-full rounded-xl border border-border/70 bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10";

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const masDias = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const corta = (iso: string) => iso.split("-").reverse().slice(0, 2).join("/");

export function MoverTurnosDeSede({ sedes, onToast }: { sedes: string[]; onToast: (m: string) => void }) {
  const { turnos } = storeAgenda.usar();
  const { miembros } = useEquipo();
  const { pacientes } = usePacientes();
  const { clinic } = useCloudEsther();
  const settings = useClinicSettings(clinic);
  const [de, setDe] = useState(sedes[0] ?? "");
  const [a, setA] = useState(sedes[1] ?? "");
  const [desde, setDesde] = useState(hoyISO());
  const [hasta, setHasta] = useState(hoyISO());
  const [movidos, setMovidos] = useState<number[]>([]);
  useEffect(() => {
    if (!sedes.includes(de)) setDe(sedes[0] ?? "");
    if (!sedes.includes(a) || a === de) setA(sedes.find((s) => s !== de) ?? "");
  }, [sedes.join("|"), de]); // eslint-disable-line react-hooks/exhaustive-deps

  if (sedes.length < 2) return null;

  const miembroDe = (n: string) => miembros.find((m) => `${m.firstName} ${m.lastName}`.trim() === n);
  const candidatos = turnos
    .filter(
      (t) =>
        t.sucursal === de &&
        t.fecha >= desde &&
        t.fecha <= (hasta < desde ? desde : hasta) &&
        !["Cancelada", "Atendida", "Ausente"].includes(t.estado),
    )
    .sort((x, y) => `${x.fecha}${x.hora}`.localeCompare(`${y.fecha}${y.hora}`));
  const pasan = candidatos.filter((t) => trabajaEnSede(miembroDe(t.odontologo), a, sedes));
  const noPasan = candidatos.filter((t) => !pasan.includes(t));

  const pasar = () => {
    if (!pasan.length || !a || a === de) return;
    const ids = new Set(pasan.map((t) => t.id));
    const est = storeAgenda.leer();
    storeAgenda.poner({ ...est, turnos: est.turnos.map((t) => (ids.has(t.id) ? { ...t, sucursal: a } : t)) });
    setMovidos((p) => [...p, ...ids]);
    onToast(`${ids.size} ${ids.size === 1 ? "turno pasó" : "turnos pasaron"} a ${a}. Avisale a cada paciente.`);
  };

  const avisados = turnos.filter((t) => movidos.includes(t.id));
  const direccion = (s: string) => settings.sedesDatos?.[s]?.direccion;
  const avisar = (t: (typeof turnos)[number]) => {
    const p = pacientes.find((x) => `${x.nombre} ${x.apellido}`.trim().toLowerCase() === t.paciente.trim().toLowerCase());
    const tel = numeroWhatsApp(p?.telefono ? telefonoInternacional(p.telefono) : null);
    const dir = direccion(t.sucursal);
    const texto = `Hola ${t.paciente.split(" ")[0]}, te avisamos que tu turno del ${corta(t.fecha)} a las ${t.hora} es en nuestra sede ${t.sucursal}${dir ? ` (${dir})` : ""}. Cualquier cosa, respondé este mensaje.`;
    window.open(`https://wa.me/${tel ?? ""}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <section className="rounded-3xl border border-primary/15 bg-card/85 p-5 shadow-sm backdrop-blur-md md:p-6">
      <h2 className="text-lg font-semibold text-foreground">Pasar turnos a otra sede</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Por ejemplo, un día que una sede no abre. Solo pasan los turnos de profesionales que también atienden en la otra sede.</p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">De</span>
          <Seleccion value={de} onChange={(e) => setDe(e.target.value)} className={INPUT} aria-label="Sede de origen">
            {sedes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Seleccion>
        </label>
        <ArrowRight className="mx-auto mb-2.5 hidden size-4 text-primary sm:block" />
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">A</span>
          <Seleccion value={a} onChange={(e) => setA(e.target.value)} className={INPUT} aria-label="Sede de destino">
            {sedes
              .filter((s) => s !== de)
              .map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
          </Seleccion>
        </label>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:max-w-md">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Desde</span>
          <input type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={INPUT} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-muted-foreground">Hasta</span>
          <input type="date" value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} className={INPUT} />
        </label>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {[
          ["Hoy", 0],
          ["Mañana", 1],
          ["Esta semana", 6],
        ].map(([l, n]) => (
          <button
            key={l}
            type="button"
            onClick={() => {
              const h = hoyISO();
              setDesde(n === 1 ? masDias(h, 1) : h);
              setHasta(masDias(h, Number(n)));
            }}
            className="rounded-full border border-primary/20 bg-white px-3 py-1 text-xs font-semibold text-foreground/80 hover:border-primary/40"
          >
            {l}
          </button>
        ))}
      </div>

      <div className="mt-4 rounded-2xl bg-primary/[0.04] p-3 text-sm">
        {candidatos.length === 0 ? (
          <p className="text-muted-foreground">No hay turnos por venir en {de} en esas fechas.</p>
        ) : (
          <>
            <p>
              <b>{pasan.length}</b> de {candidatos.length} {candidatos.length === 1 ? "turno pasa" : "turnos pasan"} a <b>{a}</b>.
            </p>
            {noPasan.length > 0 && (
              <ul className="mt-2 space-y-1 text-xs text-amber-800">
                {noPasan.slice(0, 6).map((t) => (
                  <li key={t.id}>
                    {corta(t.fecha)} {t.hora} · {t.paciente}: {t.odontologo} no atiende en {a}. Cambialo a mano en la Agenda.
                  </li>
                ))}
                {noPasan.length > 6 && <li>Y {noPasan.length - 6} más.</li>}
              </ul>
            )}
            <button type="button" disabled={!pasan.length} onClick={pasar} className="btn-ce mt-3 disabled:opacity-50">
              Pasar {pasan.length} {pasan.length === 1 ? "turno" : "turnos"} a {a}
            </button>
          </>
        )}
      </div>

      {avisados.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold">Avisale a cada paciente</p>
          <ul className="mt-2 space-y-1.5">
            {avisados.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/85 px-3 py-2 text-xs ring-1 ring-primary/10">
                <span className="min-w-0 truncate">
                  <b>
                    {corta(t.fecha)} {t.hora}
                  </b>{" "}
                  · {t.paciente} → {t.sucursal}
                </span>
                <button
                  type="button"
                  onClick={() => avisar(t)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#25D366] px-3 py-1 text-xs font-semibold text-white"
                >
                  <MessageCircle className="size-3.5" /> Avisar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/* Las cajas de todas las sedes, de un vistazo */
export function CajasDeLasSedes({ sedes }: { sedes: string[] }) {
  const { sesiones, movimientos, config } = storeFacturacion.usar();
  const moneda = paisFiscal(config.pais).moneda;
  const $ = (n: number) => (n < 0 ? `−${formatoMoneda(-n, moneda)}` : formatoMoneda(n, moneda));
  const efectivo = (sesionId: string, inicial: number) => {
    const m = movimientos.filter((x) => x.sesionId === sesionId && x.medio === "Efectivo");
    return inicial + m.filter((x) => x.tipo === "Ingreso").reduce((s, x) => s + x.monto, 0) - m.filter((x) => x.tipo === "Egreso").reduce((s, x) => s + x.monto, 0);
  };
  const cobradoEn = (sesionId: string) => movimientos.filter((x) => x.sesionId === sesionId && x.tipo === "Ingreso").reduce((s, x) => s + x.monto, 0);
  const hora = (iso: string) => new Date(iso).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
  const irACaja = (sede: string) => {
    try {
      sessionStorage.setItem("cloud-esther:caja-sede", sede);
    } catch {
      /* sin almacenamiento */
    }
  };

  return (
    <section className="rounded-3xl border border-primary/15 bg-card/85 p-5 shadow-sm backdrop-blur-md md:p-6">
      <h2 className="text-lg font-semibold text-foreground">Las cajas de tus sedes</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Cuál está abierta, cuánto efectivo debería haber y cómo cerró cada una.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" data-movil="1col">
        {sedes.map((s) => {
          const abierta = sesiones.find((x) => x.sucursal === s && !x.cerrada);
          const ultima = sesiones.filter((x) => x.sucursal === s && x.cerrada).sort((x, y) => y.cerrada.localeCompare(x.cerrada))[0];
          const dif = ultima ? ultima.contado - efectivo(ultima.id, ultima.inicial) : 0;
          return (
            <div key={s} className={`rounded-2xl border bg-white/85 p-4 ${abierta ? "border-emerald-200" : "border-primary/10"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Landmark className="size-4" />
                  </span>
                  <b className="truncate text-sm">{s}</b>
                </span>
                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${abierta ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"}`}
                >
                  {abierta ? <Unlock className="size-3" /> : <Lock className="size-3" />}
                  {abierta ? "Abierta" : "Cerrada"}
                </span>
              </div>
              {abierta ? (
                <dl className="mt-3 grid grid-cols-2 gap-y-1 text-[12px]">
                  <dt className="text-muted-foreground">Abrió</dt>
                  <dd className="truncate text-right">
                    {abierta.usuario} · {hora(abierta.abierta)}
                  </dd>
                  <dt className="text-muted-foreground">Cobrado</dt>
                  <dd className="text-right font-semibold tabular-nums">{$(cobradoEn(abierta.id))}</dd>
                  <dt className="text-muted-foreground">Efectivo en caja</dt>
                  <dd className="text-right font-semibold tabular-nums">{$(efectivo(abierta.id, abierta.inicial))}</dd>
                </dl>
              ) : ultima ? (
                <dl className="mt-3 grid grid-cols-2 gap-y-1 text-[12px]">
                  <dt className="text-muted-foreground">Último cierre</dt>
                  <dd className="truncate text-right">
                    {fecha(ultima.cerrada)} {hora(ultima.cerrada)}
                    {ultima.cerradaPor ? ` · ${ultima.cerradaPor}` : ""}
                  </dd>
                  <dt className="text-muted-foreground">Contado</dt>
                  <dd className="text-right font-semibold tabular-nums">{$(ultima.contado)}</dd>
                  <dt className="text-muted-foreground">Diferencia</dt>
                  <dd className={`text-right font-semibold tabular-nums ${Math.round(dif) === 0 ? "text-emerald-600" : "text-rose-600"}`}>
                    {Math.round(dif) === 0 ? "Sin diferencia" : $(dif)}
                  </dd>
                </dl>
              ) : (
                <p className="mt-3 text-xs text-muted-foreground">Todavía no se abrió la caja de esta sede.</p>
              )}
              <Link
                to={"/demo/facturacion" as never}
                hash="caja"
                onClick={() => irACaja(s)}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Ir a la caja <ArrowRight className="size-3.5" />
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
