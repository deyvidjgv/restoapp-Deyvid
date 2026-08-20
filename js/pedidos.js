// RestoApp - Panel del mesero: armado y registro de pedidos
//
// Reglas del panel:
//   - El precio unitario NO se escribe aquí: viene del producto que creó el
//     administrador y el campo es de solo lectura.
//   - No se puede pedir más de lo que hay en stock; el descuento definitivo lo
//     hace el servidor con una transacción por producto (RestoMenu).
//   - El pedido guardado recibe un código legible (P-DDMM-XXXX) en lugar de
//     mostrar la clave interna de Firebase.
(function () {
    'use strict';

    var IVA_RATE = 0.19;

    var productosPorId = {};
    var carrito = [];
    var procesando = false;
    var usuario = null;
    var nombreMesero = '';

    // --- Lógica de negocio (pura, sin DOM) ---

    function calcularTotales(lineas) {
        var subtotal = lineas.reduce(function (acc, linea) {
            return acc + (linea.price * linea.cantidad);
        }, 0);
        var iva = subtotal * IVA_RATE;
        return { subtotal: subtotal, iva: iva, total: subtotal + iva };
    }

    function cantidadEnCarrito(productoId) {
        return carrito.reduce(function (acc, linea) {
            return linea.productoId === productoId ? acc + linea.cantidad : acc;
        }, 0);
    }

    function validarLinea(producto, cantidad) {
        if (!producto) return 'Selecciona un plato del menú.';
        if (!producto.activo) return 'Ese plato no está disponible en este momento.';
        if (!cantidad || cantidad <= 0) return 'La cantidad debe ser mayor a 0.';
        if (Math.floor(cantidad) !== cantidad) return 'La cantidad debe ser un número entero.';
        if (producto.price <= 0) return 'Ese plato no tiene un precio válido. Avisa al administrador.';

        var yaPedido = cantidadEnCarrito(producto.id);
        if (producto.stock <= 0) return 'No queda stock de "' + producto.name + '".';
        if (yaPedido + cantidad > producto.stock) {
            return 'Solo quedan ' + producto.stock + ' u. de "' + producto.name + '"' +
                (yaPedido ? ' y ya agregaste ' + yaPedido + '.' : '.');
        }
        return null;
    }

    // --- Helpers de DOM ---

    function el(tag, clase, texto) {
        var nodo = document.createElement(tag);
        if (clase) nodo.className = clase;
        if (texto !== undefined) nodo.textContent = texto;
        return nodo;
    }

    function mostrarMensaje(texto, esError) {
        var msg = document.getElementById('formMsg');
        if (!msg) return;
        msg.textContent = texto || '';
        msg.classList.toggle('error', !!esError);
    }

    function mostrarResultado(texto, esError) {
        var caja = document.getElementById('resultado');
        if (!caja) return;
        caja.textContent = texto || '';
        caja.classList.toggle('error', !!esError);
        caja.classList.toggle('hidden', !texto);
    }

    function filaMensaje(texto, columnas) {
        var tr = el('tr');
        var td = el('td', 'tabla-vacia', texto);
        td.colSpan = columnas;
        tr.appendChild(td);
        return tr;
    }

    // --- Menú (select de platos) ---

    function pintarSelect(lista) {
        var select = document.getElementById('platoSelect');
        if (!select) return;

        var seleccionPrevia = select.value;
        select.innerHTML = '';

        var disponibles = lista.filter(function (p) { return p.activo; });
        if (!disponibles.length) {
            select.appendChild(new Option('--No hay platos disponibles--', ''));
            return;
        }

        select.appendChild(new Option('--Selecciona plato--', ''));
        disponibles.forEach(function (producto) {
            var etiqueta = producto.name + ' — ' + window.RestoFormato.moneda(producto.price) +
                (producto.stock > 0 ? '' : ' (agotado)');
            var opcion = new Option(etiqueta, producto.id);
            opcion.disabled = producto.stock <= 0;
            select.appendChild(opcion);
        });

        if (seleccionPrevia && productosPorId[seleccionPrevia]) {
            select.value = seleccionPrevia;
        }
        actualizarDetallePlato();
    }

    function actualizarDetallePlato() {
        var select = document.getElementById('platoSelect');
        var precio = document.getElementById('precioInput');
        var stockInfo = document.getElementById('stockInfo');
        if (!select || !precio || !stockInfo) return;

        var producto = productosPorId[select.value];
        if (!producto) {
            precio.value = '';
            stockInfo.textContent = '';
            return;
        }

        precio.value = window.RestoFormato.moneda(producto.price);
        var restante = producto.stock - cantidadEnCarrito(producto.id);
        stockInfo.textContent = restante > 0
            ? 'Disponibles: ' + restante + ' u.'
            : 'Sin unidades disponibles.';
    }

    // --- Carrito ---

    function pintarCarrito() {
        var body = document.getElementById('pedidoBody');
        if (!body) return;

        body.innerHTML = '';
        if (!carrito.length) {
            body.appendChild(filaMensaje('Aún no has agregado platos.', 5));
        } else {
            carrito.forEach(function (linea, indice) {
                var tr = el('tr');
                tr.appendChild(el('td', null, linea.name));
                tr.appendChild(el('td', null, String(linea.cantidad)));
                tr.appendChild(el('td', null, window.RestoFormato.moneda(linea.price)));
                tr.appendChild(el('td', null, window.RestoFormato.moneda(linea.price * linea.cantidad)));

                var tdAcciones = el('td', 'col-acciones');
                var quitar = el('button', 'btn-icono peligro');
                quitar.type = 'button';
                quitar.title = 'Quitar del pedido';
                quitar.setAttribute('aria-label', 'Quitar ' + linea.name + ' del pedido');
                quitar.innerHTML = window.RestoIcons.svg('eliminar');
                quitar.addEventListener('click', function () {
                    carrito.splice(indice, 1);
                    pintarCarrito();
                    actualizarDetallePlato();
                });
                tdAcciones.appendChild(quitar);
                tr.appendChild(tdAcciones);

                body.appendChild(tr);
            });
        }

        var totales = calcularTotales(carrito);
        document.getElementById('totalSubtotal').textContent = window.RestoFormato.moneda(totales.subtotal);
        document.getElementById('totalIva').textContent = window.RestoFormato.moneda(totales.iva);
        document.getElementById('totalFinal').textContent = window.RestoFormato.moneda(totales.total);
    }

    function agregarAlPedido() {
        var select = document.getElementById('platoSelect');
        var cantidad = Number(document.getElementById('cantidadInput').value);
        var producto = productosPorId[select.value];

        var error = validarLinea(producto, cantidad);
        if (error) {
            mostrarMensaje(error, true);
            return;
        }

        var existente = carrito.filter(function (linea) {
            return linea.productoId === producto.id;
        })[0];

        if (existente) {
            existente.cantidad += cantidad;
        } else {
            carrito.push({
                productoId: producto.id,
                name: producto.name,
                price: producto.price,
                cantidad: cantidad
            });
        }

        document.getElementById('cantidadInput').value = '';
        mostrarMensaje(cantidad + ' x ' + producto.name + ' agregado.');
        mostrarResultado('');
        pintarCarrito();
        actualizarDetallePlato();
    }

    function vaciarPedido() {
        if (!carrito.length) return;
        if (!window.confirm('¿Vaciar el pedido actual?')) return;
        carrito = [];
        pintarCarrito();
        actualizarDetallePlato();
        mostrarMensaje('Pedido vaciado.');
        mostrarResultado('');
    }

    // --- Registro del pedido ---

    function setProcesando(activo) {
        procesando = activo;
        ['agregarBtn', 'procesarBtn', 'vaciarBtn'].forEach(function (id) {
            var btn = document.getElementById(id);
            if (btn) btn.disabled = activo;
        });
    }

    // Descuenta el stock línea por línea. Si una falla (otro mesero se llevó
    // las últimas unidades), se devuelve lo ya descontado para no dejar el
    // inventario desfasado.
    function descontarStockDelCarrito() {
        var descontadas = [];
        return carrito.reduce(function (cadena, linea) {
            return cadena.then(function () {
                return window.RestoMenu.descontarStock(linea.productoId, linea.cantidad)
                    .then(function () { descontadas.push(linea); });
            });
        }, Promise.resolve())
            .then(function () { return descontadas; })
            .catch(function (err) {
                return revertirStock(descontadas).then(function () { throw err; });
            });
    }

    function revertirStock(lineas) {
        return lineas.reduce(function (cadena, linea) {
            return cadena.then(function () {
                return window.RestoMenu.devolverStock(linea.productoId, linea.cantidad)
                    .catch(function (err) {
                        console.error('No se pudo devolver el stock de ' + linea.name + ':', err);
                    });
            });
        }, Promise.resolve());
    }

    function guardarPedido(totales) {
        var refPedido = firebase.database().ref('pedidos').push();
        var ahora = Date.now();
        var codigo = window.RestoFormato.codigoPedido(refPedido.key, ahora);

        return refPedido.set({
            codigo: codigo,
            meseroUid: usuario.uid,
            meseroNombre: nombreMesero,
            items: carrito.map(function (linea) {
                return {
                    productoId: linea.productoId,
                    name: linea.name,
                    price: linea.price,
                    cantidad: linea.cantidad,
                    importe: linea.price * linea.cantidad
                };
            }),
            subtotal: totales.subtotal,
            iva: totales.iva,
            total: totales.total,
            estado: 'registrado',
            createdAt: firebase.database.ServerValue.TIMESTAMP
        }).then(function () { return codigo; });
    }

    function procesarPedido() {
        if (procesando) return;
        if (!carrito.length) {
            mostrarMensaje('Agrega al menos un plato antes de procesar.', true);
            return;
        }
        if (!usuario) {
            mostrarMensaje('Tu sesión expiró. Vuelve a ingresar.', true);
            return;
        }

        var totales = calcularTotales(carrito);
        setProcesando(true);
        mostrarMensaje('Procesando pedido...');

        descontarStockDelCarrito()
            .then(function (descontadas) {
                return guardarPedido(totales).catch(function (err) {
                    return revertirStock(descontadas).then(function () { throw err; });
                });
            })
            .then(function (codigo) {
                mostrarResultado(
                    'Pedido ' + codigo + ' registrado · ' +
                    carrito.length + (carrito.length === 1 ? ' plato' : ' platos') + ' · ' +
                    'Subtotal ' + window.RestoFormato.moneda(totales.subtotal) + ' · ' +
                    'IVA ' + window.RestoFormato.moneda(totales.iva) + ' · ' +
                    'Total ' + window.RestoFormato.moneda(totales.total)
                );
                carrito = [];
                pintarCarrito();
                actualizarDetallePlato();
                mostrarMensaje('');
            })
            .catch(function (err) {
                console.error('Error al procesar el pedido:', err);
                mostrarMensaje(err && err.message === 'STOCK_INSUFICIENTE'
                    ? 'Alguien tomó las últimas unidades de un plato. Revisa el stock y vuelve a intentar.'
                    : 'No se pudo registrar el pedido. Intenta de nuevo.', true);
            })
            .then(function () { setProcesando(false); });
    }

    // --- Historial del mesero ---

    function pintarHistorial(pedidos) {
        var body = document.getElementById('historialBody');
        if (!body) return;

        body.innerHTML = '';
        if (!pedidos.length) {
            body.appendChild(filaMensaje('Todavía no has registrado pedidos.', 4));
            return;
        }

        pedidos.forEach(function (pedido) {
            var items = pedido.items || [];
            var resumen = items.map(function (item) {
                return item.cantidad + ' x ' + item.name;
            }).join(', ');

            var tr = el('tr');
            tr.appendChild(el('td', null, pedido.codigo || window.RestoFormato.codigoPedido(pedido.id, pedido.createdAt)));
            tr.appendChild(el('td', null, window.RestoFormato.fechaHora(pedido.createdAt)));
            tr.appendChild(el('td', null, resumen || '—'));
            tr.appendChild(el('td', null, window.RestoFormato.moneda(pedido.total)));
            body.appendChild(tr);
        });
    }

    function escucharHistorial(uid) {
        var query = firebase.database().ref('pedidos')
            .orderByChild('meseroUid')
            .equalTo(uid)
            .limitToLast(10);

        query.on('value', function (snap) {
            var lista = [];
            snap.forEach(function (child) {
                var val = child.val() || {};
                val.id = child.key;
                lista.push(val);
            });
            lista.sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); });
            pintarHistorial(lista);
        }, function (err) {
            console.error('Error leyendo el historial:', err);
            var body = document.getElementById('historialBody');
            if (body) {
                body.innerHTML = '';
                body.appendChild(filaMensaje('No se pudo cargar el historial.', 4));
            }
        });
    }

    // --- Arranque ---

    function init() {
        var agregarBtn = document.getElementById('agregarBtn');
        if (!agregarBtn) return;

        agregarBtn.addEventListener('click', agregarAlPedido);
        document.getElementById('procesarBtn').addEventListener('click', procesarPedido);
        document.getElementById('vaciarBtn').addEventListener('click', vaciarPedido);
        document.getElementById('platoSelect').addEventListener('change', function () {
            mostrarMensaje('');
            actualizarDetallePlato();
        });

        window.RestoAuth.onReady(function (user, rol, record) {
            if (!user || !rol) return;
            usuario = user;
            nombreMesero = (record && record.nombre) || user.email || '';

            window.RestoMenu.escuchar(function (lista) {
                productosPorId = {};
                lista.forEach(function (producto) { productosPorId[producto.id] = producto; });
                pintarSelect(lista);
                // Un plato puede quedar agotado o desactivado mientras el
                // mesero arma el pedido: se depuran las líneas que ya no
                // existen para no intentar registrarlas.
                var antes = carrito.length;
                carrito = carrito.filter(function (linea) { return !!productosPorId[linea.productoId]; });
                if (carrito.length !== antes) {
                    mostrarMensaje('Se quitaron platos que ya no están en el menú.', true);
                }
                pintarCarrito();
            }, function () {
                var select = document.getElementById('platoSelect');
                if (select) {
                    select.innerHTML = '';
                    select.appendChild(new Option('--Error cargando menú--', ''));
                }
                mostrarMensaje('No se pudo cargar el menú. Revisa tu conexión.', true);
            });

            escucharHistorial(user.uid);
            pintarCarrito();
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
