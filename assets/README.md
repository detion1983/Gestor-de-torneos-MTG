# 📁 Carpeta `assets` — Material del proyecto

Aquí puedes poner tus propios sonidos e imágenes. La app ya incluye el logo
oficial y los iconos de instalación; los **sonidos** son opcionales (si faltan,
usa un pitido generado por código). Si añades archivos con **estos nombres
exactos y formatos**, se usará automáticamente lo que pongas.

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

## 🖼️ `assets/images/` — Imágenes y logo oficial

### ✅ Logo oficial e iconos incluidos

El logotipo oficial de la app es **`assets/images/logo.jpg`** (1024×1024). Se usa
en la cabecera, en el diálogo de instalación y como fuente para generar los
iconos de la PWA:

| Nombre del archivo                     | Formato          | Para qué es                                      |
| -------------------------------------- | ---------------- | ------------------------------------------------ |
| `logo.jpg`                             | JPG 1024×1024    | Logo oficial de la app (cabecera e instalador).  |
| `favicon.png`                          | PNG 64×64        | Icono de la pestaña del navegador.               |
| `favicon.ico`                          | ICO 16/32/48/64  | Reserva para navegadores antiguos.               |
| `icons/icon-192.png`                   | PNG 192×192      | Icono de instalación (Android/Chrome).           |
| `icons/icon-512.png`                   | PNG 512×512      | Icono de instalación (Android/Chrome).           |
| `icons/icon-maskable-512.png`          | PNG 512×512      | Icono adaptativo de Android (con zona segura).   |
| `icons/apple-touch-icon.png`           | PNG 180×180      | Icono de inicio en iPhone/iPad.                  |

Si sustituyes `logo.jpg` por otro logo cuadrado, regenera todos los iconos desde
la raíz del proyecto:

```bash
python tools/make-icons.py
```

### 🔁 Otras imágenes opcionales

| Nombre del archivo   | Formato recomendado | Para qué es                                  |
| -------------------- | ------------------- | -------------------------------------------- |
| `background.jpg`     | JPG o WebP          | Fondo opcional de toda la página (se aplica al 22 % de opacidad). |
| `banner.jpg`         | JPG ~6:1 (2400×716) | Tira de cabecera: las seis artes en fila, entre el título y las pestañas. |

> La **tira de maná**, los marcos dorados y los halos del tema *Arena arcana* son
> CSS puro: no necesitan imágenes. Si añades `background.jpg`, usa una imagen oscura
> (mazmorra, taberna, arte de carta) para que el texto siga siendo legible.
> Los **iconos PWA** sí son necesarios para que el navegador ofrezca instalar la
> app; no los borres. Si falta `logo.jpg`, la cabecera oculta la imagen sin romper
> el resto de la interfaz.

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
`w.jpg` sí, `W.JPG` o `blanco.jpg` no. Además de decorar torneos, la ilustración
del color elegido se usa como fondo de la región de cada jugador en la **Mesa**.

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

- **Formato**: ilustración **vertical** (proporción 2:3). 600×900 px basta.
- **Peso**: JPEG de calidad media. Evita PNG de varios MB en GitHub Pages.
- **Legibilidad**: encima del arte se dibujan texto claro, un velo oscuro y el
  símbolo de maná, así que conviene una imagen oscura y con lo importante centrado.
- Si falta un color, la app pinta un degradado con el símbolo de maná: **nunca se
  rompe** por falta de arte.
- **El arte es fijo**: se cambia sustituyendo estos archivos. La app no sube ni
  guarda imágenes desde el navegador (la antigua *Galería arcana* se retiró en
  v2.3.2).
- Con estos mismos seis archivos se monta la **tira de cabecera**
  (`assets/images/banner.jpg`): si cambias el arte, rehaz la tira con los seis
  nuevos (basta pegarlos en fila).

> **Símbolos de maná:** no hace falta añadirlos; ya están en
> `assets/images/symbols/` (`w.svg`, `u.svg`, `b.svg`, `r.svg`, `g.svg`, `c.svg`).
> Magic: The Gathering y sus símbolos son propiedad de Wizards of the Coast y se
> usan bajo su [Fan Content Policy](https://company.wizards.com/es/legal/fancontentpolicy).

## 📐 Recomendaciones generales

- **Logo**: usa una imagen cuadrada (recomendado 1024×1024, como `logo.jpg`) y
  regenera los iconos con `python tools/make-icons.py`.
- **Tamaños**: mantén las imágenes **< 300 KB** para que la web cargue rápido.
- **Nombres**: todo en **minúsculas**, sin espacios (usa guiones `-`).
- **Rutas**: en el HTML/JS se referencian como `assets/sounds/round-end.mp3`,
  etc. (rutas **relativas**, funcionan en GitHub Pages).
