import { useState } from "react";
import {
  CalendarDays,
  Check,
  CheckCheck,
  ClipboardList,
  CreditCard,
  EyeOff,
  FileText,
  History,
  KeyRound,
  MessageCircle,
  Pill,
  ReceiptText,
  ScanLine,
  Send,
  ShieldCheck,
  Stethoscope,
  Upload,
  Undo2,
  UserCog,
  Wallet,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useTodosLosRegistros } from "@/components/cloud-esther/PacienteSecciones";
import { usePacientes } from "@/lib/cloud-esther/pacientes";
import {
  clavePublicacion,
  setPortal,
  storePortal,
  type ConfigPortal,
  type SeccionPortalPaciente,
  type TipoPublicable,
} from "@/lib/cloud-esther/portal-store";

/* Ubicación: src/components/cloud-esther/portales/ControlPortalPaciente.tsx
   CONTROL DEL PORTAL DEL PACIENTE (Enterprise, o el adicional «Portal del paciente»).
   El Administrador decide:
   1. Qué ve el paciente en su portal (turnos, recetas, estudios, presupuestos, cuenta…).
   2. Cómo llega la información: automático (todo lo que carga la clínica aparece solo) o CON
      APROBACIÓN (nada le llega al paciente hasta que alguien autorizado lo envía).
   3. Quién puede enviar al portal además de él (odontólogos, secretaría, asistentes).
   4. La bandeja «Para enviar al portal»: recetas, estudios, presupuestos y documentos que esperan
      su envío, con quién lo envió y cuándo. Cada paciente ve SOLO lo suyo. */

const SECCIONES: { id: SeccionPortalPaciente; label: string; detalle: string; icon: LucideIcon }[] = [
  { id: "turnos", label: "Mis turnos", detalle: "Ver, pedir, confirmar y cancelar", icon: CalendarDays },
  { id: "tratamientos", label: "Tratamientos", detalle: "Avance y próximas sesiones", icon: Stethoscope },
  { id: "documentos", label: "Recetas, estudios y presupuestos", detalle: "Descargar y aprobar", icon: FileText },
  { id: "historial", label: "Mi historial", detalle: "Línea de tiempo de la atención", icon: History },
  { id: "autorizaciones", label: "Autorizaciones", detalle: "Consentimientos a firmar", icon: KeyRound },
  { id: "documentacion", label: "Documentación", detalle: "Subir DNI, credencial, estudios", icon: Upload },
  { id: "cuenta", label: "Estado de cuenta", detalle: "Movimientos y comprobantes", icon: ReceiptText },
  { id: "pagos", label: "Pagos", detalle: "Pagar el saldo online", icon: Wallet },
  { id: "mensajes", label: "Mensajes", detalle: "Escribirle a la clínica", icon: MessageCircle },
];

const ROLES: { id: string; label: string }[] = [
  { id: "odontologo", label: "Odontólogos/as" },
  { id: "secretaria", label: "Secretaría" },
  { id: "asistente", label: "Asistentes" },
];

const ICONO_TIPO: Record<TipoPublicable, LucideIcon> = {
  receta: Pill,
  estudio: ScanLine,
  presupuesto: ReceiptText,
  documento: FileText,
};

type Pendiente = {
  clave: string;
  pacienteId: number;
  paciente: string;
  tipo: TipoPublicable;
  titulo: string;
  fecha: string;
};

const fechaCorta = (f: string) => (f ? f.slice(0, 10).split("-").reverse().join("/") : "");

