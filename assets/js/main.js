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
  function initSlider(root, opts) {
    opts = opts || {};
    var track = $(opts.track || '[data-slider-track]', root);
    var prev = $(opts.prev || '[data-slider-prev]', root);
    var next = $(opts.next || '[data-slider-next]', root);
    var dotsWrap = $(opts.dots || '[data-slider-dots]', root);
    if (!track) return null;

    var pages = 1;
    var dots = [];

    function step() {
      var item = track.firstElementChild;
      if (!item) return track.clientWidth;
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      var itemW = item.getBoundingClientRect().width + gap;
      var visible = opts.full ? 1 : Math.max(1, Math.floor((track.clientWidth - gap) / itemW));
      return opts.full ? track.clientWidth : itemW * visible;
    }
    function maxScroll() { return Math.max(0, track.scrollWidth - track.clientWidth); }
    function current() {
      var max = maxScroll();
      if (max <= 1) return 0;
      if (track.scrollLeft >= max - 2) return pages - 1;
      return Math.round(track.scrollLeft / step());
    }
    function goTo(i) {
      i = Math.max(0, Math.min(pages - 1, i));
      var left = i === pages - 1 ? maxScroll() : i * step();
      track.scrollTo({ left: left, behavior: reduceMotion ? 'auto' : 'smooth' });
    }
    function buildDots() {
      var max = maxScroll();
      pages = max <= 1 ? 1 : Math.ceil(max / step()) + 1;
      if (opts.full) pages = track.children.length;
      if (!dotsWrap) return;
      dotsWrap.innerHTML = '';
      dots = [];
      if (pages < 2) return;
      for (var i = 0; i < pages; i++) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'dots__btn';
        b.setAttribute('aria-label', 'Сторінка ' + (i + 1));
        b.addEventListener('click', goTo.bind(null, i));
        dotsWrap.appendChild(b);
        dots.push(b);
      }
    }
    function update() {
      var i = current();
      dots.forEach(function (d, k) {
        d.classList.toggle('is-active', k === i);
        d.setAttribute('aria-current', k === i ? 'true' : 'false');
      });
      if (!opts.loop) {
        if (prev) prev.disabled = track.scrollLeft <= 2;
        if (next) next.disabled = track.scrollLeft >= maxScroll() - 2;
      }
      opts.onChange && opts.onChange(i);
    }

    prev && prev.addEventListener('click', function () {
      var i = current();
      goTo(opts.loop && i === 0 ? pages - 1 : i - 1);
    });
    next && next.addEventListener('click', function () {
      var i = current();
      goTo(opts.loop && i === pages - 1 ? 0 : i + 1);
    });

    var raf = 0;
    track.addEventListener('scroll', function () {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', function () { buildDots(); update(); });

    buildDots();
    update();
    return { goTo: goTo, current: current, pages: function () { return pages; } };
  }

  $$('[data-slider]').forEach(function (s) { initSlider(s); });

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
      var i = heroApi.current();
      heroApi.goTo(i >= heroApi.pages() - 1 ? 0 : i + 1);
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
    // свайп по головному фото
    var x0 = null;
    main && main.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    main && main.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) < 40) return;
      var i = thumbs.findIndex(function (t) { return t.classList.contains('is-active'); });
      var n = (i + (dx < 0 ? 1 : -1) + thumbs.length) % thumbs.length;
      show(thumbs[n]);
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
    function set(v) { input.value = Math.max(min, Math.min(max, v || min)); }
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
    function activate(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
    }
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
})();
