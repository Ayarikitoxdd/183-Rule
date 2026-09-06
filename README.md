# Fiscalidad Simple

Plataforma estática de herramientas fiscales para particulares en España (HTML + CSS propio + JS vanilla,
sin build, sin backend, sin frameworks). Regla 183 y Modelo 720 son las dos herramientas disponibles.

## Estructura

```
index.html            Home de Fiscalidad Simple (presenta las herramientas)
regla-183.html         Calculadora de residencia fiscal (regla de los 183 días, art. 9 LIRPF) + contenido + FAQ
modelo-720.html         Asistente orientativo sobre la obligación de presentar el Modelo 720 + contenido + FAQ
404.html                Página de error
aviso-legal.html         Aviso legal (placeholder, en preparación)
privacidad.html          Política de privacidad (placeholder, en preparación)
cookies.html             Política de cookies (placeholder, en preparación)
_redirects               Redirecciones de Netlify (info.html/faq.html → regla-183.html)
robots.txt / sitemap.xml SEO técnico
assets/styles.css        Tokens de diseño y estilos propios (compartido por todas las páginas)
assets/calculator.js     Lógica de la calculadora de Regla 183 (solo en regla-183.html)
assets/modelo720.js      Motor del asistente del Modelo 720 (solo en modelo-720.html, sin estado compartido con calculator.js)
assets/theme-init.js     Aplica el tema guardado antes de pintar (evita parpadeo)
assets/theme.js          Botón de cambio de tema claro/oscuro
assets/favicon.svg, favicon-*.png, apple-touch-icon.png, og-image.png   Identidad visual e imagen social
```

No hay dependencias que instalar ni paso de compilación: se puede abrir cualquier página directamente en el
navegador, o desplegar la carpeta tal cual.

## Desplegar

**Netlify**
- Arrastra la carpeta del proyecto a [app.netlify.com/drop](https://app.netlify.com/drop), o
- `netlify deploy --prod` desde esta carpeta (sin configuración adicional: es un sitio estático en la raíz).
- El sitio en producción actual es <https://183rulee.netlify.app/>.

**Vercel**
- `vercel --prod` desde esta carpeta, o
- Importa el repositorio en [vercel.com/new](https://vercel.com/new) sin framework preset ("Other").

Ambas plataformas sirven los archivos estáticos de la raíz del proyecto sin necesidad de configuración
adicional ni subdominios.

## Aviso

Todas las herramientas ofrecen una estimación orientativa y no sustituyen el asesoramiento fiscal profesional.
Cada herramienta explica, en su propia página, qué calcula exactamente y qué limitaciones tiene.
