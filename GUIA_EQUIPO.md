# Guía paso a paso — DeliveryBot (Telegram + n8n + Google Sheets)

Esta guía te acompaña desde cero: descargar el código base, crear tu propia
base de datos en Google Sheets, y armar el flujo en n8n con tu propio bot de
Telegram. Cada quien arma su propia hoja de cálculo y su propio bot — no se
comparten entre compañeros.

Repositorio base: https://github.com/deyvidjgv/restoapp-Deyvid

---

## Paso 1 — Descargar el código

No hace falta usar Git si no estás familiarizado. Lo más simple:

1. Entra a https://github.com/deyvidjgv/restoapp-Deyvid
2. Botón verde **Code** → pestaña **Local** → **Download ZIP**.
3. Descomprime el ZIP en una carpeta con el nombre de tu proyecto, por
   ejemplo `Proyecto_DeliveryBot_TuApellidoTuNombre`.
4. Abre esa carpeta con tu editor (VS Code, o el que uses).

## Paso 2 — Crear la base de datos en Google Sheets

1. Entra a [sheets.google.com](https://sheets.google.com) con tu cuenta de
   Google.
2. Crea una hoja de cálculo en blanco y nómbrala `DeliveryBot_DB`.
3. Abajo, donde dice "Hoja 1", haz clic derecho → **Cambiar nombre** y
   ponle `MENU`.
4. Crea 4 pestañas más con el botón `+` de abajo a la izquierda, y
   nómbralas exactamente: `PEDIDOS`, `USUARIOS`, `SESSIONS`, `REPORTES`
   (mayúsculas, sin tildes, tal como están escritas acá — n8n va a buscar
   esos nombres exactos).

### 2.1 — Cargar las columnas y datos de prueba

En la carpeta descargada tienes una carpeta `sheets/` con un `.csv` por
cada hoja. Para cada una:

1. Abre la pestaña vacía correspondiente en tu `DeliveryBot_DB` (por
   ejemplo `MENU`).
2. Menú **Archivo → Importar**.
3. Pestaña **Subir** → arrastra el archivo `sheets/MENU.csv` (o el que
   corresponda).
4. En "Ubicación de importación" elige **"Reemplazar hoja actual"** — muy
   importante, si eliges otra opción te crea una hoja nueva en vez de
   llenar la que ya nombraste.
5. Botón **Importar datos**.
6. Repite con `PEDIDOS.csv` → hoja `PEDIDOS`, `USUARIOS.csv` → hoja
   `USUARIOS`, `SESSIONS.csv` → hoja `SESSIONS`, `REPORTES.csv` → hoja
   `REPORTES`.

Al final debes tener las 5 pestañas, cada una con su fila de encabezados y
un par de filas de ejemplo.

### 2.2 — Copiar el ID de la hoja

Mira la URL de tu hoja, se ve así:

```
https://docs.google.com/spreadsheets/d/ESTE_TROZO_ES_EL_ID/edit
```

Copia esa parte (entre `/d/` y `/edit`) y guárdala en un bloc de notas — la
vas a pegar varias veces al armar el flujo en n8n.

## Paso 3 — Crear tu bot de Telegram

1. En Telegram, busca el usuario **@BotFather** y ábrele un chat.
2. Envía `/newbot`.
3. Ponle un nombre visible (ej: "Cafetería DeliveryBot") y un usuario que
   termine en `bot` (ej: `mi_cafeteria_bot`).
4. BotFather te devuelve un **token** (algo como
   `123456789:ABCdefGhIJKlmNoPQRstuVwxYZ`). Guárdalo, es la contraseña de
   tu bot — no la compartas ni la subas a GitHub.

## Paso 4 — Crear tu cuenta de n8n

1. Entra a [n8n.io](https://n8n.io) → **Get started** → crea una cuenta
   gratuita en n8n Cloud (o instala n8n localmente si tu equipo lo prefiere:
   `npx n8n`).
2. Dentro de n8n, ve a **Credentials** → **New Credential**:
   - Busca **Telegram API**, pégale el token del Paso 3, y guárdala con el
     nombre `DeliveryBot Telegram`.
   - Busca **Google Sheets** (OAuth2), sigue el asistente para conectar tu
     cuenta de Google (la misma con la que creaste `DeliveryBot_DB`), y
     guárdala como `DeliveryBot Google Sheets`.

## Paso 5 — Armar el flujo del bot (wizard de pedido)

Crea un workflow nuevo en n8n (**Workflows → Add workflow**) y ve
agregando estos nodos, uno por uno, conectándolos en este orden:

1. **Telegram Trigger**: elige tu credencial `DeliveryBot Telegram`, y en
   "Updates" marca `message` y `callback_query`. Este nodo dispara cada vez
   que alguien le escribe algo al bot.
2. **Google Sheets (Read)**: credencial `DeliveryBot Google Sheets`,
   documento = tu `DeliveryBot_DB`, hoja = `SESSIONS`, operación "Get many
   rows" con un filtro por `telegram_id` igual al id de quien escribió.
   Esto es para saber en qué paso del pedido está esa persona.
3. **IF / Switch**: para decidir qué responder según lo que el usuario
   escribió (`/start`, un botón de categoría, una cantidad, etc.) y en qué
   `pantalla_actual` estaba guardado en `SESSIONS`.
4. **Google Sheets (Read)** sobre la hoja `MENU`: para mostrar categorías y
   productos con stock disponible.
5. **Telegram (Send Message)**: responde con los botones de categorías o
   productos (usa "Inline Keyboard" en las opciones del nodo).
6. **Google Sheets (Update/Append)** sobre `SESSIONS`: guarda en qué paso
   quedó el usuario y lo que lleva en el carrito, cada vez que responde
   algo.
7. Cuando el usuario confirma el pedido:
   - **Google Sheets (Read)** sobre `MENU` para verificar que haya stock
     suficiente y tomar el precio vigente de cada producto.
   - Un nodo **Code** (JavaScript) que sume el total y arme el detalle del
     pedido.
   - **Google Sheets (Append)** sobre `PEDIDOS`: crea la fila del pedido
     nuevo, con estado `PENDING`.
   - **Google Sheets (Update)** sobre `MENU`: descuenta el stock vendido.
   - **Google Sheets (Update/Append)** sobre `USUARIOS`: guarda o actualiza
     el `telegram_id` y nombre del cliente.
   - **Telegram (Send Message)**: confirma el pedido al cliente con el
     total y el estado.

No hace falta que te salga perfecto a la primera: prueba el flujo desde el
botón **"Execute workflow"** de n8n y ve revisando, en cada nodo, qué datos
entran y salen (el panel derecho de n8n te los muestra).

## Paso 6 — Cambio de estado y notificación al cliente

Arma un segundo grupo de nodos, que arranca con un **Webhook** (no un
Telegram Trigger):

1. **Webhook**: método `POST`, ruta `pedidos/:id/avanzar`. Esta es la URL
   que va a llamar tu panel de cocina (`comanda.html`) cuando cambien el
   estado de un pedido.
2. **Google Sheets (Read)** sobre `PEDIDOS`, buscando el pedido por
   `id_pedido`.
3. **IF**: compara el estado actual del pedido con el que espera recibir el
   webhook, para evitar que dos personas lo cambien al mismo tiempo.
4. **Google Sheets (Update)** sobre `PEDIDOS`: guarda el nuevo estado.
5. **Telegram (Send Message)**: le avisa al cliente (usando el
   `telegram_id` guardado en `PEDIDOS`) que su pedido cambió de estado.
6. **Respond to Webhook**: para que `comanda.html` sepa que el cambio se
   guardó bien.

## Paso 7 — Webhooks para tu panel de cocina/administración

El código de `admin.html`/`comanda.html` (dentro de `js/menu.js` y
`js/ventas.js`) espera poder llamar a estas rutas de tu n8n:

| Método | Ruta | Para qué |
|---|---|---|
| `GET` | `/webhook/menu` | Listar el menú |
| `POST` | `/webhook/menu` | Crear un producto |
| `PUT` | `/webhook/menu/:id` | Editar un producto |
| `DELETE` | `/webhook/menu/:id` | Eliminar un producto |
| `GET` | `/webhook/pedidos?limite=N` | Listar los últimos pedidos |
| `POST` | `/webhook/pedidos/:id/avanzar` | Cambiar el estado de un pedido |

Arma un nodo **Webhook** por cada ruta, seguido de un nodo **Google Sheets**
con la operación correspondiente (leer, crear fila, actualizar fila,
borrar fila) sobre la hoja `MENU` o `PEDIDOS`, y termina siempre con un
nodo **Respond to Webhook** que devuelva el resultado en JSON.

Cuando actives el workflow, n8n te da la URL pública de cada webhook, algo
como `https://tu-instancia.app.n8n.cloud/webhook/menu`.

## Paso 8 — Reporte diario automático

Agrega un tercer grupo, sin conexión con los anteriores:

1. **Schedule Trigger**: configúralo para que corra una vez al día (por
   ejemplo, a las 22:00).
2. **Google Sheets (Read)** sobre `PEDIDOS`.
3. **Code**: filtra los pedidos del día, suma el total vendido, cuenta qué
   producto se repite más y a qué hora hay más pedidos.
4. **Google Sheets (Append)** sobre `REPORTES`: guarda esas métricas.
5. **Telegram (Send Message)**: te manda el resumen a ti (o a un chat de
   administración) con el total vendido, el producto estrella y la hora
   pico.

## Paso 9 — Conectar tu código con tu n8n

1. Abre `js/n8n-config.js` en tu editor.
2. Reemplaza `N8N_BASE_URL` por la URL base de tus webhooks (todo lo que
   va antes de `/menu` o `/pedidos`, ej:
   `https://tu-instancia.app.n8n.cloud/webhook`).
3. Reemplaza `TELEGRAM_BOT_URL` por el link público de tu bot (se arma
   como `https://t.me/` + el usuario de tu bot, ej:
   `https://t.me/mi_cafeteria_bot`).
4. Abre `index.html` con un servidor local (por ejemplo, extensión "Live
   Server" en VS Code) y verifica que el botón "Hacer un pedido por
   Telegram" abra tu bot.

## Paso 10 — Probar todo de punta a punta

1. Escríbele `/start` a tu bot desde Telegram y sigue el flujo completo
   hasta confirmar un pedido.
2. Revisa que aparezca una fila nueva en `PEDIDOS` de tu `DeliveryBot_DB`.
3. Abre `comanda.html`, haz avanzar el estado del pedido, y confirma que te
   llega la notificación al chat de Telegram con el que hiciste el pedido.
4. Prueba el reporte diario ejecutando el workflow manualmente desde n8n
   (botón "Execute Workflow" sobre el nodo Schedule Trigger), sin esperar a
   la hora programada.

## Paso 11 — Guardar tu propio workflow

Cuando el flujo funcione, expórtalo desde n8n: **Workflows → (los tres
puntos) → Download**. Eso te descarga un `.json`. Guárdalo en tu proyecto
dentro de una carpeta `n8n/`, para entregarlo junto con el código.

## Notas

- El flujo de estados de los pedidos es siempre:
  `PENDING → IN_PREPARATION → ON_THE_WAY → DELIVERED` (Recibido → En
  preparación → En camino → Entregado). No lo cambies, el resto del código
  depende de esos nombres exactos.
- Las columnas de las hojas de `DeliveryBot_DB` también tienen que
  respetar los nombres exactos que trae `sheets/*.csv`, porque son los que
  usan las fórmulas y los nodos de n8n para encontrar cada dato.
- Si quieres darle tu propio estilo al proyecto (nombre, colores, textos),
  revisa `README.md` — la lógica no cambia, pero el diseño sí lo puedes
  hacer tuyo.
