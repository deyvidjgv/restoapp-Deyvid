## Resumen

<!-- Qué cambia y por qué, en 2-3 líneas. -->

## Tipo de cambio

- [ ] Feature (funcionalidad nueva)
- [ ] Fix (corrección de bug)
- [ ] Chore (mantenimiento, docs, refactor sin cambio de comportamiento)

## Checklist

- [ ] Probé el flujo de **login** (mesero y/o admin según aplique).
- [ ] Si toqué `admin.html`/`productos.js`/`meseros.js`: probé crear/editar/eliminar productos o meseros.
- [ ] Si toqué `pedido.html`/`pedidos.js`: probé armar y procesar un pedido, y verifiqué que el stock se descontó.
- [ ] Si toqué `database.rules.json`: publiqué las reglas en un proyecto Firebase de prueba y verifiqué que no rompen lecturas/escrituras existentes.
- [ ] `node --check` pasa en los archivos `.js` modificados (o dejé que el workflow de CI lo confirme).
- [ ] No dejé `console.log` de depuración ni credenciales nuevas en el código.

## Notas para quien revisa

<!-- Contexto extra, capturas de pantalla, o decisiones que valga la pena discutir. -->
