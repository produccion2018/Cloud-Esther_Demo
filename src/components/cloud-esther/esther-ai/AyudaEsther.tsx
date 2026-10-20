import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, ChevronRight, LifeBuoy, Search, Sparkles, X } from "lucide-react";

import { AvatarEsther } from "./AvatarEsther";
import { POS_FLOTANTE, POS_FLOTANTE_CHAT, useHayComposer } from "@/lib/cloud-esther/composer-visible";
import { normalizarBusqueda } from "@/lib/utils";

/* Ubicación: src/components/cloud-esther/esther-ai/AyudaEsther.tsx
   AYUDA DE ESTHER — soporte inteligente integrado, en TODOS los planes:
   - «En esta pantalla»: qué es y cómo se usa el módulo donde estás (ayuda contextual).
   - «Preguntame cómo hacer algo»: responde dudas sobre el SISTEMA al instante (sin esperar a
     nadie) y te lleva a la pantalla justa.
   No lee ni muestra datos de pacientes: solo explica cómo usar Cloud Esther. La IA clínica que
   trabaja con los datos (Esther Infinity) sigue siendo de Plus y Enterprise.
   Misma tipografía del sistema (Plus Jakarta Sans para el texto y Sora para los títulos). */

type Ayuda = { titulo: string; resumen: string; pasos: string[] };

