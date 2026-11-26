/* tiarecolor.ua — головна сторінка. Без залежностей. */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Плавна прокрутка колесом (Lenis) ----------
     Лише для миші/тачпада і без «зменшення руху». На тачах — нативна прокрутка.
     Внутрішні прокручувані блоки (меню, модалки, списки) Lenis не чіпає. */
  var lenis = null;
  if (window.Lenis && !reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    lenis = new window.Lenis({
      autoRaf: true, lerp: 0.11, allowNestedScroll: true, stopInertiaOnNavigate: true,
      prevent: function (node) { return node.matches('dialog, [data-drawer], [data-minicart], [data-mega], .select__panel, .filters'); }
    });
    var syncScrollLock = function () {
      var locked = document.documentElement.classList.contains('has-modal') || document.body.classList.contains('is-locked');
      if (locked) lenis.stop(); else lenis.start();
    };
    new MutationObserver(syncScrollLock).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    new MutationObserver(syncScrollLock).observe(document.body, { attributes: true, attributeFilter: ['class'] });
  }
  function scrollToY(y) {
    if (lenis) lenis.scrollTo(y);
    else window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  /* ---------- Overlay / scroll lock ---------- */
  var overlay = $('[data-overlay]');
  var openLayer = null; // 'mega' | 'drawer'

  function showOverlay(kind) {
    overlay.hidden = false;
    overlay.classList.toggle('is-drawer', kind === 'drawer');
    overlay.classList.toggle('is-cart', kind === 'cart');
    document.body.classList.add('is-locked');
    openLayer = kind;
  }
  function hideOverlay() {
    overlay.hidden = true;
    overlay.classList.remove('is-drawer', 'is-cart');
    document.body.classList.remove('is-locked');
    openLayer = null;
  }

  /* ---------- Mega menu ---------- */
  var megaBtn = $('[data-mega-toggle]');
  var mega = $('[data-mega]');

  function setMega(open) {
    if (!megaBtn || !mega) return;
    megaBtn.setAttribute('aria-expanded', String(open));
    mega.hidden = !open;
    if (open) { closeDrawer(); showOverlay('mega'); } else if (openLayer === 'mega') { hideOverlay(); }
  }
  if (megaBtn) {
    megaBtn.addEventListener('click', function () {
      setMega(megaBtn.getAttribute('aria-expanded') !== 'true');
    });
  }

  /* ---------- Drawer ---------- */
  var drawer = $('[data-drawer]');
  var drawerOpenBtn = $('[data-drawer-open]');
  var lastFocus = null;

  function openDrawer() {
    if (!drawer) return;
    setMega(false);
    lastFocus = document.activeElement;
    drawer.hidden = false;
    drawerOpenBtn && drawerOpenBtn.setAttribute('aria-expanded', 'true');
    showOverlay('drawer');
    var first = $('.drawer__close', drawer);
    first && first.focus();
  }
  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    drawer.hidden = true;
    resetDrawerPanels();
    drawerOpenBtn && drawerOpenBtn.setAttribute('aria-expanded', 'false');
    if (openLayer === 'drawer') hideOverlay();
    lastFocus && lastFocus.focus && lastFocus.focus();
  }
  drawerOpenBtn && drawerOpenBtn.addEventListener('click', openDrawer);
  $$('[data-drawer-close]').forEach(function (b) { b.addEventListener('click', closeDrawer); });

  // другий рівень бургера: панель виїжджає поверх основного списку
  function resetDrawerPanels() {
    $$('[data-drawer-panel]').forEach(function (p) { p.classList.remove('is-open'); p.setAttribute('inert', ''); });
    $$('[data-drawer-sub]').forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
    drawer && drawer.classList.remove('has-sub');
  }
  $$('[data-drawer-sub]').forEach(function (b) {
    b.addEventListener('click', function () {
      var panel = document.getElementById(b.getAttribute('aria-controls'));
      if (!panel) return;
      drawer.scrollTop = 0;
      drawer.classList.add('has-sub');
      panel.scrollTop = 0;
      panel.removeAttribute('inert');
      panel.classList.add('is-open');
      b.setAttribute('aria-expanded', 'true');
      var back = $('[data-drawer-back]', panel);
      back && back.focus({ preventScroll: true });
    });
  });
  $$('[data-drawer-back]').forEach(function (back) {
    back.addEventListener('click', function () {
      var panel = back.closest('[data-drawer-panel]');
      var opener = $('[aria-controls="' + panel.id + '"]', drawer);
      panel.classList.remove('is-open');
      panel.setAttribute('inert', '');
      drawer.classList.remove('has-sub');
      if (opener) { opener.setAttribute('aria-expanded', 'false'); opener.focus({ preventScroll: true }); }
    });
  });

  overlay && overlay.addEventListener('click', function () { setMega(false); closeDrawer(); closeMini(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { setMega(false); closeDrawer(); closeMini(); }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth < 1024 && openLayer === 'mega') setMega(false);
  });

  /* ---------- Пошук на планшеті/мобільному ---------- */
  var searchToggle = $('[data-search-toggle]');
  var headerSearch = $('.header__search');
  if (searchToggle && headerSearch) {
    searchToggle.setAttribute('aria-expanded', 'false');
    var setSearch = function (open) {
      headerSearch.classList.toggle('is-open', open);
      searchToggle.setAttribute('aria-expanded', String(open));
      if (open) $('input', headerSearch).focus();
    };
    searchToggle.addEventListener('click', function (e) {
      e.preventDefault();
      setSearch(!headerSearch.classList.contains('is-open'));
    });
    // клік будь-де поза полем пошуку його закриває
    document.addEventListener('click', function (e) {
      if (!headerSearch.classList.contains('is-open')) return;
      if (headerSearch.contains(e.target) || searchToggle.contains(e.target)) return;
      setSearch(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || !headerSearch.classList.contains('is-open')) return;
      setSearch(false);
      searchToggle.focus();
    });
  }

  /* ---------- Slider (scroll-snap + стрілки + точки) ---------- */
  /* ---------- Перетягування мишею (grab) ---------- */
  // Тач і тачпад прокручують стрічки нативно; тут — тягання мишею з інерцією та доводкою до картки.
  function snapPoints(track) {
    var tr = track.getBoundingClientRect();
    var pad = parseFloat(getComputedStyle(track).scrollPaddingLeft) || 0;
    var max = track.scrollWidth - track.clientWidth;
    return Array.prototype.map.call(track.children, function (c) {
      return Math.max(0, Math.min(max, c.getBoundingClientRect().left - tr.left + track.scrollLeft - pad));
    });
  }
  function initGrab(track, hooks) {
    hooks = hooks || {};
    var st = null, suppress = false, freeTimer = 0;
    function scrollable() { return track.scrollWidth > track.clientWidth + 1; }
    function refresh() { track.classList.toggle('is-grab', scrollable()); }
    function unfree(delay) {
      clearTimeout(freeTimer);
      freeTimer = setTimeout(function () { if (!st) track.classList.remove('is-free'); }, delay);
    }

    track.addEventListener('dragstart', function (e) { e.preventDefault(); });
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0 || !scrollable()) return;
      if (e.target.closest('input, select, textarea')) return;
      hooks.start && hooks.start();
      st = {
        id: e.pointerId, x: e.clientX, left: track.scrollLeft, moved: false, v: 0, lx: e.clientX, lt: e.timeStamp,
        snap: getComputedStyle(track).scrollSnapType.indexOf('none') === -1
      };
    });
    window.addEventListener('pointermove', function (e) {
      if (!st || e.pointerId !== st.id) return;
      if (!st.moved) {
        if (Math.abs(e.clientX - st.x) < 6) return;
        st.moved = true;
        st.x = e.clientX; st.left = track.scrollLeft; st.lx = e.clientX; st.lt = e.timeStamp;
        clearTimeout(freeTimer);
        track.classList.add('is-dragging', 'is-free');
      }
      track.scrollLeft = st.left - (e.clientX - st.x);
      var dt = e.timeStamp - st.lt;
      if (dt > 0) {
        st.v = 0.7 * ((e.clientX - st.lx) / dt) + 0.3 * st.v;
        st.lx = e.clientX; st.lt = e.timeStamp;
      }
    });
    function end(e) {
      if (!st || e.pointerId !== st.id) return;
      var s = st; st = null;
      if (!s.moved) { hooks.end && hooks.end(); return; }
      track.classList.remove('is-dragging');
      suppress = true;
      setTimeout(function () { suppress = false; }, 0);

      var max = track.scrollWidth - track.clientWidth;
      var cur = track.scrollLeft;
      var v = e.timeStamp - s.lt > 100 ? 0 : s.v;       // px/мс; миша зупинилась — інерції немає
      var x = cur - v * 220;                             // куди «докотиться» за інерцією
      if (s.snap) {
        var pts = snapPoints(track), best = pts[0];
        pts.forEach(function (p) { if (Math.abs(p - x) < Math.abs(best - x)) best = p; });
        // помітно потягнули, а доводка повертає назад — гортаємо на сусідню картку в бік руху
        var moved = cur - s.left;
        if (Math.abs(moved) > 40 && Math.abs(best - s.left) < 2) {
          var dir = moved > 0 ? 1 : -1, cand = null;
          pts.forEach(function (p) {
            if ((p - s.left) * dir > 2 && (cand === null || Math.abs(p - s.left) < Math.abs(cand - s.left))) cand = p;
          });
          if (cand !== null) best = cand;
        }
        x = best;
      }
      x = Math.max(0, Math.min(max, x));
      hooks.end && hooks.end();
      if (Math.abs(x - cur) < 1) { unfree(0); return; }
      track.scrollTo({ left: x, behavior: reduceMotion ? 'auto' : 'smooth' });
      unfree(400);
    }
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    // після перетягування клік по картці/посиланню не спрацьовує
    track.addEventListener('click', function (e) {
      if (suppress) { e.preventDefault(); e.stopPropagation(); suppress = false; }
    }, true);
    // знімаємо «вільний» режим, коли доводка закінчилась
    track.addEventListener('scroll', function () {
      if (!st && track.classList.contains('is-free')) unfree(140);
    }, { passive: true });

    refresh();
    window.addEventListener('resize', refresh);
    window.addEventListener('load', refresh);
    return { refresh: refresh };
  }

  /* ---------- Слайдер (зациклений) ---------- */
  // Нативна прокрутка зі scroll-snap. Для нескінченності з обох боків додаються копії карток;
  // коли прокрутка зупиняється, позиція непомітно переноситься на ту саму картку в «оригінальному» наборі.
  function initSlider(root, opts) {
    opts = opts || {};
    var track = $(opts.track || '[data-slider-track]', root);
    var prev = $(opts.prev || '[data-slider-prev]', root);
    var next = $(opts.next || '[data-slider-next]', root);
    var dotsWrap = $(opts.dots || '[data-slider-dots]', root);
    if (!track || !track.children.length) return null;

    var items = Array.prototype.slice.call(track.children);
    var N = items.length;
    var loop = false, perPage = 1, pages = 1, dots = [];
    var target = null, busy = false, idle = 0, raf = 0, lastW = 0;

    function css() { return getComputedStyle(track); }
    function gap() { return parseFloat(css().columnGap) || 0; }
    function pad() { return parseFloat(css().scrollPaddingLeft) || 0; }
    function stepW() { return items[0].getBoundingClientRect().width + gap(); }
    function period() { return N * stepW(); }
    function maxScroll() { return Math.max(0, track.scrollWidth - track.clientWidth); }
    // позиція прокрутки, за якої перша оригінальна картка стоїть на своєму місці
    function base() { return items[0].getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft - pad(); }
    function vIndex() { return Math.round((track.scrollLeft - base()) / stepW()); }
    function mod(i) { return ((i % N) + N) % N; }
    function setLeft(x) {
      track.style.scrollBehavior = 'auto';
      track.scrollLeft = x;
      track.style.scrollBehavior = '';
    }

    function makeClone(el) {
      var c = el.cloneNode(true);
      c.setAttribute('data-clone', '');
      c.setAttribute('aria-hidden', 'true');
      c.removeAttribute('id');
      $$('[id]', c).forEach(function (n) { n.removeAttribute('id'); });
      $$('a, button, input, select, textarea, [tabindex]', c).forEach(function (n) { n.setAttribute('tabindex', '-1'); });
      $$('h1', c).forEach(function (h) {           // h1 на сторінці має бути один
        var h2 = document.createElement('h2');
        h2.className = h.className;
        h2.innerHTML = h.innerHTML;
        h.parentNode.replaceChild(h2, h);
      });
      return c;
    }
    function build() {
      $$('[data-clone]', track).forEach(function (c) { c.parentNode.removeChild(c); });
      perPage = opts.full ? 1 : Math.max(1, Math.floor((track.clientWidth - gap()) / stepW()));
      loop = N > perPage;
      if (loop) {
        // копій стільки, щоб у будь-який бік вистачило прокрутки щонайменше на екран
        var copies = Math.max(1, Math.ceil((track.clientWidth * 1.5 - 3 * pad()) / period()));
        var before = document.createDocumentFragment(), after = document.createDocumentFragment();
        for (var k = 0; k < copies; k++) {
          items.forEach(function (el) { before.appendChild(makeClone(el)); after.appendChild(makeClone(el)); });
        }
        track.insertBefore(before, track.firstChild);
        track.appendChild(after);
      }
      pages = loop ? Math.ceil(N / perPage) : 1;
      root.classList.toggle('is-static', !loop);
    }
    // переносить позицію на еквівалентну ближче до середини стрічки; повертає зсув у періодах
    function normalize() {
      if (!loop) return 0;
      var p = period(), a = (maxScroll() - p) / 2, x = track.scrollLeft, s = 0;
      while (x + s * p < a) s++;
      while (x + s * p >= a + p) s--;
      if (s) setLeft(x + s * p);
      return s;
    }
    function from() {
      var s = normalize();
      if (target !== null) target += s * N;
      return target !== null ? target : vIndex();
    }
    function go(k) {
      var sw = stepW(), pageW = perPage * sw, lead = base() + k * sw - track.scrollLeft;
      // багато кліків поспіль: ціль утекла далеко вперед — перескакуємо ближче до неї, щоб не впертися в край стрічки
      if (Math.abs(lead) > pageW * 1.5) {
        setLeft(base() + k * sw - (lead > 0 ? 1 : -1) * pageW);
        k += normalize() * N;
      }
      target = k;
      track.scrollTo({ left: base() + k * sw, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    function step(dir) { if (loop) go(from() + dir * perPage); }
    function goPage(pg) {
      if (!loop) return;
      var f = from(), k = f - mod(f) + pg * perPage;
      if (k - f > N / 2) k -= N; else if (f - k > N / 2) k += N;
      go(k);
    }
    function page() { return loop ? Math.min(pages - 1, Math.floor(mod(vIndex()) / perPage)) : 0; }

    function buildDots() {
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      dots = [];
      if (pages < 2) return;
      for (var i = 0; i < pages; i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'dots__btn';
        b.setAttribute('aria-label', 'Сторінка ' + (i + 1));
        b.addEventListener('click', goPage.bind(null, i));
        dotsWrap.appendChild(b);
        dots.push(b);
      }
    }
    function update() {
      var i = page();
      dots.forEach(function (d, k) {
        d.classList.toggle('is-active', k === i);
        d.setAttribute('aria-current', k === i ? 'true' : 'false');
      });
      if (prev) prev.disabled = !loop;
      if (next) next.disabled = !loop;
      opts.onChange && opts.onChange(i);
    }
    function settle() {
      clearTimeout(idle);
      if (busy) return;
      normalize();
      target = null;
      update();
    }
    // scrollend приходить і тоді, коли анімацію перервав наступний клік, — чекаємо, поки доїдемо до цілі
    function onScrollEnd() {
      if (target !== null && Math.abs(track.scrollLeft - (base() + target * stepW())) > 1) return;
      settle();
    }
    function rebuild(real) {
      lastW = track.clientWidth;
      build();
      setLeft(loop ? base() + real * stepW() : 0);
      target = null;
      buildDots();
      update();
    }

    prev && prev.addEventListener('click', function () { step(-1); });
    next && next.addEventListener('click', function () { step(1); });

    track.addEventListener('scroll', function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
      clearTimeout(idle);
      idle = setTimeout(settle, 150);
    }, { passive: true });
    if ('onscrollend' in window) track.addEventListener('scrollend', onScrollEnd);
    // поки палець на стрічці — позицію не чіпаємо
    track.addEventListener('touchstart', function () { busy = true; clearTimeout(idle); }, { passive: true });
    ['touchend', 'touchcancel'].forEach(function (t) {
      track.addEventListener(t, function () { busy = false; clearTimeout(idle); idle = setTimeout(settle, 150); }, { passive: true });
    });
    initGrab(track, {
      start: function () { busy = true; clearTimeout(idle); normalize(); target = null; },
      end: function () { busy = false; clearTimeout(idle); idle = setTimeout(settle, 150); }
    });

    var rs = 0;
    function onResize() {
      clearTimeout(rs);
      rs = setTimeout(function () {
        if (track.clientWidth === lastW) return;
        rebuild(loop ? mod(vIndex()) : 0);
      }, 150);
    }
    window.addEventListener('resize', onResize);
    window.addEventListener('load', onResize);

    rebuild(0);
    return {
      next: function () { step(1); },
      prev: function () { step(-1); },
      goTo: goPage,
      current: page,
      pages: function () { return pages; }
    };
  }

  $$('[data-slider]').forEach(function (s) { initSlider(s); });

  $$('.insta__grid, .reviews__list, .brands__list, .gallery__thumbs').forEach(function (t) { initGrab(t); });

  /* ---------- Hero ---------- */
  var hero = $('[data-hero]');
  if (hero) {
    var heroApi = initSlider(hero, {
      track: '[data-hero-track]', prev: '[data-hero-prev]', next: '[data-hero-next]', dots: '[data-hero-dots]',
      full: true, loop: true
    });
    // автопрокрутка (пауза при наведенні / фокусі / прихованій вкладці)
    var timer = null;
    var paused = false;
    function tick() {
      if (paused || document.hidden || !heroApi) return;
      heroApi.next();
    }
    if (!reduceMotion) timer = setInterval(tick, 6000);
    hero.addEventListener('mouseenter', function () { paused = true; });
    hero.addEventListener('mouseleave', function () { paused = false; });
    hero.addEventListener('focusin', function () { paused = true; });
    hero.addEventListener('focusout', function () { paused = false; });
    hero.addEventListener('touchstart', function () { paused = true; clearInterval(timer); }, { passive: true });
  }

  /* ---------- Обране ---------- */
  document.addEventListener('click', function (e) {
    var fav = e.target.closest('.product-card__fav');
    if (fav) {
      var on = fav.getAttribute('aria-pressed') !== 'true';
      fav.setAttribute('aria-pressed', String(on));
      fav.setAttribute('aria-label', on ? 'Видалити з обраного' : 'Додати в обране');
      return;
    }
    var buy = e.target.closest('.btn-buy');
    if (buy) {
      // TODO: інтеграція з кошиком CMS. Поки що — локальний кошик (мінікошик) і візуальний фідбек.
      var card = buy.closest('.product-card');
      if (card) addToCart(cardItem(card));
      buy.classList.add('is-added');
      var label = $('span', buy);
      var old = label.textContent;
      label.textContent = 'додано';
      setTimeout(function () { buy.classList.remove('is-added'); label.textContent = old; }, 1600);
    }
  });

  /* ---------- "Читати повністю" ---------- */
  $$('[data-readmore]').forEach(function (box) {
    var btn = document.querySelector('[data-readmore-toggle][aria-controls="' + box.id + '"]');
    if (!btn) return;
    var label = $('[data-readmore-label]', btn);
    box.classList.add('is-collapsed');
    btn.addEventListener('click', function () {
      var expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      box.classList.toggle('is-collapsed', expanded);
      if (label) label.textContent = expanded ? 'Читати повністю' : 'Згорнути';
    });
  });

  /* ---------- Підписка ---------- */
  var sub = $('[data-subscribe]');
  if (sub) {
    sub.addEventListener('submit', function (e) {
      e.preventDefault();
      // TODO: відправка на бекенд / сервіс розсилки
      var btn = $('button', sub);
      sub.classList.add('is-sent');
      btn.textContent = 'Дякуємо!';
      sub.reset();
    });
  }
  /* ==========================================================================
     КАРТКА ТОВАРУ
     ========================================================================== */

  /* ---------- Галерея ---------- */
  $$('[data-gallery]').forEach(function (g) {
    var main = $('[data-gallery-main]', g);
    var thumbs = $$('[data-gallery-thumb]', g);
    function show(btn) {
      if (!main || btn.classList.contains('is-active')) return;
      thumbs.forEach(function (t) { t.classList.remove('is-active'); t.removeAttribute('aria-current'); });
      btn.classList.add('is-active');
      btn.setAttribute('aria-current', 'true');
      main.classList.add('is-fading');
      setTimeout(function () {
        main.src = btn.getAttribute('data-full');
        main.classList.remove('is-fading');
      }, reduceMotion ? 0 : 180);
    }
    thumbs.forEach(function (t) { t.addEventListener('click', function () { show(t); }); });
    function swipe(dx) {
      if (Math.abs(dx) < 40) return;
      var i = thumbs.findIndex(function (t) { return t.classList.contains('is-active'); });
      show(thumbs[(i + (dx < 0 ? 1 : -1) + thumbs.length) % thumbs.length]);
    }
    // перетягування головного фото мишею
    if (main) {
      var mx = null, mid = null;
      main.classList.add('is-swipe');
      main.addEventListener('dragstart', function (e) { e.preventDefault(); });
      main.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        mx = e.clientX; mid = e.pointerId;
      });
      window.addEventListener('pointerup', function (e) {
        if (mx === null || e.pointerId !== mid) return;
        var dx = e.clientX - mx; mx = null;
        swipe(dx);
      });
      window.addEventListener('pointercancel', function () { mx = null; });
    }
    // свайп по головному фото
    var x0 = null;
    main && main.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    main && main.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      swipe(dx);
    });
  });

  /* ---------- Вибір відтінку (дропдаун + плашки) ---------- */
  $$('[data-shade-select]').forEach(function (box) {
    var form = box.closest('form') || document;
    var btn = $('[data-shade-toggle]', box);
    var list = $('[data-shade-list]', box);
    var options = $$('[role="option"]', list);
    var swatches = $$('.swatch[data-shade]', form);
    var more = $('[data-shade-more]', form);
    var focusIdx = 0;

    function open(state) {
      list.hidden = !state;
      btn.setAttribute('aria-expanded', String(state));
      if (state) {
        focusIdx = Math.max(0, options.findIndex(function (o) { return o.classList.contains('is-selected'); }));
        markFocus();
        list.focus();
      }
    }
    function markFocus() {
      options.forEach(function (o, k) { o.classList.toggle('is-focused', k === focusIdx); });
      list.setAttribute('aria-activedescendant', options[focusIdx].id);
      options[focusIdx].scrollIntoView({ block: 'nearest' });
    }
    function select(i) {
      var o = options[i]; if (!o) return;
      options.forEach(function (x, k) {
        x.classList.toggle('is-selected', k === i);
        x.setAttribute('aria-selected', k === i ? 'true' : 'false');
      });
      swatches.forEach(function (s) {
        var on = +s.getAttribute('data-shade') === i;
        s.classList.toggle('is-active', on);
        s.setAttribute('aria-pressed', String(on));
      });
      $$('[data-shade-name]', form).forEach(function (el) { el.textContent = o.getAttribute('data-name'); });
      var price = $('[data-shade-price]', box); if (price) price.textContent = o.getAttribute('data-price') + ' грн';
      var img = $('[data-shade-img]', box); if (img) img.src = o.getAttribute('data-img');
    }

    btn.addEventListener('click', function () { open(list.hidden); });
    options.forEach(function (o, k) {
      o.addEventListener('click', function () { select(k); open(false); btn.focus(); });
    });
    list.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); focusIdx = Math.min(options.length - 1, focusIdx + 1); markFocus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); focusIdx = Math.max(0, focusIdx - 1); markFocus(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(focusIdx); open(false); btn.focus(); }
      else if (e.key === 'Escape' || e.key === 'Tab') { open(false); if (e.key === 'Escape') btn.focus(); }
    });
    document.addEventListener('click', function (e) { if (!box.contains(e.target) && e.target !== more) open(false); });
    swatches.forEach(function (s) { s.addEventListener('click', function () { select(+s.getAttribute('data-shade')); }); });
    more && more.addEventListener('click', function () { open(true); });
  });

  /* ---------- Кількість ---------- */
  $$('[data-qty]').forEach(function (q) {
    var input = $('input', q);
    var min = +input.min || 1, max = +input.max || 999;
    function set(v) {
      input.value = Math.max(min, Math.min(max, v || min));
      q.dispatchEvent(new CustomEvent('qty:change', { bubbles: true, detail: { value: +input.value } }));
    }
    $('[data-qty-minus]', q).addEventListener('click', function () { set(+input.value - 1); });
    $('[data-qty-plus]', q).addEventListener('click', function () { set(+input.value + 1); });
    input.addEventListener('change', function () { set(parseInt(input.value, 10)); });
  });

  /* ---------- Купити / обране на картці товару ---------- */
  var productForm = $('[data-product-form]');
  if (productForm) {
    productForm.addEventListener('submit', function (e) {
      e.preventDefault();
      // TODO: додавання в кошик через API CMS (FormData(productForm))
      var shade = ($('[data-shade-name]', productForm) || {}).textContent || '';
      var vol = $('input[name="volume"]:checked', productForm);
      var num = function (el) { return el ? parseInt(el.textContent.replace(/\D/g, ''), 10) || 0 : 0; };
      addToCart({
        id: 'fanola-colouring-cream|' + shade + '|' + (vol ? vol.value : ''),
        brand: 'Fanola',
        name: 'Крем-фарба Fanola Colouring Cream ' + shade.trim() + (vol ? ', ' + vol.value + ' мл' : ''),
        price: num($('.product__current')), old: num($('.product__old s')),
        img: ($('[data-gallery-main]') || {}).getAttribute ? $('[data-gallery-main]').getAttribute('src') : '',
        qty: Math.max(1, parseInt(($('.qty__input', productForm) || {}).value, 10) || 1)
      });
      var b = $('.btn-cart', productForm), label = $('span', b), old = label.textContent;
      b.classList.add('is-added'); label.textContent = 'Додано';
      setTimeout(function () { b.classList.remove('is-added'); label.textContent = old; }, 1600);
    });
  }
  $$('[data-fav]').forEach(function (b) {
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      b.setAttribute('aria-label', on ? 'Видалити з обраного' : 'Додати в обране');
    });
  });

  /* ---------- Поділитися ---------- */
  $$('[data-share]').forEach(function (b) {
    b.addEventListener('click', function () {
      var data = { title: document.title, url: location.href };
      if (navigator.share) { navigator.share(data).catch(function () {}); return; }
      var label = $('[data-share-label]', b);
      var done = function () {
        if (!label) return;
        var old = label.textContent; label.textContent = 'Посилання скопійовано';
        setTimeout(function () { label.textContent = old; }, 1800);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, done); else done();
    });
  });

  /* ---------- Таби ---------- */
  $$('[data-tabs]').forEach(function (wrap) {
    var tabs = $$('[role="tab"]', wrap);
    var body = $('.product-tabs__body', wrap);
    var reviews = $('[data-reviews]');
    // Вкладка «Відгуки» не має власної панелі: блок відгуків під табами
    // «підтягується» під таби (клас is-tab), а решта панелей ховається.
    function activate(tab, focus) {
      var isReviews = tab.hasAttribute('data-tab-reviews');
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        if (t.hasAttribute('data-tab-reviews')) return;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (body) body.hidden = isReviews;
      if (reviews) reviews.classList.toggle('is-tab', isReviews);
      if (focus) tab.focus();
      // на мобільному підкрутити смугу табів до активного
      var bar = tab.parentNode;
      if (bar.scrollWidth > bar.clientWidth) bar.scrollTo({ left: tab.offsetLeft - 16, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    $$('[data-open-reviews]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var t = $('[data-tab-reviews]', wrap);
        if (!t) return;
        e.preventDefault();
        activate(t);
        wrap.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      });
    });
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { activate(t); });
      t.addEventListener('keydown', function (e) {
        var n = null;
        if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
        if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
        if (e.key === 'Home') n = tabs[0];
        if (e.key === 'End') n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); activate(n, true); }
      });
    });
  });

  /* ---------- Відгуки: «Корисно» ---------- */
  $$('[data-helpful]').forEach(function (b) {
    b.addEventListener('click', function () {
      var on = b.getAttribute('aria-pressed') !== 'true';
      var c = $('[data-helpful-count]', b);
      b.setAttribute('aria-pressed', String(on));
      if (c) c.textContent = (+c.textContent) + (on ? 1 : -1);
    });
  });
  /* ==========================================================================
     КАТАЛОГ
     ========================================================================== */

  /* ---------- Простий дропдаун (сортування) ---------- */
  $$('[data-dropdown]').forEach(function (dd) {
    var btn = $('[data-dropdown-toggle]', dd);
    var list = $('[data-dropdown-list]', dd);
    var valueEl = $('[data-dropdown-value]', dd);
    var opts = $$('[role="option"]', list);
    var fi = 0;
    function open(state) {
      list.hidden = !state;
      btn.setAttribute('aria-expanded', String(state));
      if (state) { fi = Math.max(0, opts.findIndex(function (o) { return o.classList.contains('is-selected'); })); mark(); list.focus(); }
    }
    function mark() {
      opts.forEach(function (o, k) { o.classList.toggle('is-focused', k === fi); });
      list.setAttribute('aria-activedescendant', opts[fi].id);
    }
    function pick(i) {
      opts.forEach(function (o, k) { o.classList.toggle('is-selected', k === i); o.setAttribute('aria-selected', k === i ? 'true' : 'false'); });
      valueEl.textContent = opts[i].textContent;
      dd.dispatchEvent(new CustomEvent('dropdown:change', { detail: { value: opts[i].getAttribute('data-value') } }));
      // TODO: сортування на бекенді (?sort=...)
    }
    btn.addEventListener('click', function () { open(list.hidden); });
    opts.forEach(function (o, k) { o.addEventListener('click', function () { pick(k); open(false); btn.focus(); }); });
    list.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); fi = Math.min(opts.length - 1, fi + 1); mark(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); fi = Math.max(0, fi - 1); mark(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(fi); open(false); btn.focus(); }
      else if (e.key === 'Escape' || e.key === 'Tab') { open(false); if (e.key === 'Escape') btn.focus(); }
    });
    document.addEventListener('click', function (e) { if (!dd.contains(e.target)) open(false); });
  });

  /* ---------- Фільтри ---------- */
  var filtersForm = $('[data-filters-form]');
  var chipsBox = $('[data-chips]');
  var sidebar = $('[data-filters]');
  var filtersBtn = $('[data-filters-open]');

  function inputLabel(input) {
    var l = input.closest('label');
    var t = l && ($('.check__label', l) || $('span', l));
    return t ? t.textContent.trim() : input.value;
  }
  function updateBadge() {
    if (!filtersForm || !filtersBtn) return;
    var n = $$('input:checked', filtersForm).length;
    var b = $('.catalog-head__badge', filtersBtn);
    if (b) { b.textContent = n; b.hidden = n === 0; }
  }
  // Чіпи будуються з відмічених фільтрів (після першої зміни у формі)
  function renderChips() {
    if (!chipsBox || !filtersForm) return;
    $$('.chip', chipsBox).forEach(function (c) { c.remove(); });
    var clear = $('[data-chips-clear]', chipsBox);
    $$('input:checked', filtersForm).forEach(function (inp) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'chip';
      b.setAttribute('data-chip', inp.name + ':' + inp.value);
      b.innerHTML = inputLabel(inp) + '<svg class="icon icon--x-small" aria-hidden="true"><use href="#i-x-small"></use></svg><span class="visually-hidden">— прибрати фільтр</span>';
      chipsBox.insertBefore(b, clear);
    });
    chipsBox.classList.toggle('is-empty', !$('.chip', chipsBox));
    updateBadge();
  }
  if (chipsBox) {
    chipsBox.addEventListener('click', function (e) {
      var chip = e.target.closest('.chip');
      if (chip) {
        var parts = chip.getAttribute('data-chip').split(':');
        var inp = filtersForm && filtersForm.querySelector('input[name="' + parts[0] + '"][value="' + parts[1] + '"]');
        if (inp) inp.checked = false;
        chip.remove();
        chipsBox.classList.toggle('is-empty', !$('.chip', chipsBox));
        updateBadge();
        return;
      }
      if (e.target.closest('[data-chips-clear]')) clearFilters();
    });
  }
  // «Скинути» / «Очистити все»: знімаємо всі позначки (а не повертаємо стан за замовчуванням)
  function clearFilters() {
    if (!filtersForm) return;
    $$('input', filtersForm).forEach(function (i) {
      if (i.type === 'checkbox' || i.type === 'radio') i.checked = false; else i.value = '';
    });
    $$('[data-filter-search]', filtersForm).forEach(function (i) { i.dispatchEvent(new Event('input')); });
    renderChips();
  }
  if (filtersForm) {
    filtersForm.addEventListener('change', function (e) { if (e.target.type === 'checkbox') renderChips(); });
    $$('[data-filters-reset]', filtersForm).forEach(function (b) { b.addEventListener('click', clearFilters); });
    filtersForm.addEventListener('submit', function (e) {
      e.preventDefault();
      // TODO: застосування фільтрів (запит до CMS / оновлення URL)
      closeFilters();
    });
    updateBadge();
  }

  // пошук по брендах + «Показати всі»
  $$('[data-filter-search]').forEach(function (input) {
    var body = input.closest('.filter__body');
    var more = $('[data-filter-more]', body);
    var toggle = $('[data-filter-more-toggle]', body);
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      if (more) more.hidden = !q && toggle.getAttribute('aria-expanded') !== 'true';
      $$('.check', body).forEach(function (c) {
        c.classList.toggle('is-hidden', !!q && $('.check__label', c).textContent.toLowerCase().indexOf(q) === -1);
      });
    });
  });
  $$('[data-filter-more-toggle]').forEach(function (btn) {
    var more = $('[data-filter-more]', btn.closest('.filter__body'));
    var label = btn.textContent;
    btn.setAttribute('aria-expanded', 'false');
    btn.addEventListener('click', function () {
      var open = more.hidden;
      more.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Згорнути' : label;
    });
  });

  // панель фільтрів на планшеті/мобільному
  function openFilters() {
    if (!sidebar) return;
    sidebar.classList.add('is-open');
    filtersBtn && filtersBtn.setAttribute('aria-expanded', 'true');
    showOverlay('drawer');
    var c = $('[data-filters-close]', sidebar); c && c.focus();
  }
  function closeFilters() {
    if (!sidebar || !sidebar.classList.contains('is-open')) return;
    sidebar.classList.remove('is-open');
    filtersBtn && filtersBtn.setAttribute('aria-expanded', 'false');
    if (openLayer === 'drawer') hideOverlay();
    filtersBtn && filtersBtn.focus();
  }
  filtersBtn && filtersBtn.addEventListener('click', openFilters);
  $$('[data-filters-close]').forEach(function (b) { b.addEventListener('click', closeFilters); });
  overlay && overlay.addEventListener('click', closeFilters);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeFilters(); });
  window.addEventListener('resize', function () { if (window.innerWidth >= 1024) closeFilters(); });

  /* ---------- «Завантажити ще» ---------- */
  $$('.catalog__load').forEach(function (b) {
    b.addEventListener('click', function () {
      // TODO: підвантаження наступної сторінки товарів (AJAX)
      b.classList.add('is-loading');
      setTimeout(function () { b.classList.remove('is-loading'); }, 900);
    });
  });
  /* ==========================================================================
     КОШИК
     ========================================================================== */
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function money(v) { return v + ' грн'; }

  var cart = $('[data-cart]');
  if (cart) {
    var recalc = function () {
      var items = $$('[data-cart-item]', cart);
      var count = 0, subtotal = 0, total = 0;
      items.forEach(function (it) {
        var qty = +$('.qty__input', it).value || 1;
        var price = +it.getAttribute('data-price'), old = +it.getAttribute('data-old') || price;
        count += qty; subtotal += old * qty; total += price * qty;
        $('[data-line-total]', it).textContent = money(price * qty);
      });
      var set = function (sel, txt) { $$(sel).forEach(function (el) { el.textContent = txt; }); };
      set('[data-sum-count]', count);
      set('[data-sum-subtotal]', money(subtotal));
      set('[data-sum-discount]', money(subtotal - total));
      set('[data-sum-total]', money(total));
      set('[data-cart-count]', count + ' ' + plural(count, 'товар', 'товари', 'товарів'));
      var empty = $('[data-cart-empty]', cart);
      if (empty) empty.hidden = items.length > 0;
      var btn = $('.summary__btn', cart);
      if (btn) btn.classList.toggle('is-disabled', items.length === 0);
      // TODO: синхронізація з кошиком на бекенді
    };
    cart.addEventListener('qty:change', recalc);
    cart.addEventListener('click', function (e) {
      var rm = e.target.closest('[data-cart-remove]');
      if (!rm) return;
      var it = rm.closest('[data-cart-item]');
      it.classList.add('is-removing');
      setTimeout(function () { it.remove(); recalc(); }, reduceMotion ? 0 : 250);
    });
    var promo = $('[data-promo]', cart);
    promo && promo.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = $('input', promo).value.trim();
      promo.classList.toggle('is-error', !v);
      promo.classList.toggle('is-applied', !!v);
      // TODO: перевірка промокоду на бекенді
    });
  }

  /* ==========================================================================
     КАСТОМНИЙ SELECT
     Нативний <select> лишається у формі (значення, required, disabled), поверх нього — кнопка і список.
     Розмітка: <div class="field field--select" data-select><select aria-label="…">…</select>…</div>
     Пошук у списку з'являється, якщо пунктів більше 7 (або є атрибут data-select-search).
     Зміни select ззовні (value + подія change, disabled, нові <option>) підхоплюються автоматично.
     ========================================================================== */
  var selectUid = 0;
  function initSelect(box) {
    var native = $('select', box);
    if (!native || native.customSelect) return;
    var uid = 'cs-' + (++selectUid);
    var label = native.getAttribute('aria-label') || '';
    var opts = [], active = -1, typed = '', typedTimer = 0;

    box.classList.add('select');
    native.classList.add('select__native');
    native.tabIndex = -1;
    native.setAttribute('aria-hidden', 'true');

    var btn = document.createElement('div');
    btn.className = 'select__btn';
    btn.setAttribute('role', 'combobox');
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', uid + '-list');
    btn.setAttribute('aria-label', label);
    btn.innerHTML = '<span class="select__value"></span>';
    var valueEl = btn.firstChild;

    var panel = document.createElement('div');
    panel.className = 'select__panel';
    panel.hidden = true;
    var search = null;
    var list = document.createElement('ul');
    list.className = 'select__list';
    list.id = uid + '-list';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', label);
    var empty = document.createElement('p');
    empty.className = 'select__empty';
    empty.textContent = 'Нічого не знайдено';
    empty.hidden = true;

    native.insertAdjacentElement('afterend', btn);
    box.appendChild(panel);

    function realOptions() {
      return Array.prototype.filter.call(native.options, function (o) { return !(o.hidden || (o.disabled && o.value === '')); });
    }
    function placeholder() {
      var o = native.options[0];
      return o && o.value === '' ? o.textContent : '';
    }
    function buildList() {
      var real = realOptions();
      var needSearch = native.hasAttribute('data-select-search') || real.length > 7;
      if (needSearch && !search) {
        var wrap = document.createElement('div');
        wrap.className = 'select__search';
        wrap.innerHTML = '<svg class="icon icon--search" aria-hidden="true"><use href="#i-search"></use></svg>';
        search = document.createElement('input');
        search.type = 'text';
        search.autocomplete = 'off';
        search.placeholder = 'Пошук';
        search.setAttribute('aria-label', 'Пошук: ' + label);
        search.setAttribute('aria-controls', list.id);
        wrap.appendChild(search);
        panel.insertBefore(wrap, panel.firstChild);
        search.addEventListener('input', function () { filter(search.value); });
        search.addEventListener('keydown', onListKey);
      } else if (!needSearch && search) {
        panel.removeChild(search.parentNode);
        search = null;
      }
      list.innerHTML = '';
      opts = real.map(function (o, i) {
        var li = document.createElement('li');
        li.className = 'select__option';
        li.id = uid + '-o' + i;
        li.setAttribute('role', 'option');
        li.setAttribute('aria-selected', 'false');
        if (o.disabled) li.setAttribute('aria-disabled', 'true');
        li.innerHTML = '<span></span><svg class="icon icon--checkmark select__check" aria-hidden="true"><use href="#i-checkmark"></use></svg>';
        li.firstChild.textContent = o.textContent;
        li.addEventListener('click', function () { if (!o.disabled) { choose(o); close(true); } });
        li.addEventListener('mousemove', function () { if (!li.hidden) setActive(opts.indexOf(item)); });
        list.appendChild(li);
        var item = { opt: o, el: li, text: o.textContent.toLowerCase() };
        return item;
      });
      if (!list.parentNode) { panel.appendChild(list); panel.appendChild(empty); }
      refresh();
    }
    function refresh() {
      var sel = native.selectedOptions[0];
      var has = sel && sel.value !== '' && !sel.hidden;
      valueEl.textContent = has ? sel.textContent : placeholder();
      btn.classList.toggle('is-placeholder', !has);
      opts.forEach(function (it) { it.el.setAttribute('aria-selected', String(it.opt === sel)); });
      var off = native.disabled;
      btn.tabIndex = off ? -1 : 0;
      btn.setAttribute('aria-disabled', String(off));
      box.classList.toggle('is-disabled', off);
      if (off) close();
    }
    function visible() { return opts.filter(function (it) { return !it.el.hidden && !it.opt.disabled; }); }
    function setActive(i, scroll) {
      opts.forEach(function (it) { it.el.classList.remove('is-active'); });
      active = i;
      var it = opts[i];
      var owner = search || btn;
      if (!it) { owner.removeAttribute('aria-activedescendant'); return; }
      it.el.classList.add('is-active');
      owner.setAttribute('aria-activedescendant', it.el.id);
      if (scroll) {
        var top = it.el.offsetTop, bottom = top + it.el.offsetHeight;
        if (top < list.scrollTop) list.scrollTop = top - 6;
        else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 6;
      }
    }
    function move(delta) {
      var vis = visible();
      if (!vis.length) return;
      var pos = vis.indexOf(opts[active]);
      pos = pos === -1 ? (delta > 0 ? 0 : vis.length - 1) : Math.max(0, Math.min(vis.length - 1, pos + delta));
      setActive(opts.indexOf(vis[pos]), true);
    }
    function filter(q) {
      q = q.trim().toLowerCase();
      var any = false;
      opts.forEach(function (it) { it.el.hidden = !!q && it.text.indexOf(q) === -1; if (!it.el.hidden) any = true; });
      empty.hidden = any;
      var vis = visible();
      setActive(vis.length ? opts.indexOf(vis[0]) : -1, true);
    }
    function choose(o) {
      if (native.value === o.value && native.selectedOptions[0] === o) return;
      o.selected = true;
      native.dispatchEvent(new Event('input', { bubbles: true }));
      native.dispatchEvent(new Event('change', { bubbles: true }));
    }
    function isOpen() { return !panel.hidden; }
    function open() {
      if (isOpen() || native.disabled) return;
      $$('.select.is-open').forEach(function (b) { b.customSelect && b.customSelect.close(); });
      panel.hidden = false;
      box.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
      // знизу не вміщається: підкручуємо сторінку; якщо крутити нікуди — відкриваємо вгору
      box.classList.remove('is-up');
      var r = btn.getBoundingClientRect(), h = panel.offsetHeight + 16;
      var lack = r.bottom + h - window.innerHeight;
      if (lack > 0) {
        var room = document.documentElement.scrollHeight - window.innerHeight - window.pageYOffset;
        if (room >= lack && r.top - lack > 0) window.scrollBy({ top: lack, behavior: reduceMotion ? 'auto' : 'smooth' });
        else if (r.top > h) box.classList.add('is-up');
      }
      if (search) { search.value = ''; filter(''); }
      var cur = opts.findIndex(function (it) { return it.opt === native.selectedOptions[0]; });
      if (cur === -1) cur = opts.indexOf(visible()[0]);
      setActive(cur, false);
      list.scrollTop = 0;
      if (opts[cur]) setActive(cur, true);
      if (search) search.focus({ preventScroll: true });
    }
    function close(focusBtn) {
      if (!isOpen()) return;
      panel.hidden = true;
      box.classList.remove('is-open', 'is-up');
      btn.setAttribute('aria-expanded', 'false');
      btn.removeAttribute('aria-activedescendant');
      if (focusBtn) btn.focus({ preventScroll: true });
    }

    function onListKey(e) {
      switch (e.key) {
        case 'ArrowDown': e.preventDefault(); move(1); break;
        case 'ArrowUp': e.preventDefault(); move(-1); break;
        case 'Home': if (!search) { e.preventDefault(); move(-1e6); } break;
        case 'End': if (!search) { e.preventDefault(); move(1e6); } break;
        case 'PageDown': e.preventDefault(); move(5); break;
        case 'PageUp': e.preventDefault(); move(-5); break;
        case 'Enter':
          e.preventDefault();
          if (opts[active] && !opts[active].el.hidden) choose(opts[active].opt);
          close(true);
          break;
        case 'Escape': e.preventDefault(); e.stopPropagation(); close(true); break;
        case 'Tab': close(false); break;
      }
    }
    btn.addEventListener('click', function () { isOpen() ? close(true) : open(); });
    btn.addEventListener('keydown', function (e) {
      if (native.disabled) return;
      if (isOpen()) {
        if (e.key === ' ') { e.preventDefault(); if (opts[active]) choose(opts[active].opt); close(true); return; }
        onListKey(e);
        if (e.key.length !== 1) return;
      } else if (['ArrowDown', 'ArrowUp', 'Enter', ' '].indexOf(e.key) !== -1) {
        e.preventDefault(); open(); return;
      }
      // набір з клавіатури: з пошуком — відкриваємо і друкуємо туди, без — переходимо до пункту на ці літери
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (search) {
          e.preventDefault(); open(); search.value = e.key; filter(e.key);
          return;
        }
        clearTimeout(typedTimer);
        typed += e.key.toLowerCase();
        typedTimer = setTimeout(function () { typed = ''; }, 600);
        var hit = opts.filter(function (it) { return !it.opt.disabled && it.text.indexOf(typed) === 0; })[0];
        if (hit) {
          if (isOpen()) setActive(opts.indexOf(hit), true);
          else choose(hit.opt);
        }
      }
    });
    document.addEventListener('pointerdown', function (e) { if (isOpen() && !box.contains(e.target)) close(false); });
    box.addEventListener('focusout', function (e) { if (isOpen() && !box.contains(e.relatedTarget)) close(false); });
    native.addEventListener('change', refresh);
    if (window.MutationObserver) {
      new MutationObserver(function (m) {
        m.some(function (r) { return r.type === 'childList'; }) ? buildList() : refresh();
      }).observe(native, { attributes: true, attributeFilter: ['disabled'], childList: true, subtree: true });
    }
    // reset форми
    if (native.form) native.form.addEventListener('reset', function () { setTimeout(refresh, 0); });

    buildList();
    var api = { open: open, close: close, refresh: refresh, button: btn };
    native.customSelect = api;
    box.customSelect = api;
    return api;
  }
  $$('[data-select]').forEach(initSelect);

  /* ==========================================================================
     ОФОРМЛЕННЯ ЗАМОВЛЕННЯ
     ========================================================================== */
  var checkout = $('[data-checkout]');
  if (checkout) {
    // перемикання варіантів доставки / оплати; поля неактивних варіантів вимикаються
    $$('[data-options]', checkout).forEach(function (group) {
      var opts = $$('[data-opt]', group);
      function sync() {
        opts.forEach(function (o) {
          var on = $('.radio', o).checked;
          o.classList.toggle('is-active', on);
          $$('.ship-opt__body input, .ship-opt__body select', o).forEach(function (f) { f.disabled = !on; });
        });
      }
      group.addEventListener('change', function (e) { if (e.target.classList.contains('radio')) sync(); });
      sync();
    });
    // швидкий вибір міста
    checkout.addEventListener('click', function (e) {
      var b = e.target.closest('[data-city]');
      if (!b) return;
      var sel = checkout.querySelector('select[name="' + b.getAttribute('data-city-target') + '"]');
      if (sel) { sel.value = b.getAttribute('data-city'); sel.dispatchEvent(new Event('change', { bubbles: true })); }
    });
    // телефон: підставляємо код країни
    $$('[data-phone]', checkout).forEach(function (i) {
      i.addEventListener('focus', function () { if (!i.value) i.value = '+38 '; });
      i.addEventListener('blur', function () { if (i.value.trim() === '+38') i.value = ''; });
      // якщо код країни ввели ще раз або вставили номер з +38 — не дублюємо
      i.addEventListener('input', function () {
        var v = i.value.replace(/^\+38\s*\+?38\s*/, '+38 ').replace(/\s{2,}/g, ' ');
        if (v !== i.value) i.value = v;
      });
    });
    checkout.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!checkout.checkValidity()) {
        $$('.co-step', checkout).forEach(function (s) { s.classList.add('was-validated'); });
        var bad = checkout.querySelector(':invalid') || document.querySelector('[form="checkout-form"]:invalid');
        if (bad && bad.customSelect) {
          // кастомний select: показуємо поле і одразу відкриваємо список
          bad.customSelect.button.scrollIntoView({ block: 'center', behavior: 'instant' });
          bad.customSelect.button.focus({ preventScroll: true });
          bad.customSelect.open();
        } else if (bad) { bad.focus(); if (bad.reportValidity) bad.reportValidity(); }
        return;
      }
      // TODO: відправка замовлення та перехід на оплату
      var btn = document.querySelector('[data-checkout-submit]');
      if (btn) { btn.classList.add('is-done'); btn.textContent = 'Замовлення прийнято'; }
    });
  }
  /* ==========================================================================
     КАБІНЕТ
     ========================================================================== */
  // фільтр замовлень за статусом (на проді — запит із параметром ?status=)
  $$('[data-orders]').forEach(function (box) {
    var rows = $$('tbody tr[data-status]', box);
    var empty = $('[data-orders-empty]', box);
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter]');
      if (!b) return;
      var f = b.getAttribute('data-filter');
      $$('[data-filter]', box).forEach(function (x) {
        x.classList.toggle('is-active', x === b);
        x.setAttribute('aria-pressed', String(x === b));
      });
      var shown = 0;
      rows.forEach(function (r) {
        var on = f === 'all' || r.getAttribute('data-status') === f;
        r.hidden = !on;
        if (on) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    });
  });

  // копіювання реферального посилання
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var input = $('[data-copy-src]', btn.parentNode);
    if (!input) return;
    function done() {
      var old = btn.getAttribute('data-label') || btn.textContent;
      btn.setAttribute('data-label', old);
      btn.textContent = 'Скопійовано';
      btn.classList.add('is-done');
      setTimeout(function () { btn.textContent = old; btn.classList.remove('is-done'); }, 1600);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(input.value).then(done, function () { input.select(); document.execCommand('copy'); done(); });
    } else {
      input.select();
      try { document.execCommand('copy'); } catch (err) { /* ignore */ }
      done();
    }
  });

  // телефон у формах кабінету — той самий код країни, що й в оформленні
  $$('.account-page [data-phone], .contacts-page [data-phone], .verify-page [data-phone]').forEach(function (i) {
    i.addEventListener('focus', function () { if (!i.value) i.value = '+38 '; });
    i.addEventListener('blur', function () { if (i.value.trim() === '+38') i.value = ''; });
    i.addEventListener('input', function () {
      var v = i.value.replace(/^\+38\s*\+?38\s*/, '+38 ').replace(/\s{2,}/g, ' ');
      if (v !== i.value) i.value = v;
    });
  });

  // форми кабінету: перевірка і відгук кнопки
  $$('[data-acc-form]').forEach(function (form) {
    var pw = $('[name="password"]', form), pw2 = $('[name="password2"]', form);
    function samePw() {
      if (pw && pw2) pw2.setCustomValidity(pw2.value && pw.value !== pw2.value ? 'Паролі не збігаються' : '');
    }
    if (pw && pw2) { pw.addEventListener('input', samePw); pw2.addEventListener('input', samePw); }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      samePw();
      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        var bad = $(':invalid', form);
        if (bad) { bad.focus(); bad.reportValidity(); }
        return;
      }
      // TODO: збереження на бекенді
      var btn = $('button[type="submit"]', form);
      if (!btn) return;
      var old = btn.textContent;
      btn.classList.add('is-done');
      btn.textContent = form.getAttribute('data-done') || 'Збережено';
      setTimeout(function () { btn.classList.remove('is-done'); btn.textContent = old; }, 1600);
      if (form.hasAttribute('data-password-form') || form.hasAttribute('data-done')) form.reset();
    });
  });

  // адреси доставки: основна, редагування, видалення
  var addrBox = $('[data-addresses]');
  if (addrBox) {
    var addrForm = $('[data-addr-form]');
    var syncMain = function () {
      $$('[data-addr]', addrBox).forEach(function (card, i) {
        var on = $('.radio', card).checked;
        card.classList.toggle('is-main', on);
        $('.addr-card__label', card).textContent = on ? 'Основна адреса' : 'Адреса №' + (i + 1);
      });
    };
    addrBox.addEventListener('change', function (e) { if (e.target.classList.contains('radio')) syncMain(); });
    addrBox.addEventListener('click', function (e) {
      var card = e.target.closest('[data-addr]');
      if (!card) return;
      if (e.target.closest('[data-addr-edit]') && addrForm) {
        // TODO: підставити дані вибраної адреси у форму
        addrForm.hidden = false;
        addrForm.scrollIntoView({ block: 'nearest', behavior: reduceMotion ? 'auto' : 'smooth' });
        var first = $('input', addrForm);
        if (first) first.focus({ preventScroll: true });
      }
      if (e.target.closest('[data-addr-delete]')) {
        // TODO: видалення на бекенді
        var wasMain = card.classList.contains('is-main');
        card.classList.add('is-removing');
        setTimeout(function () {
          card.parentNode.removeChild(card);
          var rest = $$('[data-addr]', addrBox);
          if (wasMain && rest[0]) $('.radio', rest[0]).checked = true;
          syncMain();
        }, reduceMotion ? 0 : 250);
      }
    });
    if (addrForm) {
      $$('[data-addr-cancel]', addrForm).forEach(function (b) {
        b.addEventListener('click', function () { addrForm.hidden = true; });
      });
    }
  }
  /* ==========================================================================
     ВХІД / РЕЄСТРАЦІЯ
     Відкривається з будь-якого [data-auth-open] (значення "register" — одразу вкладка реєстрації).
     У кабінеті (користувач уже увійшов) посилання працюють як звичайні.
     ========================================================================== */
  var auth = $('[data-auth]');
  if (auth && typeof auth.showModal === 'function' && !document.body.classList.contains('page-account')) {
    var tabs = $$('[data-auth-tab]', auth);
    var setTab = function (name, focus) {
      tabs.forEach(function (t) {
        var on = t.getAttribute('data-auth-tab') === name;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        $('#' + t.getAttribute('aria-controls')).hidden = !on;
        if (on && focus) t.focus();
      });
    };
    var openAuth = function (tab) {
      if ($('[data-drawer]') && !$('[data-drawer]').hidden) closeDrawer();
      setTab(tab === 'register' ? 'register' : 'login');
      document.documentElement.classList.add('has-modal');
      auth.showModal();
      var first = $('.auth__panel:not([hidden]) input', auth);
      if (first) first.focus();
    };
    var closeAuth = function () { auth.close(); };

    document.addEventListener('click', function (e) {
      var a = e.target.closest('[data-auth-open]');
      if (!a) return;
      e.preventDefault();
      openAuth(a.getAttribute('data-auth-open'));
    });
    auth.addEventListener('close', function () { document.documentElement.classList.remove('has-modal'); });
    $$('[data-auth-close]', auth).forEach(function (b) { b.addEventListener('click', closeAuth); });
    // клік по затемненню поза вікном
    auth.addEventListener('click', function (e) {
      if (e.target !== auth) return;
      var r = auth.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeAuth();
    });
    // вкладки: клік і стрілки
    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { setTab(t.getAttribute('data-auth-tab')); });
      t.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
        setTab(n.getAttribute('data-auth-tab'), true);
      });
    });
    // телефон: код країни
    $$('[data-phone]', auth).forEach(function (i) {
      i.addEventListener('focus', function () { if (!i.value) i.value = '+38 '; });
      i.addEventListener('blur', function () { if (i.value.trim() === '+38') i.value = ''; });
      i.addEventListener('input', function () {
        var v = i.value.replace(/^\+38\s*\+?38\s*/, '+38 ').replace(/\s{2,}/g, ' ');
        if (v !== i.value) i.value = v;
      });
    });
    // поки без бекенда: «Увійти» і «Створити акаунт» одразу ведуть у кабінет.
    // TODO: вхід / реєстрація на бекенді (перевірка полів — form.checkValidity(), стилі .was-validated вже є)
    $$('[data-auth-form]', auth).forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        window.location.href = 'account.html';
      });
    });
    // TODO: сторінка / крок відновлення пароля (макета немає)
    $$('.auth__link', auth).forEach(function (l) { l.addEventListener('click', function (e) { e.preventDefault(); }); });
  }
  /* ---------- FAQ: фільтр за темою ---------- */
  $$('[data-faq]').forEach(function (box) {
    var items = $$('.faq-item', box);
    var empty = $('[data-faq-empty]', box);
    box.addEventListener('click', function (e) {
      var b = e.target.closest('[data-filter]');
      if (!b) return;
      var f = b.getAttribute('data-filter'), shown = 0;
      $$('[data-filter]', box).forEach(function (x) {
        x.classList.toggle('is-active', x === b);
        x.setAttribute('aria-pressed', String(x === b));
      });
      items.forEach(function (it) {
        var on = f === 'all' || (' ' + it.getAttribute('data-cat') + ' ').indexOf(' ' + f + ' ') !== -1;
        it.hidden = !on;
        if (!on) it.open = false;
        if (on) shown++;
      });
      if (empty) empty.hidden = shown > 0;
    });
  });
  /* ---------- Верифікація майстра ---------- */
  var vForm = $('[data-verify]');
  if (vForm) {
    var dz = $('[data-dropzone]', vForm);
    var fileInput = $('.dropzone__input', dz);
    var zone = $('.dropzone', dz);
    var list = $('.dropzone__files', dz);
    var errBox = $('.dropzone__error', dz);
    var MAX_SIZE = 10 * 1024 * 1024, MAX_FILES = 5;
    var OK_TYPE = /\.(jpe?g|png|pdf)$/i;
    var store = [];
    var canSet = typeof DataTransfer === 'function';

    var fmtSize = function (b) {
      return b >= 1048576 ? (b / 1048576).toFixed(1).replace('.', ',') + ' МБ' : Math.max(1, Math.round(b / 1024)) + ' КБ';
    };
    var esc = function (t) {
      return t.replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; });
    };
    var syncFiles = function () {
      if (canSet) {
        try {
          var dt = new DataTransfer();
          store.forEach(function (f) { dt.items.add(f); });
          fileInput.files = dt.files;
        } catch (err) { canSet = false; }
      }
      list.hidden = !store.length;
      list.innerHTML = store.map(function (f, i) {
        return '<li class="dropzone__file"><span class="dropzone__file-name">' + esc(f.name) + '</span><span class="dropzone__file-size">' + fmtSize(f.size) + '</span>' +
          (canSet ? '<button class="dropzone__remove" type="button" data-remove="' + i + '" aria-label="Видалити ' + esc(f.name) + '"><svg class="icon" aria-hidden="true"><use href="#i-x-small"></use></svg></button>' : '') + '</li>';
      }).join('');
      zone.classList.remove('is-invalid');
    };
    var showError = function (msg) {
      errBox.textContent = msg || '';
      errBox.hidden = !msg;
    };

    fileInput.addEventListener('change', function () {
      var picked = Array.prototype.slice.call(fileInput.files);
      if (!canSet) store = [];
      var errors = [];
      picked.forEach(function (f) {
        if (!OK_TYPE.test(f.name)) { errors.push('«' + f.name + '» — непідтримуваний формат'); return; }
        if (f.size > MAX_SIZE) { errors.push('«' + f.name + '» — більше 10 МБ'); return; }
        if (store.some(function (s) { return s.name === f.name && s.size === f.size; })) return;
        if (store.length >= MAX_FILES) { errors.push('Не більше ' + MAX_FILES + ' файлів'); return; }
        store.push(f);
      });
      showError(errors.filter(function (e, i, a) { return a.indexOf(e) === i; }).join('. '));
      syncFiles();
    });
    list.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-remove]');
      if (!btn) return;
      store.splice(+btn.getAttribute('data-remove'), 1);
      syncFiles();
      showError('');
      fileInput.focus();
    });
    ['dragenter', 'dragover'].forEach(function (ev) {
      zone.addEventListener(ev, function () { zone.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      zone.addEventListener(ev, function () { zone.classList.remove('is-over'); });
    });

    vForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!vForm.checkValidity()) {
        vForm.classList.add('was-validated');
        if (!fileInput.files.length) zone.classList.add('is-invalid');
        var bad = $(':invalid', vForm);
        if (bad) { bad.focus(); bad.reportValidity(); }
        return;
      }
      // TODO: відправка заявки на бекенд (FormData з файлами), після успіху — у кабінет на сторінку статусу
      var btn = $('.vf-form__submit', vForm);
      btn.disabled = true;
      btn.textContent = 'Надсилаємо…';
      setTimeout(function () { window.location.href = vForm.getAttribute('action'); }, 500);
    });
  }
  /* ---------- Мінікошик ----------
     Поки без бекенда: локальний кошик у localStorage (на першому візиті — ті самі 3 товари, що й на cart.html).
     TODO: на CMS — дані й дії з API кошика; cart.html теж рендериться з нього. */
  var mini = $('[data-minicart]');
  var CART_KEY = 'tc-cart', FREE_SHIP = 2000;
  var cart = (function () {
    try { var v = JSON.parse(localStorage.getItem(CART_KEY)); if (Array.isArray(v)) return v; } catch (err) { /* приватний режим */ }
    return [
      { id: 'demo-1', brand: 'Tiarecolor', name: 'Крем-фарба для волосся 100 мл, тон 7.0', price: 980, old: 0, img: 'assets/img/products/fanola-color-mask-pink.webp', qty: 1 },
      { id: 'demo-2', brand: 'Tiarecolor', name: 'Флюїд для реконструкції волосся з маслом аргана і кератином, 60 мл', price: 1200, old: 1680, img: 'assets/img/products/rr-argan-oil.webp', qty: 1 },
      { id: 'demo-3', brand: 'Tiarecolor', name: 'Золотиста маска для догляду за волоссям, об’єм 300 мл', price: 2500, old: 3250, img: 'assets/img/products/fanola-oro-therapy-mask.webp', qty: 1 }
    ];
  })();
  var saveCart = function () { try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (err) { /* ігноруємо */ } };
  var grn = function (n) { return Math.round(n) + ' грн'; };
  var escHtml = function (t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var cartCount = function () { return cart.reduce(function (n, it) { return n + it.qty; }, 0); };
  var cartSum = function () { return cart.reduce(function (n, it) { return n + it.qty * it.price; }, 0); };
  var goodsWord = function (n) {
    var a = n % 10, b = n % 100;
    return a === 1 && b !== 11 ? 'товар' : (a >= 2 && a <= 4 && (b < 12 || b > 14) ? 'товари' : 'товарів');
  };

  function cardItem(card) {
    var img = $('.product-card__img', card), title = $('.product-card__title', card);
    var num = function (el) { return el ? parseInt(el.textContent.replace(/\D/g, ''), 10) || 0 : 0; };
    var src = img ? img.getAttribute('src') : '';
    var name = title ? title.textContent.trim() : '';
    return { id: src + '|' + name, brand: ($('.product-card__brand', card) || { textContent: '' }).textContent.trim(), name: name,
      price: num($('.price__current', card)), old: num($('.price__old', card)), img: src, qty: 1 };
  }
  function renderBadge(bump) {
    var n = cartCount();
    $$('[data-cart-count]').forEach(function (b) {
      b.hidden = !n;
      b.textContent = n > 99 ? '99+' : n;
      if (bump && !reduceMotion) { b.classList.remove('is-bump'); void b.offsetWidth; b.classList.add('is-bump'); }
    });
  }
  function renderMini(newId) {
    if (!mini) return;
    var n = cartCount(), sum = cartSum(), left = FREE_SHIP - sum;
    $('[data-minicart-count]', mini).textContent = n ? '(' + n + ')' : '';
    $('[data-minicart-list]', mini).innerHTML = cart.map(function (it, i) {
      var name = escHtml(it.name);
      return '<li class="minicart__item' + (it.id === newId ? ' is-new' : '') + '">' +
        '<a class="minicart__img" href="product.html" tabindex="-1" aria-hidden="true"><img src="' + escHtml(it.img) + '" alt="" width="64" height="64" loading="lazy"></a>' +
        '<div><div class="minicart__brand">' + escHtml(it.brand) + '</div><a class="minicart__name" href="product.html">' + name + '</a></div>' +
        '<div class="minicart__row"><div class="qty">' +
          '<button class="qty__btn" type="button" data-qty-minus data-mini="minus" data-i="' + i + '" aria-label="Менше: ' + name + '"><svg class="icon icon--minus" aria-hidden="true"><use href="#i-minus"></use></svg></button>' +
          '<input class="qty__input" type="number" inputmode="numeric" min="1" max="999" value="' + it.qty + '" data-mini="qty" data-i="' + i + '" aria-label="Кількість: ' + name + '">' +
          '<button class="qty__btn" type="button" data-qty-plus data-mini="plus" data-i="' + i + '" aria-label="Більше: ' + name + '"><svg class="icon icon--plus" aria-hidden="true"><use href="#i-plus"></use></svg></button>' +
        '</div><div class="minicart__price">' + grn(it.price * it.qty) + (it.old > it.price ? '<s>' + grn(it.old * it.qty) + '</s>' : '') + '</div>' +
        '<button class="minicart__remove" type="button" data-mini="remove" data-i="' + i + '" aria-label="Видалити: ' + name + '"><svg class="icon icon--trash" aria-hidden="true"><use href="#i-trash"></use></svg></button></div></li>';
    }).join('');
    $('[data-minicart-list]', mini).hidden = !n;
    $('[data-minicart-empty]', mini).hidden = !!n;
    $('[data-minicart-foot]', mini).hidden = !n;
    $('[data-minicart-ship]', mini).hidden = !n;
    $('[data-minicart-total]', mini).textContent = grn(sum);
    $('[data-minicart-ship-text]', mini).innerHTML = left > 0
      ? 'До безкоштовної доставки залишилось <b>' + grn(left) + '</b>'
      : 'Вам доступна <b>безкоштовна доставка</b> Новою Поштою';
    $('[data-minicart-ship-bar]', mini).style.width = Math.min(100, sum / FREE_SHIP * 100) + '%';
  }
  var miniOpener = null;
  function openMini() {
    if (!mini) return;
    if (!mini.hidden) return;
    setMega(false); closeDrawer();
    miniOpener = document.activeElement;
    mini.hidden = false;
    showOverlay('cart');
    $$('[data-minicart-open]').forEach(function (a) { a.setAttribute('aria-expanded', 'true'); });
    $('[data-minicart-close]', mini).focus({ preventScroll: true });
  }
  function closeMini() {
    if (!mini || mini.hidden) return;
    mini.hidden = true;
    $$('[data-minicart-open]').forEach(function (a) { a.setAttribute('aria-expanded', 'false'); });
    if (openLayer === 'cart') hideOverlay();
    miniOpener && miniOpener.focus && miniOpener.focus({ preventScroll: true });
  }
  function addToCart(item, quiet) {
    var same = cart.filter(function (c) { return c.id === item.id; })[0];
    if (same) same.qty = Math.min(999, same.qty + item.qty);
    else cart.unshift(item);
    saveCart();
    if (quiet) return;
    renderBadge(true); renderMini(item.id);
    openMini();
  }
  renderBadge(false);
  if (mini) {
    renderMini();
    // на сторінках кошика й оформлення іконка просто веде на сторінку
    var onCartPage = /page-(cart|checkout)/.test(document.body.className);
    $$('[data-minicart-open]').forEach(function (a) {
      a.setAttribute('aria-expanded', 'false');
      if (onCartPage) return;
      a.addEventListener('click', function (e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey) return;
        e.preventDefault();
        openMini();
      });
    });
    $('[data-minicart-close]', mini).addEventListener('click', closeMini);
    var miniList = $('[data-minicart-list]', mini);
    var setQty = function (i, v) {
      if (!cart[i]) return;
      cart[i].qty = Math.max(1, Math.min(999, v || 1));
      saveCart(); renderBadge(false); renderMini();
      var inp = $('[data-mini="qty"][data-i="' + i + '"]', miniList);
      return inp;
    };
    miniList.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mini]');
      if (!b || b.tagName === 'INPUT') return;
      var i = +b.getAttribute('data-i'), act = b.getAttribute('data-mini');
      if (act === 'remove') {
        cart.splice(i, 1); saveCart(); renderBadge(false); renderMini();
        var next = $('[data-mini="remove"]', miniList) || $('[data-minicart-close]', mini);
        next.focus({ preventScroll: true });
        return;
      }
      var focusAfter = setQty(i, cart[i].qty + (act === 'plus' ? 1 : -1));
      var again = $('[data-mini="' + act + '"][data-i="' + i + '"]', miniList);
      (again || focusAfter) && (again || focusAfter).focus({ preventScroll: true });
    });
    miniList.addEventListener('change', function (e) {
      var inp = e.target.closest('[data-mini="qty"]');
      if (inp) setQty(+inp.getAttribute('data-i'), parseInt(inp.value, 10));
    });
    // зміни в іншій вкладці
    window.addEventListener('storage', function (e) {
      if (e.key !== CART_KEY) return;
      try { cart = JSON.parse(e.newValue) || []; } catch (err) { cart = []; }
      renderBadge(false); renderMini();
    });
  }

  /* ---------- Збільшення фото товару (лайтбокс) ---------- */
  $$('[data-gallery]').forEach(function (g) {
    var main = $('[data-gallery-main]', g);
    var thumbs = $$('[data-gallery-thumb]', g);
    if (!main || typeof HTMLDialogElement !== 'function') return;
    var srcs = thumbs.length ? thumbs.map(function (t) { return t.getAttribute('data-full'); }) : [main.getAttribute('src')];
    var alt = main.getAttribute('alt') || '';
    var lb, img, count, idx = 0, zoomed = false, base = null, ox = 0.5, oy = 0.5, SCALE = 2.2;
    var activeIndex = function () { var i = thumbs.findIndex(function (t) { return t.classList.contains('is-active'); }); return i < 0 ? 0 : i; };

    function setOrigin(x, y) {
      ox = Math.max(0, Math.min(1, x)); oy = Math.max(0, Math.min(1, y));
      img.style.transformOrigin = (ox * 100) + '% ' + (oy * 100) + '%';
    }
    function setZoom(on, cx, cy) {
      zoomed = on;
      if (on) {
        base = img.getBoundingClientRect();
        setOrigin((cx - base.left) / base.width, (cy - base.top) / base.height);
        img.style.transform = 'scale(' + SCALE + ')';
      } else {
        img.style.transform = '';
      }
      img.classList.toggle('is-zoomed', on);
      lb.classList.toggle('is-zoomed', on);
      img.setAttribute('aria-label', on ? 'Зменшити фото' : 'Збільшити фото');
    }
    function show(i) {
      idx = (i + srcs.length) % srcs.length;
      if (zoomed) setZoom(false);
      img.classList.add('is-fading');
      var next = srcs[idx];
      var pre = new Image();
      pre.onload = pre.onerror = function () { img.src = next; img.classList.remove('is-fading'); };
      pre.src = next;
      count.textContent = (idx + 1) + ' / ' + srcs.length;
      $$('.lightbox__thumb', lb).forEach(function (t, k) { t.setAttribute('aria-current', String(k === idx)); });
      [idx + 1, idx - 1].forEach(function (k) { (new Image()).src = srcs[(k + srcs.length) % srcs.length]; });
    }
    function build() {
      lb = document.createElement('dialog');
      lb.className = 'lightbox';
      lb.setAttribute('aria-label', 'Фото товару');
      var many = srcs.length > 1;
      lb.innerHTML =
        '<div class="lightbox__bar"><span class="lightbox__count" aria-live="polite"></span>' +
        '<button class="lightbox__close" type="button" aria-label="Закрити"><svg class="icon icon--close" aria-hidden="true"><use href="#i-close"></use></svg></button></div>' +
        '<div class="lightbox__stage">' +
          (many ? '<button class="lightbox__arrow lightbox__arrow--prev" type="button" aria-label="Попереднє фото"><svg class="icon" aria-hidden="true"><use href="#i-arrow-thin-left"></use></svg></button>' : '') +
          '<img class="lightbox__img" src="" alt="' + escHtml(alt) + '" draggable="false">' +
          (many ? '<button class="lightbox__arrow lightbox__arrow--next" type="button" aria-label="Наступне фото"><svg class="icon" aria-hidden="true"><use href="#i-arrow-thin-right"></use></svg></button>' : '') +
        '</div>' +
        (many ? '<div class="lightbox__thumbs">' + srcs.map(function (s, k) {
          return '<button class="lightbox__thumb" type="button" data-k="' + k + '" aria-label="Фото ' + (k + 1) + '"><img src="' + escHtml(s) + '" alt="" loading="lazy"></button>';
        }).join('') + '</div>' : '');
      document.body.appendChild(lb);
      img = $('.lightbox__img', lb); count = $('.lightbox__count', lb);
      var stage = $('.lightbox__stage', lb);
      $('.lightbox__close', lb).addEventListener('click', function () { lb.close(); });
      var prev = $('.lightbox__arrow--prev', lb), next = $('.lightbox__arrow--next', lb);
      prev && prev.addEventListener('click', function () { show(idx - 1); });
      next && next.addEventListener('click', function () { show(idx + 1); });
      $$('.lightbox__thumb', lb).forEach(function (t) { t.addEventListener('click', function () { show(+t.getAttribute('data-k')); }); });
      lb.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight') { e.preventDefault(); show(idx + 1); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); show(idx - 1); }
      });
      lb.addEventListener('close', function () {
        if (zoomed) setZoom(false);
        document.documentElement.classList.remove('has-modal');
        if (thumbs[idx] && !thumbs[idx].classList.contains('is-active')) thumbs[idx].click();
      });
      // миша: клік — збільшити/зменшити, рух — оглядати збільшене фото
      // дотик: подвійний тап — збільшити/зменшити, свайп — гортати, перетягування — оглядати збільшене
      var down = null, lastTap = 0;
      stage.addEventListener('pointerdown', function (e) {
        if (e.target.closest('button')) return;
        down = { x: e.clientX, y: e.clientY, ox: ox, oy: oy, id: e.pointerId, type: e.pointerType, moved: false };
        if (zoomed && e.pointerType !== 'mouse') { img.classList.add('is-panning'); stage.setPointerCapture(e.pointerId); }
      });
      stage.addEventListener('pointermove', function (e) {
        if (zoomed && e.pointerType === 'mouse' && base) {
          setOrigin((e.clientX - base.left) / base.width, (e.clientY - base.top) / base.height);
          return;
        }
        if (!down || e.pointerId !== down.id) return;
        var dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) down.moved = true;
        if (zoomed && base) setOrigin(down.ox - dx / (base.width * (SCALE - 1)), down.oy - dy / (base.height * (SCALE - 1)));
      });
      var up = function (e) {
        if (!down || e.pointerId !== down.id) return;
        var d = down; down = null;
        img.classList.remove('is-panning');
        var dx = e.clientX - d.x;
        if (!d.moved) {
          if (!e.target.closest('.lightbox__img')) { if (!zoomed && d.type === 'mouse') lb.close(); return; }
          if (d.type === 'mouse') { setZoom(!zoomed, e.clientX, e.clientY); return; }
          var now = Date.now();
          if (now - lastTap < 320) { setZoom(!zoomed, e.clientX, e.clientY); lastTap = 0; } else lastTap = now;
          return;
        }
        if (!zoomed && Math.abs(dx) > 50 && srcs.length > 1) show(idx + (dx < 0 ? 1 : -1));
      };
      stage.addEventListener('pointerup', up);
      stage.addEventListener('pointercancel', function () { down = null; img.classList.remove('is-panning'); });
      window.addEventListener('resize', function () { if (zoomed) setZoom(false); });
    }
    function open(i) {
      if (!lb) build();
      show(i);
      document.documentElement.classList.add('has-modal');
      lb.showModal();
    }
    var zoomBtn = $('[data-gallery-zoom]', g);
    zoomBtn && zoomBtn.addEventListener('click', function () { open(activeIndex()); });
    // клік (не перетягування) по головному фото теж відкриває перегляд
    var p0 = null;
    main.addEventListener('pointerdown', function (e) { p0 = { x: e.clientX, y: e.clientY }; });
    main.addEventListener('click', function (e) {
      if (p0 && (Math.abs(e.clientX - p0.x) > 6 || Math.abs(e.clientY - p0.y) > 6)) return;
      open(activeIndex());
    });
  });

  /* ---------- Відгуки: форма «Залишити відгук» і відповідь ---------- */
  var reviewDlg = $('[data-review-dialog]');
  if (reviewDlg && typeof reviewDlg.showModal === 'function') {
    var rForm = $('[data-review-form]', reviewDlg), rDone = $('[data-review-done]', reviewDlg);
    var rStars = $('.rate__stars', reviewDlg), rHint = $('[data-rate-hint]', reviewDlg), rBox = $('[data-rate]', reviewDlg);
    var HINTS = ['Погано', 'Так собі', 'Нормально', 'Добре', 'Відмінно'];
    var rValue = function () { var c = $('input:checked', rStars); return c ? +c.value : 0; };
    var rShow = function (v) { if (v) rStars.setAttribute('data-show', v); else rStars.removeAttribute('data-show'); rHint.textContent = v ? HINTS[v - 1] : 'Оберіть оцінку'; };
    $$('label', rStars).forEach(function (l, i) { l.addEventListener('mouseenter', function () { rShow(i + 1); }); });
    rStars.addEventListener('mouseleave', function () { rShow(rValue()); });
    rStars.addEventListener('change', function () { rShow(rValue()); rBox.classList.remove('is-invalid'); });
    var openReview = function () {
      rForm.hidden = false; rDone.hidden = true;
      document.documentElement.classList.add('has-modal');
      reviewDlg.showModal();
    };
    $$('[data-review-open]').forEach(function (b) { b.addEventListener('click', openReview); });
    reviewDlg.addEventListener('close', function () { document.documentElement.classList.remove('has-modal'); });
    $$('[data-modal-close]', reviewDlg).forEach(function (b) { b.addEventListener('click', function () { reviewDlg.close(); }); });
    reviewDlg.addEventListener('click', function (e) {
      if (e.target !== reviewDlg) return;
      var r = reviewDlg.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) reviewDlg.close();
    });
    rForm.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!rForm.checkValidity()) {
        rForm.classList.add('was-validated');
        rBox.classList.toggle('is-invalid', !rValue());
        if (!rValue()) rHint.textContent = 'Оберіть оцінку від 1 до 5';
        var bad = $('input:invalid, textarea:invalid', rForm);
        if (bad) bad.focus();
        return;
      }
      // TODO: відправка відгуку на бекенд (FormData(rForm)), публікація після модерації
      rForm.hidden = true; rDone.hidden = false;
      rForm.reset(); rForm.classList.remove('was-validated'); rShow(0);
      $('button', rDone).focus();
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-review-reply]');
    if (!b) return;
    var rv = b.closest('.p-review');
    var form = $('.reply-form', rv);
    if (form) { form.remove(); b.setAttribute('aria-expanded', 'false'); return; }
    var done = $('.reply-done', rv);
    done && done.remove();
    form = document.createElement('form');
    form.className = 'reply-form';
    form.noValidate = true;
    form.innerHTML =
      '<label class="field"><span class="visually-hidden">Ваша відповідь</span><textarea name="reply" rows="3" minlength="2" placeholder="Ваша відповідь…" required></textarea></label>' +
      '<div class="reply-form__row"><label class="field reply-form__name"><span class="visually-hidden">Ваше ім’я</span><input type="text" name="name" autocomplete="given-name" placeholder="Ваше ім’я" required></label>' +
      '<button class="btn btn--dark btn--sm" type="submit">Надіслати</button><button class="reply-form__cancel" type="button">Скасувати</button></div>';
    rv.appendChild(form);
    b.setAttribute('aria-expanded', 'true');
    $('textarea', form).focus();
    $('.reply-form__cancel', form).addEventListener('click', function () { form.remove(); b.setAttribute('aria-expanded', 'false'); b.focus(); });
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!form.checkValidity()) { form.classList.add('was-validated'); $(':invalid', form).focus(); return; }
      // TODO: відправка відповіді на бекенд
      var note = document.createElement('p');
      note.className = 'reply-done';
      note.setAttribute('role', 'status');
      note.textContent = 'Дякуємо! Відповідь з’явиться після перевірки модератором.';
      form.replaceWith(note);
      b.setAttribute('aria-expanded', 'false');
    });
  });

  /* ---------- Кнопка «Нагору» ---------- */
  var toTop = $('[data-to-top]');
  if (toTop) {
    toTop.hidden = false;
    var topTick = false;
    var updTop = function () {
      topTick = false;
      var on = window.scrollY > window.innerHeight * 1.2;
      toTop.classList.toggle('is-visible', on);
      toTop.tabIndex = on ? 0 : -1;
      toTop.setAttribute('aria-hidden', String(!on));
    };
    window.addEventListener('scroll', function () { if (!topTick) { topTick = true; requestAnimationFrame(updTop); } }, { passive: true });
    updTop();
    toTop.addEventListener('click', function () {
      scrollToY(0);
      var logo = $('.header__logo');
      logo && logo.focus({ preventScroll: true });
    });
  }

  /* ---------- Якірні посилання при плавній прокрутці ---------- */
  if (lenis) {
    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      var a = e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href').slice(1);
      var target = id && document.getElementById(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -16 });
      if (a.classList.contains('skip-link')) { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }
    });
  }
  /* ---------- Обране (кабінет) ----------
     Сердечко на картці прибирає товар зі списку; «Усе в кошик» кладе всі товари в мінікошик.
     TODO: на CMS — список і видалення через API обраного. */
  var favPage = $('[data-fav-page]');
  if (favPage) {
    var favGrid = $('[data-fav-grid]', favPage), favEmpty = $('[data-fav-empty]', favPage);
    var favCount = $('[data-fav-count]', favPage), favAll = $('[data-fav-all]', favPage);
    var favSync = function () {
      var n = $$('.product-card', favGrid).length;
      favCount.textContent = '(' + n + ')';
      favGrid.hidden = !n; favAll.hidden = !n; favEmpty.hidden = n > 0;
    };
    favGrid.addEventListener('click', function (e) {
      var heart = e.target.closest('.product-card__fav');
      if (!heart) return;
      e.stopPropagation();   // не перемикати сердечко глобальним обробником — картку прибираємо
      var card = heart.closest('.product-card');
      var cards = $$('.product-card', favGrid), i = cards.indexOf(card);
      card.classList.add('is-removing');
      setTimeout(function () {
        card.remove();
        favSync();
        var rest = $$('.product-card__fav', favGrid);
        var next = rest[Math.min(i, rest.length - 1)] || $('.btn', favEmpty);
        next && next.focus({ preventScroll: true });
      }, reduceMotion ? 0 : 320);
    });
    favAll.addEventListener('click', function () {
      $$('.product-card', favGrid).forEach(function (c) { addToCart(cardItem(c), true); });
      renderBadge(true); renderMini(); openMini();
    });
  }

  /* ---------- Анімації: поява блоків при прокрутці, лічильники ----------
     Те, що видно одразу, не чіпаємо (там CSS-анімація входу) — без мерехтіння.
     Групи (сітки карток, кроки, переваги) з’являються по черзі. */
  if (!reduceMotion && 'IntersectionObserver' in window) {
    var RV_BLOCK = ['.section-head', '.products-section .slider', '.categories', '.promo__inner', '.verify__inner', '.seo .container',
      '.brands', '.subscribe .container', '.product-tabs', '.p-reviews .section-title', '.rating-summary', '.about-intro', '.about-story',
      '.about-mission', '.contacts-band', '.contact-form', '.contacts-aside', '.info-section', '.vf-form', '.mp-cta', '.loy-title', '.loy-lead',
      '.acc-card', '.discount-banner', '.otable-wrap', '.fav__empty', '.catalog-head', '.filter-pills'].join(',');
    var RV_GROUP = ['.catalog__grid', '.advantages__list', '.reviews__list', '.insta__grid', '.about-stats', '.info-steps', '.loy-levels',
      '.loy-terms', '.mp-perks', '.faq-list', '.p-reviews__list', '.acc-stats', '.addr-grid', '.fav__grid'].join(',');
    var fold = window.innerHeight * 0.92;
    var below = function (el) { var r = el.getBoundingClientRect(); return r.height > 0 && r.top > fold; };
    var marked = [];
    $$(RV_BLOCK + ',' + RV_GROUP).forEach(function (el) {
      if (el.closest('[data-rv-done]') || el.closest('.rv')) return;
      el.setAttribute('data-rv-done', '');
      var items = el.matches(RV_GROUP) ? Array.prototype.slice.call(el.children).filter(function (c) {
        return !c.hasAttribute('data-clone') && !c.classList.contains('info-steps__arrow');
      }) : [el];
      items.forEach(function (it) { if (below(it)) { it.classList.add('rv'); marked.push(it); } });
    });
    var rvIO = new IntersectionObserver(function (entries) {
      var hits = entries.filter(function (en) { return en.isIntersecting; }).map(function (en) { return en.target; });
      hits.sort(function (a, b) {
        var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
        return (ra.top - rb.top) || (ra.left - rb.left);
      });
      hits.forEach(function (el, k) {
        rvIO.unobserve(el);
        el.style.setProperty('--rv-d', Math.min(k, 6) * 0.08 + 's');
        el.classList.add('is-in');
        // після появи прибираємо службові класи — повертаються «рідні» transition елемента
        setTimeout(function () { el.classList.remove('rv', 'is-in'); el.style.removeProperty('--rv-d'); }, 1000 + Math.min(k, 6) * 80);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    marked.forEach(function (el) { rvIO.observe(el); });

    // лічильники: «500+», «1200+», «100%» набігають від нуля, коли видно
    var counters = $$('.about-stat__value');
    if (counters.length) {
      var cIO = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          cIO.unobserve(en.target);
          var el = en.target, txt = el.textContent, m = txt.match(/\d[\d\s]*/);
          if (!m) return;
          var target = parseInt(m[0].replace(/\s/g, ''), 10), pre = txt.slice(0, m.index), post = txt.slice(m.index + m[0].length);
          var t0 = null, dur = 1400;
          el.style.minWidth = el.offsetWidth + 'px';
          var step = function (t) {
            if (t0 === null) t0 = t;
            var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
            el.textContent = pre + Math.round(target * e) + post;
            if (p < 1) requestAnimationFrame(step); else { el.textContent = txt; el.style.minWidth = ''; }
          };
          requestAnimationFrame(step);
        });
      }, { threshold: 0.6 });
      counters.forEach(function (el) { cIO.observe(el); });
    }
  }
})();
