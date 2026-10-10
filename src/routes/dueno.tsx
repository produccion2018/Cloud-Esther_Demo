import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Crown, KeyRound, Loader2, LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicLayout } from "@/components/site/PublicLayout";
import {
  activarModoDueno,
  salirModoDueno,
  useModoDueno,
} from "@/lib/cloud-esther/demo-seguimiento";

/* Ubicación: src/routes/dueno.tsx
   Entrada exclusiva del dueño de Cloud Esther: con su código usa el SaaS sin límite de tiempo
   y sus visitas no se cuentan como demos. No hay enlaces a esta página en la web. */

export const Route = createFileRoute("/dueno")({
  head: () => ({
    meta: [
      { title: "Acceso del dueño | Cloud Esther" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AccesoDueno,
});

function AccesoDueno() {
  const activo = useModoDueno();
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [probando, setProbando] = useState(false);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setProbando(true);
    const ok = await activarModoDueno(codigo);
    setProbando(false);
    if (!ok) setError("El código no es correcto.");
    else setCodigo("");
  };

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-soft">
        <div className="relative mx-auto max-w-md px-5 py-20">
          <div className="rounded-[28px] border border-primary/15 bg-card p-7 shadow-xl">
            <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Crown className="size-6" />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight">Acceso del dueño</h1>

            {activo ? (
              <>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Modo dueño activo en este navegador: usás el SaaS sin límite de tiempo y tus
                  visitas no se cuentan como demos en el panel. Dura 30 días o hasta que salgas.
                </p>
                <div className="mt-6 grid gap-2">
                  <Link to={"/demo" as never} className="btn-ce !h-11">
                    Entrar al SaaS <ArrowRight className="size-4" />
                  </Link>
                  <button type="button" onClick={salirModoDueno} className="btn-ce-outline !h-10">
                    <LogOut className="size-4" /> Salir del modo dueño
                  </button>
                  <Link to={"/acceso-prueba" as never} className="btn-ce-outline !h-10">
                    Probar los 4 perfiles (propietario, clínica, profesional y paciente)
                  </Link>
                </div>
              </>
            ) : (
              <form onSubmit={(e) => void enviar(e)} className="mt-2 space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Ingresá tu código de dueño para usar el SaaS sin el límite de tiempo del demo.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="codigo">Código de dueño</Label>
                  <Input
                    id="codigo"
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value)}
                    placeholder="CE-XXXX-XXXX-XXXX"
                    autoComplete="off"
                    autoCapitalize="characters"
                  />
                </div>
                {error && (
                  <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={probando || !codigo.trim()}>
                  {probando ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <KeyRound className="mr-2 size-4" />
                  )}
                  Activar modo dueño
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
