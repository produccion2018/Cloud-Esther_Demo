import { useEffect, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Copy, KeyRound, Loader2, MailCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  credencialesDemo,
  solicitarRecuperacion,
  type CredencialDemo,
} from "@/lib/cloud-esther/auth-store";

/* Accesos del login: tarjeta con los datos del demo (solo si en este navegador se creó una
   cuenta de prueba) y la ventana de «¿Olvidaste tu contraseña?». */

export function useCredencialesDemo() {
  const [lista, setLista] = useState<CredencialDemo[]>([]);
  useEffect(() => setLista(credencialesDemo()), []);
  return lista;
}

export function TarjetaDemo({
  credenciales,
  onUsar,
}: {
  credenciales: CredencialDemo[];
  onUsar: (c: CredencialDemo) => void;
}) {
  const [copiado, setCopiado] = useState("");
  if (!credenciales.length) return null;
  return (
    <div className="rounded-2xl border border-primary/15 bg-lavender/60 p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-primary">
        <KeyRound className="size-3.5" /> Datos de tu demo
      </p>
      <ul className="mt-2.5 space-y-2">
        {credenciales.map((c) => (
          <li key={c.email} className="rounded-xl border border-primary/10 bg-background/90 p-3">
            <p className="truncate text-xs font-semibold">{c.clinica}</p>
            <dl className="mt-1.5 grid grid-cols-[auto_1fr_auto] items-center gap-x-2 gap-y-1 text-xs">
              <dt className="text-muted-foreground">Correo</dt>
              <dd className="truncate font-medium">{c.email}</dd>
              <span />
              <dt className="text-muted-foreground">Contraseña</dt>
              <dd className="truncate font-mono font-semibold tracking-wide text-foreground">
                {c.pass}
              </dd>
              <button
                type="button"
                aria-label="Copiar contraseña"
                onClick={() => {
                  void navigator.clipboard?.writeText(c.pass);
                  setCopiado(c.email);
                  window.setTimeout(() => setCopiado(""), 1500);
                }}
                className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-lavender hover:text-primary"
              >
                {copiado === c.email ? (
                  <Check className="size-3.5" />
                ) : (
                  <Copy className="size-3.5" />
                )}
              </button>
            </dl>
            <button
              type="button"
              onClick={() => onUsar(c)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Usar estos datos <ArrowRight className="size-3" />
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[10.5px] leading-4 text-muted-foreground">
        Solo para el entorno de demostración. Las cuentas reales no guardan la contraseña en el
        navegador.
      </p>
    </div>
  );
}

export function RecuperarClave({
  emailInicial,
  onClose,
  onUsarDemo,
}: {
  emailInicial: string;
  onClose: () => void;
  onUsarDemo: (c: CredencialDemo) => void;
}) {
  const [email, setEmail] = useState(emailInicial);
  const [estado, setEstado] = useState<"form" | "enviando" | "listo">("form");
  const [demo, setDemo] = useState<CredencialDemo | null>(null);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEstado("enviando");
    const r = await solicitarRecuperacion(email);
    setDemo(r.demo);
    setEstado("listo");
  };

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center bg-black/40 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Recuperar contraseña"
        initial={{ opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-md rounded-[1.5rem] border border-primary/10 bg-background p-6 shadow-[0_25px_75px_rgba(88,28,135,0.25)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-lavender text-primary">
            {estado === "listo" ? (
              <MailCheck className="size-5" />
            ) : (
              <KeyRound className="size-5" />
            )}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-lavender hover:text-primary"
          >
            <X className="size-4" />
          </button>
        </div>
        <AnimatePresence mode="wait">
          {estado !== "listo" ? (
            <motion.form
              key="f"
              exit={{ opacity: 0 }}
              onSubmit={(e) => void enviar(e)}
              className="mt-4 space-y-4"
            >
              <div>
                <h2 className="text-xl font-bold tracking-tight">¿Olvidaste tu contraseña?</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Ingresá el correo de tu cuenta y te enviamos un enlace para crear una nueva.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rec-email" className="text-sm font-semibold">
                  Correo electrónico
                </Label>
                <Input
                  id="rec-email"
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="esther.mendez@esther.com"
                  className="h-11 rounded-xl"
                />
              </div>
              <Button
                type="submit"
                variant="hero"
                className="h-11 w-full rounded-xl"
                disabled={estado === "enviando"}
              >
                {estado === "enviando" ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Enviando…
                  </>
                ) : (
                  <>
                    Enviar enlace <ArrowRight className="size-4" />
                  </>
                )}
              </Button>
            </motion.form>
          ) : (
            <motion.div
              key="ok"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 space-y-4"
            >
              {demo ? (
                <>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Es una cuenta de demo</h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Para el demo no hace falta un correo: esta es tu contraseña de prueba.
                    </p>
                  </div>
                  <div className="rounded-xl border border-primary/15 bg-lavender/60 px-4 py-3">
                    <p className="text-xs text-muted-foreground">{demo.email}</p>
                    <p className="mt-0.5 font-mono text-lg font-semibold tracking-wide">
                      {demo.pass}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="hero"
                    className="h-11 w-full rounded-xl"
                    onClick={() => {
                      onUsarDemo(demo);
                      onClose();
                    }}
                  >
                    Completar el ingreso <ArrowRight className="size-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Revisá tu correo</h2>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Si <b className="text-foreground">{email}</b> corresponde a una cuenta de
                      Cloud Esther, vas a recibir un enlace para crear una contraseña nueva.
                    </p>
                  </div>
                  <ol className="space-y-2 text-sm">
                    {[
                      "Abrí el correo de Cloud Esther (revisá también spam o promociones).",
                      "Tocá «Crear nueva contraseña». El enlace vence en 30 minutos.",
                      "Elegí la contraseña nueva y volvé a iniciar sesión.",
                    ].map((t, i) => (
                      <li key={t} className="flex gap-2.5">
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                          {i + 1}
                        </span>
                        <span className="text-muted-foreground">{t}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outlineBrand"
                      className="h-10 flex-1 rounded-xl"
                      onClick={() => setEstado("form")}
                    >
                      Usar otro correo
                    </Button>
                    <Button
                      type="button"
                      variant="hero"
                      className="h-10 flex-1 rounded-xl"
                      onClick={onClose}
                    >
                      Volver al ingreso
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
