/* ══════════════════════════════════════════════════════
   CSS 3D Gallery Room — hardcoded photo paths
   ══════════════════════════════════════════════════════ */
(function() {
    'use strict';

    var wrap = document.getElementById('roomWrap');
    var stage = document.getElementById('roomStage');
    if (!wrap || !stage) { console.warn('Room: elements not found'); return; }

    // ─── Photo helper: just prepend the base path ───
    var BASE = 'photos';

    function p(series, file) {
        return BASE + '/' + series + '/' + file;
    }

    // ─── 4 walls, 6 series with hardcoded paths ───
    var walls = [
        // Front: BNBU
        {
            sections: [
                {
                    id: 'BNBU', name: 'BNBU', sub: '校园光景',
                    photos: [
                        p('BNBU', '微信图片_20260611181834_648_17.jpg'),
                        p('BNBU', '微信图片_20260611181837_649_17.jpg'),
                        p('BNBU', '微信图片_20260611181842_650_17.jpg'),
                        p('BNBU', '微信图片_20260611181845_651_17.jpg'),
                    ],
                },
            ],
            transform: 'rotateY(0deg) translateZ(-260px)',
        },
        // Back: HK印象
        {
            sections: [
                {
                    id: 'HK印象', name: 'HK 印象', sub: 'Hong Kong Impression',
                    photos: [
                        p('HK印象', '微信图片_20260611181946_681_17.jpg'),
                        p('HK印象', '微信图片_20260611181952_682_17.jpg'),
                        p('HK印象', '微信图片_20260611181958_683_17.jpg'),
                        p('HK印象', '微信图片_20260611182001_684_17.jpg'),
                    ],
                },
            ],
            transform: 'rotateY(180deg) translateZ(-260px)',
        },
        // Left: 华侨城 + 太子湾
        {
            sections: [
                {
                    id: '华侨城', name: '华侨城', sub: 'Overseas Chinese Town',
                    photos: [
                        p('华侨城', '微信图片_20260611181631_631_17.jpg'),
                        p('华侨城', '微信图片_20260611181632_632_17.jpg'),
                        p('华侨城', '微信图片_20260611181634_633_17.jpg'),
                    ],
                },
                {
                    id: '太子湾', name: '太子湾', sub: 'Taizi Bay',
                    photos: [
                        p('太子湾', '微信图片_20260611181554_613_17.jpg'),
                        p('太子湾', '微信图片_20260611181556_614_17.jpg'),
                        p('太子湾', '微信图片_20260611181558_615_17.jpg'),
                    ],
                },
            ],
            transform: 'rotateY(-90deg) translateZ(-260px)',
        },
        // Right: AD FUTURE + JUNGLE
        {
            sections: [
                {
                    id: '汕-AD FUTURE', name: 'AD FUTURE', sub: 'Shanwei',
                    photos: [
                        p('汕-AD FUTURE', '微信图片_20260611182117_703_17.jpg'),
                        p('汕-AD FUTURE', '微信图片_20260611182146_704_17.jpg'),
                        p('汕-AD FUTURE', '微信图片_20260611182151_705_17.jpg'),
                    ],
                },
                {
                    id: '汕-JUNGLE', name: 'JUNGLE', sub: 'Shanwei · 丛林',
                    photos: [
                        p('汕-JUNGLE', '微信图片_20260611182719_713_17.jpg'),
                        p('汕-JUNGLE', '微信图片_20260611182726_714_17.jpg'),
                        p('汕-JUNGLE', '微信图片_20260611182733_715_17.jpg'),
                    ],
                },
            ],
            transform: 'rotateY(90deg) translateZ(-260px)',
        },
    ];

    var S = 520;

    walls.forEach(function(data) {
        var wall = document.createElement('div');
        wall.className = 'cube-wall';
        wall.style.width = S + 'px';
        wall.style.height = S + 'px';
        wall.style.transform = data.transform;

        var surface = document.createElement('div');
        surface.className = 'cube-wall-surface';
        wall.dataset.series = data.sections[0].id;

        data.sections.forEach(function(sec, si) {
            // Rail
            var rail = document.createElement('div');
            rail.className = 'cube-rail';
            rail.innerHTML =
                '<span class="cube-rail-dot"></span>' +
                '<span class="cube-rail-name">' + sec.name + '</span>' +
                '<span class="cube-rail-sub">' + sec.sub + '</span>' +
                '<span class="cube-rail-dot"></span>';

            // Photos row
            var row = document.createElement('div');
            row.className = 'cube-photos';
            sec.photos.forEach(function(src) {
                var frame = document.createElement('div');
                frame.className = 'cube-photo-frame';
                var img = document.createElement('div');
                img.className = 'cube-photo-img';
                img.style.backgroundImage = 'url(' + src + ')';
                frame.appendChild(img);
                row.appendChild(frame);
            });
            while (row.children.length < 3) {
                var em = document.createElement('div');
                em.className = 'cube-photo-frame empty';
                row.appendChild(em);
            }

            surface.appendChild(rail);
            surface.appendChild(row);
            if (si < data.sections.length - 1) {
                surface.appendChild(document.createElement('div')).className = 'cube-section-divider';
            }
        });

        wall.appendChild(surface);
        stage.appendChild(wall);

        wall.addEventListener('click', function() {
            var s = this.dataset.series;
            window.location.hash = '#gallery';
            setTimeout(function() {
                document.querySelectorAll('.filter-btn').forEach(function(b) {
                    if (b.dataset.filter === s) { b.click(); b.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
                });
            }, 200);
        });
    });

    // ═══ Drag ───
    var isDragging = false, prevX = 0, prevY = 0;
    var rotY = 0, rotX = 0;
    var vY = 0, vX = 0, lX = 0, lY = 0, lT = 0;

    function getPos(e) {
        var cx = e.clientX || (e.touches && e.touches[0].clientX);
        var cy = e.clientY || (e.touches && e.touches[0].clientY);
        return (cx === undefined || cy === undefined) ? null : { x: cx, y: cy };
    }

    function onDown(e) {
        var p = getPos(e); if (!p) return;
        isDragging = true; prevX = p.x; prevY = p.y;
        lX = p.x; lY = p.y; lT = Date.now();
        vY = 0; vX = 0; wrap.classList.add('grabbing');
    }

    function onMove(e) {
        if (!isDragging) return;
        var p = getPos(e); if (!p) return;
        var dx = p.x - prevX, dy = p.y - prevY;
        prevX = p.x; prevY = p.y;
        rotY += dx * 0.6; rotX += dy * 0.4;
        if (rotX > 60) rotX = 60; if (rotX < -60) rotX = -60;
        var now = Date.now();
        if (now - lT < 120) { vY = (p.x - lX) * 0.6; vX = (p.y - lY) * 0.4; }
        lX = p.x; lY = p.y; lT = now;
        updateStage();
    }

    function onUp() {
        isDragging = false; wrap.classList.remove('grabbing');
        if (Math.abs(vY) > 0.3 || Math.abs(vX) > 0.3) {
            (function inert() {
                vY *= 0.9; vX *= 0.9;
                if (Math.abs(vY) < 0.1 && Math.abs(vX) < 0.1) return;
                rotY += vY; rotX += vX;
                if (rotX > 60) rotX = 60; if (rotX < -60) rotX = -60;
                updateStage(); requestAnimationFrame(inert);
            })();
        }
    }

    wrap.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    wrap.addEventListener('touchstart', function(e) { e.preventDefault(); onDown(e); }, { passive: false });
    window.addEventListener('touchmove', function(e) { if (isDragging) onMove(e); }, { passive: false });
    window.addEventListener('touchend', onUp);

    document.getElementById('roomNavLeft').addEventListener('click', function() { rotY -= 90; updateStage(true); });
    document.getElementById('roomNavRight').addEventListener('click', function() { rotY += 90; updateStage(true); });

    function updateStage(smooth) {
        stage.style.transition = smooth ? 'transform 0.5s cubic-bezier(0.22,1,0.36,1)' : 'none';
        stage.style.transform = 'rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
    }

    window.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft')  { rotY -= 45; updateStage(true); }
        if (e.key === 'ArrowRight') { rotY += 45; updateStage(true); }
        if (e.key === 'ArrowUp')    { rotX -= 15; rotX = Math.max(rotX, -60); updateStage(true); }
        if (e.key === 'ArrowDown')  { rotX += 15; rotX = Math.min(rotX, 60); updateStage(true); }
    });

    // ─── Auto-spin ───
    var autoRotate = true;
    wrap.addEventListener('mousedown', function() { autoRotate = false; });
    wrap.addEventListener('touchstart', function() { autoRotate = false; });
    document.getElementById('roomNavLeft').addEventListener('click', function() { autoRotate = false; });
    document.getElementById('roomNavRight').addEventListener('click', function() { autoRotate = false; });
    (function spin() {
        if (autoRotate) { rotY += 0.12; updateStage(); }
        requestAnimationFrame(spin);
    })();

    setTimeout(function() {
        var hint = document.getElementById('roomHint');
        if (hint) hint.classList.add('hidden');
    }, 6000);

    updateStage(true);
    console.log('✦ Gallery Room ready (hardcoded paths)');
})();
