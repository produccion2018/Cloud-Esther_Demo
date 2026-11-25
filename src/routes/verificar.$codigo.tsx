import { createFileRoute } from "@tanstack/react-router";
import { Loader2, ShieldCheck, ShieldX, TriangleAlert, WifiOff } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import { ToothLogo } from "@/components/admin/logo";
import {
  codigoLegible,
  consultarVerificacion,
  type ResultadoVerificacion,
} from "@/lib/cloud-esther/verificacion-receta";

/* Ubicación: src/routes/verificar.$codigo.tsx
   PÁGINA PÚBLICA DEL QR DE LA RECETA. La abre la farmacia (o quien sea) al escanear el código.
   Dice si la receta es auténtica y si se puede dispensar: válida, ya dispensada, anulada,
   vencida o con un código que ya fue reemplazado. Solo muestra un resumen mínimo
   (iniciales del paciente, nunca su nombre completo). No necesita iniciar sesión. */

export const Route = createFileRoute("/verificar/$codigo")({
  head: () => ({
    meta: [{ title: "Verificar receta — Cloud Esther" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: VerificarReceta,
});

const fecha = (iso: string) => {
  if (!iso) return "";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
};
const hoyISO = () => {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}-${String(h.getDate()).padStart(2, "0")}`;
};

type Tono = "ok" | "aviso" | "error";
const TONOS: Record<Tono, string> = {
  ok: "border-emerald-300 bg-emerald-50 text-emerald-800",
  aviso: "border-amber-300 bg-amber-50 text-amber-900",
  error: "border-red-300 bg-red-50 text-red-800",
};

function Estado({ tono, icono, titulo, children }: { tono: Tono; icono: ReactNode; titulo: string; children?: ReactNode }) {
  return (
    <div className={`flex items-start gap-3 rounded-2xl border-2 p-4 ${TONOS[tono]}`}>
      <span className="mt-0.5 shrink-0">{icono}</span>
      <div>
        <p className="text-lg font-extrabold leading-tight">{titulo}</p>
        {children && <p className="mt-1 text-sm leading-snug opacity-90">{children}</p>}
      </div>
    </div>
  );
}

function VerificarReceta() {
  const { codigo } = Route.useParams();
  const [res, setRes] = useState<ResultadoVerificacion | null>(null);
  const [hora, setHora] = useState("");

  useEffect(() => {
    let vivo = true;
    void consultarVerificacion(codigo).then((r) => {
      if (!vivo) return;
      setRes(r);
      setHora(new Date().toLocaleString("es", { dateStyle: "short", timeStyle: "short" }));
    });
    return () => {
      vivo = false;
    };
  }, [codigo]);

  let estado: ReactNode = null;
  if (!res) {
    estado = (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Verificando la receta…
      </div>
    );
  } else if (res.resultado === "encontrada") {
    const vencida = Boolean(res.resumen.vencimiento) && res.resumen.vencimiento < hoyISO();
    if (res.estado === "Anulada")
      estado = (
        <Estado tono="error" icono={<ShieldX className="size-7" />} titulo="Receta anulada">
          El profesional la anuló. No se debe dispensar.
        </Estado>
      );
    else if (res.estado === "Dispensada")
      estado = (
        <Estado tono="aviso" icono={<TriangleAlert className="size-7" />} titulo="Ya fue dispensada">
          Esta receta es auténtica pero ya se entregó. No se debe volver a dispensar.
        </Estado>
      );
    else if (vencida)
      estado = (
        <Estado tono="error" icono={<ShieldX className="size-7" />} titulo="Receta vencida">
          Era válida hasta el {fecha(res.resumen.vencimiento)}.
        </Estado>
      );
    else
      estado = (
        <Estado tono="ok" icono={<ShieldCheck className="size-7" />} titulo="Receta válida">
          Es auténtica, fue emitida por la clínica y todavía no se dispensó.
        </Estado>
      );
  } else if (res.resultado === "revocada") {
    estado = (
      <Estado tono="error" icono={<ShieldX className="size-7" />} titulo="Este código ya no es válido">
        La clínica lo reemplazó por uno nuevo. Pedí la receta actualizada{res.clinica ? ` a ${res.clinica}` : ""}.
      </Estado>
    );
  } else if (res.resultado === "no_encontrada") {
    estado = (
      <Estado tono="error" icono={<ShieldX className="size-7" />} titulo="No encontramos esta receta">
        El código no corresponde a ninguna receta emitida. Puede ser una receta falsa o adulterada.
      </Estado>
    );
  } else if (res.resultado === "demasiadas") {
    estado = (
      <Estado tono="aviso" icono={<TriangleAlert className="size-7" />} titulo="Demasiadas consultas">
        Esperá unos minutos y volvé a escanear el código.
      </Estado>
    );
  } else {
    estado = (
      <Estado tono="aviso" icono={<WifiOff className="size-7" />} titulo="No pudimos verificarla">
        Revisá la conexión a internet y volvé a escanear el código.
      </Estado>
    );
  }

  const r = res?.resultado === "encontrada" ? res.resumen : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.14),transparent_60%)] bg-background px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-lg">
        <div className="mb-5 flex items-center justify-center gap-2 text-sm font-semibold text-primary">
          <span className="grid size-9 place-items-center rounded-xl bg-primary/10">
            <ToothLogo className="size-5" />
          </span>
          Verificación de recetas
        </div>

        <div className="rounded-[26px] border border-primary/15 bg-card p-5 shadow-[0_30px_70px_-35px_rgba(76,29,149,0.6)] sm:p-6">
          {estado}

          {r && (
            <div className="mt-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-muted/50 p-3.5">
                {(res?.resultado === "encontrada" && (res.clinica || r.clinica)) && (
                  <Dato titulo="Clínica" valor={res.clinica || r.clinica} ancho />
                )}
                <Dato titulo="Receta" valor={r.numero} />
                <Dato titulo="Fecha" valor={fecha(r.fecha)} />
                <Dato titulo="Profesional" valor={`${r.profesional}${r.matricula ? ` · Mat. ${r.matricula}` : ""}`} ancho />
                <Dato titulo="Paciente" valor={r.iniciales || "—"} />
                <Dato titulo="Válida hasta" valor={r.vencimiento ? fecha(r.vencimiento) : "—"} />
              </div>
              <div>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Medicamentos
                </p>
                <ul className="space-y-2">
                  {r.medicamentos.map((m, i) => (
                    <li key={i} className="rounded-xl border border-border px-3 py-2">
                      <p className="font-semibold">
                        {m.nombre}
                        {m.presentacion ? <span className="font-normal text-muted-foreground"> · {m.presentacion}</span> : null}
                        {m.cantidad ? <span className="font-normal text-muted-foreground"> · × {m.cantidad}</span> : null}
                      </p>
                      {m.posologia && <p className="text-xs text-muted-foreground">{m.posologia}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <p className="mt-5 border-t border-border pt-3 text-center text-[11px] text-muted-foreground">
            Código {codigoLegible(codigo.toUpperCase())}
            {hora ? ` · Verificado el ${hora}` : ""}
          </p>
        </div>
        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Por privacidad solo se muestran las iniciales del paciente.
        </p>
      </div>
    </main>
  );
}

function Dato({ titulo, valor, ancho }: { titulo: string; valor: string; ancho?: boolean }) {
  return (
    <div className={ancho ? "col-span-2" : ""}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{titulo}</p>
      <p className="font-semibold">{valor || "—"}</p>
    </div>
  );
}
