// RestoApp - Productos del menú (/menu en Realtime Database)
//
// Forma de cada producto:  { name: string, price: number, createdAt: number }
//
// Un solo módulo lee y escribe el menú, así la página de pedido y el panel
// de administración comparten la misma validación.
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
    // la clave del nodo.
    function crear(nombre, precio) {
        var error = validar(nombre, precio);
        if (error) return Promise.reject(new Error(error));
        var nuevaRef = ref().push();
        return nuevaRef.set({
            id: nuevaRef.key,
            name: nombre,
            price: precio,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });
    }

    function actualizar(id, nombre, precio) {
        var error = validar(nombre, precio);
        if (error) return Promise.reject(new Error(error));
        // Se incluye `id` también al editar para completarlo en productos
        // creados antes de este cambio, que todavía no lo tenían guardado.
        return ref(id).update({ id: id, name: nombre, price: precio });
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
