import { createFileRoute } from "@tanstack/react-router";
import { Camera, CheckCircle2, Clock3, Loader2, ShieldCheck, ShieldX, Wallet, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { API_URL } from "@/lib/clinica/api";
import { achicarFoto } from "@/lib/clinica/subir-imagen";
import { telefonoInternacional } from "@/lib/clinica/whatsapp";
import { IconoWhatsApp } from "@/components/cloud-esther/IconoWhatsApp";

/* Ubicación: src/routes/pago.$token.tsx
   PÁGINA PÚBLICA DE PAGO del paciente: ve cuánto debe y cómo pagarle a la clínica, y avisa «ya
   pagué» con la foto del comprobante. Sin portal ni cuenta (todos los planes). El aviso queda para
   que la clínica lo confirme: nunca se descuenta solo. */

export const Route = createFileRoute("/pago/$token")({
  head: () => ({
    meta: [{ title: "Pagar — Cloud Esther" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: PagarPaciente,
});

type Info = {
  clinica: string;
  logo: string;
  color: string;
  telefono: string;
  pais: string;
  moneda: string;
  paciente: string;
  saldo: number;
  pendiente: number;
  informados: { monto: number; medio: string; fecha: string; estado: string }[];
  datosPago: { titular: string; banco: string; cuenta: string; alias: string; link: string; instrucciones: string };
  subidaDisponible: boolean;
};
type Firma = { cloudName: string; apiKey: string; timestamp: number; signature: string; folder: string };

async function pedir<T>(ruta: string, metodo = "GET", cuerpo?: unknown): Promise<T> {
  const r = await fetch(`${API_URL}${ruta}`, {
    method: metodo,
    headers: cuerpo !== undefined ? { "Content-Type": "application/json" } : {},
    ...(cuerpo !== undefined ? { body: JSON.stringify(cuerpo) } : {}),
  });
  if (!r.ok) throw new Error((await r.text().catch(() => "")) || "No pudimos conectarnos. Probá de nuevo.");
  return (await r.json()) as T;
}

const MEDIOS = ["Transferencia", "Mercado Pago", "Link de pago", "Efectivo", "Tarjeta", "Otro"] as const;

function PagarPaciente() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [avisar, setAvisar] = useState(false);
  const [listo, setListo] = useState(false);
  const [copiado, setCopiado] = useState("");

  useEffect(() => {
    if (!API_URL) return setError("Esta página todavía no está disponible.");
    pedir<Info>(`/public/pagos/${token}`)
      .then(setInfo)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "El enlace no es válido."));
  }, [token]);

  const vos = ["AR", "UY", "PY"].includes((info?.pais ?? "AR").toUpperCase());
  const t = (a: string, b: string) => (vos ? a : b);
  const plata = (n: number) => {
    try {
      return new Intl.NumberFormat(`es-${info?.pais || "AR"}`, { style: "currency", currency: info?.moneda || "ARS", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n);
    } catch {
      return `$ ${n.toLocaleString("es")}`;
    }
  };
  const copiar = (v: string) => {
    void navigator.clipboard?.writeText(v).catch(() => {});
    setCopiado(v);
    window.setTimeout(() => setCopiado(""), 1800);
  };
  const dp = info?.datosPago;
  const aPagar = info ? Math.max(0, info.saldo - info.pendiente) : 0;
  const wa = info?.telefono ? `https://wa.me/${telefonoInternacional(info.telefono, info.pais)}?text=${encodeURIComponent("Hola, tengo una consulta sobre mi saldo.")}` : "";

  return (
    <main
      style={{ ["--marca" as string]: info?.color || "#7c3aed" }}
      className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,color-mix(in_srgb,var(--marca)_16%,transparent),transparent_60%)] bg-[#faf8ff] px-4 py-7 text-[#1f1a33] sm:py-12"
    >
      <div className="mx-auto w-full max-w-lg">
        {!info && !error && (
          <div className="flex items-center justify-center gap-2 py-24 text-sm text-[#6b6385]">
            <Loader2 className="size-4 animate-spin" /> Abriendo…
          </div>
        )}
        {!info && error && (
          <div className="mt-10 flex items-start gap-3 rounded-3xl border-2 border-red-200 bg-white p-5 text-red-800 shadow-sm">
            <ShieldX className="mt-0.5 size-7 shrink-0" />
            <div>
              <p className="text-lg font-extrabold leading-tight">No se puede abrir este enlace</p>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        )}

        {info && (
          <>
            <section className="relative overflow-hidden rounded-[28px] bg-white p-5 shadow-[0_30px_70px_-40px_rgba(76,29,149,0.55)] ring-1 ring-black/5">
              <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[var(--marca)] via-fuchsia-500 to-amber-300" />
              <div className="flex items-center gap-3.5">
                {info.logo ? (
                  <img src={info.logo} alt="" className="size-14 shrink-0 rounded-2xl bg-white object-contain p-1.5 shadow ring-1 ring-black/5" />
                ) : (
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[var(--marca)] to-fuchsia-500 text-white shadow-lg">
                    <Wallet className="size-6" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--marca)]">{t("Tu cuenta", "Tu cuenta")}</p>
                  <h1 className="truncate text-xl font-bold leading-tight">{info.clinica}</h1>
                </div>
              </div>
            </section>

            <section className="mt-4 rounded-[28px] bg-gradient-to-br from-[var(--marca)] via-violet-600 to-fuchsia-600 p-5 text-white shadow-[0_24px_50px_-28px_rgba(124,58,237,0.9)]">
              <p className="text-sm text-white/85">Hola{info.paciente ? ` ${info.paciente}` : ""} 👋</p>
              {info.saldo > 0 ? (
                <>
                  <p className="mt-1 text-sm text-white/85">{t("Tenés un saldo de", "Tienes un saldo de")}</p>
                  <p className="text-[34px] font-extrabold leading-none tracking-[-0.02em] tabular-nums">{plata(info.saldo)}</p>
                  {info.pendiente > 0 && (
                    <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] ring-1 ring-white/25">
                      <Clock3 className="size-3" /> {plata(info.pendiente)} {t("avisados, la clínica los está revisando", "avisados, la clínica los está revisando")}
                    </p>
                  )}
                </>
              ) : (
                <p className="mt-1 flex items-center gap-2 text-xl font-bold">
                  <CheckCircle2 className="size-6" /> {t("No tenés saldo pendiente", "No tienes saldo pendiente")}
                </p>
              )}
            </section>

            {listo && (
              <section className="mt-4 rounded-[28px] bg-white p-5 text-center shadow-sm ring-1 ring-black/5">
                <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
                <p className="mt-2 text-lg font-extrabold">¡Gracias! Ya le avisamos a la clínica</p>
                <p className="mx-auto mt-1 max-w-xs text-sm text-[#6b6385]">
                  {t("Cuando confirme que llegó, se descuenta de tu saldo.", "Cuando confirme que llegó, se descuenta de tu saldo.")}
                </p>
              </section>
            )}

            {info.saldo > 0 && !listo && (
              <section className="mt-4 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/5">
                {dp && (dp.alias || dp.cuenta || dp.link || dp.instrucciones) ? (
                  <>
                    <p className="text-sm font-bold">{t("Cómo pagar", "Cómo pagar")}</p>
                    <div className="mt-3 space-y-1.5">
                      {(
                        [
                          ["Alias", dp.alias],
                          ["Cuenta", dp.cuenta],
                          ["Titular", dp.titular],
                          ["Banco", dp.banco],
                        ] as const
                      )
                        .filter(([, v]) => v)
                        .map(([l, v]) => (
                          <div key={l} className="flex items-center justify-between gap-2 rounded-2xl bg-[#f6f3fd] px-3.5 py-2.5">
                            <span className="min-w-0">
                              <span className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8a83a3]">{l}</span>
                              <span className="block truncate text-sm font-semibold">{v}</span>
                            </span>
                            {(l === "Alias" || l === "Cuenta") && (
                              <button type="button" onClick={() => copiar(v)} className="shrink-0 rounded-full bg-[var(--marca)]/10 px-3 py-1 text-xs font-semibold text-[var(--marca)]">
                                {copiado === v ? "¡Copiado!" : "Copiar"}
                              </button>
                            )}
                          </div>
                        ))}
                      {dp.instrucciones && <p className="px-1 text-xs text-[#6b6385]">{dp.instrucciones}</p>}
                      {dp.link && (
                        <a href={dp.link} target="_blank" rel="noreferrer" className="flex h-11 items-center justify-center rounded-full bg-[var(--marca)] text-sm font-semibold text-white">
                          {t("Pagar online", "Pagar en línea")}
                        </a>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-[#6b6385]">{t("Podés pagar en la clínica o escribirnos para coordinar.", "Puedes pagar en la clínica o escribirnos para coordinar.")}</p>
                )}

                {aPagar > 0 &&
                  (avisar ? (
                    <Avisar info={info} token={token} maximo={aPagar} t={t} plata={plata} onListo={(i) => { setInfo(i); setListo(true); setAvisar(false); }} onVolver={() => setAvisar(false)} />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setAvisar(true)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--marca)] via-violet-500 to-fuchsia-500 py-3.5 text-base font-semibold text-white shadow-[0_14px_30px_-14px_rgba(124,58,237,0.9)]"
                    >
                      <CheckCircle2 className="size-5" /> {t("Ya pagué", "Ya pagué")}
                    </button>
                  ))}
              </section>
            )}

            {info.informados.length > 0 && (
              <section className="mt-4 rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-black/5">
                <p className="text-sm font-bold">{t("Tus avisos de pago", "Tus avisos de pago")}</p>
                <ul className="mt-2 divide-y divide-[#efeaf9]">
                  {info.informados.map((x, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 py-2 text-sm">
                      <span className="min-w-0 truncate">
                        {new Date(x.fecha).toLocaleDateString("es", { day: "numeric", month: "short" })} · {x.medio}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        <b className="tabular-nums">{plata(x.monto)}</b>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${x.estado === "Confirmado" ? "bg-emerald-100 text-emerald-700" : x.estado === "Rechazado" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"}`}
                        >
                          {x.estado === "Pendiente" ? "Revisando" : x.estado === "Rechazado" ? "No llegó" : "Confirmado"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="mt-4 flex items-center justify-center gap-2 text-[13px] font-semibold text-emerald-700">
                <IconoWhatsApp /> {t("¿Tenés dudas? Escribinos", "¿Tienes dudas? Escríbenos")}
              </a>
            )}
            <p className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-[#8a83a3]">
              <ShieldCheck className="size-3.5" /> {vos ? "Solo vos" : "Solo tú"} y la clínica ven esta página · Cloud Esther
            </p>
          </>
        )}
      </div>
    </main>
  );
}

function Avisar({
  info,
  token,
  maximo,
  t,
  plata,
  onListo,
  onVolver,
}: {
  info: Info;
  token: string;
  maximo: number;
  t: (a: string, b: string) => string;
  plata: (n: number) => string;
  onListo: (i: Info) => void;
  onVolver: () => void;
}) {
  const [monto, setMonto] = useState(String(maximo));
  const [medio, setMedio] = useState<(typeof MEDIOS)[number]>(info.datosPago.link ? "Link de pago" : "Transferencia");
  const [referencia, setReferencia] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [vista, setVista] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement | null>(null);

  const elegir = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith("image/") && f.type !== "application/pdf") return setError("Elegí una foto o un PDF del comprobante.");
    if (f.size > 15 * 1024 * 1024) return setError("El archivo pesa más de 15 MB.");
    setError("");
    setFoto(f);
    setVista(f.type.startsWith("image/") ? URL.createObjectURL(f) : "");
  };

  const enviar = async () => {
    const limpio = monto.trim().includes(",") ? monto.trim().replace(/\./g, "").replace(",", ".") : monto.trim();
    const n = Math.round(Number(limpio) * 100) / 100;
    if (!n || n <= 0) return setError(t("Escribí cuánto pagaste.", "Escribe cuánto pagaste."));
    if (n > maximo + 0.01) return setError(`${t("El monto es mayor a lo que debés", "El monto es mayor a lo que debes")} (${plata(maximo)}).`);
    setEnviando(true);
    setError("");
    try {
      let comprobante: string | undefined;
      if (foto) {
        const archivo = foto.type.startsWith("image/") ? await achicarFoto(foto, 2000) : foto;
        const firma = await pedir<Firma>(`/public/pagos/${token}/firma`, "POST");
        const fd = new FormData();
        fd.append("file", archivo, foto.name);
        fd.append("api_key", firma.apiKey);
        fd.append("timestamp", String(firma.timestamp));
        fd.append("signature", firma.signature);
        fd.append("folder", firma.folder);
        const r = await fetch(`https://api.cloudinary.com/v1_1/${firma.cloudName}/auto/upload`, { method: "POST", body: fd });
        if (!r.ok) throw new Error(t("No se pudo subir la foto. Revisá tu conexión y probá de nuevo.", "No se pudo subir la foto. Revisa tu conexión y prueba de nuevo."));
        comprobante = ((await r.json()) as { secure_url?: string }).secure_url;
      }
      onListo(
        await pedir<Info>(`/public/pagos/${token}/informar`, "POST", {
          monto: n,
          medio,
          ...(referencia.trim() ? { referencia: referencia.trim() } : {}),
          ...(comprobante ? { comprobante } : {}),
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar. Probá de nuevo.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="mt-4 space-y-3 border-t border-[#efeaf9] pt-4">
      <p className="text-base font-bold">{t("Avisanos tu pago", "Avísanos tu pago")}</p>
      <label className="block">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a83a3]">{t("¿Cuánto pagaste?", "¿Cuánto pagaste?")}</span>
        <input
          inputMode="decimal"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="mt-1 h-12 w-full rounded-2xl border border-[#e6e1f5] bg-white px-4 text-lg font-bold outline-none focus:border-[var(--marca)]"
        />
      </label>
      <div className="flex flex-wrap gap-1.5">
        {MEDIOS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMedio(m)}
            className={`rounded-full px-3 py-1.5 text-[13px] font-medium ring-1 ${medio === m ? "bg-[var(--marca)] text-white ring-[var(--marca)]" : "bg-white text-[#4b4466] ring-[#e6e1f5]"}`}
          >
            {m}
          </button>
        ))}
      </div>
      {info.subidaDisponible && (
        <div>
          <input ref={input} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={(e) => elegir(e.target.files?.[0])} />
          {foto ? (
            <div className="flex items-center gap-3 rounded-2xl bg-[#f6f3fd] p-2.5">
              {vista ? <img src={vista} alt="" className="size-14 rounded-xl object-cover" /> : <span className="grid size-14 place-items-center rounded-xl bg-white text-xs font-bold text-[var(--marca)]">PDF</span>}
              <span className="min-w-0 flex-1 truncate text-sm">{foto.name}</span>
              <button type="button" aria-label="Quitar" onClick={() => { setFoto(null); setVista(""); }} className="grid size-8 place-items-center rounded-full bg-white text-[#6b6385]">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#d9d1f0] bg-[#fcfbff] py-4 text-sm font-semibold text-[var(--marca)]"
            >
              <Camera className="size-5" /> {t("Sacale una foto al comprobante", "Tómale una foto al comprobante")}
            </button>
          )}
        </div>
      )}
      <input
        value={referencia}
        onChange={(e) => setReferencia(e.target.value)}
        maxLength={120}
        placeholder={t("N.º de operación (opcional)", "N.º de operación (opcional)")}
        className="h-11 w-full rounded-2xl border border-[#e6e1f5] bg-white px-4 text-sm outline-none focus:border-[var(--marca)]"
      />
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button
        type="button"
        disabled={enviando}
        onClick={() => void enviar()}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--marca)] via-violet-500 to-fuchsia-500 py-3.5 text-base font-semibold text-white shadow-[0_14px_30px_-14px_rgba(124,58,237,0.9)] disabled:opacity-60"
      >
        {enviando ? <Loader2 className="size-5 animate-spin" /> : <CheckCircle2 className="size-5" />} {t("Enviar aviso", "Enviar aviso")}
      </button>
      <button type="button" onClick={onVolver} className="h-10 w-full rounded-full text-sm font-semibold text-[#6b6385]">
        Volver
      </button>
    </div>
  );
}
