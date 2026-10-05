import { useState } from "react";
import { Bell, Check, Clock3, History, KeyRound, Plus, ShieldCheck, X } from "lucide-react";

import {
  TIPOS_AUTORIZACION,
  TONO_ESTADO_AUT,
  crearAutorizacion,
  gestionarAutorizacion,
  recordarAutorizacion,
  responderAutorizacion,
  revocarAutorizacion,
  storeAutorizaciones,
  type Autorizacion,
  type GestionAutorizacion,
  type TipoAutorizacion,
} from "@/lib/cloud-esther/autorizaciones-store";
import type { Paciente } from "@/lib/cloud-esther/pacientes";
import { PestanasPortal, TarjetaPortal } from "./PortalShell";

/* Ubicación: src/components/cloud-esther/portales/AutorizacionesPanel.tsx
   Autorizaciones en los tres portales, con la misma información y distinto rol:
   - paciente: revisa y otorga/rechaza; puede pedir una autorización a la clínica.
   - profesional: pide autorizaciones y sigue su estado.
   - administración: gestiona, hace seguimiento y responde lo que pide el paciente. */

type Rol = "paciente" | "profesional" | "administracion";
type Vista = "pendientes" | "autorizadas" | "rechazadas" | "historial";

const INPUT =
  "h-11 w-full rounded-xl border border-primary/15 bg-card px-3 text-base outline-none focus:border-primary/45 focus:ring-4 focus:ring-primary/10 sm:h-10 sm:text-sm";

const fecha = (iso: string) =>
  new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });

