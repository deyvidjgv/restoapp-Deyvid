# RestoApp - Checklist de pruebas manuales

Proyecto estático: las pruebas son manuales, abriendo cada página con un
servidor local (Live Server, `python3 -m http.server`), nunca con `file://`.

Requisitos previos: reglas de `database.rules.json` publicadas y una cuenta de
administrador creada desde Firebase Console.

## index.html
- [ ] Carga sin errores en consola.
- [ ] "Hacer un pedido" lleva a `pedido.html`; "Administrar menú" a `login.html`.
- [ ] Con sesión iniciada aparece "Sesión: correo" y el botón "Cerrar sesión".

## login.html
- [ ] **Éxito**: credenciales válidas → redirige a `admin.html`.
- [ ] **Error**: credenciales incorrectas → "Credenciales inválidas."
- [ ] **Validación local**: correo vacío, sin `@`, o contraseña de menos de 6
      caracteres → mensaje antes de llamar a Firebase.
- [ ] Con sesión ya iniciada, entrar a `login.html` redirige a `admin.html`.

## admin.html
- [ ] Sin sesión → redirige a `login.html`.
- [ ] Con sesión: desaparece "Verificando sesión..." y aparece el panel.
- [ ] **Crear**: nombre + precio válidos → mensaje de éxito, el formulario se
      limpia, la fila aparece en la tabla sin recargar, y queda un registro
      nuevo en `/registroPlatos` con la fecha.
- [ ] **Error nombre vacío** → "Escribe el nombre del producto."
- [ ] **Error precio** 0, vacío o negativo → "El precio debe ser un número mayor a 0."
- [ ] **Editar**: el botón convierte la fila en campos; Guardar persiste los
      cambios, Cancelar los descarta.
- [ ] **Eliminar**: pide confirmación y la fila desaparece de `/menu` (el
      registro en `/registroPlatos` no se toca).
- [ ] **Editar un producto que otra sesión eliminó**: la fila de edición se
      cierra sola con el aviso "El producto que editabas fue eliminado." y el
      producto **no** reaparece en `/menu`.
- [ ] **Precio con decimales** → "El precio debe ser un número entero, sin
      centavos."
- [ ] "Pedidos recibidos" muestra los pedidos (leídos de `/registroVentas`),
      el más reciente primero, con columnas Fecha, Origen, Platos, Total y
      Estado. Un pedido de varios platos ocupa **una sola fila**, con los
      platos y sus notas listados dentro de la celda "Platos".
- [ ] "Cerrar sesión" vuelve a `index.html`.

## pedido.html
- [ ] Carga el menú sin necesidad de iniciar sesión.
- [ ] Al hacer clic en un plato queda resaltado, el nombre y el **precio se
      completan solos**, y el precio **no es editable**.
- [ ] **Sin plato elegido**: el botón "Agregar al pedido" está deshabilitado.
- [ ] **Carrito vacío**: el botón "Confirmar pedido" está deshabilitado.
- [ ] **Agregar**: el plato pasa a la tabla "Tu pedido", el total se
      actualiza, y la selección y las notas se limpian.
- [ ] **Mismo plato con las mismas notas** agregado dos veces → se suman las
      cantidades en una sola línea, no se duplica la fila.
- [ ] **Mismo plato con notas distintas** → dos líneas separadas.
- [ ] **Quitar** una línea la borra y recalcula el total.
- [ ] **Cantidad 0 o vacía** → "La cantidad debe ser mayor a 0."
- [ ] **Cantidad decimal** → "La cantidad debe ser un número entero."
- [ ] **Cantidad > 99** (de una, o sumando al agregar dos veces) → mensaje de
      máximo por plato.
- [ ] **Tipo "En mesa" sin número de mesa** → "Indica el número de mesa."
- [ ] **Tipo "Para llevar" / "Domicilio"**: el campo de mesa se oculta y el
      pedido se puede confirmar sin él.
