import { useEffect, useState } from "react";
import { Building2, ChevronDown, MapPin, Phone, Clock, Plus, Trash2 } from "lucide-react";
import { cargarSettings, guardarSettings, useClinicSettings } from "@/lib/cloud-esther/settings-store";
import { LIMITE_SUCURSALES } from "@/lib/cloud-esther/inventario-store";
import { PLANS, useCloudEsther } from "@/lib/cloud-esther/data";
import { normalizarSedes, renombrarSedeEnDatos, turnosProximosEnSede, type DatosSede } from "@/lib/cloud-esther/sedes";
import { capitalizarSede } from "@/lib/utils";

/* Ubicación: src/components/cloud-esther/SedesEditor.tsx
   Las sedes de la clínica: UNA sola lista que se edita igual desde Configuración y desde
   Multiempresa, y que usan la Agenda, los turnos online, Finanzas, Inventario y Equipo.
   El nombre siempre queda con mayúscula inicial; si se renombra, los turnos, cobros y stock
   ya cargados pasan al nombre nuevo. No se borra una sede con turnos por venir. */

const CAMPO =
  "h-11 w-full rounded-lg border border-border/70 bg-background px-3 text-base text-foreground outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/10 sm:h-9 sm:text-xs";

export function SedesEditor({ onToast, nombreClinica }: { onToast: (m: string) => void; nombreClinica?: string }) {
  const { clinic, plan } = useCloudEsther();
  const settings = useClinicSettings(clinic);
  const limite = LIMITE_SUCURSALES[plan] ?? 1;
  const [lista, setLista] = useState<string[]>(settings.sucursales);
  const [datos, setDatos] = useState<Record<string, DatosSede>>(settings.sedesDatos ?? {});
  const [nueva, setNueva] = useState("");
  const [abierta, setAbierta] = useState<number | null>(null);
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  useEffect(() => setLista(settings.sucursales), [settings.sucursales]);
  useEffect(() => setDatos(settings.sedesDatos ?? {}), [settings.sedesDatos]);

  // Siempre sobre lo último guardado (así no se pisa otro cambio de Configuración)
  const guardar = (sucursales: string[], sedesDatos: Record<string, DatosSede>) => {
    const actual = cargarSettings(clinic);
    guardarSettings(clinic, { ...actual, sucursales, sedesDatos });
  };

  const renombrar = (i: number, texto: string) => {
    const viejo = settings.sucursales[i];
    const nuevo = capitalizarSede(texto);
    if (!viejo) return;
    if (!nuevo) {
      setLista(settings.sucursales);
      return onToast("La sede tiene que tener un nombre");
    }
    if (nuevo === viejo) return setLista(settings.sucursales);
    if (settings.sucursales.some((s, j) => j !== i && s.toLocaleLowerCase("es") === nuevo.toLocaleLowerCase("es"))) {
      setLista(settings.sucursales);
      return onToast("Ya tenés una sede con ese nombre");
    }
    const sucursales = settings.sucursales.map((s, j) => (j === i ? nuevo : s));
    const { [viejo]: d, ...resto } = settings.sedesDatos ?? {};
    guardar(sucursales, d ? { ...resto, [nuevo]: d } : resto);
    renombrarSedeEnDatos(viejo, nuevo);
    onToast(`Sede renombrada a «${nuevo}»: los turnos y cobros ya cargados pasan al nombre nuevo`);
  };

  const agregar = () => {
    const n = capitalizarSede(nueva);
    if (!n) return;
    const base = normalizarSedes(settings.sucursales);
    if (base.some((s) => s.toLocaleLowerCase("es") === n.toLocaleLowerCase("es"))) return onToast("Ya tenés una sede con ese nombre");
    if (base.length >= limite) return onToast(`Tu plan permite hasta ${limite} ${limite === 1 ? "sede" : "sedes"}`);
    // La primera sede que se carga reemplaza a «la clínica como sede»: lo ya cargado pasa a esa sede
    if (base.length === 0 && nombreClinica && nombreClinica !== n) renombrarSedeEnDatos(nombreClinica, n);
    guardar([...base, n], settings.sedesDatos ?? {});
    setNueva("");
    onToast(`Sede «${n}» agregada: ya aparece en la Agenda, los turnos online, Finanzas e Inventario`);
  };

  const quitar = (i: number) => {
    const s = settings.sucursales[i];
    if (!s) return;
    const n = turnosProximosEnSede(s);
    if (n > 0) return onToast(`«${s}» tiene ${n} ${n === 1 ? "turno" : "turnos"} por venir. Pasalos a otra sede antes de quitarla.`);
    const { [s]: _fuera, ...resto } = settings.sedesDatos ?? {};
    guardar(settings.sucursales.filter((_, j) => j !== i), resto);
    setAbierta(null);
    onToast(`Sede «${s}» quitada`);
  };

  const cambiarDato = (sede: string, k: keyof DatosSede, v: string) =>
    setDatos((p) => ({ ...p, [sede]: { ...(p[sede] ?? {}), [k]: v } }));
  const guardarDatos = (sede: string) => {
    const limpio: DatosSede = {};
    for (const [k, v] of Object.entries(datos[sede] ?? {})) if (v?.trim()) limpio[k as keyof DatosSede] = v.trim();
    const antes = JSON.stringify(settings.sedesDatos?.[sede] ?? {});
    if (antes === JSON.stringify(limpio)) return;
    guardar(settings.sucursales, { ...(settings.sedesDatos ?? {}), [sede]: limpio });
  };

  if (!montado) return null;
  return (
    <div>
      <div className="space-y-2">
        {lista.length === 0 && (
          <p className="rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Sin sedes cargadas: se usa {nombreClinica ? <b className="text-foreground">«{nombreClinica}»</b> : "el nombre de tu clínica"} como única sede.
            Si tenés más de una, agregalas acá abajo.
          </p>
        )}
        {lista.map((s, i) => {
          const sede = settings.sucursales[i] ?? s;
          const d = datos[sede] ?? {};
          const resumen = [d.direccion, d.telefono, d.horario].filter(Boolean).join(" · ");
          return (
            <div key={i} className="rounded-xl border border-border/60 bg-background/70 p-2">
              <div className="flex items-center gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="size-4" />
                </span>
                <input
                  value={s}
                  aria-label={`Nombre de la sede ${i + 1}`}
                  onChange={(e) => setLista((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                  onBlur={(e) => renombrar(i, e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                  className={CAMPO}
                />
                <button
                  type="button"
                  onClick={() => setAbierta(abierta === i ? null : i)}
                  aria-expanded={abierta === i}
                  aria-label={`Datos de ${sede}`}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
                >
                  <ChevronDown className={`size-4 transition ${abierta === i ? "rotate-180" : ""}`} />
                </button>
                <button
                  type="button"
                  onClick={() => quitar(i)}
                  aria-label={`Quitar ${sede}`}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              {abierta !== i && resumen && <p className="mt-1 truncate pl-10 text-[11px] text-muted-foreground">{resumen}</p>}
              {abierta === i && (
                <div className="mt-2 grid gap-2 pl-10 sm:grid-cols-3" data-movil="1col">
                  {(
                    [
                      ["direccion", "Dirección", "Ej: Av. Corrientes 1234", MapPin],
                      ["telefono", "Teléfono / WhatsApp", "Ej: 11 5555 4444", Phone],
                      ["horario", "Horario de la sede", "Ej: Lun a Vie 9 a 19", Clock],
                    ] as const
                  ).map(([k, label, ph, Icon]) => (
                    <label key={k} className="block">
                      <span className="mb-0.5 flex items-center gap-1 text-[10.5px] font-semibold text-muted-foreground">
                        <Icon className="size-3" /> {label}
                      </span>
                      <input
                        value={d[k] ?? ""}
                        placeholder={ph}
                        onChange={(e) => cambiarDato(sede, k, e.target.value)}
                        onBlur={() => guardarDatos(sede)}
                        className={CAMPO}
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {lista.length < limite && (
        <div className="mt-3 flex items-center gap-2">
          <input
            value={nueva}
            onChange={(e) => setNueva(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                agregar();
              }
            }}
            placeholder="Nombre de la nueva sede (ej. Sede Centro)"
            className={CAMPO}
          />
          <button type="button" onClick={agregar} className="btn-ce shrink-0 !min-h-10">
            <Plus className="size-4" /> Agregar
          </button>
        </div>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">
        Tu plan ({PLANS[plan].name}) permite hasta {limite} {limite === 1 ? "sede" : "sedes"}. Es la misma lista en Configuración y en Multiempresa.
      </p>
    </div>
  );
}
