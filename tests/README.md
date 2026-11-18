# Pruebas de Detion DCI Reporter

Tres scripts de Node sin dependencias externas. Se ejecutan desde la raíz del
proyecto (o con la ruta completa) y devuelven código de salida `1` si algo falla.

| Script | Qué comprueba | Necesita |
| --- | --- | --- |
| `node tests/verify.js` | Integración estática: IDs usados en `app.js` y `table.js` que existan en `index.html`, API de `Art.` usada vs. exportada, clases aplicadas con estilo en `styles.css` y versiones de caché `?v=` iguales a `APP_VERSION`. | Nada |
| `node tests/smoke.js` | Lógica de color/arte sin navegador: catálogo W/U/B/R/G/Artifact, símbolos y nombres de archivo, `normalize`/`meta`/`label`, `applyAccent`, prioridad del arte subido (`dci.art`), color en `createTournament`, persistencia + export/import, marcadores Bo3 (`0-0`…`0-2`, empate sin ganador en el Top) y el estado del contador de mesa (`dci.table`: vidas, veneno, maná, topes y saneado) y la tira de cabecera opcional (`banner.jpg`, `.jpeg`, `.png` o `.webp`). Carga `js/*.js` en un contexto `vm` con stubs de `localStorage` y `document`. | Nada |
| `node tests/e2e.js` | Flujo real en Edge headless vía CDP sobre `python -m http.server`: la tira de arte de cabecera (`banner.jpg` 2400×716 y clase `is-loaded`), crear torneo desde la interfaz, miniatura/etiqueta en la lista, detalle (cabecera, banner, selector, galería), cambio de color, subida y borrado de arte con la galería arcana, anotar `0-0` y `2-1` con el **desplegable central** (P1 · marcador · P2) y deshacer, clasificación, panel del campeón, carteles PNG sin *tainting* (`toDataURL`) y la pestaña **Mesa** (asientos, vida, veneno, maná, cambio de color, 2/4 jugadores y reinicio). | Python y Microsoft Edge |

## Notas

- El E2E levanta HTTP en el puerto `8123` y el depurador en `9223`; si algo queda
  colgado, cierra los procesos `python`/`msedge` de esas pruebas.
- Los 404 de `assets/images/colors/*`, `background.jpg` y `banner.jpg` son
  esperados: el arte de color y la tira de cabecera son opcionales. Sin arte se
  pinta el degradado con el símbolo de maná y sin `banner.*` la banda se oculta
  con `hidden`, sin romper la cabecera.
- Para probar el arte desde disco, guarda las imágenes en
  `assets/images/colors/<w|u|b|r|g|c>.jpg|png|webp` (ver `assets/README.md`).
