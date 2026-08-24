// RestoApp - Comanda de cocina
//
// Lee /registroVentas a través de RestoVentas (que normaliza también los
// pedidos guardados con el esquema viejo) y hace avanzar cada comanda por el
// flujo PENDING → IN_PREPARATION → READY → DELIVERED. Los ya entregados
// desaparecen de la pantalla: la comanda solo muestra lo que está por hacer.
(function () {
    'use strict';

    var LIMITE = 100;
    var pedidos = [];

    function tarjeta(pedido) {
        var div = document.createElement('div');
        div.className = 'plato comanda-pedido';

        var titulo = document.createElement('div');
        titulo.className = 'nombre';
        titulo.textContent = pedido.tipo_pedido === 'MESA'
            ? 'Mesa ' + pedido.mesa_id
            : RestoVentas.TIPOS[pedido.tipo_pedido];
        div.appendChild(titulo);

        var meta = document.createElement('div');
        meta.className = 'precio';
        meta.textContent = Resto.fecha(pedido.fecha_hora)
            + ' · ' + RestoVentas.ETIQUETAS[pedido.estado]
            + (pedido.mesero ? ' · ' + pedido.mesero : '');
        div.appendChild(meta);

        var lista = document.createElement('ul');
        lista.className = 'comanda-items';
        pedido.items.forEach(function (item) {
            var li = document.createElement('li');
            li.textContent = item.cantidad + ' x ' + item.nombre;
            if (item.notas) {
                var nota = document.createElement('div');
                nota.className = 'ayuda';
                nota.textContent = item.notas;
                li.appendChild(nota);
            }
            lista.appendChild(li);
        });
        div.appendChild(lista);

        var accion = RestoVentas.ACCIONES[pedido.estado];
        if (accion) {
            var boton = document.createElement('button');
            boton.type = 'button';
            boton.className = 'principal';
            boton.textContent = accion;
            boton.addEventListener('click', function () {
                boton.disabled = true;
                avanzar(pedido, boton);
            });
            div.appendChild(boton);
        }

        return div;
    }

    function avanzar(pedido, boton) {
        Resto.mensaje('comandaMsg', '');
        RestoVentas.avanzar(pedido.id, pedido.estado)
            .catch(function (err) {
                console.error('Error actualizando el pedido:', err);
                Resto.mensaje('comandaMsg', RestoAuth.mensajeError(err), true);
                if (boton) boton.disabled = false;
            });
    }

    function pintar() {
        var caja = document.getElementById('comanda');
        if (!caja) return;

        // Solo lo que cocina todavía tiene que atender, del más antiguo al
        // más reciente: los entregados salen de la pantalla.
        var pendientes = pedidos.filter(function (pedido) {
            return RestoVentas.activo(pedido.estado);
        });

        caja.innerHTML = '';
        if (!pendientes.length) {
            var vacio = document.createElement('p');
            vacio.className = 'vacio';
            vacio.textContent = 'No hay pedidos por atender.';
            caja.appendChild(vacio);
            return;
        }

        pendientes.forEach(function (pedido) { caja.appendChild(tarjeta(pedido)); });
    }

    document.addEventListener('sesion-lista', function (evento) {
        if (!evento.detail) return;

        RestoVentas.escuchar(LIMITE, function (lista) {
            pedidos = lista;
            pintar();
        }, function () {
            var caja = document.getElementById('comanda');
            if (caja) {
                caja.innerHTML = '';
                var mensaje = document.createElement('p');
                mensaje.className = 'vacio';
                mensaje.textContent = 'No se pudo cargar la comanda.';
                caja.appendChild(mensaje);
            }
        });
    });
})();
