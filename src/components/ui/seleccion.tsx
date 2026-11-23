import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";

/* Ubicación: src/components/ui/seleccion.tsx
   SELECTOR PREMIUM: reemplaza al <select> del sistema (que en el celular abre la lista gris de
   Android/iPhone). Se usa IGUAL que un <select>: mismas props (value, defaultValue, onChange,
   className, disabled, name, id…) y los mismos <option> / <optgroup> adentro. onChange recibe
   un evento con e.target.value (texto), igual que antes, así que no cambia nada de la lógica.
   · Lista flotante con el diseño de Cloud Esther, tilde en lo elegido y buscador si hay muchas
     opciones. Funciona con teclado (flechas, Enter, Escape) y con lectores de pantalla.
   · Si tiene name, manda el valor en los formularios (input oculto). */

type Opcion = { value: string; label: string; disabled: boolean; hidden: boolean; grupo?: string | undefined };

function texto(nodo: React.ReactNode): string {
  if (nodo === null || nodo === undefined || typeof nodo === "boolean") return "";
  if (typeof nodo === "string" || typeof nodo === "number") return String(nodo);
  if (Array.isArray(nodo)) return nodo.map(texto).join("");
  if (React.isValidElement(nodo)) return texto((nodo.props as { children?: React.ReactNode }).children);
  return "";
}

function leerOpciones(children: React.ReactNode, grupo?: string, out: Opcion[] = []): Opcion[] {
  React.Children.forEach(children, (hijo) => {
    if (!React.isValidElement(hijo)) return;
    const p = hijo.props as {
      value?: unknown;
      children?: React.ReactNode;
      disabled?: boolean;
      hidden?: boolean;
      label?: string;
    };
    if (hijo.type === "option") {
      const label = texto(p.children);
      out.push({
        value: p.value === undefined ? label : String(p.value),
        label,
        disabled: !!p.disabled,
        hidden: !!p.hidden,
        grupo,
      });
    } else if (hijo.type === "optgroup") {
      leerOpciones(p.children, p.label, out);
    } else if (hijo.type === React.Fragment) {
      leerOpciones(p.children, grupo, out);
    }
  });
  return out;
}

type Props = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "defaultValue"> & {
  value?: string | number | readonly string[];
  defaultValue?: string | number | readonly string[];
};

