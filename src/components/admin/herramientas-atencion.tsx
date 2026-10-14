import {
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  FileSpreadsheet,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  PhoneCall,
  PhoneIncoming,
  PhoneOutgoing,
  Plus,
  Search,
  Trash2,
  Video,
} from "lucide-react";
import { useMemo, useState } from "react";

import { Cargando, Seccion, Vacio } from "@/components/admin/bits";
import { Campo, DialogoFormulario, INPUT, Pildora, Tabla, confirmar } from "@/components/admin/formularios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { borrarDe, guardarEn, nuevoIdLocal } from "@/lib/admin/api";
import { useAccion, useClinicas, useColeccion } from "@/lib/admin/consultas";
import { descargarExcel } from "@/lib/admin/excel";
import { clinicaProlija, enlaceWhatsApp, fecha, haceCuanto, nombreProlijo } from "@/lib/admin/formato";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";
import { useSesionAdmin } from "@/lib/admin/sesion";
import type { Llamada, PedidoLlamada, Plantilla } from "@/lib/admin/tipos-empresa";

/* Ubicación: src/components/admin/herramientas-atencion.tsx
   Piezas que comparten Atención a clínicas, Soporte técnico y Redes y marketing:
   · Botón «Descargar Excel» (planilla .xlsx de verdad).
   · Registro de LLAMADAS (todo gratis): «WhatsApp» abre el chat para llamar por WhatsApp,
     «Llamar» abre el teléfono de la computadora o del celular, y «Videollamada» arma un enlace
     de Jitsi Meet (gratis, sin cuenta) para mandarle a la clínica.
   · PEDIDOS DE LLAMADA: lo que las clínicas piden desde «Te llamamos gratis» en la web.
   · RESPUESTAS LISTAS para copiar (WhatsApp, correo). */

export function useAutor() {
  return useSesionAdmin()?.usuario.nombre ?? "Equipo";
}

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Teléfono → enlace para llamar (solo números y +). */
export function enlaceLlamar(tel: string): string | null {
  const limpio = tel.replace(/[^0-9+]/g, "");
  return limpio.replace(/\D/g, "").length >= 6 ? `tel:${limpio}` : null;
}

/** Enlace de videollamada gratis (Jitsi Meet, sin cuenta ni instalación). */
export function nuevaVideollamada(): string {
  const azar = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => b.toString(16).padStart(2, "0")).join("");
  return `https://meet.jit.si/CloudEsther-${azar}`;
}

/** Botones para contactar gratis: WhatsApp, teléfono y videollamada. */
export function BotonesContacto({ telefono, pais, compacto = false }: { telefono: string; pais?: string; compacto?: boolean }) {
  const wa = enlaceWhatsApp(telefono, pais);
  const tel = enlaceLlamar(telefono);
  const [video, setVideo] = useState<string | null>(null);
  const armarVideo = async () => {
    const enlace = nuevaVideollamada();
    setVideo(enlace);
    try {
      await navigator.clipboard.writeText(enlace);
    } catch {
      /* sin portapapeles: el enlace queda a la vista */
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-1">
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" className="btn-wa !min-h-8 !px-2.5 !text-xs" title="Abrir WhatsApp (llamada o mensaje gratis)">
          <IconoWhatsApp /> {!compacto && "WhatsApp"}
        </a>
      )}
      {tel && (
        <Button asChild size="sm" variant="outline" title="Llamar" className="rounded-full">
          <a href={tel}>
            <Phone className="h-3.5 w-3.5" />
            {!compacto && <span className="ml-1">Llamar</span>}
          </a>
        </Button>
      )}
      <Button size="sm" variant="outline" title="Armar enlace de videollamada (gratis)" className="rounded-full" onClick={() => void armarVideo()}>
        <Video className="h-3.5 w-3.5" />
        {!compacto && <span className="ml-1">Videollamada</span>}
      </Button>
      {video && (
        <span className="w-full text-[11px] text-muted-foreground">
          Enlace copiado:{" "}
          <a href={video} target="_blank" rel="noreferrer" className="font-semibold text-primary underline">
            {video.replace("https://", "")}
          </a>
          {wa && (
            <>
              {" · "}
              <a
                href={`${wa}${wa.includes("?") ? "&" : "?"}text=${encodeURIComponent(`Hola, te escribimos de Cloud Esther. Entrá a esta videollamada: ${video}`)}`}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-primary underline"
              >
                mandar por WhatsApp
              </a>
            </>
          )}
        </span>
      )}
    </div>
  );
}

