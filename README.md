# Gestión de Torneos de Magic 🏆

**Versión actual: v2.3.0** · 18 de noviembre de 2026

Gestor de torneos de **Magic: The Gathering** (sistema suizo, resultados y clasificación).
Permite crear torneos, inscribir jugadores, generar rondas por sistema **suizo**,
introducir resultados y consultar la **clasificación** con los desempates oficiales.

Aplicación 100% estática (HTML + CSS + JavaScript), sin servidor ni instalación.
La versión se muestra de forma discreta en el pie de la página.

---

## ✨ Funciones

- **Crear torneos** con los datos básicos: nombre, fecha, lugar y organizador.
- **Configuración ajustable**: el **número de rondas**, el **Top** (sin Top / Top 2 /
  Top 4 / Top 8) y el **tiempo de ronda** se definen ya dentro del torneo, mientras
  no cierres las inscripciones.
- **Inscripción de jugadores** con sugerencias de jugadores ya conocidos.
- **Recordatorio de inscripciones**: los jugadores usados se guardan y se
  sugieren automáticamente en torneos futuros (autocompletado).
- **Emparejamiento suizo** por puntuación, evitando repetir rival.
- **Byes automáticos** cuando el número de jugadores es impar.
- **Introducción de resultados** por mesa con un **desplegable central**: jugador 1
  a la izquierda, jugador 2 a la derecha y el marcador exacto en medio (`0-0`,
  `1-0`, `1-1`, `2-1`, `2-0`, `0-1`, `1-2`, `0-2`).
- **Clasificación (standings)** con: Puntos, OMW%, GW% y OGW% (formato oficial de desempates).
- **Jugadores retirados** (drop) que dejan de emparejarse.
- **Exportar / Importar** todos los datos en un archivo JSON (copia de seguridad).
- **Persistencia** automática en el navegador (`localStorage`).
- **Cartel del campeón**: al cerrar el torneo se genera un póster con el campeón,
  el finalista y el mejor suizo/3.º clasificado, listo para copiar o descargar.
- **Compartir como imagen**: ronda, clasificación y bracket se generan como carteles
  PNG con la estética de la app (copiar al portapapeles, descargar o compartir).
- **Avisos no bloqueantes**: toasts para confirmar acciones y diálogos propios para
  lo delicado (eliminar torneo, deshacer rondas, cerrar la suiza).
- **Contadores en vivo**: inscritos/retirados, torneos guardados y ronda actual.
- **Identidad de color por torneo** (blanco, azul, negro, rojo, verde o artefacto):
  su símbolo de maná y su acento tiñen la lista de torneos, la cabecera del torneo
  y los carteles que se comparten.
- **Galería arcana**: arte propio para cada color. Puedes subir la imagen desde la
  propia app (se guarda comprimida en el navegador) o copiarla como
  `assets/images/colors/<color>.jpg` (también `.jpeg`, `.png` y `.webp`); si
  falta, se pinta un degradado con el símbolo de maná oficial.
- **🎴 Contador de mesa**: pestaña **Mesa** con asientos para **2, 3 o 4
  jugadores** (los de enfrente giran 180°), vidas de **20** (o 40 Commander) con
  botones grandes y atajos ±1/±5, **veneno** con aviso a 10, nombre y color por
  jugador y un panel aparte de **maná flotante** W/U/B/R/G/C. Todo se guarda en
  `localStorage` (clave `dci.table`).

---

## 🚀 Uso en local

Solo abre `index.html` en tu navegador. No requiere servidor.

> Opcional: para servir por HTTP, con Python instalado:
> `python -m http.server` y visita `http://localhost:8000`.

---

## 🌐 Publicar en GitHub Pages (consultar online)

1. Crea un repositorio nuevo en GitHub (por ejemplo `dci-reporter`).
2. Sube el contenido de esta carpeta al repositorio:

   ```bash
   git init
   git add .
   git commit -m "Gestión de Torneos de Magic"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/dci-reporter.git
   git push -u origin main
   ```