export const Seleccion = React.forwardRef<HTMLButtonElement, Props>(function Seleccion(
  {
    value,
    defaultValue,
    onChange,
    onBlur,
    children,
    className,
    disabled,
    name,
    id,
    required,
    style,
    title,
    ...resto
  },
  ref,
) {
  const opciones = React.useMemo(() => leerOpciones(children), [children]);
  const controlado = value !== undefined;
  const [interno, setInterno] = React.useState<string>(() =>
    defaultValue !== undefined ? String(defaultValue) : (opciones.find((o) => !o.disabled)?.value ?? ""),
  );
  const actual = controlado ? String(value) : interno;
  const elegida = opciones.find((o) => o.value === actual) ?? (actual === "" ? undefined : undefined);
  const visibles = opciones.filter((o) => !o.hidden);

  const [abierto, setAbierto] = React.useState(false);
  const [busca, setBusca] = React.useState("");
  const [marcada, setMarcada] = React.useState(0);
  const lista = React.useRef<HTMLDivElement>(null);
  const conBuscador = visibles.length > 9;
  const filtradas = busca.trim()
    ? visibles.filter((o) => o.label.toLowerCase().includes(busca.trim().toLowerCase()))
    : visibles;

  React.useEffect(() => {
    if (!abierto) {
      setBusca("");
      return;
    }
    const i = filtradas.findIndex((o) => o.value === actual);
    setMarcada(i >= 0 ? i : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);
  React.useEffect(() => {
    if (!abierto) return;
    // Solo mueve la lista (no la página) para que la opción marcada quede a la vista.
    const caja = lista.current;
    const el = caja?.querySelector<HTMLElement>(`[data-i="${marcada}"]`);
    if (!caja || !el) return;
    if (el.offsetTop < caja.scrollTop) caja.scrollTop = el.offsetTop;
    else if (el.offsetTop + el.offsetHeight > caja.scrollTop + caja.clientHeight)
      caja.scrollTop = el.offsetTop + el.offsetHeight - caja.clientHeight;
  }, [marcada, abierto]);

  const elegir = (o: Opcion) => {
    if (o.disabled) return;
    if (!controlado) setInterno(o.value);
    setAbierto(false);
    if (o.value !== actual && onChange) {
      const objetivo = { value: o.value, name: name ?? "", id: id ?? "" };
      onChange({ target: objetivo, currentTarget: objetivo } as unknown as React.ChangeEvent<HTMLSelectElement>);
    }
  };

  const teclas = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMarcada((m) => Math.min(filtradas.length - 1, m + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMarcada((m) => Math.max(0, m - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const o = filtradas[marcada];
      if (o) elegir(o);
    }
  };

  // El <select> de antes traía su flechita del sistema; si la clase dice appearance-none, la
  // pantalla ya dibuja su propia flecha al lado y no se repite.
  const flechaPropia = !(className ?? "").includes("appearance-none");
  let grupoAnterior: string | undefined;

  return (
    <PopoverPrimitive.Root
      open={abierto}
      onOpenChange={(o) => {
        setAbierto(o);
        if (!o && onBlur) {
          const objetivo = { value: actual, name: name ?? "", id: id ?? "" };
          onBlur({ target: objetivo, currentTarget: objetivo } as unknown as React.FocusEvent<HTMLSelectElement>);
        }
      }}
    >
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          ref={ref}
          type="button"
          id={id}
          title={title ?? elegida?.label}
          role="combobox"
          aria-expanded={abierto}
          aria-haspopup="listbox"
          aria-required={required || undefined}
          aria-label={resto["aria-label"]}
          aria-labelledby={resto["aria-labelledby"]}
          aria-describedby={resto["aria-describedby"]}
          data-seleccion=""
          style={style}
          onKeyDown={(e) => {
            if (!abierto && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
              e.preventDefault();
              setAbierto(true);
            }
          }}
          className={cn(
            "inline-flex min-w-0 items-center gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60",
            className,
            "cursor-pointer",
          )}
        >
          <span className={cn("min-w-0 flex-1 truncate", !elegida?.label && "text-muted-foreground")}>
            {elegida?.label || "Elegí una opción"}
          </span>
          {flechaPropia && (
            <ChevronDown
              aria-hidden="true"
              className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", abierto && "rotate-180")}
            />
          )}
        </button>
      </PopoverPrimitive.Trigger>
      {name && <input type="hidden" name={name} value={actual} />}
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={6}
          collisionPadding={10}
          onKeyDown={teclas}
          onOpenAutoFocus={(e) => {
            if (!conBuscador) {
              e.preventDefault();
              lista.current?.focus();
            }
          }}
          className="z-[300] min-w-[var(--radix-popover-trigger-width)] max-w-[min(92vw,26rem)] overflow-hidden rounded-2xl border border-primary/15 bg-card p-1.5 text-foreground shadow-[0_24px_60px_-20px_rgba(76,29,149,0.45)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          {conBuscador && (
            <div className="relative mb-1.5">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                value={busca}
                onChange={(e) => {
                  setBusca(e.target.value);
                  setMarcada(0);
                }}
                placeholder="Buscar…"
                className="h-10 w-full rounded-xl border border-primary/15 bg-background pl-9 pr-3 text-[14px] outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              />
            </div>
          )}
          <div
            ref={lista}
            tabIndex={-1}
            role="listbox"
            aria-label={resto["aria-label"]}
            className="relative max-h-[min(60vh,18rem)] overflow-y-auto overscroll-contain outline-none [scrollbar-width:thin]"
          >
            {filtradas.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">Sin resultados</p>}
            {filtradas.map((o, i) => {
              const titulo = o.grupo && o.grupo !== grupoAnterior ? o.grupo : null;
              grupoAnterior = o.grupo;
              const sel = o.value === actual;
              return (
                <React.Fragment key={`${o.grupo ?? ""}-${o.value}-${i}`}>
                  {titulo && (
                    <p className="px-3 pb-1 pt-2 text-[10.5px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                      {titulo}
                    </p>
                  )}
                  <div
                    role="option"
                    data-i={i}
                    aria-selected={sel}
                    aria-disabled={o.disabled || undefined}
                    onMouseEnter={() => setMarcada(i)}
                    onClick={() => elegir(o)}
                    className={cn(
                      "flex min-h-11 cursor-pointer select-none items-center justify-between gap-3 rounded-xl px-3 py-2 text-[14px] transition-colors",
                      i === marcada && !o.disabled && "bg-primary/[0.07]",
                      sel && "font-semibold text-primary",
                      o.disabled && "cursor-not-allowed opacity-45",
                    )}
                  >
                    <span className="min-w-0 break-words">{o.label || "—"}</span>
                    {sel && <Check className="size-4 shrink-0" />}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
});
