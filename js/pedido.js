// RestoApp - Página de pedido (pública)
//
// El cliente elige un plato del menú, define la cantidad y confirma. El
// precio unitario nunca se escribe a mano: viene del producto que creó el
// administrador, y el campo es de solo lectura.
(function () {
    'use strict';

    var CANTIDAD_MAX = 99;

    var productos = [];
    var elegido = null;

    // --- Cálculo ---

    function total() {
        return elegido ? elegido.price * cantidad() : 0;
    }

    function cantidad() {
        return Number(document.getElementById('cantidad').value);
    }

    function validar() {
        if (!elegido) return 'Elige un plato del menú.';
        var cant = cantidad();
        if (!cant || cant <= 0) return 'La cantidad debe ser mayor a 0.';
        if (Math.floor(cant) !== cant) return 'La cantidad debe ser un número entero.';
        if (cant > CANTIDAD_MAX) return 'La cantidad máxima por pedido es ' + CANTIDAD_MAX + '.';
        return null;
    }

    // --- Pintado ---

    function pintarMenu() {
        var caja = document.getElementById('platos');
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
                pintarResumen();
            });

            caja.appendChild(boton);
        });
    }

    function pintarResumen() {
        document.getElementById('seleccionado').value = elegido ? elegido.name : '';
        document.getElementById('precio').value = elegido ? Resto.moneda(elegido.price) : '—';
        document.getElementById('total').textContent = Resto.moneda(total());
        document.getElementById('pedirBtn').disabled = !elegido;
    }

    // --- Guardar el pedido ---

    function hacerPedido() {
        var error = validar();
        if (error) {
            Resto.mensaje('pedidoMsg', error, true);
            return;
        }

        var boton = document.getElementById('pedirBtn');
        boton.disabled = true;
        Resto.mensaje('pedidoMsg', 'Enviando pedido...');

        var cant = cantidad();
        // push() reserva la clave antes de escribir; se guarda esa misma
        // clave como `id` dentro del propio registro del pedido.
        var refPedido = firebase.database().ref('pedidos').push();
        refPedido.set({
            id: refPedido.key,
            productoId: elegido.id,
            name: elegido.name,
            price: elegido.price,
            cantidad: cant,
            total: elegido.price * cant,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        })
            .then(function () {
                Resto.mensaje('pedidoMsg', 'Pedido enviado: ' + cant + ' x ' + elegido.name + '.');
                elegido = null;
                document.getElementById('cantidad').value = '1';
                pintarMenu();
                pintarResumen();
            })
            .catch(function (err) {
                console.error('Error al enviar el pedido:', err);
                Resto.mensaje('pedidoMsg', 'No se pudo enviar el pedido. Intenta de nuevo.', true);
                boton.disabled = false;
            });
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.getElementById('pedirBtn').addEventListener('click', hacerPedido);
        document.getElementById('cantidad').addEventListener('input', function () {
            Resto.mensaje('pedidoMsg', '');
            pintarResumen();
        });

        RestoMenu.escuchar(function (lista) {
            productos = lista;
            // Si el plato elegido se eliminó del menú mientras el cliente
            // decidía, se limpia la selección para no pedir algo inexistente.
            if (elegido && !lista.filter(function (p) { return p.id === elegido.id; }).length) {
                elegido = null;
                Resto.mensaje('pedidoMsg', 'El plato que habías elegido ya no está disponible.', true);
            }
            pintarMenu();
            pintarResumen();
        }, function () {
            Resto.mensaje('pedidoMsg', 'No se pudo cargar el menú.', true);
        });

        pintarResumen();
    });
})();
