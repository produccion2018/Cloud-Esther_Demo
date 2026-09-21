import { motion } from "framer-motion";
import { Check, Building2, Users, Headphones, Layers, Crown } from "lucide-react";
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
  const isEnterprise = plan.id === "enterprise";

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay: index * 0.09, ease: [0.22, 1, 0.36, 1] }}
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
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 rounded-full bg-primary/50 blur-md"
          />
          <span className="bg-brand relative block whitespace-nowrap rounded-full px-4 py-1.5 text-[10px] font-bold tracking-wide text-primary-foreground uppercase shadow-lift">
            Más elegido
          </span>
        </div>
      )}

      {isEnterprise && (
        <span className="relative inline-flex w-fit items-center gap-1.5 rounded-full border border-primary/25 bg-lavender px-3 py-1 text-[10px] font-bold tracking-wide text-lavender-foreground uppercase">
          <Crown className="size-3" /> Premium
        </span>
      )}

      <h3 className="relative mt-3 font-display text-xl font-bold">{plan.name}</h3>
      <p className="relative mt-1 text-sm text-muted-foreground">{plan.tagline}</p>

      {/* Precio + "/ mes + IVA" en la misma línea, con el IVA más chico */}
      <div className="relative mt-5 flex flex-nowrap items-baseline gap-1.5 whitespace-nowrap">
        <span className="text-4xl font-extrabold tracking-tight lg:text-[2.75rem] xl:text-4xl">
          {plan.price}
        </span>
        <span className="shrink-0 text-xs font-medium leading-none text-muted-foreground">
          / mes + IVA
        </span>
      </div>
      <p className="relative mt-1.5 text-xs text-muted-foreground">
        Implementación inicial:{" "}
        <span className="font-medium text-foreground">{plan.setup}</span>{" "}
        <span className="text-muted-foreground/70">+ IVA</span>
      </p>

      <div className="relative mt-5 grid gap-2 rounded-xl bg-muted/50 p-3 text-xs">
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

      <ul className="relative mt-5 flex-1 space-y-2.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="text-muted-foreground">{f}</span>
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
      {plans.map((plan, i) => (
        <PlanCard key={plan.id} plan={plan} index={i} cta={cta} onSelect={onSelect} />
      ))}
    </div>
  );
}