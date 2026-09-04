/* ==========================================================================
   apps.fueera.com — motion layer

   No dependencies. Everything here is progressive enhancement: the pages are
   fully readable with this file absent or blocked, and every effect is
   switched off for `prefers-reduced-motion: reduce`.

   One rAF loop drives cursor, parallax, marquee and scroll progress so we
   never stack competing animation frames.
   ========================================================================== */

(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    /* ---------------------------------------------------------------------
       Split headlines into per-word masks
       --------------------------------------------------------------------- */

    function splitWords(el) {
        var words = el.textContent.trim().split(/\s+/);
        el.textContent = '';
        words.forEach(function (word, i) {
            var outer = document.createElement('span');
            outer.className = 'split-line';
            outer.style.setProperty('--line-delay', (i * 55) + 'ms');

            var inner = document.createElement('span');
            inner.textContent = word;

            outer.appendChild(inner);
            el.appendChild(outer);
            if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
        });
    }

    [].forEach.call(document.querySelectorAll('[data-split]'), splitWords);

    /* ---------------------------------------------------------------------
       Staggered reveals
       --------------------------------------------------------------------- */

    [].forEach.call(document.querySelectorAll('[data-stagger]'), function (group) {
        [].forEach.call(group.children, function (child, i) {
            child.setAttribute('data-reveal', '');
            child.style.setProperty('--reveal-delay', (i * 70) + 'ms');
        });
    });

    var revealTargets = document.querySelectorAll('[data-reveal], [data-split]');

    function revealAll() {
        [].forEach.call(revealTargets, function (el) { el.classList.add('is-in'); });
    }

    if ('IntersectionObserver' in window) {
        try {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (!entry.isIntersecting) return;
                    entry.target.classList.add('is-in');
                    io.unobserve(entry.target);
                });
            }, { rootMargin: '0px 0px -10% 0px', threshold: 0.08 });

            [].forEach.call(revealTargets, function (el) { io.observe(el); });

            /* Failsafe. These elements start at opacity:0, so anything that stops
               the observer firing would leave the page blank. After 3s, force in
               whatever is already at or above the fold. */
            setTimeout(function () {
                [].forEach.call(revealTargets, function (el) {
                    if (el.classList.contains('is-in')) return;
                    if (el.getBoundingClientRect().top < window.innerHeight) {
                        el.classList.add('is-in');
                    }
                });
            }, 3000);
        } catch (err) {
            revealAll();
        }
    } else {
        revealAll();
    }

    /* ---------------------------------------------------------------------
       Marquee — seed enough copies to loop seamlessly at -50%
       --------------------------------------------------------------------- */

    var marquees = [];

    [].forEach.call(document.querySelectorAll('.marquee-track'), function (track) {
        var original = [].slice.call(track.children);
        if (!original.length) return;

        // Repeat until the set is at least as wide as the viewport...
        var guard = 0;
        while (track.scrollWidth < window.innerWidth * 1.2 && guard < 30) {
            original.forEach(function (node) { track.appendChild(node.cloneNode(true)); });
            guard++;
        }
        // ...then duplicate the whole set once so -50% is an exact loop.
        var half = track.scrollWidth;
        [].slice.call(track.children).forEach(function (node) {
            track.appendChild(node.cloneNode(true));
        });

        marquees.push({ el: track, half: half, offset: 0 });
    });

    /* ---------------------------------------------------------------------
       Magnetic buttons
       --------------------------------------------------------------------- */

    if (finePointer && !reduced) {
        [].forEach.call(document.querySelectorAll('[data-magnetic]'), function (btn) {
            var strength = parseFloat(btn.getAttribute('data-magnetic')) || 0.3;

            btn.addEventListener('mousemove', function (e) {
                var r = btn.getBoundingClientRect();
                var dx = e.clientX - (r.left + r.width / 2);
                var dy = e.clientY - (r.top + r.height / 2);
                btn.style.transform = 'translate3d(' + (dx * strength) + 'px,' + (dy * strength * 1.1) + 'px,0)';
            });

            btn.addEventListener('mouseleave', function () {
                btn.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1)';
                btn.style.transform = '';
                setTimeout(function () { btn.style.transition = ''; }, 500);
            });
        });
    }

    /* ---------------------------------------------------------------------
       Drag-to-scroll gallery (mouse only — touch already scrolls natively)
       --------------------------------------------------------------------- */

    [].forEach.call(document.querySelectorAll('[data-drag]'), function (strip) {
        var down = false, startX = 0, startScroll = 0;

        strip.addEventListener('pointerdown', function (e) {
            if (e.pointerType !== 'mouse') return;
            down = true;
            startX = e.clientX;
            startScroll = strip.scrollLeft;
            strip.classList.add('is-dragging');
        });

        strip.addEventListener('pointermove', function (e) {
            if (!down) return;
            e.preventDefault();
            strip.scrollLeft = startScroll - (e.clientX - startX) * 1.25;
        });

        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (evt) {
            strip.addEventListener(evt, function () {
                down = false;
                strip.classList.remove('is-dragging');
            });
        });
    });

    /* ---------------------------------------------------------------------
       Custom cursor
       --------------------------------------------------------------------- */

    var cursor = document.querySelector('.cursor');
    var cursorLabel = cursor ? cursor.querySelector('.cursor-label') : null;
    var mouseX = 0, mouseY = 0, curX = 0, curY = 0;

    if (cursor && finePointer && !reduced) {
        window.addEventListener('mousemove', function (e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
            cursor.classList.add('is-active');
        }, { passive: true });

        document.addEventListener('mouseleave', function () { cursor.classList.remove('is-active'); });

        var hoverables = document.querySelectorAll('a, button, .feature');
        [].forEach.call(hoverables, function (el) {
            el.addEventListener('mouseenter', function () { cursor.classList.add('is-hover'); });
            el.addEventListener('mouseleave', function () { cursor.classList.remove('is-hover'); });
        });

        [].forEach.call(document.querySelectorAll('[data-drag]'), function (strip) {
            strip.addEventListener('mouseenter', function () {
                cursor.classList.add('is-drag');
                if (cursorLabel) cursorLabel.textContent = 'DRAG';
            });
            strip.addEventListener('mouseleave', function () {
                cursor.classList.remove('is-drag');
                if (cursorLabel) cursorLabel.textContent = '';
            });
        });
    } else if (cursor) {
        cursor.remove();
        cursor = null;
    }

    /* ---------------------------------------------------------------------
       Single rAF loop: cursor easing, parallax, marquee, scroll progress
       --------------------------------------------------------------------- */

    var progressBar = document.querySelector('.scroll-progress span');
    var parallaxEls = [].slice.call(document.querySelectorAll('[data-parallax]'));
    var lastScroll = window.pageYOffset;
    var velocity = 0;

    function updateProgress(scrollY) {
        if (!progressBar) return;
        var max = document.documentElement.scrollHeight - window.innerHeight;
        progressBar.style.width = (max > 0 ? (scrollY / max) * 100 : 0) + '%';
    }

    /* With reduced motion there is nothing to animate, so skip the permanent
       rAF loop entirely and just track the progress bar on scroll. */
    if (reduced) {
        updateProgress(window.pageYOffset);
        window.addEventListener('scroll', function () {
            updateProgress(window.pageYOffset);
        }, { passive: true });
        return;
    }

    function frame() {
        var scrollY = window.pageYOffset;
        velocity = scrollY - lastScroll;
        lastScroll = scrollY;

        updateProgress(scrollY);

        if (cursor) {
            curX += (mouseX - curX) * 0.18;
            curY += (mouseY - curY) * 0.18;
            cursor.style.transform = 'translate3d(' + (curX - 13) + 'px,' + (curY - 13) + 'px,0)';
        }

        var vh = window.innerHeight;
        parallaxEls.forEach(function (el) {
            var r = el.getBoundingClientRect();
            if (r.bottom < -200 || r.top > vh + 200) return;
            var factor = parseFloat(el.getAttribute('data-parallax')) || 0.1;
            var shift = ((r.top + r.height / 2) - vh / 2) * factor;
            el.style.transform = 'translate3d(0,' + (-shift) + 'px,0)';
        });

        /* Scrolling speeds the marquee up; scrolling back up drags it the
           other way. Clamped so a flick never makes it strobe. */
        marquees.forEach(function (m) {
            m.offset -= 0.7 + Math.min(Math.abs(velocity) * 0.12, 9) * (velocity < 0 ? -0.35 : 1);
            if (m.offset <= -m.half) m.offset += m.half;
            if (m.offset > 0) m.offset -= m.half;
            m.el.style.transform = 'translate3d(' + m.offset + 'px,0,0)';
        });

        requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
})();
