// RestoApp - Capa de datos del menú (/menu en Realtime Database)
//
// Un solo módulo lee y escribe los productos para que el panel de admin
// (productos.js) y el panel del mesero (pedidos.js) compartan exactamente la
// misma forma de los datos y las mismas validaciones.
//
// Forma de cada producto en /menu/{id}:
//   { name: string, price: number, stock: number, activo: boolean,
//     createdAt: number, updatedAt: number }
(function () {
    'use strict';

    var PRECIO_MAXIMO = 100000000;
    var STOCK_MAXIMO = 100000;
    var NOMBRE_MAXIMO = 60;

    function ref(id) {
        var base = firebase.database().ref('menu');
        return id ? base.child(id) : base;
    }

    // --- Lógica de negocio (pura) ---

    // Los productos creados por versiones anteriores no tienen `stock` ni
    // `activo`, y algunos guardaban el precio como `precio`. Normalizar aquí
    // evita que cada pantalla tenga que conocer ese historial.
    function normalizar(id, raw) {
        var val = raw || {};
        var precio = Number(val.price !== undefined ? val.price : val.precio);
        var stock = Number(val.stock);
        return {
            id: id,
            name: String(val.name || val.nombre || 'Sin nombre'),
            price: isFinite(precio) && precio > 0 ? precio : 0,
            stock: isFinite(stock) && stock > 0 ? Math.floor(stock) : 0,
            stockDefinido: val.stock !== undefined && val.stock !== null,
            activo: val.activo !== false,
            createdAt: val.createdAt || null,
            updatedAt: val.updatedAt || null
        };
    }

    function validar(datos) {
        var nombre = String(datos.name || '').trim();
        var precio = Number(datos.price);
        var stock = Number(datos.stock);

        if (!nombre) return 'El nombre del producto no puede estar vacío.';
        if (nombre.length > NOMBRE_MAXIMO) return 'El nombre no puede superar ' + NOMBRE_MAXIMO + ' caracteres.';
        if (!isFinite(precio) || precio <= 0) return 'El precio debe ser un número mayor a 0.';
        if (precio > PRECIO_MAXIMO) return 'El precio es demasiado alto.';
        if (!isFinite(stock) || stock < 0) return 'El stock debe ser un número igual o mayor a 0.';
        if (Math.floor(stock) !== stock) return 'El stock debe ser un número entero.';
        if (stock > STOCK_MAXIMO) return 'El stock es demasiado alto.';
        return null;
    }

    function hayDisponibilidad(producto, cantidad) {
        return !!producto && producto.activo && producto.stock >= cantidad;
    }

    // --- Lectura ---

    function escuchar(onDatos, onError) {
        var handler = ref().on('value', function (snap) {
            var lista = [];
            snap.forEach(function (child) {
                lista.push(normalizar(child.key, child.val()));
            });
            lista.sort(function (a, b) { return a.name.localeCompare(b.name, 'es'); });
            onDatos(lista);
        }, function (err) {
            console.error('Error leyendo el menú:', err);
            if (onError) onError(err);
        });
        return function detener() { ref().off('value', handler); };
    }

    function obtener(id) {
        return ref(id).once('value').then(function (snap) {
            return snap.exists() ? normalizar(snap.key, snap.val()) : null;
        });
    }

    // --- Escritura (solo admin; las reglas del servidor lo verifican) ---

    function crear(datos) {
        var error = validar(datos);
        if (error) return Promise.reject(new Error(error));
        return ref().push({
            name: String(datos.name).trim(),
            price: Number(datos.price),
            stock: Math.floor(Number(datos.stock)),
            activo: true,
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
    }

    function actualizar(id, datos) {
        var error = validar(datos);
        if (error) return Promise.reject(new Error(error));
        return ref(id).update({
            name: String(datos.name).trim(),
            price: Number(datos.price),
            stock: Math.floor(Number(datos.stock)),
            activo: datos.activo !== false,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
    }

    function eliminar(id) {
        return ref(id).remove();
    }

    function setActivo(id, activo) {
        return ref(id).update({
            activo: !!activo,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
    }

    // Descuento atómico: dos meseros pueden pedir el último plato al mismo
    // tiempo. La transacción hace que el servidor reintente con el valor más
    // reciente y aborta si ya no alcanza, en vez de dejar el stock negativo.
    function descontarStock(id, cantidad) {
        return ref(id).child('stock').transaction(function (actual) {
            if (actual === null || actual === undefined) return; // sin stock definido: abortar
            if (actual < cantidad) return;                       // insuficiente: abortar
            return actual - cantidad;
        }).then(function (resultado) {
            if (!resultado.committed) {
                throw new Error('STOCK_INSUFICIENTE');
            }
            return resultado.snapshot.val();
        });
    }

    function devolverStock(id, cantidad) {
        return ref(id).child('stock').transaction(function (actual) {
            return (Number(actual) || 0) + cantidad;
        });
    }

    window.RestoMenu = {
        normalizar: normalizar,
        validar: validar,
        hayDisponibilidad: hayDisponibilidad,
        escuchar: escuchar,
        obtener: obtener,
        crear: crear,
        actualizar: actualizar,
        eliminar: eliminar,
        setActivo: setActivo,
        descontarStock: descontarStock,
        devolverStock: devolverStock
    };
})();
