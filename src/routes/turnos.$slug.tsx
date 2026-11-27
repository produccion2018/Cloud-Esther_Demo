import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck2,
  CalendarPlus,
  Check,
  Clock,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { CloudEstherProvider, useCloudEstherOpcional } from "@/lib/cloud-esther/data";
import { setTurnosStore, storeAgenda } from "@/lib/cloud-esther/agenda-store";
import { useEquipo } from "@/lib/cloud-esther/equipo-store";
import { useSesion } from "@/lib/cloud-esther/auth-store";
import { useClinicSettings } from "@/lib/cloud-esther/settings-store";
import {
  configReserva,
  infoReservaServidor,
  libresLocales,
  libresServidor,
  useNivelReserva,
  reservarServidor,
  visibleEnReserva,
  type DatosReserva,
  type InfoReserva,
  type Libre,
  type ResultadoReserva,
} from "@/lib/cloud-esther/reservas-online";
import { telefonoInternacional } from "@/lib/clinica/whatsapp";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";
import { capitalizarNombre } from "@/lib/utils";

/* Ubicación: src/routes/turnos.$slug.tsx
   PÁGINA PÚBLICA DE TURNOS de cada clínica: /turnos/<clínica>. El paciente elige tratamiento,
   profesional, día y hora libre, y el turno cae en la Agenda. Sin iniciar sesión.
   /turnos/demo usa los datos del demo de este navegador. */

export const Route = createFileRoute("/turnos/$slug")({
  head: () => ({ meta: [{ title: "Sacá tu turno online" }] }),
  component: () => (
    <CloudEstherProvider>
      <PaginaTurnos />
    </CloudEstherProvider>
  ),
});

/** Voseo en Argentina, Uruguay y Paraguay; "tú" en el resto de los países */
const tx = (pais: string) => {
  const vos = ["AR", "UY", "PY"].includes((pais || "").toUpperCase());
  return (v: string, t: string) => (vos ? v : t);
};