export function AutorizacionesPanel({
  rol,
  usuario,
  paciente,
  pacientes = [],
  puedeCrear = true,
  puedeGestionar = true,
  onToast,
}: {
  rol: Rol;
  /** Quien actúa (para el historial). */
  usuario: string;
  /** Solo para el portal del paciente. */
  paciente?: Paciente;
  /** Para profesional / administración: pacientes de la clínica. */
  pacientes?: Paciente[];
  puedeCrear?: boolean;
  puedeGestionar?: boolean;
  onToast: (m: string) => void;
}) {
  const { autorizaciones } = storeAutorizaciones.usar();
  const [vista, setVista] = useState<Vista>("pendientes");
  const [nueva, setNueva] = useState(false);
  const [rechazando, setRechazando] = useState<string | null>(null);
  const [comentario, setComentario] = useState("");

  const propias = paciente
    ? autorizaciones.filter((a) => a.pacienteId === paciente.id)
    : autorizaciones;
  const grupos: Record<Vista, Autorizacion[]> = {
    pendientes: propias.filter((a) => a.estado === "Pendiente"),
    autorizadas: propias.filter((a) => a.estado === "Autorizada"),
    rechazadas: propias.filter((a) => a.estado === "Rechazada" || a.estado === "Revocada"),
    historial: [...propias].sort((a, b) => b.fecha.localeCompare(a.fecha)),
  };
  const lista = grupos[vista];

  // Quién responde: el paciente las que pide la clínica; la clínica las que pide el paciente.
  const responde = (a: Autorizacion) =>
    a.estado === "Pendiente" &&
    ((rol === "paciente" && a.origen !== "Paciente") ||
      (rol === "administracion" && a.origen === "Paciente" && puedeGestionar));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <PestanasPortal
          valor={vista}
          onCambiar={setVista}
          opciones={[
            { id: "pendientes", label: "Pendientes", cantidad: grupos.pendientes.length },
            { id: "autorizadas", label: "Autorizadas", cantidad: grupos.autorizadas.length },
            { id: "rechazadas", label: "Rechazadas", cantidad: grupos.rechazadas.length },
            { id: "historial", label: "Historial" },
          ]}
        />
        {puedeCrear && !nueva && (
          <button type="button" onClick={() => setNueva(true)} className="btn-ce !min-h-10">
            <Plus className="size-4" />
            {rol === "paciente" ? "Pedir a la clínica" : "Nueva solicitud"}
          </button>
        )}
      </div>

      {nueva && (
        <NuevaSolicitud
          rol={rol}
          usuario={usuario}
          {...(paciente ? { paciente } : {})}
          pacientes={pacientes}
          onCerrar={() => setNueva(false)}
          onToast={onToast}
        />
      )}

      {lista.length === 0 ? (
        <TarjetaPortal>
          <p className="py-8 text-center text-sm text-muted-foreground">
            {vista === "pendientes"
              ? rol === "paciente"
                ? "No tenés autorizaciones pendientes."
                : "No hay solicitudes pendientes."
              : "No hay registros en esta vista."}
          </p>
        </TarjetaPortal>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {lista.map((a) => (
            <li key={a.id}>
              <TarjetaPortal className="h-full">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary/15 to-fuchsia-500/15 text-primary">
                    <KeyRound className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold">{a.titulo}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${TONO_ESTADO_AUT[a.estado]}`}
                      >
                        {a.estado}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {a.tipo}
                      {rol !== "paciente" ? ` · ${a.paciente}` : ""} · pedida por {a.solicitadoPor}{" "}
                      el {fecha(a.fecha)}
                    </p>
                    {a.detalle && <p className="mt-2 text-sm text-foreground/85">{a.detalle}</p>}
                    {a.vence && a.estado === "Pendiente" && (
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                        <Clock3 className="size-3" /> Responder antes del {fecha(a.vence)}
                      </p>
                    )}
                    {a.respuesta?.comentario && (
                      <p className="mt-2 rounded-xl bg-muted/60 px-3 py-2 text-xs">
                        «{a.respuesta.comentario}» — {a.respuesta.por}
                      </p>
                    )}
                    {rol !== "paciente" && (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Seguimiento de la clínica: <b>{a.gestion}</b>
                      </p>
                    )}

                    {vista === "historial" && (
                      <ol className="mt-3 space-y-1 border-l-2 border-primary/15 pl-3">
                        {a.historial.map((h, i) => (
                          <li key={i} className="text-[11px] text-muted-foreground">
                            <History className="mr-1 inline size-3" />
                            {fecha(h.fecha)} · {h.accion} · {h.por}
                          </li>
                        ))}
                      </ol>
                    )}

                    {responde(a) &&
                      (rechazando === a.id ? (
                        <div className="mt-3 space-y-2">
                          <textarea
                            value={comentario}
                            onChange={(e) => setComentario(e.target.value)}
                            rows={2}
                            placeholder="Motivo (opcional)"
                            className={`${INPUT} h-auto py-2`}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setRechazando(null);
                                setComentario("");
                              }}
                              className="btn-ce-outline !min-h-10 flex-1 justify-center"
                            >
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                responderAutorizacion(a.id, false, usuario, comentario.trim());
                                setRechazando(null);
                                setComentario("");
                                onToast("Respuesta enviada: rechazada");
                              }}
                              className="btn-ce !min-h-10 flex-1 justify-center !bg-rose-600"
                            >
                              Confirmar rechazo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => setRechazando(a.id)}
                            className="btn-ce-outline !min-h-11 flex-1 justify-center"
                          >
                            <X className="size-4" /> Rechazar
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              responderAutorizacion(a.id, true, usuario);
                              onToast("¡Listo! Autorización otorgada");
                            }}
                            className="btn-ce !min-h-11 flex-1 justify-center"
                          >
                            <Check className="size-4" /> Autorizar
                          </button>
                        </div>
                      ))}

                    {rol === "administracion" && puedeGestionar && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                          value={a.gestion}
                          onChange={(e) => {
                            gestionarAutorizacion(
                              a.id,
                              e.target.value as GestionAutorizacion,
                              usuario,
                            );
                            onToast("Seguimiento actualizado");
                          }}
                          className="h-10 rounded-xl border border-primary/15 bg-card px-3 text-sm"
                          aria-label="Seguimiento"
                        >
                          {(["Sin gestionar", "En gestión", "Finalizada"] as const).map((g) => (
                            <option key={g}>{g}</option>
                          ))}
                        </select>
                        {a.estado === "Pendiente" && a.origen !== "Paciente" && (
                          <button
                            type="button"
                            onClick={() => {
                              recordarAutorizacion(a.id, usuario);
                              onToast(`Recordatorio enviado a ${a.paciente}`);
                            }}
                            className="btn-ce-outline !min-h-10"
                          >
                            <Bell className="size-4" /> Recordar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </TarjetaPortal>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NuevaSolicitud({
  rol,
  usuario,
  paciente,
  pacientes,
  onCerrar,
  onToast,
}: {
  rol: Rol;
  usuario: string;
  paciente?: Paciente;
  pacientes: Paciente[];
  onCerrar: () => void;
  onToast: (m: string) => void;
}) {
  const [pacienteId, setPacienteId] = useState<number | "">(paciente?.id ?? "");
  const [tipo, setTipo] = useState<TipoAutorizacion>(rol === "paciente" ? "Receta" : "Tratamiento");
  const [titulo, setTitulo] = useState("");
  const [detalle, setDetalle] = useState("");
  const [vence, setVence] = useState("");
  const elegido = paciente ?? pacientes.find((p) => p.id === pacienteId);

  return (
    <TarjetaPortal
      titulo={rol === "paciente" ? "Pedido a la clínica" : "Nueva solicitud de autorización"}
      detalle={
        rol === "paciente"
          ? "La clínica la revisa y te responde en esta misma sección."
          : "El paciente la recibe en su portal para autorizarla."
      }
      icon={ShieldCheck}
    >
      <form
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!elegido || !titulo.trim()) return onToast("Completá el paciente y el título");
          crearAutorizacion({
            pacienteId: elegido.id,
            paciente: `${elegido.nombre} ${elegido.apellido}`.trim(),
            tipo,
            titulo: titulo.trim(),
            detalle: detalle.trim(),
            solicitadoPor: usuario,
            origen:
              rol === "paciente"
                ? "Paciente"
                : rol === "profesional"
                  ? "Profesional"
                  : "Administración",
            ...(vence ? { vence } : {}),
            ...(tipo === "Consentimiento informado" ||
            tipo === "Uso de imágenes" ||
            tipo === "Compartir datos"
              ? { permanente: true }
              : {}),
          });
          onToast(
            rol === "paciente" ? "Pedido enviado a la clínica" : "Solicitud enviada al paciente",
          );
          onCerrar();
        }}
      >
        {!paciente && (
          <label className="text-xs font-semibold sm:col-span-2">
            Paciente
            <select
              value={pacienteId}
              onChange={(e) => setPacienteId(e.target.value ? Number(e.target.value) : "")}
              className={`${INPUT} mt-1`}
            >
              <option value="">Elegí un paciente</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} {p.apellido}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="text-xs font-semibold">
          Tipo
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoAutorizacion)}
            className={`${INPUT} mt-1`}
          >
            {TIPOS_AUTORIZACION.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold">
          {rol === "paciente" ? "Para cuándo (opcional)" : "Responder antes del (opcional)"}
          <input
            type="date"
            value={vence}
            onChange={(e) => setVence(e.target.value)}
            className={`${INPUT} mt-1`}
          />
        </label>
        <label className="text-xs font-semibold sm:col-span-2">
          Título
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder={
              rol === "paciente" ? "Ej.: renovación de receta" : "Ej.: extracción de pieza 38"
            }
            className={`${INPUT} mt-1`}
          />
        </label>
        <label className="text-xs font-semibold sm:col-span-2">
          Detalle
          <textarea
            value={detalle}
            onChange={(e) => setDetalle(e.target.value)}
            rows={3}
            className={`${INPUT} mt-1 h-auto py-2`}
          />
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <button
            type="button"
            onClick={onCerrar}
            className="btn-ce-outline !min-h-11 flex-1 justify-center"
          >
            Cancelar
          </button>
          <button type="submit" className="btn-ce !min-h-11 flex-1 justify-center">
            Enviar
          </button>
        </div>
      </form>
    </TarjetaPortal>
  );
}

