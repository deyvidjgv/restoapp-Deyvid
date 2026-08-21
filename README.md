# RestoApp

Sistema de pedidos para restaurante. MPA estática (HTML + CSS + JS sin build
tooling) conectada a Firebase Realtime Database y Firebase Authentication.

## Cómo funciona

- **Los clientes** entran a `pedido.html`, eligen un plato del menú, indican la
  cantidad y confirman. El pedido queda guardado con estado `PENDING`. No
  necesitan cuenta.
- **El administrador** entra con correo y contraseña a `admin.html`, donde crea,
  edita y elimina los platos del menú, y ve los pedidos que van llegando.
- **Cocina** entra con la misma cuenta a `comanda.html`, donde ve todos los
  pedidos con su estado y puede pasarlos de "Pendiente" a "En preparación".

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
| `js/comanda.js` | Comanda de cocina: lista pedidos y cambia su estado |

## Datos en Realtime Database

Este esquema (nombres de colecciones y campos) es el que espera el flujo de
n8n que consume esta base de datos, así que no se debe renombrar sin avisar:

```
/menu/{id}          -> { id, name, price }
/registroPlatos/{id} -> { id, fecha, name, price }
/registroVentas/{id} -> { id, cantidad, fecha, platoId, platoNombre, total, status }
```

- `/menu` es el estado actual del menú: lo que se ve en `pedido.html` y se
  edita desde `admin.html`.
- `/registroPlatos` es un histórico de creación de platos: cada vez que se
  crea un producto en `admin.html` queda, además, una copia acá con la fecha.
  Nunca se edita ni se borra, ni siquiera si el producto se edita o elimina
  de `/menu` después.
- `/registroVentas` es cada pedido hecho desde `pedido.html`. `platoId`
  apunta a la clave del producto en `/menu`; `platoNombre` es una copia del
  nombre al momento del pedido (no cambia si el producto se renombra
  después). `status` es `"PENDING"` al crear el pedido y pasa a
  `"IN PROGRESS"` desde `comanda.html`. Un registro guardado antes de este
  campo se trata como `"PENDING"` en la interfaz.
- `fecha` se guarda como texto ISO 8601 (`new Date().toISOString()`), no
  como timestamp numérico, para que n8n lo pueda parsear directo.

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
