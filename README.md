# Gestión de Torneos de Magic 🏆

**Versión actual: v2.4.5** · 21 de noviembre de 2026

Gestor de torneos de **Magic: The Gathering** (sistema suizo, resultados y clasificación).
Permite crear torneos, inscribir jugadores, generar rondas por sistema **suizo**,
introducir resultados y consultar la **clasificación** con los desempates oficiales.

Aplicación 100% estática (HTML + CSS + JavaScript), sin servidor. Se puede instalar
como app (PWA), abrir a pantalla completa y usar sin conexión una vez cargada.
La versión se muestra de forma discreta en el pie de la página.

---

## ✨ Funciones

- **📲 Instalable (PWA)**: botón **Instalar app** en móvil/Chrome, apertura a pantalla
  completa, funcionamiento sin conexión y aviso de **versión nueva** con botón
  **Actualizar** para aplicar la actualización sin reinstalar.
- **🎨 Logo oficial**: `assets/images/logo.jpg` se usa en la cabecera, el diálogo
  de instalación y los iconos de la PWA (incluido el icono adaptativo de Android).
- **Crear torneos** con los datos básicos: nombre, fecha, lugar y organizador.
- **Configuración ajustable**: el **número de rondas**, el **Top** (sin Top / Top 2 /
  Top 4 / Top 8) y el **tiempo de ronda** se definen ya dentro del torneo, mientras
  no cierres la fase suiza.
- **Inscripción de jugadores** con sugerencias de jugadores ya conocidos y botón
  **🔒 Cerrar inscripción / 🔓 Reabrir** para bloquear altas y bajas cuando la
  lista esté completa.
- **Recordatorio de inscripciones**: los jugadores usados se guardan y se
  sugieren automáticamente en torneos futuros (autocompletado).
- **Emparejamiento suizo** por puntuación, evitando repetir rival.
- **Byes automáticos** cuando el número de jugadores es impar.
- **Introducción de resultados** por mesa con un **desplegable central**: jugador 1
  a la izquierda, jugador 2 a la derecha y el marcador exacto en medio (`0-0`,
  `1-0`, `1-1`, `2-1`, `2-0`, `0-1`, `1-2`, `0-2`).
- **Clasificación (standings)** con: récord **V-D-E** (victorias-derrotas-empates, p. ej. `3-1-1`), Puntos, OMW%, GW% y OGW% (formato oficial de desempates), con una leyenda desplegable que explica cada columna.
- **Jugadores retirados** (drop) que dejan de emparejarse.
- **Exportar / Importar** todos los datos en un archivo JSON (copia de seguridad).
- **Persistencia** automática en el navegador (`localStorage`).
- **Cartel del campeón**: al cerrar el torneo se genera un póster con el campeón,
  el finalista y el mejor suizo/3.º clasificado, listo para copiar o descargar.
- **Compartir como imagen**: un único botón **📋** en **Rondas** y en
  **Clasificación** genera el cartel y lo copia al portapapeles en el mismo clic;
  si el navegador no permite copiar imágenes, lo descarga. La clasificación se
  dibuja como una **tabla** (columnas, filas, líder, byes y retirados) y la ronda
  como **tarjetas por mesa** (Mesa, estado y P1 · marcador · P2), igual que en la
  web. En la clasificación las columnas de puntos, récord V-D-E y desempates se
  ajustan al nombre más largo, y el cartel incluye una leyenda con el significado
  de cada columna. En las mesas cada nombre queda pegado al marcador central.
  El **bracket** conserva su diálogo con vista previa, descarga, compartir
  nativo y texto.
- **Avisos no bloqueantes**: toasts para confirmar acciones y diálogos propios para
  lo delicado (eliminar torneo, deshacer rondas, cerrar la suiza).
- **Contadores en vivo**: inscritos/retirados, torneos guardados y ronda actual.
- **Identidad de color por torneo** (blanco, azul, negro, rojo, verde o artefacto):
  su símbolo de maná y su acento tiñen la lista de torneos, la cabecera del torneo
  y los carteles que se comparten.
- **Arte por color**: cada identidad usa su ilustración por defecto de
  `assets/images/colors/<color>.jpg` (también `.jpeg`, `.png` y `.webp`); si
  falta, se pinta un degradado con el símbolo de maná oficial.
