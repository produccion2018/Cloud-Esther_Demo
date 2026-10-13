import { CheckCircle2, FileSignature, Mail, Phone, XCircle } from "lucide-react";
import { useState } from "react";

import { Cargando, Seccion, Vacio } from "@/components/admin/bits";
import { Campo, DialogoFormulario, INPUT, Pestanas, Pildora } from "@/components/admin/formularios";
import { permisos, useRole } from "@/components/admin/role";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  activarContratacion,
  guardarNotasContratacion,
  rechazarContratacion,
} from "@/lib/admin/api";
import { useAccion, useContrataciones } from "@/lib/admin/consultas";
import { NOMBRE_PLAN, enlaceWhatsApp, fecha, haceCuanto } from "@/lib/admin/formato";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";
import type { Contratacion, EstadoContratacion } from "@/lib/admin/tipos";

/* Ubicación: src/components/admin/contrataciones.tsx
   SOLICITUDES DE CONTRATACIÓN (formulario «Contratar servicio» de la web). Es distinto del demo.
   · Las ven el Dueño, el Socio y la Secretaría (y les llega un correo con cada una).
   · Todos pueden escribir notas internas.
   · «Activar» (después de revisar y cobrar) y «Rechazar»: también la Secretaría
     (decisión de Camilo, 11 oct 20:44). Soporte no las ve. */

// Pago en línea (Paddle)
const PAGO_EN_LINEA: Record<string, { texto: string; tono: "alerta" | "ok" | "neutro" | "peligro" }> = {
  sin_iniciar: { texto: "Pago en línea: no iniciado", tono: "neutro" },
  iniciado: { texto: "Pago en línea: iniciado", tono: "alerta" },
  pagado: { texto: "Pagado en línea", tono: "ok" },
  fallido: { texto: "Pago en línea rechazado", tono: "peligro" },
};

const ESTADO: Record<EstadoContratacion, { texto: string; tono: "alerta" | "ok" | "neutro" }> = {
  pendiente: { texto: "Pendiente de revisión y pago", tono: "alerta" },
  activada: { texto: "Activada", tono: "ok" },
  rechazada: { texto: "Rechazada", tono: "neutro" },
};

