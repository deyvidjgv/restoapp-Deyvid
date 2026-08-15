// RestoApp - Toma de pedidos
// Ejercicio 5: lógica de negocio (validar/calcular/formatear) separada
// de la capa DOM (leer formulario, mostrar resultado, limpiar campos).
(function () {
    'use strict';

    var IVA_RATE = 0.19;

    // --- Lógica de negocio (funciones puras, sin tocar el DOM) ---

    function validarPedido(plato, cantidad, precioUnitario) {
        if (!plato) return 'Selecciona un plato del menú.';
        if (!cantidad || cantidad <= 0) return 'La cantidad debe ser mayor a 0.';
        if (!precioUnitario || precioUnitario <= 0) return 'El precio unitario debe ser mayor a 0.';
        return null;
    }

    function calcularPedido(cantidad, precioUnitario) {
        var subtotal = cantidad * precioUnitario;
        var iva = subtotal * IVA_RATE;
        var total = subtotal + iva;
        return { subtotal: subtotal, iva: iva, total: total };
    }

    function formatearResultado(plato, calculo) {
        return "Pedido: " + plato +
            " | Subtotal: $" + calculo.subtotal.toFixed(2) +
            " | IVA: $" + calculo.iva.toFixed(2) +
            " | Total: $" + calculo.total.toFixed(2);
    }

    // --- Capa DOM ---

    function leerFormulario() {
        return {
            plato: document.getElementById('a').value,
            cantidad: Number(document.getElementById('b').value),
            precioUnitario: Number(document.getElementById('p').value)
        };
    }

    function limpiarFormulario() {
        document.getElementById('a').value = "";
        document.getElementById('b').value = "";
        document.getElementById('p').value = "";
    }

    function mostrarResultado(mensaje, esError) {
        var resultado = document.getElementById('res');
        resultado.classList.toggle('error', !!esError);
        resultado.innerText = mensaje;
    }

    function tomarTodo() {
        try {
            var datos = leerFormulario();
            var error = validarPedido(datos.plato, datos.cantidad, datos.precioUnitario);
            if (error) {
                mostrarResultado(error, true);
                return;
            }

            var calculo = calcularPedido(datos.cantidad, datos.precioUnitario);
            mostrarResultado(formatearResultado(datos.plato, calculo), false);
            limpiarFormulario();
        } catch (err) {
            console.error('Error al procesar el pedido:', err);
            mostrarResultado('Ocurrió un error inesperado al procesar el pedido.', true);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('btn');
        if (btn) btn.addEventListener('click', tomarTodo);
    });
})();
