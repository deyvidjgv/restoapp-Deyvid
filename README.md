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
| `js/menu.js` | Lectura y escritura de `/menu` (con validación) |
| `js/pedido.js` | Página de pedido |
| `js/admin.js` | Panel de administración |
| `js/comanda.js` | Comanda de cocina: lista pedidos y cambia su estado |

## Datos en Realtime Database

```
/menu/{id}      -> { id, name, price, createdAt }
/pedidos/{id}   -> { id, productoId, name, price, cantidad, total, status, createdAt }
```

`status` es `"PENDING"` al crear el pedido y pasa a `"IN PROGRESS"` desde
`comanda.html`. Un pedido guardado antes de este campo se trata como
`"PENDING"` en la interfaz (no tiene el campo, pero las reglas no lo exigen
para escrituras existentes).

## Puesta en marcha

1. **Crear la cuenta de administrador**: en Firebase Console → Authentication →
   Users → *Add user*, con correo y contraseña. No hay registro público:
   las cuentas se crean solo desde la consola.
2. **Publicar las reglas**: copiar el contenido de `database.rules.json` en
   Firebase Console → Realtime Database → Reglas → Publicar.
3. **Abrir el proyecto** con un servidor local (Live Server, o
   `python3 -m http.server`), no con `file://`, para que Firebase Auth funcione.

## Seguridad

Las reglas de `database.rules.json` son la barrera real, no el JavaScript del
cliente:

- `/menu` se lee sin sesión (el menú es público) pero solo se escribe con
  sesión iniciada.
- `/pedidos` acepta pedidos nuevos de cualquiera, pero solo un usuario
  autenticado puede leerlos o modificarlos.
- Cada campo se valida por tipo y rango, y `$otro: false` bloquea campos no
  previstos. El `total` se verifica contra `price * cantidad`, así que no se
  puede guardar un pedido con un total alterado.