export function BotonExcel({ onClick, texto = "Descargar Excel" }: { onClick: () => void; texto?: string }) {
  return (
    <Button size="sm" variant="outline" onClick={onClick}>
      <FileSpreadsheet className="mr-1 h-4 w-4" /> {texto}
    </Button>
  );
}

/* ───────────── Llamadas ───────────── */

const RESULTADOS: Llamada["resultado"][] = ["Atendida", "No atendió", "Ocupado", "Buzón de voz", "Número equivocado"];
const TONO_RESULTADO: Record<Llamada["resultado"], "ok" | "alerta" | "peligro" | "neutro"> = {
  Atendida: "ok",
  "No atendió": "alerta",
  Ocupado: "alerta",
  "Buzón de voz": "neutro",
  "Número equivocado": "peligro",
};

export function exportarLlamadas(lista: Llamada[]) {
  descargarExcel("llamadas", "Llamadas", [
    ["Fecha", "Hora", "Dirección", "Medio", "Clínica", "Contacto", "Teléfono", "Duración (min)", "Resultado", "Motivo", "Notas", "Atendió", "Próximo seguimiento", "Origen"],
    ...lista.map((l) => [
      l.fecha.slice(0, 10),
      new Date(l.fecha).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      l.direccion,
      l.medio ?? "Teléfono",
      l.clinica,
      l.contacto,
      l.telefono,
      l.duracionMin,
      l.resultado,
      l.motivo,
      l.notas,
      l.atendio,
      l.proximoSeguimiento ?? "",
      l.origen,
    ]),
  ]);
}

