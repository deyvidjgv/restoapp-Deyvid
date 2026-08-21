// RestoApp - Comanda de cocina
//
// Lista todos los pedidos con su estado. La única acción posible es pasar un
// pedido de "PENDING" a "IN PROGRESS"; los pedidos sin `status` (guardados
// antes de este cambio) se tratan como "PENDING".
(function () {
    'use strict';

    var ETIQUETAS = {
        PENDING: 'Pendiente',
        'IN PROGRESS': 'En preparación'
    };

    function estadoDe(pedido) {
        return pedido.status === 'IN PROGRESS' ? 'IN PROGRESS' : 'PENDING';
    }

    function tarjeta(pedido) {
        var estado = estadoDe(pedido);

        var div = document.createElement('div');
        div.className = 'plato';

        var nombre = document.createElement('div');
        nombre.className = 'nombre';
        nombre.textContent = (pedido.cantidad || 0) + ' x ' + (pedido.name || '—');
        div.appendChild(nombre);

        var detalle = document.createElement('div');
        detalle.className = 'precio';
        detalle.textContent = Resto.fecha(pedido.createdAt) + ' · ' + ETIQUETAS[estado];
        div.appendChild(detalle);

        if (estado === 'PENDING') {
            var boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'principal';
            boton.textContent = 'Marcar en preparación';
            boton.addEventListener('click', function () {
                boton.disabled = true;
                cambiarEstado(pedido.id, boton);
            });
            div.appendChild(boton);
        }

        return div;
    }

    function cambiarEstado(id, boton) {
        firebase.database().ref('pedidos').child(id).update({ status: 'IN PROGRESS' })
            .catch(function (err) {
                console.error('Error actualizando el pedido:', err);
                Resto.mensaje('comandaMsg', RestoAuth.mensajeError(err), true);
                if (boton) boton.disabled = false;
            });
    }

    function pintar(pedidos) {
        var caja = document.getElementById('comanda');
        if (!caja) return;

        caja.innerHTML = '';
        if (!pedidos.length) {
            var vacio = document.createElement('p');
            vacio.className = 'vacio';
            vacio.textContent = 'No hay pedidos por atender.';
            caja.appendChild(vacio);
            return;
        }

        pedidos.forEach(function (pedido) { caja.appendChild(tarjeta(pedido)); });
    }

    function escuchar() {
        firebase.database().ref('pedidos').limitToLast(50).on('value', function (snap) {
            var lista = [];
            snap.forEach(function (hijo) {
                var val = hijo.val() || {};
                val.id = hijo.key;
                lista.push(val);
            });
            // El primero en llegar es el primero en atenderse.
            pintar(lista);
        }, function (err) {
            console.error('Error leyendo la comanda:', err);
            var caja = document.getElementById('comanda');
            if (caja) {
                caja.innerHTML = '';
                var mensaje = document.createElement('p');
                mensaje.className = 'vacio';
                mensaje.textContent = 'No se pudo cargar la comanda.';
                caja.appendChild(mensaje);
            }
        });
    }

    document.addEventListener('sesion-lista', function (evento) {
        if (!evento.detail) return;
        escuchar();
    });
})();