const DIA_CORTO = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
const MES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fechaDe = (f: string) => new Date(`${f}T12:00:00`);
function fechaLarga(f: string) {
  const t = fechaDe(f).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
const iniciales = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

/* ── Datos: servidor (clínica real) o navegador (demo) ── */
type Fuente = {
  info: InfoReserva | null;
  error: string;
  cargando: boolean;
  libres: (profesionalId?: string) => Promise<Libre[]>;
  reservar: (d: DatosReserva) => Promise<ResultadoReserva>;
};

function useFuenteDemo(activo: boolean): Fuente {
  const agenda = storeAgenda.usar();
  const { miembros, ausencias } = useEquipo();
  const { clinica } = useSesion();
  const ctx = useCloudEstherOpcional();
  const ajustes = useClinicSettings(ctx?.clinic ?? "demo");
  const c = configReserva(agenda.ajustes?.reservaOnline);
  const { nivel } = useNivelReserva(ctx?.plan);
  const visibles = miembros.filter(visibleEnReserva);
  const info: InfoReserva | null = activo
    ? {
        clinica: ajustes.datosClinica.nombre || clinica?.nombre || "Clínica Dental Esther",
        pais: ajustes.datosClinica.pais || "AR",
        direccion: ajustes.datosClinica.direccion,
        telefono: ajustes.datosClinica.telefono,
        email: ajustes.datosClinica.email,
        logo: ajustes.marca?.logo ?? "",
        color: ajustes.marca?.color || "#7c3aed",
        plan: nivel,
        reservaOnline: nivel !== "start" && c.activa && visibles.length > 0,
        bienvenida: c.bienvenida,
        tratamientos: c.tratamientos,
        duracion: agenda.ajustes?.duracionMin ?? agenda.ajustes?.intervaloMin ?? 30,
        diasAdelante: c.diasAdelante,
        confirmaSolo: (nivel === "plus" || nivel === "grupo") && c.confirmarSolo,
        sedes: nivel === "grupo" && ajustes.sucursales.length > 1 ? ajustes.sucursales : [],
        profesionales: visibles.map((m) => ({
          id: m.id,
          nombre: `${m.firstName} ${m.lastName}`.trim(),
          especialidades: m.specialties ?? [],
          foto: c.mostrarEquipo ? (m.avatarUrl ?? "") : "",
          bio: c.mostrarEquipo ? (m.bioPublica ?? "") : "",
        })),
      }
    : null;
  return {
    info,
    error: "",
    cargando: false,
    libres: async (profesionalId) => libresLocales({ agenda: storeAgenda.leer(), miembros, ausencias, ...(profesionalId ? { profesionalId } : {}) }),
    reservar: async (d) => {
      const libres = libresLocales({ agenda: storeAgenda.leer(), miembros, ausencias, ...(d.profesionalId ? { profesionalId: d.profesionalId } : {}) });
      const l = libres.find((x) => x.fecha === d.fecha && x.hora === d.hora);
      if (!l) throw new Error("Ese horario se acaba de ocupar. Elegí otro, por favor.");
      const prof = info!.profesionales.find((p) => p.id === l.profesionalId)!;
      const estado = info!.confirmaSolo ? "Confirmada" : "Pendiente";
      const sede = d.sede || ajustes.sucursales[0] || info!.clinica;
      setTurnosStore((prev) => [
        ...prev,
        {
          id: Math.max(0, ...prev.map((t) => t.id)) + 1,
          fecha: l.fecha,
          hora: l.hora,
          paciente: capitalizarNombre(d.nombre.trim()),
          tratamiento: d.tratamiento,
          odontologo: prof.nombre,
          sucursal: sede,
          gabinete: "",
          estado,
          notas: `Reservó por la página de turnos · WhatsApp ${d.telefono}${d.email ? ` · ${d.email}` : ""}`,
          duracion: info!.duracion,
          reservaOnline: { telefono: d.telefono, ...(d.email ? { email: d.email } : {}), fecha: new Date().toISOString() },
        },
      ]);
      return { ok: true, estado, profesional: prof.nombre, sede };
    },
  };
}

function useFuenteServidor(slug: string, activo: boolean): Fuente {
  const [info, setInfo] = useState<InfoReserva | null>(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(activo);
  useEffect(() => {
    if (!activo) return;
    infoReservaServidor(slug)
      .then((i) => setInfo(i))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Esta página no está disponible."))
      .finally(() => setCargando(false));
  }, [slug, activo]);
  return {
    info,
    error,
    cargando,
    libres: (profesionalId) => libresServidor(slug, profesionalId),
    reservar: (d) => reservarServidor(slug, d),
  };
}

/* ── Piezas visuales ── */
function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_30px_70px_-45px_rgba(30,16,70,0.55)] backdrop-blur-xl sm:p-7 ${className}`}>
      {children}
    </div>
  );
}

function Avatar({ nombre, foto, grande = false }: { nombre: string; foto?: string; grande?: boolean }) {
  const t = grande ? "size-14" : "size-11";
  return foto ? (
    <img src={foto} alt="" className={`${t} shrink-0 rounded-2xl object-cover ring-2 ring-white shadow`} />
  ) : (
    <span className={`${t} grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--marca)] to-fuchsia-500 text-sm font-bold text-white shadow`}>
      {iniciales(nombre) || <UserRound className="size-5" />}
    </span>
  );
}

const PASOS = ["Motivo", "Profesional", "Cuándo", "Tus datos"];

function PaginaTurnos() {
  const { slug } = Route.useParams();
  const esDemo = slug === "demo";
  const demo = useFuenteDemo(esDemo);
  const servidor = useFuenteServidor(slug, !esDemo);
  const f = esDemo ? demo : servidor;
  const [montado, setMontado] = useState(false);
  // ?modo=web: la página va ADENTRO de la web que la clínica ya tiene (sin fondo propio)
  const [enWeb, setEnWeb] = useState(false);
  useEffect(() => {
    setMontado(true);
    setEnWeb(new URLSearchParams(window.location.search).get("modo") === "web");
  }, []);
  // Dentro de otra web: avisa su alto para que el recuadro se acomode solo
  useEffect(() => {
    if (!enWeb) return;
    document.documentElement.style.background = "transparent";
    document.body.style.background = "transparent";
    if (window.parent === window) return;
    const avisar = () => window.parent.postMessage({ cloudEstherAlto: Math.ceil(document.documentElement.scrollHeight) }, "*");
    const ro = new ResizeObserver(avisar);
    ro.observe(document.body);
    avisar();
    return () => ro.disconnect();
  }, [enWeb]);
  const info = f.info;

  useEffect(() => {
    if (info?.clinica) document.title = `Turnos online · ${info.clinica}`;
  }, [info?.clinica]);

  const estilo = { "--marca": info?.color ?? "#7c3aed" } as CSSProperties;

  return (
    <div style={estilo} className={`relative overflow-hidden text-[#1c1530] ${enWeb ? "bg-transparent" : "min-h-screen bg-[#f7f5ff]"}`}>
      <div className={`pointer-events-none absolute inset-0 ${enWeb ? "hidden" : ""}`}>
        <div className="absolute -left-32 -top-40 size-[520px] rounded-full bg-[var(--marca)] opacity-[0.16] blur-3xl" />
        <div className="absolute -right-40 top-40 size-[460px] rounded-full bg-fuchsia-400 opacity-[0.14] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 size-[380px] rounded-full bg-sky-300 opacity-[0.12] blur-3xl" />
      </div>
      <main className={`relative mx-auto w-full max-w-3xl ${enWeb ? "px-1 pb-4 pt-1" : "px-4 pb-16 pt-6 sm:pt-10"}`}>
        {!montado || f.cargando ? (
          <div className="space-y-4">
            <div className="h-40 animate-pulse rounded-[28px] bg-white/70" />
            <div className="h-80 animate-pulse rounded-[28px] bg-white/70" />
          </div>
        ) : !info ? (
          <Tarjeta className="mt-10 text-center">
            <p className="text-lg font-bold">Página no disponible</p>
            <p className="mt-2 text-sm text-[#6b6385]">{f.error || "Esta página de turnos no está disponible. Escribile directamente a la clínica."}</p>
          </Tarjeta>
        ) : (
          <>
            {!enWeb && <Encabezado info={info} />}
            {info.reservaOnline ? <Reserva info={info} fuente={f} /> : <SinReserva info={info} />}
            {!enWeb && info.profesionales.length > 0 && info.profesionales.some((p) => p.bio || p.foto) && <Equipo info={info} />}
            <p className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-[#8a83a3]">
              <ShieldCheck className="size-3.5" /> Tus datos solo los ve la clínica · Turnos con Cloud Esther
            </p>
          </>
        )}
      </main>
    </div>
  );
}

