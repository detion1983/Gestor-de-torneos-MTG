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
| `background.jpg`     | JPG o WebP          | Fondo opcional de toda la página (se aplica al 22 % de opacidad). |
| `banner.jpg`         | JPG ~6:1 (2400×716) | Tira de cabecera: las seis artes en fila, entre el título y las pestañas. |

> El **logo de la cabecera** se oculta solo si el archivo no existe, así que puedes
> borrar `logo.svg` sin romper nada. El **favicon** también es opcional.
> La **tira de maná**, los marcos dorados y los halos del tema *Arena arcana* son
> CSS puro: no necesitan imágenes. Si añades `background.jpg`, usa una imagen oscura
> (mazmorra, taberna, arte de carta) para que el texto siga siendo legible.

### 🏳️ `banner.jpg` — Tira de cabecera (opcional)

La banda panorámica que se ve entre el título y las pestañas:

- **Un solo archivo**: `assets/images/banner.jpg` (también `.jpeg`, `.png` y
  `.webp`; se prueban en ese orden y se usa el primero que exista).
- Proporción **~6:1** (la incluida es 2400×716): las seis artes en fila. La banda
  recorta arriba y abajo, así que conviene que lo importante de cada ilustración
  esté en la franja central.
- Si el archivo **no existe**, la banda se oculta sola y la cabecera queda como
  siempre: es totalmente opcional.
- Peso recomendado **< 400 KB**. La incluida se montó juntando los seis archivos
  de `assets/images/colors/` a 572×1024 cada uno.

## 🎨 `assets/images/colors/` — Arte por identidad de color (opcional)

Un archivo por color. Para cada color se prueban estos formatos en orden:
`.jpg` → `.jpeg` → `.png` → `.webp`. Nombres **en minúsculas y sin espacios**:
`w.jpg` sí, `W.JPG` o `blanco.jpg` no.

| Color     | Archivo (pon uno de estos)                    | Arquetipo sugerido     |
| --------- | --------------------------------------------- | ---------------------- |
| Blanco    | `w.jpg`, `w.jpeg`, `w.png`, `w.webp`          | Ángel guardián         |
| Azul      | `u.jpg`, `u.jpeg`, `u.png`, `u.webp`          | Hechicero astrónomo    |
| Negro     | `b.jpg`, `b.jpeg`, `b.png`, `b.webp`          | Señor demonio          |
| Rojo      | `r.jpg`, `r.jpeg`, `r.png`, `r.webp`          | Dragón de la montaña   |
| Verde     | `g.jpg`, `g.jpeg`, `g.png`, `g.webp`          | Guardián del bosque    |
| Artefacto | `c.jpg`, `c.jpeg`, `c.png`, `c.webp`          | Gólem de relojería     |

> Ejemplo: para el color **rojo** guarda el archivo como
> `assets/images/colors/r.jpg` (o `r.jpeg`, `r.png`, `r.webp`).

- **Formato**: ilustración **vertical** (proporción 2:3). 600×900 px basta; la app
  comprime a 820×1230 como máximo al subir arte desde la propia app.
- **Peso**: JPEG de calidad media. Evita PNG de varios MB en GitHub Pages.
- **Legibilidad**: encima del arte se dibujan texto claro, un velo oscuro y el
  símbolo de maná, así que conviene una imagen oscura y con lo importante centrado.
- Si falta un color, la app pinta un degradado con el símbolo de maná: **nunca se
  rompe** por falta de arte.
- También puedes subir el arte desde **Galería arcana** dentro de la app. Esa
  imagen vive en el `localStorage` del navegador (`dci.art`), tiene prioridad
  sobre esta carpeta y solo existe en ese equipo.
- Con estos mismos seis archivos se monta la **tira de cabecera**
  (`assets/images/banner.jpg`): si cambias el arte, rehaz la tira con los seis
  nuevos (basta pegarlos en fila).

> **Símbolos de maná:** no hace falta añadirlos; ya están en
> `assets/images/symbols/` (`w.svg`, `u.svg`, `b.svg`, `r.svg`, `g.svg`, `c.svg`).
> Magic: The Gathering y sus símbolos son propiedad de Wizards of the Coast y se
> usan bajo su [Fan Content Policy](https://company.wizards.com/es/legal/fancontentpolicy).

## 📐 Recomendaciones generales

- **Iconos**: SVG siempre que puedas (ligeros y nítidos a cualquier tamaño).
- **Tamaños**: mantén las imágenes **< 300 KB** para que la web cargue rápido.
- **Nombres**: todo en **minúsculas**, sin espacios (usa guiones `-`).
- **Rutas**: en el HTML/JS se referencian como `assets/sounds/round-end.mp3`,
  etc. (rutas **relativas**, funcionan en GitHub Pages).
