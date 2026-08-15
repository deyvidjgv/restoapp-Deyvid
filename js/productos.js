// RestoApp - Creación de productos (Ejercicio 2: módulo IIFE)
(function () {
    'use strict';

    // Crear producto: POST directo a Realtime DB (mala práctica: sin sanitizar)
    function crearProducto() {
        var msg = document.getElementById('prodMsg');

        if (!window.RestoAuth.isLogged()) {
            msg.innerText = 'No autorizado';
            return;
        }

        var name = document.getElementById('newName').value;
        var price = Number(document.getElementById('newPrice').value) || 0;
        if (name === '' || price <= 0) {
            msg.innerText = 'Datos inválidos';
            return;
        }

        var url = 'https://restoapp-clase-default-rtdb.firebaseio.com/menu.json';
        var body = { name: name, price: price };
        fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
            .then(function (res) { if (!res.ok) throw new Error('Error al crear'); return res.json(); })
            .then(function () {
                msg.innerText = 'Producto creado';
                document.getElementById('newName').value = '';
                document.getElementById('newPrice').value = '';
            })
            .catch(function (err) {
                console.error('Crear producto error:', err);
                msg.innerText = 'Error creando producto';
            });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('crearProductoBtn');
        if (btn) btn.addEventListener('click', crearProducto);
    });
})();
