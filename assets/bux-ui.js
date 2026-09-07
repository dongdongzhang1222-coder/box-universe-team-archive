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
  var STATIC_CASE_ITEMS = [
    {
      id: 'pet-fair-cuteness',
      title: '亚宠展｜宝贝的可爱，宝贝来宠爱',
      url: 'https://www.digitaling.com/projects/376361.html',
      members: ['gongning', 'qiegao'],
      image: './caseboard/pet-fair-cuteness.jpg',
      date: '2026.08.31',
      type: '宠物营销 / AI 营销',
      sortRank: 1
    },
    {
      id: 'xiaobao-wa3-collab',
      title: '淘小宝 × 娃三岁“盒”作联名',
      url: 'https://www.digitaling.com/projects/376375.html',
      members: ['lingxi'],
      image: './caseboard/xiaobao-wa3-collab.jpg',
      date: '2026.08.31',
      type: 'IP 联名 / 产品营销',
      sortRank: 2
    },
    {
      id: 'taobao-skewer-shop',
      title: '淘宝开了家串串香',
      url: 'https://www.digitaling.com/projects/373197.html',
      members: ['qiegao', 'xiaoyao'],
      image: './caseboard/taobao-skewer-shop.jpg',
      date: '2026.07.20',
      type: '线下体验 / 兴趣营销',
      sortRank: 3
    }
  ];
  var CASE_STORAGE_KEY = 'box-universe-custom-cases-v1';
  var PLAYER_LABELS = {
    dongdong: '东东', gongning: '宫宁', lingxi: '灵皙',
    qiegao: '切糕', sisi: '思思', xiaoyao: '小垚'
  };
  var customCases = loadCustomCases();
  var caseEditor = null;
  var caseEditorResetting = false;
  var joyImagePreloads = [];

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

  function loadCustomCases() {
    try {
      var parsed = JSON.parse(localStorage.getItem(CASE_STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (_) {
      return [];
    }
  }

  function saveCustomCases() {
    try {
      localStorage.setItem(CASE_STORAGE_KEY, JSON.stringify(customCases));
      return true;
    } catch (_) {
      return false;
    }
  }

  function displayDate(value) {
    return String(value || '').replace(/-/g, '.');
  }

  function sortDate(value) {
    return Number(String(value || '').replace(/[^0-9]/g, '')) || 0;
  }

  function makeCaseCard(item, isCustom) {
    var card = el(isCustom ? 'article' : 'a', 'case-card bux-added-case');
    card.dataset.buxCaseId = item.id;
    card.dataset.buxCaseDate = displayDate(item.date);
    card.dataset.buxSortRank = String(item.sortRank || 0);
    card.dataset.buxMembers = (item.members || []).join(',');
    card.dataset.buxUrl = item.url || '';
    if (!isCustom) {
      card.href = item.url;
      card.target = '_blank';
      card.rel = 'noreferrer';
    } else {
      card.classList.add('bux-custom-case');
    }

    var media = el('div', 'case-image');
    var img = el('img');
    img.src = item.image;
    img.alt = item.title;
    media.appendChild(img);
    card.appendChild(media);
    card.appendChild(el('strong', null, '00'));
    card.appendChild(el('h3', null, item.title));
    card.appendChild(el('p', null, item.type || '自定义案例'));

    var footer = el('footer');
    var time = el('time', null, displayDate(item.date));
    time.dateTime = String(item.date || '').replace(/\./g, '-');
    footer.appendChild(time);
    if (isCustom) {
      var open = el('a', 'bux-case-open', '打开存档 ↗');
      open.href = item.url || '#';
      if (item.url) {
        open.target = '_blank';
        open.rel = 'noreferrer';
      }
      footer.appendChild(open);
    } else {
      footer.appendChild(el('span', null, '打开存档 ↗'));
    }
    card.appendChild(footer);

    if (isCustom) {
      var actions = el('div', 'bux-custom-actions');
      var edit = el('button', null, '编辑');
      edit.type = 'button';
      edit.dataset.buxCaseEdit = item.id;
      edit.setAttribute('aria-label', '编辑案例 ' + item.title);
      var remove = el('button', null, '删除');
      remove.type = 'button';
      remove.dataset.buxCaseDelete = item.id;
      remove.setAttribute('aria-label', '删除案例 ' + item.title);
      actions.appendChild(edit);
      actions.appendChild(remove);
      card.appendChild(actions);
    }
    return card;
  }

  function syncCaseArchive() {
    var grid = q('#cases .case-grid');
    if (!grid) return;

    STATIC_CASE_ITEMS.forEach(function (item) {
      if (!q('[data-bux-case-id="' + item.id + '"]', grid)) {
        grid.appendChild(makeCaseCard(item, false));
      }
    });

    var customSignature = customCases.map(function (item) {
      return [item.id, item.updatedAt, item.title, item.date].join(':');
    }).join('|');
    if (grid.dataset.buxCustomSignature !== customSignature) {
      qa('.bux-custom-case', grid).forEach(function (card) { card.remove(); });
      customCases.forEach(function (item) { grid.appendChild(makeCaseCard(item, true)); });
      grid.dataset.buxCustomSignature = customSignature;
    }

    qa('.case-card', grid).forEach(function (card, index) {
      var time = q('time', card);
      if (!card.dataset.buxCaseDate) card.dataset.buxCaseDate = time ? time.textContent : '';
      if (!card.dataset.buxSortRank) card.dataset.buxSortRank = String(100 + index);
    });

    var cards = qa('.case-card:not(.bux-case-editor-card)', grid);
    var sorted = cards.slice().sort(function (a, b) {
      var dateDiff = sortDate(b.dataset.buxCaseDate) - sortDate(a.dataset.buxCaseDate);
      if (dateDiff) return dateDiff;
      return Number(a.dataset.buxSortRank) - Number(b.dataset.buxSortRank);
    });
    var current = cards.map(function (card) { return card.dataset.buxCaseId || q('h3', card).textContent; }).join('|');
    var desired = sorted.map(function (card) { return card.dataset.buxCaseId || q('h3', card).textContent; }).join('|');
    if (current !== desired) sorted.forEach(function (card) { grid.appendChild(card); });
    sorted.forEach(function (card, index) {
      var number = q(':scope > strong', card);
      var next = String(index + 1).padStart(2, '0');
      if (number && number.textContent !== next) number.textContent = next;
    });
    var editorCard = q('.bux-case-editor-card', grid);
    if (editorCard) grid.appendChild(editorCard);
  }

  function compressCaseImage(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var image = new Image();
        image.onerror = reject;
        image.onload = function () {
          var maxWidth = 1600;
          var maxHeight = 1100;
          var scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
          var canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(image.width * scale));
          canvas.height = Math.max(1, Math.round(image.height * scale));
          canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', .84));
        };
        image.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function resetCaseEditor() {
    if (!caseEditor) return;
    caseEditorResetting = true;
    caseEditor.form.reset();
    caseEditorResetting = false;
    caseEditor.form.elements.caseId.value = '';
    caseEditor.preview.removeAttribute('src');
    caseEditor.preview.hidden = true;
    caseEditor.save.textContent = '保存并加入案例库';
    caseEditor.status.textContent = '填写项目资料，新增内容仅保存在当前浏览器。';
  }

  function editCustomCase(id) {
    var item = customCases.find(function (entry) { return entry.id === id; });
    if (!item || !caseEditor) return;
    var form = caseEditor.form;
    form.elements.caseId.value = item.id;
    form.elements.title.value = item.title;
    form.elements.date.value = String(item.date).replace(/\./g, '-');
    form.elements.url.value = item.url || '';
    form.elements.type.value = item.type || '';
    qa('input[name="members"]', form).forEach(function (input) {
      input.checked = (item.members || []).includes(input.value);
    });
    caseEditor.preview.src = item.image;
    caseEditor.preview.hidden = false;
    caseEditor.save.textContent = '更新这个案例';
    caseEditor.status.textContent = '正在编辑：' + item.title;
    caseEditor.open();
  }

  function deleteCustomCase(id, button) {
    var item = customCases.find(function (entry) { return entry.id === id; });
    if (!item) return;
    if (button && button.dataset.buxConfirmDelete !== '1') {
      button.dataset.buxConfirmDelete = '1';
      button.textContent = '确认删除';
      if (caseEditor) caseEditor.status.textContent = '再次点击“确认删除”即可移除：' + item.title;
      setTimeout(function () {
        if (!button.isConnected || button.dataset.buxConfirmDelete !== '1') return;
        delete button.dataset.buxConfirmDelete;
        button.textContent = '删除';
      }, 5000);
      return;
    }
    customCases = customCases.filter(function (entry) { return entry.id !== id; });
    saveCustomCases();
    syncCaseArchive();
    if (caseEditor) caseEditor.status.textContent = '已删除：' + item.title;
  }

  function buildCaseEditor() {
    var cases = q('#cases');
    var grid = cases && q('.case-grid', cases);
    if (!cases || !grid) return;
    if (caseEditor && caseEditor.panel.isConnected) {
      if (!caseEditor.launcher || !caseEditor.launcher.isConnected) {
        var replacementLauncher = createCaseLauncher();
        grid.appendChild(replacementLauncher);
        caseEditor.launcher = replacementLauncher;
      }
      return;
    }

    var launcher = createCaseLauncher();
    grid.appendChild(launcher);

    var modal = el('div', 'bux-case-editor-modal');
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    var panel = el('section', 'bux-case-editor');
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-labelledby', 'bux-case-editor-title');
    panel.innerHTML =
      '<button class="bux-case-editor-close" type="button" aria-label="关闭案例编辑器">×</button>' +
      '<header><div><p>＋ CASE CREATOR / LOCAL EDITOR</p>' +
      '<h3 id="bux-case-editor-title">编辑并上传新案例</h3></div>' +
      '<span>图片会自动压缩，并保存在当前浏览器中。</span></header>' +
      '<form class="bux-case-form">' +
      '<input type="hidden" name="caseId">' +
      '<label><span>项目名称 *</span><input name="title" type="text" required maxlength="80" placeholder="输入项目名称"></label>' +
      '<label><span>项目时间 *</span><input name="date" type="date" required></label>' +
      '<label><span>项目链接 *</span><input name="url" type="url" required placeholder="https://..."></label>' +
      '<label><span>项目类型 *</span><input name="type" type="text" required maxlength="50" placeholder="例如：IP 联名 / 产品营销"></label>' +
      '<fieldset><legend>归属项目人 *</legend><div class="bux-member-checks"></div></fieldset>' +
      '<label class="bux-case-file"><span>点击上传项目图 *</span><input name="image" type="file" accept="image/*"><small>用于“查看详情”；支持 JPG / PNG / WEBP，新增案例时必选</small></label>' +
      '<div class="bux-case-preview"><img alt="待上传项目图预览" hidden></div>' +
      '<div class="bux-case-form-actions"><button type="submit">保存并加入案例库</button><button type="reset">清空</button></div>' +
      '<p class="bux-case-editor-status" role="status" aria-live="polite">填写项目资料，新增内容仅保存在当前浏览器。</p>' +
      '</form>';
    modal.appendChild(panel);
    document.body.appendChild(modal);

    var form = q('form', panel);
    var checks = q('.bux-member-checks', panel);
    Object.keys(PLAYER_LABELS).forEach(function (id) {
      var label = el('label');
      var input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'members';
      input.value = id;
      label.appendChild(input);
      label.appendChild(document.createTextNode(PLAYER_LABELS[id]));
      checks.appendChild(label);
    });
    caseEditor = {
      launcher: launcher,
      modal: modal,
      panel: panel,
      form: form,
      preview: q('.bux-case-preview img', panel),
      save: q('button[type="submit"]', panel),
      status: q('.bux-case-editor-status', panel),
      open: function () {
        modal.hidden = false;
        modal.setAttribute('aria-hidden', 'false');
        requestAnimationFrame(function () { modal.classList.add('is-open'); });
        document.body.classList.add('bux-editor-open');
        setTimeout(function () { form.elements.title.focus(); }, 80);
      },
      close: function () {
        modal.classList.remove('is-open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('bux-editor-open');
        setTimeout(function () { modal.hidden = true; }, 220);
      }
    };

    bindCaseLauncher();
    q('.bux-case-editor-close', panel).addEventListener('click', caseEditor.close);
    modal.addEventListener('mousedown', function (event) {
      if (event.target === modal) caseEditor.close();
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.hidden) caseEditor.close();
    });

    form.elements.image.addEventListener('change', function () {
      var file = form.elements.image.files && form.elements.image.files[0];
      if (!file) return;
      caseEditor.preview.src = URL.createObjectURL(file);
      caseEditor.preview.hidden = false;
    });
    form.addEventListener('reset', function () {
      if (!caseEditorResetting) setTimeout(resetCaseEditor, 0);
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      var id = form.elements.caseId.value;
      var existing = customCases.find(function (entry) { return entry.id === id; });
      var file = form.elements.image.files && form.elements.image.files[0];
      var assignedMembers = qa('input[name="members"]:checked', form);
      if (!assignedMembers.length) {
        caseEditor.status.textContent = '请至少选择一位归属项目人。';
        return;
      }
      if (!existing && !file) {
        caseEditor.status.textContent = '请先点击上传一张项目图。';
        return;
      }
      caseEditor.save.disabled = true;
      caseEditor.status.textContent = '正在处理图片并保存…';
      var imageTask = file ? compressCaseImage(file) : Promise.resolve(existing.image);
      imageTask.then(function (image) {
        var item = {
          id: existing ? existing.id : 'custom-' + Date.now(),
          title: form.elements.title.value.trim(),
          date: displayDate(form.elements.date.value),
          url: form.elements.url.value.trim(),
          type: form.elements.type.value.trim(),
          members: assignedMembers.map(function (input) { return input.value; }),
          image: image,
          sortRank: 20,
          updatedAt: Date.now()
        };
        if (existing) customCases = customCases.map(function (entry) { return entry.id === item.id ? item : entry; });
        else customCases.push(item);
        if (!saveCustomCases()) throw new Error('storage-full');
        syncCaseArchive();
        decorateCaseCards();
        resetCaseEditor();
        caseEditor.status.textContent = '已保存：' + item.title;
      }).catch(function (error) {
        caseEditor.status.textContent = error && error.message === 'storage-full'
          ? '保存空间不足，请换一张更小的图片后重试。'
          : '图片处理失败，请换一张图片后重试。';
      }).finally(function () { caseEditor.save.disabled = false; });
    });

    grid.addEventListener('click', function (event) {
      var edit = event.target.closest('[data-bux-case-edit]');
      var remove = event.target.closest('[data-bux-case-delete]');
      if (!edit && !remove) return;
      event.preventDefault();
      event.stopPropagation();
      if (edit) editCustomCase(edit.dataset.buxCaseEdit);
      if (remove) deleteCustomCase(remove.dataset.buxCaseDelete, remove);
    });
  }

  function createCaseLauncher() {
    var launcher = el('button', 'case-card bux-case-editor-card');
    launcher.type = 'button';
    launcher.dataset.buxCaseLauncher = '1';
    launcher.setAttribute('aria-label', '新增或编辑案例');
    launcher.innerHTML =
      '<span class="case-image"><i>＋</i><small>LOCAL EDITOR</small></span>' +
      '<strong>＋</strong><h3>新增案例</h3><p>上传封面 / 编辑资料</p>' +
      '<footer><time>YOUR TURN</time><span>打开编辑器 ↗</span></footer>';
    return launcher;
  }

  function bindCaseLauncher() {
    if (document.documentElement.dataset.buxCaseLauncherBound === '1') return;
    document.documentElement.dataset.buxCaseLauncherBound = '1';
    document.addEventListener('click', function (event) {
      var launcher = event.target.closest('[data-bux-case-launcher]');
      if (!launcher || !caseEditor) return;
      event.preventDefault();
      event.stopPropagation();
      resetCaseEditor();
      caseEditor.open();
    });
  }

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
          url: card.getAttribute('href') || card.dataset.buxUrl || ''
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
  function syncModalRelatedCases(copy) {
    var playerName = (q('#player-name', copy) || {}).textContent || '';
    var playerId = playerName.split('/')[0].trim().toLowerCase();
    if (!PLAYER_LABELS[playerId]) return;
    var related = STATIC_CASE_ITEMS.concat(customCases).filter(function (item) {
      return (item.members || []).includes(playerId);
    }).sort(function (a, b) { return sortDate(b.date) - sortDate(a.date); });
    var signature = related.map(function (item) { return item.id + ':' + item.updatedAt; }).join('|');
    if (copy.dataset.buxRelatedSignature === signature) return;
    qa('.bux-related-case', copy).forEach(function (link) { link.remove(); });
    copy.dataset.buxRelatedSignature = signature;

    var heading = qa('h4', copy).find(function (node) {
      return /RELATED SAVE POINTS/.test(node.textContent || '');
    });
    if (!heading) return;
    var container = q('.modal-cases', copy);
    if (!container) {
      container = el('div', 'modal-cases');
      heading.insertAdjacentElement('afterend', container);
    }
    related.forEach(function (item) {
      var link = el('a', 'bux-related-case');
      link.href = item.url || '#cases';
      link.dataset.buxCaseDate = displayDate(item.date);
      if (item.url) {
        link.target = '_blank';
        link.rel = 'noreferrer';
      }
      var image = el('img');
      image.src = item.image;
      image.alt = '';
      var text = el('span');
      text.appendChild(el('b', null, item.title));
      text.appendChild(el('small', null, displayDate(item.date) + '　' + (item.type || '自定义案例')));
      link.appendChild(image);
      link.appendChild(text);
      link.appendChild(el('i', null, '↗'));
      container.appendChild(link);
    });
    qa(':scope > a', container).sort(function (a, b) {
      var aDate = a.dataset.buxCaseDate || ((q('small', a) || {}).textContent || '');
      var bDate = b.dataset.buxCaseDate || ((q('small', b) || {}).textContent || '');
      return sortDate(bDate) - sortDate(aDate);
    }).forEach(function (link) { container.appendChild(link); });
  }

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
    syncModalRelatedCases(copy);

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

  function preloadJoyImages() {
    if (joyImagePreloads.length) return;
    ['./joy/xiaoyao-2years.jpg', './joy/team-building-2026.jpg'].forEach(function (src) {
      var image = new Image();
      image.decoding = 'async';
      image.src = src;
      joyImagePreloads.push(image);
      if (typeof image.decode === 'function') image.decode().catch(function () {});
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
    buildCaseEditor();
    syncCaseArchive();
    decorateCaseCards();
    decorateModal();
    syncJoyActive();
    preloadJoyImages();
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
