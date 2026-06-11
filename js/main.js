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
    const lightbox = document.getElementById('lightbox');
    const lightboxImg = document.getElementById('lightboxImage');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const lightboxCounter = document.getElementById('lightboxCounter');
    const lightboxClose = document.getElementById('lightboxClose');
    const lightboxPrev = document.getElementById('lightboxPrev');
    const lightboxNext = document.getElementById('lightboxNext');

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
        const sections = ['about', 'gallery', 'game', 'contact'];
        const sectionLabels = ['01', '02', '03', '04'];
        counterTotal.textContent = String(sections.length).padStart(2, '0');

        // Show counter after a delay
        setTimeout(() => filmCounter.classList.add('visible'), 1500);

        window.addEventListener('scroll', () => {
            const scrollY = window.pageYOffset + 200;
            let active = 0;
            for (let i = 0; i < sections.length; i++) {
                const el = document.getElementById(sections[i]);
                if (el && scrollY >= el.offsetTop) active = i;
            }
            counterNum.textContent = sectionLabels[active];
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

            // Header
            const header = document.createElement('div');
            header.className = 'gallery-group-header';
            header.innerHTML = `
                <span class="gallery-group-name">${seriesInfo.name}</span>
                <span class="gallery-group-sub">${seriesInfo.subtitle}</span>
            `;
            groupEl.appendChild(header);

            // Grid for this series
            const grid = document.createElement('div');
            grid.className = 'gallery-group-grid';

            photos.forEach((photo, idx) => {
                const item = document.createElement('div');
                item.className = 'gallery-item';
                if (idx >= limit) item.classList.add('collapsed');
                const img = document.createElement('img');
                img.src = photo.src;
                img.alt = photo.seriesName;
                img.loading = 'lazy';
                item.appendChild(img);
                addDevOverlay(item);

                const label = document.createElement('div');
                label.className = 'gallery-item-overlay';
                label.innerHTML = `<span class="gallery-item-label">${photo.seriesName}</span>`;
                item.appendChild(label);

                const photoIdx = photoList.indexOf(photo);
                item.addEventListener('click', () => openLightbox(photoIdx, photoList));
                grid.appendChild(item);
            });

            groupEl.appendChild(grid);

            // Expand / collapse button
            if (hasMore) {
                const remaining = photos.length - limit;
                const toggle = document.createElement('button');
                toggle.className = 'gallery-group-toggle';
                toggle.innerHTML = `<span class="toggle-arrow">▼</span> 展开全部 (${remaining}张)`;
                toggle.addEventListener('click', () => {
                    const collapsed = grid.querySelectorAll('.gallery-item.collapsed');
                    if (collapsed.length > 0) {
                        collapsed.forEach(el => el.classList.remove('collapsed'));
                        toggle.innerHTML = `<span class="toggle-arrow">▲</span> 收起`;
                    } else {
                        const items = grid.querySelectorAll('.gallery-item');
                        items.forEach((el, idx) => {
                            if (idx >= limit) el.classList.add('collapsed');
                        });
                        toggle.innerHTML = `<span class="toggle-arrow">▼</span> 展开全部 (${remaining}张)`;
                        // 滚回该主题的第一行照片
                        header.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                });
                groupEl.appendChild(toggle);
            }

            galleryGrid.appendChild(groupEl);
        });
    }

    // Initial render (grouped for "all")
    renderGroupedGallery(allPhotos);

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
        });
    });

    /* ─── Lightbox ─── */
    function openLightbox(index, photos) {
        currentImages = photos;
        currentIndex = index;
        showLightboxImage();

        // Play shutter animation, then open lightbox
        playShutter(() => {
            lightbox.classList.add('open');
            document.body.style.overflow = 'hidden';
        });
    }

    function showLightboxImage() {
        const photo = currentImages[currentIndex];
        lightboxImg.src = photo.src;
        lightboxImg.alt = photo.seriesName;
        lightboxCaption.textContent = `${photo.seriesName} · ${photo.subtitle}`;
        lightboxCounter.textContent = `${currentIndex + 1} / ${currentImages.length}`;
    }

    function closeLightbox() {
        lightbox.classList.remove('open');
        document.body.style.overflow = '';
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

})();
