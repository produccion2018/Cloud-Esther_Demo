import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { CalendarPlus, Check, ChevronDown, PhoneCall, Settings2, BrainCircuit, Zap } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MODULES, availableIn, useCloudEsther } from "@/lib/cloud-esther/data";
import { PLANTILLAS, setN8n, storeN8n } from "@/lib/cloud-esther/n8n-store";
import { useClinicaReal } from "@/lib/clinica/modo-clinica";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";
import { setAjustesAgendaStore, storeAgenda, type AjustesAgenda, type Turno } from "@/lib/cloud-esther/agenda-store";
import { usePacientes, type Paciente } from "@/lib/cloud-esther/pacientes";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { numeroWhatsApp } from "@/lib/clinica/whatsapp";

/* Ubicación: src/components/cloud-esther/pacientes/VolverALlamar.tsx
   "PARA VOLVER A LLAMAR": pacientes que se atendieron alguna vez, hace más de X meses que no
   vienen y no tienen turno agendado. X lo decide cada clínica (por defecto 6).
   Con un toque: WhatsApp con la invitación a un control, "Dar turno" (abre la Agenda con el
   paciente cargado) o "Ya lo llamé". Los avisados quedan marcados con la fecha. */

/** La Agenda abre "Nuevo turno" con este paciente al entrar (lo deja Pacientes) */
export const CLAVE_TURNO_PARA = "cloud-esther:turno-para";

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const fechaCorta = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
function mesesEntre(desde: string, hasta: string) {
  const [a1 = 0, m1 = 0, d1 = 0] = desde.split("-").map(Number);
  const [a2 = 0, m2 = 0, d2 = 0] = hasta.split("-").map(Number);
  return (a2 - a1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
}
export function textoTiempo(meses: number) {
  if (meses < 12) return `${meses} ${meses === 1 ? "mes" : "meses"}`;
  const a = Math.floor(meses / 12);
  const r = meses % 12;
  return `${a} ${a === 1 ? "año" : "años"}${r ? ` y ${r} ${r === 1 ? "mes" : "meses"}` : ""}`;
}

/* Cálculo compartido (Pacientes, Dashboard y el recordatorio diario de todos los planes) */
export function pacientesParaLlamar(
  pacientes: Paciente[],
  turnos: Turno[],
  ajustes: AjustesAgenda | undefined,
): { p: Paciente; ultima: string; sin: number; avisado: string }[] {
  const hoy = hoyISO();
  const meses = Math.min(60, Math.max(1, Math.round(ajustes?.recallMeses ?? 6)));
  const avisados = ajustes?.recallAvisados ?? {};
  return pacientes
    .filter((p) => p.estado === "Activo")
    .flatMap((p) => {
      const nombre = `${p.nombre} ${p.apellido}`.trim().toLowerCase();
      const suyos = turnos.filter((t) => t.paciente.trim().toLowerCase() === nombre);
      if (suyos.some((t) => t.fecha >= hoy && t.estado !== "Cancelada")) return [];
      const ultima = suyos
        .filter((t) => t.estado === "Atendida" && t.fecha <= hoy)
        .map((t) => t.fecha)
        .sort()
        .pop();
      if (!ultima) return [];
      const sin = mesesEntre(ultima, hoy);
      if (sin < meses) return [];
      return [{ p, ultima, sin, avisado: avisados[String(p.id)] ?? "" }];
    })
    .sort((a, b) => b.sin - a.sin);
}

export function VolverALlamar({ onToast }: { onToast: (m: string) => void }) {
  const { turnos, ajustes } = storeAgenda.usar();
  const { pacientes } = usePacientes();
  const { clinica } = useSesion();
  const navigate = useNavigate();
  const meses = Math.min(60, Math.max(1, Math.round(ajustes?.recallMeses ?? 6)));
  const avisados = ajustes?.recallAvisados ?? {};
  const [abierto, setAbierto] = useState(false);
  const [config, setConfig] = useState(false);
  const [valor, setValor] = useState(String(meses));
  const [verAvisados, setVerAvisados] = useState(false);

  // Automático: un flujo de Automatizaciones («Paciente para volver a llamar») los invita solo
  // por WhatsApp. Corre en el servidor aunque nadie tenga la app abierta.
  const { plan } = useCloudEsther();
  const real = useClinicaReal();
  const moduloAuto = MODULES.find((m) => m.id === "automatizaciones");
  const autoDisponible = !!moduloAuto && availableIn(moduloAuto, plan);
  const puedeConfigurar = !real || real.rol === "admin";
  const { flujos } = storeN8n.usar();
  const flujosRecall = flujos.filter((f) => f.evento === "paciente_inactivo");
  const automatico = flujosRecall.some((f) => f.activo);
  const alternarAutomatico = () => {
    if (automatico) {
      setN8n("flujos", (prev) => prev.map((f) => (f.evento === "paciente_inactivo" ? { ...f, activo: false } : f)));
      onToast("Invitación automática pausada: queda la lista para hacerlo a mano");
      return;
    }
    if (flujosRecall.length) {
      const id = flujosRecall[0]!.id;
      setN8n("flujos", (prev) => prev.map((f) => (f.id === id ? { ...f, activo: true } : f)));
    } else {
      const t = PLANTILLAS.find((x) => x.evento === "paciente_inactivo");
      if (!t) return;
      setN8n("flujos", (prev) => [
        ...prev,
        {
          id: `f-${Date.now()}`,
          nombre: t.nombre,
          evento: t.evento,
          pasos: t.pasos(),
          activo: true,
          sedes: "Todas",
          creado: new Date().toISOString(),
          plantilla: t.id,
        },
      ]);
    }
    onToast("Listo: los pacientes para volver a llamar se invitan solos por WhatsApp");
  };

  const lista = useMemo(() => pacientesParaLlamar(pacientes, turnos, ajustes), [pacientes, turnos, ajustes]);

  const pendientes = lista.filter((x) => !avisados[String(x.p.id)]);
  const yaAvisados = lista.filter((x) => avisados[String(x.p.id)]);
  const visibles = verAvisados ? lista : pendientes;

  const marcar = (id: number, si: boolean) => {
    const nuevo = { ...avisados };
    if (si) nuevo[String(id)] = new Date().toISOString();
    else delete nuevo[String(id)];
    setAjustesAgendaStore({ ...(ajustes ?? {}), recallAvisados: nuevo });
  };

  const whatsapp = (x: (typeof lista)[number]) => {
    const numero = numeroWhatsApp(x.p.telefono);
    if (!numero) {
      onToast(`${x.p.nombre} no tiene teléfono cargado. Agregalo en su ficha.`);
      return;
    }
    const texto = `Hola ${x.p.nombre} 👋 Te escribimos de ${clinica?.nombre ?? "la clínica"}. Ya pasaron ${textoTiempo(x.sin)} desde tu última visita y es un buen momento para un control. ¿Te reservamos un turno? Respondé este mensaje y coordinamos el día y horario que te quede mejor.`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
    marcar(x.p.id, true);
  };

  const darTurno = (x: (typeof lista)[number]) => {
    try {
      sessionStorage.setItem(CLAVE_TURNO_PARA, `${x.p.nombre} ${x.p.apellido}`.trim());
    } catch {
      /* sin almacenamiento */
    }
    void navigate({ to: "/demo/agenda" as never });
  };

  const guardarMeses = () => {
    const n = Math.min(60, Math.max(1, Math.round(Number(valor) || 6)));
    setAjustesAgendaStore({ ...(ajustes ?? {}), recallMeses: n });
    setConfig(false);
    onToast(`Se sugieren pacientes que no vienen hace ${textoTiempo(n)} o más`);
  };

  return (
    <section className="mt-4 overflow-hidden rounded-2xl border border-primary/12 bg-gradient-to-br from-white to-primary/[0.04] shadow-sm dark:from-card">
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-primary text-white shadow-sm">
          <PhoneCall className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold tracking-tight">Para volver a llamar</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                pendientes.length ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
              }`}
            >
              {pendientes.length}
            </span>
            {automatico && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300">
                <Zap className="size-3" />
                Automático
              </span>
            )}
          </span>
          <span className="block text-[11.5px] text-muted-foreground">
            No vienen hace {textoTiempo(meses)} o más y no tienen turno
          </span>
        </span>
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition ${abierto ? "rotate-180" : ""}`} />
      </button>

      {abierto && (
        <div className="border-t border-primary/10 px-3 pb-3 pt-2.5">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
            {yaAvisados.length > 0 ? (
              <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={verAvisados}
                  onChange={(e) => setVerAvisados(e.target.checked)}
                  className="size-4 accent-[var(--primary)]"
                />
                Ver también los ya avisados ({yaAvisados.length})
              </label>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => {
                setValor(String(meses));
                setConfig((c) => !c);
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary/5"
            >
              <Settings2 className="size-3.5" />
              Cada {textoTiempo(meses)}
            </button>
          </div>

          {/* Hacerlo automático (Automatizaciones) */}
          <div
            className={`mb-3 flex flex-wrap items-center gap-3 rounded-xl border px-3 py-2.5 ${
              automatico
                ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                : "border-primary/12 bg-primary/[0.03]"
            }`}
          >
            <span
              className={`grid size-8 shrink-0 place-items-center rounded-lg text-white shadow-sm ${
                automatico ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-primary to-fuchsia-500"
              }`}
            >
              {automatico ? <Zap className="size-4" /> : <BrainCircuit className="size-4" />}
            </span>
            <div className="min-w-0 flex-1 basis-48">
              <p className="text-sm font-semibold">
                {automatico ? "Automático activado" : autoDisponible ? "Que se haga solo" : "Te lo recordamos todos los días"}
              </p>
              <p className="text-[11.5px] leading-snug text-muted-foreground">
                {automatico
                  ? `Esther los invita sola por WhatsApp al cumplir ${textoTiempo(meses)} sin venir (una vez por período). Si no responden, queda una tarea para llamarlos.`
                  : autoDisponible
                    ? "Esther invita sola por WhatsApp a cada paciente cuando cumple el tiempo sin venir. Nadie tiene que acordarse."
                    : "Cada día te avisamos en Notificaciones y en el Inicio a quién invitar; el WhatsApp sale con un toque. Con Automatizaciones, Esther los invita sola."}
              </p>
            </div>
            {autoDisponible ? (
              puedeConfigurar ? (
                <div className="flex shrink-0 items-center gap-2">
                  {automatico && (
                    <Link to={"/demo/automatizaciones" as never} className="text-xs font-semibold text-primary hover:underline">
                      Ver flujo
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={alternarAutomatico}
                    className={automatico ? "btn-ce-outline" : "btn-ce"}
                  >
                    {automatico ? "Pausar" : "Activar"}
                  </button>
                </div>
              ) : (
                <span className="text-[11.5px] font-medium text-muted-foreground">Lo activa el administrador</span>
              )
            ) : (
              <Link to={"/demo/automatizaciones" as never} className="btn-ce-outline shrink-0">
                Ver Automatizaciones
              </Link>
            )}
          </div>

          {config && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/12 bg-white/80 p-3 text-sm dark:bg-card">
              <span className="text-muted-foreground">Sugerir a los que no vienen hace</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={60}
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="h-9 w-20 rounded-xl border border-primary/20 bg-white px-3 text-sm outline-none focus:border-primary/45 focus:ring-2 focus:ring-primary/15 dark:bg-card"
                aria-label="Meses sin venir"
              />
              <span className="text-muted-foreground">meses o más</span>
              <div className="flex flex-wrap gap-1.5">
                {[3, 6, 12].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setValor(String(m))}
                    className={`h-8 rounded-full border px-3 text-xs font-semibold transition ${
                      Number(valor) === m
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-primary/15 bg-white text-muted-foreground hover:text-primary dark:bg-card"
                    }`}
                  >
                    {m} meses
                  </button>
                ))}
              </div>
              <button type="button" onClick={guardarMeses} className="btn-ce ml-auto">
                Guardar
              </button>
            </div>
          )}

          {visibles.length === 0 ? (
            <p className="rounded-xl border border-dashed border-primary/20 px-4 py-5 text-center text-sm text-muted-foreground">
              {lista.length
                ? "Ya avisaste a todos. ¡Bien!"
                : "Nadie para llamar: todos tus pacientes vinieron hace poco o ya tienen turno."}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {visibles.map((x) => {
                const aviso = avisados[String(x.p.id)];
                return (
                  <li
                    key={x.p.id}
                    className={`flex flex-wrap items-center gap-2 rounded-xl border border-primary/10 bg-white/90 px-3 py-2.5 dark:bg-card ${aviso ? "opacity-70" : ""}`}
                  >
                    <div className="min-w-0 flex-1 basis-40">
                      <p className="truncate text-sm font-semibold">
                        {x.p.nombre} {x.p.apellido}
                      </p>
                      <p className="text-[11.5px] leading-snug text-muted-foreground">
                        Última visita {fechaCorta(x.ultima!)} · hace {textoTiempo(x.sin)}
                        {aviso ? ` · avisado el ${fechaCorta(aviso)}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => whatsapp(x)}
                        className="grid size-8 place-items-center rounded-xl border border-emerald-500/25 bg-white text-emerald-600 transition hover:-translate-y-0.5 hover:bg-[#25D366] hover:text-white dark:bg-card"
                        aria-label={`Invitar a ${x.p.nombre} por WhatsApp`}
                        title="Invitar a un control por WhatsApp"
                      >
                        <IconoWhatsApp className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => darTurno(x)}
                        className="inline-flex h-8 items-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-sm transition hover:-translate-y-0.5"
                      >
                        <CalendarPlus className="size-3.5" />
                        Dar turno
                      </button>
                      <button
                        type="button"
                        onClick={() => marcar(x.p.id, !aviso)}
                        className="grid size-8 place-items-center rounded-xl border border-primary/12 bg-white text-muted-foreground transition hover:text-primary dark:bg-card"
                        aria-label={aviso ? "Volver a la lista" : "Ya lo llamé"}
                        title={aviso ? "Volver a la lista" : "Ya lo llamé"}
                      >
                        <Check className="size-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
