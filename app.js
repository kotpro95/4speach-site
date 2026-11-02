/* 4Speach — переключатель языка, определение страны и форма.
   Текст страниц собран заранее: каждый язык лежит на своём адресе (/ru/, /de/ …),
   английский — в корне. Скрипт только переводит посетителя на нужный адрес. */
(function () {
  'use strict';

  var LANGS = [
    { c: 'en', name: 'English' },    { c: 'ru', name: 'Русский' },
    { c: 'de', name: 'Deutsch' },    { c: 'fr', name: 'Français' },
    { c: 'es', name: 'Español' },    { c: 'it', name: 'Italiano' },
    { c: 'pt', name: 'Português' },  { c: 'nl', name: 'Nederlands' },
    { c: 'pl', name: 'Polski' },     { c: 'uk', name: 'Українська' },
    { c: 'tr', name: 'Türkçe' },     { c: 'zh', name: '中文' },
    { c: 'ja', name: '日本語' },      { c: 'ko', name: '한국어' },
    { c: 'hi', name: 'हिन्दी' },        { c: 'ar', name: 'العربية' },
    { c: 'fa', name: 'فارسی' },       { c: 'kk', name: 'Қазақша' },
    { c: 'uz', name: "O‘zbekcha" },  { c: 'ka', name: 'ქართული' },
    { c: 'vi', name: 'Tiếng Việt' }
  ];

  /* Страна → язык страницы. Страны вне списка получают английский. */
  var GEO = {
    RU:'ru', BY:'ru', KG:'ru', TJ:'ru', MD:'ru', AM:'ru',
    UA:'uk',
    DE:'de', AT:'de', CH:'de', LI:'de',
    FR:'fr', BE:'fr', LU:'fr', MC:'fr', SN:'fr', CI:'fr',
    ES:'es', MX:'es', AR:'es', CO:'es', CL:'es', PE:'es', VE:'es', EC:'es',
    GT:'es', BO:'es', DO:'es', HN:'es', PY:'es', SV:'es', NI:'es', CR:'es',
    PA:'es', UY:'es', CU:'es',
    IT:'it', SM:'it',
    PT:'pt', BR:'pt', AO:'pt', MZ:'pt',
    NL:'nl', PL:'pl', TR:'tr',
    CN:'zh', TW:'zh', HK:'zh', MO:'zh', SG:'zh',
    JP:'ja', KR:'ko', IN:'hi',
    SA:'ar', AE:'ar', EG:'ar', IQ:'ar', JO:'ar', KW:'ar', QA:'ar', BH:'ar',
    OM:'ar', YE:'ar', SY:'ar', LB:'ar', LY:'ar', MA:'ar', DZ:'ar', TN:'ar', SD:'ar',
    IR:'fa', AF:'fa',
    KZ:'kk', UZ:'uz', GE:'ka', VN:'vi'
  };

  var CODES = LANGS.map(function (l) { return l.c; });
  var current = document.documentElement.lang || 'en';
  var atRoot = CODES.indexOf(current) < 0 || current === 'en';

  // На домене base = "/", в превью артефакта — относительный путь.
  var BASE = document.documentElement.getAttribute('data-base') || '/';
  function href(code) { return code === 'en' ? (BASE || './') : BASE + code + '/'; }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function read(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  /* ——— меню языков ——— */
  var menu = document.getElementById('langMenu');
  var btn = document.getElementById('langBtn');

  LANGS.forEach(function (l) {
    var a = document.createElement('a');
    a.href = href(l.c);
    a.setAttribute('role', 'option');
    a.setAttribute('aria-current', l.c === current ? 'true' : 'false');
    a.setAttribute('hreflang', l.c);
    a.innerHTML = '<span></span><span class="code"></span>';
    a.firstChild.textContent = l.name;
    a.lastChild.textContent = l.c;
    a.addEventListener('click', function () { store('4s.lang', l.c); });
    menu.appendChild(a);
  });

  btn.addEventListener('click', function () {
    var open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('click', function (e) {
    if (!menu.hidden && !menu.contains(e.target) && !btn.contains(e.target)) {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }
  });

  /* ——— определение языка: только в корне и только один раз ——— */
  function fromBrowser() {
    var list = navigator.languages || [navigator.language || ''];
    for (var i = 0; i < list.length; i++) {
      var tag = String(list[i]).toLowerCase();
      var primary = tag.split('-')[0];
      var region = tag.split('-')[1];
      if (region && GEO[region.toUpperCase()]) return GEO[region.toUpperCase()];
      if (CODES.indexOf(primary) >= 0) return primary;
    }
    return null;
  }

  /* Источник страны задаётся при сборке в <html data-geo>:
     "cf"      — /cdn-cgi/trace, свой же origin (только на Cloudflare);
     "php"     — /geo.php на своём хостинге (страна по IP);
     "browser" — страну не спрашиваем, хватает языка браузера (без лимитов и без сторонних запросов). */
  var GEO_SRC = document.documentElement.getAttribute('data-geo') || 'browser';

  function country() {
    if (GEO_SRC === 'browser') return Promise.resolve(null);
    var url = GEO_SRC === 'php' ? 'geo.php' : '/cdn-cgi/trace';
    return fetch(BASE + url.replace(/^\//, ''), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw 0; return r.text(); })
      .then(function (t) {
        var m = /(?:^|\n)loc=([A-Z]{2})/.exec(t) || /^\s*([A-Za-z]{2})\s*$/.exec(t);
        if (!m) throw 0;
        return m[1].toUpperCase();
      })
      .catch(function () { return null; });
  }

  function redirect() {
    if (!atRoot) return;                          // уже на языковой странице
    if (read('4s.lang')) {                        // посетитель выбрал язык сам
      var saved = read('4s.lang');
      if (saved !== current && CODES.indexOf(saved) >= 0) location.replace(href(saved));
      return;
    }
    var done = false;
    function go(code) {
      if (done) return;
      done = true;
      if (code && code !== 'en' && CODES.indexOf(code) >= 0) location.replace(href(code));
    }
    if (GEO_SRC === 'browser') {
      go(fromBrowser());
      return;
    }
    // Страна по IP. Если geo молчит (на хостинге нет модуля GeoIP) — берём язык
    // браузера: это точнее, чем всем подряд показывать английскую версию.
    setTimeout(function () { go(fromBrowser() || 'en'); }, 1200);
    country().then(function (cc) {
      if (done) return;
      if (cc && GEO[cc]) { go(GEO[cc]); return; }
      go(fromBrowser() || 'en');
    });
  }
  redirect();

  /* ——— форма ——— */
  /* Заявки уходят письмом через FormSubmit (formsubmit.co) на FORM_EMAIL.
     Пока адрес не задан, кнопка отправки выключена: форма не делает вид, что заявка ушла.
     После первой заявки FormSubmit пришлёт на этот адрес письмо с подтверждением — его нужно принять. */
  var FORM_EMAIL = '';
  var FORM_ENDPOINT = FORM_EMAIL ? 'https://formsubmit.co/ajax/' + FORM_EMAIL : '';

  var EMAIL_RE = /^[^\s@,;:"'<>()[\]\\]+@[^\s@.,;:"'<>()[\]\\]+(\.[^\s@.,;:"'<>()[\]\\]+)+$/;

  var form = document.getElementById('lead');
  if (form) {
    var note = document.getElementById('formnote');
    var base = note.textContent;
    var fields = {
      name: document.getElementById('lname'),
      country: document.getElementById('lcountry'),
      phone: document.getElementById('lphone'),
      tg: document.getElementById('ltg'),
      email: document.getElementById('email')
    };
    var all = [fields.name, fields.country, fields.phone, fields.tg, fields.email];
    var sendBtn = form.querySelector('button[type=submit]');
    if (!FORM_ENDPOINT && sendBtn) { sendBtn.disabled = true; }

    function say(text, cls) {
      note.textContent = text;
      note.className = 'fine' + (cls ? ' ' + cls : '');
    }

    function clearMarks() {
      for (var i = 0; i < all.length; i++) {
        all[i].classList.remove('bad');
        all[i].removeAttribute('aria-invalid');
      }
    }

    function fail(inputs, msgAttr, fallback) {
      clearMarks();
      for (var i = 0; i < inputs.length; i++) {
        inputs[i].classList.add('bad');
        inputs[i].setAttribute('aria-invalid', 'true');
      }
      say(note.getAttribute(msgAttr) || fallback, 'err-msg');
      inputs[0].focus();
    }

    for (var i = 0; i < all.length; i++) {
      all[i].addEventListener('input', function () {
        if (note.className.indexOf('err-msg') !== -1) {
          clearMarks();
          say(base, '');
        }
      });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = {};
      for (var k in fields) { v[k] = fields[k].value.trim(); }

      if (!v.name) {
        return fail([fields.name], 'data-ereq', 'Please fill in this field.');
      }
      if (!v.country) {
        return fail([fields.country], 'data-ereq', 'Please fill in this field.');
      }
      if (!v.phone && !v.tg && !v.email) {
        return fail([fields.phone, fields.tg, fields.email], 'data-econtact',
                    'Leave at least one way to reach you: phone, Telegram or email.');
      }
      if (v.email && (!EMAIL_RE.test(v.email) || v.email.length > 254)) {
        return fail([fields.email], 'data-err',
                    'Check the address: it should look like name@example.com.');
      }

      clearMarks();

      if (!FORM_ENDPOINT) { return; }
      var picked = form.querySelector('input[name=tariff]:checked');
      {
        var data = new FormData();
        data.append('tariff', picked ? picked.value : '');
        data.append('_subject', '4Speach: заявка, тариф ' + (picked ? picked.value : '-'));
        data.append('_template', 'table');
        data.append('_captcha', 'false');
        data.append('name', v.name);
        data.append('country', v.country);
        data.append('phone', v.phone);
        data.append('tg', v.tg);
        data.append('email', v.email);
        data.append('lang', document.documentElement.lang || '');
        data.append('page', location.href);
        data.append('ref', document.referrer || '');
        fetch(FORM_ENDPOINT, { method: 'POST', mode: 'no-cors', body: data })['catch'](function () {});
      }

      if (window.ym) { try { ym(113404000, 'reachGoal', 'lead'); } catch (err) {} }

      say(note.getAttribute('data-ok') ||
          'Done. The founder will contact you personally and help you install the software.', 'ok-msg');
      form.reset();
    });
  }

  /* ——— согласие на cookie ——— */
  var cc = document.getElementById('cookie');
  if (cc) {
    var KEY = '4s_consent';

    function remember(value) {
      try { localStorage.setItem(KEY, value); } catch (e) {}
      cc.hidden = true;
    }

    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) {}

    if (saved !== 'yes' && saved !== 'no') {
      cc.hidden = false;
    }

    document.getElementById('ccYes').addEventListener('click', function () {
      remember('yes');
      if (window.ymLoad) { window.ymLoad(); }
    });
    document.getElementById('ccNo').addEventListener('click', function () {
      remember('no');
    });
  }

})();
