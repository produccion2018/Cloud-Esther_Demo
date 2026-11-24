export function renderErrorPage(): string {
  // Error del servidor (poco común): se reintenta solo una vez; si sigue, un cartel prolijo en español.
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <title>Cloud Esther</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#6d28d9" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <style>
      body { font: 15px/1.5 "Plus Jakarta Sans", system-ui, -apple-system, sans-serif; background: radial-gradient(ellipse at top, rgba(124,58,237,.12), transparent 60%), #faf8ff; color: #1e1b2e; display: grid; place-items: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
      .card { max-width: 22rem; width: 100%; text-align: center; padding: 2rem 1.75rem; background: #fff; border: 1px solid rgba(124,58,237,.15); border-radius: 1.5rem; box-shadow: 0 30px 60px -35px rgba(76,29,149,.55); }
      img { width: 48px; height: 48px; }
      h1 { font-size: 1.15rem; margin: 1rem 0 .5rem; }
      p { color: #6b6880; margin: 0 0 1.5rem; font-size: .92rem; }
      .actions { display: flex; gap: .5rem; justify-content: center; flex-wrap: wrap; }
      a, button { padding: .6rem 1.2rem; border-radius: 999px; font: inherit; font-weight: 600; font-size: .9rem; cursor: pointer; text-decoration: none; border: 1px solid transparent; }
      .primary { background: linear-gradient(135deg, #7c3aed, #c026d3); color: #fff; }
      .secondary { background: #fff; color: #6d28d9; border-color: rgba(124,58,237,.3); }
      .spin { display: none; }
      body.auto .card { display: none; }
      body.auto .spin { display: grid; place-items: center; gap: 1rem; color: #6b6880; }
      .ring { width: 56px; height: 56px; border-radius: 50%; border: 3px solid rgba(124,58,237,.15); border-top-color: #7c3aed; animation: g 0.8s linear infinite; }
      @keyframes g { to { transform: rotate(360deg); } }
    </style>
    <script>
      (function () {
        try {
          var t = +(sessionStorage.getItem("ce-recarga-srv") || 0);
          if (Date.now() - t > 20000) {
            sessionStorage.setItem("ce-recarga-srv", String(Date.now()));
            document.documentElement.className = "auto";
            setTimeout(function () { location.reload(); }, 900);
          }
        } catch (e) {}
      })();
    </script>
  </head>
  <body>
    <script>if (document.documentElement.className === "auto") document.body.className = "auto";</script>
    <div class="spin"><div class="ring"></div><div>Cargando…</div></div>
    <div class="card">
      <img src="/favicon.svg" alt="" />
      <h1>Estamos actualizando la página</h1>
      <p>Tocá «Recargar» y seguís donde estabas. Tus datos están guardados.</p>
      <div class="actions">
        <button class="primary" onclick="location.reload()">Recargar</button>
        <a class="secondary" href="/">Ir al inicio</a>
      </div>
    </div>
  </body>
</html>`;
}
