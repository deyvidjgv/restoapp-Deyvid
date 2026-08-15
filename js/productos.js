// RestoApp - Creación de productos
// Ejercicio 5: lógica de negocio (validar) separada de la capa DOM
// (leer formulario, mostrar mensaje, limpiar campos).
(function () {
    'use strict';

    // --- Lógica de negocio ---

    function validarProducto(name, price) {
        if (name === '') return 'El nombre del producto no puede estar vacío.';
        if (isNaN(price) || price <= 0) return 'El precio debe ser un número mayor a 0.';
        return null;
    }

    // --- Capa DOM ---

    function leerFormulario() {
        return {
            name: document.getElementById('newName').value.trim(),
            price: Number(document.getElementById('newPrice').value)
        };
    }

    function limpiarFormulario() {
        document.getElementById('newName').value = '';
        document.getElementById('newPrice').value = '';
    }

    function mostrarMensaje(texto) {
        document.getElementById('prodMsg').innerText = texto;
    }

    function crearProducto() {
        if (!window.RestoAuth.isLogged()) {
            mostrarMensaje('No autorizado');
            return;
        }

        try {
            var datos = leerFormulario();
            var error = validarProducto(datos.name, datos.price);
            if (error) {
                mostrarMensaje(error);
                return;
            }

            firebase.database().ref('menu').push({ name: datos.name, price: datos.price })
                .then(function () {
                    mostrarMensaje('Producto creado');
                    limpiarFormulario();
                })
                .catch(function (err) {
                    console.error('Crear producto error:', err);
                    mostrarMensaje('Error creando producto. Intenta de nuevo.');
                });
        } catch (err) {
            console.error('Error inesperado al crear producto:', err);
            mostrarMensaje('Ocurrió un error inesperado.');
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('crearProductoBtn');
        if (btn) btn.addEventListener('click', crearProducto);
    });
})();