function botonWhatsApp(info: InfoReserva, texto: string) {
  const n = info.telefono ? telefonoInternacional(info.telefono, info.pais) : "";
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(texto)}` : "";
}

function Encabezado({ info }: { info: InfoReserva }) {
  return (
    <Tarjeta className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[var(--marca)] via-fuchsia-500 to-amber-300" />
      <div className="flex items-center gap-4">
        {info.logo ? (
          <img src={info.logo} alt="" className="size-16 shrink-0 rounded-2xl bg-white object-contain p-1.5 shadow ring-1 ring-black/5" />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--marca)] to-fuchsia-500 text-xl font-bold text-white shadow-lg">
            {iniciales(info.clinica)}
          </span>
        )}
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--marca)]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--marca)]">
            <CalendarCheck2 className="size-3" /> Turnos online
          </span>
          <h1 className="mt-1.5 text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-3xl">{info.clinica}</h1>
        </div>
      </div>
      {(info.direccion || info.telefono) && (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-[#6b6385]">
          {info.direccion && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.direccion)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-[var(--marca)]">
              <MapPin className="size-4 text-[var(--marca)]" /> {info.direccion}
            </a>
          )}
          {info.telefono && (
            <a href={`tel:${info.telefono.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-[var(--marca)]">
              <Phone className="size-4 text-[var(--marca)]" /> {info.telefono}
            </a>
          )}
        </div>
      )}
      {info.bienvenida && <p className="mt-4 rounded-2xl bg-[var(--marca)]/[0.06] px-4 py-3 text-sm leading-relaxed">{info.bienvenida}</p>}
    </Tarjeta>
  );
}

