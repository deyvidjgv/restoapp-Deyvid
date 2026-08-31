// DeliveryBot - Pedidos (hoja PEDIDOS en Google Sheets, vía n8n)
//
// Los pedidos los crea el bot de Telegram (a través de n8n), no la webapp:
// este módulo solo lee la lista para comanda.html/admin.html y hace avanzar
// el estado, todo contra los webhooks del workflow de n8n (ver
// GUIA_EQUIPO.md, pasos 6 y 7). n8n es quien de verdad lee/escribe en
// Google Sheets y quien envía la notificación push al cliente por Discord
// cuando el estado cambia.
//
// Forma de cada pedido, tal como la entrega n8n:
//
//   {
//     id, discord_id, nombre_cliente, detalle_pedido: [ { product_id, nombre,
//     cantidad, precio_unitario, subtotal_linea } ],
//     total, estado, fecha, hora
//   }
(function () {
    'use strict';

    var CANTIDAD_MAX = 99;
    var ITEMS_MAX = 20;
    var NOTAS_MAX = 120;
    var POLL_MS = 4000;

    // El pedido avanza siempre hacia adelante y de a un paso, tal como pide
    // el enunciado: Recibido -> Preparación -> En camino -> Entregado.
    var FLUJO = ['PENDING', 'IN_PREPARATION', 'ON_THE_WAY', 'DELIVERED'];

    var ETIQUETAS = {
        PENDING: 'Recibido',
        IN_PREPARATION: 'En preparación',
        ON_THE_WAY: 'En camino',
        DELIVERED: 'Entregado'
    };

    // Texto del botón que lleva al estado siguiente.
    var ACCIONES = {
        PENDING: 'Marcar en preparación',
        IN_PREPARATION: 'Marcar en camino',
        ON_THE_WAY: 'Marcar entregado'
    };

    var TIPOS = {
        MESA: 'En mesa',
        LLEVAR: 'Para llevar',
        DOMICILIO: 'Domicilio'
    };

    function siguiente(estado) {
        var i = FLUJO.indexOf(estado);
        return i === -1 || i === FLUJO.length - 1 ? null : FLUJO[i + 1];
    }

    function activo(estado) {
        return estado !== 'DELIVERED';
    }

    function url(path) {
        return N8N_BASE_URL + '/pedidos' + (path || '');
    }

    function pedirJson(input, init) {
        return fetch(input, init).then(function (resp) {
            if (!resp.ok) throw new Error('n8n respondió ' + resp.status);
            return resp.status === 204 ? null : resp.json();
        });
    }

    // Acepta la forma que entrega n8n (detalle_pedido) y también un pedido
    // web viejo (items), por si queda algún registro del esquema anterior.
    function normalizar(val) {
        val = val || {};

        var items = val.detalle_pedido || val.items || [];
        if (items && !Array.isArray(items) && typeof items === 'object') {
            items = Object.keys(items).sort().map(function (k) { return items[k]; });
        }

        items = items.map(function (item) {
            item = item || {};
            var cantidad = Number(item.cantidad) || 0;
            var precio = Number(item.precio_unitario) || 0;
            return {
                product_id: String(item.product_id || ''),
                nombre: String(item.nombre || 'Sin nombre'),
                cantidad: cantidad,
                precio_unitario: precio,
                subtotal_linea: Number(item.subtotal_linea) || cantidad * precio,
                notas: String(item.notas || '')
            };
        });

        var total = items.reduce(function (suma, item) { return suma + item.subtotal_linea; }, 0);

        return {
            id: String(val.id_pedido || val.id || ''),
            discord_id: String(val.discord_id || val.telegram_id || ''),
            mesero: String(val.nombre_cliente || val.mesero || ''),
            tipo_pedido: TIPOS[val.tipo_pedido] ? val.tipo_pedido : 'DOMICILIO',
            mesa_id: val.mesa_id === 0 || val.mesa_id ? val.mesa_id : '',
            items: items,
            total: Number(val.total_pago || val.total) || total,
            estado: estadoDe(val),
            fecha_hora: val.fecha_hora || (val.fecha ? val.fecha + 'T' + (val.hora || '00:00:00') : ''),
            fecha_actualizacion: val.fecha_actualizacion || val.fecha_hora || ''
        };
    }

    function estadoDe(val) {
        var bruto = val.estado || val.status || '';
        return FLUJO.indexOf(bruto) !== -1 ? bruto : 'PENDING';
    }

    // Avanza un pedido al estado siguiente. n8n valida en el servidor que
    // nadie más lo haya movido antes (equivalente a la transacción que hacía
    // Firebase) y envía la notificación push a Discord si el cambio se
    // aplicó.
    function avanzar(id, estadoEsperado) {
        var destino = siguiente(estadoEsperado);
        if (!destino) return Promise.reject(new Error('El pedido ya está entregado.'));

        return pedirJson(url('/' + encodeURIComponent(id) + '/avanzar'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado_esperado: estadoEsperado, estado_destino: destino })
        }).then(function (resp) {
            if (resp && resp.conflicto) throw new Error('Otro usuario ya cambió el estado de este pedido.');
            return destino;
        });
    }

    // Sondeo: no hay push nativo desde Sheets al navegador, así que se
    // pregunta cada POLL_MS y solo se repinta si algo cambió.
    function escuchar(limite, alRecibir, alFallar) {
        var ultimoJson = null;
        var detenido = false;

        function ciclo() {
            if (detenido) return;
            pedirJson(url('?limite=' + limite))
                .then(function (lista) {
                    lista = (lista || []).map(normalizar);
                    var comoJson = JSON.stringify(lista);
                    if (comoJson !== ultimoJson) {
                        ultimoJson = comoJson;
                        alRecibir(lista);
                    }
                })
                .catch(function (err) {
                    console.error('Error leyendo los pedidos:', err);
                    if (alFallar) alFallar(err);
                })
                .then(function () {
                    if (!detenido) setTimeout(ciclo, POLL_MS);
                });
        }
        ciclo();

        return function detener() { detenido = true; };
    }

    window.RestoVentas = {
        FLUJO: FLUJO,
        ETIQUETAS: ETIQUETAS,
        ACCIONES: ACCIONES,
        TIPOS: TIPOS,
        CANTIDAD_MAX: CANTIDAD_MAX,
        ITEMS_MAX: ITEMS_MAX,
        NOTAS_MAX: NOTAS_MAX,
        siguiente: siguiente,
        activo: activo,
        normalizar: normalizar,
        avanzar: avanzar,
        escuchar: escuchar
    };
})();
