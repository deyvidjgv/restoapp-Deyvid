// RestoApp - Panel de administración
//
// Dos responsabilidades: mantener el menú (crear, editar, eliminar) y ver
// los pedidos que van llegando.
(function () {
    'use strict';

    var productos = [];
    var editando = null;

    // --- Helpers ---

    function celda(texto) {
        var td = document.createElement('td');
        td.textContent = texto;
        return td;
    }

    function boton(texto, clase, alHacerClic) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = clase || '';
        b.textContent = texto;
        b.addEventListener('click', alHacerClic);
        return b;
    }

    function filaVacia(texto, columnas) {
        var tr = document.createElement('tr');
        var td = document.createElement('td');
        td.className = 'vacio';
        td.colSpan = columnas;
        td.textContent = texto;
        tr.appendChild(td);
        return tr;
    }

    // --- Tabla de productos ---

    function filaLectura(producto) {
        var tr = document.createElement('tr');
        tr.appendChild(celda(producto.name));
        tr.appendChild(celda(Resto.moneda(producto.price)));

        var acciones = document.createElement('td');
        acciones.className = 'acciones';
        acciones.appendChild(boton('Editar', '', function () {
            editando = producto.id;
            pintarProductos();
        }));
        acciones.appendChild(boton('Eliminar', 'peligro', function () {
            eliminar(producto);
        }));
        tr.appendChild(acciones);
        return tr;
    }

    function filaEdicion(producto) {
        var tr = document.createElement('tr');

        var inputNombre = document.createElement('input');
        inputNombre.type = 'text';
        inputNombre.value = producto.name;
        inputNombre.maxLength = 60;
        var tdNombre = document.createElement('td');
        tdNombre.appendChild(inputNombre);
        tr.appendChild(tdNombre);

        var inputPrecio = document.createElement('input');
        inputPrecio.type = 'number';
        inputPrecio.value = producto.price;
        inputPrecio.min = '1';
        var tdPrecio = document.createElement('td');
        tdPrecio.appendChild(inputPrecio);
        tr.appendChild(tdPrecio);

        var acciones = document.createElement('td');
        acciones.className = 'acciones';
        acciones.appendChild(boton('Guardar', '', function () {
            guardar(producto.id, inputNombre.value.trim(), Number(inputPrecio.value));
        }));
        acciones.appendChild(boton('Cancelar', '', function () {
            editando = null;
            Resto.mensaje('prodMsg', '');
            pintarProductos();
        }));
        tr.appendChild(acciones);
        return tr;
    }

    function pintarProductos() {
        var cuerpo = document.getElementById('productosBody');
        if (!cuerpo) return;

        cuerpo.innerHTML = '';
        if (!productos.length) {
            cuerpo.appendChild(filaVacia('Todavía no hay productos.', 3));
            return;
        }
        productos.forEach(function (producto) {
            cuerpo.appendChild(producto.id === editando ? filaEdicion(producto) : filaLectura(producto));
        });
    }

    // --- Acciones sobre productos ---

    function crear() {
        var nombre = document.getElementById('nuevoNombre').value.trim();
        var precio = Number(document.getElementById('nuevoPrecio').value);

        var error = RestoMenu.validar(nombre, precio);
        if (error) {
            Resto.mensaje('prodMsg', error, true);
            return;
        }

        var btn = document.getElementById('crearBtn');
        btn.disabled = true;
        Resto.mensaje('prodMsg', 'Guardando...');

        RestoMenu.crear(nombre, precio)
            .then(function () {
                Resto.mensaje('prodMsg', 'Producto "' + nombre + '" creado.');
                document.getElementById('nuevoNombre').value = '';
                document.getElementById('nuevoPrecio').value = '';
            })
            .catch(function (err) {
                console.error('Error creando producto:', err);
                Resto.mensaje('prodMsg', RestoAuth.mensajeError(err), true);
            })
            .then(function () { btn.disabled = false; });
    }

    function guardar(id, nombre, precio) {
        var error = RestoMenu.validar(nombre, precio);
        if (error) {
            Resto.mensaje('prodMsg', error, true);
            return;
        }

        RestoMenu.actualizar(id, nombre, precio)
            .then(function () {
                editando = null;
                Resto.mensaje('prodMsg', 'Producto actualizado.');
                pintarProductos();
            })
            .catch(function (err) {
                console.error('Error actualizando producto:', err);
                Resto.mensaje('prodMsg', RestoAuth.mensajeError(err), true);
            });
    }

    function eliminar(producto) {
        if (!window.confirm('¿Eliminar "' + producto.name + '" del menú?')) return;

        RestoMenu.eliminar(producto.id)
            .then(function () { Resto.mensaje('prodMsg', 'Producto eliminado.'); })
            .catch(function (err) {
                console.error('Error eliminando producto:', err);
                Resto.mensaje('prodMsg', RestoAuth.mensajeError(err), true);
            });
    }

    // --- Pedidos recibidos ---

    function pintarPedidos(pedidos) {
        var cuerpo = document.getElementById('pedidosBody');
        if (!cuerpo) return;

        cuerpo.innerHTML = '';
        if (!pedidos.length) {
            cuerpo.appendChild(filaVacia('Todavía no hay pedidos.', 5));
            return;
        }

        pedidos.forEach(function (pedido) {
            var tr = document.createElement('tr');
            tr.appendChild(celda(Resto.fecha(pedido.fecha_hora)));
            tr.appendChild(celda(pedido.tipo_pedido === 'MESA'
                ? 'Mesa ' + pedido.mesa_id
                : RestoVentas.TIPOS[pedido.tipo_pedido]));

            // Un pedido puede traer varios platos: se listan dentro de la
            // misma celda para no multiplicar filas por comanda.
            var tdItems = document.createElement('td');
            pedido.items.forEach(function (item) {
                var linea = document.createElement('div');
                linea.textContent = item.cantidad + ' x ' + item.nombre;
                tdItems.appendChild(linea);
                if (item.notas) {
                    var nota = document.createElement('div');
                    nota.className = 'ayuda';
                    nota.textContent = item.notas;
                    tdItems.appendChild(nota);
                }
            });
            tr.appendChild(tdItems);

            tr.appendChild(celda(Resto.moneda(pedido.total)));
            tr.appendChild(celda(RestoVentas.ETIQUETAS[pedido.estado]));
            cuerpo.appendChild(tr);
        });
    }

    function escucharPedidos() {
        RestoVentas.escuchar(20, function (lista) {
            lista.reverse(); // el más reciente primero
            pintarPedidos(lista);
        }, function () {
            var cuerpo = document.getElementById('pedidosBody');
            if (cuerpo) {
                cuerpo.innerHTML = '';
                cuerpo.appendChild(filaVacia('No se pudieron cargar los pedidos.', 5));
            }
        });
    }

    // --- Arranque ---
    // Se espera a que auth.js confirme la sesión antes de escuchar: este
    // panel es solo para quien tiene cuenta, aunque las reglas del servidor
    // ya no lo exijan (están abiertas a propósito).

    document.addEventListener('DOMContentLoaded', function () {
        document.getElementById('crearBtn').addEventListener('click', crear);
    });

    document.addEventListener('sesion-lista', function (evento) {
        if (!evento.detail) return;

        RestoMenu.escuchar(function (lista) {
            productos = lista;

            // Si el producto que se está editando desapareció (lo borró otra
            // sesión), se cierra la edición: guardarlo volvería a crearlo.
            if (editando !== null && !lista.filter(function (p) { return p.id === editando; }).length) {
                editando = null;
                Resto.mensaje('prodMsg', 'El producto que editabas fue eliminado.', true);
                pintarProductos();
                return;
            }

            // Redibujar mientras se edita una fila borraría lo escrito.
            if (editando === null) pintarProductos();
        }, function () {
            var cuerpo = document.getElementById('productosBody');
            if (cuerpo) {
                cuerpo.innerHTML = '';
                cuerpo.appendChild(filaVacia('No se pudieron cargar los productos.', 3));
            }
        });

        escucharPedidos();
    });
})();
