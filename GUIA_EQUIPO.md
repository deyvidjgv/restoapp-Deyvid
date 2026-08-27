# Guía para el equipo — DeliveryBot (Telegram + n8n + Google Sheets)

Esta guía es para quienes van a entregar su **propia versión** del proyecto
DeliveryBot, partiendo del trabajo ya hecho en:

**Repositorio base**: https://github.com/deyvidjgv/restoapp-Deyvid

No la copien tal cual. La lógica (cómo funciona el pedido, los estados, el
cálculo de totales, el workflow de n8n) es válida para todos y pueden
reusarla — es la arquitectura que pide la consigna. Lo que **sí tiene que
cambiar por equipo** es el diseño: nombres de archivos y variables, estilos
visuales, textos, colores. Entregar código idéntico entre compañeros es
plagio, aunque el profesor no lo note a simple vista un revisor automático sí.

## Paso 1 — Cloná el repo base

```bash
git clone https://github.com/deyvidjgv/restoapp-Deyvid.git Proyecto_DeliveryBot_TuApellidoTuNombre
cd Proyecto_DeliveryBot_TuApellidoTuNombre
rm -rf .git
git init
```

(El `rm -rf .git` + `git init` es para que quede como un repo nuevo, propio,
no un fork visible del original.)

## Paso 2 — Entendé la arquitectura antes de tocar nada

Lean, en este orden:
1. `README.md` — qué hace cada módulo y cómo se conectan Telegram, n8n y
   Google Sheets.
2. `n8n/deliverybot-workflow.json` — abranlo en un editor de texto (es JSON)
   y sigan los `notes` de cada nodo para entender el flujo del bot.
3. `js/menu.js` y `js/ventas.js` — cómo la webapp habla con n8n.

Si no entienden algo de la lógica, pregúntenle a su Claude/IA "¿qué hace este
nodo/función y por qué está ahí?" antes de cambiarlo — el objetivo es
aprender el diseño del sistema, no solo entregarlo.

## Paso 3 — Cambien el diseño (no la lógica) con este prompt

Péguenle esto a su propio asistente de código (Claude Code, o el que usen),
**dentro de la carpeta ya clonada**, y ajusten lo que está entre `< >`:

```
Este proyecto es un sistema DeliveryBot (Telegram + n8n + Google Sheets)
que ya tiene la lógica de negocio funcionando: flujo de estados de pedido,
validación de stock, cálculo de totales, notificaciones, workflow de n8n.

Quiero re-diseñar la presentación del proyecto SIN CAMBIAR la lógica ni el
comportamiento funcional. Específicamente:

1. Cambia el nombre del proyecto de "DeliveryBot"/"RestoApp" a
   "<NOMBRE_QUE_ELIJAN>" en README, títulos HTML, comentarios y el nombre
   del workflow de n8n.
2. Cambia la paleta de colores y tipografía en css/styles.css por
   <colores/estilo que quieran, ej: "tonos verdes y tipografía sans-serif
   moderna">, sin romper el layout existente.
3. Renombra las variables y funciones de los módulos JS a los nombres que
   elijan (por ejemplo RestoMenu -> <OtroNombre>Menu), manteniendo
   exactamente la misma firma de funciones y el mismo comportamiento.
4. Reescribe los comentarios del código y los textos visibles al usuario
   (botones, mensajes del bot de Telegram) con tu propia redacción, sin
   copiar literalmente las frases del original.
5. En n8n/deliverybot-workflow.json, cambia los nombres de los nodos y los
   textos de los mensajes de Telegram por tu propia redacción, sin tocar
   los "connections" ni la lógica de las funciones (functionCode), salvo
   variables/nombres.
6. NO cambies: el flujo de estados (PENDING/IN_PREPARATION/ON_THE_WAY/
   DELIVERED), las columnas de las hojas de Google Sheets, ni la forma en
   que se calculan totales o se valida el stock.

Al terminar, dame un resumen de qué archivos cambiaste y confirmá que la
lógica de negocio sigue siendo idéntica a la original.
```

## Paso 4 — Cada quien arma su propia Google Sheets y su propio bot

Esto **no se comparte entre compañeros**: cada equipo necesita su propia
hoja de cálculo y su propio bot de Telegram (con su propio token), aunque
usen el mismo workflow de n8n como base. Ver `README.md` → sección "Puesta
en marcha" para los pasos.

## Paso 5 — Documenten sus propias decisiones

En el README de su copia, agreguen una sección "Decisiones de diseño" con lo
que cambiaron y por qué (nombre del proyecto, colores, alguna diferencia
funcional que hayan agregado). Eso además demuestra que entendieron el
sistema, no que solo lo copiaron.