/** Privacidad y permisos del paciente: consentimientos vigentes (revocables) y su historial. */
export function PrivacidadPaciente({
  paciente,
  usuario,
  onToast,
}: {
  paciente: Paciente;
  usuario: string;
  onToast: (m: string) => void;
}) {
  const { autorizaciones } = storeAutorizaciones.usar();
  const propias = autorizaciones.filter((a) => a.pacienteId === paciente.id);
  const vigentes = propias.filter((a) => a.estado === "Autorizada" && a.permanente);
  const historial = propias
    .flatMap((a) => a.historial.map((h) => ({ ...h, titulo: a.titulo })))
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <TarjetaPortal
        titulo="Permisos otorgados"
        detalle="Podés revocarlos cuando quieras"
        icon={ShieldCheck}
      >
        {vigentes.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No tenés permisos vigentes.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {vigentes.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-2 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{a.titulo}</span>
                  <span className="block text-xs text-muted-foreground">
                    {a.tipo} · otorgado el {fecha(a.respuesta?.fecha ?? a.fecha)}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    revocarAutorizacion(a.id, usuario);
                    onToast("Permiso revocado");
                  }}
                  className="btn-ce-outline !min-h-10"
                >
                  Revocar
                </button>
              </li>
            ))}
          </ul>
        )}
      </TarjetaPortal>
      <TarjetaPortal titulo="Consentimientos" detalle="Firmados y pendientes" icon={KeyRound}>
        <ul className="divide-y divide-border/60">
          {propias
            .filter((a) => a.tipo === "Consentimiento informado" || a.permanente)
            .map((a) => (
              <li key={a.id} className="flex items-center gap-2 py-3">
                <span className="min-w-0 flex-1 truncate text-sm">{a.titulo}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${TONO_ESTADO_AUT[a.estado]}`}
                >
                  {a.estado}
                </span>
              </li>
            ))}
        </ul>
      </TarjetaPortal>
      <TarjetaPortal
        titulo="Historial de autorizaciones"
        detalle="Todo lo que se pidió y respondió"
        icon={History}
        className="lg:col-span-2"
      >
        <ol className="space-y-2">
          {historial.slice(0, 30).map((h, i) => (
            <li key={i} className="flex flex-wrap gap-x-2 text-xs">
              <span className="font-semibold tabular-nums text-muted-foreground">
                {fecha(h.fecha)}
              </span>
              <span className="font-semibold">{h.titulo}</span>
              <span className="text-muted-foreground">
                {h.accion} · {h.por}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Tus datos de salud solo los ve el equipo de tu clínica. Podés pedir una copia o la baja de
          tus datos desde Soporte.
        </p>
      </TarjetaPortal>
    </div>
  );
}
