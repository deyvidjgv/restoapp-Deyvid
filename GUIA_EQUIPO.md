# Guía paso a paso — DeliveryBot (Discord + n8n + Google Sheets)

Esta guía te acompaña desde cero: descargar el código base, crear tu propia
base de datos en Google Sheets, y armar el flujo en n8n con tu propio bot de
Discord. Cada quien arma su propia hoja de cálculo y su propio bot — no se
comparten entre compañeros.

> El enunciado original habla de Telegram. Acá usamos **Discord** en su lugar:
> el flujo de pedido es el mismo (menú por categorías, carrito, confirmación,
> notificaciones de estado), solo cambia la plataforma de mensajería.

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
un par de filas de ejemplo. Las hojas `USUARIOS` y `SESSIONS` tienen una
columna `discord_id` (el identificador numérico del usuario en Discord).

### 2.2 — Copiar el ID de la hoja

El ID identifica **todo el archivo** `DeliveryBot_DB` (no cada pestaña). Es
uno solo. Mira la URL de tu hoja, se ve así:

```
https://docs.google.com/spreadsheets/d/ESTE_TROZO_ES_EL_ID/edit
```

Copia esa parte (entre `/d/` y `/edit`) y guárdala en un bloc de notas — la
vas a pegar en cada nodo de Google Sheets de n8n (campo "Document ID"). En
cada nodo eliges además la **pestaña** por nombre.

## Paso 3 — Crear tu aplicación y bot de Discord

1. Entra a https://discord.com/developers/applications con tu cuenta de
   Discord → botón **New Application** → ponle un nombre (ej:
   "Cafetería DeliveryBot") → **Create**.
2. En **General Information**, copia y guarda en tu bloc de notas:
   - **Application ID**
   - **Public Key**
3. Menú izquierdo → **Bot**:
   - Botón **Reset Token** → **Copy** → guarda el **Bot Token** (es la
     contraseña del bot, no la subas a GitHub ni la compartas).
   - Baja hasta "Privileged Gateway Intents" y activa **Message Content
     Intent** (por si lo necesitas más adelante). Guarda los cambios.
4. Menú izquierdo → **OAuth2** → **OAuth2 URL Generator**:
   - En **Scopes** marca `bot` y `applications.commands`.
   - En **Bot Permissions** (aparece abajo al marcar `bot`) marca:
     `Send Messages`, `Embed Links`, `Read Message History`.
   - Copia la **URL generada** al final, ábrela en el navegador, y elige tu
     servidor para agregar el bot. Si no tienes un servidor propio: en
     Discord, botón `+` de la izquierda → **Crear mi propio** → ponle
     cualquier nombre.
5. Activa el **Modo desarrollador** en Discord (Ajustes de usuario →
   Avanzado → Modo desarrollador). Ahora puedes hacer clic derecho sobre un
   canal → **Copiar ID de canal**. Guarda el ID de:
   - el canal donde quieres que lleguen los avisos a **cocina**
   - el canal donde quieres que llegue el **reporte diario** (puede ser el
     mismo)
   - y el **ID de tu servidor** (clic derecho sobre el nombre del servidor
     → Copiar ID del servidor).

La **Interactions Endpoint URL** de tu app la configuras en el Paso 6,
cuando ya exista el webhook de n8n.

## Paso 4 — Crear tu cuenta de n8n y guardar la configuración

