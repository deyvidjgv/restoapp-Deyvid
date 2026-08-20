// RestoApp - Fondo animado de estrellas
// Adaptado del diseño "RestoApp Acceso" (Claude Design): canvas con parallax,
// brillo/repulsión al acercar el mouse, líneas entre estrellas cercanas y
// estrellas fugaces ocasionales. Se inyecta en las 4 páginas para que el
// fondo sea consistente al navegar entre ellas.
(function () {
    'use strict';

    function initStarfield() {
        var canvas = document.createElement('canvas');
        canvas.id = 'starfield';
        canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;z-index:-1;display:block;';
        document.body.insertBefore(canvas, document.body.firstChild);

        var ctx = canvas.getContext('2d');
        var w = 0, h = 0, stars = [], shooting = [], ripples = [];
        var pointer = { x: -9999, y: -9999, active: false };

        function resize() {
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            var count = Math.round((w * h) / 5200);
            stars = [];
            for (var i = 0; i < count; i++) {
                stars.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    r: Math.random() * 1.25 + 0.25,
                    a: Math.random(),
                    sp: Math.random() * 0.018 + 0.004,
                    dz: Math.random() * 0.05 + 0.01,
                    ox: 0, oy: 0
                });
            }
        }

        function move(e) {
            pointer.x = e.clientX;
            pointer.y = e.clientY;
            pointer.active = true;
        }

        function leave() {
            pointer.active = false;
            pointer.x = pointer.y = -9999;
        }

        function click(e) {
            ripples.push({ x: e.clientX, y: e.clientY, r: 0, life: 1 });
            if (ripples.length > 6) ripples.shift();
        }

        function spawnShooting() {
            shooting.push({
                x: Math.random() * w * 0.8,
                y: Math.random() * h * 0.4,
                len: 90 + Math.random() * 120,
                life: 1,
                vx: 5 + Math.random() * 3,
                vy: 2 + Math.random()
            });
        }

        function draw() {
            ctx.clearRect(0, 0, w, h);
            var R = 170;
            var near = [];

            for (var i = 0; i < stars.length; i++) {
                var s = stars[i];
                s.a += s.sp;
                var o = 0.35 + 0.65 * Math.abs(Math.sin(s.a));
                s.y += s.dz;
                if (s.y > h) s.y = 0;

                var px = 0, py = 0, glow = 0;
                if (pointer.active) {
                    var dx = s.x - pointer.x, dy = s.y - pointer.y;
                    var d = Math.hypot(dx, dy);
                    if (d < R) {
                        var f = 1 - d / R;
                        glow = f;
                        var push = f * f * 26;
                        px = (dx / (d || 1)) * push;
                        py = (dy / (d || 1)) * push;
                        near.push({ x: s.x + px, y: s.y + py, f: f });
                    }
                }
                s.ox += (px - s.ox) * 0.08;
                s.oy += (py - s.oy) * 0.08;
                var sx = s.x + s.ox, sy = s.y + s.oy;

                ctx.globalAlpha = Math.min(1, o + glow * 0.5);
                ctx.fillStyle = glow > 0.35 ? '#bcd0ff' : '#e9efff';
                ctx.beginPath();
                ctx.arc(sx, sy, s.r + glow * 1.1, 0, Math.PI * 2);
                ctx.fill();
            }

            for (var a = 0; a < near.length; a++) {
                for (var b = a + 1; b < near.length; b++) {
                    var p1 = near[a], p2 = near[b];
                    var dd = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                    if (dd < 92) {
                        ctx.globalAlpha = (1 - dd / 92) * Math.min(p1.f, p2.f) * 0.55;
                        ctx.strokeStyle = '#8ea8ff';
                        ctx.lineWidth = 0.7;
                        ctx.beginPath();
                        ctx.moveTo(p1.x, p1.y);
                        ctx.lineTo(p2.x, p2.y);
                        ctx.stroke();
                    }
                }
            }

            for (var r = ripples.length - 1; r >= 0; r--) {
                var rp = ripples[r];
                rp.r += 6;
                rp.life -= 0.018;
                if (rp.life <= 0) { ripples.splice(r, 1); continue; }
                ctx.globalAlpha = rp.life * 0.5;
                ctx.strokeStyle = '#9fb8ff';
                ctx.lineWidth = 1.2;
                ctx.beginPath();
                ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
                ctx.stroke();
            }

            for (var m = shooting.length - 1; m >= 0; m--) {
                var sh = shooting[m];
                sh.x += sh.vx;
                sh.y += sh.vy;
                sh.life -= 0.012;
                if (sh.life <= 0 || sh.x > w + 200) { shooting.splice(m, 1); continue; }
                var g = ctx.createLinearGradient(sh.x, sh.y, sh.x - sh.len, sh.y - sh.len * 0.4);
                g.addColorStop(0, 'rgba(230,238,255,' + sh.life.toFixed(2) + ')');
                g.addColorStop(1, 'rgba(230,238,255,0)');
                ctx.globalAlpha = 1;
                ctx.strokeStyle = g;
                ctx.lineWidth = 1.6;
                ctx.beginPath();
                ctx.moveTo(sh.x, sh.y);
                ctx.lineTo(sh.x - sh.len, sh.y - sh.len * 0.4);
                ctx.stroke();
            }

            ctx.globalAlpha = 1;
            requestAnimationFrame(draw);
        }

        resize();
        draw();
        window.addEventListener('resize', resize);
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerleave', leave);
        window.addEventListener('pointerdown', click);
        setInterval(spawnShooting, 3800);
    }

    document.addEventListener('DOMContentLoaded', initStarfield);
})();
