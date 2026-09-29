import { motion } from "framer-motion";
import {
  Check,
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

/**
 * Configuración visual de cada plan.
 *
 * Start / Pro:
 * configuración básica o heredada.
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
  { basica: false, avanzada: true, ia: false },
  { basica: false, avanzada: true, ia: true },
  { basica: false, avanzada: true, ia: true },
];

export function PlanCard({
  plan,
  index,
  cta = "Elegir plan",
  onSelect,
}: {
  plan: Plan;
  index: number;
  cta?: string | undefined;
  onSelect?: ((plan: Plan) => void) | undefined;
}) {
  const isEnterprise = plan.id === "enterprise";
  const extras = EXTRAS_POR_PLAN[index] ?? EXTRAS_POR_PLAN[0];

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
      className={`card-premium relative flex flex-col p-6 pt-8 transition-shadow duration-300 hover:shadow-glow ${
        plan.featured ? "border-primary/40 ring-2 ring-primary/25" : ""
      }`}
    >
      {isEnterprise && (
        <div className="pointer-events-none absolute inset-0 rounded-[inherit] bg-gradient-to-br from-primary/25 via-transparent to-brand/25" />
      )}

      {plan.featured && (
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
            Más elegido
          </span>
        </div>
      )}

      {isEnterprise && (
        <span className="relative inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/25 bg-lavender px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-lavender-foreground">
          <Crown className="size-3" />
          Enterprise
        </span>
      )}

      <h3 className="relative mt-3 font-display text-xl font-bold tracking-tight">
        {plan.name}
      </h3>

      <p className="relative mt-1 text-[13px] leading-relaxed text-muted-foreground">
        {plan.tagline}
      </p>

      {/* Resumen del plan */}
      <div className="relative mt-5 grid gap-1.5 rounded-xl bg-muted/50 p-3.5">
        <span className="flex items-center gap-2 text-[11px] font-medium leading-5 text-foreground/80">
          <Building2 className="size-3.5 shrink-0 text-primary" />
          {plan.branches}
        </span>

        <span className="flex items-center gap-2 text-[11px] font-medium leading-5 text-foreground/80">
          <Users className="size-3.5 shrink-0 text-primary" />
          {plan.users}
        </span>

        <span className="flex items-center gap-2 text-[11px] font-medium leading-5 text-foreground/80">
          <UserRound className="size-3.5 shrink-0 text-primary" />
          {plan.externalUsers}
        </span>

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
      <ul className="relative mt-5 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li
            key={feature}
            className="flex items-start gap-2 text-[13px] leading-5"
          >
            <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />

            <span className="text-muted-foreground">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <Button
        className="relative mt-6 w-full"
        variant={plan.featured || isEnterprise ? "hero" : "outlineBrand"}
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
  onSelect?: ((plan: Plan) => void) | undefined;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((plan, index) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          index={index}
          cta={cta}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}