const AYUDA_MODULO: Record<string, Ayuda> = {
  dashboard: {
    titulo: "Centro de operaciones",
    resumen: "Lo que pasa hoy en tu clínica en una sola pantalla: turnos, cobros, avisos y accesos rápidos.",
    pasos: ["Usá «Nuevo turno» o «Nuevo paciente» desde el banner.", "Tocá una tarjeta para ir al detalle.", "La tarjeta «Primeros pasos» te guía en la configuración inicial."],
  },
  agenda: {
    titulo: "Agenda y turnos",
    resumen: "Turnos por día, semana y mes, bloqueos de horario y lista de espera.",
    pasos: ["Elegí el día en el calendario y tocá un horario libre para dar un turno.", "Cambiá el estado del turno (confirmado, atendido, ausente) desde su tarjeta.", "Bloqueá horarios para vacaciones o reuniones."],
  },
  pacientes: {
    titulo: "Pacientes",
    resumen: "Altas, búsqueda y la carpeta de cada paciente con su ficha completa.",
    pasos: ["«Nuevo paciente» para dar de alta; «Importar» para traer tu listado de Excel.", "Buscá por nombre, DNI o teléfono.", "Abrí la carpeta para ver historia, turnos, cuenta y documentos."],
  },
  historia: {
    titulo: "Historia clínica",
    resumen: "Evolución, antecedentes, diagnósticos y fichas por especialidad de cada paciente.",
    pasos: ["Buscá al paciente y abrí su historia.", "Cargá la evolución de cada consulta.", "En «Fichas por especialidad» tenés Ortodoncia, Endodoncia, Implantes y más (desde Pro)."],
  },
  odontograma: {
    titulo: "Odontograma 2D",
    resumen: "Estado de cada pieza (adulto e infantil) y el periodontograma.",
    pasos: ["Elegí al paciente.", "Tocá una pieza y marcá su estado.", "En la pestaña «Periodontograma» cargás sondaje, sangrado y placa (desde Pro)."],
  },
  odontograma3d: {
    titulo: "Odontograma 3D",
    resumen: "Modelo 3D con la ficha de cada pieza, rayos X, simulador de sonrisa y periodoncia.",
    pasos: ["Girá el modelo y tocá una pieza.", "En su ficha tenés tratamientos, notas, imágenes y «Periodoncia».", "El periodontograma completo está en la pestaña «Periodontograma»."],
  },
  recetas: {
    titulo: "Recetas",
    resumen: "Recetas digitales con control de alergias, en PDF tamaño A5 con el membrete de la clínica.",
    pasos: ["Elegí al paciente y tocá «Nueva receta».", "Si un medicamento choca con una alergia, te avisa.", "Descargá el PDF o envialo por correo."],
  },
  estudios: {
    titulo: "Estudios y diagnóstico",
    resumen: "Radiografías, tomografías e imágenes con visor (zoom, brillo, contraste).",
    pasos: ["Subí el estudio desde la carpeta del paciente.", "Abrilo con el visor para medir y anotar.", "Cargá el informe cuando esté listo."],
  },
  laboratorio: {
    titulo: "Laboratorio",
    resumen: "Trabajos enviados al laboratorio: estado, atrasos, cuenta corriente y reportes.",
    pasos: ["Cargá el trabajo en la ficha del paciente → Laboratorio.", "En «Todos los laboratorios» ves órdenes, atrasos y la cuenta con cada uno (desde Pro).", "Mandá WhatsApp al laboratorio o bajá el PDF de la orden."],
  },
  tratamientos: {
    titulo: "Tratamientos",
    resumen: "Planes de tratamiento con sesiones y avance.",
    pasos: ["Creá el tratamiento desde la carpeta del paciente.", "Marcá cada sesión realizada.", "El avance se ve también en el portal del paciente."],
  },
  presupuestos: {
    titulo: "Presupuestos",
    resumen: "Presupuestos con aranceles, financiación y seguimiento hasta que el paciente aprueba.",
    pasos: ["Cargá tu lista de precios en «Aranceles».", "Armá el presupuesto y envialo por WhatsApp o al portal.", "Seguí los que esperan respuesta en «Seguimiento»."],
  },
  facturacion: {
    titulo: "Pagos y facturación",
    resumen: "Comprobantes, cobranzas, caja, obras sociales y tu plan de Cloud Esther.",
    pasos: ["«Nuevo comprobante» para facturar.", "En «Obras sociales» armás tu catálogo, el nomenclador y la planilla mensual.", "En «Mi plan» ves tu suscripción y sumás módulos."],
  },
  finanzas: {
    titulo: "Finanzas",
    resumen: "Ingresos, egresos, cuentas a pagar, bancos y resultados de la clínica.",
    pasos: ["Registrá gastos e ingresos.", "Las deudas con proveedores y laboratorios aparecen como sugerencias.", "Mirá el resultado del mes en «Resultados»."],
  },
  comunicaciones: {
    titulo: "Comunicación con pacientes",
    resumen: "Bandeja de WhatsApp, SMS y correo, recordatorios automáticos y campañas.",
    pasos: ["Respondé desde la bandeja.", "Activá los recordatorios 24 h y 2 h antes del turno.", "Usá plantillas para no escribir lo mismo."],
  },
  "comunicacion-interna": {
    titulo: "Comunicación interna",
    resumen: "El chat del equipo: comunicados con confirmación de lectura, canales y archivos.",
    pasos: ["Escribí en General o en el canal de tu área.", "Un comunicado pide confirmación de lectura.", "Elegí un fondo para el chat con el botón de fondo."],
  },
  equipo: {
    titulo: "Equipo profesional",
    resumen: "Integrantes, horarios, especialidades, permisos y ausencias.",
    pasos: ["«Agregar integrante» y elegí su rol.", "Cargá sus horarios en «Agendas y horarios».", "En Plus y Enterprise podés crear roles propios (Facturación, RRHH…)."],
  },
  "portal-paciente": {
    titulo: "Portal del paciente",
    resumen: "Lo que ve cada paciente desde su celular y qué le llega (con tu aprobación).",
    pasos: ["Invitá al paciente desde «Accesos».", "En «Configuración» elegís qué ve y quién puede enviarle cosas.", "En modo «con aprobación», enviá recetas y estudios desde la bandeja."],
  },
  configuracion: {
    titulo: "Configuración",
    resumen: "Datos de la clínica, apariencia, marca propia, notificaciones y seguridad.",
    pasos: ["Completá los datos de la clínica (salen en recetas y documentos).", "En «Apariencia» elegís colores y, en Plus y Enterprise, tu logo.", "En «Seguridad y auditoría» ves quién hizo qué."],
  },
};

