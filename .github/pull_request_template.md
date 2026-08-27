## Resumen

<!-- Qué cambia y por qué, en 2-3 líneas. -->

## Tipo de cambio

- [ ] Feature (funcionalidad nueva)
- [ ] Fix (corrección de bug)
- [ ] Chore (mantenimiento, docs, refactor sin cambio de comportamiento)

## Checklist

- [ ] Probé el flujo de **login** (mesero y/o admin según aplique).
- [ ] Si toqué `admin.html`/`menu.js`: probé crear/editar/eliminar productos.
- [ ] Si toqué `n8n/deliverybot-workflow.json`: reimporté el workflow en n8n y probé el flujo de pedido de punta a punta con el bot de Telegram.
- [ ] Si toqué `ventas.js`/`comanda.js`: probé el cambio de estado y verifiqué que llega la notificación de Telegram al cliente.
- [ ] `node --check` pasa en los archivos `.js` modificados (o dejé que el workflow de CI lo confirme).
- [ ] No dejé `console.log` de depuración ni credenciales nuevas en el código.

## Notas para quien revisa

<!-- Contexto extra, capturas de pantalla, o decisiones que valga la pena discutir. -->
