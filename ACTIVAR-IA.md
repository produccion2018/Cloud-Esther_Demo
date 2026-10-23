# Activar la IA real de Esther Infinity

El código ya está listo. Esther funciona **siempre**:

- **Sin clave de IA:** responde con el motor interno de reglas (datos reales, pero sin lenguaje natural libre). No cuesta nada.
- **Con clave de IA:** en los planes **avanzada (3)** y **grupo (4)**, Esther entiende preguntas libres y responde natural, usando **solo los datos reales de la clínica** (no inventa).

La clave se carga en **Vercel** (nunca en el código ni por chat). Elegí **una** de las dos opciones de abajo.

---

## Opción A — GRATIS, para probar hoy (sin tarjeta): Groq

Groq da acceso gratuito a modelos tipo Llama, con una API compatible con OpenAI.

1. Entrá a **https://console.groq.com** y creá la cuenta (con tu Google alcanza).
2. Menú **API Keys** → **Create API Key** → copiá la clave (empieza con `gsk_...`).
3. En **https://vercel.com** → proyecto **cloud-esther-demo** → **Settings → Environment Variables**. Creá estas **tres** variables:
   - `ESTHER_IA_KEY` = tu clave `gsk_...`
   - `ESTHER_IA_URL` = `https://api.groq.com/openai/v1/chat/completions`
   - `ESTHER_IA_MODEL` = `llama-3.1-8b-instant`
4. **Save**. Repetí lo mismo en el proyecto **cloud-esther-staging**.
5. **Deployments** → último deploy → menú "···" → **Redeploy**.

> Google Gemini también tiene nivel gratuito; si preferís ese, su URL es
> `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`
> y un modelo gratuito es `gemini-2.0-flash`.

---

## Opción B — OpenAI (de pago, para cuando tengas saldo)

1. Entrá a **https://platform.openai.com** e iniciá sesión.
2. **Settings → Billing** → cargá saldo (con **5 USD** sobra para miles de preguntas).
3. **API keys** → **Create new secret key** → copiá la clave `sk-...` (se muestra una sola vez).
4. En **Vercel** → proyecto **cloud-esther-demo** → **Settings → Environment Variables**:
   - `OPENAI_API_KEY` = tu clave `sk-...`
   
   (No hace falta cargar las otras tres: por defecto usa OpenAI con el modelo `gpt-4o-mini`.)
5. **Save**. Repetí en **cloud-esther-staging**. Luego **Redeploy**.

---

## Costo

- **Opción A (Groq / Gemini):** gratis dentro del nivel gratuito (tiene topes de uso por minuto).
- **Opción B (OpenAI):** modelo económico, respuesta corta y contexto breve → alrededor de **una fracción de centavo por pregunta**.

## Cómo probar que quedó activa

1. Entrá al demo en un plan **Plus** o **Enterprise**.
2. Abrí Esther (botón flotante o `/demo/ia`) y hacele una pregunta escrita libre, por ejemplo:
   *"¿Cómo venimos con los presupuestos y qué me conviene priorizar hoy?"*
3. Si responde de forma natural y conversada → la IA está activa. Si responde más "cuadrada" → está usando el motor interno (revisá que la variable esté bien escrita y que hiciste Redeploy).

## Variables de entorno (resumen)

| Variable | Para qué | Ejemplo |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI (pago) | `sk-...` |
| `ESTHER_IA_KEY` | Clave de proveedor gratuito | `gsk_...` |
| `ESTHER_IA_URL` | Endpoint del proveedor | `https://api.groq.com/openai/v1/chat/completions` |
| `ESTHER_IA_MODEL` | Modelo a usar | `llama-3.1-8b-instant` |

Si no hay ninguna clave, Esther usa el motor interno y no se rompe nada.
