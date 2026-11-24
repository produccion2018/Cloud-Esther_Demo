import { useId, useRef, useState } from "react";

/* Ubicación: src/components/ui/autocompletar.tsx

   Campo de texto con sugerencias propias (no usa <datalist>, que en el celular casi no se ve).
   Desde la primera letra muestra una lista debajo; se elige con un toque, con el mouse o con
   las flechas + Enter. Se puede escribir cualquier otra cosa: las sugerencias solo ayudan. */

export function Autocompletar({
  value,
  onChange,
  sugerir,
  className,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  /** Devuelve las sugerencias para lo escrito (ya filtradas y ordenadas) */
  sugerir: (texto: string) => string[];
  className?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(-1);
  const id = useId();
  const ref = useRef<HTMLInputElement>(null);
  const opciones = abierto ? sugerir(value) : [];

  const elegir = (o: string) => {
    onChange(o);
    setActivo(-1);
    // Sigue abierto por si la elección lleva a más sugerencias (ej. «pieza 3…»)
    requestAnimationFrame(() => ref.current?.focus());
  };

  return (
    <div className="relative">
      <input
        ref={ref}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setAbierto(true);
          setActivo(-1);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setTimeout(() => setAbierto(false), 120)}
        onKeyDown={(e) => {
          if (!opciones.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActivo((a) => (a + 1) % opciones.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActivo((a) => (a <= 0 ? opciones.length - 1 : a - 1));
          } else if (e.key === "Enter" && activo >= 0) {
            e.preventDefault();
            const o = opciones[activo];
            if (o) elegir(o);
          } else if (e.key === "Escape") {
            setAbierto(false);
          }
        }}
        role="combobox"
        aria-expanded={opciones.length > 0}
        aria-controls={id}
        aria-autocomplete="list"
        aria-label={ariaLabel}
        autoComplete="off"
        className={className}
        placeholder={placeholder}
      />
      {opciones.length > 0 && (
        <ul
          id={id}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-primary/15 bg-card p-1 shadow-[0_18px_40px_-18px_rgba(76,29,149,0.55)]"
        >
          {opciones.map((o, i) => (
            <li key={o} role="option" aria-selected={i === activo}>
              <button
                type="button"
                // onMouseDown para que el toque gane antes de que el campo pierda el foco
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(o);
                }}
                className={`block w-full truncate rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                  i === activo ? "bg-primary text-primary-foreground" : "hover:bg-primary/8"
                }`}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
