// RestoApp - Página de pedido (pública)
//
// El cliente arma una comanda: elige platos del menú, define cantidad y notas
// de cocina, y confirma. El precio unitario nunca se escribe a mano: viene
// del producto que creó el administrador, y el campo es de solo lectura.
(function () {
    'use strict';

    var productos = [];
    var elegido = null;   // plato resaltado en el menú, todavía sin agregar
    var carrito = [];     // { product_id, nombre, cantidad, precio_unitario, notas }

    function $(id) { return document.getElementById(id); }

    // --- Cálculo ---

    function subtotalLinea(item) {
        return item.cantidad * item.precio_unitario;
    }

    function total() {
        return carrito.reduce(function (suma, item) { return suma + subtotalLinea(item); }, 0);
    }

    function cantidad() {
        return Number($('cantidad').value);
    }

    // --- Menú ---

    function pintarMenu() {
        var caja = $('platos');
        if (!caja) return;

        caja.innerHTML = '';
        if (!productos.length) {
            var vacio = document.createElement('p');
            vacio.className = 'vacio';
            vacio.textContent = 'Todavía no hay platos en el menú.';
            caja.appendChild(vacio);
            return;
        }

        productos.forEach(function (producto) {
            var boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'plato' + (elegido && elegido.id === producto.id ? ' elegido' : '');

            var nombre = document.createElement('div');
            nombre.className = 'nombre';
            nombre.textContent = producto.name;

            var precio = document.createElement('div');
            precio.className = 'precio';
            precio.textContent = Resto.moneda(producto.price);

            boton.appendChild(nombre);
            boton.appendChild(precio);
            boton.addEventListener('click', function () {
                elegido = producto;
                Resto.mensaje('pedidoMsg', '');
                pintarMenu();
                pintarSeleccion();
            });

            caja.appendChild(boton);
        });
    }

    function pintarSeleccion() {
        $('seleccionado').value = elegido ? elegido.name : '';
        $('precio').value = elegido ? Resto.moneda(elegido.price) : '—';
        $('agregarBtn').disabled = !elegido;
    }

    // --- Carrito ---

    function agregar() {
        if (!elegido) return;

        var cant = cantidad();
        var item = {
            product_id: elegido.id,
            nombre: elegido.name,
            cantidad: cant,
            precio_unitario: elegido.price,
            notas: $('notas').value.trim()
        };

        // Se valida cada línea con las mismas reglas que se aplican al
        // guardar, para avisar antes de que el cliente confirme.
        var error = RestoVentas.validar({ tipo_pedido: 'LLEVAR', items: [item] });
        if (error) {
            Resto.mensaje('pedidoMsg', error, true);
            return;
        }

        // Mismo plato con las mismas notas: se suman las cantidades en vez de
        // repetir la línea, así cocina ve "3 x Hamburguesa" y no tres líneas.
        var existente = carrito.filter(function (l) {
            return l.product_id === item.product_id && l.notas === item.notas;
        })[0];

        if (existente) {
            if (existente.cantidad + cant > RestoVentas.CANTIDAD_MAX) {
                Resto.mensaje('pedidoMsg', 'La cantidad máxima por plato es ' + RestoVentas.CANTIDAD_MAX + '.', true);
                return;
            }
            existente.cantidad += cant;
            // El precio puede haber cambiado desde que se agregó la primera
            // vez: manda siempre el vigente.
            existente.precio_unitario = item.precio_unitario;
        } else {
            carrito.push(item);
        }

        elegido = null;
        $('cantidad').value = '1';
        $('notas').value = '';
        Resto.mensaje('pedidoMsg', '');
        pintarMenu();
        pintarSeleccion();
        pintarCarrito();
    }

    function quitar(indice) {
        carrito.splice(indice, 1);
        Resto.mensaje('pedidoMsg', '');
        pintarCarrito();
    }

    function celda(texto) {
        var td = document.createElement('td');
        td.textContent = texto;
        return td;
    }

    function pintarCarrito() {
        var cuerpo = $('carritoBody');
        if (!cuerpo) return;

        cuerpo.innerHTML = '';

        if (!carrito.length) {
            var tr = document.createElement('tr');
            var td = document.createElement('td');
            td.className = 'vacio';
            td.colSpan = 4;
            td.textContent = 'Todavía no has agregado platos.';
            tr.appendChild(td);
            cuerpo.appendChild(tr);
        } else {
            carrito.forEach(function (item, indice) {
                var fila = document.createElement('tr');

                var tdNombre = celda(item.nombre);
                if (item.notas) {
                    var nota = document.createElement('div');
                    nota.className = 'ayuda';
                    nota.textContent = item.notas;
                    tdNombre.appendChild(nota);
                }
                fila.appendChild(tdNombre);

                fila.appendChild(celda(String(item.cantidad)));
                fila.appendChild(celda(Resto.moneda(subtotalLinea(item))));

                var acciones = document.createElement('td');
                acciones.className = 'acciones';
                var quitarBtn = document.createElement('button');
                quitarBtn.type = 'button';
                quitarBtn.className = 'peligro';
                quitarBtn.textContent = 'Quitar';
                quitarBtn.addEventListener('click', function () { quitar(indice); });
                acciones.appendChild(quitarBtn);
                fila.appendChild(acciones);

                cuerpo.appendChild(fila);
            });
        }

        $('total').textContent = Resto.moneda(total());
        $('pedirBtn').disabled = !carrito.length;
    }

    // --- Datos del pedido ---

    function tipoPedido() {
        return $('tipoPedido').value;
    }

    // El número de mesa solo tiene sentido si el pedido es para consumir ahí.
    function pintarTipo() {
        $('campoMesa').classList.toggle('oculto', tipoPedido() !== 'MESA');
    }

    // --- Confirmar ---

    function confirmar() {
        var datos = {
            tipo_pedido: tipoPedido(),
            mesa_id: $('mesa').value.trim(),
            mesero: $('mesero').value.trim(),
            items: carrito,
            canal: 'WEB'
        };

        var error = RestoVentas.validar(datos);
        if (error) {
            Resto.mensaje('pedidoMsg', error, true);
            return;
        }

        var boton = $('pedirBtn');
        boton.disabled = true;
        Resto.mensaje('pedidoMsg', 'Enviando pedido...');

        RestoVentas.crear(datos)
            .then(function () {
                var platos = carrito.reduce(function (suma, item) { return suma + item.cantidad; }, 0);
                Resto.mensaje('pedidoMsg', 'Pedido enviado: ' + platos + ' plato(s). ¡Gracias!');
                carrito = [];
                elegido = null;
                $('cantidad').value = '1';
                $('notas').value = '';
                pintarMenu();
                pintarSeleccion();
                pintarCarrito();
            })
            .catch(function (err) {
                console.error('Error al enviar el pedido:', err);
                Resto.mensaje('pedidoMsg', 'No se pudo enviar el pedido. Intenta de nuevo.', true);
                boton.disabled = false;
            });
    }

    // --- Menú en tiempo real ---
    //
    // Cuando el admin cambia el menú hay que reconciliar lo que el cliente ya
    // tiene en pantalla: si un plato desapareció se quita, y si le cambiaron
    // el precio se toma el nuevo, para no cobrar con un precio viejo.
    function reconciliar(lista) {
        var porId = {};
        lista.forEach(function (producto) { porId[producto.id] = producto; });

        if (elegido) {
            elegido = porId[elegido.id] || null;
        }

        var quitados = 0;
        var recalculados = 0;

        carrito = carrito.filter(function (item) {
            var producto = porId[item.product_id];
            if (!producto) {
                quitados++;
                return false;
            }
            if (producto.price !== item.precio_unitario) {
                item.precio_unitario = producto.price;
                recalculados++;
            }
            item.nombre = producto.name;
            return true;
        });

        if (quitados) {
            Resto.mensaje('pedidoMsg', 'Se quitó del pedido ' + quitados + ' plato(s) que ya no está(n) en el menú.', true);
        } else if (recalculados) {
            Resto.mensaje('pedidoMsg', 'El precio de ' + recalculados + ' plato(s) cambió; el total se actualizó.', true);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        $('agregarBtn').addEventListener('click', agregar);
        $('pedirBtn').addEventListener('click', confirmar);
        $('tipoPedido').addEventListener('change', function () {
            Resto.mensaje('pedidoMsg', '');
            pintarTipo();
        });
        $('cantidad').addEventListener('input', function () { Resto.mensaje('pedidoMsg', ''); });

        RestoMenu.escuchar(function (lista) {
            productos = lista;
            reconciliar(lista);
            pintarMenu();
            pintarSeleccion();
            pintarCarrito();
        }, function () {
            Resto.mensaje('pedidoMsg', 'No se pudo cargar el menú.', true);
        });

        pintarTipo();
        pintarSeleccion();
        pintarCarrito();
    });
})();
