/* ══════════════════════════════════════════════════════
   CSS 3D Hexagonal Gallery Room
   - 6 walls, 9 series, photo cycling, zoom modal
   ══════════════════════════════════════════════════════ */
(function() {
    'use strict';

    var wrap = document.getElementById('roomWrap');
    var stage = document.getElementById('roomStage');
    if (!wrap || !stage) { console.warn('Room: elements not found'); return; }

    function p(series, file) { return 'photos' + '/' + series + '/' + file; }

    // ─── Lookup full file lists from GALLERY_DATA (gallery.js) ───
    var seriesMap = {};
    if (typeof GALLERY_DATA !== 'undefined') {
        GALLERY_DATA.forEach(function(s) {
            seriesMap[s.id] = s;
        });
    }

    function getFiles(seriesId) {
        if (seriesMap[seriesId]) return seriesMap[seriesId].files.slice();
        return []; // fallback
    }

    function getSeriesMeta(seriesId) {
        if (seriesMap[seriesId]) {
            return { name: seriesMap[seriesId].name, sub: seriesMap[seriesId].subtitle };
        }
        return { name: seriesId, sub: '' };
    }

    // ─── 6 walls config (angle + series IDs) ───
    var wallConfigs = [
        { angle: '0deg',    ids: ['BNBU'] },
        { angle: '-60deg',  ids: ['汕-AD FUTURE', '汕-JUNGLE'] },
        { angle: '-120deg', ids: ['风过河西'] },
        { angle: '180deg',  ids: ['深圳国际美术馆'] },
        { angle: '120deg',  ids: ['HK印象'] },
        { angle: '60deg',   ids: ['华侨城', '太子湾'] },
    ];

    // ─── Build wall data with full photo lists ───
    var walls = [];
    wallConfigs.forEach(function(cfg) {
        var sections = [];
        cfg.ids.forEach(function(id) {
            var files = getFiles(id);
            var meta = getSeriesMeta(id);
            sections.push({
                id: id,
                name: meta.name,
                sub: meta.sub,
                files: files,
                displayOffset: 0,
            });
        });
        walls.push({
            sections: sections,
            transform: 'rotateY(' + cfg.angle + ') translateZ(-440px)',
        });
    });

    // ─── Active cycle timers & pause state ───
    var cycleTimers = [];
    var cyclePaused = false;

    function pauseCycling() { cyclePaused = true; }
    function resumeCycling() { cyclePaused = false; }

    // ─── Build DOM ───
    var S = 520;
    var allSectionData = []; // flat list: { section, imgElements }

    walls.forEach(function(data) {
        var wall = document.createElement('div');
        wall.className = 'cube-wall';
        wall.style.width = S + 'px';
        wall.style.height = S + 'px';
        wall.style.transform = data.transform;
        wall.dataset.series = data.sections[0].id;

        var surface = document.createElement('div');
        surface.className = 'cube-wall-surface';

        data.sections.forEach(function(sec, si) {
            // ── Rail (title bar) ──
            var rail = document.createElement('div');
            rail.className = 'cube-rail';
            rail.innerHTML =
                '<span class="cube-rail-dot"></span>' +
                '<span class="cube-rail-name">' + sec.name + '</span>' +
                '<span class="cube-rail-sub">' + sec.sub + '</span>' +
                '<span class="cube-rail-dot"></span>';

            // ── Photos row ──
            var row = document.createElement('div');
            row.className = 'cube-photos';
            var imgDivs = [];

            // Always create 3 photo slots
            for (var i = 0; i < 3; i++) {
                var frame = document.createElement('div');
                frame.className = 'cube-photo-frame';
                var img = document.createElement('div');
                img.className = 'cube-photo-img';
                var idx = (sec.displayOffset + i) % Math.max(sec.files.length, 1);
                var src = sec.files.length > 0 ? p(sec.id, sec.files[idx]) : '';
                if (src) img.style.backgroundImage = 'url("' + src + '")';
                frame.appendChild(img);
                row.appendChild(frame);
                imgDivs.push(img);

                frame.addEventListener('click', function(e) {
                    if (wasDragging) return;
                    e.stopPropagation();
                    var bg = this.querySelector('.cube-photo-img').style.backgroundImage;
                    var url = bg.replace(/url\(["']?/, '').replace(/["']?\)$/, '');
                    if (!url) return;
                    if (window.__darkroomOpenByUrl) {
                        window.__darkroomOpenByUrl(url);
                    }
                });

                if (sec.files.length === 0) {
                    frame.classList.add('empty');
                }
            }

            surface.appendChild(rail);
            surface.appendChild(row);

            if (si < data.sections.length - 1) {
                var div = document.createElement('div');
                div.className = 'cube-section-divider';
                surface.appendChild(div);
            }

            allSectionData.push({
                section: sec,
                imgElements: imgDivs,
                wallId: data.sections[0].id,
            });
        });

        wall.appendChild(surface);
        stage.appendChild(wall);

        wall.addEventListener('click', function(e) {
            if (wasDragging) return;
            openZoomModal(data);
        });
    });

    // ═══════════════════════════════════════════════
    //  Photo Cycling (2s interval)
    // ═══════════════════════════════════════════════

    function cycleSection(sd) {
        if (sd.section.files.length <= 3) return; // no cycling needed
        // Pick a random start offset so 3 displayed photos are random each cycle
        sd.section.displayOffset = Math.floor(Math.random() * sd.section.files.length);

        // Crossfade: fade out → swap → fade in
        sd.imgElements.forEach(function(el, i) {
            el.style.opacity = '0';
        });

        setTimeout(function() {
            sd.imgElements.forEach(function(el, i) {
                var idx = (sd.section.displayOffset + i) % sd.section.files.length;
                var src = p(sd.section.id, sd.section.files[idx]);
                el.style.backgroundImage = 'url("' + src + '")';
                el.style.opacity = '1';
            });
        }, 400); // match CSS transition duration
    }

    function startAllCycling() {
        allSectionData.forEach(function(sd) {
            if (sd.section.files.length > 3) {
                var timer = setInterval(function() {
                    if (!cyclePaused) cycleSection(sd);
                }, 4000);
                cycleTimers.push(timer);
            }
        });
    }

    startAllCycling();

    // ═══════════════════════════════════════════════
    //  Zoom Modal
    // ═══════════════════════════════════════════════

    var zoomOverlay = null;
    var zoomPanel = null;
    var zoomGrid = null;
    var zoomTitle = null;
    var zoomSub = null;

    function ensureZoomModal() {
        if (zoomOverlay) return;

        zoomOverlay = document.createElement('div');
        zoomOverlay.className = 'room-zoom-overlay';

        zoomPanel = document.createElement('div');
        zoomPanel.className = 'room-zoom-panel';

        // Close button
        var closeBtn = document.createElement('button');
        closeBtn.className = 'room-zoom-close';
        closeBtn.textContent = '✕';
        closeBtn.addEventListener('click', closeZoomModal);
        zoomPanel.appendChild(closeBtn);

        // Title
        zoomTitle = document.createElement('div');
        zoomTitle.className = 'room-zoom-title';
        zoomPanel.appendChild(zoomTitle);

        // Subtitle
        zoomSub = document.createElement('div');
        zoomSub.className = 'room-zoom-subtitle';
        zoomPanel.appendChild(zoomSub);

        // Photo grid
        zoomGrid = document.createElement('div');
        zoomGrid.className = 'room-zoom-grid';
        zoomPanel.appendChild(zoomGrid);

        zoomOverlay.appendChild(zoomPanel);
        document.body.appendChild(zoomOverlay);

        // Click overlay background to close
        zoomOverlay.addEventListener('click', function(e) {
            if (e.target === zoomOverlay) closeZoomModal();
        });

        // ESC to close
        window.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && zoomOverlay.classList.contains('active')) {
                closeZoomModal();
            }
        });
    }

    function openZoomModal(wallData) {
        ensureZoomModal();

        // Pause cycling while modal is open
        pauseCycling();

        // Collect all photos from all sections on this wall
        var allFiles = [];
        var primaryId = wallData.sections[0].id;
        var primaryName = wallData.sections[0].name;
        var primarySub = wallData.sections[0].sub;

        wallData.sections.forEach(function(sec) {
            sec.files.forEach(function(f) {
                allFiles.push({ id: sec.id, file: f, name: sec.name });
            });
        });

        // Show all photos, randomly shuffled
        var shuffled = allFiles.slice();
        for (var i = shuffled.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = shuffled[i]; shuffled[i] = shuffled[j]; shuffled[j] = tmp;
        }
        var displayFiles = shuffled;

        // Set title
        zoomTitle.textContent = primaryName;
        zoomSub.textContent = primarySub;

        // Build grid
        zoomGrid.innerHTML = '';
        displayFiles.forEach(function(item) {
            var photo = document.createElement('div');
            photo.className = 'room-zoom-photo';
            var src = p(item.id, item.file);
            photo.style.backgroundImage = 'url("' + src + '")';
            photo.title = item.name;

            // Click photo → open lightbox via main.js bridge
            photo.addEventListener('click', function(e) {
                e.stopPropagation();
                if (window.__darkroomOpenByUrl) {
                    window.__darkroomOpenByUrl(src);
                }
            });

            zoomGrid.appendChild(photo);
        });

        // Show overlay with animation
        zoomOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeZoomModal() {
        if (!zoomOverlay) return;
        zoomOverlay.classList.remove('active');
        document.body.style.overflow = '';
        resumeCycling();
    }

    // ═══════════════════════════════════════════════
    //  Drag & Spin (unchanged logic)
    // ═══════════════════════════════════════════════

    var isDragging = false, wasDragging = false;
    var prevX = 0, prevY = 0;
    var rotY = 0, rotX = 0;
    var vY = 0, vX = 0, lX = 0, lY = 0, lT = 0;
    var DRAG_THRESHOLD = 4;

    function getPos(e) {
        var cx = e.clientX || (e.touches && e.touches[0].clientX);
        var cy = e.clientY || (e.touches && e.touches[0].clientY);
        return (cx === undefined || cy === undefined) ? null : { x: cx, y: cy };
    }

    function onDown(e) {
        var p = getPos(e); if (!p) return;
        isDragging = true; wasDragging = false;
        prevX = p.x; prevY = p.y;
        lX = p.x; lY = p.y; lT = Date.now();
        vY = 0; vX = 0; wrap.classList.add('grabbing');
    }

    function onMove(e) {
        if (!isDragging) return;
        var p = getPos(e); if (!p) return;
        var dx = p.x - prevX, dy = p.y - prevY;
        if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) wasDragging = true;
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
        // Reset wasDragging after a tick so click events can read it
        setTimeout(function() { wasDragging = false; }, 0);
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

    var navLeft = document.getElementById('roomNavLeft');
    var navRight = document.getElementById('roomNavRight');
    if (navLeft) navLeft.addEventListener('click', function() { rotY -= 60; updateStage(true); });
    if (navRight) navRight.addEventListener('click', function() { rotY += 60; updateStage(true); });

    function updateStage(smooth) {
        stage.style.transition = smooth ? 'transform 0.5s cubic-bezier(0.22,1,0.36,1)' : 'none';
        stage.style.transform = 'rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
    }

    window.addEventListener('keydown', function(e) {
        // Don't handle room keys when overlays are active
        if (zoomOverlay && zoomOverlay.classList.contains('active')) return;
        var lightbox = document.getElementById('lightbox');
        if (lightbox && lightbox.classList.contains('open')) return;

        // Only respond when room section is visible in viewport
        if (roomSection) {
            var r = roomSection.getBoundingClientRect();
            if (r.bottom < 0 || r.top > window.innerHeight) return;
        }

        if (e.key === 'ArrowLeft')  { rotY -= 45; updateStage(true); }
        if (e.key === 'ArrowRight') { rotY += 45; updateStage(true); }
        if (e.key === 'ArrowUp')    { rotX -= 15; rotX = Math.max(rotX, -60); updateStage(true); }
        if (e.key === 'ArrowDown')  { rotX += 15; rotX = Math.min(rotX, 60); updateStage(true); }

        // Space → pause/resume tour
        if (e.key === ' ' || e.code === 'Space') {
            e.preventDefault();
            if (tourActive) {
                stopTour();
                autoRotate = true;
            } else {
                startTour();
            }
        }
    });

    // ─── Auto-spin ───
    var autoRotate = true;

    function disableAutoSpin() { autoRotate = false; stopTour(); }
    wrap.addEventListener('mousedown', disableAutoSpin);
    wrap.addEventListener('touchstart', disableAutoSpin);
    document.getElementById('roomNavLeft').addEventListener('click', disableAutoSpin);
    document.getElementById('roomNavRight').addEventListener('click', disableAutoSpin);

    /* ═══════════════════════════════════════════════════════
       TOUR MODE — auto-start on scroll, multi-series caption
       ═══════════════════════════════════════════════════════ */

    var tourActive = false;
    var tourIndex = 0;
    var tourTimer = null;

    // Target rotY values to face each wall
    var tourTargets = [0, 60, 120, 180, -120, -60];

    var tourCaption = document.getElementById('tourCaption');
    var tourDots = document.getElementById('tourDots');

    // Build progress dots
    if (tourDots) {
        for (var di = 0; di < tourTargets.length; di++) {
            var dot = document.createElement('span');
            dot.className = 'tour-dot';
            tourDots.appendChild(dot);
        }
    }

    function startTour() {
        if (tourActive) return;
        tourActive = true;
        autoRotate = false;
        tourIndex = -1;
        if (tourDots) tourDots.classList.add('active');
        updateTourDots();
        goToWall(0);
    }

    function stopTour() {
        tourActive = false;
        if (tourTimer) clearTimeout(tourTimer);
        tourTimer = null;
        if (tourDots) tourDots.classList.remove('active');
        if (tourCaption) tourCaption.classList.remove('active');
    }

    function goToWall(index) {
        if (!tourActive) return;
        tourIndex = index;
        var target = tourTargets[index];

        var diff = target - rotY;
        while (diff > 180) diff -= 360;
        while (diff < -180) diff += 360;
        rotY += diff;

        updateStage(true);
        updateTourDots();
        showTourCaption(index);

        if (tourTimer) clearTimeout(tourTimer);
        tourTimer = setTimeout(function() {
            var next = (tourIndex + 1) % tourTargets.length;
            goToWall(next);
        }, 4000);
    }

    function updateTourDots() {
        if (!tourDots) return;
        var dots = tourDots.querySelectorAll('.tour-dot');
        dots.forEach(function(d, i) {
            d.classList.toggle('current', i === tourIndex);
        });
    }

    function showTourCaption(index) {
        if (!tourCaption) return;
        var wallData = walls[index];
        if (!wallData) return;

        var numEl = tourCaption.querySelector('.tour-caption-num');
        var nameEl = tourCaption.querySelector('.tour-caption-name');
        var subEl = tourCaption.querySelector('.tour-caption-sub');

        // Show ALL series on this wall
        var names = [];
        var subs = [];
        wallData.sections.forEach(function(s) {
            names.push(s.name);
            if (s.sub) subs.push(s.sub);
        });

        if (numEl) numEl.textContent = '0' + (index + 1);
        if (nameEl) nameEl.textContent = names.join('  ·  ');
        if (subEl) subEl.textContent = subs.join('  /  ');
        tourCaption.classList.add('active');
        setTimeout(function() { tourCaption.classList.remove('active'); }, 3200);
    }

    /* ═══════════════════════════════════════════════════════
       INTERSECTION OBSERVER — auto-start tour on scroll
       ═══════════════════════════════════════════════════════ */

    var roomSection = document.getElementById('room');
    if (roomSection && 'IntersectionObserver' in window) {
        var observer = new IntersectionObserver(function(entries) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    if (!tourActive) startTour();
                } else {
                    if (tourActive) stopTour();
                    autoRotate = true;
                }
            });
        }, { threshold: 0.4 });

        observer.observe(roomSection);
    } else {
        // Fallback: start tour immediately if no observer support
        setTimeout(function() { if (!tourActive) startTour(); }, 1500);
    }

    /* ═══════════════════════════════════════════════════════
       MAIN LOOP — auto-spin
       ═══════════════════════════════════════════════════════ */

    (function spin() {
        var zoomActive = zoomOverlay && zoomOverlay.classList.contains('active');

        if (autoRotate && !tourActive) {
            if (!zoomActive) { rotY += 0.12; updateStage(); }
        }

        requestAnimationFrame(spin);
    })();

    updateStage(true);
    console.log('✦ Hexagonal Gallery Room — 6 walls, auto-tour on scroll');

    // ─── Floor reflection glow ───
    var reflectionEl = document.getElementById('roomReflection');
    if (reflectionEl) {
        function syncReflection() {
            var brightness = 0.35 + 0.15 * Math.sin(rotY * Math.PI / 180);
            reflectionEl.style.opacity = brightness;
            var hue = 30 + 10 * Math.sin(rotY * Math.PI / 180 + 1);
            reflectionEl.style.background =
                'linear-gradient(to bottom, rgba(' + Math.floor(hue * 2) + ',' + Math.floor(hue) + ',30,0.5) 0%, transparent 100%)';
        }
        var origUpdate = updateStage;
        updateStage = function(smooth) {
            origUpdate(smooth);
            setTimeout(syncReflection, 16);
        };
        syncReflection();
    }
})();