/** Secciones de la Administración que usan la ayuda de un módulo del Centro */
const ALIAS: Record<string, string> = {
  "pacientes-admin": "pacientes",
  cobros: "facturacion",
  caja: "facturacion",
  coberturas: "facturacion",
  interna: "comunicacion-interna",
  mensajes: "comunicaciones",
  portal: "portal-paciente",
  integrantes: "equipo",
  especialidades: "equipo",
  "agendas-horarios": "equipo",
  accesos: "equipo",
  perfil: "configuracion",
  "odontograma-3d": "odontograma3d",
};

const GENERAL: Ayuda = {
  titulo: "Cloud Esther",
  resumen: "Estás en una sección del sistema. Preguntame cómo hacer cualquier cosa y te llevo.",
  pasos: ["Usá el menú de la izquierda para moverte entre módulos.", "Arriba a la derecha tenés las notificaciones.", "Escribí abajo tu duda: «cómo doy un turno», «cómo importo pacientes»…"],
};

type Pregunta = { p: string; r: string; claves: string; ir?: string; boton?: string };

const PREGUNTAS: Pregunta[] = [
  { p: "¿Cómo doy un turno?", r: "En Agenda tocá un horario libre (o «Nuevo turno»), elegí paciente, profesional y práctica. El sistema avisa si ese horario ya está ocupado.", claves: "turno cita agendar reservar dar", ir: "/demo/agenda", boton: "Ir a la Agenda" },
  { p: "¿Cómo confirmo o cancelo un turno?", r: "En la tarjeta del turno cambiá el estado: Confirmado, Atendido, Ausente o Cancelado. Desde Administración también podés reprogramarlo.", claves: "confirmar cancelar reprogramar ausente", ir: "/demo/agenda", boton: "Ir a la Agenda" },
  { p: "¿Cómo cargo feriados y vacaciones?", r: "En Administración → Agenda tocá «Feriados y vacaciones». Las vacaciones del equipo se cargan en Equipo o en RRHH → Licencias.", claves: "feriado vacaciones cierre licencia" },
  { p: "¿Cómo doy de alta un paciente?", r: "En Pacientes tocá «Nuevo paciente». Solo nombre y apellido son obligatorios; lo demás se completa en la ficha.", claves: "alta paciente nuevo crear", ir: "/demo/pacientes", boton: "Ir a Pacientes" },
  { p: "¿Cómo importo mis pacientes de otro sistema?", r: "En Pacientes tocá «Importar» y subí tu Excel o CSV. Reconozco las columnas solo, marco duplicados y errores, y te doy una plantilla.", claves: "importar migrar excel csv otro sistema", ir: "/demo/pacientes", boton: "Ir a Pacientes" },
  { p: "¿Cómo hago una receta?", r: "Abrí al paciente → Recetas → «Nueva receta». Si un medicamento choca con una alergia, te aviso. Sale en PDF A5 con el membrete de la clínica.", claves: "receta medicamento prescripcion", ir: "/demo/recetas", boton: "Ir a Recetas" },
  { p: "¿Cómo firma el paciente un consentimiento?", r: "En la ficha del paciente → Documentos → «Firmar consentimiento». El paciente firma con el dedo y queda la copia legal en PDF.", claves: "consentimiento firma firmar", ir: "/demo/pacientes", boton: "Ir a Pacientes" },
  { p: "¿Dónde está el periodontograma?", r: "En Odontograma (2D o 3D) → pestaña «Periodontograma». En el 3D, además, cada pieza tiene la pestaña «Periodoncia». Desde el plan Pro.", claves: "periodontograma periodoncia sondaje bolsa", ir: "/demo/odontograma", boton: "Ir al Odontograma" },
  { p: "¿Dónde están las fichas por especialidad?", r: "En Historia clínica → «Fichas por especialidad»: Ortodoncia, Periodoncia, Endodoncia, Implantología, Prótesis y Cirugía. Desde el plan Pro.", claves: "ficha especialidad ortodoncia endodoncia implante protesis cirugia", ir: "/demo/historia", boton: "Ir a Historia clínica" },
  { p: "¿Cómo armo un presupuesto?", r: "En Presupuestos tocá «Nuevo presupuesto», sumá prácticas desde tus aranceles y elegí un plan de financiación. Se envía por WhatsApp o al portal.", claves: "presupuesto cotizacion financiacion", ir: "/demo/presupuestos", boton: "Ir a Presupuestos" },
  { p: "¿Cómo registro un cobro?", r: "En la cuenta corriente del paciente o en Administración → Cobros y saldos. El cobro aparece en la Caja del día.", claves: "cobro cobrar pago caja saldo", ir: "/demo/facturacion", boton: "Ir a Facturación" },
  { p: "¿Cómo cargo obras sociales y el nomenclador?", r: "En Facturación → Obras sociales → «Coberturas y nomenclador». Podés sumar las de tu país con un click, importar el nomenclador y sacar la planilla mensual.", claves: "obra social prepaga nomenclador cobertura seguro mutualista isapre eps", ir: "/demo/facturacion", boton: "Ir a Facturación" },
  { p: "¿Cómo veo el atraso de un laboratorio?", r: "En Laboratorio → «Todos los laboratorios»: los trabajos atrasados quedan en rojo con los días de atraso. Desde ahí le escribís por WhatsApp.", claves: "laboratorio atraso orden trabajo protesis corona", ir: "/demo/laboratorio", boton: "Ir a Laboratorio" },
  { p: "¿Cómo pago a un laboratorio?", r: "En Laboratorio → «Todos los laboratorios» → pestaña Laboratorios → «Registrar pago». Si tu plan tiene Finanzas, el pago pasa solo como egreso.", claves: "pagar laboratorio cuenta corriente deuda", ir: "/demo/laboratorio", boton: "Ir a Laboratorio" },
  { p: "¿Cómo invito a alguien del equipo?", r: "En Equipo (o Administración → Accesos del equipo) tocá «Sumar personas», elegí su rol y le llega el correo para entrar.", claves: "invitar equipo usuario secretaria odontologo asistente acceso", ir: "/demo/equipo-profesional", boton: "Ir a Equipo" },
  { p: "¿Cómo creo un rol como Facturación o RRHH?", r: "En Plus y Enterprise, el Administrador crea roles propios en Equipo → Permisos y elige qué módulos ve cada uno.", claves: "rol roles propios permisos facturacion rrhh", ir: "/demo/equipo-profesional/permisos-accesos", boton: "Ir a Permisos" },
  { p: "¿Cómo pongo el logo de mi clínica?", r: "Configuración → Apariencia → «Marca propia» (Plus y Enterprise). Sale en el menú, el portal del paciente y las recetas.", claves: "logo marca color white label", ir: "/demo/configuracion", boton: "Ir a Configuración" },
  { p: "¿Cómo completo los datos de la clínica?", r: "En el inicio, tarjeta «Primeros pasos» → «Seguir configurando», o en Configuración → General.", claves: "datos clinica direccion telefono configurar inicial", ir: "/demo/configuracion", boton: "Ir a Configuración" },
  { p: "¿Cómo activo los recordatorios por WhatsApp?", r: "En Comunicación → Recordatorios activá 24 h y 2 h antes del turno.", claves: "recordatorio whatsapp aviso ausencias", ir: "/demo/comunicaciones", boton: "Ir a Comunicación" },
  { p: "¿Cómo decido qué ve el paciente en su portal?", r: "En Portal del paciente → Configuración (o Administración → Portal del paciente): elegís qué ve, si todo pasa por tu aprobación y quién puede enviarle cosas.", claves: "portal paciente aprobacion enviar ver", ir: "/demo/portal-paciente", boton: "Ir al Portal" },
  { p: "¿Dónde veo quién hizo cada cambio?", r: "En Configuración → Seguridad y auditoría (Plus y Enterprise) o en Administración → Auditoría, con exportación a Excel y PDF.", claves: "auditoria quien cambio registro log seguridad", ir: "/demo/configuracion", boton: "Ir a Configuración" },
  { p: "¿Cómo liquido las comisiones de los profesionales?", r: "En Administración → Liquidaciones y comisiones: se calculan solas, las aprobás, las marcás pagadas y bajás el PDF para firmar.", claves: "liquidacion comision profesional honorarios" },
  { p: "¿Cómo exporto a Excel?", r: "Casi todas las pantallas tienen un botón «Excel» o «Exportar»: pacientes, reportes, auditoría, nomenclador, laboratorio…", claves: "exportar excel descargar planilla" },
  { p: "¿Cómo agrego un módulo a mi plan?", r: "En Facturación → Mi plan → Módulos adicionales. Te lo sumamos en la próxima factura.", claves: "modulo adicional plan agregar comprar", ir: "/demo/facturacion", boton: "Ir a Mi plan" },
  { p: "¿Cómo cambio entre Operaciones y Administración?", r: "Arriba del menú, en «Tu vista», elegí Operaciones o Administración. Las dos trabajan con los mismos datos.", claves: "vista administracion operaciones cambiar" },
];

