# Regla 183 — Calculadora de residencia fiscal en España

Micro-herramienta estática (HTML + Tailwind CDN + JS vanilla, sin build, sin backend) que calcula los días de
presencia en España durante un año natural y compara el total con el umbral de 183 días del artículo 9 de la
Ley 35/2006 del IRPF.

## Estructura

```
index.html          Calculadora (página principal)
info.html            Qué es la residencia fiscal (art. 9 LIRPF, domicilio vs residencia, CDI)
faq.html             Preguntas frecuentes
assets/styles.css    Tokens de diseño y estilos propios
assets/calculator.js Lógica de la calculadora (solo en index.html)
assets/theme-init.js Aplica el tema guardado antes de pintar (evita parpadeo)
assets/theme.js      Botón de cambio de tema claro/oscuro
assets/favicon.svg   Favicon (sello "183")
```

No hay dependencias que instalar ni paso de compilación: se puede abrir `index.html` directamente en el
navegador, o desplegar la carpeta tal cual.

## Desplegar

**Netlify**
- Arrastra la carpeta del proyecto a [app.netlify.com/drop](https://app.netlify.com/drop), o
- `netlify deploy --prod` desde esta carpeta (sin configuración adicional: es un sitio estático en la raíz).

**Vercel**
- `vercel --prod` desde esta carpeta, o
- Importa el repositorio en [vercel.com/new](https://vercel.com/new) sin framework preset ("Other").

Ambas plataformas sirven los archivos estáticos de la raíz del proyecto sin necesidad de configuración
adicional ni subdominios.

## Aviso

Esta herramienta ofrece una estimación orientativa basada únicamente en el criterio de permanencia (183 días).
No sustituye el asesoramiento fiscal profesional.
