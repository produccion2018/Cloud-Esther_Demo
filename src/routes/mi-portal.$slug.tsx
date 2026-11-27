import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  CalendarCheck2,
  CalendarClock,
  CalendarPlus,
  CalendarX2,
  Check,
  Clock,
  Loader2,
  LogOut,
  MapPin,
  Phone,
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
