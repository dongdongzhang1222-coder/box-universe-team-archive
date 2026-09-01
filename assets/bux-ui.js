/* ============================================================
   BOX UNIVERSE V5 — UI ENHANCEMENT OVERLAY (behaviour)
   Additive only. Never edit app.js logic.
   Kill switch:  ?ui=off
   ============================================================ */
(function () {
  'use strict';

  var params = new URLSearchParams(location.search);
  if (params.get('ui') === 'off') return;

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var BOX_ARCHIVE_VIDEO = './media/box-intro-hd.mp4';
  var COLLAGE_VIDEO = './media/team-collage-motion.mp4';
  var DEFAULT_IDEA_ITEMS = [
    {
      id: 'ai-anniversary',
      kind: 'video',
      parts: [
        './assets/idea-bank/ai-anniversary.part-00',
        './assets/idea-bank/ai-anniversary.part-01',
        './assets/idea-bank/ai-anniversary.part-02',
        './assets/idea-bank/ai-anniversary.part-03'
      ],
      name: 'AI周年视频',
      format: 'MP4',
      size: '47.4 MiB',
      note: '团队 16 周年存档 · 常驻'
    },
    {
      id: 'ai-website-handbook',
      kind: 'docx',
      src: './assets/idea-bank/ai-website-handbook.docx',
      name: 'AI从零建站·淘宝品牌分享手册',
      format: 'DOCX',
      size: '116.7 KiB',
      note: 'AI 建站流程与工具对比 · Word 手册 · 常驻'
    },
    {
      id: 'hot-dance',
      kind: 'video',
      src: './media/box-signal.mp4',
      name: '火辣热舞',
      format: 'MP4',
      size: '3.5 MiB',
      note: '团队热舞影像 · 常驻'
    }
  ];

  /* ---------- tiny helpers ---------- */
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function lenis() { return window.lenis && typeof window.lenis.stop === 'function' ? window.lenis : null; }

  function syncPlayerHeading() {
    var section = q('#players');
    if (!section) return;
    var galaxyTitle = q('.galaxy-copy h2', section);
    if (galaxyTitle && galaxyTitle.textContent !== 'Interstellar Player') {
      galaxyTitle.textContent = 'Interstellar Player';
    }
    var archiveHeading = section.previousElementSibling;
    if (archiveHeading && archiveHeading.matches('.section-heading')) {
      var archiveTitle = q('h2', archiveHeading);
      if (archiveTitle && archiveTitle.textContent !== 'Interstellar Player') {
        archiveTitle.textContent = 'Interstellar Player';
      }
    }
  }

  function setupEntryButton() {
    var btn = q('.entry-page .start-hit');
    if (!btn || btn.dataset.buxEntryFx) return;
    btn.dataset.buxEntryFx = '1';

    // The artwork uses object-fit, so percentage coordinates against the
    // viewport drift whenever its aspect ratio differs from the source image.
    // Anchor the hit target to the button's actual pixels in entry.png instead.
    var gate = btn.parentElement;
    var artwork = gate && q(':scope > img', gate);
    var sourceButton = { x: 535, y: 318, width: 610, height: 90 };

    function syncEntryHitbox() {
      if (!gate || !artwork || !artwork.naturalWidth || !artwork.naturalHeight) return;
      var boxWidth = artwork.clientWidth;
      var boxHeight = artwork.clientHeight;
      var fit = getComputedStyle(artwork).objectFit;
      var scale = fit === 'cover'
        ? Math.max(boxWidth / artwork.naturalWidth, boxHeight / artwork.naturalHeight)
        : Math.min(boxWidth / artwork.naturalWidth, boxHeight / artwork.naturalHeight);
      var renderedWidth = artwork.naturalWidth * scale;
      var renderedHeight = artwork.naturalHeight * scale;
      var offsetX = (boxWidth - renderedWidth) / 2;
      var offsetY = (boxHeight - renderedHeight) / 2;

      btn.style.left = (offsetX + sourceButton.x * scale) + 'px';
      btn.style.top = (offsetY + sourceButton.y * scale) + 'px';
      btn.style.width = (sourceButton.width * scale) + 'px';
      btn.style.height = (sourceButton.height * scale) + 'px';
    }

    if (artwork) {
      if (artwork.complete) syncEntryHitbox();
      else artwork.addEventListener('load', syncEntryHitbox, { once: true });
      window.addEventListener('resize', syncEntryHitbox);
      if (typeof ResizeObserver === 'function') {
        new ResizeObserver(syncEntryHitbox).observe(gate);
      }
    }

    btn.addEventListener('pointerdown', function () {
      btn.classList.add('is-bux-pressed');
    });
    btn.addEventListener('pointerup', function () {
      if (btn.dataset.buxPass !== '1') btn.classList.remove('is-bux-pressed');
    });
    btn.addEventListener('pointerleave', function () {
      if (btn.dataset.buxPass !== '1') btn.classList.remove('is-bux-pressed');
    });
    btn.addEventListener('click', function (event) {
      if (btn.dataset.buxPass === '1') {
        delete btn.dataset.buxPass;
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      btn.classList.add('is-bux-pressed');
      setTimeout(function () {
        if (!btn.isConnected) return;
        btn.dataset.buxPass = '1';
        btn.click();
      }, 320);
    });
  }

  function loadIdeaVideo(video, item) {
    if (!item.parts) {
      video.src = item.src;
      return;
    }
    video.setAttribute('data-bux-loading', '1');
    var parts = [];
    item.parts.reduce(function (chain, path) {
      return chain.then(function () {
        return fetch(path).then(function (response) {
          if (!response.ok) throw new Error('Missing video segment: ' + path);
          return response.arrayBuffer();
        }).then(function (bytes) {
          parts.push(bytes);
        });
      });
    }, Promise.resolve()).then(function () {
      if (!video.isConnected) return;
      video.src = URL.createObjectURL(new Blob(parts, { type: 'video/mp4' }));
      video.removeAttribute('data-bux-loading');
      video.load();
    }).catch(function () {
      video.removeAttribute('data-bux-loading');
      video.setAttribute('data-bux-media-error', '1');
      video.setAttribute('aria-label', item.name + ' 加载失败');
    });
  }

  /* ============================================================
     1. CASEBOARD — 「查看详情」+ lightbox
     ============================================================ */
  var lb = null;
  function lightbox() {
    if (lb) return lb;
    lb = el('div', 'bux-lightbox');
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.hidden = true;

    var close = el('button', 'bux-lb-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', '关闭大图');

    var fig = el('figure');
    var img = el('img');
    img.alt = '';
    var cap = el('figcaption');
    fig.appendChild(img);
    fig.appendChild(cap);
    lb.appendChild(close);
    lb.appendChild(fig);
    document.body.appendChild(lb);

    lb._img = img;
    lb._cap = cap;
    close.addEventListener('click', closeLightbox);
    lb.addEventListener('mousedown', function (e) { if (e.target === lb) closeLightbox(); });
    return lb;
  }

  function openLightbox(data) {
    var box = lightbox();
    box._img.src = data.src;
    box._img.alt = data.title + ' 项目大图';
    box._cap.innerHTML = '';
    box._cap.appendChild(document.createTextNode(data.title));
    var meta = el('small', null, data.date + '　' + data.type);
    box._cap.appendChild(meta);
    if (data.url) {
      var a = el('a', null, '打开存档 ↗');
      a.href = data.url;
      a.target = '_blank';
      a.rel = 'noreferrer';
      box._cap.appendChild(a);
    }
    box.hidden = false;
    if (lenis()) lenis().stop();
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { box.classList.add('is-open'); });
    q('.bux-lb-close', box).focus();
  }

  function closeLightbox() {
    if (!lb || lb.hidden) return;
    lb.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    if (lenis() && !q('.modal')) lenis().start();
    setTimeout(function () { if (lb && !lb.classList.contains('is-open')) lb.hidden = true; }, 260);
  }

  function decorateCaseCards() {
    qa('.case-grid .case-card').forEach(function (card) {
      if (card.querySelector('.bux-case-detail')) return;
      var img = card.querySelector('.case-image img');
      var footer = card.querySelector('footer');
      if (!img || !footer) return;

      var btn = el('button', 'bux-case-detail', '查看详情 ↗');
      btn.type = 'button';
      var title = (card.querySelector('h3') || {}).textContent || '';
      btn.setAttribute('aria-label', '查看「' + title + '」项目大图');

      btn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openLightbox({
          src: img.getAttribute('src'),
          title: title,
          date: (card.querySelector('footer time') || {}).textContent || '',
          type: (card.querySelector('h3 + p') || card.querySelector('p') || {}).textContent || '',
          url: card.getAttribute('href')
        });
      });
      // stop the wrapping <a> from navigating on keyboard activation
      btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
      });

      card.insertBefore(btn, footer);
    });
  }

  /* ============================================================
     2. PLAYER DETAIL — real scrolling + scroll hint
     ============================================================ */
  var hint = null;
  function decorateModal() {
    var modal = q('.modal');
    if (!modal) {
      if (modalOpen) {
        modalOpen = false;
        if (lenis() && (!lb || lb.hidden)) lenis().start();
        document.documentElement.style.overflow = '';
        hint = null;
      }
      return;
    }
    if (!modalOpen) {
      modalOpen = true;
      if (lenis()) lenis().stop();          // let the wheel reach .modal-copy
      document.documentElement.style.overflow = 'hidden';
    }

    var copy = q('.player-detail .modal-copy', modal) || q('.modal-copy', modal);
    if (!copy) return;

    // wheel/touch inside the card must never bubble out to the page
    if (!copy.dataset.buxScroll) {
      copy.dataset.buxScroll = '1';
      copy.addEventListener('wheel', function (e) { e.stopPropagation(); }, { passive: true });
      copy.addEventListener('touchmove', function (e) { e.stopPropagation(); }, { passive: true });
      copy.addEventListener('scroll', updateHint, { passive: true });
      copy.tabIndex = 0;
      copy.setAttribute('aria-label', '玩家详情，可上下滚动查看关联项目');
    }

    var card = q('.modal-card', modal);
    if (card && !card.querySelector('.bux-scroll-hint')) {
      hint = el('div', 'bux-scroll-hint', '▼ 下滑查看 TA 的项目');
      card.appendChild(hint);
    } else {
      hint = card ? card.querySelector('.bux-scroll-hint') : null;
    }
    updateHint();
  }
  var modalOpen = false;

  function updateHint() {
    if (!hint) return;
    var copy = q('.modal-copy');
    var card = q('.modal-card');
    var sc = copy && copy.scrollHeight - copy.clientHeight > 24 ? copy
           : (card && card.scrollHeight - card.clientHeight > 24 ? card : null);
    if (!sc) { hint.classList.add('is-hidden'); return; }
    var atEnd = sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 40;
    hint.classList.toggle('is-hidden', atEnd);
  }

  /* ============================================================
     4. JOY — mirror NOW PLAYING onto the hotspot rows
     ============================================================ */
  function syncJoyActive() {
    var now = q('.joy-screen .joy-now');
    var rows = qa('.joy-hotspots button');
    if (!now || !rows.length) return;
    var m = /(\d+)/.exec(now.textContent || '');
    var idx = m ? parseInt(m[1], 10) - 1 : -1;
    rows.forEach(function (b, i) {
      var on = i === idx ? '1' : null;
      if (on) { if (b.getAttribute('data-bux-active') !== '1') b.setAttribute('data-bux-active', '1'); }
      else if (b.hasAttribute('data-bux-active')) b.removeAttribute('data-bux-active');
    });
  }

  /* ============================================================
     5. VIDEO — drop CLOSE, sound on by default
     ============================================================ */
  var soundArmed = false;
  var SIGNAL_STILL = './design/video-paused.png';

  function armUnmute(v) {
    var go = function () {
      v.muted = false;
      removeEventListener('pointerdown', go, true);
      removeEventListener('keydown', go, true);
    };
    addEventListener('pointerdown', go, true);
    addEventListener('keydown', go, true);
  }

  function autoplaySignal(v) {
    // PRESS START already counted as a user gesture, so sound-on autoplay
    // normally sticks; if the policy still refuses, fall back to muted.
    v.muted = false;
    var p = v.play();
    if (!p || !p.catch) return;
    p.catch(function () {
      v.muted = true;
      var q2 = v.play();
      if (q2 && q2.catch) q2.catch(function () {});
      armUnmute(v);
    });
  }

  function setupSignalVideo() {
    var v = q('video.about-video');
    if (!v) return;
    var sec = v.closest('.about-screen');
    if (!sec) return;

    if (v.getAttribute('poster') !== SIGNAL_STILL) v.setAttribute('poster', SIGNAL_STILL);

    if (!sec.querySelector('.bux-video-still')) {
      var still = el('img', 'bux-video-still');
      still.src = SIGNAL_STILL;
      still.alt = '';
      still.setAttribute('aria-hidden', 'true');
      sec.appendChild(still);
    }

    var sync = function () { sec.setAttribute('data-bux-vpaused', v.paused ? '1' : '0'); };

    if (!v.hasAttribute('data-bux-signal')) {
      v.setAttribute('data-bux-signal', '1');
      v.setAttribute('playsinline', '');
      v.preload = 'auto';
      ['play', 'playing', 'pause', 'ended', 'emptied', 'loadeddata'].forEach(function (t) {
        v.addEventListener(t, sync);
      });
      autoplaySignal(v);
    }
    sync();
  }

  function decorateVideo() {
    qa('.video-actions button').forEach(function (b) {
      var t = (b.textContent || '') + (b.getAttribute('aria-label') || '');
      if (/CLOSE|关闭视频/.test(t)) {
        if (!b.hasAttribute('data-bux-hidden')) {
          b.setAttribute('data-bux-hidden', '1');
          b.setAttribute('tabindex', '-1');
          b.setAttribute('aria-hidden', 'true');
        }
      } else if (!soundArmed && /SOUND OFF|打开视频声音/.test(t)) {
        soundArmed = true;                 // flip React state once -> sound on
        b.click();
      }
    });
    setupSignalVideo();
  }

  /* ============================================================
     6. IDEA BANK — pinned team video + delete on every card
     ============================================================ */
  var removed = Object.create(null);
  var undoBar = null;
  var undoTimer = 0;

  function cardKey(card) {
    var h3 = card.querySelector('.idea-meta h3');
    var m = card.querySelector('img, video');
    return ((h3 && (h3.getAttribute('title') || h3.textContent)) || '') + '|' + ((m && m.getAttribute('src')) || '');
  }

  function showUndo(key, label) {
    if (!undoBar) {
      undoBar = el('div', 'bux-undo');
      undoBar.setAttribute('role', 'status');
      undoBar.appendChild(el('span'));
      var b = el('button', null, '撤销');
      b.type = 'button';
      undoBar.appendChild(b);
      document.body.appendChild(undoBar);
      b.addEventListener('click', function () {
        if (undoBar._key) delete removed[undoBar._key];
        qa('.idea-card.bux-removed').forEach(function (c) {
          if (!removed[cardKey(c)]) c.classList.remove('bux-removed');
        });
        hideUndo();
        syncIdeaCount();
      });
    }
    undoBar._key = key;
    undoBar.firstChild.textContent = '已移除「' + label + '」';
    undoBar.classList.add('is-open');
    clearTimeout(undoTimer);
    undoTimer = setTimeout(hideUndo, 6000);
  }
  function hideUndo() { if (undoBar) undoBar.classList.remove('is-open'); }

  function addDeleteButtons() {
    qa('.idea-cards .idea-card').forEach(function (card) {
      var row = card.querySelector('.idea-meta > div');
      if (!row) return;
      if (removed[cardKey(card)]) card.classList.add('bux-removed');
      if (row.querySelector('.bux-idea-del')) return;

      var del = el('button', 'bux-idea-del', '删除');
      del.type = 'button';
      var nm = (card.querySelector('.idea-meta h3') || {}).textContent || '文件';
      del.setAttribute('aria-label', '从灵感空间移除 ' + nm);
      del.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        var k = cardKey(card);
        removed[k] = 1;
        card.classList.add('bux-removed');
        var v = card.querySelector('video');
        if (v) { try { v.pause(); } catch (_) {} }
        showUndo(k, nm);
        syncIdeaCount();
      });
      row.appendChild(del);
    });
  }

  function buildDefaultIdeaCards() {
    var wrap = q('.idea-bank .idea-cards');
    if (!wrap) return;

    DEFAULT_IDEA_ITEMS.slice().reverse().forEach(function (item) {
      if (wrap.querySelector('[data-bux-default="' + item.id + '"]')) return;

      var card = el('article', 'idea-card bux-idea-card bux-idea-' + item.kind);
      card.setAttribute('data-bux-default', item.id);

      var media;
      if (item.kind === 'video') {
        media = el('video');
        media.controls = true;
        media.playsInline = true;
        media.preload = 'metadata';
        media.setAttribute('controlsList', 'nodownload noplaybackrate');
        media.setAttribute('aria-label', item.name + ' 视频预览');
        loadIdeaVideo(media, item);
      } else {
        media = el('a', 'file-icon bux-doc-preview', item.format);
        media.href = item.src;
        media.target = '_blank';
        media.rel = 'noreferrer';
        media.setAttribute('aria-label', '打开' + item.name);
      }

      var meta = el('div', 'idea-meta');
      var fmt = el('span', null, item.format);
      var pin = el('i', 'bux-idea-pin', 'PINNED');
      fmt.appendChild(pin);
      var h3 = el('h3', null, item.name);
      h3.title = item.name + '　' + item.note;
      var p = el('p', null, item.size + '　·　' + item.note);

      var row = el('div');
      if (item.kind === 'video') {
        var fs = el('button', 'bux-idea-fs', '全屏播放');
        fs.type = 'button';
        fs.addEventListener('click', function () {
          var r = media.requestFullscreen || media.webkitRequestFullscreen || media.webkitEnterFullscreen;
          if (r) { try { r.call(media); } catch (_) {} }
          media.play().catch(function () {});
        });
        row.appendChild(fs);
      } else {
        var open = el('a', 'bux-idea-open', '打开文档');
        open.href = item.src;
        open.target = '_blank';
        open.rel = 'noreferrer';
        var download = el('a', 'bux-idea-download', '下载 ' + item.format);
        download.href = item.src;
        download.download = 'AI从零建站-淘宝品牌分享手册.docx';
        row.appendChild(open);
        row.appendChild(download);
      }

      meta.appendChild(fmt);
      meta.appendChild(h3);
      meta.appendChild(p);
      meta.appendChild(row);
      card.appendChild(media);
      card.appendChild(meta);
      wrap.insertBefore(card, wrap.firstChild);
    });
  }

  function syncIdeaCount() {
    var head = q('.idea-bank > header p');
    if (!head) return;
    var n = qa('.idea-cards .idea-card').filter(function (c) {
      return !c.classList.contains('bux-removed');
    }).length;
    var txt = 'TEAM INVENTORY / ' + n + ' FILES';
    if (head.textContent !== txt) head.textContent = txt;
  }

  /* ============================================================
     7. BOX ARCHIVE — 5-second motion portrait
     ============================================================ */
  function buildBoxArchiveVideo() {
    var sec = q('.box-screen');
    if (!sec || sec.querySelector('.bux-box-archive-video')) return;
    var v = el('video', 'bux-box-archive-video');
    v.src = BOX_ARCHIVE_VIDEO;
    v.autoplay = true;
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('aria-label', 'BOX 档案动态影像');
    v.poster = './design/box.png';
    v.preload = 'auto';
    sec.appendChild(v);
    sec.classList.add('bux-has-archive-video');
    var kick = function () { v.play().catch(function () {}); };
    kick();
    v.addEventListener('loadeddata', kick, { once: true });
    document.addEventListener('click', kick, { once: true });
    if (typeof IntersectionObserver === 'function') {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) kick();
          else if (!v.paused) v.pause();
        });
      }, { rootMargin: '200px 0px' }).observe(sec);
    }
  }

  /* ============================================================
     8. TEAM COLLAGE — one video instead of 7 static portraits
     ============================================================ */
  function buildCollageVideo() {
    if (REDUCED) return;                          // reduced motion keeps the stills
    var sec = q('.team-collage');
    if (!sec || sec.querySelector('.bux-collage-video')) return;
    var v = el('video', 'bux-collage-video');
    v.src = COLLAGE_VIDEO;
    v.autoplay = true;
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('aria-hidden', 'true');
    v.poster = './design/team-collage.png';
    v.preload = 'auto';
    sec.appendChild(v);
    sec.classList.add('bux-has-video');
    var kick = function () { v.play().catch(function () {}); };
    kick();
    v.addEventListener('loadeddata', kick, { once: true });
    document.addEventListener('click', kick, { once: true });

    // Only decode while the collage is on/near screen: saves CPU, GPU memory
    // and battery on a long single-page scroll.
    if (typeof IntersectionObserver === 'function') {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) kick();
          else if (!v.paused) v.pause();
        });
      }, { rootMargin: '200px 0px' }).observe(sec);
    }
  }

  /* ============================================================
     orchestration
     ============================================================ */
  var raf = 0;
  function sync() {
    setupEntryButton();
    syncPlayerHeading();
    decorateCaseCards();
    decorateModal();
    syncJoyActive();
    decorateVideo();
    buildDefaultIdeaCards();
    addDeleteButtons();
    syncIdeaCount();
    buildBoxArchiveVideo();
    buildCollageVideo();
  }
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; sync(); });
  }

  function boot() {
    sync();
    new MutationObserver(schedule).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
    addEventListener('resize', updateHint);
    document.addEventListener('click', function (e) {
      var row = e.target && e.target.closest && e.target.closest('.joy-hotspots button');
      if (!row) return;
      qa('.joy-hotspots button').forEach(function (b) { b.removeAttribute('data-bux-active'); });
      row.setAttribute('data-bux-active', '1');
    }, true);
    addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (lb && !lb.hidden) { closeLightbox(); return; }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else boot();

  window.BUXUI = {
    sync: sync,
    restoreAll: function () {
      removed = Object.create(null);
      qa('.idea-card.bux-removed').forEach(function (c) { c.classList.remove('bux-removed'); });
      syncIdeaCount();
    }
  };
})();