- **🎴 Mesa inmersiva**: pestaña **Mesa** a pantalla completa con asientos para
  **2, 3 o 4 jugadores** (los de enfrente giran 180°), vidas de **20** (o 40
  Commander) con solo **− / +**, **veneno** con aviso a 10 y **maná flotante
  W/U/B/R/G/C integrado en el asiento** de cada jugador. El desplegable de color
  pinta la ilustración de `assets/images/colors/` como fondo de su región. Los
  ajustes de la mesa (número de jugadores, vidas, giro, vaciar maná, reinicio y
  **tema claro/oscuro**) se agrupan en **una sola línea** en la franja central
  entre los asientos, junto al botón **🏆 Torneos**, para dejar libre la barra
  superior. Todo se guarda en `localStorage` (clave `dci.table`).
- **Tema claro y oscuro**: la app abre en un tema **claro tipo pergamino**, más
  luminoso y legible, con el oro y los colores de maná como acentos. El botón
  **🌙 Oscuro / ☀️ Claro** de la cabecera (y de la franja central de la Mesa)
  cambia al tema oscuro original y recuerda la elección en `localStorage`
  (`dci.theme`).

---

## 🚀 Uso en local

Solo abre `index.html` en tu navegador. No requiere servidor.

> Opcional: para servir por HTTP, con Python instalado:
> `python -m http.server` y visita `http://localhost:8000`.

---

## 📲 Instalar como app (PWA)

La app se puede instalar desde **Chrome/Edge** (icono de instalar de la barra de
direcciones o menú **⋮ → Instalar aplicación**) y desde **Safari en iPhone/iPad**
(**Compartir → Añadir a pantalla de inicio**). Una vez abierta por **HTTPS** o
**localhost**, el service worker guarda la interfaz para que funcione sin conexión.

- Si publicas una versión nueva mientras la app está abierta, aparece el aviso
  **🔄 Hay una versión nueva disponible** con el botón **Actualizar**. Al pulsarlo
  se activa el service worker nuevo y la página se recarga una sola vez.
- Para subir la versión de código y de caché:
  `python tools/bump-version.py 2.4.5`.
- El logo oficial está en `assets/images/logo.jpg` y se usa en la cabecera, el
  instalador y los iconos. Si lo cambias, regenera los iconos con
  `python tools/make-icons.py` (192, 512, maskable, Apple Touch y favicon).
- Abrir `index.html` directamente con `file://` no permite instalar la app ni
  registrar el service worker; usa `python -m http.server` o GitHub Pages.

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
js/art.js           Identidad de color, arte por defecto y símbolos de maná
js/table.js         Mesa inmersiva: vidas, veneno y maná integrado (2-4 jugadores)
js/share.js         Carteles PNG (tabla de clasificación, mesas de ronda, bracket y campeón) y texto
js/timer.js         Cronómetro de ronda y avisos acústicos
js/app.js           Controlador de la interfaz (DOM y eventos)
js/install.js       Instalador PWA (Android/iPhone) y registro del service worker
js/pwa-update.js    Aviso de versión nueva y activación del service worker
sw.js               Service worker: caché de la app y funcionamiento sin conexión
manifest.json       Manifiesto PWA: nombre, iconos y pantalla completa
tools/              Generadores de iconos PWA y subida de versión
assets/images/icons/  Iconos de instalación generados desde logo.jpg
assets/sounds/      Sonidos opcionales del cronómetro (round-*.mp3)
assets/images/      Logo oficial (logo.jpg), favicon y fondos opcionales
assets/images/symbols/  Símbolos de maná oficiales en SVG (w/u/b/r/g/c)
assets/images/colors/   Arte por color: w/u/b/r/g/c en jpg, jpeg, png o webp
assets/images/colors/LEEME.txt  Nombres exactos, formatos y medidas del arte
assets/images/banner.jpg        Tira de cabecera con las seis artes en fila (opcional)
assets/README.md    Guía de nombres y formatos de sonidos/imágenes
tests/              Pruebas sin dependencias (verify, smoke, pwa y e2e con Edge)
tests/README.md     Qué comprueba cada prueba y cómo ejecutarlas
README.md           Este archivo
```

### 🧪 Pruebas

```bash
node tests/verify.js   # integración estática: IDs, API de Art, clases y ?v=
node tests/smoke.js    # lógica de color/arte, storage y export/import
node tests/pwa.js      # manifest, iconos, service worker, instalador y actualizador
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

## 🎨 Identidad de color y arte por defecto

