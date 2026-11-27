import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  CalendarX2,
  Check,
  ClipboardList,
  Pill,
  Clock,
  Copy,
  Download,
  FileText,
  Wallet,
  Loader2,
  LogOut,
  MapPin,
  Phone,
  ScanLine,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { API_URL } from "@/lib/clinica/api";
import { telefonoInternacional } from "@/lib/clinica/whatsapp";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";

/* Ubicación: src/routes/mi-portal.$slug.tsx
   PORTAL DEL PACIENTE desde su celular: /mi-portal/<clínica>. Entra SIN contraseña: escribe su
   DNI, correo o teléfono y un código (le llega al correo o se lo pasa la clínica por WhatsApp).
   Ve sus próximos turnos y los confirma, pide cambiarlos o los cancela. */

export const Route = createFileRoute("/mi-portal/$slug")({
  head: () => ({ meta: [{ title: "Mi portal" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: MiPortal,
});

type TurnoP = { id: number; fecha: string; hora: string; tratamiento: string; profesional: string; sede: string; estado: string; respuesta: string };
type Yo = {
  paciente: { nombre: string; apellido: string };
  clinica: { nombre: string; direccion: string; telefono: string; logo: string; color: string; pais: string };
  horasMinimasCancelar: number;
  proximos: TurnoP[];
  anteriores: TurnoP[];
};

async function pedir<T>(ruta: string, metodo = "GET", cuerpo?: unknown, token?: string): Promise<T> {
  if (!API_URL) throw new Error("El portal todavía no está disponible.");
  const r = await fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers: { ...(cuerpo !== undefined ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
  });
  if (!r.ok) {
    const t = (await r.text().catch(() => "")).trim();
    const e = new Error(t && t.length < 200 ? t : "No pudimos conectarnos. Probá de nuevo.") as Error & { status?: number };
    e.status = r.status;
    throw e;
  }
  return (await r.json()) as T;
}

const guardar = (k: string, v: string | null) => {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* navegador sin almacenamiento: la sesión dura mientras esté abierta la página */
  }
};
const leer = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};

const tx = (pais: string) => {
  const vos = ["AR", "UY", "PY", ""].includes((pais || "").toUpperCase());
  return (v: string, t: string) => (vos ? v : t);
};
function fechaLarga(f: string) {
  const t = new Date(`${f}T12:00:00`).toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}
const iniciales = (n: string) =>
  n
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");

function Tarjeta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[28px] border border-white/70 bg-white/85 p-5 shadow-[0_30px_70px_-45px_rgba(30,16,70,0.55)] backdrop-blur-xl sm:p-7 ${className}`}>
      {children}
    </div>
  );
}
const INPUT =
  "h-12 w-full rounded-2xl border border-[#e6e1f5] bg-white px-4 text-[15px] outline-none transition placeholder:text-[#b5aecb] focus:border-[var(--marca)] focus:ring-4 focus:ring-[var(--marca)]/15";
const BOTON =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--marca)] to-fuchsia-500 text-sm font-semibold text-white shadow-lg shadow-[var(--marca)]/30 transition disabled:opacity-50";

function MiPortal() {
  const { slug } = Route.useParams();
  const claveSesion = `cloud-esther:mi-portal:${slug}`;
  const [montado, setMontado] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [yo, setYo] = useState<Yo | null>(null);
  const [color, setColor] = useState("#7c3aed");

  const [marca, setMarca] = useState<{ clinica: string; logo: string } | null>(null);
  useEffect(() => {
    setToken(leer(claveSesion));
    setMontado(true);
    // Nombre, logo y color de la clínica para la pantalla de ingreso
    pedir<{ clinica: string; logo: string; color: string }>(`/public/reservas/${slug}`)
      .then((i) => {
        setMarca({ clinica: i.clinica, logo: i.logo });
        setColor(i.color);
      })
      .catch(() => undefined);
  }, [claveSesion, slug]);

  useEffect(() => {
    if (!token) return setYo(null);
    pedir<Yo>(`/public/portal/${slug}/yo`, "GET", undefined, token)
      .then((d) => {
        setYo(d);
        setColor(d.clinica.color);
        document.title = `Mi portal · ${d.clinica.nombre}`;
      })
      .catch(() => {
        guardar(claveSesion, null);
        setToken(null);
      });
  }, [token, slug, claveSesion]);

  const salir = () => {
    guardar(claveSesion, null);
    setToken(null);
    setYo(null);
  };

  return (
    <div style={{ "--marca": color } as CSSProperties} className="relative min-h-screen overflow-hidden bg-[#f7f5ff] text-[#1c1530]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-40 size-[520px] rounded-full bg-[var(--marca)] opacity-[0.16] blur-3xl" />
        <div className="absolute -right-40 top-40 size-[460px] rounded-full bg-fuchsia-400 opacity-[0.14] blur-3xl" />
      </div>
      <main className="relative mx-auto w-full max-w-xl px-4 pb-16 pt-6 sm:pt-10">
        {!montado || (token && !yo) ? (
          <div className="space-y-4">
            <div className="h-28 animate-pulse rounded-[28px] bg-white/70" />
            <div className="h-72 animate-pulse rounded-[28px] bg-white/70" />
          </div>
        ) : yo && token ? (
          <Panel slug={slug} yo={yo} token={token} onSalir={salir} onActualizar={(d) => setYo(d)} />
        ) : (
          <Ingreso
            slug={slug}
            marca={marca}
            onEntrar={(t) => {
              guardar(claveSesion, t);
              setToken(t);
            }}
          />
        )}
        <p className="mt-8 flex items-center justify-center gap-1.5 text-[11px] text-[#8a83a3]">
          <ShieldCheck className="size-3.5" /> Tus datos solo los ve tu clínica · Cloud Esther
        </p>
      </main>
    </div>
  );
}

function Ingreso({ slug, marca, onEntrar }: { slug: string; marca: { clinica: string; logo: string } | null; onEntrar: (token: string) => void }) {
  const [dato, setDato] = useState("");
  const [codigo, setCodigo] = useState("");
  const [paso, setPaso] = useState<"dato" | "codigo">("dato");
  const [destino, setDestino] = useState<{ a?: string; telefono?: string } | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const pedirCodigo = async () => {
    if (dato.trim().length < 3) return setError("Escribí tu DNI, tu correo o tu teléfono.");
    setCargando(true);
    setError("");
    try {
      const r = await pedir<{ enviado: boolean; a?: string; telefonoClinica?: string }>(`/public/portal/${slug}/codigo`, "POST", { dato: dato.trim() });
      setDestino(r.enviado ? { a: r.a ?? "" } : { telefono: r.telefonoClinica ?? "" });
      setPaso("codigo");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos enviar el código.");
    } finally {
      setCargando(false);
    }
  };

  const entrar = async () => {
    if (codigo.replace(/\s/g, "").length < 4) return setError("Escribí el código.");
    setCargando(true);
    setError("");
    try {
      const r = await pedir<{ token: string }>(`/public/portal/${slug}/ingresar`, "POST", { dato: dato.trim(), codigo: codigo.trim() });
      onEntrar(r.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos entrar.");
    } finally {
      setCargando(false);
    }
  };

  const waClinica = destino?.telefono
    ? `https://wa.me/${telefonoInternacional(destino.telefono)}?text=${encodeURIComponent(`Hola, quiero mi código para entrar al portal de pacientes. Mi dato: ${dato.trim()}`)}`
    : "";

  return (
    <Tarjeta className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[var(--marca)] via-fuchsia-500 to-amber-300" />
      {marca?.logo ? (
        <img src={marca.logo} alt="" className="size-14 rounded-2xl bg-white object-contain p-1.5 shadow ring-1 ring-black/5" />
      ) : (
        <span className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-[var(--marca)] to-fuchsia-500 text-white shadow-lg">
          {marca?.clinica ? <span className="text-lg font-bold">{iniciales(marca.clinica)}</span> : <UserRound className="size-7" />}
        </span>
      )}
      {marca?.clinica && <p className="mt-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--marca)]">{marca.clinica}</p>}
      <h1 className={`${marca?.clinica ? "mt-1" : "mt-4"} text-2xl font-bold tracking-tight`}>Tu portal de paciente</h1>
      <p className="mt-1 text-sm text-[#6b6385]">Tus turnos en un solo lugar. Sin contraseñas: entrás con un código.</p>

      {paso === "dato" ? (
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void pedirCodigo();
          }}
        >
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8a83a3]">DNI, correo o teléfono</span>
            <input value={dato} onChange={(e) => setDato(e.target.value)} autoFocus autoComplete="username" maxLength={120} className={INPUT} />
          </label>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <button type="submit" disabled={cargando} className={BOTON}>
            {cargando ? <Loader2 className="size-4 animate-spin" /> : null} Recibir mi código
          </button>
          <button type="button" onClick={() => (dato.trim().length >= 3 ? (setPaso("codigo"), setDestino(null), setError("")) : setError("Primero escribí tu DNI, correo o teléfono."))} className="w-full text-center text-sm font-semibold text-[var(--marca)]">
            Ya tengo un código
          </button>
        </form>
      ) : (
        <form
          className="mt-6 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            void entrar();
          }}
        >
          {destino?.a ? (
            <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Te mandamos un código a <b>{destino.a}</b>. Vence en 10 minutos (mirá también en spam).
            </p>
          ) : destino ? (
            <div className="rounded-2xl bg-[var(--marca)]/[0.06] px-4 py-3 text-sm">
              <p>Pedile tu código a la clínica: te lo pasan por WhatsApp al instante.</p>
              {waClinica && (
                <a href={waClinica} target="_blank" rel="noreferrer" className="btn-wa mt-3">
                  <IconoWhatsApp /> Pedir mi código
                </a>
              )}
            </div>
          ) : null}
          <label className="block">
            <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8a83a3]">Código</span>
            <input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/[^\d]/g, "").slice(0, 12))}
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              placeholder="••••••"
              className={`${INPUT} text-center font-mono text-2xl tracking-[0.5em]`}
            />
          </label>
          {error && <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>}
          <button type="submit" disabled={cargando} className={BOTON}>
            {cargando ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Entrar
          </button>
          <button
            type="button"
            onClick={() => {
              setPaso("dato");
              setCodigo("");
              setError("");
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8a83a3]"
          >
            <ArrowLeft className="size-4" /> Volver
          </button>
        </form>
      )}
    </Tarjeta>
  );
}

