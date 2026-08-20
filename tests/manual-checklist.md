# RestoApp - Checklist de pruebas manuales

Proyecto estático sin build tooling: las pruebas son manuales, abriendo cada
página con un servidor local (Live Server, `python3 -m http.server`), nunca con
`file://`, para que Firebase Auth funcione.

Requisitos previos: reglas de `database.rules.json` publicadas, un admin creado
y al menos un mesero dado de alta.

## index.html
- [ ] Carga sin errores en consola.
- [ ] Sin sesión: la barra superior muestra "Acceso" y oculta "Pedido"/"Admin".
- [ ] Con sesión de mesero: aparece "Pedido", NO aparece "Admin".
- [ ] Con sesión de admin: aparecen "Pedido" y "Admin", y el nombre + rol a la derecha.

## login.html
- [ ] El selector arranca en **Mesero**; al elegir **Administrador** aparece el
      bloque "¿Primera vez?" y cambia el texto de ayuda.
- [ ] **Bootstrap**: sin ningún admin en la base, crear el administrador inicial
      redirige a `admin.html` y queda registrado en `/usuarios/{uid}` con `rol: "admin"`.
- [ ] **Bootstrap bloqueado**: con un admin ya existente, el botón responde
      "Ya existe un administrador..." y **la cuenta de Auth recién creada se
      elimina** (el mismo correo puede reutilizarse después).
- [ ] **Éxito mesero**: perfil Mesero + credenciales de mesero → redirige a `pedido.html`.
- [ ] **Éxito admin**: perfil Administrador + credenciales de admin → redirige a `admin.html`.
- [ ] **Rol cruzado**: perfil Administrador + credenciales de mesero → cierra la
      sesión y avisa "Esta cuenta es de mesero...".
- [ ] **Cuenta desactivada**: mesero con `activo: false` → "Esta cuenta está desactivada".
- [ ] **Credenciales inválidas** → "Credenciales inválidas." (sin decir qué campo falló).
- [ ] **Validación local**: correo vacío, sin `@`, o contraseña de menos de 6
      caracteres → mensaje antes de llamar a Firebase.

## admin.html (solo rol admin)
- [ ] Sin sesión → redirige a `login.html` con el aviso "Inicia sesión para continuar."
- [ ] Con sesión de **mesero** → redirige a `pedido.html`.
- [ ] Con sesión de admin: se oculta "Verificando sesión..." y aparecen las pestañas.

### Pestaña Productos
- [ ] **Crear**: nombre + precio + stock válidos → "Producto ... creado", el
      formulario se limpia y la fila aparece en la tabla sin recargar.
- [ ] **Error nombre vacío** → "El nombre del producto no puede estar vacío."
- [ ] **Error precio** = 0, vacío o negativo → "El precio debe ser un número mayor a 0."
- [ ] **Error stock** negativo o decimal → mensaje de stock correspondiente.
- [ ] **Editar**: el icono de lápiz convierte la fila en campos; guardar
      persiste nombre, precio y stock; cancelar descarta los cambios.
- [ ] **Ocultar/mostrar**: el producto oculto desaparece del `<select>` del mesero.
- [ ] **Eliminar**: pide confirmación y la fila desaparece de la tabla.
- [ ] Badges de stock: verde con stock alto, ámbar con 5 o menos, rojo en "agotado".

### Pestaña Meseros
- [ ] **Crear mesero**: nombre + correo + contraseña ≥ 6 → aparece en la tabla
      y **la sesión del admin sigue activa** (no redirige ni cierra sesión).
- [ ] El mesero recién creado puede ingresar desde `login.html` con perfil Mesero.
- [ ] **Correo repetido** → "Ese correo ya está registrado."
- [ ] **Desactivar**: el mesero queda "desactivado" y ya no puede ingresar.
- [ ] **Eliminar**: pide confirmación; el mesero pierde acceso al panel.

## pedido.html (rol mesero o admin)
- [ ] Sin sesión → redirige a `login.html`.
- [ ] El `<select>` carga solo los platos visibles; los agotados salen marcados
      "(agotado)" y no son seleccionables.
- [ ] Al seleccionar un plato, el **precio unitario se autocompleta y no es
      editable** (campo de solo lectura) y se muestra "Disponibles: N u.".
- [ ] **Agregar**: cantidad válida → la línea aparece en "Pedido actual" y los
      totales (subtotal, IVA 19%, total) se recalculan.
- [ ] **Error sin plato** → "Selecciona un plato del menú."
- [ ] **Error cantidad** = 0, vacía o decimal → mensaje correspondiente.
- [ ] **Error stock**: pedir más unidades de las disponibles → "Solo quedan N u. de ...".
- [ ] Agregar dos veces el mismo plato suma cantidades en una sola línea.
- [ ] **Quitar línea** y **Vaciar** (con confirmación) actualizan los totales.
- [ ] **Procesar sin líneas** → "Agrega al menos un plato antes de procesar."
- [ ] **Procesar con líneas** → mensaje con el código legible (`P-DDMM-XXXX`),
      el carrito se vacía y el pedido aparece en "Mis últimos pedidos".
- [ ] Tras procesar, el **stock baja** en `admin.html` en la cantidad pedida.
- [ ] **Concurrencia**: con 1 unidad en stock, procesar el mismo plato desde dos
      navegadores → uno registra el pedido y el otro recibe "Alguien tomó las
      últimas unidades..." sin dejar el stock negativo.
- [ ] El historial muestra código, fecha, platos y total; nunca la clave interna
      de Firebase.

## Seguridad (Realtime Database)
- [ ] Sin sesión, escribir en `menu.json` con `curl`/Postman → `permission_denied`.
- [ ] Con sesión de **mesero**, escribir `menu/{id}/price` → `permission_denied`
      (solo puede tocar `stock`).
- [ ] Con sesión de **mesero**, escribir en `/usuarios/{otroUid}` → `permission_denied`.
- [ ] Con sesión de **mesero**, LEER `/usuarios` completo → `permission_denied`
      (solo puede leer su propio `/usuarios/{suUid}`).
- [ ] Con sesión de **mesero**, leer `/pedidos` sin filtro → `permission_denied`;
      filtrando por su propio `meseroUid` sí funciona.
- [ ] **Precio manipulado**: crear un pedido cuyo `items/0/price` no coincida con
      el precio actual de ese producto en `/menu` → `permission_denied`.
- [ ] **Total manipulado**: crear un pedido con `total` distinto de
      `subtotal + iva`, o `importe` distinto de `price × cantidad` → `permission_denied`.
- [ ] **Mesero desactivado**: con `activo: false`, intentar crear un pedido →
      `permission_denied`.
- [ ] **Campo extra**: agregar una clave no prevista a un producto o pedido
      (p. ej. `hackeado: true`) → `permission_denied`.
- [ ] La lectura del menú (`menu.json`) sigue siendo pública.