function buscar(q: string): Pregunta[] {
  const palabras = normalizarBusqueda(q)
    .split(/[^a-z0-9ñ]+/)
    .filter((w) => w.length > 2);
  if (!palabras.length) return [];
  return PREGUNTAS.map((p) => {
    const texto = normalizarBusqueda(`${p.p} ${p.claves}`);
    const puntos = palabras.filter((w) => texto.includes(w) || texto.includes(w.slice(0, -1))).length;
    return { p, puntos };
  })
    .filter((x) => x.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, 3)
    .map((x) => x.p);
}

export function AyudaEsther({ moduloId, modulo }: { moduloId: string; modulo: string }) {
  const [abierto, setAbierto] = useState(false);
  // Con un chat en pantalla, la ayuda sube y se achica para no tapar «Enviar»
  const chat = useHayComposer() && !abierto;
  const [q, setQ] = useState("");
  const [elegida, setElegida] = useState<Pregunta | null>(null);
  const caja = useRef<HTMLInputElement>(null);
  const ayuda = AYUDA_MODULO[ALIAS[moduloId] ?? moduloId] ?? { ...GENERAL, titulo: modulo || GENERAL.titulo };
  const resultados = useMemo(() => buscar(q), [q]);
  const sugeridas = PREGUNTAS.filter((p) => p.ir && ayuda.titulo && normalizarBusqueda(p.r).includes(normalizarBusqueda(ayuda.titulo.split(" ")[0] ?? ""))).slice(0, 3);

  useEffect(() => {
    if (!abierto) return;
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [abierto]);

  return (
    <>
      {abierto && (
        <div
          role="dialog"
          aria-label="Ayuda de Esther"
          className="fixed bottom-[calc(9rem+env(safe-area-inset-bottom))] right-4 z-[60] flex max-h-[min(620px,calc(100vh-10rem))] w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-3xl border border-primary/15 bg-card shadow-[0_30px_80px_-30px_rgba(76,29,149,0.7)] lg:bottom-24 lg:right-5"
        >
          <div className="relative overflow-hidden bg-[linear-gradient(118deg,#4c1d95,#7c3aed_45%,#c026d3)] px-4 py-3.5 text-white">
            <div aria-hidden className="pointer-events-none absolute -right-8 -top-10 size-32 rounded-full bg-fuchsia-300/30 blur-2xl" />
            <div className="relative flex items-center gap-3">
              <AvatarEsther tam="md" sobreColor />
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] font-bold leading-tight">Ayuda de Esther</h2>
                <p className="truncate text-xs text-white/80">Te explico cómo usar {ayuda.titulo}</p>
              </div>
              <button type="button" onClick={() => setAbierto(false)} aria-label="Cerrar ayuda" className="grid size-8 place-items-center rounded-xl bg-white/15 hover:bg-white/25">
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
            {elegida ? (
              <div className="space-y-3">
                <button type="button" onClick={() => setElegida(null)} className="text-xs font-semibold text-primary hover:underline">
                  ← Volver
                </button>
                <p className="text-sm font-bold">{elegida.p}</p>
                <p className="rounded-2xl bg-primary/[0.05] p-3 text-sm leading-relaxed text-foreground/90">{elegida.r}</p>
                {elegida.ir && (
                  <Link to={elegida.ir as never} onClick={() => setAbierto(false)} className="btn-ce !min-h-10">
                    {elegida.boton ?? "Ir"} <ArrowRight className="size-4" />
                  </Link>
                )}
              </div>
            ) : (
              <>
                <section className="rounded-2xl border border-primary/12 bg-gradient-to-br from-primary/[0.05] to-fuchsia-500/[0.04] p-3.5">
                  <p className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-primary">
                    <BookOpen className="size-3.5" /> En esta pantalla
                  </p>
                  <p className="mt-1.5 text-sm font-bold">{ayuda.titulo}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{ayuda.resumen}</p>
                  <ol className="mt-2.5 space-y-1.5">
                    {ayuda.pasos.map((p, i) => (
                      <li key={p} className="flex gap-2 text-xs leading-relaxed">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-[10px] font-bold text-white">{i + 1}</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ol>
                </section>

                <section>
                  <label className="relative block">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary/70" />
                    <input
                      ref={caja}
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Preguntame cómo hacer algo…"
                      className="h-11 w-full rounded-2xl border border-primary/15 bg-card pl-10 pr-3 text-sm outline-none transition focus:border-primary/45 focus:ring-4 focus:ring-primary/10"
                    />
                  </label>
                  {q.trim() && (
                    <ul className="mt-2 space-y-1.5">
                      {resultados.length === 0 ? (
                        <li className="rounded-xl bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
                          No encontré esa respuesta. Probá con otras palabras (por ejemplo: «turno», «receta», «importar»).
                        </li>
                      ) : (
                        resultados.map((p) => (
                          <li key={p.p}>
                            <button type="button" onClick={() => setElegida(p)} className="flex w-full items-center gap-2 rounded-xl border border-primary/10 bg-card px-3 py-2.5 text-left text-sm font-semibold transition hover:border-primary/30 hover:bg-primary/[0.04]">
                              <Sparkles className="size-4 shrink-0 text-primary" />
                              <span className="flex-1">{p.p}</span>
                              <ChevronRight className="size-4 text-muted-foreground" />
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </section>

                {!q.trim() && (
                  <section>
                    <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Preguntas frecuentes</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(sugeridas.length ? sugeridas : PREGUNTAS.slice(0, 4)).concat(PREGUNTAS.filter((x) => !sugeridas.includes(x)).slice(0, 3)).slice(0, 6).map((p) => (
                        <button key={p.p} type="button" onClick={() => setElegida(p)} className="rounded-full border border-primary/15 bg-card px-3 py-1.5 text-xs font-semibold text-foreground/80 transition hover:border-primary/40 hover:text-primary">
                          {p.p}
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
          <p className="flex items-center gap-1.5 border-t border-primary/10 px-4 py-2.5 text-[10.5px] text-muted-foreground">
            <LifeBuoy className="size-3.5 text-primary" /> Explica cómo usar el sistema; no ve datos de pacientes.
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          setAbierto((v) => !v);
          window.setTimeout(() => caja.current?.focus(), 50);
        }}
        aria-label={abierto ? "Cerrar ayuda" : "Ayuda de Esther"}
        title={abierto ? "Cerrar ayuda" : "¿Necesitás ayuda?"}
        className={`group fixed ${chat ? POS_FLOTANTE_CHAT : POS_FLOTANTE} right-4 z-[60] flex items-center gap-2.5 overflow-hidden rounded-full border border-primary/20 bg-card/95 p-1.5 shadow-[0_14px_34px_-14px_rgba(124,58,237,0.75)] backdrop-blur-md transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-primary/40 lg:right-5 ${chat ? "" : "sm:pr-4"}`}
      >
        {!abierto && <span aria-hidden className="ce-esther-brillo pointer-events-none absolute inset-0" />}
        <AvatarEsther tam="md" enLinea={!abierto} />
        <span className={chat ? "hidden" : "hidden text-left sm:block"}>
          <span className="block text-[13px] font-bold leading-tight">¿Necesitás ayuda?</span>
          <span className="block text-[11px] text-muted-foreground">Preguntale a Esther</span>
        </span>
      </button>
    </>
  );
}
