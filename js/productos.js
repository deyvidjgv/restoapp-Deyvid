// RestoApp - Panel de administración: gestión de productos
//
// Solo la capa DOM vive aquí; leer, validar y escribir el menú es
// responsabilidad de RestoMenu (js/menu.js).
(function () {
    'use strict';

    var productos = [];
    var editandoId = null;

    // --- Helpers de DOM ---

    function el(tag, clase, texto) {
        var nodo = document.createElement(tag);
        if (clase) nodo.className = clase;
        if (texto !== undefined) nodo.textContent = texto;
        return nodo;
    }

    function boton(icono, titulo, clase, onClick) {
        var b = el('button', 'btn-icono ' + (clase || ''));
        b.type = 'button';
        b.title = titulo;
        b.setAttribute('aria-label', titulo);
        b.innerHTML = window.RestoIcons.svg(icono);
        b.addEventListener('click', onClick);
        return b;
    }

    function inputNumero(valor, min) {
        var input = el('input');
        input.type = 'number';
        input.value = valor;
        input.min = String(min);
        input.step = '1';
        input.className = 'input-celda';
        return input;
    }

    function mostrarMensaje(texto, esError) {
        var msg = document.getElementById('prodMsg');
        if (!msg) return;
        msg.textContent = texto || '';
        msg.classList.toggle('error', !!esError);
    }

    function filaMensaje(texto) {
        var tr = el('tr');
        var td = el('td', 'tabla-vacia', texto);
        td.colSpan = 5;
        tr.appendChild(td);
        return tr;
    }

    // --- Filas de la tabla ---

    function badgeStock(producto) {
        if (!producto.stockDefinido) return el('span', 'badge badge-alerta', 'sin definir');
        if (producto.stock === 0) return el('span', 'badge badge-alerta', 'agotado');
        if (producto.stock <= 5) return el('span', 'badge badge-aviso', producto.stock + ' u.');
        return el('span', 'badge badge-ok', producto.stock + ' u.');
    }

    function filaLectura(producto) {
        var tr = el('tr');
        tr.appendChild(el('td', null, producto.name));
        tr.appendChild(el('td', null, window.RestoFormato.moneda(producto.price)));

        var tdStock = el('td');
        tdStock.appendChild(badgeStock(producto));
        tr.appendChild(tdStock);

        var tdEstado = el('td');
        tdEstado.appendChild(producto.activo
            ? el('span', 'badge badge-ok', 'visible')
            : el('span', 'badge badge-neutro', 'oculto'));
        tr.appendChild(tdEstado);

        var tdAcciones = el('td', 'col-acciones');
        tdAcciones.appendChild(boton('editar', 'Editar producto', '', function () {
            editandoId = producto.id;
            render();
        }));
        tdAcciones.appendChild(boton(
            producto.activo ? 'cancelar' : 'guardar',
            producto.activo ? 'Ocultar del menú' : 'Mostrar en el menú',
            '',
            function () { alternarActivo(producto); }
        ));
        tdAcciones.appendChild(boton('eliminar', 'Eliminar producto', 'peligro', function () {
            eliminar(producto);
        }));
        tr.appendChild(tdAcciones);
        return tr;
    }

    function filaEdicion(producto) {
        var tr = el('tr', 'fila-edicion');

        var inputNombre = el('input');
        inputNombre.type = 'text';
        inputNombre.value = producto.name;
        inputNombre.maxLength = 60;
        inputNombre.className = 'input-celda';
        var tdNombre = el('td');
        tdNombre.appendChild(inputNombre);
        tr.appendChild(tdNombre);

        var inputPrecio = inputNumero(producto.price, 1);
        var tdPrecio = el('td');
        tdPrecio.appendChild(inputPrecio);
        tr.appendChild(tdPrecio);

        var inputStock = inputNumero(producto.stock, 0);
        var tdStock = el('td');
        tdStock.appendChild(inputStock);
        tr.appendChild(tdStock);

        var tdEstado = el('td', null, producto.activo ? 'visible' : 'oculto');
        tr.appendChild(tdEstado);

        var tdAcciones = el('td', 'col-acciones');
        tdAcciones.appendChild(boton('guardar', 'Guardar cambios', '', function () {
            guardarEdicion(producto, {
                name: inputNombre.value,
                price: Number(inputPrecio.value),
                stock: Number(inputStock.value),
                activo: producto.activo
            });
        }));
        tdAcciones.appendChild(boton('cancelar', 'Cancelar', '', function () {
            editandoId = null;
            mostrarMensaje('');
            render();
        }));
        tr.appendChild(tdAcciones);
        return tr;
    }

    function render() {
        var body = document.getElementById('productosBody');
        if (!body) return;

        body.innerHTML = '';
        if (!productos.length) {
            body.appendChild(filaMensaje('Todavía no hay productos. Crea el primero arriba.'));
            return;
        }

        productos.forEach(function (producto) {
            body.appendChild(producto.id === editandoId ? filaEdicion(producto) : filaLectura(producto));
        });
    }

    // --- Acciones ---

    function crearProducto() {
        var datos = {
            name: document.getElementById('newName').value,
            price: Number(document.getElementById('newPrice').value),
            stock: Number(document.getElementById('newStock').value)
        };

        var error = window.RestoMenu.validar(datos);
        if (error) {
            mostrarMensaje(error, true);
            return;
        }

        var btn = document.getElementById('crearProductoBtn');
        btn.disabled = true;
        mostrarMensaje('Guardando...');

        window.RestoMenu.crear(datos)
            .then(function () {
                mostrarMensaje('Producto "' + datos.name.trim() + '" creado.');
                document.getElementById('newName').value = '';
                document.getElementById('newPrice').value = '';
                document.getElementById('newStock').value = '';
            })
            .catch(function (err) {
                console.error('Crear producto error:', err);
                mostrarMensaje(window.RestoAuth.mensajeError(err), true);
            })
            .then(function () { btn.disabled = false; });
    }

    function guardarEdicion(producto, datos) {
        var error = window.RestoMenu.validar(datos);
        if (error) {
            mostrarMensaje(error, true);
            return;
        }

        mostrarMensaje('Guardando cambios...');
        window.RestoMenu.actualizar(producto.id, datos)
            .then(function () {
                editandoId = null;
                mostrarMensaje('Producto actualizado.');
                render();
            })
            .catch(function (err) {
                console.error('Actualizar producto error:', err);
                mostrarMensaje(window.RestoAuth.mensajeError(err), true);
            });
    }

    function alternarActivo(producto) {
        window.RestoMenu.setActivo(producto.id, !producto.activo)
            .then(function () {
                mostrarMensaje(producto.activo
                    ? 'Producto oculto del menú del mesero.'
                    : 'Producto visible en el menú del mesero.');
            })
            .catch(function (err) {
                console.error('Cambiar visibilidad error:', err);
                mostrarMensaje(window.RestoAuth.mensajeError(err), true);
            });
    }

    function eliminar(producto) {
        if (!window.confirm('¿Eliminar "' + producto.name + '" del menú? Esta acción no se puede deshacer.')) return;

        window.RestoMenu.eliminar(producto.id)
            .then(function () { mostrarMensaje('Producto eliminado.'); })
            .catch(function (err) {
                console.error('Eliminar producto error:', err);
                mostrarMensaje(window.RestoAuth.mensajeError(err), true);
            });
    }

    // --- Arranque ---
    // La suscripción se abre solo cuando auth.js confirma una sesión de admin:
    // antes de eso las reglas del servidor rechazarían la lectura.

    function init() {
        var btn = document.getElementById('crearProductoBtn');
        if (!btn) return;

        btn.addEventListener('click', crearProducto);

        window.RestoAuth.onReady(function (user, rol) {
            if (!user || rol !== window.RestoRoles.ADMIN) return;

            window.RestoMenu.escuchar(function (lista) {
                productos = lista;
                // Redibujar mientras se edita una fila borraría lo escrito;
                // el cambio remoto se refleja al guardar o cancelar.
                if (editandoId === null) render();
            }, function () {
                var body = document.getElementById('productosBody');
                if (body) {
                    body.innerHTML = '';
                    body.appendChild(filaMensaje('No se pudo cargar la lista de productos.'));
                }
            });
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