3. En GitHub entra en **Settings → Pages**.
4. En *Source* selecciona **Deploy from a branch**, rama **main** y carpeta **/ (root)**.
5. Guarda. En unos minutos la app estará en:

   `https://TU_USUARIO.github.io/dci-reporter/`

### Nota sobre los datos

Los datos se guardan en el **navegador de cada usuario** (`localStorage`).
Esto significa que:

- Cada organizador ve **sus propios** torneos.
- Al abrir la web desde otro ordenador no aparecerán los torneos anteriores.
- Para mover datos entre dispositivos, usa **Exportar datos** e **Importar datos**.

Si en el futuro quieres que los datos se compartan online entre varios usuarios,
el código está preparado: toda la persistencia está aislada en `js/storage.js`
y se podría sustituir por Firebase, Supabase o un backend propio sin reescribir la interfaz.

---

## 📁 Estructura del proyecto

```
index.html          Interfaz principal
css/styles.css      Estilos
js/storage.js       Persistencia (localStorage) y registro de jugadores
js/swiss.js         Lógica: emparejamiento suizo, resultados y standings
js/art.js           Identidad de color, galería de arte y símbolos de maná
js/table.js         Contador de mesa: vidas, veneno y maná flotante (2-4 jugadores)
js/share.js         Carteles PNG (ronda/clasificación/bracket/campeón) y texto para compartir
js/timer.js         Cronómetro de ronda y avisos acústicos
js/app.js           Controlador de la interfaz (DOM y eventos)
assets/sounds/      Sonidos opcionales del cronómetro (round-*.mp3)
assets/images/      Imágenes opcionales (logo.png, favicon, fondo)
assets/images/symbols/  Símbolos de maná oficiales en SVG (w/u/b/r/g/c)
assets/images/colors/   Arte por color: w/u/b/r/g/c en jpg, jpeg, png o webp
assets/images/colors/LEEME.txt  Nombres exactos, formatos y medidas del arte
assets/images/banner.jpg        Tira de cabecera con las seis artes en fila (opcional)
assets/README.md    Guía de nombres y formatos de sonidos/imágenes
tests/              Pruebas sin dependencias (verify, smoke y e2e con Edge)
tests/README.md     Qué comprueba cada prueba y cómo ejecutarlas
README.md           Este archivo
```

### 🧪 Pruebas

```bash
node tests/verify.js   # integración estática: IDs, API de Art, clases y ?v=
node tests/smoke.js    # lógica de color/arte, storage y export/import
node tests/e2e.js      # flujo real en Edge headless (python + Edge)
```

Ninguna necesita `npm install`. Detalles en `tests/README.md`.

---

## ⏱️ Cronómetro de ronda (organizador)

En la vista del torneo hay un panel **"⏱️ Cronómetro de ronda"** para el juez/organizador:

- **Tiempo de ronda configurable**: al crear el torneo (o en *Configuración de rondas y
  Top*) defines los **minutos de ronda**. Al pulsar **🎲 Generar siguiente ronda** el
  cronómetro **arranca solo** con ese tiempo, así no se te olvida darle al play.
- También puedes escribir los **minutos** a mano en el panel (por defecto 25) y pulsar
  **▶️ Iniciar**.
- **Pausar/Reanudar** con el mismo botón. **🔄 Reiniciar** vuelve al tiempo completo.
- **Aviso acústico 5 minutos antes** de acabar (el reloj se pone naranja y parpadea).
- **Aviso acústico al llegar a 0** ("¡Tiempo!", el reloj se pone rojo).
- **Tiempo extra (prórroga) en rojo**: al llegar a 0 el reloj **no se detiene**; empieza a
  contar **hacia arriba en rojo** (`-MM:SS`) para que veas cuánto se está pasando la ronda.
- **➕ Añadir tiempo**: botón activo mientras la ronda está en marcha. Suma los minutos
  que indiques en el campo **Prórroga** (por defecto 5 min) y devuelve el reloj a positivo,
  útil para dar tiempo extra acordado a la mesa.
