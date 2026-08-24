// RestoApp - Productos del menú (/menu en Realtime Database)
//
// Forma de cada producto:        { id, name: string, price: number }
// Forma de cada registro de log: { id, fecha: string ISO, name: string, price: number }
//
// Cada vez que se crea un producto queda, además de en /menu (el estado
// actual), una copia histórica en /registroPlatos: ese log nunca se edita ni
// se borra, así que el nombre esquema queda estable para el flujo de n8n que
// lee esta base de datos.
(function () {
    'use strict';

    var NOMBRE_MAX = 60;
    var PRECIO_MAX = 10000000;

    function ref(id) {
        var base = firebase.database().ref('menu');
        return id ? base.child(id) : base;
    }

    function validar(nombre, precio) {
        if (!nombre) return 'Escribe el nombre del producto.';
        if (nombre.length > NOMBRE_MAX) return 'El nombre no puede superar ' + NOMBRE_MAX + ' caracteres.';
        if (!isFinite(precio) || precio <= 0) return 'El precio debe ser un número mayor a 0.';
        if (Math.floor(precio) !== precio) return 'El precio debe ser un número entero, sin centavos.';
        if (precio > PRECIO_MAX) return 'El precio es demasiado alto.';
        return null;
    }

    // Escucha en tiempo real: la lista se redibuja sola cuando el admin
    // crea, edita o elimina un producto.
    function escuchar(alRecibir, alFallar) {
        ref().on('value', function (snap) {
            var lista = [];
            snap.forEach(function (hijo) {
                var val = hijo.val() || {};
                lista.push({
                    id: hijo.key,
                    name: String(val.name || 'Sin nombre'),
                    price: Number(val.price) || 0
                });
            });
            lista.sort(function (a, b) { return a.name.localeCompare(b.name, 'es'); });
            alRecibir(lista);
        }, function (err) {
            console.error('Error leyendo el menú:', err);
            if (alFallar) alFallar(err);
        });
    }

    // push() genera la clave antes de escribir nada: se usa esa misma clave
    // como valor del campo `id`, así el registro queda con su propio id
    // guardado en vez de depender de que quien lo lea lo reconstruya desde
    // la clave del nodo. La escritura en /menu y /registroPlatos se hace en
    // una sola actualización multi-ruta para que quede atómica.
    function crear(nombre, precio) {
        var error = validar(nombre, precio);
        if (error) return Promise.reject(new Error(error));

        var nuevaRef = ref().push();
        var logRef = firebase.database().ref('registroPlatos').push();

        var updates = {};
        updates['menu/' + nuevaRef.key] = { id: nuevaRef.key, name: nombre, price: precio };
        updates['registroPlatos/' + logRef.key] = {
            id: logRef.key,
            fecha: new Date().toISOString(),
            name: nombre,
            price: precio
        };
        return firebase.database().ref().update(updates);
    }

    // update() sobre una ruta borrada la vuelve a crear, así que se edita por
    // transacción: si el producto ya no existe (lo eliminó otra sesión), se
    // aborta en vez de resucitarlo.
    function actualizar(id, nombre, precio) {
        var error = validar(nombre, precio);
        if (error) return Promise.reject(new Error(error));

        // Se incluye `id` también al editar para completarlo en productos
        // creados antes de este cambio, que todavía no lo tenían guardado.
        // Solo se toca /menu: /registroPlatos es un histórico y no se edita.
        return ref(id).transaction(function (actual) {
            if (actual === null) return actual;
            return { id: id, name: nombre, price: precio };
        }).then(function (resultado) {
            if (!resultado.committed || !resultado.snapshot.exists()) {
                throw new Error('El producto ya no existe en el menú.');
            }
        });
    }

    function eliminar(id) {
        return ref(id).remove();
    }

    window.RestoMenu = {
        validar: validar,
        escuchar: escuchar,
        crear: crear,
        actualizar: actualizar,
        eliminar: eliminar
    };
})();
