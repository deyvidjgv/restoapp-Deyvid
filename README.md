# DeliveryBot — Gestión de Pedidos Internos de Cafetería

Sistema de pedidos para la cafetería de un entorno institucional (oficina,
universidad). El cliente pide por **Telegram**; el motor de automatización es
**n8n**; los datos viven en **Google Sheets**. La cocina y la administración
usan además un panel web liviano (heredado de RestoApp) para ver pedidos y
mantener el menú, hablando siempre con n8n y nunca directo con Sheets.

## Arquitectura

```
Cliente (Telegram) ──► n8n (bot + wizard) ──┐
                                             ├──► Google Sheets (DeliveryBot_DB)
Cocina / Admin (admin.html, comanda.html) ──► n8n (webhooks REST) ──┘
                                             │
                                             └──► Telegram (push de estado, reporte diario)
```

- **Interfaz de cliente — Telegram**: menú por categorías (Bebidas, Comidas,
  Snacks), carrito, confirmación, y notificaciones push cuando el pedido pasa
  de Recibido → En preparación → En camino → Entregado.
- **Motor — n8n**: valida stock, calcula el total, genera el `id_pedido`,
  gestiona el cambio de estados y dispara las notificaciones. También expone
  webhooks REST para que la webapp de cocina/administración lea y escriba en
  Sheets sin necesitar credenciales de Google en el navegador.
- **Datos — Google Sheets** (`DeliveryBot_DB`): hojas `MENU`, `PEDIDOS`,
  `USUARIOS`, `SESSIONS` (y `REPORTES`, agregada para guardar el histórico de
  reportes diarios).
- **Panel web (opcional, para cocina/administración)**: `admin.html` gestiona
  el menú y ve los pedidos; `comanda.html` hace avanzar el estado de cada
  pedido. El login usa Firebase Authentication (correo/contraseña) solo para
  esto — ningún dato de negocio vive en Firebase.

El cliente **no** usa una página web para pedir: el flujo de pedido completo
está en Telegram, tal como pide el enunciado. La webapp es una herramienta
adicional para el personal.

## Puesta en marcha

### 1. Google Sheets

1. Crear una hoja de cálculo nueva, `DeliveryBot_DB`.
2. Crear las hojas `MENU`, `PEDIDOS`, `USUARIOS`, `SESSIONS`, `REPORTES` con
   las columnas descritas abajo. Los archivos en `sheets/*.csv` traen datos de
   prueba listos para importar como valores iniciales de cada hoja.
3. Compartir la hoja con la cuenta de servicio (o cuenta OAuth) que usará n8n
   para leer/escribir.

### 2. n8n

El workflow se arma a mano en el editor de n8n siguiendo el flujo descrito
más abajo ("Flujo 'Realizar Pedido'"); no se entrega un JSON prearmado a
propósito, para que quede claro qué hace cada nodo.