- Avisos extra a 60, 30 y 10 segundos en el último minuto.
- **🔔 Probar sonido** para comprobar que se oye antes de empezar.
- El **título de la pestaña** parpadea con el aviso para llamar la atención.

### 🔊 Sonidos personalizados (opcional)
La app funciona **sin archivos** (genera un pitido por código con la Web Audio API).
Si quieres tus propios sonidos, ponlos en **`assets/sounds/`** con estos nombres:

| Archivo               | Formato | Cuándo suena                     |
| --------------------- | ------- | -------------------------------- |
| `round-start.mp3`     | MP3/OGG | Al iniciar el cronómetro.        |
| `round-warning.mp3`   | MP3/OGG | 5 minutos antes de acabar.       |
| `round-end.mp3`       | MP3/OGG | Al terminar el tiempo.           |
| `round-tick.mp3`      | MP3/OGG | 60, 30 y 10 segundos finales.    |

Si un archivo no existe, se usa el pitido por código. Ver **`assets/README.md`**
para detalles de sonidos e imágenes (logos, favicon, fondos).

---

## 🎨 Identidad de color y galería arcana

Cada torneo puede llevar una **identidad de color**: blanco, azul, negro, rojo,
verde o artefacto (`w`, `u`, `b`, `r`, `g`, `c`). Es opcional y se elige al crear
el torneo o desde la cabecera del torneo (**Color**). Se usa para:

- Pintar el acento y la miniatura de arte en la **lista de torneos**.
- Decorar la **cabecera del torneo** con el arte de fondo, la etiqueta de color y
  el símbolo de maná.
- Colorear los **carteles PNG** de ronda, clasificación, bracket y campeón
  (arte de fondo, barra de acento y símbolo).

### Arte por color

El arte se resuelve en este orden:

1. **Imagen subida desde la app** (**Galería arcana → 📷 Subir arte**). Se
   comprime a JPEG (máx. 820×1230, calidad 0.8) y se guarda en el
   `localStorage` del navegador, así que solo existe en ese equipo. El botón
   **✖ Quitar** vuelve al arte por defecto.
2. **Archivo en `assets/images/colors/`** con el nombre del color:
   `w.jpg`, `u.jpg`, `b.jpg`, `r.jpg`, `g.jpg`, `c.jpg` (también se aceptan
   `.jpeg`, `.png` y `.webp`). El nombre va siempre en **minúsculas**: `w.jpg`,
   nunca `W.JPG` ni `blanco.jpg`.
3. Si no hay ninguna de las dos, se pinta un **degradado con el símbolo de
   maná**: la app nunca se rompe por falta de arte.

> Los símbolos de maná oficiales están en `assets/images/symbols/` (`w.svg`,
> `u.svg`, `b.svg`, `r.svg`, `g.svg`, `c.svg`).

### Tira de arte de cabecera (opcional)

Entre el título y las pestañas se puede mostrar una **panorámica** con las seis
ilustraciones, a modo de portada:

- Archivo: **`assets/images/banner.jpg`** (también `.jpeg`, `.png` y `.webp`); se
  prueban en ese orden y se usa el primero que exista.
- Proporción aproximada **6:1** (la incluida es 2400×716): las seis artes en
  fila. La banda recorta arriba y abajo, así que conviene que lo importante esté
  en la franja central de cada ilustración.
- Si el archivo **no existe**, la banda se oculta sola: la cabecera se ve igual
  que siempre y la app no se rompe.
- Peso recomendado **< 400 KB**. La tira incluida se montó juntando los seis
  archivos de `assets/images/colors/`, así que puedes rehacerla cuando cambies
  de arte (por ejemplo con cualquier editor: seis imágenes de 572×1024 en fila).

**Nota sobre `file://`:** al abrir `index.html` con doble clic, los carteles PNG
no dibujan las imágenes de la carpeta (`assets/images/colors/`) porque el canvas
quedaría "manchado" y la descarga fallaría. En ese modo se usan el degradado y
los acentos; las imágenes **subidas** desde la galería sí se dibujan siempre.
Sirviendo la app por HTTP (GitHub Pages o `python -m http.server`) se usan ambos.

