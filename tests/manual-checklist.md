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
- [ ] "Pedidos recibidos" muestra los pedidos (leídos de `/registroVentas`),
      el más reciente primero, con columna "Estado".
- [ ] "Cerrar sesión" vuelve a `index.html`.

## pedido.html
- [ ] Carga el menú sin necesidad de iniciar sesión.
- [ ] Al hacer clic en un plato queda resaltado, el nombre y el **precio se
      completan solos**, y el precio **no es editable**.
- [ ] El total se recalcula al cambiar la cantidad.
- [ ] **Sin plato elegido**: el botón "Hacer pedido" está deshabilitado.
- [ ] **Cantidad 0 o vacía** → "La cantidad debe ser mayor a 0."
- [ ] **Cantidad decimal** → "La cantidad debe ser un número entero."
- [ ] **Cantidad > 99** → mensaje de máximo por pedido.
- [ ] **Éxito**: pedido enviado → mensaje de confirmación, se limpia la
      selección y el pedido aparece en `admin.html` y en `comanda.html` con
      estado "Pendiente".
- [ ] Si el admin elimina un plato mientras estaba elegido, la selección se
      limpia con un aviso.

## comanda.html
- [ ] Sin sesión → redirige a `login.html`.
- [ ] Con sesión: desaparece "Verificando sesión..." y aparece la lista.
- [ ] Lista todos los pedidos, del más antiguo al más reciente.
- [ ] Un pedido nuevo aparece como "Pendiente" con el botón "Marcar en
      preparación".
- [ ] Al hacer clic en el botón, el pedido pasa a "En preparación" y el botón
      desaparece (no se puede revertir desde esta vista).
- [ ] El cambio se refleja también en la tabla de pedidos de `admin.html`.
- [ ] Un pedido guardado antes de este cambio (sin `status`) se muestra como
      "Pendiente".

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
      exactamente estos campos: `id`, `cantidad`, `fecha` (texto ISO 8601),
      `platoId`, `platoNombre`, `total`, `status`.
- [ ] Un producto creado desde `admin.html` queda en `/menu` con `id`, `name`,
      `price`, y además un registro nuevo en `/registroPlatos` con `id`,
      `fecha`, `name`, `price`.
