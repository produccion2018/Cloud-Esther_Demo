import { createFileRoute } from "@tanstack/react-router";
import {
  Box,
  Building2,
  Copy,
  Grid2x2,
  Info,
  Lock,
  Plus,
  Power,
  PowerOff,
  TicketPercent,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Cargando, Seccion, Vacio } from "@/components/admin/bits";
import {
  Campo,
  DialogoFormulario,
  INPUT,
  Pildora,
  Tabla,
  confirmar,
} from "@/components/admin/formularios";
import { RestrictedView } from "@/components/admin/restricted";
import { canAccess, permisos, useRole } from "@/components/admin/role";
import { AdminShell } from "@/components/admin/shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cambiarCupon, crearCupon, guardarPlan, guardarPrecioModuloServidor } from "@/lib/admin/api";
import { MODULES, PLANS, comprableEn } from "@/lib/cloud-esther/data";
import {
  guardarPrecioModulo,
  traerDelServidor,
  usePreciosModulos,
} from "@/lib/cloud-esther/precios-modulos";
import { toast } from "sonner";
import { useAccion, useClinicas, useCupones, usePlanes } from "@/lib/admin/consultas";
import { limiteTexto, precio, precioAnual } from "@/lib/admin/formato";
import type { CambiosPlan, Cupon, NuevoCupon, PlanConfig, PlanId } from "@/lib/admin/tipos";

