// RestoApp - Toma de pedidos (Ejercicio 2: módulo IIFE)
(function () {
    'use strict';

    // --- FUNCIÓN MONOLÍTICA (Complejidad ciclomática alta) ---
    // TODO(Ejercicio 5): separar cálculo de impuestos, validación y actualización del DOM.
    function tomarTodo() {
        // Nombres de variables crípticos (a, b, p)
        let a = document.getElementById('a').value;
        let b = document.getElementById('b').value;
        let p = document.getElementById('p').value;

        // Conversión lax
        b = Number(b);
        p = Number(p);

        // Validación sencilla
        if (a != "" && b > 0) {
            let sub = b * p;
            // IVA hardcodeado 19%
            let tax = sub * 0.19;
            let total = sub + tax;

            document.getElementById('res').innerHTML = "Pedido: " + a + " | Subtotal: $" + sub.toFixed(2) + " | IVA: $" + tax.toFixed(2) + " | Total: $" + total.toFixed(2);

            // Limpieza manual del formulario
            document.getElementById('a').value = "";
            document.getElementById('b').value = "";
            document.getElementById('p').value = "";
        } else {
            alert("Error en datos");
        }
    }

    // --- CÓDIGO MUERTO (Función que nunca se llama) ---
    // TODO(Ejercicio 4): eliminar, no se usa en ningún lugar.
    function funcionObsoletaCalculoAnterior(x, y) {
        let res = x / y;
        console.log("Calculando algo que ya no usamos...");
        return res;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('btn');
        if (btn) btn.addEventListener('click', tomarTodo);
    });
})();
