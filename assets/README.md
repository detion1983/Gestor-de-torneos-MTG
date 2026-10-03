# 📁 Carpeta `assets` — Material del proyecto

Aquí puedes poner tus propios sonidos e imágenes. La app funciona **sin nada** de
esta carpeta (usa un pitido generado por código), pero si añades los archivos con
**estos nombres exactos y formatos**, se usará automáticamente lo que pongas.

## 🔊 `assets/sounds/` — Sonidos del cronómetro

| Nombre del archivo         | Formato recomendado | Para qué es                                              |
| -------------------------- | ------------------- | -------------------------------------------------------- |
| `round-end.mp3`            | MP3 (o `.ogg`)      | Aviso cuando **termina el tiempo** de ronda.             |
| `round-warning.mp3`        | MP3 (o `.ogg`)      | Aviso **5 minutos antes** de acabar (aviso acústico).    |
| `round-start.mp3`          | MP3 (o `.ogg`)      | Sonido opcional al **iniciar** el cronómetro.            |
| `round-tick.mp3`           | MP3 (o `.ogg`)      | Sonido opcional del **último minuto** (por cada minuto). |

- **Formatos**: usa **MP3** (mejor compatibilidad universal) o, si quieres mejor
  calidad/tamaño, **OGG/Opus**. Evita WAV pesados en GitHub Pages.
- **Duración**: 1–3 segundos los avisos, cortos y claros.
- **Volumen**: que destaquen en un local ruidoso (un **gong/ding** funciona bien).
- Si un archivo **no existe**, la app genera un pitido por código como respaldo.

## 🖼️ `assets/images/` — Imágenes (opcional)

### ✅ Ya incluidas (provisionales)
Estos archivos vienen con el proyecto para que **se vea completo sin que aportes nada**.
Sustitúyelos por los tuyos **con el mismo nombre** y la app los usará solos:

| Nombre del archivo   | Formato        | Para qué es                                  |
| -------------------- | -------------- | -------------------------------------------- |
| `favicon.svg`        | SVG vectorial  | Icono de la pestaña (trofeo verde).          |
| `favicon.png`        | PNG 512×512    | Reserva del icono (navegadores sin SVG).     |
| `logo.svg`           | SVG vectorial  | Logotipo de la cabecera "Magic TCG".        |
| `logo.png`           | PNG (transp.)  | Versión PNG del logo (ejemplo).              |

### 🔁 Para poner lo tuyo
| Nombre del archivo   | Formato recomendado | Para qué es                                  |
| -------------------- | ------------------- | -------------------------------------------- |
| `logo.png` / `logo.svg`     | PNG o SVG    | Logotipo de tu tienda/torneo.                |
| `favicon.png` / `favicon.svg` | PNG 512×512 o SVG | Icono de la pestaña.                |
| `favicon.ico`        | ICO                 | Alternativa clásica de icono.                |
| `background.jpg`     | JPG o WebP          | Fondo opcional de la cabecera.               |

> El **logo de la cabecera** se oculta solo si el archivo no existe, así que puedes
> borrar `logo.svg` sin romper nada. El **favicon** también es opcional.

## 📐 Recomendaciones generales

- **Iconos**: SVG siempre que puedas (ligeros y nítidos a cualquier tamaño).
- **Tamaños**: mantén las imágenes **< 300 KB** para que la web cargue rápido.
- **Nombres**: todo en **minúsculas**, sin espacios (usa guiones `-`).
- **Rutas**: en el HTML/JS se referencian como `assets/sounds/round-end.mp3`,
  etc. (rutas **relativas**, funcionan en GitHub Pages).