1. Entra a [n8n.io](https://n8n.io) → **Get started** → crea una cuenta
   gratuita en n8n Cloud.
2. Crea las **credenciales** que vas a usar:
   - **Google Sheets (OAuth2)**: **Credentials → New → Google Sheets OAuth2
     API**, sigue el asistente para conectar la misma cuenta de Google con
     la que creaste `DeliveryBot_DB`. Guárdala como `DeliveryBot Sheets`.
   - Para Discord **no** hay asistente: el token del bot lo vas a pasar a
     mano en los nodos HTTP Request (Paso 5 en adelante).
3. Crea un **workflow nuevo** (**Workflows → Add workflow**) y como primer
   nodo agrega un **Set** (o **Edit Fields**) llamado `Config`, con estos
   campos de texto (n8n Cloud free no tiene "Variables", así que este nodo
   hace las veces de eso — lo vas a referenciar desde los demás):

   | Campo | Valor |
   |---|---|
   | `SHEET_ID` | el ID de tu `DeliveryBot_DB` |
   | `DISCORD_APP_ID` | el Application ID |
   | `DISCORD_PUBLIC_KEY` | la Public Key |
   | `DISCORD_BOT_TOKEN` | el Bot Token |
   | `CANAL_COCINA` | el ID del canal de cocina |
   | `CANAL_ADMIN` | el ID del canal del reporte |
   | `GUILD_ID` | el ID de tu servidor |

## Paso 5 — Registrar el comando `/pedir`

Discord necesita que registres los "slash commands" una sola vez. Arma un
mini-flujo aparte:

1. **Manual Trigger** → **HTTP Request**:
   - Método **PUT**
   - URL: `https://discord.com/api/v10/applications/{{ APP_ID }}/guilds/{{ GUILD_ID }}/commands`
     (usa los comandos "de servidor": son instantáneos; los globales tardan
     hasta 1 hora en aparecer)
   - Headers: `Authorization` = `Bot TU_BOT_TOKEN`,
     `Content-Type` = `application/json`
   - Body (JSON):
     ```json
     [
       { "name": "pedir", "description": "Iniciar un pedido en la cafetería", "type": 1 },
       { "name": "menu",  "description": "Ver el menú disponible", "type": 1 }
     ]
     ```
2. Ejecuta ese nodo una vez (**Execute step**). Si responde `200`, el
   comando quedó registrado. Este mini-flujo no hace falta activarlo.

## Paso 6 — Webhook de interacciones + verificación de firma

Este es el corazón del bot. Todo clic de botón o comando llega acá.

1. **Webhook**:
   - Método **POST**, path `discord`.
   - En **Options** activa **Raw Body**.
   - "Respond" = **Using 'Respond to Webhook' node**.
2. **Code** — "Verificar firma". Pega este código y reemplaza tu Public Key:

   ```js
   // Verifica que el request venga realmente de Discord (firma Ed25519).
   const PUBLIC_KEY = 'PEGA_AQUI_TU_PUBLIC_KEY';

   const h = $input.first().json.headers;
   const sig = h['x-signature-ed25519'];
   const ts  = h['x-signature-timestamp'];
   const body = $input.first().json.body;
   const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

   const hexToBytes = (hex) =>
     Uint8Array.from(hex.match(/.{1,2}/g).map((b) => parseInt(b, 16)));

   const key = await crypto.subtle.importKey(
     'raw', hexToBytes(PUBLIC_KEY), { name: 'Ed25519' }, false, ['verify'],
   );
   const valido = !!sig && !!ts && await crypto.subtle.verify(
     'Ed25519', key, hexToBytes(sig), new TextEncoder().encode(ts + bodyStr),
   );

   const interaction = JSON.parse(bodyStr);
   return [{ json: { valido, tipo: interaction.type, interaction } }];
   ```

3. **IF** — `valido` es `true`:
   - **rama false** → **Respond to Webhook** con código **401** y body
     `invalid request signature`.
4. **Switch** sobre `{{ $json.tipo }}` (solo en la rama válida):
   - `1` (PING) → **Respond to Webhook** con body `{ "type": 1 }`. Discord
     manda esto al guardar la Endpoint URL; si no respondes así, no te deja
     guardarla.
   - `2` (slash command) → va al wizard (Paso 7), rama "comando".
   - `3` (clic de botón / menú) → va al wizard, rama "componente".

5. Guarda el workflow y **actívalo** (toggle arriba a la derecha). n8n te da
   la URL de producción del webhook, algo como
   `https://TU-INSTANCIA.app.n8n.cloud/webhook/discord`.
6. Vuelve al Discord Developer Portal → **General Information** →
   **Interactions Endpoint URL** → pega esa URL → **Save Changes**. Si todo
   está bien, Discord la acepta (internamente mandó un PING y tu flujo
   respondió el PONG).

## Paso 7 — Wizard de pedido

Cada respuesta al webhook es un JSON de interacción. Los `type` de respuesta
que vas a usar:

| `type` | Qué hace |
|---|---|
| `4` | Enviar un mensaje nuevo (`data: { content, components }`) |
| `7` | Editar el mensaje que tenía el botón (mismo `data`) |
| `5` | "Pensando…" — te da tiempo; después editas con un HTTP Request |

Los botones y menús van en `data.components`: una lista de filas
(`type: 1`), y dentro botones (`type: 2`, con `style` 1-4 y `custom_id`) o un
menú desplegable (`type: 3`, con `options`).

Nodos, encadenados desde la rama "comando"/"componente" del Switch:

1. **Google Sheets (Read)** hoja `MENU`: trae todos los productos.
2. **Code** "Router": según `interaction.data.name` (`pedir`/`menu`) o
   `interaction.data.custom_id` (`cat:Bebidas`, `prod:PROD-004`,
   `qty:PROD-004:2`, `add`, `confirm`) y la `pantalla_actual` guardada en
   `SESSIONS`, decide qué mostrar.
3. **Google Sheets (Read)** hoja `SESSIONS` filtrando por `discord_id` =
   `{{ interaction.member.user.id }}`: para saber en qué paso está y qué
   lleva en el carrito.
4. Según el paso:
   - **Inicio** (`/pedir`): menú desplegable con las categorías que tengan
     stock > 0 → **Respond to Webhook** `{ type: 4, data: {...} }`.
   - **Eligió categoría** (`cat:*`): menú con los productos de esa categoría
     → `{ type: 7, ... }`.
   - **Eligió producto** (`prod:*`): botones de cantidad 1 a 5 →
     `{ type: 7, ... }`.
   - **Eligió cantidad** (`qty:*`): botones **Agregar otro** / **Confirmar
     pedido**.
5. **Google Sheets (Update/Append)** hoja `SESSIONS`: guarda
   `pantalla_actual` y `carrito_temporal` cada vez que el usuario responde.
6. Al **Confirmar**:
   - **Respond to Webhook** `{ type: 5 }` (gana tiempo).
   - **Google Sheets (Read)** `MENU`: verifica stock y toma el precio
     vigente de cada línea del carrito.
   - **Code**: suma el total y arma el `detalles_pedido`.
   - **Google Sheets (Append)** `PEDIDOS`: fila nueva, estado `PENDING`,
     `id_usuario` = el `discord_id`, `id_pedido` = `PED-` + timestamp.
   - **Google Sheets (Update)** `MENU`: descuenta el stock vendido.
   - **Google Sheets (Update/Append)** `USUARIOS`: guarda/actualiza
     `discord_id` y `nombre_completo`.
   - **HTTP Request** `PATCH`
     `https://discord.com/api/v10/webhooks/{{ APP_ID }}/{{ interaction.token }}/messages/@original`
     con el mensaje de confirmación (total + estado). Sin header de auth: el
     `interaction.token` ya autoriza.
   - **HTTP Request** `POST`
     `https://discord.com/api/v10/channels/{{ CANAL_COCINA }}/messages`
     (header `Authorization: Bot TU_TOKEN`) avisando del pedido nuevo.

Prueba con **Execute workflow** activado y revisa, en cada nodo, qué entra y
qué sale (panel derecho de n8n).

## Paso 8 — Cambio de estado y aviso al cliente

Segundo grupo de nodos, arranca con un **Webhook** distinto (no el de
interacciones):

1. **Webhook**: método `POST`, path `pedidos-avanzar`. Es la URL que llama
   `comanda.html` al cambiar el estado de un pedido.
2. **Google Sheets (Read)** `PEDIDOS`, buscando por `id_pedido`.
3. **IF**: compara el estado actual del pedido con el que espera recibir el
   webhook (evita que dos personas lo muevan a la vez). Si no coincide →
   **Respond to Webhook** con código **409**.
4. **Google Sheets (Update)** `PEDIDOS`: guarda el nuevo estado.
5. **HTTP Request** `POST`
   `https://discord.com/api/v10/users/@me/channels`
   (header `Authorization: Bot TU_TOKEN`, body `{ "recipient_id": "<discord_id del cliente>" }`)
   → devuelve un `id` de canal DM.
6. **HTTP Request** `POST`
   `https://discord.com/api/v10/channels/{{ $json.id }}/messages`
   con el aviso de que el pedido cambió de estado. (Si el cliente tiene los
   DM cerrados esto falla; alternativa: postear en `CANAL_COCINA`
   mencionándolo con `<@discord_id>`.)
7. **Respond to Webhook**: para que `comanda.html` sepa que se guardó bien.

## Paso 9 — Webhooks para tu panel de cocina/administración

El código de `admin.html`/`comanda.html` (dentro de `js/menu.js` y
`js/ventas.js`) espera poder llamar a estas rutas de tu n8n. Estas **no**
tienen nada de Discord: son Webhook → Google Sheets → Respond to Webhook.

| Método | Ruta | Para qué |
|---|---|---|
| `GET` | `/webhook/menu` | Listar el menú |
| `POST` | `/webhook/menu` | Crear un producto (el `id_producto` lo genera un nodo Code: `PROD-` + timestamp) |
| `PUT` | `/webhook/menu/:id` | Editar un producto |
| `DELETE` | `/webhook/menu/:id` | Eliminar un producto |
| `GET` | `/webhook/pedidos?limite=N` | Listar los últimos pedidos |
| `POST` | `/webhook/pedidos/:id/avanzar` | Cambiar el estado de un pedido (es el del Paso 8) |

Arma un nodo **Webhook** por cada ruta, seguido de un nodo **Google Sheets**
con la operación correspondiente (leer, crear fila, actualizar fila,
borrar fila) sobre la hoja `MENU` o `PEDIDOS`, y termina siempre con un
nodo **Respond to Webhook** que devuelva el resultado en JSON.

## Paso 10 — Reporte diario automático

Tercer grupo, sin conexión con los anteriores:

1. **Schedule Trigger**: una vez al día (por ejemplo, a las 22:00).
2. **Google Sheets (Read)** sobre `PEDIDOS`.
3. **Code**: filtra los pedidos del día, suma el total vendido, cuenta qué
   producto se repite más y a qué hora hay más pedidos.
4. **Google Sheets (Append)** sobre `REPORTES`: guarda esas métricas.
5. **HTTP Request** `POST`
   `https://discord.com/api/v10/channels/{{ CANAL_ADMIN }}/messages`
   (header `Authorization: Bot TU_TOKEN`) con el resumen: total vendido,
   producto estrella y hora pico.

   > Alternativa más simple: en Discord, ajustes del canal → **Integraciones
   > → Webhooks → Nuevo webhook** → copia la URL. Entonces este nodo es un
   > HTTP Request `POST` a esa URL con body `{ "content": "..." }`, sin
   > ningún header de auth.

## Paso 11 — Conectar tu código con tu n8n

1. Abre `js/n8n-config.js` en tu editor.
2. Reemplaza `N8N_BASE_URL` por la URL base de tus webhooks (todo lo que
   va antes de `/menu` o `/pedidos`, ej:
   `https://tu-instancia.app.n8n.cloud/webhook`).
3. Reemplaza `DISCORD_BOT_URL` por el enlace de invitación de tu bot o de tu
   servidor (ej: `https://discord.gg/xxxxxx`, desde tu servidor →
   Invitar personas → copiar enlace).
4. Abre `index.html` con un servidor local (por ejemplo, extensión "Live
   Server" en VS Code) y verifica que el botón "Hacer un pedido por Discord"
   abra tu servidor/bot.

## Paso 12 — Probar todo de punta a punta

1. En tu servidor de Discord escribe `/pedir` y sigue el wizard completo
   hasta confirmar un pedido.
2. Revisa que aparezca una fila nueva en `PEDIDOS` de tu `DeliveryBot_DB`.
3. Abre `comanda.html`, haz avanzar el estado del pedido, y confirma que te
   llega el mensaje directo (DM) de Discord.
4. Prueba el reporte diario ejecutando el workflow manualmente desde n8n
   (botón "Execute Workflow" sobre el nodo Schedule Trigger), sin esperar a
   la hora programada.

## Paso 13 — Guardar tu propio workflow

Cuando el flujo funcione, expórtalo desde n8n: **Workflows → (los tres
puntos) → Download**. Eso te descarga un `.json`. Guárdalo en tu proyecto
dentro de una carpeta `n8n/`, para entregarlo junto con el código.

## Notas

- El flujo de estados de los pedidos es siempre:
  `PENDING → IN_PREPARATION → ON_THE_WAY → DELIVERED` (Recibido → En
  preparación → En camino → Entregado). No lo cambies, el resto del código
  depende de esos nombres exactos.
- Las columnas de las hojas de `DeliveryBot_DB` también tienen que
  respetar los nombres exactos que trae `sheets/*.csv`. La columna de
  identidad del usuario se llama `discord_id` (en `USUARIOS` y `SESSIONS`);
  en `PEDIDOS`, el `id_usuario` guarda ese mismo `discord_id`.
- El `discord_id` lo sacas de cada interacción en
  `interaction.member.user.id` (dentro de un servidor) o
  `interaction.user.id` (en DM).
- La verificación de firma del Paso 6 es **obligatoria**: sin ella Discord
  no te deja guardar la Interactions Endpoint URL.
- Si quieres darle tu propio estilo al proyecto (nombre, colores, textos),
  revisa `README.md` — la lógica no cambia, pero el diseño sí lo puedes
  hacer tuyo.
