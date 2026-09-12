import { motion } from "framer-motion";
import { Check, Building2, Users, Headphones, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { plans, type Plan } from "@/lib/site-data";

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
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: index * 0.09, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8 }}
      className={`card-premium relative flex flex-col p-6 transition-shadow duration-300 hover:shadow-glow ${
        plan.featured ? "border-primary/40 ring-2 ring-primary/25" : ""
      }`}
    >
      {plan.featured && (
        <span className="bg-brand absolute -top-3 left-6 rounded-full px-3 py-1 text-[10px] font-bold tracking-wide text-primary-foreground uppercase">
          Más elegido
        </span>
      )}
      <h3 className="font-display text-xl font-bold">{plan.name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

      <div className="mt-5">
        <span className="text-3xl font-bold">{plan.price}</span>
        <span className="text-sm text-muted-foreground"> / mes</span>
        <p className="mt-1 text-xs text-muted-foreground">
          Implementación inicial: {plan.setup}
        </p>
      </div>

      <div className="mt-5 grid gap-2 rounded-xl bg-muted/50 p-3 text-xs">
        <span className="flex items-center gap-2">
          <Building2 className="size-3.5 text-primary" /> {plan.branches}
        </span>
        <span className="flex items-center gap-2">
          <Users className="size-3.5 text-primary" /> {plan.users}
        </span>
        <span className="flex items-center gap-2">
          <Headphones className="size-3.5 text-primary" /> {plan.support}
        </span>
        <span className="flex items-center gap-2">
          <Layers className="size-3.5 text-primary" /> {plan.modules}
        </span>
      </div>

      <ul className="mt-5 flex-1 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="text-muted-foreground">{f}</span>
          </li>
        ))}
      </ul>

      <Button
        className="mt-6 w-full"
        variant={plan.featured ? "hero" : "outlineBrand"}
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
      {plans.map((plan, i) => (
        <PlanCard key={plan.id} plan={plan} index={i} cta={cta} onSelect={onSelect} />
      ))}
    </div>
  );
}