/** Registro de llamadas (Atención y Soporte). Con «clinica», muestra solo las de esa clínica. */
export function RegistroLlamadas({
  editable,
  clinica,
  nueva,
  onCerrarNueva,
}: {
  editable: boolean;
  clinica?: string;
  /** Abre el formulario de llamada nueva (desde el botón de arriba de la página) */
  nueva?: boolean;
  onCerrarNueva?: () => void;
}) {
  const { data, isLoading } = useColeccion("llamadas");
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todas" | "seguimiento" | "sinAtender">("todas");
  const [editando, setEditando] = useState<Llamada | "nueva" | null>(null);
  const hoy = hoyISO();

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data ?? [])
      .filter((l) => !clinica || l.clinica === clinica)
      .filter((l) =>
        filtro === "seguimiento"
          ? !!l.proximoSeguimiento
          : filtro === "sinAtender"
            ? l.resultado !== "Atendida"
            : true,
      )
      .filter((l) => !t || `${l.clinica} ${l.contacto} ${l.telefono} ${l.motivo} ${l.notas}`.toLowerCase().includes(t))
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  }, [data, q, filtro, clinica]);

  const abierto = nueva || editando !== null;
  const cerrar = () => {
    setEditando(null);
    onCerrarNueva?.();
  };

  return (
    <Seccion
      titulo={clinica ? `Llamadas con ${clinica}` : "Registro de llamadas"}
      descripcion="Cada llamada queda con quién atendió, cuánto duró y qué se habló. Llamá gratis por WhatsApp o armá una videollamada."
      acciones={
        <div className="flex flex-wrap gap-2">
          <BotonExcel onClick={() => exportarLlamadas(lista)} />
          {editable && (
            <Button size="sm" onClick={() => setEditando("nueva")}>
              <Plus className="mr-1 h-4 w-4" /> Registrar llamada
            </Button>
          )}
        </div>
      }
      sinPadding
    >
      {!clinica && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-5 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar por clínica, contacto, teléfono o tema"
              className={`${INPUT} pl-9`}
            />
          </div>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className={`${INPUT} w-auto`}>
            <option value="todas">Todas</option>
            <option value="seguimiento">Con seguimiento</option>
            <option value="sinAtender">No atendidas</option>
          </select>
        </div>
      )}
      {isLoading ? (
        <div className="p-5">
          <Cargando />
        </div>
      ) : lista.length === 0 ? (
        <div className="p-5">
          <Vacio titulo="Todavía no hay llamadas" texto="Registrá cada llamada para tener el historial de cada clínica." />
        </div>
      ) : (
        <Tabla columnas={["Fecha", "Clínica y contacto", "Resultado", "Motivo", "Atendió", ""]} minimo={760}>
          {lista.map((l) => {
            const tel = enlaceLlamar(l.telefono);
            const vencido = l.proximoSeguimiento && l.proximoSeguimiento < hoy;
            return (
              <tr key={l.id} className="border-t border-border/60 align-top">
                <td className="py-3 pl-5 pr-3 text-xs">
                  <span className="flex items-center gap-1.5 font-semibold">
                    {l.direccion === "Entrante" ? (
                      <PhoneIncoming className="h-3.5 w-3.5 text-primary" />
                    ) : (
                      <PhoneOutgoing className="h-3.5 w-3.5 text-primary" />
                    )}
                    {fecha(l.fecha, true)}
                  </span>
                  <span className="text-muted-foreground">
                    {l.direccion} · {l.medio ?? "Teléfono"} · {l.duracionMin} min{l.origen === "Pedido web" ? " · pedido web" : ""}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <p className="font-semibold">{l.clinica || "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.contacto || "—"} · {l.telefono || "sin teléfono"}
                  </p>
                </td>
                <td className="px-3 py-3">
                  <Pildora tono={TONO_RESULTADO[l.resultado]}>{l.resultado}</Pildora>
                  {l.proximoSeguimiento && (
                    <p className={`mt-1 text-[11px] font-semibold ${vencido ? "text-destructive" : "text-muted-foreground"}`}>
                      Volver a llamar: {fecha(l.proximoSeguimiento)}
                    </p>
                  )}
                </td>
                <td className="max-w-[260px] px-3 py-3 text-xs">
                  <p className="font-semibold">{l.motivo || "—"}</p>
                  {l.notas && <p className="line-clamp-2 text-muted-foreground">{l.notas}</p>}
                </td>
                <td className="px-3 py-3 text-xs text-muted-foreground">{l.atendio}</td>
                <td className="py-3 pl-3 pr-5 text-right">
                  <div className="flex justify-end gap-1">
                    {tel && <BotonesContacto telefono={l.telefono} compacto />}
                    {editable && (
                      <Button size="sm" variant="outline" onClick={() => setEditando(l)} title="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </Tabla>
      )}
      {abierto && (
        <DialogoLlamada
          inicial={editando && editando !== "nueva" ? editando : null}
          clinicaInicial={clinica}
          onCerrar={cerrar}
        />
      )}
    </Seccion>
  );
}

export function DialogoLlamada({
  inicial,
  clinicaInicial,
  base,
  onGuardada,
  onCerrar,
}: {
  inicial: Llamada | null;
  clinicaInicial?: string;
  /** Datos para completar una llamada nueva (por ejemplo, desde un pedido de la web) */
  base?: Partial<Llamada>;
  onGuardada?: (l: Llamada) => void;
  onCerrar: () => void;
}) {
  const autor = useAutor();
  const { data: clinicas } = useClinicas();
  const guardar = useAccion(
    (l: Llamada) => guardarEn("llamadas", l),
    ["llamadas"],
    inicial ? "Llamada actualizada" : "Llamada registrada",
  );
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<Llamada>(
    inicial ?? {
      id: nuevoIdLocal("ll"),
      fecha: new Date().toISOString(),
      direccion: "Saliente",
      clinica: clinicaInicial ?? "",
      contacto: "",
      telefono: "",
      duracionMin: 0,
      resultado: "Atendida",
      motivo: "",
      notas: "",
      atendio: autor,
      casoId: null,
      origen: "Manual",
      medio: "WhatsApp",
      proximoSeguimiento: null,
      ...base,
    },
  );
  const set = <K extends keyof Llamada>(k: K, v: Llamada[K]) => setF((x) => ({ ...x, [k]: v }));

  // Al elegir una clínica, se completan el contacto y el teléfono que dejó al contratar
  const elegirClinica = (nombre: string) => {
    const c = clinicas?.find((x) => x.nombre === nombre);
    setF((x) => ({
      ...x,
      clinica: nombre,
      contacto: x.contacto || c?.contacto.nombre || "",
      telefono: x.telefono || c?.contacto.telefono || "",
    }));
  };
  const tel = enlaceLlamar(f.telefono);

  const enviar = () => {
    if (!f.clinica.trim() && !f.contacto.trim()) return setError("Elegí la clínica o escribí con quién hablaste.");
    if (!Number.isFinite(f.duracionMin) || f.duracionMin < 0) return setError("La duración no es válida.");
    setError(null);
    const final = { ...f, medio: f.medio ?? "Teléfono", clinica: f.clinica.trim(), contacto: f.contacto.trim(), motivo: f.motivo.trim(), notas: f.notas.trim() };
    guardar.mutate(final, {
      onSuccess: () => {
        onGuardada?.(final);
        onCerrar();
      },
    });
  };

  return (
    <DialogoFormulario
      abierto
      titulo={inicial ? "Editar llamada" : "Registrar llamada"}
      descripcion="Queda en el historial de la clínica. Si hay que volver a llamar, poné la fecha y aparece en rojo cuando se pasa."
      onCerrar={onCerrar}
      onGuardar={enviar}
      guardando={guardar.isPending}
      error={error}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Clínica" className="sm:col-span-2">
          <input
            list="clinicas-llamada"
            value={f.clinica}
            onChange={(e) => elegirClinica(e.target.value)}
            className={INPUT}
            placeholder="Elegí o escribí la clínica"
          />
          <datalist id="clinicas-llamada">
            {(clinicas ?? []).map((c) => (
              <option key={c.id} value={c.nombre} />
            ))}
          </datalist>
        </Campo>
        <Campo label="Contacto">
          <input value={f.contacto} onChange={(e) => set("contacto", e.target.value)} className={INPUT} />
        </Campo>
        <Campo label="Teléfono">
          <input value={f.telefono} onChange={(e) => set("telefono", e.target.value)} className={INPUT} placeholder="+54 11 5555 5555" />
        </Campo>
        {tel && (
          <div className="sm:col-span-2">
            <BotonesContacto telefono={f.telefono} />
          </div>
        )}
        <Campo label="Por dónde">
          <select value={f.medio ?? "Teléfono"} onChange={(e) => set("medio", e.target.value as Llamada["medio"])} className={INPUT}>
            <option>WhatsApp</option>
            <option>Teléfono</option>
            <option>Videollamada</option>
          </select>
        </Campo>
        <Campo label="Dirección">
          <select value={f.direccion} onChange={(e) => set("direccion", e.target.value as Llamada["direccion"])} className={INPUT}>
            <option>Saliente</option>
            <option>Entrante</option>
          </select>
        </Campo>
        <Campo label="Resultado">
          <select value={f.resultado} onChange={(e) => set("resultado", e.target.value as Llamada["resultado"])} className={INPUT}>
            {RESULTADOS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Campo>
        <Campo label="Duración (minutos)">
          <input
            type="number"
            min={0}
            max={600}
            step={0.5}
            value={f.duracionMin}
            onChange={(e) => set("duracionMin", Number(e.target.value))}
            className={INPUT}
          />
        </Campo>
        <Campo label="Volver a llamar el">
          <input
            type="date"
            value={f.proximoSeguimiento ?? ""}
            onChange={(e) => set("proximoSeguimiento", e.target.value || null)}
            className={INPUT}
          />
        </Campo>
        <Campo label="Motivo" className="sm:col-span-2">
          <input
            value={f.motivo}
            onChange={(e) => set("motivo", e.target.value)}
            maxLength={200}
            className={INPUT}
            placeholder="Ej.: recordatorio de pago, consulta por la agenda"
          />
        </Campo>
        <Campo label="Notas" className="sm:col-span-2">
          <Textarea value={f.notas} onChange={(e) => set("notas", e.target.value)} rows={3} maxLength={2000} />
        </Campo>
      </div>
    </DialogoFormulario>
  );
}

/* ───────────── Respuestas listas para copiar ───────────── */

export function RespuestasListas({ area, editable }: { area: Plantilla["area"]; editable: boolean }) {
  const { data, isLoading } = useColeccion("plantillas");
  const borrar = useAccion((id: string) => borrarDe("plantillas", id), ["plantillas"], "Respuesta eliminada");
  const [q, setQ] = useState("");
  const [editando, setEditando] = useState<Plantilla | "nueva" | null>(null);
  const [copiada, setCopiada] = useState<string | null>(null);

  const lista = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (data ?? [])
      .filter((p) => p.area === area)
      .filter((p) => !t || `${p.titulo} ${p.texto} ${p.etiquetas.join(" ")}`.toLowerCase().includes(t))
      .sort((a, b) => a.titulo.localeCompare(b.titulo));
  }, [data, q, area]);

  const copiar = async (p: Plantilla) => {
    try {
      await navigator.clipboard.writeText(p.texto);
      setCopiada(p.id);
      window.setTimeout(() => setCopiada((x) => (x === p.id ? null : x)), 2000);
    } catch {
      /* sin portapapeles: se puede seleccionar el texto a mano */
    }
  };

  return (
    <Seccion
      titulo="Respuestas listas"
      descripcion="Textos guardados para responder rápido por WhatsApp o correo. Tocá «Copiar» y pegalo."
      acciones={
        editable ? (
          <Button size="sm" onClick={() => setEditando("nueva")}>
            <Plus className="mr-1 h-4 w-4" /> Nueva respuesta
          </Button>
        ) : undefined
      }
    >
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar respuesta" className={`${INPUT} pl-9`} />
      </div>
      {isLoading ? (
        <Cargando />
      ) : lista.length === 0 ? (
        <Vacio titulo="Todavía no hay respuestas guardadas" texto="Guardá las respuestas que más usan, así no se escriben cada vez." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lista.map((p) => (
            <div key={p.id} className="flex flex-col rounded-2xl border border-border p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{p.titulo}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Pildora tono="primario">{p.canal}</Pildora>
                    {p.etiquetas.map((e) => (
                      <Pildora key={e}>{e}</Pildora>
                    ))}
                  </div>
                </div>
                {editable && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setEditando(p)} title="Editar">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Eliminar"
                      onClick={() => confirmar(`¿Eliminar «${p.titulo}»?`) && borrar.mutate(p.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="mt-2 flex-1 whitespace-pre-wrap text-sm text-muted-foreground">{p.texto}</p>
              <Button size="sm" variant="outline" className="mt-3 self-start" onClick={() => void copiar(p)}>
                {copiada === p.id ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
                {copiada === p.id ? "Copiada" : "Copiar"}
              </Button>
            </div>
          ))}
        </div>
      )}
      {editando && (
        <DialogoPlantilla area={area} inicial={editando === "nueva" ? null : editando} onCerrar={() => setEditando(null)} />
      )}
    </Seccion>
  );
}

function DialogoPlantilla({
  area,
  inicial,
  onCerrar,
}: {
  area: Plantilla["area"];
  inicial: Plantilla | null;
  onCerrar: () => void;
}) {
  const guardar = useAccion((p: Plantilla) => guardarEn("plantillas", p), ["plantillas"], "Respuesta guardada");
  const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState<Plantilla>(
    inicial ?? { id: nuevoIdLocal("pl"), titulo: "", area, canal: "WhatsApp", texto: "", etiquetas: [] },
  );
  const [etiquetas, setEtiquetas] = useState(f.etiquetas.join(", "));
  const enviar = () => {
    if (!f.titulo.trim() || !f.texto.trim()) return setError("Escribí el título y el texto.");
    setError(null);
    guardar.mutate(
      {
        ...f,
        titulo: f.titulo.trim(),
        texto: f.texto.trim(),
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
      titulo={inicial ? "Editar respuesta" : "Nueva respuesta lista"}
      onCerrar={onCerrar}
      onGuardar={enviar}
      guardando={guardar.isPending}
      error={error}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Título" className="sm:col-span-2">
          <input
            value={f.titulo}
            onChange={(e) => setF({ ...f, titulo: e.target.value })}
            maxLength={120}
            className={INPUT}
            placeholder="Ej.: Bienvenida a una clínica nueva"
          />
        </Campo>
        <Campo label="Canal">
          <select value={f.canal} onChange={(e) => setF({ ...f, canal: e.target.value as Plantilla["canal"] })} className={INPUT}>
            <option>WhatsApp</option>
            <option>Email</option>
            <option>General</option>
          </select>
        </Campo>
        <Campo label="Etiquetas" ayuda="Separadas por coma">
          <input value={etiquetas} onChange={(e) => setEtiquetas(e.target.value)} className={INPUT} placeholder="pagos, bienvenida" />
        </Campo>
        <Campo label="Texto" className="sm:col-span-2">
          <Textarea value={f.texto} onChange={(e) => setF({ ...f, texto: e.target.value })} rows={6} maxLength={4000} />
        </Campo>
      </div>
    </DialogoFormulario>
  );
}

/* ───────────── Pedidos de llamada («Te llamamos gratis» de la web) ───────────── */

const TONO_PEDIDO: Record<PedidoLlamada["estado"], "primario" | "ok" | "alerta" | "neutro"> = {
  Pendiente: "primario",
  Llamado: "ok",
  "No contestó": "alerta",
  Descartado: "neutro",
};

const NOMBRE_PAIS: Record<string, string> = {
  AR: "Argentina", CL: "Chile", CO: "Colombia", MX: "México", PE: "Perú", UY: "Uruguay", PY: "Paraguay", BO: "Bolivia",
  EC: "Ecuador", ES: "España", US: "Estados Unidos", BR: "Brasil",
};
const inicialesDe = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((x) => x[0]?.toUpperCase() ?? "")
    .join("") || "?";

export function PedidosLlamada({ editable }: { editable: boolean }) {
  const autor = useAutor();
  const { data, isLoading } = useColeccion("pedidosLlamada");
  const guardar = useAccion((p: PedidoLlamada) => guardarEn("pedidosLlamada", p), ["pedidosLlamada"], "Pedido actualizado");
  const [filtro, setFiltro] = useState<"pendientes" | "todos">("pendientes");
  const [llamando, setLlamando] = useState<PedidoLlamada | null>(null);
  // Nombres prolijos también en los pedidos que llegaron antes («PINTO CASTRO MAURO» → «Pinto Castro Mauro»)
  const todos = (data ?? []).map((p) => ({ ...p, nombre: nombreProlijo(p.nombre), clinica: clinicaProlija(p.clinica ?? "") }));
  const porLlamar = todos.filter((p) => p.estado === "Pendiente" || p.estado === "No contestó");
  const lista = (filtro === "todos" ? todos : porLlamar).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const llamados = todos.filter((p) => p.estado === "Llamado").length;

  const exportar = () =>
    descargarExcel("pedidos-de-llamada", "Pedidos", [
      ["Fecha", "Nombre", "Clínica", "País", "Teléfono", "Horario", "Motivo", "Estado", "Atendió", "Notas"],
      ...lista.map((p) => [p.fecha.slice(0, 16).replace("T", " "), p.nombre, p.clinica, p.pais, p.telefono, p.horario, p.motivo, p.estado, p.atendidoPor ?? "", p.notas]),
    ]);

  const marcar = (p: PedidoLlamada, estado: PedidoLlamada["estado"], llamadaId: string | null = p.llamadaId) =>
    guardar.mutate({ ...p, estado, atendidoPor: autor, llamadaId });

  return (
    <Seccion
      titulo="Pedidos de llamada"
      descripcion="Clínicas que pidieron «Te llamamos gratis» en la página. Llamalas por WhatsApp (gratis) o por teléfono y marcá cómo te fue: la llamada queda registrada."
      acciones={
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-muted/70 p-1" role="group" aria-label="Mostrar">
            {(
              [
                ["pendientes", `Por llamar (${porLlamar.length})`],
                ["todos", `Todos (${todos.length})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFiltro(id)}
                aria-pressed={filtro === id}
                className={
                  filtro === id
                    ? "rounded-full bg-card px-4 py-1.5 text-xs font-bold text-primary shadow-sm"
                    : "rounded-full px-4 py-1.5 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                }
              >
                {label}
              </button>
            ))}
          </div>
          <BotonExcel onClick={exportar} />
        </div>
      }
      sinPadding
    >
      {!isLoading && todos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 border-b border-border/60 px-5 py-3 sm:gap-3">
          {[
            { l: "Por llamar", v: porLlamar.length, c: "text-primary", b: "bg-primary/[0.06]" },
            { l: "Llamados", v: llamados, c: "text-success", b: "bg-success/[0.08]" },
            { l: "Total", v: todos.length, c: "text-foreground", b: "bg-muted/60" },
          ].map((k) => (
            <div key={k.l} className={`rounded-2xl px-3 py-2.5 ${k.b}`}>
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{k.l}</p>
              <p className={`text-xl font-extrabold tabular-nums ${k.c}`}>{k.v}</p>
            </div>
          ))}
        </div>
      )}
      {isLoading ? (
        <div className="p-5">
          <Cargando />
        </div>
      ) : lista.length === 0 ? (
        <div className="p-5">
          <Vacio titulo={filtro === "pendientes" ? "No hay pedidos por llamar" : "Todavía no llegó ningún pedido"} texto="Llegan desde el botón «Te llamamos gratis» de la página." />
        </div>
      ) : (
        <ul className="space-y-3 p-4 sm:p-5">
          {lista.map((p) => {
            const abierto = p.estado === "Pendiente" || p.estado === "No contestó";
            return (
              <li
                key={p.id}
                className={`group relative overflow-hidden rounded-3xl border bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-26px_rgba(76,29,149,0.55)] sm:p-5 ${
                  abierto ? "border-primary/20" : "border-border/70 opacity-80"
                }`}
              >
                {abierto && <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-primary to-fuchsia-500" />}
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                  {/* Quién */}
                  <div className="flex min-w-0 flex-1 gap-3.5">
                    <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 text-sm font-bold text-white shadow-[0_10px_22px_-12px_rgba(124,58,237,0.9)]">
                      {inicialesDe(p.nombre)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="truncate text-base font-extrabold tracking-tight sm:text-[17px]">{p.nombre}</p>
                        <Pildora tono={TONO_PEDIDO[p.estado]}>{p.estado}</Pildora>
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                        {p.clinica && (
                          <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/[0.07] px-2.5 py-1 font-semibold text-primary">
                            <Building2 className="size-3.5 shrink-0" />
                            <span className="truncate">{p.clinica}</span>
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-semibold tabular-nums text-foreground/80">
                          <Phone className="size-3.5" /> {p.telefono}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
                          <MapPin className="size-3.5" /> {NOMBRE_PAIS[p.pais.toUpperCase()] ?? p.pais.toUpperCase()}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 font-semibold text-amber-800 dark:text-amber-200">
                          <Clock className="size-3.5" /> {p.horario}
                        </span>
                      </div>
                      {p.motivo && (
                        <p className="mt-2.5 flex gap-2 rounded-2xl bg-muted/50 px-3 py-2 text-sm text-foreground/85">
                          <MessageCircle className="mt-0.5 size-4 shrink-0 text-primary" />
                          <span className="whitespace-pre-wrap break-words">{p.motivo}</span>
                        </p>
                      )}
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        Pidió {haceCuanto(p.fecha).replace(/^Hace/, "hace")}
                        {p.atendidoPor && p.estado !== "Pendiente" && <> · Atendió: {p.atendidoPor}</>}
                      </p>
                    </div>
                  </div>
                  {/* Acciones */}
                  <div className="flex flex-col gap-2 lg:items-end">
                    <BotonesContacto telefono={p.telefono} pais={p.pais} />
                    {editable && abierto && (
                      <div className="flex flex-wrap gap-1.5 lg:justify-end">
                        <Button size="sm" onClick={() => setLlamando(p)} className="rounded-full bg-gradient-to-r from-primary to-fuchsia-500 px-4 shadow-[0_8px_18px_-10px_rgba(124,58,237,0.9)]">
                          <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Ya lo llamé
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-full" disabled={guardar.isPending} onClick={() => marcar(p, "No contestó")}>
                          No contestó
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-full text-muted-foreground"
                          disabled={guardar.isPending}
                          onClick={() => confirmar("¿Descartar este pedido?") && marcar(p, "Descartado")}
                        >
                          Descartar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {llamando && (
        <DialogoLlamada
          inicial={null}
          base={{
            direccion: "Saliente",
            clinica: llamando.clinica,
            contacto: llamando.nombre,
            telefono: llamando.telefono,
            motivo: llamando.motivo.slice(0, 200),
            origen: "Pedido web",
            medio: "WhatsApp",
          }}
          onGuardada={(l) => marcar(llamando, l.resultado === "Atendida" ? "Llamado" : "No contestó", l.id)}
          onCerrar={() => setLlamando(null)}
        />
      )}
    </Seccion>
  );
}
