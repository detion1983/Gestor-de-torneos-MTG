# Gestión de Torneos de Magic 🏆

Gestor de torneos de **Magic: The Gathering** (sistema suizo, resultados y clasificación).
Permite crear torneos, inscribir jugadores, generar rondas por sistema **suizo**,
introducir resultados y consultar la **clasificación** con los desempates oficiales.

Aplicación 100% estática (HTML + CSS + JavaScript), sin servidor ni instalación.

---

## ✨ Funciones

- **Crear torneos** con nombre, fecha, lugar, organizador, formato, **número de
  rondas** y **tipo de Top** (sin Top / Top 2 / Top 4 / Top 8).
- **Configuración ajustable**: mientras no cierres las inscripciones puedes
  cambiar el número de rondas y el Top desde la vista del torneo.
- **Inscripción de jugadores** con sugerencias de jugadores ya conocidos.
- **Recordatorio de inscripciones**: los jugadores usados se guardan y se
  sugieren automáticamente en torneos futuros (autocompletado).
- **Emparejamiento suizo** por puntuación, evitando repetir rival.
- **Byes automáticos** cuando el número de jugadores es impar.
- **Introducción de resultados** por mesa (victoria jugador 1 / empate / victoria jugador 2).
- **Clasificación (standings)** con: Puntos, OMW%, GW% y OGW% (formato oficial de desempates).
- **Jugadores retirados** (drop) que dejan de emparejarse.
- **Exportar / Importar** todos los datos en un archivo JSON (copia de seguridad).
- **Persistencia** automática en el navegador (`localStorage`).

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
js/share.js         Genera texto/imagen para compartir por WhatsApp
js/timer.js         Cronómetro de ronda y avisos acústicos
js/app.js           Controlador de la interfaz (DOM y eventos)
assets/sounds/      Sonidos opcionales del cronómetro (round-*.mp3)
assets/images/      Imágenes opcionales (logo.png, favicon, fondo)
assets/README.md    Guía de nombres y formatos de sonidos/imágenes
README.md           Este archivo
```

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

## ⚙️ Cómo funciona el sistema suizo

1. Se ordenan los jugadores por puntos, luego por OMW%, GW% y OGW%.
2. **(Nuevo)** **No se puede emparejar una ronda nueva hasta reportar TODOS los
   resultados de la anterior.** El botón **"🎲 Generar siguiente ronda"** se
   bloquea y muestra *"⏳ Faltan X/Y resultados"* mientras haya mesas sin
   resultado, igual que en un torneo real (en el suizo los emparejamientos
   dependen de los resultados previos). Si se pulsa igualmente, aparece un aviso.
3. Se emparejan por orden dentro del mismo bloque, evitando revancha si es posible
   (los jugadores con el mismo récord se enfrentan entre sí y no repiten rival).
4. Si el número de jugadores activos es impar, el peor situado que aún no ha
   tenido bye recibe un **bye** (victoria automática de 3 puntos). El **bye no
   bloquea** la ronda: nace reportado y no cuenta como pendiente.
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

### Desempates
- **OMW%**: porcentaje de victorias de los rivales enfrentados.
- **GW%**: porcentaje de partidas (*games*) ganadas.
- **OGW%**: porcentaje de partidas de los rivales.

### Registro de resultados (marcador exacto)
Al reportar cada partida se elige el **marcador real de games**, con botones rápidos:

`2-0` · `2-1` · `1-0` · `1-1` · `0-1` · `0-2` · `1-2`

Cada combinación posible de una ronda al mejor de 3 (Bo3), agrupada y ordenada
por ganador:

- **Gana P1**: `2-0`, `2-1`, `1-0` (rival concede / no se presenta)
- **Empate**: `1-1` (por tiempo / tablas)
- **Gana P2**: `0-1` (rival concede / no se presenta), `0-2`, `1-2`

También hay un botón **✖ Deshacer** en cada mesa para borrar el resultado y
dejarlo pendiente de nuevo.

Guardar el marcador exacto (y no asumir siempre 2-0) hace que **GW% y OGW%**
se calculen correctamente. Internamente el ganador se deriva del marcador.

---

## 📤 Compartir por WhatsApp

Desde el detalle del torneo hay botones para compartir:

- **Compartir ronda**: texto con emparejamientos + clasificación de la última ronda.
- **Compartir clasificación**: solo la tabla de posiciones.
- **Compartir bracket**: rondas de la eliminatoria y campeón.

Cada botón abre un diálogo con:
- **📋 Copiar emparejamientos** → copia solo las mesas de la última ronda.
- **📊 Copiar clasificación** → copia solo la tabla de posiciones.
- **📋 Copiar todo** → copia emparejamientos + clasificación juntos.
- **🟢 Abrir WhatsApp** → abre WhatsApp (`wa.me`) con el texto ya escrito.
- **🖼️ Descargar imagen** → genera un PNG con el contenido (Canvas interno).
- **📲 Compartir imagen** → usa la Web Share API del móvil para enviar el PNG
  directamente a WhatsApp (en PC, si no está disponible, descarga el PNG).

**Flujo recomendado con WhatsApp de escritorio:** al abrir el diálogo el texto ya
se copia automáticamente; solo tienes que ir a tu grupo de WhatsApp (Windows) y
pegar con **Ctrl+V**. También puedes hacer clic en el cuadro de texto para
seleccionarlo todo y copiarlo con **Ctrl+C**.

> Nota: la app **no lee los miembros del grupo** (WhatsApp no lo permite). Tú
> controlas el envío pegando el texto o compartiendo la imagen.

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
