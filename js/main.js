/* ══════════════════════════════════════════════════════
   Main Application Script
   Navigation, Gallery, Lightbox, Scroll Animations
   ══════════════════════════════════════════════════════ */

(function() {
    'use strict';

    /* ─── DOM refs ─── */
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');
    const galleryGrid = document.getElementById('galleryGrid');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const seriesNav = document.getElementById('seriesNav');
    const seriesNavList = document.getElementById('seriesNavList');
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImage');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const lightboxCounter = document.getElementById('lightboxCounter');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');
    const lightboxContent = document.querySelector('.lightbox-content');
    const lightboxSave = document.getElementById('lightboxSave');
    const swipeHint = document.getElementById('swipeHint');

    let currentFilter = 'all';
    let currentImages = [];
    let currentIndex = 0;

    /* ─── Crosshair Cursor ─── */
    const crosshair = document.getElementById('crosshair');

    if (crosshair) {
        let mX = -999, mY = -999;
        let mouseTicking = false;
        let crosshairHideTimer = null;

        document.addEventListener('mousemove', (e) => {
            mX = e.clientX;
            mY = e.clientY;

            crosshair.classList.add('visible');
            clearTimeout(crosshairHideTimer);
            crosshairHideTimer = setTimeout(() => {
                crosshair.classList.remove('visible');
            }, 2000);

            if (!mouseTicking) {
                requestAnimationFrame(() => {
                    crosshair.style.left = mX + 'px';
                    crosshair.style.top = mY + 'px';
                    mouseTicking = false;
                });
                mouseTicking = true;
            }
        });

        // Click animation
        document.addEventListener('mousedown', () => crosshair.classList.add('click'));
        document.addEventListener('mouseup', () => crosshair.classList.remove('click'));

        // Hide on leave
        document.addEventListener('mouseleave', () => crosshair.classList.remove('visible'));
        document.addEventListener('mouseenter', () => {
            crosshair.classList.add('visible');
            clearTimeout(crosshairHideTimer);
            crosshairHideTimer = setTimeout(() => crosshair.classList.remove('visible'), 2000);
        });
    }

    /* ─── Film Counter ─── */
    const filmCounter = document.getElementById('filmCounter');
    const counterNum = document.getElementById('counterNum');
    const counterTotal = document.getElementById('counterTotal');

    if (filmCounter) {
        const sections = ['about', 'gallery', 'room', 'game', 'contact'];
        const sectionLabels = ['01', '02', '03', '04', '05'];
        counterTotal.textContent = String(sections.length).padStart(2, '0');

        setTimeout(function() { filmCounter.classList.add('visible'); }, 1500);

        let lastNum = '00';
        window.addEventListener('scroll', function() {
            const scrollY = window.pageYOffset + window.innerHeight * 0.35;
            let active = -1; // -1 = hero
            for (let i = 0; i < sections.length; i++) {
                const el = document.getElementById(sections[i]);
                if (el && scrollY >= el.offsetTop) active = i;
            }
            const num = active === -1 ? '00' : sectionLabels[active];
            if (num !== lastNum) {
                // Animate: quick flicker
                counterNum.style.opacity = '0';
                setTimeout(function() {
                    counterNum.textContent = num;
                    counterNum.style.opacity = '1';
                }, 120);
                lastNum = num;
            }
        });
    }

    /* ─── Development Reveal (about-image) ─── */
    (function applyDevReveal() {
        const frame = document.querySelector('.about-image-frame');
        if (frame) {
            addDevOverlay(frame);
        }
    })();

    /* ─── Shutter Animation ─── */
    const shutter = document.getElementById('shutter');
    let shutterTimer = null;

    function playShutter(callback) {
        // Cancel any in-progress shutter
        if (shutterTimer) {
            clearTimeout(shutterTimer);
            shutterTimer = null;
        }
        shutter.classList.remove('release', 'active');

        // Force reflow to restart animation
        void shutter.offsetWidth;
        shutter.classList.add('active');

        // Hold for a moment, then release
        shutterTimer = setTimeout(() => {
            shutter.classList.add('release');
            shutterTimer = setTimeout(() => {
                shutter.classList.remove('active', 'release');
                shutterTimer = null;
                if (callback) callback();
            }, 350);
        }, 250);
    }

    /* ─── Loading Screen ─── */
    function showLoader() {
        const loader = document.createElement('div');
        loader.className = 'loader';
        loader.innerHTML = `
            <div class="loader-text">Loading</div>
            <div class="loader-bar"></div>
        `;
        document.body.appendChild(loader);

        window.addEventListener('load', () => {
            setTimeout(() => loader.classList.add('hidden'), 400);
            setTimeout(() => loader.remove(), 1200);
        });

        // Fallback: hide loader after 3s even if load event already fired
        setTimeout(() => {
            if (!loader.classList.contains('hidden')) {
                loader.classList.add('hidden');
                setTimeout(() => loader.remove(), 800);
            }
        }, 3000);
    }
    showLoader();

    /* ─── Render Gallery ─── */
    function addDevOverlay(parent) {
        const overlay = document.createElement('div');
        overlay.className = 'dev-overlay';
        parent.appendChild(overlay);
        // Trigger when scrolled into view
        const obs = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    overlay.classList.add('visible');
                    obs.unobserve(overlay);
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -60px 0px' });
        requestAnimationFrame(() => obs.observe(overlay));
    }

    function renderGallery(photoList) {
        galleryGrid.innerHTML = '';
        photoList.forEach((photo, index) => {
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.dataset.index = index;
            item.dataset.series = photo.series;


            const img = document.createElement('img');
            img.src = photo.src;
            img.alt = photo.seriesName;
            img.loading = 'lazy';
            img.addEventListener('load', function() { this.classList.add('loaded'); });
            if (img.complete) img.classList.add('loaded');
            item.appendChild(img);

            addDevOverlay(item);

            const label = document.createElement('div');
            label.className = 'gallery-item-overlay';
            label.innerHTML = `<span class="gallery-item-label">${photo.seriesName}</span>`;
            item.appendChild(label);

            item.addEventListener('click', () => openLightbox(index, photoList));
            galleryGrid.appendChild(item);
        });
    }

    /* ─── Grouped Gallery ─── */
    function renderGroupedGallery(photoList, showCount) {
        galleryGrid.innerHTML = '';
        galleryGrid.classList.add('grouped');
        currentImages = photoList;

        // Group photos by series (preserving GALLERY_DATA order)
        const seriesOrder = GALLERY_DATA.map(s => s.id);
        const grouped = {};
        seriesOrder.forEach(id => { grouped[id] = []; });
        photoList.forEach(photo => {
            if (grouped[photo.series]) grouped[photo.series].push(photo);
        });

        seriesOrder.forEach(seriesKey => {
            const photos = grouped[seriesKey];
            if (!photos || !photos.length) return;
            const seriesInfo = GALLERY_DATA.find(s => s.id === seriesKey);
            const limit = showCount || 3;
            const hasMore = photos.length > limit;

            // Group container
            const groupEl = document.createElement('div');
            groupEl.className = 'gallery-group';
            groupEl.id = 'group-' + seriesKey;

            // Header (with built-in toggle)
            var header = document.createElement('div');
            header.className = 'gallery-group-header';
            header.innerHTML = '<span class="gallery-group-name">' + seriesInfo.name + '</span><span class="gallery-group-sub">' + seriesInfo.subtitle + '</span>';

            if (hasMore) {
                var toggle = document.createElement('button');
                toggle.className = 'gallery-group-toggle';
                toggle.innerHTML = '<span class="toggle-arrow">▼</span> 展开 (' + photos.length + '张)';
                header.appendChild(toggle);
            }
            groupEl.appendChild(header);

            // Grid for this series
            var grid = document.createElement('div');
            grid.className = 'gallery-group-grid';

            photos.forEach(function(photo, idx) {
                var item = document.createElement('div');
                item.className = 'gallery-item';
                if (idx >= limit) item.classList.add('collapsed');
                var img = document.createElement('img');
                img.src = photo.src;
                img.alt = photo.seriesName;
                img.loading = 'lazy';
                img.addEventListener('load', function() { this.classList.add('loaded'); });
                if (img.complete) img.classList.add('loaded');
                item.appendChild(img);
                addDevOverlay(item);

                var label = document.createElement('div');
                label.className = 'gallery-item-overlay';
                label.innerHTML = '<span class="gallery-item-label">' + photo.seriesName + '</span>';
                item.appendChild(label);

                var photoIdx = photoList.indexOf(photo);
                item.addEventListener('click', function() { openLightbox(photoIdx, photoList); });
                grid.appendChild(item);
            });

            groupEl.appendChild(grid);

            // Toggle logic
            if (hasMore) {
                toggle.addEventListener('click', function() {
                    var collapsed = grid.querySelectorAll('.gallery-item.collapsed');
                    if (collapsed.length > 0) {
                        collapsed.forEach(function(el) { el.classList.remove('collapsed'); });
                        toggle.innerHTML = '<span class="toggle-arrow">▲</span> 收起';
                    } else {
                        var items = grid.querySelectorAll('.gallery-item');
                        items.forEach(function(el, idx) {
                            if (idx >= limit) el.classList.add('collapsed');
                        });
                        toggle.innerHTML = '<span class="toggle-arrow">▼</span> 展开 (' + photos.length + '张)';
                        header.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
            }

            galleryGrid.appendChild(groupEl);
        });
    }

    // Initial render (grouped for "all")
    renderGroupedGallery(allPhotos);
    // Delay nav build slightly to ensure DOM layout is complete
    setTimeout(function() {
        buildSeriesNav();
    }, 100);

    /* ─── Filter ─── */
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const filter = btn.dataset.filter;
            currentFilter = filter;

            if (filter === 'all') {
                renderGroupedGallery(allPhotos);
            } else {
                galleryGrid.classList.remove('grouped');
                const filtered = allPhotos.filter(p => p.series === filter);
                renderGroupedGallery(filtered, 6);
            }
            buildSeriesNav();
        });
    });

    /* ─── Sort Toggle ─── */
    let sortRandom = false;
    const originalOrder = allPhotos.slice();
    const sortBtn = document.getElementById('sortToggle');

    function shuffle(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const t = a[i]; a[i] = a[j]; a[j] = t;
        }
        return a;
    }

    if (sortBtn) {
        sortBtn.addEventListener('click', function() {
            sortBtn.classList.add('clicked');
            setTimeout(function() { sortBtn.classList.remove('clicked'); }, 500);
            sortRandom = !sortRandom;
            if (sortRandom) {
                allPhotos = shuffle(originalOrder);
                sortBtn.innerHTML = '随机';
            } else {
                allPhotos = originalOrder.slice();
                sortBtn.innerHTML = '时间序';
            }
            if (currentFilter === 'all') {
                renderGroupedGallery(allPhotos);
            } else {
                const filtered = allPhotos.filter(function(p) { return p.series === currentFilter; });
                renderGroupedGallery(filtered, 6);
            }
            buildSeriesNav();
        });
    }

    /* ─── Floating Series Nav ─── */
    var seriesNavDots = [];

    function buildSeriesNav() {
        if (!seriesNavList) return;
        seriesNavList.innerHTML = '';
        seriesNavDots = [];

        GALLERY_DATA.forEach(function(series, idx) {
            var li = document.createElement('li');
            li.className = 'series-nav-dot';
            li.title = series.name;
            li.setAttribute('data-series-id', series.id);
            li.addEventListener('click', function() {
                var target = document.getElementById('group-' + series.id);
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            seriesNavList.appendChild(li);
            seriesNavDots.push(li);
        });

        updateActiveDot();
    }

    function updateActiveDot() {
        var dots = document.querySelectorAll('.series-nav-dot');
        if (!dots.length) return;
        var groups = document.querySelectorAll('.gallery-group');
        if (!groups.length) return;

        // Find which group is currently at/above the detection line
        var activeId = null;
        var line = 90; // px from viewport top

        for (var i = 0; i < groups.length; i++) {
            var rect = groups[i].getBoundingClientRect();
            if (rect.top <= line) {
                // This group has reached or passed the detection line
                activeId = groups[i].id.replace('group-', '');
            }
        }

        // If no group has reached the line yet, use the first one
        if (!activeId) {
            activeId = groups[0].id.replace('group-', '');
        }

        dots.forEach(function(d) {
            var match = d.getAttribute('data-series-id') === activeId;
            d.classList.toggle('active', match);
        });
    }

    // ── Scroll-based: show nav + update dot ──
    var gallerySection = document.getElementById('gallery');
    window.addEventListener('scroll', function() {
        // Show/hide nav based on gallery visibility
        if (gallerySection && seriesNav) {
            var rect = gallerySection.getBoundingClientRect();
            var inGallery = rect.top < window.innerHeight && rect.bottom > 0;
            seriesNav.classList.toggle('visible', inGallery);
        }
        // Update active dot
        updateActiveDot();
    }, { passive: true });

    /* ─── Keyboard: series navigation ─── */
    document.addEventListener('keydown', function(e) {
        if (lightbox.classList.contains('open')) return; // lightbox handles its own keys
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            var headers = document.querySelectorAll('.gallery-group-header');
            if (!headers.length) return;
            // Find which header is closest to viewport center
            var current = 0;
            var viewMid = window.scrollY + window.innerHeight / 2;
            for (var i = 0; i < headers.length; i++) {
                if (headers[i].getBoundingClientRect().top + window.scrollY < viewMid) {
                    current = i;
                }
            }
            var next = e.key === 'ArrowDown' ? Math.min(current + 1, headers.length - 1) : Math.max(current - 1, 0);
            headers[next].scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });

    /* ─── Lightbox ─── */
    function openLightbox(index, photos) {
        currentImages = photos;
        currentIndex = index;
        showLightboxImage();
        resetZoom();

        // Play shutter animation, then open lightbox
        playShutter(() => {
            lightbox.classList.add('open');
            document.body.style.overflow = 'hidden';
            initLightboxTouch();
            showSwipeHint();
        });
    }

    function showLightboxImage() {
        const photo = currentImages[currentIndex];

        // Start loading state
        lightboxImg.classList.remove('loaded');

        lightboxImg.src = photo.src;
        lightboxImg.alt = photo.seriesName;

        // Blur-up: add loaded class when image is ready
        if (lightboxImg.complete) {
            lightboxImg.classList.add('loaded');
        } else {
            lightboxImg.addEventListener('load', function onLbLoad() {
                lightboxImg.classList.add('loaded');
                lightboxImg.removeEventListener('load', onLbLoad);
            }, { once: true });
        }

        // Reset zoom/pan when changing image
        resetZoom();

        // Reset inline styles
        lightboxImg.removeAttribute('style');

        // Apply per-photo lightbox overrides
        if (photo.lightboxStyle) {
            const s = photo.lightboxStyle;
            Object.keys(s).forEach(function(k) {
                lightboxImg.style.setProperty(k, s[k], 'important');
            });
        }

        lightboxCaption.textContent = `${photo.seriesName} · ${photo.subtitle}`;
        lightboxCounter.textContent = `${currentIndex + 1} / ${currentImages.length}`;
    }

    function closeLightbox() {
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
        cleanupLightboxTouch();
        resetZoom();
    }

    function transitionImage(newIndex) {
        if (newIndex === currentIndex) return;
        currentIndex = newIndex;

        // Fade out, swap, fade in
        lightboxImg.classList.add('transitioning');
        setTimeout(() => {
            showLightboxImage();
            // Force reflow, then fade in
            void lightboxImg.offsetWidth;
            lightboxImg.classList.remove('transitioning');
        }, 200);
    }

    function prevImage() {
        const newIndex = (currentIndex - 1 + currentImages.length) % currentImages.length;
        transitionImage(newIndex);
    }

    function nextImage() {
        const newIndex = (currentIndex + 1) % currentImages.length;
        transitionImage(newIndex);
    }

    // Lightbox events
    lightboxClose.addEventListener('click', closeLightbox);
    lightboxPrev.addEventListener('click', prevImage);
    lightboxNext.addEventListener('click', nextImage);

    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('open')) return;
        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') prevImage();
        if (e.key === 'ArrowRight') nextImage();
    });

    /* ─── Navbar scroll effect ─── */
    window.addEventListener('scroll', () => {
        if (window.scrollY > 80) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    /* ─── Mobile nav toggle ─── */
    navToggle.addEventListener('click', () => {
        navLinks.classList.toggle('open');
    });

    // Close nav on link click (mobile)
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('open');
        });
    });

    /* ─── Smooth scroll for nav links ─── */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const offset = 64;
                const targetPos = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top: targetPos, behavior: 'smooth' });
            }
        });
    });

    /* ─── Scroll-triggered fade-in ─── */
    const fadeElements = document.querySelectorAll('.fade-in');

    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -40px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    fadeElements.forEach(el => observer.observe(el));

    /* ─── Parallax hero effect ─── */
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.hero-content');
        if (hero && scrolled < window.innerHeight) {
            hero.style.transform = `translateY(${scrolled * 0.15}px)`;
            hero.style.opacity = 1 - (scrolled / (window.innerHeight * 0.8));
        }
    });

    /* ─── Contact links ─── */
    const emailLink = document.getElementById('emailLink');
    if (emailLink) {
        emailLink.addEventListener('click', (e) => {
            e.preventDefault();
            const textEl = emailLink.querySelector('.link-text');
            if (textEl.dataset.expanded) {
                textEl.textContent = 'Email';
                delete textEl.dataset.expanded;
            } else {
                textEl.textContent = '1310824646@qq.com\nweizijie693@gmail.com';
                textEl.style.whiteSpace = 'pre-line';
                textEl.dataset.expanded = 'true';
            }
        });
    }

    const xiaohongshuLink = document.getElementById('xiaohongshuLink');
    if (xiaohongshuLink) {
        xiaohongshuLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.open('https://xhslink.com/m/2tJluZ1bOG2', '_blank');
        });
    }

    /* ─── 游戏关卡说明展开/收起 ─── */
    const levelsToggle = document.getElementById('gameLevelsToggle');
    const levelsPanel = document.getElementById('gameLevelsPanel');
    if (levelsToggle && levelsPanel) {
        levelsToggle.addEventListener('click', () => {
            const isOpen = levelsPanel.classList.toggle('open');
            levelsToggle.classList.toggle('open');
            levelsToggle.innerHTML = isOpen
                ? '<span class="toggle-icon">📖</span> 收起关卡说明 <span class="toggle-arrow-down">▲</span>'
                : '<span class="toggle-icon">📖</span> 查看关卡设计 <span class="toggle-arrow-down">▼</span>';
        });
    }

    /* ─── Mouse Trail ─── */
    const trailContainer = document.getElementById('mouseTrail');
    const trailDots = [];
    const TRAIL_LEN = 12;
    const TRAIL_INTERVAL = 60; // ms between dots

    if (trailContainer) {
        for (let i = 0; i < TRAIL_LEN; i++) {
            const dot = document.createElement('div');
            dot.className = 'trail-dot';
            trailContainer.appendChild(dot);
            trailDots.push({ el: dot, x: -100, y: -100, age: 99 });
        }

        let trailTimer = 0;
        let dotIndex = 0;

        document.addEventListener('mousemove', (e) => {
            const now = Date.now();
            if (now - trailTimer < TRAIL_INTERVAL) return;
            trailTimer = now;

            const dot = trailDots[dotIndex % TRAIL_LEN];
            dotIndex++;
            dot.x = e.clientX;
            dot.y = e.clientY;
            dot.age = 0;

            dot.el.style.left = dot.x + 'px';
            dot.el.style.top = dot.y + 'px';
            dot.el.style.opacity = '0.3';
            dot.el.style.transform = 'scale(1)';
            dot.el.style.transition = 'none';
            // Force reflow
            void dot.el.offsetWidth;
            dot.el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        });

        // Fade out trail dots
        function updateTrail() {
            for (const d of trailDots) {
                if (d.age < TRAIL_LEN) {
                    d.age++;
                    const a = Math.max(0, 0.3 * (1 - d.age / TRAIL_LEN));
                    d.el.style.opacity = a;
                    d.el.style.transform = 'scale(' + (1 - d.age / TRAIL_LEN * 0.5) + ')';
                }
            }
            requestAnimationFrame(updateTrail);
        }
        updateTrail();
    }

    /* ─── Film Strip Scroll Progress ─── */
    const filmProgress = document.getElementById('filmProgress');
    const filmFill = document.getElementById('filmProgressFill');
    if (filmProgress && filmFill) {
        setTimeout(() => filmProgress.classList.add('visible'), 1500);

        window.addEventListener('scroll', () => {
            const scrollTop = window.pageYOffset;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            filmFill.style.width = progress + '%';
        });
    }

    /* ─── 3D Room Reflection Sync ─── */
    const roomWrap = document.getElementById('roomWrap');
    const roomReflection = document.getElementById('roomReflection');
    if (roomWrap && roomReflection) {
        const ro = new ResizeObserver(() => {
            roomReflection.style.width = roomWrap.offsetWidth + 'px';
        });
        ro.observe(roomWrap);
        roomReflection.style.width = roomWrap.offsetWidth + 'px';
    }

    console.log('✦ 暗房工作室 · DARKROOM STUDIO ✦');
    console.log('以镜头为笔 · 在光影间寻找故事的底色');

    /* ─── Dynamic stats (footer + about) ─── */
    if (typeof GALLERY_DATA !== 'undefined') {
        var totalPhotos = 0;
        GALLERY_DATA.forEach(function(s) { totalPhotos += s.files.length; });
        var seriesCount = GALLERY_DATA.length;

        // Footer
        var statsEl = document.getElementById('footerStats');
        if (statsEl) statsEl.textContent = seriesCount + ' 个系列 · ' + totalPhotos + ' 张照片';

        // About credits
        var creditPhotos = document.getElementById('creditPhotos');
        var creditSeries = document.getElementById('creditSeries');
        if (creditPhotos) creditPhotos.textContent = totalPhotos;
        if (creditSeries) creditSeries.textContent = seriesCount;
    }

    /* ─── Back to top ─── */
    var backBtn = document.getElementById('backToTop');
    if (backBtn) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > window.innerHeight) {
                backBtn.classList.add('visible');
            } else {
                backBtn.classList.remove('visible');
            }
        });
        backBtn.addEventListener('click', function() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    /* ─── Toast ─── */
    function showToast(msg) {
        var t = document.getElementById('toast');
        if (!t) return;
        t.textContent = msg;
        t.classList.add('show');
        clearTimeout(t._timer);
        t._timer = setTimeout(function() { t.classList.remove('show'); }, 3000);
    }

    /* ─── Newsletter ─── */
    // Form submits directly to Buttondown (no JS needed for submission)
    // Toast shown on page load if user was redirected back from Buttondown
    if (window.location.search.indexOf('subscribed=true') > -1) {
        showToast('✓ 订阅成功！欢迎加入。');
        var url = new URL(window.location);
        url.searchParams.delete('subscribed');
        window.history.replaceState({}, '', url);
    }

    /* ═══════════════════════════════════════════════════════
       GLOBAL KEYBOARD SHORTCUTS
       ═══════════════════════════════════════════════════════ */

    var kbdHelp = document.getElementById('kbdHelp');
    var helpOpen = false;

    var sectionIds = ['hero', 'about', 'gallery', 'room', 'game', 'contact'];
    // keys 0-5 → sections

    function scrollToSection(id) {
        var el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function toggleHelp() {
        helpOpen = !helpOpen;
        if (helpOpen && kbdHelp) {
            kbdHelp.classList.add('active');
        } else if (kbdHelp) {
            kbdHelp.classList.remove('active');
        }
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(function(){});
        } else {
            document.exitFullscreen();
        }
    }

    document.addEventListener('keydown', function(e) {
        // Ignore when typing in inputs
        var tag = document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

        var key = e.key;

        // ? — toggle help
        if (key === '?') {
            e.preventDefault();
            toggleHelp();
            return;
        }

        // Esc — close help first, then delegate to lightbox/zoom handlers
        if (key === 'Escape') {
            if (helpOpen) {
                e.preventDefault();
                toggleHelp();
                return;
            }
            // Otherwise let existing lightbox/zoom Escape handlers run
            return;
        }

        // Don't fire shortcuts when help is open (except Esc)
        if (helpOpen) return;

        // Number keys 0-5 → jump sections
        if (key >= '0' && key <= '5') {
            e.preventDefault();
            var idx = parseInt(key);
            if (idx < sectionIds.length) scrollToSection(sectionIds[idx]);
            return;
        }

        // F — fullscreen
        if (key === 'f' || key === 'F') {
            e.preventDefault();
            toggleFullscreen();
            return;
        }
    });

    // Click help overlay background to close
    if (kbdHelp) {
        kbdHelp.addEventListener('click', function(e) {
            if (e.target === kbdHelp) toggleHelp();
        });
    }

    console.log('⌨ 快捷键就绪 — ? 查看全部');

    /* ═══════════════════════════════════════════════════════
       TOUCH GESTURE MODULE
       Swipe, Pinch Zoom, Long Press Save, Double Tap
       ═══════════════════════════════════════════════════════ */

    var touchState = {
        startX: 0, startY: 0,
        deltaX: 0, deltaY: 0,
        isDragging: false,
        isSwiping: false,
        scale: 1,
        panX: 0, panY: 0,
        pinching: false,
        initialPinchDist: 0,
        initialScale: 1,
        initialPanX: 0, initialPanY: 0,
        pinchCenterX: 0, pinchCenterY: 0,
        lastTapTime: 0,
        lastTapX: 0, lastTapY: 0,
        swipeHintShown: false,
        touches: 0
    };

    function resetZoom() {
        touchState.scale = 1;
        touchState.panX = 0;
        touchState.panY = 0;
        lightboxImg.style.transform = '';
        lightboxImg.classList.remove('zoomed', 'swiping', 'snapping');
        if (lightboxContent) lightboxContent.classList.remove('panning');
    }

    function showSwipeHint() {
        if (!swipeHint) return;
        if (touchState.swipeHintShown) return;
        // Only show on touch-capable devices
        if (!('ontouchstart' in window) && !navigator.maxTouchPoints) return;
        touchState.swipeHintShown = true;
        swipeHint.classList.add('visible');
        clearTimeout(swipeHint._timer);
        swipeHint._timer = setTimeout(function() {
            swipeHint.classList.remove('visible');
        }, 3500);
    }

    function getTouchPos(e) {
        if (e.touches && e.touches.length > 0) {
            return { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }
        if (e.changedTouches && e.changedTouches.length > 0) {
            return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
        }
        return { x: e.clientX, y: e.clientY };
    }

    function getPinchDistance(e) {
        if (!e.touches || e.touches.length < 2) return 0;
        var dx = e.touches[0].clientX - e.touches[1].clientX;
        var dy = e.touches[0].clientY - e.touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    function getPinchCenter(e) {
        if (!e.touches || e.touches.length < 2) return { x: 0, y: 0 };
        return {
            x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
            y: (e.touches[0].clientY + e.touches[1].clientY) / 2
        };
    }

    function applyImageTransform() {
        var t = '';
        if (touchState.scale !== 1) {
            t = 'scale(' + touchState.scale + ')';
        }
        if (touchState.isSwiping && touchState.scale === 1) {
            // During swipe at 1x, only translate horizontally
            t = 'translateX(' + (touchState.deltaX * 0.6) + 'px)';
        }
        if (touchState.scale > 1 && touchState.isDragging && !touchState.pinching) {
            // Panning when zoomed
            t = 'scale(' + touchState.scale + ') translate(' + (touchState.panX / touchState.scale) + 'px, ' + (touchState.panY / touchState.scale) + 'px)';
        }
        lightboxImg.style.transform = t;
    }

    /* ─── Touch Handlers ─── */

    function onLightboxTouchStart(e) {
        if (!lightbox.classList.contains('open')) return;
        touchState.touches = e.touches.length;

        if (e.touches.length === 2) {
            // Pinch start
            touchState.pinching = true;
            touchState.isSwiping = false;
            touchState.isDragging = false;
            touchState.initialPinchDist = getPinchDistance(e);
            touchState.initialScale = touchState.scale;
            touchState.initialPanX = touchState.panX;
            touchState.initialPanY = touchState.panY;
            var center = getPinchCenter(e);
            touchState.pinchCenterX = center.x;
            touchState.pinchCenterY = center.y;
            lightboxImg.classList.remove('snapping');
            lightboxImg.classList.add('zoomed');
        } else if (e.touches.length === 1 && !touchState.pinching) {
            // Swipe or drag start
            var pos = getTouchPos(e);
            touchState.startX = pos.x;
            touchState.startY = pos.y;
            touchState.deltaX = 0;
            touchState.deltaY = 0;
            touchState.isDragging = true;
            touchState.isSwiping = false;
            lightboxImg.classList.remove('snapping', 'swiping');

            // Check for double tap
            var now = Date.now();
            if (now - touchState.lastTapTime < 300 &&
                Math.abs(pos.x - touchState.lastTapX) < 30 &&
                Math.abs(pos.y - touchState.lastTapY) < 30) {
                // Double tap detected
                toggleZoom(pos.x, pos.y);
                touchState.lastTapTime = 0;
                touchState.isDragging = false;
                return;
            }
            touchState.lastTapTime = now;
            touchState.lastTapX = pos.x;
            touchState.lastTapY = pos.y;
        }
    }

    function onLightboxTouchMove(e) {
        if (!lightbox.classList.contains('open')) return;
        if (!touchState.isDragging && !touchState.pinching) return;

        if (e.touches.length === 2 && touchState.pinching) {
            // Pinch zoom
            var dist = getPinchDistance(e);
            if (dist < 30) return;
            var newScale = touchState.initialScale * (dist / touchState.initialPinchDist);
            newScale = Math.max(1, Math.min(3, newScale));
            touchState.scale = newScale;

            // Adjust pan during pinch
            var center = getPinchCenter(e);
            var dx = center.x - touchState.pinchCenterX;
            var dy = center.y - touchState.pinchCenterY;
            touchState.panX = touchState.initialPanX + dx * 0.5;
            touchState.panY = touchState.initialPanY + dy * 0.5;

            applyImageTransform();
            e.preventDefault();
        } else if (e.touches.length === 1 && !touchState.pinching && touchState.isDragging) {
            var pos = getTouchPos(e);
            var dx = pos.x - touchState.startX;
            var dy = pos.y - touchState.startY;
            touchState.deltaX = dx;
            touchState.deltaY = dy;

            if (touchState.scale > 1) {
                // Panning when zoomed
                touchState.panX = touchState.initialPanX + dx;
                touchState.panY = touchState.initialPanY + dy;
                applyImageTransform();
                e.preventDefault();
            } else if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) {
                // Horizontal swipe at 1x
                touchState.isSwiping = true;
                applyImageTransform();
                e.preventDefault();
            }
            // If vertical dominant, let page scroll naturally
        }
    }

    function onLightboxTouchEnd(e) {
        if (!lightbox.classList.contains('open')) return;

        if (touchState.pinching && e.touches.length < 2) {
            // Pinch ended
            touchState.pinching = false;
            if (touchState.scale < 1.15) {
                animateZoomTo(1);
            } else {
                // Snap to nearest 0.5
                var snap = Math.round(touchState.scale * 2) / 2;
                snap = Math.max(1, Math.min(3, snap));
                animateZoomTo(snap);
            }
        }

        if (touchState.isSwiping && touchState.scale === 1) {
            // Swipe ended — check threshold
            lightboxImg.classList.add('snapping');
            if (touchState.deltaX > 80) {
                prevImage();
            } else if (touchState.deltaX < -80) {
                nextImage();
            } else {
                // Snap back
                lightboxImg.style.transform = 'translateX(0)';
                setTimeout(function() {
                    lightboxImg.style.transform = '';
                    lightboxImg.classList.remove('snapping');
                }, 300);
            }
        }

        if (touchState.isDragging && !touchState.isSwiping && !touchState.pinching && touchState.scale > 1) {
            // Clamp pan when zoomed
            clampPan();
        }

        touchState.isDragging = false;
        touchState.isSwiping = false;
        touchState.deltaX = 0;
        touchState.deltaY = 0;
        touchState.touches = e.touches.length;

        if (touchState.scale <= 1) {
            lightboxImg.classList.remove('zoomed');
            if (lightboxContent) lightboxContent.classList.remove('panning');
        }
    }

    /* ─── Mouse Drag Support (Desktop) ─── */

    var mouseDown = false;
    var mouseStartX = 0, mouseStartY = 0;
    var mouseDragged = false;

    function onLightboxMouseDown(e) {
        if (!lightbox.classList.contains('open')) return;
        if (e.target === lightboxClose || e.target === lightboxPrev ||
            e.target === lightboxNext ||
            e.target === lightboxSave ||
            e.target.closest('.lightbox-save')) return;
        if (e.button !== 0) return; // Left click only

        mouseDown = true;
        mouseDragged = false;
        mouseStartX = e.clientX;
        mouseStartY = e.clientY;
        touchState.initialPanX = touchState.panX;
        touchState.initialPanY = touchState.panY;
        lightboxImg.classList.remove('snapping');
    }

    function onLightboxMouseMove(e) {
        if (!mouseDown) return;
        var dx = e.clientX - mouseStartX;
        var dy = e.clientY - mouseStartY;

        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            mouseDragged = true;
        }

        if (touchState.scale > 1) {
            // Pan when zoomed
            touchState.panX = touchState.initialPanX + dx;
            touchState.panY = touchState.initialPanY + dy;
            applyImageTransform();
            e.preventDefault();
        } else if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) {
            // Horizontal swipe at 1x
            touchState.isSwiping = true;
            touchState.deltaX = dx;
            touchState.deltaY = dy;
            applyImageTransform();
            e.preventDefault();
        }
    }

    function onLightboxMouseUp(e) {
        if (!mouseDown) return;
        mouseDown = false;

        if (touchState.isSwiping && touchState.scale === 1) {
            lightboxImg.classList.add('snapping');
            if (Math.abs(touchState.deltaX) > 80) {
                if (touchState.deltaX > 80) prevImage();
                else nextImage();
            } else {
                lightboxImg.style.transform = 'translateX(0)';
                setTimeout(function() {
                    lightboxImg.style.transform = '';
                    lightboxImg.classList.remove('snapping');
                }, 300);
            }
        }

        if (touchState.scale > 1) {
            clampPan();
        }

        touchState.isDragging = false;
        touchState.isSwiping = false;
        touchState.deltaX = 0;
        touchState.deltaY = 0;
        touchState.initialPanX = touchState.panX;
        touchState.initialPanY = touchState.panY;
    }

    /* ─── Zoom Helpers ─── */

    function toggleZoom(cx, cy) {
        if (touchState.scale > 1.1) {
            animateZoomTo(1);
        } else {
            touchState.pinchCenterX = cx;
            touchState.pinchCenterY = cy;
            animateZoomTo(2);
        }
    }

    function animateZoomTo(targetScale) {
        var startScale = touchState.scale;
        var startPanX = touchState.panX;
        var startPanY = touchState.panY;
        var startTime = performance.now();
        var duration = 250;

        function step(now) {
            var elapsed = now - startTime;
            var progress = Math.min(1, elapsed / duration);
            // Ease out cubic
            var eased = 1 - Math.pow(1 - progress, 3);

            touchState.scale = startScale + (targetScale - startScale) * eased;
            touchState.panX = startPanX * (1 - eased);
            touchState.panY = startPanY * (1 - eased);

            applyImageTransform();

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                touchState.scale = targetScale;
                touchState.panX = 0;
                touchState.panY = 0;
                touchState.initialPanX = 0;
                touchState.initialPanY = 0;
                applyImageTransform();
                clampPan();
                if (targetScale <= 1) {
                    lightboxImg.classList.remove('zoomed');
                    if (lightboxContent) lightboxContent.classList.remove('panning');
                    lightboxImg.style.transform = '';
                    touchState.scale = 1;
                } else {
                    lightboxImg.classList.add('zoomed');
                    if (lightboxContent) lightboxContent.classList.add('panning');
                }
            }
        }

        requestAnimationFrame(step);
    }

    function clampPan() {
        if (touchState.scale <= 1) {
            touchState.panX = 0;
            touchState.panY = 0;
            applyImageTransform();
            return;
        }
        // Allow reasonable pan range
        var maxPan = (touchState.scale - 1) * 200;
        touchState.panX = Math.max(-maxPan, Math.min(maxPan, touchState.panX));
        touchState.panY = Math.max(-maxPan, Math.min(maxPan, touchState.panY));
        applyImageTransform();
    }

    /* ─── Card Share & Save ─── */

    function shareOrSaveCard() {
        var photo = currentImages[currentIndex];
        if (!photo) { showToast('请先打开一张照片'); return; }

        showToast('正在生成卡片...');

        var canvas = document.createElement('canvas');
        generateShareCard(photo, canvas, function() {
            // Try to get the image as blob or data URL
            var imageUrl = null;
            var gotImage = false;

            // Attempt 1: toBlob (works on same-origin HTTP)
            try {
                canvas.toBlob(function(blob) {
                    if (blob && !gotImage) {
                        imageUrl = URL.createObjectURL(blob);
                        gotImage = true;
                        doShare(imageUrl);
                    }
                }, 'image/jpeg', 0.92);
            } catch (e) {
                console.warn('Card: toBlob failed', e);
            }

            // Attempt 2: toDataURL (works almost always, fallback)
            setTimeout(function() {
                if (!gotImage) {
                    try {
                        imageUrl = canvas.toDataURL('image/jpeg', 0.92);
                        gotImage = true;
                        doShare(imageUrl);
                    } catch (e2) {
                        console.warn('Card: toDataURL also failed', e2);
                        showToast('卡片生成失败，请刷新后重试');
                    }
                }
            }, 400);
        });
    }

    function doShare(imageUrl) {
        if (!imageUrl) { showToast('卡片生成失败'); return; }

        // Prefer native sharing on mobile
        if (navigator.share && navigator.canShare) {
            // Convert blob URL to a File for sharing
            fetch(imageUrl)
                .then(function(res) { return res.blob(); })
                .then(function(blob) {
                    var file = new File([blob], '暗房工作室_卡片.jpg', { type: 'image/jpeg' });
                    var shareData = {
                        title: '暗房工作室 · 摄影作品',
                        text: '来自暗房工作室的摄影作品',
                        files: [file]
                    };
                    if (navigator.canShare(shareData)) {
                        navigator.share(shareData).catch(function() {
                            // User cancelled or share failed → download
                            triggerDownload(imageUrl, '暗房工作室_卡片.jpg');
                        });
                    } else {
                        // Can't share files → just download
                        triggerDownload(imageUrl, '暗房工作室_卡片.jpg');
                    }
                })
                .catch(function() {
                    // Fetch failed (e.g. data URL) → download
                    triggerDownload(imageUrl, '暗房工作室_卡片.jpg');
                });

            // Clean up blob URL after a delay
            if (imageUrl.indexOf('blob:') === 0) {
                setTimeout(function() { URL.revokeObjectURL(imageUrl); }, 30000);
            }
        } else {
            // Desktop: download directly
            triggerDownload(imageUrl, '暗房工作室_卡片.jpg');
        }
    }

    function triggerDownload(url, filename) {
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('✓ 卡片已保存');

        // Clean up blob URL
        if (url.indexOf('blob:') === 0) {
            setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
        }
    }

    /* ─── Bind / Unbind ─── */

    function initLightboxTouch() {
        if (!lightbox) return;
        lightbox.addEventListener('touchstart', onLightboxTouchStart, { passive: false });
        lightbox.addEventListener('touchmove', onLightboxTouchMove, { passive: false });
        lightbox.addEventListener('touchend', onLightboxTouchEnd);
        lightbox.addEventListener('touchcancel', onLightboxTouchEnd);

        // Mouse drag for desktop
        lightbox.addEventListener('mousedown', onLightboxMouseDown);
        window.addEventListener('mousemove', onLightboxMouseMove);
        window.addEventListener('mouseup', onLightboxMouseUp);
    }

    function cleanupLightboxTouch() {
        if (!lightbox) return;
        lightbox.removeEventListener('touchstart', onLightboxTouchStart);
        lightbox.removeEventListener('touchmove', onLightboxTouchMove);
        lightbox.removeEventListener('touchend', onLightboxTouchEnd);
        lightbox.removeEventListener('touchcancel', onLightboxTouchEnd);

        lightbox.removeEventListener('mousedown', onLightboxMouseDown);
        window.removeEventListener('mousemove', onLightboxMouseMove);
        window.removeEventListener('mouseup', onLightboxMouseUp);

        touchState.isDragging = false;
        touchState.isSwiping = false;
        touchState.pinching = false;
        mouseDown = false;
    }

    /* ═══════════════════════════════════════════════════════
       CARD GENERATION
       Canvas card rendering for save
       ═══════════════════════════════════════════════════════ */

    function generateShareCard(photo, canvas, callback) {
        if (!canvas || !photo) return;

        var W = 800;
        var H = 1000;
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = W * dpr;
        canvas.height = H * dpr;

        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        // ── Background ──
        ctx.fillStyle = '#0a0a0a';
        ctx.fillRect(0, 0, W, H);

        // ── Film sprocket holes (decorative border) ──
        ctx.fillStyle = '#1a1a1a';
        var holeSize = 6;
        var holeGap = 28;
        for (var x = holeGap; x < W; x += holeGap) {
            ctx.fillRect(x, 8, holeSize, 8);
            ctx.fillRect(x, H - 16, holeSize, 8);
        }

        // ── Photo Area ──
        var photoX = 40;
        var photoY = 50;
        var photoW = W - 80;
        var photoH = 680;

        // Draw subtle border
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(photoX, photoY, photoW, photoH);

        // Load the photo
        var img = new Image();
        var done = false;

        function finish() {
            if (done) return;
            done = true;
            if (callback) callback();
        }

        img.onload = function() {
            var iw = img.naturalWidth;
            var ih = img.naturalHeight;
            var scale = Math.max(photoW / iw, photoH / ih);
            var sw = photoW / scale;
            var sh = photoH / scale;
            var sx = (iw - sw) / 2;
            var sy = (ih - sh) / 2;

            ctx.save();
            ctx.beginPath();
            ctx.rect(photoX, photoY, photoW, photoH);
            ctx.clip();
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(photoX, photoY, photoW, photoH);
            ctx.drawImage(img, sx, sy, sw, sh, photoX, photoY, photoW, photoH);
            ctx.restore();

            // Clear footer area before redrawing
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 740, W, H - 740);

            drawCardFooter(ctx, W, photo);
            finish();
        };

        img.onerror = function() {
            // Draw error placeholder
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(photoX, photoY, photoW, photoH);
            ctx.fillStyle = '#444';
            ctx.font = '14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Image Unavailable', W / 2, photoY + photoH / 2);

            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 740, W, H - 740);

            drawCardFooter(ctx, W, photo);
            finish();
        };

        // Draw footer placeholder immediately
        drawCardFooter(ctx, W, photo);

        // Start loading
        img.src = photo.src;

        // Timeout fallback — if image takes too long, still save with placeholder
        setTimeout(function() { finish(); }, 5000);
    }

    function drawCardFooter(ctx, W, photo) {
        var footerY = 770;

        // Divider line
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(80, footerY);
        ctx.lineTo(W - 80, footerY);
        ctx.stroke();

        // Site name — Chinese
        ctx.fillStyle = '#ffffff';
        ctx.font = '400 28px "Noto Serif SC", "Songti SC", serif';
        ctx.textAlign = 'center';
        ctx.fillText('暗房工作室', W / 2, footerY + 42);

        // Site name — English
        ctx.fillStyle = '#888888';
        ctx.font = '300 15px "Playfair Display", "Times New Roman", serif';
        ctx.fillText('DARKROOM STUDIO', W / 2, footerY + 68);

        // Series name
        ctx.fillStyle = '#cccccc';
        ctx.font = '300 18px "Noto Serif SC", serif';
        ctx.fillText(photo.seriesName, W / 2, footerY + 106);

        // Subtitle
        if (photo.subtitle) {
            ctx.fillStyle = '#666666';
            ctx.font = '200 13px Inter, sans-serif';
            ctx.fillText(photo.subtitle, W / 2, footerY + 130);
        }

        // Bottom divider
        var bottomDivY = footerY + 155;
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(160, bottomDivY);
        ctx.lineTo(W - 160, bottomDivY);
        ctx.stroke();

        // URL
        ctx.fillStyle = '#555';
        ctx.font = '200 12px Inter, sans-serif';
        ctx.fillText('darkroom.studio', W / 2, bottomDivY + 28);

        // Copyright
        ctx.fillText('© 2026 暗房工作室 · DARKROOM STUDIO', W / 2, bottomDivY + 48);

        // Bottom film sprocket holes
        ctx.fillStyle = '#1a1a1a';
        var holeSizeB = 6;
        var holeGapB = 28;
        var holeYB = 986;
        for (var xb = holeGapB; xb < W; xb += holeGapB) {
            ctx.fillRect(xb, holeYB, holeSizeB, 8);
        }
    }

    /* ─── Save Button Binding ─── */

    if (lightboxSave) {
        lightboxSave.addEventListener('click', function(e) {
            e.stopPropagation();
            shareOrSaveCard();
        });
    }

    console.log('📱 触控手势 + 保存卡片就绪');

    /* ═══════════════════════════════════════════════════════
       COPYRIGHT PROTECTION
       Right-click, drag, keyboard shortcuts, watermark
       ═══════════════════════════════════════════════════════ */

    // ── Right-click prevention on images ──
    document.addEventListener('contextmenu', function(e) {
        if (e.target.tagName === 'IMG' || e.target.closest('.gallery-item') || e.target.closest('.lightbox-image')) {
            e.preventDefault();
            showToast('© 暗房工作室 · 图片已保护');
            return false;
        }
    });

    // ── Drag-to-save prevention ──
    document.addEventListener('dragstart', function(e) {
        if (e.target.tagName === 'IMG') {
            e.preventDefault();
            return false;
        }
    });

    // ── Keyboard shortcut blocking ──
    document.addEventListener('keydown', function(e) {
        // Allow shortcuts when in input fields
        var tag = document.activeElement.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        // Ctrl+S / Cmd+S — Save page
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            showToast('图片已受保护 · 请使用下载按钮保存卡片');
            return false;
        }
        // Ctrl+U / Cmd+U — View source
        if ((e.ctrlKey || e.metaKey) && e.key === 'u') {
            e.preventDefault();
            return false;
        }
        // Ctrl+Shift+I / Cmd+Shift+I / F12 — Dev tools
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'i' || e.key === 'I')) {
            e.preventDefault();
            return false;
        }
        if (e.key === 'F12') {
            e.preventDefault();
            return false;
        }
        // Ctrl+P / Cmd+P — Print
        if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
            e.preventDefault();
            showToast('打印功能已禁用');
            return false;
        }
    });

    console.log('🛡 版权保护就绪');

    /* ─── Global bridge for room.js lightbox ─── */
    window.__darkroomOpenByUrl = function(url) {
        if (!url || typeof allPhotos === 'undefined') return;
        var idx = allPhotos.findIndex(function(p) { return p.src === url; });
        if (idx === -1) {
            // Try matching by filename
            idx = allPhotos.findIndex(function(p) { return url.indexOf(p.src.split('/').pop()) !== -1; });
        }
        if (idx >= 0) {
            openLightbox(idx, allPhotos);
        }
    };

})();