export const Route = createFileRoute("/admin/planes")({
  head: () => ({
    meta: [
      { title: "Planes y precios — Cloud Esther Administración" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PlanesPage,
});

function PlanesPage() {
  const { role } = useRole();
  const { data: planes, isLoading } = usePlanes();
  const { data: clinicas } = useClinicas();
  if (!canAccess(role, "/admin/planes")) return <RestrictedView />;
  const editable = permisos.editarPlanes(role);

  return (
    <AdminShell
      title="Planes y precios"
      description="Precio, descuento anual y capacidad de cada plan. Es lo que ven las clínicas en la web, en el registro y dentro de la app: no hace falta tocar el código para cambiarlo."
    >
      <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/[0.05] px-4 py-3 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-foreground/85">
          El <b>monto inicial</b> se cobra una sola vez al contratar; el <b>precio mensual</b> es el
          recurrente. Mientras un plan no tenga precio, no se muestra en la web. En los límites,{" "}
          <b>dejar la caja vacía = sin límite</b>. El precio anual se
          calcula solo: <b>precio mensual × 12 × (1 − descuento)</b>. El odontograma de cada plan es
          una regla fija: <b>Start y Pro usan el 2D · Plus y Enterprise usan el 3D</b>.
          {!editable && " Tu perfil puede ver los planes; los cambia el Dueño."}
        </p>
      </div>

      {isLoading || !planes ? (
        <Cargando />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
          {planes.map((p) => (
            <TarjetaPlan
              // Si cambian los datos guardados, la tarjeta se vuelve a armar con ellos:
              // lo que ves después de "Guardar" es lo que quedó guardado de verdad.
              key={`${p.id}:${JSON.stringify(p)}`}
              plan={p}
              editable={editable}
              clinicas={(clinicas ?? []).filter((c) => c.plan === p.id).length}
            />
          ))}
        </div>
      )}

      <PreciosModulosAdicionales editable={editable} />

      {permisos.verImportes(role) && <CuponesDescuento planes={planes ?? []} />}
    </AdminShell>
  );
}

/* -------------------------------------------------------------------------- */
/*            PRECIOS DE MÓDULOS ADICIONALES (los fija el Dueño)              */
/* -------------------------------------------------------------------------- */

/** El Dueño pone el precio mensual de cada módulo que una clínica puede sumar a su plan.
    Ese precio es el que la clínica ve antes de contratar (en Facturación › Mi plan, o en
    Configuración › Mi plan si es plan Start). */
function PreciosModulosAdicionales({ editable }: { editable: boolean }) {
  const precios = usePreciosModulos();
  // Módulos que se pueden sumar como adicional en algún plan (superset = los comprables desde Start).
  const vendibles = MODULES.filter((m) => comprableEn(m, "inicial") && !m.maxPlan);
  const [f, setF] = useState<Record<string, string>>(() =>
    Object.fromEntries(vendibles.map((m) => [m.id, precios[m.id] !== undefined ? String(precios[m.id]) : ""])),
  );

  // Con servidor: se traen los precios guardados y, al cambiarlos, se llenan las cajas
  useEffect(() => {
    void traerDelServidor(true);
  }, []);
  useEffect(() => {
    setF(Object.fromEntries(vendibles.map((m) => [m.id, precios[m.id] !== undefined ? String(precios[m.id]) : ""])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precios]);

  const guardarUno = async (id: string) => {
    const t = (f[id] ?? "").trim().replace(",", ".");
    const n = t === "" ? null : Number(t);
    if (n !== null && (!Number.isFinite(n) || n < 0)) return;
    if ((precios[id] ?? null) === n) return;
    try {
      // Primero en el servidor (así lo ven todas las clínicas); después se ve al instante acá
      await guardarPrecioModuloServidor(id, n === null ? null : Math.round(n * 100) / 100);
      guardarPrecioModulo(id, n);
      toast.success(n === null ? "Precio quitado" : "Precio guardado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar el precio.");
    }
  };

  return (
    <div className="mt-6">
      <Seccion
        titulo="Precios de módulos adicionales"
        descripcion="Precio MENSUAL (USD, sin impuestos) de cada módulo que una clínica Start, Pro o Plus puede sumar sin cambiar de plan. Es lo que ve la clínica antes de contratar. Si la clínica paga ANUAL, se le cobra mensual × 12 con el mismo descuento anual de su plan. Si paga con Paddle, se suma a su suscripción y Paddle cobra hoy lo proporcional; si no, te llega el aviso para facturarlo. Vacío = sin precio (la clínica no lo puede contratar todavía)."
      >
        <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
          {vendibles.map((m) => (
            <div key={m.id} className="rounded-2xl border border-primary/12 bg-gradient-to-br from-primary/[0.05] to-transparent p-3">
              <Label htmlFor={`precio-${m.id}`} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate font-semibold" title={m.label}>{m.label}</span>
                <span className="shrink-0 text-[10.5px] font-medium text-muted-foreground">
                  Desde {PLANS[m.minPlan].name}
                </span>
              </Label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-primary">
                  USD
                </span>
                <Input
                  id={`precio-${m.id}`}
                  inputMode="decimal"
                  value={f[m.id] ?? ""}
                  disabled={!editable}
                  placeholder="Sin precio"
                  onChange={(e) => setF((x) => ({ ...x, [m.id]: e.target.value.replace(/[^0-9.,]/g, "") }))}
                  onBlur={() => editable && void guardarUno(m.id)}
                  className="h-10 rounded-xl pl-12 pr-16"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  / mes
                </span>
              </div>
            </div>
          ))}
        </div>
        {!editable && (
          <p className="mt-3 text-xs text-muted-foreground">
            Tu perfil puede ver los precios; los cambia el Dueño.
          </p>
        )}
      </Seccion>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                 CUPONES DE DESCUENTO (permiso «Importes»)                   */
/* -------------------------------------------------------------------------- */

/** "20 % · primer pago", "USD 50 · 3 cobros"... */
function resumenCupon(c: Pick<Cupon, "tipo" | "valor" | "duracion" | "meses">) {
  const cuanto = c.tipo === "porcentaje" ? `${c.valor} %` : `USD ${c.valor}`;
  const cuando =
    c.duracion === "primer-pago"
      ? "primer pago"
      : c.duracion === "meses"
        ? `${c.meses} ${c.meses === 1 ? "cobro" : "cobros"}`
        : "todos los cobros";
  return `${cuanto} · ${cuando}`;
}

function estadoCupon(c: Cupon): { texto: string; tono: "ok" | "alerta" | "neutro" } {
  if (!c.activo) return { texto: "Desactivado", tono: "neutro" };
  if (c.vence && new Date(c.vence) <= new Date()) return { texto: "Vencido", tono: "alerta" };
  if (c.limiteUsos !== null && c.usos >= c.limiteUsos) return { texto: "Agotado", tono: "alerta" };
  return { texto: "Activo", tono: "ok" };
}

type FormCupon = {
  codigo: string;
  descripcion: string;
  tipo: NuevoCupon["tipo"];
  valor: string;
  duracion: NuevoCupon["duracion"];
  meses: string;
  planes: PlanId[];
  limiteUsos: string;
  vence: string;
};
const FORM_VACIO: FormCupon = {
  codigo: "",
  descripcion: "",
  tipo: "porcentaje",
  valor: "",
  duracion: "primer-pago",
  meses: "3",
  planes: [],
  limiteUsos: "",
  vence: "",
};

function CuponesDescuento({ planes }: { planes: PlanConfig[] }) {
  const { data: cupones, isLoading } = useCupones();
  const [abierto, setAbierto] = useState(false);
  const [f, setF] = useState<FormCupon>(FORM_VACIO);
  const [error, setError] = useState<string | null>(null);
  const crear = useAccion(crearCupon, ["cupones"], (c) => `Cupón ${c.codigo.toUpperCase()} creado`);
  const cambiar = useAccion(cambiarCupon, ["cupones"], (a) =>
    a.activo ? "Cupón activado" : "Cupón desactivado",
  );
  const nombrePlan = (id: PlanId) => planes.find((p) => p.id === id)?.nombre ?? id;

  const guardar = () => {
    setError(null);
    const codigo = f.codigo.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,30}$/.test(codigo))
      return setError("El código: de 3 a 30 letras, números, - o _ (sin espacios).");
    const valor = Number(f.valor.replace(",", "."));
    if (!Number.isFinite(valor) || valor <= 0) return setError("Poné cuánto descuenta.");
    if (f.tipo === "porcentaje" && (!Number.isInteger(valor) || valor > 100))
      return setError("El porcentaje va de 1 a 100 (sin decimales).");
    const meses = Number(f.meses);
    if (f.duracion === "meses" && (!Number.isInteger(meses) || meses < 1 || meses > 36))
      return setError("La cantidad de cobros va de 1 a 36.");
    const limite = f.limiteUsos.trim() ? Number(f.limiteUsos) : null;
    if (limite !== null && (!Number.isInteger(limite) || limite < 1))
      return setError("El máximo de usos tiene que ser un número entero (o vacío = sin límite).");
    // La fecha vence al terminar ese día
    const vence = f.vence ? new Date(`${f.vence}T23:59:59`).toISOString() : null;
    if (vence && new Date(vence) <= new Date()) return setError("La fecha de vencimiento ya pasó.");
    crear.mutate(
      {
        codigo,
        descripcion: f.descripcion.trim(),
        tipo: f.tipo,
        valor: f.tipo === "monto" ? Math.round(valor * 100) / 100 : valor,
        duracion: f.duracion,
        meses: f.duracion === "meses" ? meses : null,
        planes: f.planes,
        limiteUsos: limite,
        vence,
      },
      {
        onSuccess: () => {
          setAbierto(false);
          setF(FORM_VACIO);
        },
        onError: (e) => setError(e instanceof Error ? e.message : "No se pudo crear el cupón."),
      },
    );
  };

  const lista = cupones ?? [];
  return (
    <div className="mt-6">
      <Seccion
        titulo="Cupones de descuento"
        descripcion="El cliente escribe el código en la página de pago y el descuento lo aplica el servidor en Paddle. Para cambiar un descuento, desactivá el cupón y creá otro."
        acciones={
          <Button
            onClick={() => {
              setError(null);
              setAbierto(true);
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" /> Nuevo cupón
          </Button>
        }
      >
        {isLoading ? (
          <Cargando />
        ) : lista.length === 0 ? (
          <Vacio
            titulo="Todavía no hay cupones"
            texto="Creá uno (por ejemplo BIENVENIDA20) y compartilo con las clínicas que quieras."
          />
        ) : (
          <Tabla columnas={["Código", "Descuento", "Planes", "Usos", "Vence", "Estado", ""]}>
            {lista.map((c) => {
              const e = estadoCupon(c);
              return (
                <tr key={c.id} className="border-t border-border/60">
                  <td className="py-3 pl-5 pr-3">
                    <span className="inline-flex items-center gap-2">
                      <TicketPercent className="h-4 w-4 text-primary" />
                      <span className="font-mono text-sm font-bold tracking-wide">{c.codigo}</span>
                      <button
                        type="button"
                        title="Copiar código"
                        aria-label="Copiar código"
                        className="text-muted-foreground transition hover:text-primary"
                        onClick={() => void navigator.clipboard?.writeText(c.codigo)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </span>
                    {c.descripcion && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {c.descripcion}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold">{resumenCupon(c)}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {c.planes.length ? c.planes.map(nombrePlan).join(", ") : "Todos"}
                  </td>
                  <td className="px-3 py-3 text-sm tabular-nums">
                    {c.usos}
                    {c.limiteUsos !== null && (
                      <span className="text-muted-foreground"> / {c.limiteUsos}</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-muted-foreground">
                    {c.vence ? new Date(c.vence).toLocaleDateString("es-AR") : "No vence"}
                  </td>
                  <td className="px-3 py-3">
                    <Pildora tono={e.tono}>{e.texto}</Pildora>
                  </td>
                  <td className="py-3 pl-3 pr-5 text-right">
                    <Button
                      size="sm"
                      variant={c.activo ? "outline" : "default"}
                      disabled={cambiar.isPending}
                      onClick={() => {
                        if (
                          c.activo &&
                          !confirmar(
                            `¿Desactivar el cupón ${c.codigo}?\n\nLas clínicas ya no lo van a poder usar.`,
                          )
                        )
                          return;
                        cambiar.mutate({ id: c.id, activo: !c.activo });
                      }}
                    >
                      {c.activo ? (
                        <>
                          <PowerOff className="mr-1.5 h-3.5 w-3.5" /> Desactivar
                        </>
                      ) : (
                        <>
                          <Power className="mr-1.5 h-3.5 w-3.5" /> Activar
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </Tabla>
        )}
      </Seccion>

      <DialogoFormulario
        abierto={abierto}
        titulo="Nuevo cupón de descuento"
        descripcion="Se crea también en Paddle. Una vez creado, el descuento no se puede cambiar (se desactiva y se crea otro)."
        onCerrar={() => setAbierto(false)}
        onGuardar={guardar}
        guardando={crear.isPending}
        error={error}
        textoGuardar="Crear cupón"
      >
        <Campo label="Código" ayuda="Lo que escribe el cliente. Ej.: BIENVENIDA20">
          <input
            className={`${INPUT} font-mono uppercase tracking-wide`}
            value={f.codigo}
            maxLength={30}
            onChange={(e) =>
              setF({ ...f, codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "") })
            }
          />
        </Campo>
        <Campo
          label="Descripción (opcional)"
          ayuda="Solo para el equipo y la factura. Ej.: Promo lanzamiento Chile"
        >
          <input
            className={INPUT}
            value={f.descripcion}
            maxLength={200}
            onChange={(e) => setF({ ...f, descripcion: e.target.value })}
          />
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Tipo">
            <select
              className={INPUT}
              value={f.tipo}
              onChange={(e) => setF({ ...f, tipo: e.target.value as FormCupon["tipo"] })}
            >
              <option value="porcentaje">Porcentaje (%)</option>
              <option value="monto">Monto fijo (USD)</option>
            </select>
          </Campo>
          <Campo label={f.tipo === "porcentaje" ? "Descuento (%)" : "Descuento (USD)"}>
            <input
              className={INPUT}
              inputMode="decimal"
              value={f.valor}
              placeholder={f.tipo === "porcentaje" ? "20" : "50"}
              onChange={(e) => setF({ ...f, valor: e.target.value.replace(/[^0-9.,]/g, "") })}
            />
          </Campo>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="¿En qué cobros?">
            <select
              className={INPUT}
              value={f.duracion}
              onChange={(e) => setF({ ...f, duracion: e.target.value as FormCupon["duracion"] })}
            >
              <option value="primer-pago">Solo el primer pago</option>
              <option value="meses">Los primeros N cobros</option>
              <option value="siempre">Todos los cobros</option>
            </select>
          </Campo>
          {f.duracion === "meses" && (
            <Campo label="Cantidad de cobros">
              <input
                className={INPUT}
                inputMode="numeric"
                value={f.meses}
                onChange={(e) => setF({ ...f, meses: e.target.value.replace(/\D/g, "") })}
              />
            </Campo>
          )}
        </div>
        <Campo label="Planes donde vale" ayuda="Sin marcar ninguno = vale para todos los planes.">
          <div className="flex flex-wrap gap-2">
            {planes.map((p) => {
              const marcado = f.planes.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={marcado}
                  onClick={() =>
                    setF({
                      ...f,
                      planes: marcado ? f.planes.filter((x) => x !== p.id) : [...f.planes, p.id],
                    })
                  }
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    marcado
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {p.nombre}
                </button>
              );
            })}
          </div>
        </Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo label="Máximo de usos" ayuda="Vacío = sin límite">
            <input
              className={INPUT}
              inputMode="numeric"
              value={f.limiteUsos}
              onChange={(e) => setF({ ...f, limiteUsos: e.target.value.replace(/\D/g, "") })}
            />
          </Campo>
          <Campo label="Vence" ayuda="Vacío = no vence">
            <input
              type="date"
              className={INPUT}
              value={f.vence}
              onChange={(e) => setF({ ...f, vence: e.target.value })}
            />
          </Campo>
        </div>
      </DialogoFormulario>
    </div>
  );
}

/** Texto de una caja → importe con hasta 2 decimales. "" = sin definir. NaN = inválido. */
function leerImporte(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : Number.NaN;
}

/** Texto de una caja → límite entero. "" = sin límite (null). NaN = inválido. */
function leerLimite(v: string): number | null {
  const t = v.trim();
  if (t === "") return null;
  const n = Number(t.replace(",", "."));
  return Number.isInteger(n) && n >= 1 ? n : Number.NaN;
}

const aCaja = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n) ? "" : String(n);
const limiteDelPlan = (n: number) => (Number.isFinite(n) ? n : null);

function TarjetaPlan({
  plan,
  editable,
  clinicas,
}: {
  plan: PlanConfig;
  editable: boolean;
  clinicas: number;
}) {
  const inicialForm = () => ({
    inicial: aCaja(plan.precioInicial),
    precio: aCaja(plan.precioMensual),
    descuento: String(Math.round(plan.descuentoAnual * 100)),
    sucursales: aCaja(plan.sucursales),
    usuarios: aCaja(plan.usuariosInternos),
    pacientes: aCaja(plan.pacientesActivos),
  });
  const [f, setF] = useState(inicialForm);
  const guardar = useAccion(
    (c: CambiosPlan) => guardarPlan(plan.id, c),
    ["planes"],
    `Plan ${plan.nombre} guardado`,
  );

  const precioMensual = leerImporte(f.precio);
  const precioInicial = leerImporte(f.inicial);
  const descuentoNum = Number(f.descuento.trim() === "" ? "0" : f.descuento.replace(",", "."));
  const descuentoAnual =
    Number.isInteger(descuentoNum) && descuentoNum >= 0 && descuentoNum <= 90
      ? descuentoNum / 100
      : Number.NaN;
  const sucursales = leerLimite(f.sucursales);
  const usuariosInternos = leerLimite(f.usuarios);
  const pacientesActivos = leerLimite(f.pacientes);

  const errores: string[] = [];
  if (Number.isNaN(precioMensual) || Number.isNaN(precioInicial))
    errores.push("Los precios tienen que ser números (hasta 2 decimales).");
  if (Number.isNaN(descuentoAnual)) errores.push("El descuento va de 0 a 90 (número entero).");
  if ([sucursales, usuariosInternos, pacientesActivos].some((n) => Number.isNaN(n)))
    errores.push("Los límites son números enteros de 1 en adelante (o vacío = sin límite).");

  // Solo se manda lo que cambió
  const cambios: CambiosPlan = {};
  if (precioMensual !== plan.precioMensual) cambios.precioMensual = precioMensual;
  if (precioInicial !== (plan.precioInicial ?? null)) cambios.precioInicial = precioInicial;
  if (descuentoAnual !== plan.descuentoAnual) cambios.descuentoAnual = descuentoAnual;
  if (sucursales !== limiteDelPlan(plan.sucursales)) cambios.sucursales = sucursales;
  if (usuariosInternos !== limiteDelPlan(plan.usuariosInternos))
    cambios.usuariosInternos = usuariosInternos;
  if (pacientesActivos !== limiteDelPlan(plan.pacientesActivos))
    cambios.pacientesActivos = pacientesActivos;
  const hayCambios = Object.keys(cambios).length > 0;

  const vista = (n: number | null) => (n === null || Number.isNaN(n) ? null : n);
  const anual = precioAnual({
    precioMensual: vista(precioMensual),
    descuentoAnual: Number.isNaN(descuentoAnual) ? 0 : descuentoAnual,
  });
  const lim = (n: number | null) => limiteTexto(vista(n) ?? Number.POSITIVE_INFINITY);

  const campo = (
    id: keyof typeof f,
    label: string,
    icono: React.ReactNode,
    opciones: { sufijo?: string; vacio?: string } = {},
  ) => (
    <div className="space-y-1.5">
      <Label htmlFor={`${plan.id}-${id}`} className="flex items-center gap-1.5 text-xs">
        {icono}
        {label}
      </Label>
      <div className="relative">
        <Input
          id={`${plan.id}-${id}`}
          inputMode="decimal"
          value={f[id]}
          disabled={!editable || guardar.isPending}
          placeholder={opciones.vacio ?? ""}
          onChange={(e) => setF((x) => ({ ...x, [id]: e.target.value.replace(/[^0-9.,]/g, "") }))}
          className="h-10 rounded-xl pr-12"
        />
        {opciones.sufijo && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            {opciones.sufijo}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <Seccion
      titulo={plan.nombre}
      descripcion={`${clinicas} ${clinicas === 1 ? "clínica" : "clínicas"} con este plan`}
      acciones={
        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
          {plan.odontograma === "3D" ? (
            <Box className="h-3 w-3" />
          ) : (
            <Grid2x2 className="h-3 w-3" />
          )}
          Odontograma {plan.odontograma}
          <Lock className="h-3 w-3 opacity-60" />
        </span>
      }
    >
      <div className="rounded-2xl bg-gradient-to-br from-primary/[0.08] to-transparent p-3">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-primary/75">
          Así se ve en la web
        </p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight text-primary">
          {precio(vista(precioMensual))}{" "}
          <span className="text-xs font-semibold text-muted-foreground">/ mes</span>
        </p>
        <p className="text-xs font-semibold text-foreground/80">
          Monto inicial (pago único):{" "}
          {vista(precioInicial) === null ? "sin definir" : precio(vista(precioInicial))}
        </p>
        <p className="text-xs text-muted-foreground">
          Anual: {precio(anual)} / año (
          {Number.isNaN(descuentoAnual) ? "—" : Math.round(descuentoAnual * 100)}% de descuento)
        </p>
        <p className="mt-2 text-[11px] leading-5 text-foreground/80">
          Sucursales: {lim(sucursales)} · Usuarios internos: {lim(usuariosInternos)} · Pacientes
          activos: {lim(pacientesActivos)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          {campo(
            "inicial",
            "Monto inicial · pago único al contratar (USD, sin impuestos)",
            <span className="font-bold text-primary">USD</span>,
            { vacio: "Sin definir" },
          )}
        </div>
        {campo("precio", "Precio mensual (USD, sin impuestos)", <span className="font-bold text-primary">USD</span>, {
          vacio: "Sin definir",
        })}
        {campo("descuento", "Descuento anual", <span className="font-bold text-primary">%</span>, {
          sufijo: "%",
        })}
        {campo("sucursales", "Sucursales", <Building2 className="h-3.5 w-3.5 text-primary" />, {
          vacio: "Sin límite",
        })}
        {campo("usuarios", "Usuarios internos", <Users className="h-3.5 w-3.5 text-primary" />, {
          vacio: "Sin límite",
        })}
        <div className="col-span-2">
          {campo(
            "pacientes",
            "Pacientes activos",
            <UserRound className="h-3.5 w-3.5 text-primary" />,
            { vacio: "Sin límite" },
          )}
        </div>
      </div>

      {editable && errores.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs font-medium text-destructive">
          {errores.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      {editable && (
        <div className="mt-4 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!hayCambios || guardar.isPending}
            onClick={() => setF(inicialForm())}
          >
            Deshacer
          </Button>
          <Button
            size="sm"
            disabled={!hayCambios || errores.length > 0 || guardar.isPending}
            onClick={() => guardar.mutate(cambios)}
          >
            {guardar.isPending ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      )}
    </Seccion>
  );
}