const ESTADO: Record<string, { t: string; cls: string }> = {
  Confirmada: { t: "Confirmado", cls: "bg-emerald-100 text-emerald-700" },
  Pendiente: { t: "Por confirmar", cls: "bg-amber-100 text-amber-800" },
  Atendida: { t: "Atendido", cls: "bg-slate-100 text-slate-600" },
};

function Panel({ slug, yo, token, onSalir, onActualizar }: { slug: string; yo: Yo; token: string; onSalir: () => void; onActualizar: (y: Yo) => void }) {
  const t = tx(yo.clinica.pais);
  const [accion, setAccion] = useState<{ id: number; tipo: "cambiar" | "cancelo" } | null>(null);
  const [nota, setNota] = useState("");
  const [enviando, setEnviando] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  const tel = yo.clinica.telefono ? telefonoInternacional(yo.clinica.telefono, yo.clinica.pais) : "";
  const wa = tel ? `https://wa.me/${tel}?text=${encodeURIComponent(`Hola, soy ${yo.paciente.nombre} ${yo.paciente.apellido}.`)}` : "";

  const responder = async (id: number, respuesta: "confirmo" | "cambiar" | "cancelo") => {
    setEnviando(id);
    setError("");
    try {
      await pedir(`/public/portal/${slug}/turnos/${id}`, "POST", { respuesta, ...(nota.trim() ? { nota: nota.trim() } : {}) }, token);
      const d = await pedir<Yo>(`/public/portal/${slug}/yo`, "GET", undefined, token);
      onActualizar(d);
      setAccion(null);
      setNota("");
      setMensaje(
        respuesta === "confirmo"
          ? "¡Listo! Tu turno quedó confirmado."
          : respuesta === "cancelo"
            ? "Tu turno quedó cancelado. Si querés, sacá otro cuando te quede cómodo."
            : t("Le avisamos a la clínica: te escriben para darte otro horario.", "Le avisamos a la clínica: te escribirán para darte otro horario."),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar. Probá de nuevo.");
    } finally {
      setEnviando(null);
    }
  };

  const [primero, ...resto] = yo.proximos;
  const [vista, setVista] = useState<"turnos" | "papeles" | "pagos">("turnos");

  return (
    <>
      <Tarjeta className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[var(--marca)] via-fuchsia-500 to-amber-300" />
        <div className="flex items-center gap-3">
          {yo.clinica.logo ? (
            <img src={yo.clinica.logo} alt="" className="size-12 shrink-0 rounded-2xl bg-white object-contain p-1 shadow ring-1 ring-black/5" />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--marca)] to-fuchsia-500 font-bold text-white shadow">{iniciales(yo.clinica.nombre)}</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-[var(--marca)]">{yo.clinica.nombre}</p>
            <h1 className="truncate text-2xl font-bold tracking-tight">Hola, {yo.paciente.nombre}</h1>
          </div>
          <button type="button" onClick={onSalir} aria-label="Salir" className="grid size-10 shrink-0 place-items-center rounded-full border border-[#ece8f7] bg-white text-[#8a83a3] hover:text-[var(--marca)]">
            <LogOut className="size-4" />
          </button>
        </div>
      </Tarjeta>

      {mensaje && (
        <p role="status" className="mt-4 flex items-start gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
          <Check className="mt-0.5 size-4 shrink-0" /> {mensaje}
        </p>
      )}
      {error && <p role="alert" className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <div className="mt-5 grid grid-cols-3 gap-1 rounded-full border border-white/70 bg-white/80 p-1 shadow-sm" role="tablist">
        {(
          [
            ["turnos", "Turnos", CalendarCheck2],
            ["papeles", "Papeles", FileText],
            ["pagos", "Pagos", Wallet],
          ] as const
        ).map(([k, l, I]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={vista === k}
            onClick={() => setVista(k)}
            className={`inline-flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full text-sm font-semibold transition ${vista === k ? "bg-gradient-to-r from-[var(--marca)] to-fuchsia-500 text-white shadow-md" : "text-[#6b6385]"}`}
          >
            <I className="size-4" /> {l}
          </button>
        ))}
      </div>

      {vista === "papeles" ? (
        <Papeles slug={slug} token={token} yo={yo} />
      ) : vista === "pagos" ? (
        <Pagos slug={slug} token={token} yo={yo} />
      ) : (
      <>
      <h2 className="mt-6 px-1 text-sm font-bold uppercase tracking-[0.14em] text-[#8a83a3]">{primero ? "Tu próximo turno" : "Tus turnos"}</h2>
      {!primero ? (
        <Tarjeta className="mt-3 text-center">
          <CalendarClock className="mx-auto size-10 text-[var(--marca)]" />
          <p className="mt-2 font-semibold">No tenés turnos por delante</p>
          <a href={`/turnos/${slug}`} className={`${BOTON} mt-4`}>
            <CalendarPlus className="size-4" /> {t("Sacá un turno", "Saca un turno")}
          </a>
        </Tarjeta>
      ) : (
        <div className="mt-3 space-y-3">
          {[primero, ...resto].map((tu, i) => {
            const e = ESTADO[tu.estado] ?? { t: tu.estado, cls: "bg-slate-100 text-slate-600" };
            const abierto = accion?.id === tu.id;
            const pidioCambio = tu.respuesta === "cambiar";
            return (
              <Tarjeta key={tu.id} className={i === 0 ? "ring-2 ring-[var(--marca)]/20" : ""}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-lg font-bold leading-snug">{fechaLarga(tu.fecha)}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-sm text-[#6b6385]">
                      <Clock className="size-4 text-[var(--marca)]" /> {tu.hora} h
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${pidioCambio ? "bg-sky-100 text-sky-700" : e.cls}`}>
                    {pidioCambio ? "Pediste cambiarlo" : e.t}
                  </span>
                </div>
                <div className="mt-3 space-y-1.5 text-sm">
                  <p className="flex items-center gap-2"><Stethoscope className="size-4 text-[var(--marca)]" /> {tu.tratamiento}</p>
                  {tu.profesional && <p className="flex items-center gap-2"><UserRound className="size-4 text-[var(--marca)]" /> {tu.profesional}</p>}
                  {(tu.sede || yo.clinica.direccion) && (
                    <p className="flex items-center gap-2"><MapPin className="size-4 text-[var(--marca)]" /> {yo.clinica.direccion || tu.sede}</p>
                  )}
                </div>
                {abierto ? (
                  <div className="mt-4 space-y-2 rounded-2xl bg-[#f7f5ff] p-3">
                    <p className="text-sm font-semibold">{accion!.tipo === "cancelo" ? "¿Cancelar este turno?" : "¿Qué día u horario te queda mejor?"}</p>
                    <textarea
                      value={nota}
                      onChange={(ev) => setNota(ev.target.value)}
                      rows={2}
                      maxLength={300}
                      placeholder={accion!.tipo === "cancelo" ? "Motivo (opcional)" : "Ej.: martes a la tarde"}
                      className="w-full resize-none rounded-xl border border-[#e6e1f5] bg-white p-3 text-sm outline-none focus:border-[var(--marca)]"
                    />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setAccion(null)} className="h-11 flex-1 rounded-full border border-[#e6e1f5] bg-white text-sm font-semibold">
                        Volver
                      </button>
                      <button
                        type="button"
                        disabled={enviando === tu.id}
                        onClick={() => void responder(tu.id, accion!.tipo)}
                        className={`h-11 flex-1 rounded-full text-sm font-semibold text-white ${accion!.tipo === "cancelo" ? "bg-rose-500" : "bg-[var(--marca)]"}`}
                      >
                        {enviando === tu.id ? "Enviando…" : accion!.tipo === "cancelo" ? "Sí, cancelar" : "Pedir el cambio"}
                      </button>
                    </div>
                    {accion!.tipo === "cancelo" && yo.horasMinimasCancelar > 0 && (
                      <p className="text-[11px] text-[#8a83a3]">Se puede cancelar hasta {yo.horasMinimasCancelar} h antes.</p>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {tu.estado === "Pendiente" && (
                      <button type="button" disabled={enviando === tu.id} onClick={() => void responder(tu.id, "confirmo")} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-emerald-500 text-sm font-semibold text-white shadow-md shadow-emerald-500/30">
                        <CalendarCheck2 className="size-4" /> {enviando === tu.id ? "…" : "Confirmar"}
                      </button>
                    )}
                    {!pidioCambio && (
                      <button type="button" onClick={() => setAccion({ id: tu.id, tipo: "cambiar" })} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[#e6e1f5] bg-white text-sm font-semibold">
                        <CalendarClock className="size-4" /> Cambiar
                      </button>
                    )}
                    <button type="button" onClick={() => setAccion({ id: tu.id, tipo: "cancelo" })} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-white text-sm font-semibold text-rose-600">
                      <CalendarX2 className="size-4" /> Cancelar
                    </button>
                  </div>
                )}
              </Tarjeta>
            );
          })}
          <a href={`/turnos/${slug}`} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[var(--marca)]/30 bg-white text-sm font-semibold text-[var(--marca)]">
            <CalendarPlus className="size-4" /> {t("Sacar otro turno", "Sacar otro turno")}
          </a>
        </div>
      )}

      {yo.anteriores.length > 0 && (
        <>
          <h2 className="mt-6 px-1 text-sm font-bold uppercase tracking-[0.14em] text-[#8a83a3]">Tus últimas visitas</h2>
          <div className="mt-3 divide-y divide-[#ece8f7] overflow-hidden rounded-3xl border border-white/70 bg-white/80">
            {yo.anteriores.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{a.tratamiento}</span>
                  <span className="block truncate text-xs text-[#8a83a3]">{a.profesional}</span>
                </span>
                <span className="shrink-0 text-xs text-[#6b6385]">{a.fecha.split("-").reverse().join("/")}</span>
              </div>
            ))}
          </div>
        </>
      )}

      </>
      )}

      {(wa || yo.clinica.telefono) && (
        <Tarjeta className="mt-6">
          <p className="font-semibold">¿Necesitás algo?</p>
          <p className="text-sm text-[#6b6385]">{t("Escribinos y te respondemos.", "Escríbenos y te respondemos.")}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="btn-wa !h-11 justify-center">
                <IconoWhatsApp /> WhatsApp
              </a>
            )}
            {yo.clinica.telefono && (
              <a href={`tel:${yo.clinica.telefono.replace(/[^\d+]/g, "")}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#e6e1f5] bg-white px-5 text-sm font-semibold">
                <Phone className="size-4" /> Llamar
              </a>
            )}
          </div>
        </Tarjeta>
      )}
    </>
  );
}

/* ───────────── Mis papeles: recetas, estudios, presupuestos e indicaciones ───────────── */

type Papeles = {
  moneda: string;
  condiciones: string;
  recetas: { id: number; numero: string; fecha: string; profesional: string; matricula: string; medicamentos: { nombre: string; presentacion: string; posologia: string; cantidad: number }[]; indicaciones: string; vencimiento: string; verificacion: string; firmaUrl: string; selloUrl: string }[];
  estudios: { id: number; tipo: string; fecha: string; zona: string; informe: string; url: string; archivo: string }[];
  presupuestos: { id: number; numero: string; fecha: string; estado: string; validez: string; profesional: string; notas: string; lineas: { descripcion: string; pieza: string; cantidad: number; precio: number }[]; subtotal: number; descuento: number; final: number; cuotas: number; cuota: number; plan: string }[];
  indicaciones: { id: number; tratamiento: string; fecha: string; texto: string }[];
};

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fechaCorta = (f: string) => (f ? f.split("-").reverse().join("/") : "");

/** Abre el papel listo para guardar como PDF o imprimir (con los datos de la clínica). */
function abrirPapel(titulo: string, cuerpo: string, yo: Yo) {
  const w = window.open("", "_blank");
  if (!w) return false;
  const c = yo.clinica;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title>
<style>body{font:14px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;color:#1c1530;margin:0;padding:28px;max-width:760px}
.cab{display:flex;align-items:center;gap:14px;border-bottom:3px solid ${c.color};padding-bottom:14px;margin-bottom:18px}
.cab img{width:54px;height:54px;object-fit:contain}.cab b{font-size:18px;display:block}.cab span{color:#6b6385;font-size:12px}
h1{font-size:20px;margin:0 0 4px}.meta{color:#6b6385;font-size:13px;margin:0 0 14px}
table{width:100%;border-collapse:collapse;margin:10px 0}th,td{text-align:left;padding:8px;border-bottom:1px solid #ece8f7;font-size:13px}
th{background:#f7f5ff}.n{text-align:right}.tot td{font-weight:700;border-top:2px solid #1c1530}
.firma{margin-top:30px;display:flex;gap:16px;align-items:end}.firma img{max-height:70px}
.pie{margin-top:26px;color:#8a83a3;font-size:11px}.btn{margin-top:18px;padding:10px 18px;border:0;border-radius:999px;background:${c.color};color:#fff;font-weight:600}
@media print{.btn{display:none}body{padding:0}}</style></head><body>
<div class="cab">${c.logo ? `<img src="${esc(c.logo)}" alt="">` : ""}<div><b>${esc(c.nombre)}</b><span>${esc([c.direccion, c.telefono].filter(Boolean).join(" · "))}</span></div></div>
<h1>${esc(titulo)}</h1><p class="meta">Paciente: <b>${esc(`${yo.paciente.nombre} ${yo.paciente.apellido}`)}</b></p>
${cuerpo}<p class="pie">Documento descargado desde el portal del paciente.</p><button class="btn" onclick="print()">Guardar PDF / Imprimir</button></body></html>`);
  w.document.close();
  return true;
}

function Papeles({ slug, token, yo }: { slug: string; token: string; yo: Yo }) {
  const t = tx(yo.clinica.pais);
  const [p, setP] = useState<Papeles | null>(null);
  const [error, setError] = useState("");
  const [responder, setResponder] = useState<{ id: number; tipo: "aprobar" | "rechazar" } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState("");
  const cargar = () =>
    pedir<Papeles>(`/public/portal/${slug}/papeles`, "GET", undefined, token)
      .then(setP)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No pudimos traer tus papeles."));
  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, token]);
  const plata = (n: number) => {
    try {
      return new Intl.NumberFormat(`es-${(yo.clinica.pais || "AR").toUpperCase()}`, { style: "currency", currency: p?.moneda || "USD", maximumFractionDigits: 0 }).format(n);
    } catch {
      return `$ ${Math.round(n).toLocaleString("es")}`;
    }
  };
  const avisarBloqueo = () => setAviso(t("Tu navegador bloqueó la ventana. Permití las ventanas emergentes para descargar.", "Tu navegador bloqueó la ventana. Permite las ventanas emergentes para descargar."));

  const enviarRespuesta = async () => {
    if (!responder) return;
    setEnviando(true);
    try {
      await pedir(`/public/portal/${slug}/presupuestos/${responder.id}`, "POST", { respuesta: responder.tipo, ...(motivo.trim() ? { motivo: motivo.trim() } : {}) }, token);
      setAviso(responder.tipo === "aprobar" ? "¡Gracias! Aprobaste el presupuesto. La clínica te contactará para empezar." : "Listo, le avisamos a la clínica.");
      setResponder(null);
      setMotivo("");
      await cargar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo guardar. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  if (error) return <p role="alert" className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  if (!p)
    return (
      <div className="mt-5 flex items-center justify-center gap-2 py-10 text-sm text-[#8a83a3]">
        <Loader2 className="size-4 animate-spin" /> Buscando tus papeles…
      </div>
    );
  const vacio = !p.recetas.length && !p.estudios.length && !p.presupuestos.length && !p.indicaciones.length;

  const Titulo = ({ icono: I, texto }: { icono: typeof FileText; texto: string }) => (
    <h2 className="mt-6 flex items-center gap-2 px-1 text-sm font-bold uppercase tracking-[0.14em] text-[#8a83a3]">
      <I className="size-4 text-[var(--marca)]" /> {texto}
    </h2>
  );

  return (
    <>
      {aviso && (
        <p role="status" className="mt-4 rounded-2xl bg-[var(--marca)]/[0.07] px-4 py-3 text-sm">
          {aviso}
        </p>
      )}
      {vacio && (
        <Tarjeta className="mt-4 text-center">
          <FileText className="mx-auto size-10 text-[var(--marca)]" />
          <p className="mt-2 font-semibold">Todavía no tenés papeles</p>
          <p className="text-sm text-[#6b6385]">Cuando la clínica te mande una receta, un estudio o un presupuesto, lo vas a ver acá.</p>
        </Tarjeta>
      )}

      {p.presupuestos.length > 0 && <Titulo icono={ClipboardList} texto="Presupuestos" />}
      <div className="mt-3 space-y-3">
        {p.presupuestos.map((x) => {
          const vencido = x.estado === "Enviado" && !!x.validez && x.validez < new Date().toISOString().slice(0, 10);
          const abierto = responder?.id === x.id;
          return (
            <Tarjeta key={x.id} className={x.estado === "Enviado" && !vencido ? "ring-2 ring-[var(--marca)]/20" : ""}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold">Presupuesto {x.numero}</p>
                  <p className="text-xs text-[#8a83a3]">{fechaCorta(x.fecha)}{x.profesional ? ` · ${x.profesional}` : ""}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${x.estado === "Aprobado" ? "bg-emerald-100 text-emerald-700" : x.estado === "Rechazado" ? "bg-slate-100 text-slate-600" : vencido ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}>
                  {vencido ? "Vencido" : x.estado === "Enviado" ? "Para responder" : x.estado}
                </span>
              </div>
              <ul className="mt-3 divide-y divide-[#ece8f7] rounded-2xl bg-[#f7f5ff] px-3">
                {x.lineas.map((l, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2 text-sm">
                    <span className="min-w-0">{l.descripcion}{l.pieza ? <span className="text-[#8a83a3]"> · pieza {l.pieza}</span> : null}{l.cantidad > 1 ? <span className="text-[#8a83a3]"> × {l.cantidad}</span> : null}</span>
                    <span className="shrink-0 font-semibold">{plata(l.precio * l.cantidad)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 space-y-0.5 text-sm">
                {x.descuento > 0 && <p className="flex justify-between text-emerald-700"><span>Descuento</span><span>− {plata(x.descuento)}</span></p>}
                <p className="flex justify-between text-base font-bold"><span>Total</span><span>{plata(x.final)}</span></p>
                {x.cuotas > 1 && <p className="text-right text-xs text-[#6b6385]">{x.plan}: {x.cuotas} cuotas de {plata(x.cuota)}</p>}
                {x.validez && x.estado === "Enviado" && <p className="text-xs text-[#8a83a3]">Válido hasta el {fechaCorta(x.validez)}</p>}
              </div>
              {abierto ? (
                <div className="mt-4 space-y-2 rounded-2xl bg-[#f7f5ff] p-3">
                  <p className="text-sm font-semibold">{responder!.tipo === "aprobar" ? `¿${t("Aprobás", "Apruebas")} el presupuesto por ${plata(x.final)}?` : "¿No lo querés hacer por ahora?"}</p>
                  {responder!.tipo === "rechazar" && (
                    <textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} rows={2} maxLength={300} placeholder={t("Contanos por qué (opcional)", "Cuéntanos por qué (opcional)")} className="w-full resize-none rounded-xl border border-[#e6e1f5] bg-white p-3 text-sm outline-none focus:border-[var(--marca)]" />
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setResponder(null)} className="h-11 flex-1 rounded-full border border-[#e6e1f5] bg-white text-sm font-semibold">Volver</button>
                    <button type="button" disabled={enviando} onClick={() => void enviarRespuesta()} className={`h-11 flex-1 rounded-full text-sm font-semibold text-white ${responder!.tipo === "aprobar" ? "bg-emerald-500" : "bg-slate-500"}`}>
                      {enviando ? "Enviando…" : responder!.tipo === "aprobar" ? "Sí, lo apruebo" : "Avisar a la clínica"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {x.estado === "Enviado" && !vencido && (
                    <>
                      <button type="button" onClick={() => setResponder({ id: x.id, tipo: "aprobar" })} className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-emerald-500 text-sm font-semibold text-white shadow-md shadow-emerald-500/30">
                        <Check className="size-4" /> Aprobar
                      </button>
                      <button type="button" onClick={() => setResponder({ id: x.id, tipo: "rechazar" })} className="inline-flex h-11 items-center justify-center rounded-full border border-[#e6e1f5] bg-white text-sm font-semibold">
                        Ahora no
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const filas = x.lineas.map((l) => `<tr><td>${esc(l.descripcion)}</td><td>${esc(l.pieza)}</td><td class="n">${l.cantidad}</td><td class="n">${esc(plata(l.precio * l.cantidad))}</td></tr>`).join("");
                      const ok = abrirPapel(
                        `Presupuesto ${x.numero}`,
                        `<p class="meta">${fechaCorta(x.fecha)}${x.validez ? ` · Válido hasta el ${fechaCorta(x.validez)}` : ""}</p><table><tr><th>Prestación</th><th>Pieza</th><th class="n">Cant.</th><th class="n">Importe</th></tr>${filas}${x.descuento > 0 ? `<tr><td colspan="3">Descuento</td><td class="n">− ${esc(plata(x.descuento))}</td></tr>` : ""}<tr class="tot"><td colspan="3">Total</td><td class="n">${esc(plata(x.final))}</td></tr></table>${x.cuotas > 1 ? `<p>${esc(x.plan)}: ${x.cuotas} cuotas de ${esc(plata(x.cuota))}</p>` : ""}${x.notas ? `<p>${esc(x.notas)}</p>` : ""}${p.condiciones ? `<p class="meta">${esc(p.condiciones)}</p>` : ""}`,
                        yo,
                      );
                      if (!ok) avisarBloqueo();
                    }}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border border-[var(--marca)]/30 bg-white text-sm font-semibold text-[var(--marca)]"
                  >
                    <Download className="size-4" /> Descargar
                  </button>
                </div>
              )}
            </Tarjeta>
          );
        })}
      </div>

      {p.recetas.length > 0 && <Titulo icono={Pill} texto="Recetas" />}
      <div className="mt-3 space-y-3">
        {p.recetas.map((r) => (
          <Tarjeta key={r.id}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-bold">Receta {r.numero}</p>
                <p className="text-xs text-[#8a83a3]">{fechaCorta(r.fecha)} · {r.profesional}</p>
              </div>
              {r.vencimiento && <span className="shrink-0 text-[11px] text-[#8a83a3]">Vale hasta {fechaCorta(r.vencimiento)}</span>}
            </div>
            <ul className="mt-3 space-y-1.5">
              {r.medicamentos.map((m, i) => (
                <li key={i} className="rounded-xl bg-[#f7f5ff] px-3 py-2 text-sm">
                  <b>{m.nombre}</b> {m.presentacion} <span className="text-[#6b6385]">· {m.posologia}</span>
                </li>
              ))}
            </ul>
            {r.indicaciones && <p className="mt-2 text-sm text-[#6b6385]">{r.indicaciones}</p>}
            <button
              type="button"
              onClick={() => {
                const filas = r.medicamentos.map((m) => `<tr><td>${esc(`${m.nombre} ${m.presentacion}`)}</td><td>${esc(m.posologia)}</td><td class="n">${m.cantidad}</td></tr>`).join("");
                const verif = r.verificacion ? `<p class="meta">${t("Verificá", "Verifica")} esta receta en ${esc(`${window.location.origin}/verificar/${r.verificacion}`)}</p>` : "";
                const firma = r.firmaUrl || r.selloUrl ? `<div class="firma">${r.firmaUrl ? `<img src="${esc(r.firmaUrl)}" alt="">` : ""}${r.selloUrl ? `<img src="${esc(r.selloUrl)}" alt="">` : ""}</div>` : "";
                const ok = abrirPapel(
                  `Receta ${r.numero}`,
                  `<p class="meta">${fechaCorta(r.fecha)} · ${esc(r.profesional)}${r.matricula ? ` (${esc(r.matricula)})` : ""}${r.vencimiento ? ` · Válida hasta el ${fechaCorta(r.vencimiento)}` : ""}</p><table><tr><th>Medicamento</th><th>Indicación</th><th class="n">Cant.</th></tr>${filas}</table>${r.indicaciones ? `<p>${esc(r.indicaciones)}</p>` : ""}${firma}${verif}`,
                  yo,
                );
                if (!ok) avisarBloqueo();
              }}
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-[var(--marca)]/30 bg-white text-sm font-semibold text-[var(--marca)]"
            >
              <Download className="size-4" /> Descargar receta
            </button>
          </Tarjeta>
        ))}
      </div>

      {p.indicaciones.length > 0 && <Titulo icono={ClipboardList} texto="Tus indicaciones" />}
      <div className="mt-3 space-y-3">
        {p.indicaciones.map((x) => (
          <Tarjeta key={x.id}>
            <p className="font-bold">{x.tratamiento}</p>
            <p className="text-xs text-[#8a83a3]">{fechaCorta(x.fecha)}</p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{x.texto}</p>
            <button
              type="button"
              onClick={() => {
                const ok = abrirPapel(`Indicaciones: ${x.tratamiento}`, `<p class="meta">${fechaCorta(x.fecha)}</p><p style="white-space:pre-line">${esc(x.texto)}</p>`, yo);
                if (!ok) avisarBloqueo();
              }}
              className="mt-3 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-[var(--marca)]/30 bg-white text-sm font-semibold text-[var(--marca)]"
            >
              <Download className="size-4" /> Descargar
            </button>
          </Tarjeta>
        ))}
      </div>

      {p.estudios.length > 0 && <Titulo icono={ScanLine} texto="Estudios" />}
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {p.estudios.map((e) => (
          <div key={e.id} className="overflow-hidden rounded-3xl border border-white/70 bg-white/85 shadow-[0_20px_45px_-38px_rgba(30,16,70,0.6)]">
            <div className="grid h-24 place-items-center bg-gradient-to-br from-slate-800 via-slate-700 to-[var(--marca)] text-white/80">
              <ScanLine className="size-8" />
            </div>
            <div className="p-4">
              <p className="font-semibold">{e.tipo}</p>
              <p className="text-xs text-[#8a83a3]">{fechaCorta(e.fecha)}{e.zona ? ` · ${e.zona}` : ""}</p>
              {e.informe && <p className="mt-1.5 text-sm text-[#6b6385]">{e.informe}</p>}
              {e.url ? (
                <a href={e.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-[var(--marca)]/30 bg-white text-sm font-semibold text-[var(--marca)]">
                  <Download className="size-4" /> Ver o descargar
                </a>
              ) : (
                <p className="mt-3 text-xs text-[#8a83a3]">{t("Pedile", "Pídele")} el archivo a la clínica.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

/* ───────────── Mis pagos: saldo, movimientos, comprobantes y cómo pagar ───────────── */

type Cuenta = {
  moneda: string;
  saldo: number;
  cargos: number;
  pagado: number;
  movimientos: { id: number; fecha: string; tipo: string; concepto: string; medio: string; monto: number }[];
  informados: { id: string; fecha: string; monto: number; medio: string }[];
  pagos: { titular: string; banco: string; cuenta: string; alias: string; link: string; instrucciones: string } | null;
};

function Pagos({ slug, token, yo }: { slug: string; token: string; yo: Yo }) {
  const t = tx(yo.clinica.pais);
  const [c, setC] = useState<Cuenta | null>(null);
  const [error, setError] = useState("");
  const [informar, setInformar] = useState(false);
  const [monto, setMonto] = useState("");
  const [medio, setMedio] = useState<"Transferencia" | "Link de pago" | "Otro">("Transferencia");
  const [ref, setRef] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState("");
  const cargar = () =>
    pedir<Cuenta>(`/public/portal/${slug}/cuenta`, "GET", undefined, token)
      .then((d) => {
        setC(d);
        setMonto(d.saldo > 0 ? String(Math.round(d.saldo)) : "");
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "No pudimos traer tu cuenta."));
  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, token]);
  const plata = (n: number) => {
    try {
      return new Intl.NumberFormat(`es-${(yo.clinica.pais || "AR").toUpperCase()}`, { style: "currency", currency: c?.moneda || "USD", maximumFractionDigits: 0 }).format(n);
    } catch {
      return `$ ${Math.round(n).toLocaleString("es")}`;
    }
  };
  const copiar = (v: string) => {
    navigator.clipboard?.writeText(v).catch(() => {});
    setAviso("Copiado");
    window.setTimeout(() => setAviso(""), 1500);
  };
  const enviar = async () => {
    const n = Number(monto.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."));
    if (!n || n <= 0) return setAviso("Escribí cuánto pagaste.");
    setEnviando(true);
    try {
      await pedir(`/public/portal/${slug}/pagos`, "POST", { monto: n, medio, ...(ref.trim() ? { referencia: ref.trim() } : {}) }, token);
      setInformar(false);
      setRef("");
      setAviso(t("¡Gracias! Le avisamos a la clínica: cuando confirme que llegó, se descuenta de tu saldo.", "¡Gracias! Le avisamos a la clínica: cuando confirme que llegó, se descuenta de tu saldo."));
      await cargar();
    } catch (e) {
      setAviso(e instanceof Error ? e.message : "No se pudo enviar. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  if (error) return <p role="alert" className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>;
  if (!c)
    return (
      <div className="mt-5 flex items-center justify-center gap-2 py-10 text-sm text-[#8a83a3]">
        <Loader2 className="size-4 animate-spin" /> Buscando tu cuenta…
      </div>
    );
  const pendienteInformado = c.informados.reduce((a, x) => a + x.monto, 0);
  const dp = c.pagos;
  const hayDatos = !!dp && !!(dp.alias || dp.cuenta || dp.link);

  return (
    <>
      {aviso && (
        <p role="status" className="mt-4 rounded-2xl bg-[var(--marca)]/[0.07] px-4 py-3 text-sm">
          {aviso}
        </p>
      )}
      <div className={`mt-4 rounded-[28px] p-5 text-white shadow-lg ${c.saldo > 0 ? "bg-gradient-to-br from-[var(--marca)] via-violet-600 to-fuchsia-600" : "bg-gradient-to-br from-emerald-500 to-emerald-600"}`}>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">Tu saldo</p>
        <p className="mt-1 text-4xl font-bold tracking-tight">{c.saldo > 0 ? plata(c.saldo) : "Al día"}</p>
        <p className="mt-1 text-sm text-white/85">{c.saldo > 0 ? "Es lo que te falta pagar a la clínica." : "No tenés deudas con la clínica."}</p>
        {pendienteInformado > 0 && (
          <p className="mt-3 rounded-2xl bg-white/15 px-3 py-2 text-xs">Avisaste un pago de {plata(pendienteInformado)}: la clínica lo está revisando.</p>
        )}
      </div>

      {c.saldo > 0 && hayDatos && (
        <Tarjeta className="mt-4">
          <p className="font-semibold">Cómo pagar</p>
          {dp!.link && (
            <a href={dp!.link} target="_blank" rel="noreferrer" className={`${BOTON} mt-3`}>
              <Wallet className="size-4" /> Pagar online
            </a>
          )}
          {(dp!.alias || dp!.cuenta) && (
            <div className="mt-3 space-y-2 rounded-2xl bg-[#f7f5ff] p-3 text-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8a83a3]">Transferencia</p>
              {[
                ["Alias", dp!.alias],
                ["Cuenta", dp!.cuenta],
                ["Titular", dp!.titular],
                ["Banco", dp!.banco],
              ]
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block text-[11px] text-[#8a83a3]">{k}</span>
                      <span className="block break-all font-semibold">{v}</span>
                    </span>
                    {(k === "Alias" || k === "Cuenta") && (
                      <button type="button" onClick={() => copiar(v!)} aria-label={`Copiar ${k}`} className="grid size-9 shrink-0 place-items-center rounded-full border border-[#e6e1f5] bg-white text-[var(--marca)]">
                        <Copy className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
            </div>
          )}
          {dp!.instrucciones && <p className="mt-3 text-sm text-[#6b6385]">{dp!.instrucciones}</p>}
          {informar ? (
            <div className="mt-4 space-y-2 rounded-2xl bg-[#f7f5ff] p-3">
              <p className="text-sm font-semibold">¿Cuánto pagaste?</p>
              <input value={monto} onChange={(e) => setMonto(e.target.value)} inputMode="decimal" className={INPUT} />
              <div className="flex flex-wrap gap-1.5">
                {(["Transferencia", "Link de pago", "Otro"] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={medio === m} onClick={() => setMedio(m)} className={`h-9 rounded-full border px-3 text-xs font-semibold ${medio === m ? "border-[var(--marca)] bg-[var(--marca)] text-white" : "border-[#e6e1f5] bg-white"}`}>
                    {m}
                  </button>
                ))}
              </div>
              <input value={ref} onChange={(e) => setRef(e.target.value)} maxLength={120} placeholder="Número de operación (opcional)" className={INPUT} />
              <div className="flex gap-2">
                <button type="button" onClick={() => setInformar(false)} className="h-11 flex-1 rounded-full border border-[#e6e1f5] bg-white text-sm font-semibold">Volver</button>
                <button type="button" disabled={enviando} onClick={() => void enviar()} className="h-11 flex-1 rounded-full bg-emerald-500 text-sm font-semibold text-white">
                  {enviando ? "Enviando…" : "Avisar a la clínica"}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setInformar(true)} className="mt-4 inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full border border-emerald-300 bg-white text-sm font-semibold text-emerald-700">
              <Check className="size-4" /> Ya pagué
            </button>
          )}
        </Tarjeta>
      )}
      {c.saldo > 0 && !hayDatos && (
        <p className="mt-4 rounded-2xl bg-white/80 px-4 py-3 text-sm text-[#6b6385]">{t("Para pagar, consultá a la clínica cómo hacerlo.", "Para pagar, consulta a la clínica cómo hacerlo.")}</p>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-white/70 bg-white/85 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8a83a3]">Prestaciones</p>
          <p className="mt-1 text-lg font-bold">{plata(c.cargos)}</p>
        </div>
        <div className="rounded-3xl border border-white/70 bg-white/85 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8a83a3]">Pagado</p>
          <p className="mt-1 text-lg font-bold text-emerald-600">{plata(c.pagado)}</p>
        </div>
      </div>

      {c.movimientos.length > 0 && (
        <>
          <h2 className="mt-6 px-1 text-sm font-bold uppercase tracking-[0.14em] text-[#8a83a3]">Movimientos</h2>
          <div className="mt-3 divide-y divide-[#ece8f7] overflow-hidden rounded-3xl border border-white/70 bg-white/85">
            {c.movimientos.map((m) => {
              const esCargo = m.tipo === "Cargo";
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full ${esCargo ? "bg-[var(--marca)]/10 text-[var(--marca)]" : "bg-emerald-100 text-emerald-600"}`}>
                    {esCargo ? <FileText className="size-4" /> : <Check className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{m.concepto}</span>
                    <span className="block truncate text-xs text-[#8a83a3]">
                      {fechaCorta(m.fecha)} · {esCargo ? "Prestación" : `${m.tipo}${m.medio ? ` · ${m.medio}` : ""}`}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`text-sm font-bold ${esCargo ? "" : "text-emerald-600"}`}>{esCargo ? "" : "− "}{plata(m.monto)}</span>
                    {!esCargo && (
                      <button
                        type="button"
                        onClick={() =>
                          abrirPapel(
                            "Comprobante de pago",
                            `<p class="meta">${fechaCorta(m.fecha)}</p><table><tr><th>Concepto</th><th>Medio</th><th class="n">Importe</th></tr><tr><td>${esc(m.concepto)}</td><td>${esc(m.medio || "—")}</td><td class="n">${esc(plata(m.monto))}</td></tr></table>`,
                            yo,
                          ) || setAviso(t("Tu navegador bloqueó la ventana. Permití las ventanas emergentes.", "Tu navegador bloqueó la ventana. Permite las ventanas emergentes."))
                        }
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--marca)]"
                      >
                        <Download className="size-3" /> Comprobante
                      </button>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
