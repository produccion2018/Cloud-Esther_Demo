import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PublicLayout } from "@/components/site/PublicLayout";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión | Cloud Esther" },
      {
        name: "description",
        content: "Accedé al panel de gestión de tu clínica odontológica en Cloud Esther.",
      },
      { property: "og:title", content: "Iniciar sesión en Cloud Esther" },
      { property: "og:description", content: "Bienvenido nuevamente a tu panel de gestión." },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-soft">
        <div className="bg-glow pointer-events-none absolute inset-x-0 top-0 h-96" />
        <div className="relative mx-auto max-w-md px-5 py-20 lg:py-28">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="card-premium p-7 lg:p-9"
          >
            <h1 className="text-2xl font-bold lg:text-3xl">Bienvenido nuevamente.</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Ingresá a tu panel de Cloud Esther.
            </p>

            <form
              className="mt-8 space-y-5"
              onSubmit={(e) => {
                e.preventDefault();
                navigate({ to: "/demo" });
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input id="email" type="email" required placeholder="paula@clinica.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pass">Contraseña</Label>
                <Input id="pass" type="password" required placeholder="••••••••" />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <Checkbox id="remember" /> Recordarme
                </label>
                <span className="cursor-pointer text-sm font-medium text-primary hover:underline">
                  ¿Olvidaste tu contraseña?
                </span>
              </div>

              <Button type="submit" variant="hero" size="xl" className="w-full">
                Ingresar <ArrowRight className="size-4" />
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              ¿Todavía no tenés una cuenta?{" "}
              <Link to="/registro" className="font-medium text-primary hover:underline">
                Crear cuenta
              </Link>
            </p>
          </motion.div>
        </div>
      </section>
    </PublicLayout>
  );
}
