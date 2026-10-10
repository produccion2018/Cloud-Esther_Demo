import { motion } from "framer-motion";
import { useState } from "react";
import {
  Check,
  ChevronDown,
  Building2,
  Users,
  UserRound,
  Headphones,
  Layers,
  Crown,
  Settings,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { plans, type Plan } from "@/lib/site-data";
import type { PlanId } from "@/lib/cloud-esther/data";
import {
  formatearPrecio,
  notaCapacidad,
  precioAnual,
  textoLimites,
  useConfigPlanes,
} from "@/lib/cloud-esther/planes-config";

export type CicloPago = "mensual" | "anual";

/** Planes del sitio → planes de la app (los límites y precios salen de la configuración). */
const PLAN_ID: Record<string, PlanId> = {
  esencial: "inicial",
  profesional: "profesional",
  avanzado: "avanzada",
  enterprise: "grupo",
};

/**
 * Configuración visual de cada plan.
 *
 * Start / Pro:
 * configuración básica.
 *
 * Plus / Enterprise:
 * configuración avanzada.
 *
 * La IA está disponible en Plus y Enterprise.
 */
const EXTRAS_POR_PLAN: {
  basica: boolean;
  avanzada: boolean;
  ia: boolean;
}[] = [
  { basica: true, avanzada: false, ia: false },
  { basica: true, avanzada: false, ia: false },
  { basica: false, avanzada: true, ia: true },
  { basica: false, avanzada: true, ia: true },
];

/** Funcionalidades visibles antes de "Ver más": mantiene las cards compactas
 *  y de altura pareja aunque cada plan tenga una lista de distinto largo. */
const FUNCIONALIDADES_VISIBLES = 8;

export function PlanCard({
  plan,
  index,
  cta = "Elegir plan",
  onSelect,
  precio,
  notaPrecio,
  actual = false,
  ciclo = "mensual",
}: {
  plan: Plan;
  index: number;
  cta?: string | undefined;
  onSelect?: ((plan: Plan) => void) | undefined;
  /** Precio a mostrar (dentro de la app; en el sitio público los precios no se muestran). */
  precio?: string | undefined;
  notaPrecio?: string | undefined;
  /** Marca el plan que tiene contratado la clínica. */
  actual?: boolean | undefined;
  /** Modalidad de pago para el precio mostrado (el anual tiene descuento). */
  ciclo?: CicloPago | undefined;
}) {
  const planId = PLAN_ID[plan.id] ?? "inicial";
  const config = useConfigPlanes()[planId];
  const limites = textoLimites(config);
  const anual = precioAnual(config);
  const descuento = Math.round(config.descuentoAnual * 100);
  // Sin precio cargado desde el panel (backend) no se muestra ningún monto ni marcador.
  const monto = ciclo === "anual" ? anual : config.precioMensual;
  const mostrarPrecio = precio !== undefined || monto !== null;
  const isEnterprise = plan.id === "enterprise";
  const extras = EXTRAS_POR_PLAN[index] ?? EXTRAS_POR_PLAN[0];
  const [verTodas, setVerTodas] = useState(false);
  const ocultas = plan.features.length - FUNCIONALIDADES_VISIBLES;
  const funcionalidades =
    verTodas || ocultas <= 0 ? plan.features : plan.features.slice(0, FUNCIONALIDADES_VISIBLES);

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.55,
        delay: index * 0.09,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -8 }}
      className={`card-premium relative flex flex-col gap-5 p-6 pt-8 transition-shadow duration-300 hover:shadow-glow md:row-span-4 md:grid md:grid-rows-subgrid md:gap-5 ${
        actual || (plan.featured && !precio) ? "border-primary/40 ring-2 ring-primary/25" : ""
      }`}
    >
      {isEnterprise && (
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-primary/25 via-transparent to-brand/25" />
      )}

      {(actual || (plan.featured && !precio)) && (
        <div className="absolute -top-4 left-6 z-20">
          <motion.span
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute inset-0 rounded-full bg-primary/50 blur-md"
          />

          <span className="relative block whitespace-nowrap rounded-full bg-brand px-4 py-1.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground shadow-lift">
            {actual ? "Tu plan" : "Más elegido"}
          </span>
        </div>
      )}

      <div className="relative">
        {isEnterprise && (
          <span className="relative inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/25 bg-lavender px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-lavender-foreground">
            <Crown className="size-3" />
            Enterprise
          </span>
        )}

        <h3 className="relative mt-3 font-display text-xl font-bold tracking-tight">{plan.name}</h3>

        <p className="relative mt-1 text-[13px] leading-relaxed text-muted-foreground">
          {plan.tagline}
        </p>

        {/* Precio: lo define Cloud Esther desde el panel administrativo (backend). */}
        {mostrarPrecio && (
          <p className="relative mt-3 flex flex-wrap items-baseline gap-1">
            <span className="font-display text-3xl font-bold tracking-tight text-primary">
              {precio ?? formatearPrecio(monto)}
            </span>
            <span className="text-xs text-muted-foreground">
              {precio ? notaPrecio : ciclo === "anual" ? "/ año" : "/ mes"}
            </span>
          </p>
        )}
        {/* Monto inicial: pago único al contratar (también lo define el panel). */}
        {!precio && config.precioInicial !== null && (
          <p className="relative mt-1 text-[12px] font-semibold text-foreground/80">
            + {formatearPrecio(config.precioInicial)} de monto inicial (pago único al contratar)
          </p>
        )}
        {!precio && monto !== null && ciclo === "anual" && (
          <p className="relative mt-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
            {descuento}% de descuento pagando anual
          </p>
        )}

        {/* Capacidad incluida: siempre visible en la card, antes de contratar. */}
        <div className="relative mt-4 rounded-xl border border-primary/20 bg-primary/[0.05] p-3">
          <p className="flex items-center gap-2 text-[12px] font-semibold leading-5 text-foreground">
            <Building2 className="size-3.5 shrink-0 text-primary" />
            {limites.sucursales}
          </p>
          <p className="flex items-center gap-2 text-[12px] font-semibold leading-5 text-foreground">
            <Users className="size-3.5 shrink-0 text-primary" />
            {limites.usuarios}
          </p>
          <p className="flex items-center gap-2 text-[12px] font-semibold leading-5 text-foreground">
            <UserRound className="size-3.5 shrink-0 text-primary" />
            {limites.pacientes}
          </p>
          <p className="mt-1.5 text-[10.5px] leading-4 text-muted-foreground">
            {notaCapacidad(planId)}
          </p>
        </div>
      </div>

      {/* Resumen del plan */}
      <div className="relative grid content-start gap-1.5 rounded-xl bg-muted/50 p-3.5">
        <span className="flex items-center gap-2 text-[11px] font-medium leading-5 text-foreground/80">
          <Headphones className="size-3.5 shrink-0 text-primary" />
          {plan.support}
        </span>

        <span className="flex items-center gap-2 text-[11px] font-medium leading-5 text-foreground/80">
          <Layers className="size-3.5 shrink-0 text-primary" />
          {plan.modules}
        </span>

        {extras.basica && (
          <span className="flex items-center gap-2 text-[11px] font-medium leading-5 text-foreground/80">
            <Settings className="size-3.5 shrink-0 text-primary" />
            Configuración básica
          </span>
        )}

        {extras.avanzada && (
          <span className="flex items-center gap-2 text-[11px] font-medium leading-5 text-foreground/80">
            <SlidersHorizontal className="size-3.5 shrink-0 text-primary" />
            Configuración avanzada
          </span>
        )}

        {extras.ia && (
          <span className="flex items-center gap-2 text-[11px] font-medium leading-5 text-foreground/80">
            <Sparkles className="size-3.5 shrink-0 text-primary" />
            Inteligencia artificial
          </span>
        )}
      </div>

      {/* Funcionalidades */}
      <div className="relative flex-1">
        <ul className="space-y-2">
          {funcionalidades.map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-[13px] leading-5">
              <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />

              <span className="text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>

        {ocultas > 0 && (
          <button
            type="button"
            onClick={() => setVerTodas((v) => !v)}
            aria-expanded={verTodas}
            className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-primary hover:underline"
          >
            {verTodas ? "Ver menos" : `Ver ${ocultas} más`}
            <ChevronDown
              className={`size-3.5 transition-transform ${verTodas ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      <Button
        className="relative w-full self-end"
        variant={actual ? "outlineBrand" : plan.featured || isEnterprise ? "hero" : "outlineBrand"}
        disabled={actual}
        onClick={() => onSelect?.(plan)}
      >
        {cta}
      </Button>
    </motion.div>
  );
}

export function PlanGrid({
  cta,
  onSelect,
}: {
  cta?: string | undefined;
  onSelect?: ((plan: Plan, ciclo: CicloPago) => void) | undefined;
}) {
  const [ciclo, setCiclo] = useState<CicloPago>("mensual");
  const configs = useConfigPlanes();
  const descuento = Math.round(configs.inicial.descuentoAnual * 100);
  // Mensual/anual solo tiene sentido cuando hay precios cargados desde el panel.
  const hayPrecios = Object.values(configs).some((c) => c.precioMensual !== null);
  return (
    <div>
      <div className={hayPrecios ? "mb-8 flex justify-center" : "hidden"}>
        <div
          className="inline-flex items-center rounded-full border border-primary/20 bg-card p-1 shadow-sm"
          role="radiogroup"
          aria-label="Modalidad de pago"
        >
          {(
            [
              ["mensual", "Mensual"],
              ["anual", "Anual"],
            ] as const
          ).map(([id, l]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={ciclo === id}
              onClick={() => setCiclo(id)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                ciclo === id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {l}
              {id === "anual" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    ciclo === id
                      ? "bg-white/25 text-primary-foreground"
                      : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                  }`}
                >
                  −{descuento}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan, index) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            index={index}
            cta={cta}
            ciclo={ciclo}
            onSelect={onSelect ? (p) => onSelect(p, ciclo) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
