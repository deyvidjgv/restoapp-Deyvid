// RestoApp - Pedidos (/registroVentas en Realtime Database)
//
// Forma de cada pedido, pensada para que el flujo de n8n la consuma directo:
//
//   {
//     id, tipo_pedido, mesa_id, mesero,
//     items: [ { product_id, nombre, cantidad, precio_unitario, subtotal_linea, notas } ],
//     subtotal, impuestos, total,
//     estado, fecha_hora, fecha_actualizacion, canal
//   }
//
// Reglas que se respetan al escribir, porque n8n las asume:
//   - Ningún campo se omite: los opcionales van como '' o 0, nunca null
//     (Realtime Database borra las claves con valor null al escribir).
//   - `fecha_hora` y `fecha_actualizacion` son ISO 8601 en UTC (toISOString()).
//   - `subtotal_linea` viene precalculado para no tener que sumar dentro del
//     array desde n8n.
//
// Los pedidos guardados con el esquema viejo (platoId/platoNombre/cantidad
// planos, status 'PENDING' | 'IN PROGRESS') se normalizan al leerlos, así que
// no hace falta migrar nada en la base.
(function () {
    'use strict';

    var RUTA = 'registroVentas';

    var CANTIDAD_MAX = 99;
    var ITEMS_MAX = 20;
    var NOTAS_MAX = 120;

    // El pedido avanza siempre hacia adelante y de a un paso.
    var FLUJO = ['PENDING', 'IN_PREPARATION', 'READY', 'DELIVERED'];

    var ETIQUETAS = {
        PENDING: 'Pendiente',
        IN_PREPARATION: 'En preparación',
        READY: 'Listo para servir',
        DELIVERED: 'Entregado'
    };

    // Texto del botón que lleva al estado siguiente.
    var ACCIONES = {
        PENDING: 'Marcar en preparación',
        IN_PREPARATION: 'Marcar listo',
        READY: 'Marcar entregado'
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

    // --- Normalización de lectura ---

    // Acepta tanto el esquema actual como el viejo (un solo plato por
    // registro, con los campos en la raíz) y devuelve siempre la forma nueva.
    function normalizar(clave, val) {
        val = val || {};

        var items = [];
        if (Array.isArray(val.items)) {
            items = val.items;
        } else if (val.items && typeof val.items === 'object') {
            // Realtime Database devuelve el array como objeto si alguna
            // posición quedó vacía; se reconstruye respetando el orden.
            items = Object.keys(val.items).sort().map(function (k) { return val.items[k]; });
        } else if (val.platoId || val.platoNombre) {
            var cantidad = Number(val.cantidad) || 0;
            var total = Number(val.total) || 0;
            items = [{
                product_id: String(val.platoId || ''),
                nombre: String(val.platoNombre || 'Sin nombre'),
                cantidad: cantidad,
                precio_unitario: cantidad ? total / cantidad : 0,
                subtotal_linea: total,
                notas: ''
            }];
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
            id: clave,
            tipo_pedido: TIPOS[val.tipo_pedido] ? val.tipo_pedido : 'LLEVAR',
            mesa_id: val.mesa_id === 0 || val.mesa_id ? val.mesa_id : '',
            mesero: String(val.mesero || ''),
            items: items,
            subtotal: Number(val.subtotal) || total,
            impuestos: Number(val.impuestos) || 0,
            total: Number(val.total) || total,
            estado: estadoDe(val),
            fecha_hora: val.fecha_hora || val.fecha || '',
            fecha_actualizacion: val.fecha_actualizacion || val.fecha_hora || val.fecha || '',
            canal: String(val.canal || 'WEB')
        };
    }

    // `status: 'IN PROGRESS'` es el nombre viejo de IN_PREPARATION; un
    // registro sin estado se trata como pendiente.
    function estadoDe(val) {
        var bruto = val.estado || val.status || '';
        if (bruto === 'IN PROGRESS' || bruto === 'IN_PROGRESS') return 'IN_PREPARATION';
        return FLUJO.indexOf(bruto) !== -1 ? bruto : 'PENDING';
    }

    // --- Validación de escritura ---

    function validarItem(item) {
        if (!item || !item.product_id) return 'El plato no es válido.';
        if (!item.cantidad || item.cantidad <= 0) return 'La cantidad debe ser mayor a 0.';
        if (Math.floor(item.cantidad) !== item.cantidad) return 'La cantidad debe ser un número entero.';
        if (item.cantidad > CANTIDAD_MAX) return 'La cantidad máxima por plato es ' + CANTIDAD_MAX + '.';
        if (!isFinite(item.precio_unitario) || item.precio_unitario <= 0) return 'El precio del plato no es válido.';
        if (String(item.notas || '').length > NOTAS_MAX) return 'Las notas no pueden superar ' + NOTAS_MAX + ' caracteres.';
        return null;
    }

    function validar(datos) {
        if (!datos || !datos.items || !datos.items.length) return 'Agrega al menos un plato al pedido.';
        if (datos.items.length > ITEMS_MAX) return 'El pedido no puede tener más de ' + ITEMS_MAX + ' platos distintos.';
        if (!TIPOS[datos.tipo_pedido]) return 'Elige el tipo de pedido.';
        if (datos.tipo_pedido === 'MESA' && !String(datos.mesa_id || '').trim()) return 'Indica el número de mesa.';
        for (var i = 0; i < datos.items.length; i++) {
            var error = validarItem(datos.items[i]);
            if (error) return error;
        }
        return null;
    }

    // --- Escritura ---

    function crear(datos) {
        var error = validar(datos);
        if (error) return Promise.reject(new Error(error));

        var items = datos.items.map(function (item) {
            return {
                product_id: String(item.product_id),
                nombre: String(item.nombre),
                cantidad: item.cantidad,
                precio_unitario: item.precio_unitario,
                subtotal_linea: item.cantidad * item.precio_unitario,
                notas: String(item.notas || '')
            };
        });

        var subtotal = items.reduce(function (suma, item) { return suma + item.subtotal_linea; }, 0);
        var impuestos = Number(datos.impuestos) || 0;
        var ahora = new Date().toISOString();

        // push() reserva la clave antes de escribir: se guarda esa misma
        // clave como `id` dentro del registro, así quien lo lea no tiene que
        // reconstruirla desde la clave del nodo.
        var refVenta = firebase.database().ref(RUTA).push();
        var pedido = {
            id: refVenta.key,
            tipo_pedido: datos.tipo_pedido,
            mesa_id: datos.tipo_pedido === 'MESA' ? String(datos.mesa_id).trim() : '',
            mesero: String(datos.mesero || ''),
            items: items,
            subtotal: subtotal,
            impuestos: impuestos,
            total: subtotal + impuestos,
            estado: 'PENDING',
            fecha_hora: ahora,
            fecha_actualizacion: ahora,
            canal: String(datos.canal || 'WEB')
        };

        return refVenta.set(pedido).then(function () { return pedido; });
    }

    // Avanza un pedido al estado siguiente. Va por transacción para que dos
    // pantallas de cocina no se pisen: si otra ya lo movió, esta aborta.
    function avanzar(id, estadoEsperado) {
        var destino = siguiente(estadoEsperado);
        if (!destino) return Promise.reject(new Error('El pedido ya está entregado.'));

        return firebase.database().ref(RUTA).child(id).transaction(function (actual) {
            if (actual === null) return actual;            // se borró: no lo recreamos
            if (estadoDe(actual) !== estadoEsperado) return; // ya lo movió alguien más
            actual.estado = destino;
            actual.fecha_actualizacion = new Date().toISOString();
            delete actual.status;                          // resto del esquema viejo
            return actual;
        }).then(function (resultado) {
            if (!resultado.committed) throw new Error('Otro usuario ya cambió el estado de este pedido.');
            return destino;
        });
    }

    // --- Lectura ---

    function escuchar(limite, alRecibir, alFallar) {
        firebase.database().ref(RUTA).limitToLast(limite).on('value', function (snap) {
            var lista = [];
            snap.forEach(function (hijo) { lista.push(normalizar(hijo.key, hijo.val())); });
            alRecibir(lista);
        }, function (err) {
            console.error('Error leyendo los pedidos:', err);
            if (alFallar) alFallar(err);
        });
    }

    window.RestoVentas = {
        FLUJO: FLUJO,
        ETIQUETAS: ETIQUETAS,
        ACCIONES: ACCIONES,
        TIPOS: TIPOS,
        CANTIDAD_MAX: CANTIDAD_MAX,
        NOTAS_MAX: NOTAS_MAX,
        siguiente: siguiente,
        activo: activo,
        normalizar: normalizar,
        validar: validar,
        crear: crear,
        avanzar: avanzar,
        escuchar: escuchar
    };
})();
