/* tiarecolor.ua — головна сторінка. Без залежностей. */
(function () {
  'use strict';

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Overlay / scroll lock ---------- */
  var overlay = $('[data-overlay]');
  var openLayer = null; // 'mega' | 'drawer'

  function showOverlay(kind) {
    overlay.hidden = false;
    overlay.classList.toggle('is-drawer', kind === 'drawer');
    document.body.classList.add('is-locked');
    openLayer = kind;
  }
  function hideOverlay() {
    overlay.hidden = true;
    overlay.classList.remove('is-drawer');
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
    drawerOpenBtn && drawerOpenBtn.setAttribute('aria-expanded', 'false');
    if (openLayer === 'drawer') hideOverlay();
    lastFocus && lastFocus.focus && lastFocus.focus();
  }
  drawerOpenBtn && drawerOpenBtn.addEventListener('click', openDrawer);
  $$('[data-drawer-close]').forEach(function (b) { b.addEventListener('click', closeDrawer); });

  overlay && overlay.addEventListener('click', function () { setMega(false); closeDrawer(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { setMega(false); closeDrawer(); }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth < 1024 && openLayer === 'mega') setMega(false);
  });

  /* ---------- Пошук на планшеті/мобільному ---------- */
  var searchToggle = $('[data-search-toggle]');
  var headerSearch = $('.header__search');
  if (searchToggle && headerSearch) {
    searchToggle.addEventListener('click', function (e) {
      e.preventDefault();
      var open = headerSearch.classList.toggle('is-open');
      if (open) $('input', headerSearch).focus();
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
      // TODO: інтеграція з кошиком CMS. Поки що — візуальний фідбек.
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
    });
    checkout.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!checkout.checkValidity()) {
        $$('.co-step', checkout).forEach(function (s) { s.classList.add('was-validated'); });
        var bad = checkout.querySelector(':invalid') || document.querySelector('[form="checkout-form"]:invalid');
        if (bad) { bad.focus(); if (bad.reportValidity) bad.reportValidity(); }
        return;
      }
      // TODO: відправка замовлення та перехід на оплату
      var btn = document.querySelector('[data-checkout-submit]');
      if (btn) { btn.classList.add('is-done'); btn.textContent = 'Замовлення прийнято'; }
    });
  }
})();
