# RestoApp - Checklist de pruebas manuales (Ejercicio 4)

Proyecto estático sin build tooling: las pruebas son manuales, ejecutadas
abriendo cada página en el navegador (idealmente con Live Server u otro
servidor local, para que Firebase Auth funcione sin restricciones).

## index.html
- [ ] Carga sin errores en consola.
- [ ] El enlace "Tomar pedido" navega a `pedido.html`.
- [ ] El enlace "Acceso administrador" navega a `login.html`.

## pedido.html
- [ ] El `<select>` de platos carga las opciones desde Firebase (menú no vacío).
- [ ] Al seleccionar un plato, el campo "Precio Unitario" se autocompleta.
- [ ] **Caso éxito**: plato + cantidad > 0 + precio > 0 → muestra subtotal, IVA (19%) y total; limpia el formulario.
- [ ] **Caso error - sin plato**: dejar "Plato ID" vacío → mensaje "Selecciona un plato del menú." (sin `alert()`).
- [ ] **Caso error - cantidad inválida**: cantidad = 0 o vacía → mensaje "La cantidad debe ser mayor a 0."
- [ ] **Caso error - precio inválido**: precio = 0 o vacío → mensaje "El precio unitario debe ser mayor a 0."

## login.html
- [ ] **Caso éxito**: correo/contraseña de un usuario creado en Firebase Authentication → redirige a `admin.html`.
- [ ] **Caso error**: credenciales incorrectas → mensaje "Credenciales inválidas" (sin exponer cuál campo falló).
- [ ] Botón "Cerrar sesión" solo visible si hay sesión activa.

## admin.html
- [ ] Si NO hay sesión activa y se abre `admin.html` directamente, redirige a `login.html`.
- [ ] Con sesión activa, muestra el formulario "Crear producto".
- [ ] **Caso error - nombre vacío**: mensaje "El nombre del producto no puede estar vacío."
- [ ] **Caso error - precio inválido**: precio = 0, vacío o texto → mensaje "El precio debe ser un número mayor a 0."
- [ ] **Caso éxito**: nombre + precio válidos → mensaje "Producto creado" y el formulario se limpia.
- [ ] Botón "Cerrar sesión" cierra la sesión y redirige a `login.html`.

## Seguridad (Realtime Database)
- [ ] Sin sesión iniciada, un intento de escritura directo a `menu.json` (ej. con `curl` o Postman) debe ser rechazado (`permission_denied`), confirmando que la regla `.write: auth != null` está activa.
- [ ] La lectura del menú (`menu.json`) sigue siendo pública sin necesidad de sesión.
