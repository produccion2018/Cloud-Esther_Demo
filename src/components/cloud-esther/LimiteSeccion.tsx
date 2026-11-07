import { Component, type ReactNode } from "react";

/* Error boundary del contenido: si una sección falla (por ejemplo con una clínica recién creada,
   sin datos), NO deja la pantalla en blanco ni muestra el cartel genérico "This page didn't load".
   Muestra un mensaje claro y mantiene el menú, para poder seguir navegando. */
export class LimiteSeccion extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };

  static getDerivedStateFromError() {
    return { error: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
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
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
