// DeliveryBot - Productos del menú (hoja MENU en Google Sheets, vía n8n)
//
// Forma de cada producto: { id, name, price, category, stock }
// n8n es el único que habla con Google Sheets: este módulo solo llama a los
// webhooks expuestos por el workflow "API Webapp" (ver n8n/deliverybot-workflow.json).
//
// La hoja MENU no tiene "tiempo real" nativo como Firebase, así que la
// lectura se hace por sondeo (polling) cada POLL_MS.
(function () {
    'use strict';

    var NOMBRE_MAX = 60;
    var PRECIO_MAX = 10000000;
    var POLL_MS = 5000;
    var CATEGORIAS = ['Bebidas', 'Comidas', 'Snacks'];

    function url(path) {
        return N8N_BASE_URL + '/menu' + (path || '');
    }

    function validar(nombre, precio) {
        if (!nombre) return 'Escribe el nombre del producto.';
        if (nombre.length > NOMBRE_MAX) return 'El nombre no puede superar ' + NOMBRE_MAX + ' caracteres.';
        if (!isFinite(precio) || precio <= 0) return 'El precio debe ser un número mayor a 0.';
        if (Math.floor(precio) !== precio) return 'El precio debe ser un número entero, sin centavos.';
        if (precio > PRECIO_MAX) return 'El precio es demasiado alto.';
        return null;
    }

    function normalizar(val) {
        val = val || {};
        return {
            id: String(val.id_producto || val.id || ''),
            name: String(val.nombre || val.name || 'Sin nombre'),
            price: Number(val.precio || val.price) || 0,
            category: String(val.categoria || val.category || 'Comidas'),
            stock: Number(val.stock) || 0
        };
    }

    function pedirJson(input, init) {
        return fetch(input, init).then(function (resp) {
            if (!resp.ok) throw new Error('n8n respondió ' + resp.status);
            return resp.status === 204 ? null : resp.json();
        });
    }

    // Sondeo: pide la lista cada POLL_MS y avisa solo si cambió, para no
    // repintar la pantalla sin necesidad.
    function escuchar(alRecibir, alFallar) {
        var ultimoJson = null;
        var detenido = false;

        function ciclo() {
            if (detenido) return;
            pedirJson(url())
                .then(function (lista) {
                    lista = (lista || []).map(normalizar);
                    lista.sort(function (a, b) { return a.name.localeCompare(b.name, 'es'); });
                    var comoJson = JSON.stringify(lista);
                    if (comoJson !== ultimoJson) {
                        ultimoJson = comoJson;
                        alRecibir(lista);
                    }
                })
                .catch(function (err) {
                    console.error('Error leyendo el menú:', err);
                    if (alFallar) alFallar(err);
                })
                .then(function () {
                    if (!detenido) setTimeout(ciclo, POLL_MS);
                });
        }
        ciclo();

        return function detener() { detenido = true; };
    }

    function crear(nombre, precio, categoria, stock) {
        var error = validar(nombre, precio);
        if (error) return Promise.reject(new Error(error));

        return pedirJson(url(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: nombre,
                precio: precio,
                categoria: CATEGORIAS.indexOf(categoria) !== -1 ? categoria : 'Comidas',
                stock: Number(stock) || 0
            })
        }).then(normalizar);
    }

    function actualizar(id, nombre, precio, categoria, stock) {
        var error = validar(nombre, precio);
        if (error) return Promise.reject(new Error(error));

        return pedirJson(url('/' + encodeURIComponent(id)), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nombre: nombre,
                precio: precio,
                categoria: categoria,
                stock: stock
            })
        }).then(function () {});
    }

    function eliminar(id) {
        return pedirJson(url('/' + encodeURIComponent(id)), { method: 'DELETE' }).then(function () {});
    }

    window.RestoMenu = {
        CATEGORIAS: CATEGORIAS,
        validar: validar,
        escuchar: escuchar,
        crear: crear,
        actualizar: actualizar,
        eliminar: eliminar
    };
})();
