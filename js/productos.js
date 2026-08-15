// RestoApp - Creación de productos (Ejercicio 2/3)
// Escribe con el SDK de Firebase (no fetch crudo) para que la escritura
// vaya autenticada con el usuario de Firebase Auth, tal como lo exigen
// las reglas de Realtime Database (".write": "auth != null").
(function () {
    'use strict';

    function crearProducto() {
        var msg = document.getElementById('prodMsg');

        if (!window.RestoAuth.isLogged()) {
            msg.innerText = 'No autorizado';
            return;
        }

        var name = document.getElementById('newName').value.trim();
        var priceInput = document.getElementById('newPrice').value;
        var price = Number(priceInput);

        if (name === '') {
            msg.innerText = 'El nombre del producto no puede estar vacío.';
            return;
        }
        if (priceInput === '' || isNaN(price) || price <= 0) {
            msg.innerText = 'El precio debe ser un número mayor a 0.';
            return;
        }

        firebase.database().ref('menu').push({ name: name, price: price })
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