export function SolicitudesContratacion() {
  const { role } = useRole();
  const { data, isLoading } = useContrataciones(permisos.verContrataciones(role));
  const [filtro, setFiltro] = useState<"pendiente" | "todas">("pendiente");
  const [abierta, setAbierta] = useState<string | null>(null);

  if (!permisos.verContrataciones(role)) return null;
  const lista = data ?? [];
  const pendientes = lista.filter((c) => c.estado === "pendiente");
  const visibles = filtro === "pendiente" ? pendientes : lista;
  const seleccionada = lista.find((c) => c.id === abierta) ?? null;

  return (
    <>
      <Seccion
        titulo={`Solicitudes de contratación${pendientes.length ? ` (${pendientes.length} pendiente${pendientes.length === 1 ? "" : "s"})` : ""}`}
        descripcion={
          permisos.activarContrataciones(role)
            ? "Llegan desde «Contratar servicio». Revisá los datos, cobrá y apretá «Activar»: se crea la clínica."
            : "Llegan desde «Contratar servicio». Podés revisarlas y dejar notas; el Dueño o el Socio las activan después del pago."
        }
        acciones={
          <Pestanas
            valor={filtro}
            onCambiar={setFiltro}
            opciones={[
              { id: "pendiente", label: `Pendientes (${pendientes.length})` },
              { id: "todas", label: `Todas (${lista.length})` },
            ]}
          />
        }
        sinPadding
      >
        {isLoading ? (
          <div className="p-5">
            <Cargando />
          </div>
        ) : visibles.length === 0 ? (
          <div className="p-5">
            <Vacio
              titulo={filtro === "pendiente" ? "No hay contrataciones pendientes" : "Todavía no llegó ninguna contratación"}
              texto="Cuando una clínica complete «Contratar servicio» en la web, aparece acá con todos sus datos."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {visibles.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setAbierta(c.id)}
                  className="flex w-full flex-wrap items-center gap-3 px-5 py-3 text-left transition-colors hover:bg-primary/[0.03]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <FileSignature className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{c.clinica}</span>
                    <span className="block text-xs text-muted-foreground">
                      {c.codigo} · {c.contacto.nombre} · {c.paisNombre} · {haceCuanto(c.fecha)}
                    </span>
                  </span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                    {NOMBRE_PLAN[c.plan]} · {c.ciclo}
                  </span>
                  {c.estado === "pendiente" && c.pagoEnLinea && c.pagoEnLinea !== "sin_iniciar" && (
                    <Pildora tono={PAGO_EN_LINEA[c.pagoEnLinea].tono}>{PAGO_EN_LINEA[c.pagoEnLinea].texto}</Pildora>
                  )}
                  <Pildora tono={ESTADO[c.estado].tono}>{ESTADO[c.estado].texto}</Pildora>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Seccion>

      <Sheet open={!!seleccionada} onOpenChange={(v) => !v && setAbierta(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg">
          {seleccionada && (
            <DetalleContratacion
              // Si otra persona cambia las notas, el detalle se actualiza (no se pisan)
              key={`${seleccionada.id}:${seleccionada.notas}:${seleccionada.estado}`}
              c={seleccionada}
              puedeActivar={permisos.activarContrataciones(role)}
            />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function DetalleContratacion({ c, puedeActivar }: { c: Contratacion; puedeActivar: boolean }) {
  const [notas, setNotas] = useState(c.notas);
  const [activando, setActivando] = useState(false);
  const [rechazando, setRechazando] = useState(false);
  const guardarNotas = useAccion(guardarNotasContratacion, ["contrataciones"], "Notas guardadas");

  const filas: [string, string][] = [
    ["Número", c.codigo],
    ["Recibida", fecha(c.fecha, true)],
    ["Plan", `${NOMBRE_PLAN[c.plan]} · ${c.ciclo}`],
    ["Pago en línea", PAGO_EN_LINEA[c.pagoEnLinea ?? "sin_iniciar"]?.texto.replace("Pago en línea: ", "") ?? "—"],
    ["Módulos adicionales", c.modulos.length ? c.modulos.join(", ") : "Ninguno"],
    ["Sucursales", c.sucursales || "—"],
    ["Profesionales", c.profesionales || "—"],
    ["País", c.paisNombre],
    ["Ciudad", c.ciudad || "—"],
    [
      "¿Probó el demo?",
      c.demo ? `Sí (${c.demo.ingresosUsados} ingreso${c.demo.ingresosUsados === 1 ? "" : "s"})` : "No",
    ],
  ];

  return (
    <div>
      <div
        className="px-6 pb-5 pt-6 text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        <SheetTitle className="text-xl font-extrabold text-primary-foreground">{c.clinica}</SheetTitle>
        <p className="text-sm opacity-90">Solicitud de contratación {c.codigo}</p>
        <div className="mt-3">
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">
            {ESTADO[c.estado].texto}
          </span>
        </div>
      </div>

      <div className="space-y-5 p-6">
        {c.estado === "pendiente" && (
          <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
            <p className="text-sm font-bold">Qué falta</p>
            <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs text-muted-foreground">
              <li>Revisar los datos y hablar con el cliente.</li>
              <li>
                Cobrar: el cliente puede pagar en línea con el enlace del correo (se activa sola al confirmarse), o a mano
                (transferencia u otro medio) y después apretás «Activar».
              </li>
              <li>Apretar «Activar»: se crea la clínica y le llega un correo al cliente.</li>
            </ol>
            {puedeActivar ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setActivando(true)}>
                  <CheckCircle2 className="h-4 w-4" /> Activar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRechazando(true)}>
                  <XCircle className="h-4 w-4" /> Rechazar
                </Button>
              </div>
            ) : (
              <p className="mt-2 text-xs font-semibold">
                El Dueño o el Socio la activan después del pago. Podés dejar notas abajo.
              </p>
            )}
          </div>
        )}

        {c.estado !== "pendiente" && (
          <div className="rounded-2xl border border-border p-4 text-sm">
            <p className="font-bold">{c.estado === "activada" ? "Activada" : "Rechazada"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {c.resueltaPor ?? "—"} · {fecha(c.resueltaEl, true)}
            </p>
            {c.nota && (
              <p className="mt-2 text-xs">
                {c.estado === "activada" ? "Referencia del pago: " : "Motivo: "}
                <span className="font-semibold">{c.nota}</span>
              </p>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-border p-4">
          <p className="text-sm font-bold">Contacto</p>
          <p className="mt-1 text-sm">{c.contacto.nombre}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <a
              href={`mailto:${c.contacto.email}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary"
            >
              <Mail className="h-3.5 w-3.5" /> {c.contacto.email}
            </a>
            <a
              href={`tel:${c.contacto.telefono.replace(/[^0-9+]/g, "")}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 font-semibold text-primary"
            >
              <Phone className="h-3.5 w-3.5" /> {c.contacto.telefono}
            </a>
            {enlaceWhatsApp(c.contacto.telefono, c.pais) && (
              <a
                href={enlaceWhatsApp(c.contacto.telefono, c.pais) ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="btn-wa !min-h-8 !text-xs"
              >
                <IconoWhatsApp /> WhatsApp
              </a>
            )}
          </div>
        </div>

        <dl className="divide-y divide-border/60 rounded-2xl border border-border">
          {filas.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-semibold">{v}</dd>
            </div>
          ))}
        </dl>

        {c.comentarios && (
          <div className="rounded-2xl border border-border p-4">
            <p className="text-sm font-bold">Comentarios del cliente</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{c.comentarios}</p>
          </div>
        )}

        <div className="rounded-2xl border border-border p-4">
          <Campo label="Notas internas del equipo" ayuda="Las ve solo el equipo de Cloud Esther.">
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              maxLength={2000}
              rows={4}
              className={`${INPUT} h-auto py-2`}
              placeholder="Ej: hablé por WhatsApp, paga por transferencia el viernes"
            />
          </Campo>
          <div className="mt-2 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={guardarNotas.isPending || notas === c.notas}
              onClick={() => guardarNotas.mutate({ id: c.id, notas })}
            >
              Guardar notas
            </Button>
          </div>
        </div>
      </div>

      {activando && <DialogoActivar c={c} onCerrar={() => setActivando(false)} />}
      {rechazando && <DialogoRechazar c={c} onCerrar={() => setRechazando(false)} />}
    </div>
  );
}

function DialogoActivar({ c, onCerrar }: { c: Contratacion; onCerrar: () => void }) {
  const [confirmo, setConfirmo] = useState(false);
  const [referencia, setReferencia] = useState("");
  const [error, setError] = useState<string | null>(null);
  const activar = useAccion(
    activarContratacion,
    ["contrataciones", "clinicas", "demos"],
    `${c.clinica} quedó activada`,
  );
  return (
    <DialogoFormulario
      abierto
      titulo={`Activar ${c.clinica}`}
      descripcion={`Plan ${NOMBRE_PLAN[c.plan]} · ${c.ciclo}. Se crea la clínica y le llega un correo de bienvenida a ${c.contacto.email}.`}
      onCerrar={onCerrar}
      textoGuardar="Activar clínica"
      guardando={activar.isPending}
      error={error}
      onGuardar={() => {
        if (!confirmo) return setError("Marcá que revisaste la solicitud y que se recibió el pago.");
        setError(null);
        activar.mutate({ id: c.id, referenciaPago: referencia }, { onSuccess: onCerrar });
      }}
    >
      <label className="flex items-start gap-2 rounded-xl border border-border p-3 text-sm">
        <input
          type="checkbox"
          checked={confirmo}
          onChange={(e) => setConfirmo(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-primary"
        />
        <span>Revisé la solicitud y <b>se recibió el pago</b>.</span>
      </label>
      <Campo label="Referencia del pago (opcional)" ayuda="Ej: transferencia del 12/10, comprobante 1234">
        <input
          value={referencia}
          onChange={(e) => setReferencia(e.target.value)}
          maxLength={300}
          className={INPUT}
        />
      </Campo>
    </DialogoFormulario>
  );
}

function DialogoRechazar({ c, onCerrar }: { c: Contratacion; onCerrar: () => void }) {
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const rechazar = useAccion(rechazarContratacion, ["contrataciones"], "Solicitud rechazada");
  return (
    <DialogoFormulario
      abierto
      titulo={`Rechazar la solicitud de ${c.clinica}`}
      descripcion="No se le manda ningún correo automático al cliente: avisale vos si corresponde."
      onCerrar={onCerrar}
      textoGuardar="Rechazar"
      guardando={rechazar.isPending}
      error={error}
      onGuardar={() => {
        if (motivo.trim().length < 3) return setError("Escribí el motivo.");
        setError(null);
        rechazar.mutate({ id: c.id, motivo: motivo.trim() }, { onSuccess: onCerrar });
      }}
    >
      <Campo label="Motivo">
        <input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          maxLength={300}
          className={INPUT}
          placeholder="Ej: datos falsos, no respondió, eligió otro sistema"
        />
      </Campo>
    </DialogoFormulario>
  );
}
