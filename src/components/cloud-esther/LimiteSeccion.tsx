import { Component, type ReactNode } from "react";

/* Error boundary del contenido: si una sección falla (por ejemplo con una clínica recién creada,
   sin datos), NO deja la pantalla en blanco ni muestra el cartel genérico "This page didn't load".
   Muestra un mensaje claro y mantiene el menú, para poder seguir navegando.
   Además muestra el detalle técnico del error (chico), para poder diagnosticar qué falló. */
export class LimiteSeccion extends Component<
  { children: ReactNode },
  { error: boolean; detalle: string }
> {
  state = { error: false, detalle: "" };

  static getDerivedStateFromError(error: unknown) {
    const msg =
      error instanceof Error ? error.message : typeof error === "string" ? error : String(error);
    return { error: true, detalle: msg };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string }) {
    console.error(error, info?.componentStack);
    const primeraLinea = (info?.componentStack ?? "").trim().split("\n")[0]?.trim() ?? "";
    if (primeraLinea) this.setState((s) => ({ ...s, detalle: `${s.detalle} · en ${primeraLinea}` }));
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-[60vh] place-items-center px-4">
          <div className="max-w-md text-center">
            <p className="text-lg font-semibold text-foreground">Esta sección no se pudo mostrar</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Puede estar vacía o algo falló al cargar. Probá recargar; si sigue, elegí otra sección
              en el menú.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              Recargar
            </button>
            {this.state.detalle && (
              <p className="mt-4 break-words rounded-lg bg-muted/60 px-3 py-2 text-left font-mono text-[11px] leading-snug text-muted-foreground">
                Detalle: {this.state.detalle}
              </p>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
