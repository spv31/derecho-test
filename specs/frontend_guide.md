# Derecho Test — Guía de Implementación Frontend

> Contrato de diseño y arquitectura para el agente de Frontend.
> Lectura obligatoria para cualquier agente que trabaje en `src/frontend/`.

## 1. Visión general

Interfaz de una aplicación web privada de generación de exámenes tipo test.
El backend (FastAPI) sirve esta interfaz como ficheros estáticos en la ruta `/`.
NO hay proceso de compilación (Node / Vite / Webpack). El frontend es un único
`index.html` con CSS y JS auxiliares en `src/frontend/css/` y `src/frontend/js/`.

## 2. Stack tecnológico

| Capa           | Tecnología                                                       |
| :------------- | :--------------------------------------------------------------- |
| Estructura     | HTML5 semántico                                                  |
| Estilos        | Tailwind CSS vía **Play CDN** (sin build step)                   |
| Interactividad | JavaScript vanilla (ES6+)                                        |
| Iconografía    | SVG inline (estilo Heroicons). Sin librerías de iconos externas. |
| Tipografía     | JetBrains Mono (cabeceras/etiquetas) + Inter (cuerpo/UI)         |

**Bloque exacto del `<head>` de `index.html` — en este orden:**

```html
<!-- 1. Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap"
  rel="stylesheet"
/>

<!-- 2. Tailwind Play CDN -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- 3. Paleta de color y fuentes (ver sección 3) -->
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          brand: {
            bg: "#0e0c15", // fondo principal — negro con matiz violeta
            surface: "#1a1727", // tarjetas y superficies
            border: "#2d2843", // bordes sutiles
            accent: "#7c3aed", // violeta — botones, CTAs, foco
            "accent-h": "#6d28d9", // violeta hover
            text: "#f1f5f9", // texto principal
            muted: "#94a3b8", // texto secundario y etiquetas
            error: "#ef4444", // errores / toasts negativos
          },
        },
        fontFamily: {
          mono: ['"JetBrains Mono"', "monospace"],
          sans: ["Inter", "sans-serif"],
        },
      },
    },
  };
</script>
```

No se usa ningún fichero CSS de Tailwind compilado. Las clases disponibles son
`bg-brand-bg`, `bg-brand-surface`, `border-brand-border`, `bg-brand-accent`,
`hover:bg-brand-accent-h`, `text-brand-text`, `text-brand-muted`,
`font-mono`, `font-sans`, etc.

## 3. Lenguaje de diseño — inspirado en nan.builders

Oscuro, minimalista, técnico. Exactamente el mismo registro visual de la web de NaN.
No hay imágenes de stock, fondos degradados excesivos ni estética SaaS corporativa.

- **Tema:** oscuro. Fondo `brand-bg` (#0e0c15), superficies `brand-surface` (#1a1727).
- **Tipografía:** `font-mono` (JetBrains Mono) para títulos, etiquetas de sección
  y cualquier dato técnico. `font-sans` (Inter) para párrafos, placeholders y UI.
- **Acento:** violeta `brand-accent` (#7c3aed) en botones primarios, links activos
  y estados focus de inputs. Hover en `brand-accent-h` (#6d28d9).
- **Etiquetas de sección:** estilo de comentario de código, en `font-mono` y
  `text-brand-muted`. Ejemplo: `// asignaturas`, `// documentos`, `// examen`.
  Igual que `// what is nan` en la web de NaN.
- **Tarjetas:** `bg-brand-surface`, borde `border-brand-border`, radio pequeño
  (`rounded-lg`). La tarjeta activa/seleccionada lleva borde `brand-accent`.
- **Estados `hover` y `focus`:** siempre visibles. Focus con `ring-2 ring-brand-accent`.
- **Errores/toasts:** `text-brand-error` o `bg-red-900/30 border-red-500`.

## 4. Arquitectura de estado (vanilla JS)

Sin frameworks reactivos. El estado se maneja con manipulación directa del DOM.

- **Mismo origen:** el frontend y la API comparten origen (FastAPI sirve ambos).
  Usa SIEMPRE rutas relativas: `fetch('/api/...')`. NUNCA hardcodees el host del
  backend. No hay CORS que gestionar.
- **Autenticación:** el JWT de sesión devuelto por `POST /api/auth/google` se
  guarda en `localStorage`. Toda petición posterior incluye el header
  `Authorization: Bearer <token>`.
- **Navegación:** SPA simulada. Un único `index.html` con contenedores que se
  muestran/ocultan con la clase `hidden` de Tailwind.

## 5. Vistas

| Vista      | ID de contenedor  | Propósito                                                                                                                                                            |
| :--------- | :---------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login      | `#view-login`     | Llama a `GET /api/config` al cargar y renderiza el botón de Google Identity Services.                                                                                |
| Dashboard  | `#view-dashboard` | Lista las asignaturas del usuario en tarjetas. Acción para crear una nueva.                                                                                          |
| Asignatura | `#view-subject`   | Lista los documentos subidos. Subida de PDF/PPTX (drag & drop). Botón "Generar examen" con selector de documentos y nº de preguntas.                                 |
| Examen     | `#view-exam`      | Renderiza las preguntas. El usuario marca respuestas; al enviar, corrige en cliente con `correct_index`, muestra la nota y revela la `explanation` de cada pregunta. |

Usa SIEMPRE la convención de IDs `#view-<nombre>`. Los endpoints exactos y sus
formas de petición/respuesta están en `specs/api_contract.md` — única fuente de
verdad de la API.

## 6. Reglas de ejecución (NEVER)

- **NUNCA** uses librerías JS externas (jQuery, Alpine, React, Vue…) no listadas aquí.
- **NUNCA** envíes el fichero como base64: usa `FormData` (multipart/form-data).
- **NUNCA** hardcodees el host del backend ni el `GOOGLE_CLIENT_ID`: rutas
  relativas y `GET /api/config`.
- **NUNCA** asumas que la respuesta es 200. Maneja 401 (volver a login), 403
  (cuenta no autorizada), 413 (fichero demasiado grande) y 502 (fallo del LLM)
  mostrando avisos visibles en la UI (alertas/toasts, rojo para errores).
- **NUNCA** guardes el token de sesión fuera de `localStorage` ni lo registres en logs.
