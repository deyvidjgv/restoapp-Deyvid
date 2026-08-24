# RestoApp

Sistema de pedidos para restaurante. MPA estática (HTML + CSS + JS sin build
tooling) conectada a Firebase Realtime Database y Firebase Authentication.

## Cómo funciona

- **Los clientes** entran a `pedido.html`, arman su comanda (varios platos,
  con cantidad y notas para cocina), indican si es en mesa, para llevar o a
  domicilio, y confirman. El pedido queda guardado con estado `PENDING`. No
  necesitan cuenta.
- **El administrador** entra con correo y contraseña a `admin.html`, donde crea,
  edita y elimina los platos del menú, y ve los pedidos que van llegando.
- **Cocina** entra con la misma cuenta a `comanda.html`, donde ve los pedidos
  por atender y los hace avanzar paso a paso: Pendiente → En preparación →
  Listo para servir → Entregado. Los entregados salen de la pantalla.

El precio siempre lo define el administrador: en la página de pedido el campo
de precio es de solo lectura y se completa solo al elegir un plato.

## Páginas

| Archivo | Acceso | Qué hace |
|---|---|---|
| `index.html` | Público | Portada con los dos accesos |
| `pedido.html` | Público | Menú y formulario de pedido |
| `login.html` | Público | Acceso del administrador |
| `admin.html` | Requiere sesión | Gestión de productos + pedidos recibidos |
| `comanda.html` | Requiere sesión | Comanda de cocina: pedidos y cambio de estado |

## Módulos JavaScript

| Archivo | Responsabilidad |
|---|---|
| `js/firebase-config.js` | Credenciales e inicialización de Firebase |
| `js/comun.js` | Formato de moneda y fecha, mensajes, navegación activa |
| `js/auth.js` | Acceso, cierre de sesión y protección de páginas con sesión |
| `js/menu.js` | Lectura y escritura de `/menu` y `/registroPlatos` (con validación) |
| `js/pedido.js` | Página de pedido |
| `js/admin.js` | Panel de administración |
| `js/ventas.js` | Pedidos: esquema, validación, estados y lectura de `/registroVentas` |
| `js/comanda.js` | Comanda de cocina: lista pedidos y los hace avanzar de estado |

## Datos en Realtime Database

```
/menu/{id}           -> { id, name, price }
/registroPlatos/{id} -> { id, fecha, name, price }
/registroVentas/{id} -> {
                          id, tipo_pedido, mesa_id, mesero,
                          items: [ { product_id, nombre, cantidad,
                                     precio_unitario, subtotal_linea, notas } ],
                          subtotal, impuestos, total,
                          estado, fecha_hora, fecha_actualizacion, canal
                        }
```

- `/menu` es el estado actual del menú: lo que se ve en `pedido.html` y se
  edita desde `admin.html`.
- `/registroPlatos` es un histórico de creación de platos: cada vez que se
  crea un producto en `admin.html` queda, además, una copia acá con la fecha.
  Nunca se edita ni se borra, ni siquiera si el producto se edita o elimina
  de `/menu` después.
- `/registroVentas` es cada pedido hecho desde `pedido.html`. **Un registro es
  una comanda completa**, no un plato suelto: los platos van en `items[]`.

### Campos de `/registroVentas`

| Campo | Tipo | Qué es |
|---|---|---|
| `id` | string | La misma clave del nodo, guardada dentro del registro |
| `tipo_pedido` | `"MESA"` \| `"LLEVAR"` \| `"DOMICILIO"` | Clasifica el flujo |
| `mesa_id` | string | Número de mesa; `""` si no es pedido en mesa |
| `mesero` | string | Quién tomó el pedido; `""` si no se indicó |
| `items[].product_id` | string | Clave del producto en `/menu` |
| `items[].nombre` | string | Copia del nombre al momento del pedido |
| `items[].cantidad` | number | Unidades, entero entre 1 y 99 |
| `items[].precio_unitario` | number | Precio vigente al confirmar el pedido |
| `items[].subtotal_linea` | number | `cantidad * precio_unitario`, precalculado |
| `items[].notas` | string | Indicaciones de cocina; `""` si no hay |
| `subtotal` | number | Suma de los `subtotal_linea` |
| `impuestos` | number | Hoy siempre `0`, pero el campo existe siempre |
| `total` | number | `subtotal + impuestos` |
| `estado` | string | Flujo de la comanda (ver abajo) |
| `fecha_hora` | string | ISO 8601 en UTC, cuándo se creó el pedido |
| `fecha_actualizacion` | string | ISO 8601 en UTC, último cambio de estado |
| `canal` | string | Origen del pedido; `"WEB"` desde esta app |

El `estado` avanza siempre hacia adelante y de a un paso:

```
PENDING -> IN_PREPARATION -> READY -> DELIVERED
```

### Reglas que asume el flujo de n8n

Estos nombres de colecciones y campos son los que espera n8n, así que no se
deben renombrar sin avisar. Además:

- **Ningún campo se omite.** Los opcionales se guardan como `""` o `0`, nunca
  como `null`: Realtime Database borra las claves con valor `null` al
  escribir, y un campo que a veces está y a veces no rompe los flujos.
- **Las fechas son ISO 8601 en UTC** (`new Date().toISOString()`), texto y no
  timestamp numérico, para que n8n las parsee directo.
- **`subtotal_linea` viene precalculado** para no tener que sumar dentro del
  array desde n8n.
- **Los estados van en mayúscula y con guion bajo**, sin espacios, para poder
  usarlos en expresiones y filtros sin escaparlos.

### Compatibilidad con los pedidos viejos

Los registros guardados con el esquema anterior (un solo plato por registro,
con `platoId` / `platoNombre` / `cantidad` en la raíz y `status` en
`"PENDING"` / `"IN PROGRESS"`) se normalizan al leerlos en `js/ventas.js`: se
convierten a un pedido de un solo item y `"IN PROGRESS"` se mapea a
`IN_PREPARATION`. **No hace falta migrar nada en la base**, pero los flujos de
n8n que lean el histórico completo sí tienen que contemplar las dos formas.

## Puesta en marcha

1. **Crear la cuenta de administrador**: en Firebase Console → Authentication →
   Users → *Add user*, con correo y contraseña. No hay registro público:
   las cuentas se crean solo desde la consola.
2. **Publicar las reglas**: copiar el contenido de `database.rules.json` en
   Firebase Console → Realtime Database → Reglas → Publicar.
3. **Abrir el proyecto** con un servidor local (Live Server, o
   `python3 -m http.server`), no con `file://`, para que Firebase Auth funcione.

## Seguridad

**Las reglas de `database.rules.json` están completamente abiertas** (`.read`
y `.write` en `true` para toda la base): cualquiera, tenga o no cuenta, puede
leer y escribir en cualquier ruta (`/menu`, `/registroPlatos`, `/registroVentas`)
sin ninguna validación de campos. Se
dejaron así a propósito, por decisión explícita. El JavaScript del cliente
(`js/menu.js`, `js/pedido.js`) sigue validando la forma de los datos antes de
guardarlos, pero eso solo evita errores desde la propia app: no protege
contra quien escriba directo a la base de datos por fuera de ella.