function Interruptor({ on, onClick, label, disabled }: { on: boolean; onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`relative h-6 w-11 shrink-0 rounded-full transition disabled:opacity-50 ${on ? "bg-gradient-to-r from-primary to-fuchsia-500 shadow-[0_6px_14px_-6px_rgba(124,58,237,0.9)]" : "bg-muted"}`}
    >
      <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${on ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export function ControlPortalPaciente({
  usuario,
  puedeConfigurar,
  puedeEnviar,
  onToast,
}: {
  /** Nombre de quien envía (queda registrado) */
  usuario: string;
  /** Solo el Administrador cambia qué se ve, el modo y quién envía */
  puedeConfigurar: boolean;
  /** El Administrador o los roles que él autorizó */
  puedeEnviar: boolean;
  onToast: (m: string) => void;
}) {
  const { config, publicados = {} } = storePortal.usar();
  const { pacientes } = usePacientes();
  const registros = useTodosLosRegistros();
  const [verEnviados, setVerEnviados] = useState(false);
  const envio = config.envio ?? "automatico";
  const visible = (s: SeccionPortalPaciente) => config.secciones?.[s] !== false;
  const set = (c: Partial<ConfigPortal>) => setPortal("config", (prev) => ({ ...prev, ...c }));

  // Todo lo que se puede enviar, de cada paciente activo
  const items: Pendiente[] = pacientes
    .filter((p) => p.estado === "Activo")
    .flatMap((p) => {
      const r = registros[p.id];
      if (!r) return [];
      const nombre = `${p.nombre} ${p.apellido}`;
      const base = (tipo: TipoPublicable, id: number, titulo: string, fecha: string): Pendiente => ({
        clave: clavePublicacion(p.id, tipo, id),
        pacienteId: p.id,
        paciente: nombre,
        tipo,
        titulo,
        fecha,
      });
      return [
        ...r.recetas.filter((x) => x.estado !== "Anulada").map((x) => base("receta", x.id, `Receta ${x.numero}`, x.fecha)),
        ...r.estudios.map((x) => base("estudio", x.id, x.tipo, x.fecha)),
        ...r.presupuestos.filter((x) => x.estado !== "Borrador").map((x) => base("presupuesto", x.id, `Presupuesto ${x.numero}`, x.fecha)),
        ...r.documentos.map((x) => base("documento", x.id, x.titulo, x.fecha)),
      ];
    })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));
  const pendientes = items.filter((i) => !publicados[i.clave]);
  const enviados = items.filter((i) => publicados[i.clave]);

  const enviar = (lista: Pendiente[]) => {
    if (!puedeEnviar) return onToast("Tu usuario no tiene permiso para enviar al portal");
    const ahora = new Date().toISOString();
    setPortal("publicados", (prev) => ({
      ...(prev ?? {}),
      ...Object.fromEntries(lista.map((i) => [i.clave, { por: usuario, fecha: ahora }])),
    }));
    onToast(lista.length === 1 ? `Enviado al portal de ${lista[0]!.paciente}` : `${lista.length} envíos al portal`);
  };
  const quitar = (i: Pendiente) => {
    if (!puedeEnviar) return;
    setPortal("publicados", (prev) => {
      const c = { ...(prev ?? {}) };
      delete c[i.clave];
      return c;
    });
    onToast("Quitado del portal del paciente");
  };

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[26px] bg-[linear-gradient(118deg,#064e3b,#047857_35%,#7c3aed_80%,#a21caf)] p-5 text-white shadow-[0_26px_60px_-36px_rgba(4,120,87,0.9)]">
        <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 size-56 rounded-full bg-emerald-300/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:linear-gradient(100deg,transparent_45%,black)]" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className="grid size-12 place-items-center rounded-2xl border border-white/30 bg-white/15">
            <ShieldCheck className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-white/70">Control del Administrador</p>
            <h2 className="font-display text-xl font-bold tracking-tight">Qué le llega a cada paciente</h2>
            <p className="text-sm text-white/85">
              {envio === "aprobacion"
                ? `Con aprobación · ${pendientes.length} esperando envío`
                : "Automático · lo que carga la clínica aparece solo en el portal"}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_380px]">
        {/* Qué ve el paciente */}
        <section className="rounded-3xl border border-primary/12 bg-card p-4 shadow-[0_18px_40px_-32px_rgba(76,29,149,0.7)] sm:p-5">
          <p className="font-display text-base font-bold">Qué ve el paciente</p>
          <p className="text-xs text-muted-foreground">Lo que apagues desaparece del portal de todos los pacientes.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {SECCIONES.map((s) => (
              <li key={s.id} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${visible(s.id) ? "border-primary/12 bg-gradient-to-r from-primary/[0.04] to-transparent" : "border-border/60 opacity-70"}`}>
                <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${visible(s.id) ? "bg-gradient-to-br from-primary to-fuchsia-500 text-white" : "bg-muted text-muted-foreground"}`}>
                  {visible(s.id) ? <s.icon className="size-4" /> : <EyeOff className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{s.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{s.detalle}</span>
                </span>
                <Interruptor
                  on={visible(s.id)}
                  disabled={!puedeConfigurar}
                  label={s.label}
                  onClick={() => {
                    set({ secciones: { ...(config.secciones ?? {}), [s.id]: !visible(s.id) } });
                    onToast(`${s.label}: ${visible(s.id) ? "oculto" : "visible"} en el portal`);
                  }}
                />
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-4">
          {/* Cómo llega */}
          <section className="rounded-3xl border border-primary/12 bg-card p-4 shadow-[0_18px_40px_-32px_rgba(76,29,149,0.7)] sm:p-5">
            <p className="font-display text-base font-bold">Cómo llega la información</p>
            <div className="mt-3 space-y-2">
              {(
                [
                  ["aprobacion", "Con mi aprobación", "Nada le llega al paciente hasta que se envía al portal.", ShieldCheck],
                  ["automatico", "Automático", "Recetas, estudios, presupuestos y documentos aparecen solos.", Zap],
                ] as const
              ).map(([id, t, d, I]) => (
                <button
                  key={id}
                  type="button"
                  disabled={!puedeConfigurar}
                  onClick={() => {
                    set({ envio: id });
                    onToast(id === "aprobacion" ? "Ahora todo pasa por tu aprobación" : "Envío automático al portal");
                  }}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition disabled:cursor-not-allowed ${envio === id ? "border-transparent bg-card ring-2 ring-primary shadow-[0_14px_30px_-20px_rgba(124,58,237,0.8)]" : "border-primary/12 hover:border-primary/30"}`}
                >
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${envio === id ? "bg-gradient-to-br from-primary to-fuchsia-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    <I className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold">{t}</span>
                    <span className="block text-[11px] text-muted-foreground">{d}</span>
                  </span>
                  {envio === id && <Check className="size-4 text-primary" />}
                </button>
              ))}
            </div>
          </section>
          {/* Quién envía */}
          <section className="rounded-3xl border border-primary/12 bg-card p-4 shadow-[0_18px_40px_-32px_rgba(76,29,149,0.7)] sm:p-5">
            <p className="flex items-center gap-2 font-display text-base font-bold">
              <UserCog className="size-4 text-primary" /> Quién puede enviar al portal
            </p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center justify-between gap-2 rounded-xl bg-primary/[0.05] px-3 py-2">
                <span className="font-semibold">Administrador</span>
                <span className="text-[11px] font-semibold text-primary">Siempre</span>
              </li>
              {ROLES.map((r) => {
                const on = (config.publican ?? []).includes(r.id);
                return (
                  <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl border border-primary/10 px-3 py-2">
                    <span>{r.label}</span>
                    <Interruptor
                      on={on}
                      disabled={!puedeConfigurar}
                      label={`${r.label} puede enviar`}
                      onClick={() => {
                        const lista = new Set(config.publican ?? []);
                        if (on) lista.delete(r.id);
                        else lista.add(r.id);
                        set({ publican: [...lista] });
                        onToast(`${r.label}: ${on ? "ya no puede" : "ahora puede"} enviar al portal`);
                      }}
                    />
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground">Solo el Administrador cambia esta configuración.</p>
          </section>
        </div>
      </div>

      {/* Bandeja de envíos */}
      {envio === "aprobacion" && (
        <section className="rounded-3xl border border-primary/12 bg-card p-4 shadow-[0_18px_40px_-32px_rgba(76,29,149,0.7)] sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-white">
              <Send className="size-[18px]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-bold">{verEnviados ? "Ya enviados" : "Para enviar al portal"}</p>
              <p className="text-xs text-muted-foreground">
                {verEnviados ? `${enviados.length} visibles para los pacientes` : `${pendientes.length} esperando tu envío`}
              </p>
            </div>
            <button type="button" onClick={() => setVerEnviados((v) => !v)} className="btn-ce-outline !min-h-10">
              <ClipboardList className="size-4" /> {verEnviados ? "Ver pendientes" : `Ver enviados (${enviados.length})`}
            </button>
            {!verEnviados && puedeEnviar && pendientes.length > 1 && (
              <button type="button" onClick={() => enviar(pendientes)} className="btn-ce !min-h-10">
                <CheckCheck className="size-4" /> Enviar todo
              </button>
            )}
          </div>
          {(verEnviados ? enviados : pendientes).length === 0 ? (
            <p className="mt-4 rounded-2xl border border-dashed border-primary/20 px-4 py-8 text-center text-sm text-muted-foreground">
              {verEnviados ? "Todavía no enviaste nada al portal." : "Nada pendiente: todo lo cargado ya está enviado."}
            </p>
          ) : (
            <ul className="mt-4 space-y-2">
              {(verEnviados ? enviados : pendientes).slice(0, 60).map((i) => {
                const I = ICONO_TIPO[i.tipo];
                const pub = publicados[i.clave];
                return (
                  <li key={i.clave} className="flex flex-wrap items-center gap-3 rounded-2xl border border-primary/10 bg-muted/20 p-3 transition hover:bg-card hover:shadow-[0_14px_30px_-24px_rgba(76,29,149,0.7)]">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary/15 to-fuchsia-500/10 text-primary">
                      <I className="size-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{i.titulo}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {i.paciente} · {fechaCorta(i.fecha)}
                        {pub ? ` · enviado por ${pub.por} el ${fechaCorta(pub.fecha)}` : ""}
                      </span>
                    </span>
                    {puedeEnviar &&
                      (pub ? (
                        <button type="button" onClick={() => quitar(i)} className="btn-ce-outline !min-h-9">
                          <Undo2 className="size-4" /> Quitar
                        </button>
                      ) : (
                        <button type="button" onClick={() => enviar([i])} className="btn-ce !min-h-9">
                          <Send className="size-4" /> Enviar al portal
                        </button>
                      ))}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
      <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <CreditCard className="size-3.5" /> Turnos online, pagos online y aprobación de presupuestos se configuran abajo, en «Qué pueden hacer tus pacientes».
      </p>
    </div>
  );
}
