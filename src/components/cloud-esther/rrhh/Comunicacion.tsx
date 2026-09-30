import { useState } from "react";
import {
  Cake,
  Eye,
  Megaphone,
  PartyPopper,
  Pin,
  PinOff,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import type { TeamRole } from "@/lib/cloud-esther/equipo-profesional-data";
import {
  auditar,
  legajoDe,
  nombreDe,
  proximoAniversario,
  setRRHH,
  storeRRHH,
  type Comunicado,
} from "@/lib/cloud-esther/rrhh-store";
import {
  Acciones,
  Avatar,
  BTN_ICONO,
  BTN_PRIMARIO,
  BTN_SECUNDARIO,
  CHIP,
  Encabezado,
  Field,
  INPUT,
  Modal,
  Pill,
  ROL_LABEL,
  Sel,
  Vacio,
  fecha,
  hace,
  titulo,
  type Ctx,
} from "./ui";

/** Borrador de comunicado según el tema (Esther). */
export function redactarComunicado(tema: string, autor: string) {
  const t = tema.toLocaleLowerCase("es");
  const firma = `\n\nGracias,\n${titulo(autor)}`;
  if (/feriado|cierre|cerrad/.test(t))
    return `Les recordamos que la clínica permanecerá cerrada por ${tema.replace(/^cierre (por )?/i, "")}. Revisen sus agendas y reprogramen los turnos de esa fecha con tiempo. Recepción va a avisar a los pacientes por WhatsApp.${firma}`;
  if (/protocolo|bioseg|esteril/.test(t))
    return `A partir del próximo lunes empieza a regir el nuevo protocolo de ${tema}. Pedimos que todos lo lean y lo apliquen en cada gabinete. Cualquier duda, consúltenla con coordinación.${firma}`;
  if (/reuni|capacit|curso/.test(t))
    return `Los invitamos a ${tema}. Es importante contar con la presencia de todo el equipo; si no pueden asistir, avisen por el portal del equipo.${firma}`;
  if (/bienven|ingres|nuev/.test(t))
    return `¡Damos la bienvenida a ${tema.replace(/bienvenida( a)?/i, "").trim() || "una nueva integrante"} al equipo! Ayudémosla a sentirse como en casa en sus primeros días.${firma}`;
  if (/sueldo|pago|recibo|aguinaldo/.test(t))
    return `Les informamos que ${tema} ya está disponible. Pueden ver y descargar su recibo desde el portal del equipo, en Mi perfil.${firma}`;
  return `Queremos contarles sobre ${tema}. Les pedimos que lo tengan en cuenta y consulten cualquier duda con administración.${firma}`;
}

export function Comunicacion({ ctx }: { ctx: Ctx }) {
  const { miembros } = useEquipo();
  const { comunicados, legajos } = storeRRHH.usar();
  const [nuevo, setNuevo] = useState(false);
  const [lectores, setLectores] = useState<Comunicado | null>(null);
  const activos = miembros.filter((m) => m.status !== "inactivo" && !legajos[m.id]?.baja);
  const destinatarios = (c: Comunicado) =>
    activos.filter((m) => c.destino === "Todos" || m.role === c.destino);
  const orden = [...comunicados].sort(
    (a, b) => Number(b.fijado) - Number(a.fijado) || b.fecha.localeCompare(a.fecha),
  );
  const eventos = activos
    .flatMap((m) => {
      const l = legajoDe(m, legajos);
      const c = proximoAniversario(l.nacimiento);
      const i = proximoAniversario(l.ingreso);
      return [
        c
          ? {
              m,
              tipo: "Cumpleaños" as const,
              dias: c.dias,
              fecha: c.fecha,
              detalle: `Cumple ${c.anios}`,
            }
          : null,
        i && i.anios > 0
          ? {
              m,
              tipo: "Aniversario" as const,
              dias: i.dias,
              fecha: i.fecha,
              detalle: `${i.anios} ${i.anios === 1 ? "año" : "años"} en la clínica`,
            }
          : null,
      ];
    })
    .filter((x): x is NonNullable<typeof x> => !!x && x.dias <= 90)
    .sort((a, b) => a.dias - b.dias);

  return (
    <div className="space-y-3">
      <Encabezado
        icon={Megaphone}
        titulo="Comunicación interna"
        descripcion="Los comunicados llegan al portal del equipo y ves quién los leyó."
      >
        <button type="button" className={BTN_PRIMARIO} onClick={() => setNuevo(true)}>
          <Send className="size-4" />
          Nuevo comunicado
        </button>
      </Encabezado>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-3">
          {orden.length === 0 && <Vacio icon={Megaphone} texto="Todavía no hay comunicados." />}
          {orden.map((c) => {
            const dest = destinatarios(c);
            const leidos = dest.filter((m) => c.leidos.includes(m.id)).length;
            return (
              <article
                key={c.id}
                className={`card-grad p-4 ${c.fijado ? "ring-2 ring-primary/25" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold">
                      {c.fijado && <Pin className="size-3.5 text-primary" />}
                      {c.titulo}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {c.autor} · {hace(c.fecha)} · para{" "}
                      {c.destino === "Todos" ? "todo el equipo" : ROL_LABEL[c.destino as TeamRole]}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label={c.fijado ? "Desfijar" : "Fijar"}
                      className={BTN_ICONO}
                      onClick={() =>
                        setRRHH("comunicados", (p) =>
                          p.map((x) => (x.id === c.id ? { ...x, fijado: !x.fijado } : x)),
                        )
                      }
                    >
                      {c.fijado ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                    </button>
                    <button
                      type="button"
                      aria-label="Eliminar comunicado"
                      className={BTN_ICONO}
                      onClick={() => {
                        setRRHH("comunicados", (p) => p.filter((x) => x.id !== c.id));
                        auditar(ctx.usuario, "Comunicado eliminado", c.titulo);
                        ctx.onToast("Comunicado eliminado");
                      }}
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-6">{c.texto}</p>
                <button
                  type="button"
                  onClick={() => setLectores(c)}
                  className="mt-3 flex w-full items-center gap-2 text-left"
                >
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-primary/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500"
                      style={{ width: `${dest.length ? (leidos / dest.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                    <Eye className="size-3.5" /> {leidos}/{dest.length} leído
                  </span>
                </button>
              </article>
            );
          })}
        </div>
        <div className="card-grad h-fit p-4 xl:sticky xl:top-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <PartyPopper className="size-4 text-primary" /> Cumpleaños y aniversarios
          </p>
          <p className="text-[11px] text-muted-foreground">Próximos 90 días</p>
          {eventos.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">Nada en los próximos 90 días.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {eventos.map((e) => (
                <li
                  key={`${e.m.id}-${e.tipo}`}
                  className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 ring-1 ${e.dias === 0 ? "bg-fuchsia-50 ring-fuchsia-200" : "bg-white/80 ring-primary/10"}`}
                >
                  <Avatar m={e.m} tam="size-8" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{nombreDe(e.m)}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {e.tipo === "Cumpleaños" ? (
                        <Cake className="mr-1 inline size-3" />
                      ) : (
                        <PartyPopper className="mr-1 inline size-3" />
                      )}
                      {e.detalle} · {fecha(e.fecha)}
                    </p>
                  </div>
                  {e.dias <= 7 ? (
                    <button
                      type="button"
                      className="rounded-full bg-primary px-2.5 py-1 text-[10.5px] font-semibold text-primary-foreground"
                      onClick={() => {
                        const t =
                          e.tipo === "Cumpleaños"
                            ? `¡Feliz cumpleaños, ${e.m.firstName}! 🎂`
                            : `¡${e.detalle}, ${e.m.firstName}! 🎉`;
                        setRRHH("comunicados", (p) => [
                          {
                            id: `co-${Date.now()}`,
                            titulo: t,
                            texto:
                              e.tipo === "Cumpleaños"
                                ? `Hoy celebramos a ${nombreDe(e.m)}. ¡Que tengas un día hermoso! Todo el equipo te saluda.`
                                : `Gracias ${e.m.firstName} por tu compromiso y por ser parte de este equipo. ¡Por muchos años más!`,
                            fecha: new Date().toISOString(),
                            autor: titulo(ctx.usuario),
                            destino: "Todos",
                            fijado: false,
                            leidos: [],
                          },
                          ...p,
                        ]);
                        ctx.onToast("Saludo publicado para todo el equipo");
                      }}
                    >
                      {e.dias === 0 ? "Hoy · saludar" : `En ${e.dias} d · saludar`}
                    </button>
                  ) : (
                    <Pill clase="bg-muted text-muted-foreground">en {e.dias} d</Pill>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {nuevo && (
        <Modal titulo="Nuevo comunicado" onClose={() => setNuevo(false)} ancho="max-w-2xl">
          <ComunicadoForm
            ctx={ctx}
            onCancel={() => setNuevo(false)}
            onListo={(t) => {
              setNuevo(false);
              ctx.onToast(t);
            }}
          />
        </Modal>
      )}
      {lectores && (
        <Modal titulo={`Lecturas: ${lectores.titulo}`} onClose={() => setLectores(null)}>
          <ul className="space-y-1.5">
            {destinatarios(lectores).map((m) => {
              const leyo = lectores.leidos.includes(m.id);
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2 ring-1 ring-primary/10"
                >
                  <Avatar m={m} tam="size-7" />
                  <span className="flex-1 text-sm">{nombreDe(m)}</span>
                  <Pill
                    clase={leyo ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}
                  >
                    {leyo ? "Leído" : "Sin leer"}
                  </Pill>
                </li>
              );
            })}
          </ul>
        </Modal>
      )}
    </div>
  );
}

function ComunicadoForm({
  ctx,
  onCancel,
  onListo,
}: {
  ctx: Ctx;
  onCancel: () => void;
  onListo: (t: string) => void;
}) {
  const [t, setT] = useState("");
  const [texto, setTexto] = useState("");
  const [destino, setDestino] = useState<Comunicado["destino"]>("Todos");
  const [fijar, setFijar] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!t.trim() || !texto.trim()) return setError("Completá el título y el mensaje.");
        const titulo0 = t.trim()[0]!.toUpperCase() + t.trim().slice(1);
        setRRHH("comunicados", (p) => [
          {
            id: `co-${Date.now()}`,
            titulo: titulo0,
            texto: texto.trim(),
            fecha: new Date().toISOString(),
            autor: titulo(ctx.usuario),
            destino,
            fijado: fijar,
            leidos: [],
          },
          ...p,
        ]);
        auditar(ctx.usuario, "Comunicado", titulo0);
        onListo("Comunicado publicado: ya aparece en el portal del equipo");
      }}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_200px]">
        <Field label="Título / tema *">
          <input
            autoFocus
            value={t}
            onChange={(e) => setT(e.target.value)}
            className={INPUT}
            placeholder="Ej: Cierre por feriado del 12 de octubre"
          />
        </Field>
        <Field label="Para">
          <Sel
            value={destino}
            onChange={setDestino}
            opciones={[
              { value: "Todos", label: "Todo el equipo" },
              ...(Object.keys(ROL_LABEL) as TeamRole[]).map((r) => ({
                value: r,
                label: ROL_LABEL[r],
              })),
            ]}
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-1">
        {[
          "Cierre por feriado",
          "Protocolo de esterilización",
          "Reunión clínica mensual",
          "Recibos de sueldo disponibles",
        ].map((s) => (
          <button
            key={s}
            type="button"
            className={`${CHIP(false)} ring-1 ring-primary/10`}
            onClick={() => setT(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <Field label="Mensaje *">
        <textarea
          rows={6}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="w-full rounded-xl border border-primary/12 bg-white px-3 py-2 text-sm outline-none focus:border-primary/45"
        />
      </Field>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className={BTN_SECUNDARIO}
          onClick={() => {
            if (!t.trim())
              return setError("Escribí primero el tema para que Esther arme el borrador.");
            setError("");
            setTexto(redactarComunicado(t.trim(), ctx.usuario));
          }}
        >
          <Sparkles className="size-4" />
          Redactar con Esther
        </button>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={fijar}
            onChange={(e) => setFijar(e.target.checked)}
            className="size-4 accent-primary"
          />
          Fijar arriba
        </label>
      </div>
      {error && <p className="text-xs font-medium text-rose-600">{error}</p>}
      <Acciones etiqueta="Publicar" onCancel={onCancel} icon={Send} />
    </form>
  );
}
