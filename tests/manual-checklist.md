# DeliveryBot - Checklist de pruebas manuales

Proyecto con dos partes que se prueban distinto:

- **Bot de Telegram + n8n + Google Sheets**: pruebas conversando con el bot y
  revisando las hojas en vivo.
- **Webapp de cocina/administración** (`admin.html`, `comanda.html`): igual
  que antes, abriendo cada página con un servidor local (Live Server,
  `python3 -m http.server`), nunca con `file://`.

Requisitos previos: workflow de n8n armado y activo (ver `GUIA_EQUIPO.md`),
`N8N_BASE_URL`/`TELEGRAM_BOT_URL` configurados en `js/n8n-config.js`, hoja
`DeliveryBot_DB` con las 5 hojas creadas, y una cuenta de administrador
creada desde Firebase Console (solo para el login de la webapp).

## Bot de Telegram — flujo de pedido

- [ ] `/start` muestra las categorías (Bebidas, Comidas, Snacks) como botones.
- [ ] Un producto con `stock = 0` no aparece listado en su categoría.
- [ ] Elegir un producto pregunta la cantidad; escribir `0`, texto no numérico
      o un número > 99 responde con el mensaje de cantidad no válida y no
      avanza el wizard.
- [ ] Tras una cantidad válida, aparecen los botones "Agregar otro" /
      "Confirmar pedido".
- [ ] "Agregar otro" vuelve a mostrar categorías y conserva lo ya elegido en
      `SESSIONS.carrito_temporal`.
- [ ] "Confirmar pedido": el bot responde con el `id_pedido`, el total y
      "Estado: Recibido", y queda una fila nueva en `PEDIDOS` con ese
      `id_pedido`, `estado = PENDING`, `detalles_pedido` con todas las líneas.
- [ ] El stock de cada producto pedido se descuenta en `MENU` en la cantidad
      exacta.
- [ ] El chat de cocina (`TELEGRAM_CHAT_ID_COCINA`) recibe el aviso de nuevo
      pedido.
- [ ] `USUARIOS` tiene una fila con el `telegram_id` y `nombre_completo` del
      cliente (se crea si no existía, se actualiza si ya existía).
- [ ] **Sin stock suficiente**: confirmar un pedido que pide más unidades de
      las disponibles responde con el aviso de falta de stock y **no** crea
      fila en `PEDIDOS` ni descuenta stock.
- [ ] `/menu` en cualquier punto del flujo reinicia a la pantalla de
      categorías.

## Cambio de estado y notificaciones

- [ ] Al avanzar un pedido desde `comanda.html` (Recibido → En preparación →
      En camino → Entregado), el cliente recibe un mensaje de Telegram por
      cada cambio, con el estado correcto.
- [ ] El webhook `/pedidos/:id/avanzar` responde `409` (conflicto) si se envía
      un `estado_esperado` que ya no coincide con el estado real en `PEDIDOS`
      (dos personas cambiando el mismo pedido a la vez).
- [ ] Un pedido `DELIVERED` no ofrece más acciones de avance.

## Reporte diario

- [ ] Disparar manualmente el nodo "Cron - Reporte diario" (o esperar a la
      hora configurada) agrega una fila nueva en `REPORTES` con `fecha`,
      `total_pedidos`, `total_vendido`, `producto_estrella` y `hora_pico`
      calculados solo con los pedidos de ese día.
- [ ] El administrador (`TELEGRAM_CHAT_ID_ADMIN`) recibe el resumen por
      Telegram.
- [ ] Un día sin pedidos genera un reporte con `total_pedidos = 0` y
      `producto_estrella = "Sin datos"`, sin que el workflow falle.

## index.html
- [ ] Carga sin errores en consola.
- [ ] "Hacer un pedido por Telegram" abre el bot (`TELEGRAM_BOT_URL`);
      "Administrar menú" lleva a `login.html`.
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
- [ ] **Crear**: nombre, categoría, precio y stock válidos → mensaje de éxito,
      el formulario se limpia, y la fila aparece en la tabla (puede tardar
      hasta `POLL_MS` en reflejarse, no es instantáneo como antes con
      Firebase).
- [ ] **Error nombre vacío** → "Escribe el nombre del producto."
- [ ] **Error precio** 0, vacío o negativo → "El precio debe ser un número mayor a 0."
- [ ] **Editar**: el botón convierte la fila en campos (nombre, categoría,
      precio, stock); Guardar persiste los cambios en `MENU`, Cancelar los
      descarta.
- [ ] **Eliminar**: pide confirmación y la fila desaparece de `MENU`.
- [ ] **Precio con decimales** → "El precio debe ser un número entero, sin
      centavos."
- [ ] "Pedidos recibidos" muestra los pedidos leídos de `PEDIDOS`, el más
      reciente primero.
- [ ] "Cerrar sesión" vuelve a `index.html`.
- [ ] Si el webhook de n8n no responde (instancia apagada, URL mal
      configurada), la tabla muestra "No se pudieron cargar los productos."
      en vez de quedarse cargando para siempre.

## comanda.html
- [ ] Sin sesión → redirige a `login.html`.
- [ ] Con sesión: desaparece "Verificando sesión..." y aparece la lista.
- [ ] Lista los pedidos **por atender**, del más antiguo al más reciente.
- [ ] Un pedido nuevo aparece como "Recibido" con el botón "Marcar en
      preparación".
- [ ] El botón hace avanzar el pedido paso a paso: Recibido → En preparación
      → En camino → Entregado.
- [ ] Al llegar a "Entregado" el pedido **desaparece** de la comanda (pero
      sigue visible en la tabla de `admin.html`).
- [ ] **Dos pantallas a la vez**: si otra sesión ya cambió el estado, el botón
      avisa "Otro usuario ya cambió el estado de este pedido." y no pisa el
      cambio (ver prueba de `409` arriba).

## Seguridad
- [ ] La URL de n8n (`N8N_BASE_URL`) no expone ningún token ni credencial de
      Google: la autenticación con Sheets vive solo del lado de n8n.
- [ ] `admin.html`/`comanda.html` siguen protegidos por sesión de Firebase
      Authentication aunque los datos ya no estén en Firebase.
- [ ] Los webhooks de n8n no requieren estar loggeado para responder — validar
      si se necesita agregar autenticación (header, IP allowlist) antes de
      exponer la instancia de n8n a internet en producción.