Cada torneo puede llevar una **identidad de color**: blanco, azul, negro, rojo,
verde o artefacto (`w`, `u`, `b`, `r`, `g`, `c`). Es opcional y se elige al crear
el torneo o desde la cabecera del torneo (**Color**). Se usa para:

- Pintar el acento y la miniatura de arte en la **lista de torneos**.
- Decorar la **cabecera del torneo** con el arte de fondo, la etiqueta de color y
  el símbolo de maná.
- Colorear los **carteles PNG** de ronda, clasificación, bracket y campeón
  (arte de fondo, barra de acento y símbolo).

### Arte por color

Cada color tiene una única imagen por defecto en **`assets/images/colors/`**:

- Nombres: `w.jpg`, `u.jpg`, `b.jpg`, `r.jpg`, `g.jpg`, `c.jpg`; también se
  aceptan `.jpeg`, `.png` y `.webp` (el nombre va siempre en minúsculas).
- Si falta la imagen, se pinta un **degradado con el símbolo de maná**: la app
  nunca se rompe por falta de arte.
- El arte se cambia editando esos archivos en la carpeta. La app **no sube ni
  guarda imágenes** desde la interfaz: se retiró la antigua *Galería arcana*.

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
los acentos. Sirviendo la app por HTTP (GitHub Pages o `python -m http.server`)
se usa también el arte por defecto de cada color.

### Aviso legal

