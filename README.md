# RestoApp

Sistema de pedidos para restaurante, construido como **MPA** (varias páginas
HTML estáticas) sobre Firebase Authentication y Realtime Database.

Hay dos perfiles con paneles separados:

| Perfil | Página | Qué puede hacer |
| --- | --- | --- |
| **Administrador** | `admin.html` | Crear, editar, ocultar y eliminar productos (nombre, precio, stock). Crear, desactivar y eliminar cuentas de mesero. |
| **Mesero** | `pedido.html` | Armar pedidos con los platos del menú. El precio unitario viene del producto y es de **solo lectura**. |

## Páginas

- `index.html` — portada pública con accesos a cada panel.
- `login.html` — acceso con selector **Mesero / Administrador**.
- `pedido.html` — panel del mesero (pedido actual + historial propio).
- `admin.html` — panel de administración (pestañas Productos y Meseros).

## Módulos JavaScript

Todos son IIFE clásicos (sin build tooling) que publican un único objeto global:

| Archivo | Responsabilidad |
| --- | --- |
| `js/firebase-config.js` | Inicialización del SDK. |
| `js/icons.js` | `RestoIcons` — iconos SVG inline (`<span data-icon="stock">`). |
| `js/formato.js` | `RestoFormato` — moneda, fecha y código legible de pedido. |
| `js/roles.js` | `RestoRoles` — lectura/escritura de `/usuarios/{uid}` (rol y estado). |
| `js/auth.js` | `RestoAuth` — sesión, selector de rol, guards y navegación. |
| `js/menu.js` | `RestoMenu` — capa de datos de `/menu` (validar, CRUD, stock). |
| `js/productos.js` | Panel de admin: tabla y formulario de productos. |
| `js/meseros.js` | Panel de admin: alta y gestión de cuentas de mesero. |
| `js/pedidos.js` | Panel del mesero: carrito, totales, registro e historial. |
| `js/tabs.js` | Pestañas del panel de administración. |
| `js/starfield.js` | Fondo animado. |

## Modelo de datos (Realtime Database)

```
/usuarios/{uid}
    nombre, email, rol: "admin" | "mesero", activo: bool, createdBy, createdAt

/menu/{productoId}
    name, price, stock, activo: bool, createdAt, updatedAt

/pedidos/{pedidoId}
    codigo: "P-DDMM-XXXX", meseroUid, meseroNombre,
    items: [{ productoId, name, price, cantidad, importe }],
    subtotal, iva, total, estado, createdAt
```

Firebase Auth solo dice **quién** eres; el **rol** vive en `/usuarios/{uid}`.
Un usuario autenticado sin registro de rol no entra a ningún panel.

### Código de pedido

Firebase genera claves como `-P-M_hcjwaeYcxYuUM4X`, que no sirven para dictar
en voz alta. Cada pedido guarda además un `codigo` legible con fecha y un tramo
corto derivado de esa clave: `P-1908-M4X7`. Es lo que se muestra en pantalla y
en el historial; la clave interna nunca aparece en la interfaz.

## Puesta en marcha

1. Servir la carpeta con un servidor local (Live Server, `python3 -m http.server`,
   etc.). Abrir los archivos con `file://` rompe Firebase Auth.
2. En la consola de Firebase, habilitar **Authentication → Correo/contraseña**.
3. Publicar las reglas de `database.rules.json` en **Realtime Database → Reglas**.
4. Crear el **primer administrador**: abrir `login.html`, elegir el perfil
   *Administrador*, llenar correo y contraseña y usar "Crear administrador
   inicial". Ese formulario solo funciona mientras no exista ningún admin;
   después, las cuentas nuevas se crean desde el panel.
5. Desde `admin.html` → pestaña **Meseros**, dar de alta a cada mesero con su
   correo y una contraseña temporal.

## Seguridad

- Los guards de `auth.js` son de experiencia de usuario; la barrera real son las
  reglas de `database.rules.json`, que validan el rol del `uid` en el servidor.
- Reglas aplicadas: el menú es de lectura pública, pero solo un admin lo
  escribe; el mesero únicamente puede modificar `stock` (el descuento del
  pedido); un pedido solo puede crearlo el mesero dueño del `meseroUid`, con la
  cuenta activa, y no se puede editar después.
- Integridad de los pedidos validada en el servidor: el `precio` de cada línea
  debe coincidir con el precio vigente en `/menu`, `importe` debe ser
  `price × cantidad` y `total` debe ser `subtotal + iva`. Un cliente manipulado
  no puede registrar un pedido con precios o totales inventados.
- Lectura acotada: `/usuarios` completo solo lo lee un admin (cada usuario lee
  su propio registro), y un mesero solo puede consultar el historial filtrando
  por su propio `meseroUid`.
- El bootstrap del primer admin lo autoriza el servidor, no el cliente: la regla
  solo permite auto-asignarse el rol `admin` mientras `/usuarios` esté vacío.
- **Limitación conocida**: cualquier usuario con rol puede escribir `stock`
  (lo necesitan tanto el descuento del pedido como la devolución si el registro
  falla). Restringirlo a "solo descuentos derivados de un pedido real" requiere
  Cloud Functions o un backend propio.
- El stock se descuenta con **transacciones**: si dos meseros piden a la vez las
  últimas unidades, una de las dos operaciones se aborta y se avisa en pantalla,
  en vez de dejar el inventario en negativo.
- Al crear un mesero se usa una **instancia secundaria** de Firebase
  (`firebase.initializeApp(config, 'creador')`) para que el alta no cierre la
  sesión del administrador.
- Eliminar un mesero borra su registro de rol (queda sin acceso). La cuenta de
  Firebase Authentication en sí solo puede borrarse desde la consola o con el
  Admin SDK, que requiere backend.
- `apiKey` y los demás campos de `firebase-config.js` son públicos por diseño
  del SDK web; la seguridad la dan Authentication y las reglas.

## Pruebas

`tests/manual-checklist.md` contiene el recorrido manual de las cuatro páginas
(casos de éxito y de error).
