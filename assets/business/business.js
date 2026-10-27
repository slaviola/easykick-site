/* EasyKick Business — script comune delle pagine /business/.
   - legge UTM e ?per=strutture|organizzatori (link di Instagram) e li
     conserva per la sessione, così arrivano nel modulo anche se il
     visitatore cambia pagina;
   - interruttore strutture/organizzatori (proposta A);
   - elenco funzioni con la schermata accanto;
   - modulo demo: invio a Web3Forms via fetch, con stati chiari e
     alternativa email se qualcosa va storto. */
(function () {
  'use strict';

  /* La chiave la genera il founder su web3forms.com (legata ad
     admin@easykick.it). Finché resta il segnaposto il modulo NON invia
     nulla a terzi: mostra subito l'alternativa email. */
  var ACCESS_KEY_PLACEHOLDER = 'WEB3FORMS_ACCESS_KEY';
  var ENDPOINT = 'https://api.web3forms.com/submit';
  var FALLBACK_EMAIL = 'admin@easykick.it';
  var TRACKED = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'per'];

  function session() { try { return window.sessionStorage; } catch (e) { return null; } }

  /* Parametri della campagna: prima l'URL, poi quello che avevamo salvato. */
  function readParams() {
    var out = {};
    var q;
    try { q = new URLSearchParams(window.location.search); } catch (e) { q = null; }
    var s = session();
    TRACKED.forEach(function (k) {
      var v = q ? q.get(k) : null;
      if (v) {
        v = v.replace(/[^\w\-.~ ]/g, '').slice(0, 80);
        out[k] = v;
        try { if (s) s.setItem('ek_biz_' + k, v); } catch (e) { /* storage bloccato */ }
      } else {
        try { var saved = s ? s.getItem('ek_biz_' + k) : null; if (saved) out[k] = saved; } catch (e) { /* idem */ }
      }
    });
    return out;
  }

  function audFromPer(per) {
    per = String(per || '').toLowerCase();
    if (per.indexOf('strutt') === 0) return 's';
    if (per.indexOf('organizz') === 0) return 'o';
    return null;
  }

  var params = readParams();

  /* I link interni tra le pagine business si portano dietro gli UTM
     (utile anche quando sessionStorage non c'è). */
  function carryParams() {
    var keys = Object.keys(params).filter(function (k) { return k !== 'per'; });
    if (!keys.length) return;
    document.querySelectorAll('a[data-carry]').forEach(function (a) {
      try {
        var u = new URL(a.getAttribute('href'), window.location.href);
        keys.forEach(function (k) { if (!u.searchParams.has(k)) u.searchParams.set(k, params[k]); });
        a.setAttribute('href', u.pathname + u.search + u.hash);
      } catch (e) { /* href non valido: lo lasciamo com'è */ }
    });
  }

  /* ── Elenco funzioni con schermata ─────────────────────────── */
  function initShots() {
    document.querySelectorAll('[data-shots]').forEach(function (list) {
      var img = document.getElementById(list.getAttribute('data-shots'));
      if (!img) return;
      list.addEventListener('click', function (e) {
        var b = e.target.closest('button[data-shot]');
        if (!b) return;
        list.querySelectorAll('button[data-shot]').forEach(function (x) {
          x.setAttribute('aria-pressed', String(x === b));
        });
        img.src = b.getAttribute('data-shot');
        img.alt = b.getAttribute('data-alt') || '';
      });
    });
  }
  function syncShot(list) {
    if (!list) return;
    var img = document.getElementById(list.getAttribute('data-shots'));
    var sel = list.querySelector('button[aria-pressed="true"]');
    if (img && sel) { img.src = sel.getAttribute('data-shot'); img.alt = sel.getAttribute('data-alt') || ''; }
  }

  /* ── Modulo demo ───────────────────────────────────────────── */
  var WHAT_LABEL = {
    s: 'Nome della struttura',
    o: "Nome dell'evento o dell'associazione",
    so: 'Nome della struttura o dell’evento'
  };
  var ROLE_SHORT = { s: 'Struttura', o: 'Organizzatore', so: 'Struttura + organizzatore' };

  var form, statusBox, submitBtn, submitLabel;

  function checked(name) { return form ? form.querySelector('input[name="' + name + '"]:checked') : null; }

  function setFormAud(a) {
    if (!form || !a) return;
    var r = form.querySelector('input[name="ruolo"][data-aud="' + a + '"]');
    if (r) { r.checked = true; onRoleChange(); }
  }
  function setRequest(kind) {
    if (!form) return;
    var r = form.querySelector('input[name="richiesta"][data-req="' + kind + '"]');
    if (r) { r.checked = true; onRequestChange(); }
  }
  function onRoleChange() {
    var r = checked('ruolo');
    var l = form.querySelector('[data-what-label]');
    if (r && l) l.textContent = WHAT_LABEL[r.getAttribute('data-aud')] || WHAT_LABEL.so;
  }
  function onRequestChange() {
    var r = checked('richiesta');
    var demo = form.querySelector('[data-demo-pref]');
    if (!demo) return;
    var isInfo = r && r.getAttribute('data-req') === 'info';
    demo.hidden = isInfo;
    demo.querySelectorAll('input').forEach(function (i) { i.disabled = isInfo; });
  }

  function contactOk() {
    var em = form.elements.email, tel = form.elements.telefono;
    var err = form.querySelector('[data-contact-err]');
    var ok = !!(em.value.trim() || tel.value.trim());
    em.setCustomValidity(ok ? '' : 'Inserisci un’email o un numero di telefono.');
    em.setAttribute('aria-invalid', String(!ok));
    tel.setAttribute('aria-invalid', String(!ok));
    if (err) err.hidden = ok;
    /* Telefono: solo cifre, spazi e + ( ) . - (niente attributo pattern:
       i browser recenti lo compilano col flag v e certe classi falliscono). */
    var t = tel.value.trim();
    var telOk = !t || /^[0-9 +().-]{6,20}$/.test(t);
    tel.setCustomValidity(telOk ? '' : 'Controlla il numero: solo cifre, spazi e +.');
    if (!telOk) tel.setAttribute('aria-invalid', 'true');
    return ok && telOk;
  }

  function collect() {
    var data = {};
    new FormData(form).forEach(function (v, k) {
      v = typeof v === 'string' ? v.trim() : v;
      if (v !== '' && v != null) data[k] = v;
    });
    var role = checked('ruolo');
    var req = checked('richiesta');
    var kind = req && req.getAttribute('data-req') === 'info' ? 'Informazioni' : 'Demo gratuita';
    data.subject = '[EasyKick Business] ' + kind + ' · ' +
      (role ? ROLE_SHORT[role.getAttribute('data-aud')] : 'Ruolo non indicato') +
      (data.citta ? ' · ' + data.citta : '');
    return data;
  }

  function mailtoFrom(data) {
    var skip = { access_key: 1, botcheck: 1, subject: 1, from_name: 1 };
    var lines = [];
    Object.keys(data).forEach(function (k) {
      if (!skip[k] && k.indexOf('utm_') !== 0 && k !== 'per' && k !== 'pagina') lines.push(k.replace(/_/g, ' ') + ': ' + data[k]);
    });
    return 'mailto:' + FALLBACK_EMAIL + '?subject=' + encodeURIComponent(data.subject || 'Richiesta EasyKick Business') +
      '&body=' + encodeURIComponent(lines.join('\n'));
  }

  function show(kind, html) {
    statusBox.className = 'status ' + kind;
    statusBox.innerHTML = html;
    statusBox.hidden = false;
    statusBox.setAttribute('tabindex', '-1');
    statusBox.focus({ preventScroll: false });
  }

  function busy(on) {
    submitBtn.disabled = on;
    form.setAttribute('aria-busy', String(on));
    submitBtn.textContent = on ? 'Invio in corso…' : submitLabel;
  }

  function fail(data, why) {
    if (why && window.console) console.warn('[EasyKick Business] modulo demo:', why);
    busy(false);
    show('ko',
      '<p>Non siamo riusciti a inviare la richiesta.</p>' +
      '<p>Riprova tra poco oppure <a href="' + mailtoFrom(data).replace(/"/g, '&quot;') +
      '">scrivici a ' + FALLBACK_EMAIL + '</a>: il messaggio si apre già compilato.</p>');
  }

  function onSubmit(e) {
    e.preventDefault();
    statusBox.hidden = true;
    var cOk = contactOk();
    if (!cOk || !form.checkValidity()) { form.reportValidity(); return; }

    var data = collect();
    /* Honeypot: un umano non vede né spunta questo campo. */
    if (data.botcheck) { form.reset(); show('ok', '<p>Richiesta inviata.</p>'); return; }
    delete data.botcheck;

    if (!data.access_key || data.access_key === ACCESS_KEY_PLACEHOLDER) {
      fail(data, 'chiave Web3Forms non ancora impostata (segnaposto WEB3FORMS_ACCESS_KEY): nessun dato inviato.');
      return;
    }

    busy(true);
    var ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 15000);
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data),
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (j) { return { ok: res.ok, j: j }; });
    }).then(function (r) {
      clearTimeout(timer);
      if (!r.ok || !r.j || r.j.success !== true) { fail(data, (r.j && r.j.message) || 'risposta non valida'); return; }
      busy(false);
      form.querySelectorAll('[data-fields]').forEach(function (el) { el.hidden = true; });
      var who = data.nome ? ', ' + data.nome.split(' ')[0] : '';
      show('ok', '<p>Grazie' + who.replace(/[<>&"]/g, '') + ', richiesta arrivata.</p>' +
        '<p>Ti ricontattiamo noi ai recapiti che ci hai lasciato per fissare la demo o rispondere alle tue domande.</p>');
    }).catch(function (err) {
      clearTimeout(timer);
      fail(data, err && err.name === 'AbortError' ? 'tempo scaduto' : err);
    });
  }

  function initForm(opts) {
    opts = opts || {};
    form = document.getElementById('lead');
    if (!form) return;
    statusBox = form.querySelector('[data-status]');
    submitBtn = form.querySelector('button[type="submit"]');
    submitLabel = submitBtn.textContent;
    /* Con JavaScript controlliamo noi tutto insieme (anche «email o telefono»);
       senza, resta la validazione del browser. */
    form.noValidate = true;

    TRACKED.forEach(function (k) {
      var f = form.elements[k];
      if (f && params[k]) f.value = params[k];
    });
    if (form.elements.pagina && opts.page) form.elements.pagina.value = opts.page;

    form.querySelectorAll('input[name="ruolo"]').forEach(function (r) { r.addEventListener('change', onRoleChange); });
    form.querySelectorAll('input[name="richiesta"]').forEach(function (r) { r.addEventListener('change', onRequestChange); });
    ['email', 'telefono'].forEach(function (n) {
      form.elements[n].addEventListener('input', function () {
        if (form.elements.email.getAttribute('aria-invalid') === 'true') contactOk();
      });
    });
    form.addEventListener('submit', onSubmit);

    /* «Prenota una demo» / «Chiedi informazioni»: stessa destinazione,
       il modulo si predispone sul tipo di richiesta. */
    document.querySelectorAll('[data-req]').forEach(function (a) {
      if (a.tagName === 'INPUT') return;
      a.addEventListener('click', function () { setRequest(a.getAttribute('data-req')); });
    });

    setFormAud(opts.aud || audFromPer(params.per));
    onRoleChange();
    onRequestChange();
  }

  /* ── Interruttore di pubblico (proposta A) ─────────────────── */
  function initSwitch() {
    var page = document.getElementById('page');
    if (!page || !page.querySelector('.switch')) return null;
    function setAud(a, keepUrl) {
      page.setAttribute('data-aud', a);
      page.querySelectorAll('.switch button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.getAttribute('data-aud') === a));
      });
      syncShot(page.querySelector('.only-' + a + '[data-shots]'));
      setFormAud(a);
      if (!keepUrl && window.history && history.replaceState) {
        history.replaceState(null, '', window.location.pathname + window.location.search + '#' + (a === 's' ? 'strutture' : 'organizzatori'));
      }
    }
    page.querySelectorAll('.switch button').forEach(function (b) {
      b.addEventListener('click', function () { setAud(b.getAttribute('data-aud')); });
    });
    function fromHash() {
      if (window.location.hash === '#organizzatori') { setAud('o', true); window.scrollTo(0, 0); return true; }
      if (window.location.hash === '#strutture') { setAud('s', true); window.scrollTo(0, 0); return true; }
      return false;
    }
    window.addEventListener('hashchange', fromHash);
    if (!fromHash()) {
      var a = audFromPer(params.per);
      if (a) setAud(a, true);
    }
    return setAud;
  }

  window.EKBusiness = {
    params: params,
    audFromPer: audFromPer,
    init: function (opts) {
      carryParams();
      initShots();
      initForm(opts);
      initSwitch();
    }
  };
})();