1. Crear las credenciales que el workflow va a usar:
   - `DeliveryBot Telegram` (Telegram API, con el token del bot de
     [@BotFather](https://t.me/BotFather)).
   - `DeliveryBot Google Sheets` (Google Sheets OAuth2, o cuenta de servicio).
2. En cada nodo de Google Sheets del workflow, usar el ID real de
   `DeliveryBot_DB` (el que está en la URL de la hoja).
3. Configurar las variables de entorno de n8n:
   - `TELEGRAM_CHAT_ID_COCINA`: chat/grupo de Telegram del personal de cocina.
   - `TELEGRAM_CHAT_ID_ADMIN`: chat de Telegram donde llega el reporte diario.
5. Activar el workflow. Los webhooks quedan disponibles en
   `https://<tu-instancia-n8n>/webhook/...`.

### 3. Webapp (panel de cocina/administración)

1. **Cuenta de administrador**: Firebase Console → Authentication → Users →
   *Add user*, con correo y contraseña. No hay registro público.
2. **Configurar la URL de n8n**: editar `js/n8n-config.js` y poner ahí
   `N8N_BASE_URL` (la base de los webhooks, ej.
   `https://tu-instancia.app.n8n.cloud/webhook`) y `TELEGRAM_BOT_URL` (el
   enlace público del bot, para el botón de `index.html`).
3. Abrir el proyecto con un servidor local (Live Server, o
   `python3 -m http.server`), no con `file://`, para que Firebase Auth
   funcione.

## Flujo "Realizar Pedido" (Telegram)

1. El cliente escribe `/start` o `/menu`: el bot muestra botones con las
   categorías disponibles (según lo que tenga stock > 0 en `MENU`).
2. Elige una categoría → el bot lista los productos de esa categoría.
3. Elige un producto → el bot pregunta la cantidad.
4. El bot pregunta si quiere agregar otro producto o confirmar. Puede repetir
   el ciclo con varios productos: el carrito se guarda en `SESSIONS`.
5. Al confirmar, n8n:
   - Verifica stock disponible en `MENU` para cada línea del carrito.
   - Calcula el total con los precios vigentes en `MENU` (nunca lo recuerda
     del chat).
   - Genera un `id_pedido` único y lo escribe en `PEDIDOS` con estado
     `PENDING`.
   - Descuenta el stock vendido en `MENU`.
   - Registra/actualiza al cliente en `USUARIOS`.
   - Confirma al cliente por Telegram y notifica a cocina.
6. Cocina cambia el estado (desde `comanda.html`, que llama al webhook de
   n8n). Cada cambio dispara un mensaje push al cliente con el nuevo estado.
7. Todos los días a las 22:00, n8n calcula el total vendido, el producto
   estrella y la hora pico del día, los guarda en `REPORTES` y se los envía al
   administrador por Telegram.

## Modelo de datos (Google Sheets — `DeliveryBot_DB`)

### Hoja `MENU`

| Columna | Tipo | Descripción |
|---|---|---|
| `id_producto` | string | Identificador único del producto |
| `nombre` | string | Nombre del producto |
| `descripcion` | string | Descripción corta |
| `precio` | number | Precio unitario vigente |
| `categoria` | `Bebidas` \| `Comidas` \| `Snacks` | Categoría para el menú del bot |
| `stock` | number | Unidades disponibles; se descuenta con cada venta |

### Hoja `PEDIDOS`

| Columna | Tipo | Descripción |
|---|---|---|
| `id_pedido` | string | Identificador único del pedido (`PED-<timestamp>`) |
| `id_usuario` | string | `telegram_id` de quien pidió |
| `detalles_pedido` | JSON (texto) | Array de `{ product_id, nombre, cantidad, precio_unitario, subtotal_linea }` |
| `total_pago` | number | Suma de todas las líneas |
| `estado` | `PENDING` \| `IN_PREPARATION` \| `ON_THE_WAY` \| `DELIVERED` | Ciclo de vida del pedido (Recibido → Preparación → En camino → Entregado) |
| `fecha` | string `YYYY-MM-DD` | Fecha de creación |
| `hora` | string `HH:MM:SS` | Hora de creación |

El estado avanza siempre hacia adelante y de a un paso; cada cambio dispara
una notificación push al cliente.

### Hoja `USUARIOS`

| Columna | Tipo | Descripción |
|---|---|---|
| `telegram_id` | string | Identificador de Telegram del usuario |
| `nombre_completo` | string | Nombre y apellido |
| `departamento_oficina` | string | Área a la que pertenece (dato opcional) |
| `puntos_lealtad` | number | Puntos acumulados (no se descuentan automáticamente en esta versión) |

### Hoja `SESSIONS`

| Columna | Tipo | Descripción |
|---|---|---|
| `telegram_id` | string | Identificador de Telegram del usuario |
| `pantalla_actual` | string | Dónde está el usuario dentro del wizard (`CATEGORIA`, `PRODUCTO_<cat>`, `CANTIDAD:<id>`, `CONFIRMAR`) |
| `carrito_temporal` | JSON (texto) | Array de `{ product_id, cantidad }` acumulado mientras arma el pedido |
| `ultimo_cambio` | string ISO 8601 | Cuándo se actualizó la sesión por última vez |

### Hoja `REPORTES` (agregada sobre lo pedido en el enunciado)

| Columna | Tipo | Descripción |
|---|---|---|
| `fecha` | string `YYYY-MM-DD` | Día del reporte |
| `total_pedidos` | number | Cantidad de pedidos ese día |
| `total_vendido` | number | Suma de `total_pago` de ese día |
| `producto_estrella` | string | Producto más vendido en unidades |
| `hora_pico` | string `HH:00` | Hora con más pedidos creados |

## Webhooks de n8n usados por la webapp

| Método | Ruta | Uso |
|---|---|---|
| `GET` | `/webhook/menu` | Lista el menú (pantalla de administración) |
| `POST` | `/webhook/menu` | Crea un producto |
| `PUT` | `/webhook/menu/:id` | Edita un producto |
| `DELETE` | `/webhook/menu/:id` | Elimina un producto |
| `GET` | `/webhook/pedidos?limite=N` | Lista los últimos N pedidos (comanda/admin) |
| `POST` | `/webhook/pedidos/:id/avanzar` | Cambia el estado del pedido; responde `409` si otra persona ya lo había movido |

## Páginas de la webapp

| Archivo | Acceso | Qué hace |
|---|---|---|
| `index.html` | Público | Portada: enlace al bot de Telegram y acceso de administración |
| `login.html` | Público | Acceso del administrador (Firebase Auth) |
| `admin.html` | Requiere sesión | Gestión de productos (`MENU`) + pedidos recibidos |
| `comanda.html` | Requiere sesión | Comanda de cocina: pedidos y cambio de estado |

## Módulos JavaScript

| Archivo | Responsabilidad |
|---|---|
| `js/firebase-config.js` | Credenciales e inicialización de Firebase (solo Authentication) |
| `js/n8n-config.js` | URL base de los webhooks de n8n y enlace del bot de Telegram |
| `js/comun.js` | Formato de moneda y fecha, mensajes, navegación activa |
| `js/auth.js` | Acceso, cierre de sesión y protección de páginas con sesión |
| `js/menu.js` | Lee/crea/edita/elimina productos llamando a los webhooks `/menu` de n8n |
| `js/admin.js` | Panel de administración |
| `js/ventas.js` | Pedidos: normalización, flujo de estados y llamadas a `/pedidos` de n8n |
| `js/comanda.js` | Comanda de cocina: lista pedidos y los hace avanzar de estado |

## Resultado esperado (checklist contra el enunciado)

- [x] Cero pérdida de pedidos: cada confirmación en Telegram escribe de
      inmediato en `PEDIDOS` antes de responder al cliente.
- [x] Pedidos anticipados: el cliente puede pedir por Telegram sin hacer fila.
- [x] Transparencia total: notificación push por cada cambio de estado.
- [x] Reporte diario automático con total vendido, producto estrella y hora
      pico.

## Entrega

- Repositorio: este mismo repo.
- Documentación técnica: este `README.md`.
- Workflow de n8n: exportar desde n8n (Workflows → Download) una vez armado
  y probado, y adjuntarlo como `n8n/deliverybot-workflow.json`.
- Datos de prueba para Google Sheets: `sheets/*.csv`.
