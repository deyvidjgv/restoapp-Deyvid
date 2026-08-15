// RestoApp - Toma de pedidos (Ejercicio 2: módulo IIFE / Ejercicio 4: validaciones)
(function () {
    'use strict';

    // --- FUNCIÓN MONOLÍTICA (Complejidad ciclomática alta) ---
    // TODO(Ejercicio 5): separar cálculo de impuestos, validación y actualización del DOM.
    function tomarTodo() {
        var resultado = document.getElementById('res');

        // Nombres de variables crípticos (a, b, p)
        let a = document.getElementById('a').value;
        let b = document.getElementById('b').value;
        let p = document.getElementById('p').value;

        b = Number(b);
        p = Number(p);

        // Validación con mensajes específicos (Ejercicio 4)
        if (a === "") {
            mostrarError(resultado, 'Selecciona un plato del menú.');
            return;
        }
        if (!b || b <= 0) {
            mostrarError(resultado, 'La cantidad debe ser mayor a 0.');
            return;
        }
        if (!p || p <= 0) {
            mostrarError(resultado, 'El precio unitario debe ser mayor a 0.');
            return;
        }

        let sub = b * p;
        // IVA hardcodeado 19%
        let tax = sub * 0.19;
        let total = sub + tax;

        resultado.classList.remove('error');
        resultado.innerHTML = "Pedido: " + a + " | Subtotal: $" + sub.toFixed(2) + " | IVA: $" + tax.toFixed(2) + " | Total: $" + total.toFixed(2);

        // Limpieza manual del formulario
        document.getElementById('a').value = "";
        document.getElementById('b').value = "";
        document.getElementById('p').value = "";
    }

    function mostrarError(resultado, mensaje) {
        resultado.classList.add('error');
        resultado.innerText = mensaje;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('btn');
        if (btn) btn.addEventListener('click', tomarTodo);
    });
})();