- [ ] **Éxito**: pedido enviado → mensaje de confirmación, el carrito se
      vacía, y el pedido aparece en `admin.html` y en `comanda.html` con
      estado "Pendiente".
- [ ] Si el admin elimina un plato que ya estaba en el carrito, se quita solo
      con un aviso.
- [ ] Si el admin **cambia el precio** de un plato que ya estaba en el
      carrito, el total se recalcula con el precio nuevo y aparece el aviso.
      El pedido guardado debe llevar el precio nuevo, no el viejo.

## comanda.html
- [ ] Sin sesión → redirige a `login.html`.
- [ ] Con sesión: desaparece "Verificando sesión..." y aparece la lista.
- [ ] Lista los pedidos **por atender**, del más antiguo al más reciente.
- [ ] Cada tarjeta muestra el origen (mesa o tipo), la fecha, el estado, el
      mesero si lo hay, y **todos** los platos del pedido con sus notas.
- [ ] Un pedido nuevo aparece como "Pendiente" con el botón "Marcar en
      preparación".
- [ ] El botón hace avanzar el pedido paso a paso: Pendiente → En preparación
      → Listo para servir → Entregado.
- [ ] Al llegar a "Entregado" el pedido **desaparece** de la comanda (pero
      sigue visible en la tabla de `admin.html`).
- [ ] El cambio se refleja también en la tabla de pedidos de `admin.html`.
- [ ] **Dos pantallas a la vez**: si otra sesión ya cambió el estado, el botón
      avisa "Otro usuario ya cambió el estado de este pedido." y no pisa el
      cambio.
- [ ] Un pedido guardado con el esquema viejo (sin `items`, con `platoId` y
      `status`) se muestra como un pedido de un solo plato, y `"IN PROGRESS"`
      aparece como "En preparación".

## Seguridad (Realtime Database)
Las reglas están abiertas a propósito (`.read`/`.write` en `true`): no hay
nada que las bloquee a nivel de servidor. Lo único que queda por probar es
que el JavaScript de la app siga validando antes de guardar:
- [ ] `menu.html`/`admin.html` siguen rechazando nombre vacío o precio ≤ 0
      **desde la app**, aunque las reglas ya no lo exijan.
- [ ] `pedido.html` sigue rechazando cantidad inválida **desde la app**.
- [ ] Sin sesión, leer o escribir `menu.json`/`registroVentas.json` con
      `curl`/Postman → ya no da `permission_denied`, se puede leer y escribir
      libremente.

## Esquema para n8n
- [ ] Un pedido hecho desde `pedido.html` queda en `/registroVentas` con
      exactamente estos campos: `id`, `tipo_pedido`, `mesa_id`, `mesero`,
      `items[]`, `subtotal`, `impuestos`, `total`, `estado`, `fecha_hora`,
      `fecha_actualizacion`, `canal`.
- [ ] Cada elemento de `items[]` trae `product_id`, `nombre`, `cantidad`,
      `precio_unitario`, `subtotal_linea` y `notas`.
- [ ] **Ningún campo falta ni viene `null`**: los opcionales (`mesa_id`,
      `mesero`, `notas`) vienen como `""` y `impuestos` como `0`.
- [ ] `subtotal_linea` es exactamente `cantidad * precio_unitario`, y
      `subtotal` la suma de todos ellos.
- [ ] `fecha_hora` y `fecha_actualizacion` son texto ISO 8601 **en UTC**
      (terminan en `Z`).
- [ ] `fecha_actualizacion` cambia al avanzar el estado desde `comanda.html`;
      `fecha_hora` no.
- [ ] `estado` es uno de `PENDING`, `IN_PREPARATION`, `READY`, `DELIVERED`
      (mayúscula, guion bajo, sin espacios).
- [ ] Un producto creado desde `admin.html` queda en `/menu` con `id`, `name`,
      `price`, y además un registro nuevo en `/registroPlatos` con `id`,
      `fecha`, `name`, `price`.