Magic: The Gathering, sus nombres y sus símbolos son propiedad de **Wizards of
the Coast**. Se usan aquí bajo su
[Fan Content Policy](https://company.wizards.com/es/legal/fancontentpolicy).
Contenido no oficial, gratuito y sin ánimo de lucro.

---

## 🎴 Contador de mesa (partidas)

La pestaña **🎴 Mesa** convierte la app en un contador para jugar partidas
presenciales, sin torneos de por medio. Ocupa toda la pantalla y oculta la
cabecera, las pestañas y el pie mientras está activa:

- **2, 3 o 4 jugadores**: los asientos de la parte superior se giran 180° para que
  su jugador los lea derecho (se puede desactivar con *Girar asientos de enfrente*).
  En el centro de la rejilla, entre los jugadores, está el botón **🏆 Torneos**
  para volver a la pantalla principal.
- **Vidas** de **20** por defecto (o **40** para Commander) con botones grandes
  **− / +** y reinicio por jugador (**⟳**). No hay atajos ±5: solo los dos
  símbolos de vida.
- **Veneno** ☠️ por jugador con aviso verde al llegar a **10**.
- **Maná flotante integrado**: cada asiento lleva sus seis símbolos oficiales
  (blanco, azul, negro, rojo, verde y artefacto) con botones de sumar/restar;
  **🧹 Vaciar maná** deja todos los contadores a cero.
- **Nombre y color por jugador**: al elegir Blanco, Azul, Negro, Rojo, Verde o
  Artefacto en el desplegable, la ilustración de `assets/images/colors/` se pinta
  como fondo de toda su región de juego y vidas; el color también tiñe el acento
  del asiento.
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

### Columnas de la clasificación

En la tabla de clasificación verás estas columnas (pasa el ratón por encima para
ver el texto de ayuda) y, debajo, una **leyenda desplegable** con la misma
explicación:

- **#**: posición en la clasificación.
- **Jugador**: nombre del inscrito. El badge **💤 bye xN** indica los descansos
  recibidos.
- **V-D-E**: **victorias-derrotas-empates** en rondas, en formato `3-1-1`
  (3 ganadas, 1 perdida y 1 empatada). Las tres cifras suman las rondas jugadas.
  El **bye cuenta como victoria**, igual que para los puntos.
- **Pts**: puntos de torneo. Victoria **3** · Empate **1** · Derrota **0** · Bye **3**.
- **OMW%** (*Opponents' Match Win %*): **porcentaje de victorias de tus rivales**.
  Mide la "fuerza" de los jugadores contra los que te has enfrentado.
- **GW%** (*Game Win %*): **porcentaje de partidas individuales (*games*) que has
  ganado**, contando también los empates como media partida.
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

- **📋 (icono en Rondas)** → genera el cartel de la última ronda como
  **tarjetas por mesa** (Mesa, estado y P1 · marcador · P2, con el BYE en verde)
  y lo **copia al portapapeles** en el mismo clic.
- **📋 (icono en Clasificación)** → genera el cartel con la **tabla completa**
  (`#`, Jugador, Pts, V-D-E, OMW%, GW%, OGW%), el líder destacado, los byes y
  los retirados, además de una leyenda al pie con el significado de cada columna.
  Lo **copia al portapapeles**.
- **📤 Compartir bracket** → abre el diálogo del Top con las rondas, resultados
  y campeón, y sus acciones de texto/imagen.

Los dos botones de ronda y clasificación son **un único icono**: no abren el
panel de vista previa ni ofrecen botones de texto, WhatsApp o descarga. La imagen
se genera por Canvas a 960 px de ancho y doble resolución con la misma jerarquía
visual de la app. La tabla mide el nombre más largo para acercar Pts y los
desempates, y las tarjetas de mesa centran `P1 · marcador · P2` con los nombres
junto al marcador. Se pasa a `ClipboardItem` como promesa para que
**Safari/iOS** también puedan copiarla dentro del gesto del usuario. Si el
navegador no admite copiar imágenes, se **descarga automáticamente** y se avisa
con un toast.

> El **bracket** conserva el panel de vista previa con **📋 Copiar imagen**,
> **⬇️ Descargar PNG**, **📲 Compartir**, **📝 Copiar texto** y **🟢 WhatsApp**,
> igual que en la app de Blood Bowl.

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
- **Caché controlada**: CSS y JS se cargan con `?v=2.4.5`, así una versión nueva se
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

### v2.4.5 · 21 de noviembre de 2026
- **Récord V-D-E en la clasificación**: nueva columna con
  **victorias-derrotas-empates** en formato `3-1-1`, calculada a partir de los
  resultados de cada ronda. El bye cuenta como victoria, igual que para los
  puntos. El dato viaja en `Swiss.calculateStandings` como `matchRecord`.
- **Leyenda explicativa**: debajo de la tabla, un bloque desplegable
  **ℹ️ Cómo se calcula la clasificación** explica `#`, `V-D-E`, `Pts`, `OMW%`,
  `GW%`, `OGW%` y el orden de desempates. También se añade al pie del cartel PNG
  para que la imagen se entienda sin abrir la app.
- **Cartel de clasificación actualizado**: la tabla compartida incluye la columna
  `V-D-E` y una leyenda de tres líneas; las columnas siguen ajustándose al nombre
  más largo y los números permanecen cerca del jugador.
- **Pruebas**: el E2E comprueba la cabecera `V-D-E`, el récord del líder
  (`2-0-0`) y que la leyenda contiene los conceptos de clasificación.
- **Caché** controlada con `?v=2.4.5` en CSS y JS.

### v2.4.4 · 21 de noviembre de 2026
- **Carteles más compactos**: en la imagen de **clasificación** la columna del
  jugador se ajusta al nombre más largo y el espacio sobrante se reparte entre
  Pts, OMW%, GW% y OGW%, así los números quedan cerca del nombre. En la imagen de
  **ronda**, el bloque `P1 · marcador · P2` se centra y cada nombre queda junto
  al marcador, sin viajar a los extremos de la tarjeta.
- **Mesa en una sola línea**: el conmutador de **tema claro/oscuro** se traslada
  de la barra superior a la **franja central**, junto a Torneos, jugadores,
  vidas, giro, vaciar maná y reinicio. Todos los controles se alinean en una
  única fila simétrica, también en móvil, y la barra superior solo conserva
  título y estado.
- **Tema claro y oscuro**: la franja central mantiene el contraste y el aspecto
  de la app en ambos temas, con etiquetas compactas en pantallas estrechas.
- **Pruebas**: `node --check`, `verify`, `smoke`, `pwa` y `e2e` siguen en verde;
  el E2E comprueba que la franja central no se parte y que a **320 px** no hay
  scroll horizontal.
- **Caché** controlada con `?v=2.4.4` en CSS y JS.

### v2.4.3 · 21 de noviembre de 2026
- **Cartel de clasificación como tabla**: la imagen del botón **📋** reproduce
  `#standingsTable` con cabeceras (`#`, Jugador, Pts, OMW%, GW%, OGW%), filas
  alternas, líder en oro, puestos 2.º/3.º coloreados, **badge de BYE** y nombres
  retirados tachados. Ya no vuelca la clasificación como líneas de texto.
- **Cartel de ronda como mesas**: el **📋** de Rondas dibuja una tarjeta por mesa
  con **Mesa**, estado (`✅ 2-1`, `⏳ pendiente` o `BYE · victoria automática`) y
  la fila **P1 · marcador · P2**, con el BYE en verde. La banda superior muestra
  la ronda y los resultados reportados (`3/4 resultados`).
- **Mismo arte y color**: los dos carteles usan `Share.renderStandingsImage` y
  `Share.renderPairingsImage`, comparten el fondo del torneo, el símbolo de maná
  y el pie de DCI Reporter, y se generan a **960 px** con doble resolución.
- **Pruebas**: `node --check`, `verify`, `smoke`, `pwa` y `e2e` siguen en verde.
- **Caché** controlada con `?v=2.4.3` en CSS y JS.

### v2.4.2 · 21 de noviembre de 2026
- **Cierre de inscripción**: el panel **Inscripción de jugadores** incorpora
  **🔒 Cerrar inscripción / 🔓 Reabrir**. Al cerrar se oculta el formulario, se
  bloquean altas y bajas (los retiros siguen disponibles) y el estado se guarda
  en el torneo (`registrationClosed`).
- **Mesa más despejada**: los controles de **jugadores (2/3/4)**, **vidas**,
  **girar**, **🧹 vaciar maná** y **🔄 reiniciar** se trasladan de la barra
  superior a la **franja central entre los asientos**, junto al botón
  **🏆 Torneos**. Arriba solo quedan el título, el estado y el conmutador de tema.
- **Compartir con un solo icono**: **Rondas** y **Clasificación** sustituyen sus
  botones de compartir por un **📋** que genera el PNG y lo copia al portapapeles
  en el mismo clic. Sin panel intermedio ni botones de texto/WhatsApp/descarga;
  si el navegador no permite copiar, se descarga como respaldo. El bracket
  mantiene su diálogo, como en Blood Bowl.
- **Suizo sin Top**: al cerrar un torneo configurado con *Sin Top*, ya no se
  arrastra el valor oculto del selector ni se genera un **Top 2/Top 4** por error;
  el torneo finaliza como suizo puro y muestra el cartel **CAMPEÓN SUIZO**.
- **Pruebas**: `e2e.js` cubre el cierre/reapertura de inscripción, la copia
  directa de ronda y clasificación, los ajustes en la franja central de la Mesa y
  el cierre de un suizo sin Top.
- **Caché** controlada con `?v=2.4.2` en CSS y JS.

### v2.4.1 · 21 de noviembre de 2026
- **Tema claro «Pergamino arcana»**: la interfaz se aclara por defecto con fondos
  marfil, paneles claros, texto oscuro y el mismo oro/maná como acentos. Se
  revisan cabecera, paneles, formularios, listas, clasificación, cronómetro,
  carteles, avisos, instalación PWA y la Mesa completa.
- **Conmutador de tema**: botón **🌙 Oscuro / ☀️ Claro** en la cabecera y en la
  barra superior de la Mesa. La preferencia se guarda en `localStorage`
  (`dci.theme`) y se aplica antes de pintar para no producir destellos.
- **Mesa en claro**: los asientos usan fondo pergamino translúcido, arte de color
  suavizado y contadores con texto oscuro para que vidas, veneno y maná se lean
  sin esfuerzo.
- **PWA**: `manifest.json` y `theme-color` usan el fondo claro; el tema oscuro
  actualiza el color de la barra del navegador al instante.
- **Pruebas**: `e2e.js` comprueba el tema claro por defecto, el cambio a oscuro,
  la persistencia y el conmutador dentro de la Mesa.
- **Caché** controlada con `?v=2.4.1` en CSS y JS.

### v2.4.0 · 21 de noviembre de 2026
- **Mesa a pantalla completa**: al abrir **🎴 Mesa** se ocultan cabecera,
  navegación y pie, y los asientos ocupan todo el viewport (móvil, tablet y
  escritorio). La rejilla reserva una fila central para el botón **🏆 Torneos**.
- **Maná integrado en cada asiento**: se elimina el panel aparte de maná flotante;
  cada jugador tiene sus seis símbolos W/U/B/R/G/C con sus botones de sumar y
  restar, y **🧹 Vaciar maná** sigue disponible en la barra superior.
- **Vidas más limpias**: se retiran los atajos ±1/±5 y quedan solo los botones
  **− / +** para las vidas, con el contador y el veneno en el mismo asiento.
- **Fondo de galería por jugador**: el desplegable Blanco/Azul/Negro/Rojo/Verde/
  Artefacto pinta la ilustración de `assets/images/colors/` como fondo de toda la
  región de juego y vidas, con el acento del color en el borde.
- **Pruebas**: `e2e.js` comprueba la pantalla completa, el botón central, el maná
  dentro de los asientos, los botones − / + y que el arte de color se pinta.
- **Caché** controlada con `?v=2.4.0` en CSS y JS.

### v2.3.3 · 21 de noviembre de 2026
- **Logo oficial**: se integra `assets/images/logo.jpg` como imagen de marca de la
  app en la cabecera y en el diálogo de instalación.
- **Instalador web**: los iconos 192, 512, maskable y Apple Touch se regeneran con
  el logo oficial; se añaden `favicon.png` y `favicon.ico` para la pestaña.
- **PWA**: el manifest usa el nombre **Gestor de Torneos MTG** y el nombre corto
  **Torneos MTG**, coherentes con el logo.
- **Mantenimiento**: `tools/make-icons.py` toma `logo.jpg` como fuente y genera
  todos los tamaños; el service worker cachea el logo y los favicons.
- **Pruebas**: `pwa.js` verifica que los iconos existen, pesan como imágenes
  reales y que `index.html` ya no usa los iconos provisionales; `e2e.js` comprueba
  el logo de la cabecera y los favicons.
- **Caché** controlada con `?v=2.3.3` en CSS y JS.

### v2.3.2 · 21 de noviembre de 2026
- **HUB más limpio**: se retira la **Galería arcana** de la pantalla principal
  (panel, selector de archivo y botones de subida). El arte ya no se edita desde
  la app; las imágenes subidas antes en `dci.art` dejan de aplicarse (no se borran
  del navegador, simplemente se ignoran).
- **Arte por defecto garantizado**: cada identidad de color usa su ilustración de
  `assets/images/colors/` (`w`, `u`, `b`, `r`, `g`, `c` en `.jpg`, `.jpeg`,
  `.png` o `.webp`); si falta, se mantiene el degradado con el símbolo de maná.
- **Corregida la miniatura de Torneos guardados**: la cadena de respaldo saltaba
  `.jpeg` al fallar `.jpg`, así que las imágenes por defecto (guardadas como
  `.jpeg`) no llegaban a mostrarse ni en la lista ni en la cabecera. Ahora la
  miniatura y el banner cargan el arte del color elegido.
- **Pruebas**: `smoke.js` comprueba el arte por defecto en disco y la ausencia de
  la galería; `e2e.js` verifica que la miniatura y el banner cargan el `.jpeg`
  real del color.
- **Caché** controlada con `?v=2.3.2` en CSS y JS.

### v2.3.1 · 21 de noviembre de 2026
- **PWA instalable**: nuevo `manifest.json`, iconos 192/512/maskable y Apple Touch
  Icon; botón flotante **Instalar app** para Android/Chrome, iPhone/iPad y escritorio.
- **Funcionamiento sin conexión**: `sw.js` guarda la interfaz (HTML, CSS, JS, manifest
  e imágenes de la app) y sirve la última versión desde la red cuando hay conexión.
- **Aviso de versión nueva**: `js/pwa-update.js` detecta el service worker en espera,
  muestra **🔄 Hay una versión nueva disponible** y, al pulsar **Actualizar**, activa
  la versión nueva y recarga una sola vez. Se puede cerrar con **✕** o `Esc`.
- **Mantenimiento**: `tools/make-icons.py` regenera los iconos y
  `tools/bump-version.py` sube `APP_VERSION`, `CACHE_VERSION` y los `?v=`.
- **Pruebas**: nuevo `tests/pwa.js` para manifest, iconos, service worker, instalador
  y aviso de actualización.
- **Caché** controlada con `?v=2.3.1` en CSS y JS.

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
- La interfaz de arte por color (retirada en v2.3.2) mostraba la ruta y los
  formatos válidos, y el `assets/images/colors/LEEME.txt` recuerda nombres,
  proporción 2:3 y tamaño.
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
- **Arte por color** (la antigua *Galería arcana*, retirada en v2.3.2): cada
  color usa su imagen de `assets/images/colors/<color>.jpg|png|webp`; sin arte
  se pinta un degradado con el símbolo de maná.
- **Lista y detalle**: miniatura de arte y acento de color en cada torneo,
  banner de arte en la cabecera y etiqueta de identidad.
- **Carteles PNG**: fondo con el arte del torneo, barra de acento y símbolo de
  maná (ronda, clasificación, bracket y campeón), con guardas para `file://`.
- **Aviso legal** de Fan Content Policy en el pie.
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
