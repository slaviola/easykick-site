/* EasyKick Business — effetti della versione moderna. JS vanilla, nessuna
   libreria. Tutto è facoltativo: senza JS (o con movimento ridotto) la
   pagina resta completa e leggibile. Le demo sono illustrazioni locali:
   non inviano dati a nessuno. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  /* ── Comparse allo scroll ─────────────────────────────────── */
  function initReveal() {
    var els = $$('.reveal, .pitch-svg');
    if (!('IntersectionObserver' in window) || reduce) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ── Bagliore e tilt nell'hero ────────────────────────────── */
  function initHero() {
    var hero = $('.xhero');
    if (!hero || reduce || !finePointer) return;
    var tilt = $('.tilt', hero), raf = 0, px = 0, py = 0;
    hero.addEventListener('pointermove', function (e) {
      var r = hero.getBoundingClientRect();
      px = (e.clientX - r.left) / r.width; py = (e.clientY - r.top) / r.height;
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        hero.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        hero.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        if (tilt) {
          tilt.style.setProperty('--ry', ((px - 0.5) * 22 - 8).toFixed(2) + 'deg');
          tilt.style.setProperty('--rx', ((0.5 - py) * 14 + 4).toFixed(2) + 'deg');
        }
      });
    });
    hero.addEventListener('pointerleave', function () {
      if (tilt) { tilt.style.removeProperty('--ry'); tilt.style.removeProperty('--rx'); }
    });
  }

  /* ── Card vive: il bagliore segue il puntatore ────────────── */
  function initLive() {
    if (reduce || !finePointer) return;
    $$('.live').forEach(function (c) {
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty('--cx', (e.clientX - r.left) + 'px');
        c.style.setProperty('--cy', (e.clientY - r.top) + 'px');
      });
    });
  }

  /* ── Spostamento animato (FLIP) ───────────────────────────── */
  function flipMove(el, parent, before) {
    var a = el.getBoundingClientRect();
    parent.insertBefore(el, before || null);
    if (reduce) return;
    var b = el.getBoundingClientRect();
    var dx = a.left - b.left, dy = a.top - b.top;
    el.classList.add('moving');
    el.style.transition = 'none';
    el.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    el.getBoundingClientRect();
    el.style.transition = 'transform .6s cubic-bezier(.2,.7,.2,1)';
    el.style.transform = '';
    setTimeout(function () { el.classList.remove('moving'); el.style.transition = ''; }, 650);
  }

  /* ── Simulatore della serata (strutture) ──────────────────── */
  function initSim() {
    var root = $('#sim');
    if (!root) return;
    var card = $('.sim-card', root), title = $('[data-sim-title]', root), badge = $('[data-sim-badge]', root);
    var players = $('[data-sim-players]', root), bar = $('[data-sim-bar]', root), count = $('[data-sim-count]', root);
    var msg = $('[data-sim-msg]', root), btn = $('[data-sim-btn]', root);
    /* Illustrazione: 10 giocatori, soglia di quote garantite = metà (il
       valore di base; il gestore la sceglie campo per campo). Chi paga al
       campo non conta per la soglia. */
    var NEED = 10, SOGLIA = 5, NAMES = ['LV', 'SC', 'MR', 'AB', 'DG', 'FP', 'GT', 'NL', 'RC', 'EM'];
    var CASH = { 3: 1, 7: 1 };
    var slot = null, state = 'idle', timer = 0, garantite = 0;

    function setState(st) {
      state = st;
      badge.setAttribute('data-st', st === 'idle' ? 'libero' : st);
      badge.textContent = st === 'riservato' ? 'Riservato' : (st === 'confermato' ? 'Confermato' : 'Libero');
      if (slot) {
        slot.setAttribute('data-st', st === 'idle' ? 'libero' : st);
        slot.querySelector('small').textContent = badge.textContent;
      }
    }
    function quote(g) {
      garantite = g;
      bar.style.setProperty('--q', (g / NEED * 100) + '%');
      count.textContent = g + ' garantite · soglia ' + SOGLIA;
    }
    function reset() {
      clearInterval(timer);
      players.innerHTML = ''; quote(0); card.classList.remove('done');
    }
    function choose(s) {
      if (slot && state !== 'confermato') { slot.setAttribute('data-st', 'libero'); slot.querySelector('small').textContent = 'Libero'; }
      $$('.slot', root).forEach(function (x) { x.setAttribute('aria-pressed', String(x === s)); });
      slot = s; reset(); setState('idle');
      title.textContent = s.getAttribute('data-label');
      msg.textContent = 'Slot libero. Un gruppo lo trova nell’app e lo riserva.';
      btn.textContent = 'Riserva lo slot'; btn.disabled = false;
    }
    function addPlayer(i) {
      var p = document.createElement('span');
      var cash = !!CASH[i];
      p.className = cash ? 'player' : 'player paid'; p.textContent = NAMES[i]; p.setAttribute('aria-hidden', 'true');
      players.appendChild(p); quote(garantite + (cash ? 0 : 1));
    }
    btn.addEventListener('click', function () {
      if (!slot) return;
      if (state === 'idle') {
        setState('riservato');
        addPlayer(0);
        msg.textContent = 'Riservato: è la volontà di giocare, non ancora una conferma. Ora l’organizzatore chiama il gruppo.';
        btn.textContent = 'Arriva il gruppo';
      } else if (state === 'riservato') {
        btn.disabled = true;
        msg.textContent = 'I giocatori entrano: chi paga in app garantisce la sua quota (carta o carnet), chi paga al campo no…';
        var i = players.children.length;
        var step = function () {
          if (i >= NEED) {
            clearInterval(timer);
            state = 'pronta';
            msg.textContent = 'Gruppo completo e soglia di quote garantite superata: ora l’organizzatore del gruppo può confermare.';
            btn.textContent = 'Conferma la partita'; btn.disabled = false;
            return;
          }
          addPlayer(i++);
        };
        if (reduce) { while (i < NEED) addPlayer(i++); step(); } else { timer = setInterval(step, 260); }
      } else if (state === 'pronta') {
        setState('confermato'); card.classList.add('done');
        msg.textContent = 'Partita confermata: agli altri gruppi che avevano riservato lo slot si annulla tutto e arriva l’avviso. Senza una telefonata.';
        btn.textContent = 'Prova un altro slot';
      } else {
        var next = $$('.slot', root).filter(function (x) { return x.getAttribute('data-st') === 'libero' && x !== slot; })[0];
        if (next) { choose(next); next.focus(); } else { $$('.slot[data-free]', root).forEach(function (x) { x.setAttribute('data-st', 'libero'); x.querySelector('small').textContent = 'Libero'; }); choose($('.slot[data-free]', root)); }
      }
    });
    $$('.slot', root).forEach(function (s) {
      s.addEventListener('click', function () {
        if (s.getAttribute('data-st') === 'confermato' && s !== slot) {
          $$('.slot', root).forEach(function (x) { x.setAttribute('aria-pressed', String(x === s)); });
          slot = null; reset(); title.textContent = s.getAttribute('data-label');
          badge.setAttribute('data-st', 'confermato'); badge.textContent = 'Confermato';
          msg.textContent = 'Questo slot è già confermato: un altro gruppo ha confermato prima. Scegline uno libero.';
          btn.disabled = true; return;
        }
        if (s === slot) return;
        choose(s);
      });
    });
    var first = $('.slot[data-free]', root);
    if (first) choose(first);
  }

  /* ── Scrollytelling: il telefono cambia schermata ─────────── */
  function initStory() {
    var steps = $$('.story-step');
    var imgs = $$('.story-phone img');
    if (!steps.length) return;
    function show(i) {
      steps.forEach(function (s, k) { s.classList.toggle('on', k === i); });
      var want = steps[i].getAttribute('data-img');
      imgs.forEach(function (im) { im.classList.toggle('on', im.getAttribute('data-img') === want); });
    }
    show(0);
    if (!('IntersectionObserver' in window)) { steps.forEach(function (s) { s.classList.add('on'); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) show(steps.indexOf(en.target)); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(function (s) { io.observe(s); });
  }

  /* ── Demo del rinvio (organizzatori) ──────────────────────── */
  function initRinvio() {
    var root = $('#rdemo');
    if (!root) return;
    var btn = $('[data-r-btn]', root), msg = $('[data-r-msg]', root), lane = $('[data-r-lane]', root);
    var target = $('[data-r-target]', root), match = $('[data-r-match]', root), home = match.parentNode, homeNext = match.nextSibling;
    var tag = $('.tag', match), step = 0;
    btn.addEventListener('click', function () {
      if (step === 0) {
        flipMove(match, lane);
        tag.className = 'tag rinv'; tag.textContent = 'Rinviata';
        msg.textContent = 'Partita rinviata: esce dalla giornata e va tra quelle da recuperare. Le altre partite restano al loro posto.';
        btn.textContent = 'Programma il recupero'; step = 1;
      } else if (step === 1) {
        flipMove(match, target);
        tag.className = 'tag rec'; tag.textContent = 'Recupero';
        target.parentNode.classList.add('flash');
        msg.textContent = 'L’app ti suggerisce i giorni liberi e ti ripropone il calendario già sistemato: tu controlli e confermi. Niente Excel da rifare.';
        btn.textContent = 'Rivedi da capo'; step = 2;
      } else {
        target.parentNode.classList.remove('flash');
        flipMove(match, home, homeNext);
        tag.className = 'tag'; tag.textContent = '';
        msg.textContent = 'Tocca «Rinvia» per vedere cosa succede quando una partita salta.';
        btn.textContent = 'Rinvia la partita'; step = 0;
      }
    });
  }

  /* ── Anteprima sponsor (organizzatori) ────────────────────── */
  function initSponsor() {
    var input = $('#sp-input');
    if (!input) return;
    var outs = $$('.sp-out'), DEF = 'Il tuo sponsor', t = 0;
    function render() {
      var v = input.value.replace(/\s+/g, ' ').trim().slice(0, 24) || DEF;
      outs.forEach(function (o) { o.textContent = v; });
      if (reduce) return;
      clearTimeout(t);
      t = setTimeout(function () { outs.forEach(function (o) { o.classList.remove('bump'); void o.offsetWidth; o.classList.add('bump'); }); }, 120);
    }
    input.addEventListener('input', render);
    render();
  }

  initReveal(); initHero(); initLive(); initSim(); initStory(); initRinvio(); initSponsor();
})();