### Aviso legal

Magic: The Gathering, sus nombres y sus símbolos son propiedad de **Wizards of
the Coast**. Se usan aquí bajo su
[Fan Content Policy](https://company.wizards.com/es/legal/fancontentpolicy).
Contenido no oficial, gratuito y sin ánimo de lucro.

---

## 🎴 Contador de mesa (partidas)

La pestaña **🎴 Mesa** convierte la app en un contador para jugar partidas
presenciales, sin torneos de por medio:

- **2, 3 o 4 jugadores**: los asientos de la parte superior se giran 180° para que
  su jugador los lea derecho (se puede desactivar con *Girar asientos de enfrente*).
- **Vidas** de **20** por defecto (o **40** para Commander) con botones grandes
  **− / +**, atajos **−5 / −1 / +1 / +5** y reinicio por jugador (**⟳**).
- **Veneno** ☠️ por jugador con aviso verde al llegar a **10**.
- **Maná flotante**: una tarjeta por jugador con los seis símbolos oficiales
  (blanco, azul, negro, rojo, verde y artefacto) y botones de sumar/restar;
  **🧹 Vaciar maná** deja todos los contadores a cero.
- **Nombre y color por jugador**: el color pinta el acento del asiento y usa su
  arte (Galería arcana) igual que los torneos.
- **Reiniciar mesa** pide confirmación (dos toques) y devuelve vidas, veneno y
  maná a su estado inicial sin borrar nombres ni colores.

Los contadores se guardan solos en `localStorage` con la clave `dci.table`, y la
última pestaña abierta en `dci.view`; no se mezclan con los datos de los torneos.

---

## ⚙️ Cómo funciona el sistema suizo

1. Se ordenan los jugadores por puntos, luego por OMW%, GW% y OGW%.
2. **(Nuevo)** **No se puede emparejar una ronda nueva hasta reportar TODOS los
   resultados de la anterior.** El botón **"🎲 Generar siguiente ronda"** se
   bloquea y muestra *"⏳ Faltan X/Y resultados"* mientras haya mesas sin
   resultado, igual que en un torneo real (en el suizo los emparejamientos
   dependen de los resultados previos). Si se pulsa igualmente, aparece un aviso.
3. Se emparejan por orden dentro del mismo bloque, evitando revancha si es posible
   (los jugadores con el mismo récord se enfrentan entre sí y no repiten rival).
4. Si el número de jugadores activos es impar, recibe un **bye**
   (victoria automática de 3 puntos) **el peor clasificado que todavía no haya
   recibido bye en el torneo** (estilo Wizards). Si varios candidatos están
   **empatados exactamente** en el mismo standing (puntos y desempates), el bye
   se **sortea entre ellos**. Nadie repite bye mientras queden jugadores sin
   él. El **bye no bloquea** la ronda: nace reportado y no cuenta como pendiente.
5. Cada ronda se genera manualmente con el botón **Generar siguiente ronda**. Al
   generarla, el **cronómetro de ronda arranca solo** con el **tiempo de ronda**
   configurado (si definiste uno).
6. **Límite de rondas**: si defines un número de rondas al crear el torneo (o en
   *Configuración de rondas y Top*), el botón muestra *"🎲 Generar ronda X de N"*
   y se **bloquea** al llegar a la última. Si intentas pasarte, aparece un aviso
   sugiriéndote cerrar la fase suiza o aumentar el número de rondas.
7. Tampoco se puede **cerrar la fase suiza** (para generar el Top 2/4/8) con
   resultados pendientes.

### 🔙 Deshacer una ronda (corregir fallos humanos)

Si te equivocaste al introducir los resultados de una ronda, no hace falta
borrar cada mesa a mano: usa el botón **🔙 Deshacer última ronda**.

- Elimina **por completo la última ronda** (sus mesas y todos sus resultados) y
  deja el torneo como estaba antes de generarla, para que vuelvas a
  introducirla/parearla de nuevo.
- Pide **confirmación** antes de borrar y avisa si la ronda tenía resultados
  **sin introducir** que también se perderán.
- El botón se **deshabilita** si no hay rondas o si ya cerraste la fase suiza.
- En la **eliminación directa (Top 4/8)** existe su equivalente
  **🔙 Deshacer última ronda Top**: quita la última ronda del bracket (p. ej.
  la Final), limpia el campeón si procedía y deja la ronda anterior lista para
  volver a introducir sus resultados. Si deshaces hasta dejar el bracket vacío,
  la fase suiza se **reabre** automáticamente.

### Puntuación
- Victoria: **3 puntos**
- Empate: **1 punto**
- Derrota: **0 puntos**
- Bye: **3 puntos** (como victoria)

### Desempates (columnas de la clasificación)

En la tabla de clasificación verás estas columnas (pasa el ratón por encima para ver el texto de ayuda):

- **Pts**: puntos de torneo. Victoria **3** · Empate **1** · Derrota **0** · Bye **3**.
- **OMW%** (*Opponents' Match Win %*): **porcentaje de victorias de tus rivales**.
  Mide la "fuerza" de los jugadores contra los que te has enfrentado.
- **GW%** (*Game Win %*): **porcentaje de partidas (*games*) que has ganado**,
  contando también los empates como media partida.
- **OGW%** (*Opponents' Game Win %*): **porcentaje de partidas ganadas por tus
  rivales**.

**Orden:** primero por **Pts**, y en caso de empate por **OMW% → GW% → OGW%**
(desempates oficiales). Si sigue el empate, por orden alfabético del nombre.

### Registro de resultados (marcador exacto)
Cada mesa se muestra como un marcador: **jugador 1 a la izquierda**, un
**desplegable en el centro** y **jugador 2 a la derecha**. En el desplegable
eliges el marcador real de games:

`0-0` · `1-0` · `1-1` · `2-1` · `2-0` · `0-1` · `1-2` · `0-2`

Cada opción indica a quién da la victoria (`1-0 · gana P1`, `0-2 · gana P2`) y
`0-0` / `1-1` se guardan como tablas:

- **Empate**: `0-0` (ambos a cero), `1-1` (por tiempo / tablas)
- **Gana P1**: `1-0` (rival concede / no se presenta), `2-1`, `2-0`
- **Gana P2**: `0-1` (rival concede / no se presenta), `1-2`, `0-2`

La opción **—** deja la mesa pendiente y el botón **✖ Deshacer** (en la cabecera
de la mesa, junto al estado `⏳ pendiente` / `✅ 2-0`) borra el marcador. En la
eliminatoria final no se ofrecen las tablas: un cruce necesita ganador.

Guardar el marcador exacto (y no asumir siempre 2-0) hace que **GW% y OGW%**
se calculen correctamente. Internamente el ganador se deriva del marcador.

---

## 🖼️ Compartir: carteles e imágenes

Desde el detalle del torneo:

- **📤 Compartir ronda** → cartel con las mesas de la última ronda (incluye el
  marcador si ya está reportado).
- **📤 Compartir clasificación** → cartel con el podio y la tabla (Pts, OMW%, GW%).
- **📤 Compartir bracket** → rondas del Top, resultados y campeón.

Cada botón abre el **panel de vista previa** (arriba del detalle) con la imagen
generada por Canvas a 900 px de ancho y el doble de resolución (nítida en móvil),
y estas acciones:

- **📋 Copiar imagen** → copia el PNG al portapapeles (Clipboard API). Si el
  navegador no permite copiar imágenes, **la descarga automáticamente** y te avisa.
- **⬇️ Descargar PNG** → guarda el cartel con un nombre descriptivo.
- **📲 Compartir** → Web Share API del móvil (WhatsApp, Telegram, etc.). En
  escritorio, si no está disponible, descarga el archivo.
- **📝 Copiar texto** → copia el texto de siempre (emparejamientos + clasificación)
  para pegarlo donde quieras.
- **🟢 WhatsApp** → abre `wa.me` con ese texto ya escrito.

> En móvil la vista previa mantiene un ancho mínimo y se puede desplazar en
> horizontal dentro del panel, para que el cartel no se vuelva ilegible.

---

## 🏆 Cartel del campeón

Al **cerrar la fase suiza** (con o sin Top) aparece el panel **“Cartel del campeón”**:

- **Con Top terminado**: muestra al **campeón**, su récord y puntos de la fase suiza,
  el **finalista** (perdedor de la final) y el **mejor suizo** (o el 3.º clasificado
  si el campeón ya era el líder suizo).
- **Con el Top en juego**: muestra al líder provisional y la etiqueta
  *“Eliminatoria en curso”*.
- **Sin Top** (*solo suizo*): el campeón es el líder de la clasificación final y le
  acompañan el 2.º y el 3.º clasificado.

El cartel se genera a **900 × 620 lógicos (1800 × 1240 px reales)** con marco dorado,
tira de los cinco colores de maná y la misma tipografía que la app. Se puede
**copiar, descargar o compartir** con los mismos botones que el resto de carteles.

---

## 🎨 Interfaz y tema

- Tema **“Arena arcana”**: fondo obsidiana, paneles de carta oscura, oro y una
  tira de identidad con los colores de maná (W/U/B/R/G).
- Tipografías **Cinzel** (títulos) y **Barlow** (interfaz) desde Google Fonts, con
  alternativas locales si no hay conexión.
- **Responsive** probado a 360, 390, 768 y 1200 px: sin scroll horizontal, tablas
  con desplazamiento interno y botones que se reordenan en móvil.
- **Accesibilidad**: foco visible, `aria-live` en los avisos y respeto a
  `prefers-reduced-motion`.
- **Caché controlada**: CSS y JS se cargan con `?v=2.1.0`, así una versión nueva se
  ve al instante sin tener que borrar la caché del navegador.


---

## 🏅 Eliminación directa (Top 2 / Top 4 / Top 8)

Al crear el torneo eliges el tipo de Top (o *Sin Top* para un torneo suizo puro).
Puedes cambiarlo desde **Configuración de rondas y Top** mientras no cierres la
fase suiza; el botón de cierre y el selector del toolbar se actualizan solos.

Al terminar la fase suiza, el botón **🔒 Cerrar suiza y generar Top N** crea la
eliminatoria con los mejores clasificados, emparejados por seeds:

- **Top 8**: `1 vs 8`, `4 vs 5`, `2 vs 7`, `3 vs 6` → cuartos → semis → final.
- **Top 4**: `1 vs 4`, `2 vs 3` → semis → final.
- **Top 2**: `1 vs 2` → final directa.
- **Sin Top**: la clasificación final de la fase suiza queda como resultado del
  torneo y el torneo se marca como finalizado.

Introduce el marcador de cada partido y las rondas siguientes se rellenan
automáticamente con los ganadores hasta mostrar al **🥇 Campeón**.

---

## 🔧 Próximos pasos posibles

- Roles de administrador y acceso con contraseña.
- Sincronización online (backend).
- Impresión / exportación de emparejamientos y standings en PDF.
- Emparejamiento automático de mesas por disponibilidad / tiempos.

---

## 📌 Histórico de versiones

La versión se define en **una sola línea** de `js/app.js` (`APP_VERSION`) y se
muestra en la cabecera, en el pie de la página y en el título de la pestaña.
Al publicar cambios, sube el número (recomendado *vMAYOR.MENOR.PARCHE*), actualiza
los `?v=` de `index.html` y añade una línea nueva al histórico con su **fecha**.

### v2.3.0 · 18 de noviembre de 2026
- **Tira de arte de cabecera**: banda panorámica con las seis ilustraciones entre
  la cabecera y las pestañas. Se alimenta de `assets/images/banner.jpg` (o
  `.jpeg`, `.png`, `.webp`, en ese orden) y **se oculta sola** si el archivo no
  existe, así que la app sigue funcionando igual sin ella.
- La banda se funde al cargar (`.hero-band.is-loaded`), lleva velo oscuro arriba
  y abajo, hilo de maná en la base y ajusta su altura en tablet (150 px) y móvil
  (116 px).
- Se incluye `assets/images/banner.jpg` (2400×716, ~340 KB) montada a partir de
  los seis artes de `assets/images/colors/`.
- `?v=2.3.0` en CSS y JS para refrescar la caché.

### v2.2.2 · 18 de noviembre de 2026
- **Arte por color desde la carpeta**: la ruta es `assets/images/colors/` y cada
  archivo se llama como su color (`w`, `u`, `b`, `r`, `g`, `c`), por ejemplo
  `assets/images/colors/w.jpg` para el blanco. Se aceptan `.jpg`, `.jpeg`, `.png`
  y `.webp` (**nuevo soporte para `.jpeg`**), en minúsculas y sin espacios.
- La **Galería arcana** muestra la ruta y los formatos válidos, y el
  `assets/images/colors/LEEME.txt` recuerda nombres, proporción 2:3 y tamaño.
- Si falta la imagen de un color, la app pinta el degradado con el símbolo de
  maná: nunca se rompe por falta de arte.
- `?v=2.2.2` en CSS y JS para refrescar la caché de `js/art.js`.

### v2.2.1 · 18 de noviembre de 2026
- **Resultados con desplegable**: cada mesa muestra **P1 a la izquierda**, el
  **marcador en el centro** y **P2 a la derecha**, con los ocho resultados de un
  Bo3 (`0-0`, `1-0`, `1-1`, `2-1`, `2-0`, `0-1`, `1-2`, `0-2`) en vez de botones
  sueltos. Se añade el empate `0-0` a la lógica y el Top no admite tablas.
- El botón **✖ Deshacer** pasa a la cabecera de la mesa, junto al estado
  (`⏳ pendiente` / `✅ 2-0`) y al número de mesa.
- `?v=2.2.1` y pruebas ampliadas: `smoke.js` valida los marcadores y `e2e.js`
  anota `0-0` y `2-1` con el desplegable y deshace desde la interfaz.

### v2.2.0 · 18 de noviembre de 2026
- **Contador de mesa** en una pestaña nueva (`🎴 Mesa`): asientos para 2, 3 o 4
  jugadores (los de enfrente giran 180°), vidas de 20/40 con botones grandes y
  atajos ±1/±5, veneno con aviso a 10 y nombre/color por jugador.
- **Maná flotante** por jugador con los seis símbolos oficiales y botones de
  sumar/restar; botón **🧹 Vaciar maná** para limpiar entre turnos.
- **Persistencia propia** (`dci.table`) y recuerdo de la última sección abierta
  (`dci.view`), sin tocar los datos de los torneos.
- Nuevo módulo `js/table.js`, pestañas `🏆 Torneos / 🎴 Mesa`, `?v=2.2.0` y
  pruebas ampliadas (`smoke.js` y `e2e.js` cubren el contador).

### v2.1.0 · 18 de noviembre de 2026
- **Identidad de color por torneo** (W/U/B/R/G/artefacto) opcional al crear el
  torneo y modificable desde la cabecera del detalle.
- **Símbolos de maná oficiales** en `assets/images/symbols/`: tira bajo el
  subtítulo de la cabecera, botones de color, etiqueta del torneo y carteles.
- **Galería arcana**: arte propio por color con subida desde la app (JPEG
  comprimido en `localStorage`, clave `dci.art`) y respaldo a
  `assets/images/colors/<color>.jpg|png|webp`; sin arte se pinta un degradado
  con el símbolo de maná.
- **Lista y detalle**: miniatura de arte y acento de color en cada torneo,
  banner de arte en la cabecera y etiqueta de identidad.
- **Carteles PNG**: fondo con el arte del torneo, barra de acento y símbolo de
  maná (ronda, clasificación, bracket y campeón), con guardas para `file://`.
- **Aviso legal** de Fan Content Policy en el pie y en la galería.
- **Caché** controlada con `?v=2.1.0` en CSS y JS (incluye el nuevo `js/art.js`).
- **Pruebas** sin dependencias en `tests/`: `verify.js` (integración estática),
  `smoke.js` (color/arte y persistencia) y `e2e.js` (Edge headless vía CDP).

### v2.0.0 · 18 de noviembre de 2026
- **Lavado de cara completo**: tema oscuro **“Arena arcana”** (obsidiana, oro y
  violeta arcano) con tira de los cinco colores de maná, tipografías **Cinzel +
  Barlow** y paneles de carta con marco interior.
- **Nuevo sistema de compartir**: se sustituye el diálogo de texto por un **panel de
  vista previa** con cartel PNG real, **copiar imagen**, descargar y Web Share.
  El texto y el enlace de WhatsApp se mantienen como acciones secundarias.
- **Cartel del campeón** al cerrar el torneo, con campeón, finalista y mejor
  suizo/3.º clasificado, y versión provisional mientras el Top está en juego.
- **UX**: toasts no bloqueantes, diálogos de confirmación propios, contador de
  inscritos/retirados, chip de estado y de ronda, estados vacíos más claros.
- **Responsive y accesibilidad** revisados a 360/390/768/1200 px, foco visible y
  `prefers-reduced-motion`.
- **Caché** controlada con `?v=2.0.0` en CSS y JS.

### v1.2.0 · 10 de marzo de 2026
- **Crear torneo aún más limpio**: se elimina también el campo **Tiempo de ronda** de
  la pantalla de creación (se configura dentro del torneo, en su **Configuración**).
  Ahora solo se piden: nombre, fecha, lugar y organizador.
- **Clasificación más clara**: se elimina el texto explicativo (leyenda) que se
  confundía con el fondo entre la tabla y los botones. La información sigue disponible
  al pasar el ratón por encima de cada columna (*Pts*, *OMW%*, *GW%*, *OGW%*).

### v1.1.1 · 10 de marzo de 2026
- **Corrección**: al guardar la **Configuración** con un *Tiempo de ronda* nuevo, el
  **cronómetro** no reflejaba esos minutos (seguía mostrando el valor por defecto).
  Ahora, al guardar (o al abrir el torneo), el cronómetro adopta el tiempo configurado
  si está detenido; si la ronda está en marcha no se interrumpe y se aplica al generar
  la siguiente ronda.

### v1.1.0 · 10 de marzo de 2026
- **Crear torneo simplificado**: se eliminan de la pantalla de creación los campos
  redundantes **Formato**, **Número de rondas** y **Top**; ahora el torneo se crea
  solo con nombre, fecha, lugar y organizador.
- El **número de rondas**, el **Top** y el **tiempo de ronda** se ajustan dentro del
  torneo en su **Configuración** (no cambia la funcionalidad, solo se evita duplicar).

### v1.0.0 · 10 de marzo de 2026
- Versión inicial.
- Creación de torneos, inscripción de jugadores y emparejamiento suizo.
- **Byes** al peor clasificado sin bye previo, con **sorteo** entre empatados (estilo Wizards).
- Resultados por marcador exacto (Bo3) y **clasificación** con desempates (OMW%, GW%, OGW%).
- **Columnas de clasificación aclaradas en español** (leyenda + ayuda al pasar el ratón).
- **Cronómetro de ronda** configurable con **arranque automático**, **prórroga en rojo
  (cuenta hacia arriba)** y botón **➕ Añadir tiempo**.
- Eliminación directa (Top 2 / 4 / 8), drop de jugadores, exportar/importar JSON y compartir.

> **Plantilla para la próxima versión** (copia y rellena):
>
> ```markdown
> ### vX.Y.Z · DD de mes de AAAA
> - Cambio 1
> - Cambio 2
> ```