function SinReserva({ info }: { info: InfoReserva }) {
  const t = tx(info.pais);
  const wa = botonWhatsApp(info, `Hola ${info.clinica}, quisiera pedir un turno.`);
  return (
    <Tarjeta className="mt-4 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
        <IconoWhatsApp className="size-7" />
      </span>
      <h2 className="mt-3 text-xl font-bold">{t("Pedí", "Pide")} tu turno por WhatsApp</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-[#6b6385]">{t("Escribinos", "Escríbenos")} y te damos el primer horario que te quede cómodo.</p>
      <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="btn-wa !h-12 !px-6 !text-base">
            <IconoWhatsApp /> Escribir por WhatsApp
          </a>
        )}
        {info.telefono && (
          <a href={`tel:${info.telefono.replace(/[^\d+]/g, "")}`} className="inline-flex h-12 items-center gap-2 rounded-full border border-[#e6e1f5] bg-white px-6 text-sm font-semibold">
            <Phone className="size-4" /> Llamar
          </a>
        )}
      </div>
      {!wa && !info.telefono && <p className="mt-4 text-xs text-[#8a83a3]">La clínica todavía no cargó su teléfono.</p>}
    </Tarjeta>
  );
}

function Equipo({ info }: { info: InfoReserva }) {
  return (
    <section className="mt-6">
      <h2 className="px-1 text-sm font-bold uppercase tracking-[0.14em] text-[#8a83a3]">Nuestro equipo</h2>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {info.profesionales.map((p) => (
          <div key={p.id} className="flex gap-3 rounded-3xl border border-white/70 bg-white/80 p-4 shadow-[0_20px_45px_-38px_rgba(30,16,70,0.6)] backdrop-blur">
            <Avatar nombre={p.nombre} foto={p.foto} grande />
            <div className="min-w-0">
              <p className="font-semibold">{p.nombre}</p>
              {p.especialidades.length > 0 && <p className="text-xs text-[var(--marca)]">{p.especialidades.join(" · ")}</p>}
              {p.bio && <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-[#6b6385]">{p.bio}</p>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function descargarIcs(info: InfoReserva, fecha: string, hora: string, tratamiento: string, profesional: string) {
  const [y, m, d] = fecha.split("-");
  const [hh, mm] = hora.split(":");
  const ini = `${y}${m}${d}T${hh}${mm}00`;
  const finMin = Number(hh) * 60 + Number(mm) + (info.duracion || 30);
  const fin = `${y}${m}${d}T${String(Math.floor(finMin / 60)).padStart(2, "0")}${String(finMin % 60).padStart(2, "0")}00`;
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Cloud Esther//Turnos//ES",
    "BEGIN:VEVENT",
    `UID:${Date.now()}@cloudesther`,
    `DTSTART:${ini}`,
    `DTEND:${fin}`,
    `SUMMARY:${tratamiento} · ${info.clinica}`,
    `DESCRIPTION:Con ${profesional}`,
    info.direccion ? `LOCATION:${info.direccion.replace(/[,;]/g, " ")}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = "mi-turno.ics";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function Reserva({ info, fuente }: { info: InfoReserva; fuente: Fuente }) {
  const t = tx(info.pais);
  const [paso, setPaso] = useState(0);
  const [tratamiento, setTratamiento] = useState("");
  const [sede, setSede] = useState(info.sedes[0] ?? "");
  const [profesionalId, setProfesionalId] = useState<string | null>(null);
  const [libres, setLibres] = useState<Libre[] | null>(null);
  const [errorLibres, setErrorLibres] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [web, setWeb] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const [hecho, setHecho] = useState<(ResultadoReserva & { fecha: string; hora: string }) | null>(null);

  const cargarLibres = (pid: string | null) => {
    setLibres(null);
    setErrorLibres("");
    fuente
      .libres(pid ?? undefined)
      .then((l) => {
        setLibres(l);
        const primero = l[0]?.fecha ?? "";
        setFecha((f) => (f && l.some((x) => x.fecha === f) ? f : primero));
        setHora("");
      })
      .catch((e: unknown) => setErrorLibres(e instanceof Error ? e.message : "No pudimos traer los horarios."));
  };

  const dias = useMemo(() => {
    const porDia = new Map<string, number>();
    for (const l of libres ?? []) porDia.set(l.fecha, (porDia.get(l.fecha) ?? 0) + 1);
    return [...porDia.entries()].map(([f, n]) => ({ f, n }));
  }, [libres]);
  const horasDelDia = (libres ?? []).filter((l) => l.fecha === fecha);
  const franjas = [
    { t: "Mañana", h: horasDelDia.filter((l) => l.hora < "12:00") },
    { t: "Tarde", h: horasDelDia.filter((l) => l.hora >= "12:00" && l.hora < "19:00") },
    { t: "Noche", h: horasDelDia.filter((l) => l.hora >= "19:00") },
  ].filter((x) => x.h.length);
  const elegido = horasDelDia.find((l) => l.hora === hora);
  const prof = info.profesionales.find((p) => p.id === (elegido?.profesionalId ?? profesionalId));

  const ir = (n: number) => {
    setError("");
    setPaso(n);
    if (n === 2 && libres === null) cargarLibres(profesionalId);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const reservar = async () => {
    if (enviando || !elegido) return;
    if (nombre.trim().split(/\s+/).length < 2) return setError(t("Escribí tu nombre y apellido.", "Escribe tu nombre y apellido."));
    if (telefono.replace(/\D/g, "").length < 8) return setError(t("Escribí un WhatsApp válido, con característica.", "Escribe un WhatsApp válido, con el código de área."));
    if (email && !/^\S+@\S+\.\S+$/.test(email)) return setError(t("Revisá el correo o dejalo vacío.", "Revisa el correo o déjalo vacío."));
    setEnviando(true);
    setError("");
    try {
      const r = await fuente.reservar({
        nombre: nombre.trim(),
        telefono: telefono.trim(),
        ...(email.trim() ? { email: email.trim() } : {}),
        tratamiento,
        ...(profesionalId ? { profesionalId } : {}),
        ...(sede ? { sede } : {}),
        fecha: elegido.fecha,
        hora: elegido.hora,
        ...(web ? { web } : {}),
      });
      setHecho({ ...r, fecha: elegido.fecha, hora: elegido.hora });
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
      const m = e instanceof Error ? e.message : "No pudimos guardar tu turno. Probá de nuevo.";
      setError(m);
      if (/ocup/i.test(m)) {
        cargarLibres(profesionalId);
        setPaso(2);
      }
    } finally {
      setEnviando(false);
    }
  };

  if (hecho) {
    const confirmado = hecho.estado === "Confirmada";
    const wa = botonWhatsApp(info, `Hola, soy ${nombre.trim()}. Reservé un turno online para el ${fechaLarga(hecho.fecha)} a las ${hecho.hora} (${tratamiento}).`);
    return (
      <Tarjeta className="mt-4 text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30">
          <Check className="size-8" strokeWidth={3} />
        </span>
        <h2 className="mt-4 text-2xl font-bold tracking-tight">{confirmado ? "¡Tu turno está confirmado!" : "¡Listo! Pedimos tu turno"}</h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-[#6b6385]">
          {confirmado ? t("Te esperamos. Si no podés venir, avisanos con tiempo.", "Te esperamos. Si no puedes venir, avísanos con tiempo.") : "La clínica lo confirma y te escribe por WhatsApp."}
        </p>
        <div className="mx-auto mt-5 max-w-sm space-y-2 rounded-3xl bg-[var(--marca)]/[0.06] p-4 text-left text-sm">
          <p className="flex items-center gap-2 font-semibold"><CalendarCheck2 className="size-4 text-[var(--marca)]" /> {fechaLarga(hecho.fecha)} · {hecho.hora} h</p>
          <p className="flex items-center gap-2"><Stethoscope className="size-4 text-[var(--marca)]" /> {tratamiento}</p>
          <p className="flex items-center gap-2"><UserRound className="size-4 text-[var(--marca)]" /> {hecho.profesional}</p>
          {(info.sedes.length > 1 || info.direccion) && (
            <p className="flex items-center gap-2"><MapPin className="size-4 text-[var(--marca)]" /> {info.sedes.length > 1 ? hecho.sede : info.direccion}</p>
          )}
        </div>
        <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <button type="button" onClick={() => descargarIcs(info, hecho.fecha, hecho.hora, tratamiento, hecho.profesional)} className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--marca)] px-5 text-sm font-semibold text-white shadow-lg shadow-[var(--marca)]/30">
            <CalendarPlus className="size-4" /> Agregar a mi calendario
          </button>
          {hecho.enlace && (
            <a href={hecho.enlace} className="inline-flex h-11 items-center gap-2 rounded-full border border-[#e6e1f5] bg-white px-5 text-sm font-semibold">
              Cambiar o cancelar
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="btn-wa !h-11">
              <IconoWhatsApp /> Escribir a la clínica
            </a>
          )}
        </div>
        {hecho.enlace && <p className="mt-3 text-[11px] text-[#8a83a3]">{t("Guardá esta página: con «Cambiar o cancelar» manejás tu turno cuando quieras.", "Guarda esta página: con «Cambiar o cancelar» manejas tu turno cuando quieras.")}</p>}
      </Tarjeta>
    );
  }

  return (
    <Tarjeta className="mt-4">
      {/* Progreso */}
      <div className="flex items-center gap-1.5" aria-label={`Paso ${paso + 1} de ${PASOS.length}`}>
        {PASOS.map((p, i) => (
          <div key={p} className="min-w-0 flex-1">
            <div className={`h-1.5 rounded-full transition-all duration-500 ${i <= paso ? "bg-gradient-to-r from-[var(--marca)] to-fuchsia-500" : "bg-[#ece8f7]"}`} />
            <p className={`mt-1.5 truncate text-[10px] font-semibold uppercase tracking-[0.04em] ${i === paso ? "text-[var(--marca)]" : "text-[#a39dba]"}`}>{p}</p>
          </div>
        ))}
      </div>

      {paso === 0 && (
        <section className="mt-6">
          <h2 className="text-xl font-bold tracking-tight">{t("¿Qué necesitás?", "¿Qué necesitas?")}</h2>
          <p className="text-sm text-[#6b6385]">{t("Elegí", "Elige")} el motivo de tu turno.</p>
          {info.sedes.length > 1 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8a83a3]">Sede</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {info.sedes.map((s) => (
                  <button key={s} type="button" onClick={() => setSede(s)} aria-pressed={sede === s} className={`inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition ${sede === s ? "border-[var(--marca)] bg-[var(--marca)] text-white shadow-md" : "border-[#e6e1f5] bg-white hover:border-[var(--marca)]/50"}`}>
                    <MapPin className="size-3.5" /> {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {info.tratamientos.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setTratamiento(t);
                  ir(1);
                }}
                className={`group flex items-center gap-3 rounded-2xl border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg ${tratamiento === t ? "border-[var(--marca)] bg-[var(--marca)]/[0.06]" : "border-[#ece8f7] bg-white"}`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--marca)]/10 text-[var(--marca)]">
                  <Sparkles className="size-5" />
                </span>
                <span className="min-w-0 flex-1 font-semibold">{t}</span>
                <ArrowRight className="size-4 text-[#b5aecb] transition group-hover:translate-x-0.5 group-hover:text-[var(--marca)]" />
              </button>
            ))}
          </div>
        </section>
      )}

      {paso === 1 && (
        <section className="mt-6">
          <h2 className="text-xl font-bold tracking-tight">{t("¿Con quién te querés atender?", "¿Con quién te quieres atender?")}</h2>
          <p className="text-sm text-[#6b6385]">{tratamiento}</p>
          <div className="mt-4 space-y-2.5">
            <button
              type="button"
              onClick={() => {
                setProfesionalId(null);
                setLibres(null);
                setPaso(2);
                cargarLibres(null);
              }}
              className="flex w-full items-center gap-3 rounded-2xl border border-[var(--marca)]/30 bg-gradient-to-r from-[var(--marca)]/[0.08] to-fuchsia-500/[0.06] p-4 text-left transition hover:shadow-lg"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--marca)] to-fuchsia-500 text-white shadow">
                <Clock className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">El primer turno disponible</span>
                <span className="block text-xs text-[#6b6385]">Con cualquier profesional del equipo</span>
              </span>
              <ArrowRight className="size-4 text-[var(--marca)]" />
            </button>
            {info.profesionales.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setProfesionalId(p.id);
                  setLibres(null);
                  setPaso(2);
                  cargarLibres(p.id);
                }}
                className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-lg ${profesionalId === p.id ? "border-[var(--marca)] bg-[var(--marca)]/[0.06]" : "border-[#ece8f7] bg-white"}`}
              >
                <Avatar nombre={p.nombre} foto={p.foto} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{p.nombre}</span>
                  {p.especialidades.length > 0 && <span className="block truncate text-xs text-[var(--marca)]">{p.especialidades.join(" · ")}</span>}
                </span>
                <ArrowRight className="size-4 text-[#b5aecb]" />
              </button>
            ))}
          </div>
          <Atras onClick={() => ir(0)} />
        </section>
      )}

      {paso === 2 && (
        <section className="mt-6">
          <h2 className="text-xl font-bold tracking-tight">{t("Elegí", "Elige")} día y hora</h2>
          <p className="text-sm text-[#6b6385]">
            {tratamiento} · {profesionalId ? info.profesionales.find((p) => p.id === profesionalId)?.nombre : "Cualquier profesional"}
          </p>
          {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          {errorLibres ? (
            <p className="mt-4 rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{errorLibres}</p>
          ) : libres === null ? (
            <div className="mt-5 flex items-center justify-center gap-2 py-10 text-sm text-[#8a83a3]">
              <Loader2 className="size-4 animate-spin" /> Buscando horarios libres…
            </div>
          ) : dias.length === 0 ? (
            <div className="mt-5 rounded-2xl bg-[#f6f3ff] p-5 text-center">
              <p className="font-semibold">No hay horarios libres en los próximos {info.diasAdelante} días</p>
              <p className="mt-1 text-sm text-[#6b6385]">{t("Probá con otro profesional o escribinos y te buscamos un lugar.", "Prueba con otro profesional o escríbenos y te buscamos un lugar.")}</p>
              {botonWhatsApp(info, "Hola, quisiera un turno y no encontré horarios en la página.") && (
                <a href={botonWhatsApp(info, "Hola, quisiera un turno y no encontré horarios en la página.")} target="_blank" rel="noreferrer" className="btn-wa mt-4">
                  <IconoWhatsApp /> Escribir por WhatsApp
                </a>
              )}
            </div>
          ) : (
            <>
              <div className="-mx-5 mt-4 overflow-x-auto px-5 pb-2 sm:-mx-7 sm:px-7" role="listbox" aria-label="Días con horarios libres">
                <div className="flex gap-2">
                  {dias.map(({ f, n }) => {
                    const d = fechaDe(f);
                    const on = f === fecha;
                    return (
                      <button
                        key={f}
                        type="button"
                        role="option"
                        aria-selected={on}
                        onClick={() => {
                          setFecha(f);
                          setHora("");
                        }}
                        className={`flex w-[68px] shrink-0 flex-col items-center rounded-2xl border py-2.5 transition ${on ? "border-transparent bg-gradient-to-b from-[var(--marca)] to-fuchsia-500 text-white shadow-lg shadow-[var(--marca)]/30" : "border-[#ece8f7] bg-white hover:border-[var(--marca)]/40"}`}
                      >
                        <span className={`text-[11px] font-semibold uppercase ${on ? "text-white/80" : "text-[#8a83a3]"}`}>{DIA_CORTO[d.getDay()]}</span>
                        <span className="text-xl font-bold leading-tight">{d.getDate()}</span>
                        <span className={`text-[10px] ${on ? "text-white/80" : "text-[#8a83a3]"}`}>{MES_CORTO[d.getMonth()]}</span>
                        <span className={`mt-1 h-1 w-6 rounded-full ${on ? "bg-white/70" : n > 4 ? "bg-emerald-400" : "bg-amber-400"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold">{fecha && fechaLarga(fecha)}</p>
              <div className="mt-2 space-y-3">
                {franjas.map((fr) => (
                  <div key={fr.t}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8a83a3]">{fr.t}</p>
                    <div className="mt-1.5 grid grid-cols-4 gap-2 sm:grid-cols-6">
                      {fr.h.map((l) => (
                        <button
                          key={l.hora}
                          type="button"
                          onClick={() => setHora(l.hora)}
                          aria-pressed={hora === l.hora}
                          className={`h-11 rounded-xl border text-sm font-semibold transition ${hora === l.hora ? "border-[var(--marca)] bg-[var(--marca)] text-white shadow-md" : "border-[#ece8f7] bg-white hover:border-[var(--marca)]/50 hover:text-[var(--marca)]"}`}
                        >
                          {l.hora}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" disabled={!elegido} onClick={() => ir(3)} className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--marca)] to-fuchsia-500 text-sm font-semibold text-white shadow-lg shadow-[var(--marca)]/30 transition disabled:opacity-40">
                Continuar <ArrowRight className="size-4" />
              </button>
            </>
          )}
          <Atras onClick={() => ir(1)} />
        </section>
      )}

      {paso === 3 && elegido && (
        <section className="mt-6">
          <h2 className="text-xl font-bold tracking-tight">Tus datos</h2>
          <div className="mt-3 rounded-2xl bg-[var(--marca)]/[0.06] p-4 text-sm">
            <p className="font-semibold">{fechaLarga(elegido.fecha)} · {elegido.hora} h</p>
            <p className="text-[#6b6385]">{tratamiento}{prof ? ` · ${prof.nombre}` : ""}{sede && info.sedes.length > 1 ? ` · ${sede}` : ""}</p>
          </div>
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void reservar();
            }}
          >
            <Campo etiqueta="Nombre y apellido">
              <input value={nombre} onChange={(e) => setNombre(e.target.value)} autoComplete="name" maxLength={80} className={INPUT} />
            </Campo>
            <Campo etiqueta="WhatsApp">
              <input value={telefono} onChange={(e) => setTelefono(e.target.value)} autoComplete="tel" inputMode="tel" maxLength={30} placeholder={t("Con característica", "Con código de área")} className={INPUT} />
            </Campo>
            <Campo etiqueta="Correo (opcional)">
              <input value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" maxLength={120} className={INPUT} />
            </Campo>
            <input value={web} onChange={(e) => setWeb(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden="true" name="web" className="absolute left-[-9999px] h-0 w-0 opacity-0" />
            {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
            <button type="submit" disabled={enviando} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--marca)] to-fuchsia-500 text-sm font-semibold text-white shadow-lg shadow-[var(--marca)]/30 transition disabled:opacity-60">
              {enviando ? <Loader2 className="size-4 animate-spin" /> : <CalendarCheck2 className="size-4" />}
              {enviando ? "Reservando…" : info.confirmaSolo ? "Confirmar mi turno" : "Pedir mi turno"}
            </button>
            <p className="text-center text-[11px] text-[#8a83a3]">
              {info.confirmaSolo ? "Tu turno queda confirmado al instante." : "La clínica confirma tu turno y te avisa por WhatsApp."}
            </p>
          </form>
          <Atras onClick={() => ir(2)} />
        </section>
      )}
    </Tarjeta>
  );
}

const INPUT =
  "h-12 w-full rounded-2xl border border-[#e6e1f5] bg-white px-4 text-[15px] outline-none transition placeholder:text-[#b5aecb] focus:border-[var(--marca)] focus:ring-4 focus:ring-[var(--marca)]/15";

function Campo({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8a83a3]">{etiqueta}</span>
      {children}
    </label>
  );
}

function Atras({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#8a83a3] hover:text-[var(--marca)]">
      <ArrowLeft className="size-4" /> Volver
    </button>
  );
}
