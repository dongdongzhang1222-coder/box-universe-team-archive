(function () {
  'use strict';

  var launchParams = new URLSearchParams(location.search);
  if (launchParams.get('launch') === '1') {
    setTimeout(function () {
      launchParams.delete('launch');
      var cleanQuery = launchParams.toString();
      history.replaceState(null, '', location.pathname + (cleanQuery ? '?' + cleanQuery : '') + location.hash);
    }, 1500);
  }

  function q(selector, root) { return (root || document).querySelector(selector); }
  function qa(selector, root) { return Array.from((root || document).querySelectorAll(selector)); }
  function api(path, options) {
    return fetch(path, options).then(function (response) {
      return response.json().then(function (data) {
        if (!response.ok) throw new Error(data.error || '请求失败');
        return data;
      });
    });
  }
  var latestUploads = [];
  var pendingJoyFile = null;
  var joyEditor = null;
  var BUILT_IN_JOY_ITEMS = [
    {
      type: 'image/jpeg',
      url: './joy/xiaoyao-2years.jpg',
      title: '小垚 2 周年聚餐'
    },
    {
      type: 'image/jpeg',
      url: './joy/team-building-2026.jpg',
      title: '26 年首次团建'
    }
  ];
  var STATIC_JOY_ITEMS = [
    {
      id: 'leo-birthday-2026',
      type: 'image/jpeg',
      url: './joy/leo-birthday-2026.jpg',
      title: '两个狮子座的生日🎂',
      description: '统统闪开，狮子驾到！',
      static: true
    },
    {
      id: 'dongdong-3years',
      type: 'image/jpeg',
      url: './joy/dongdong-3years.jpg',
      title: '东东三周年',
      description: '吃了好吃的韩餐。',
      static: true
    }
  ];

  function fileToDataUrl(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function buildResourceDock() {
    if (q('.xiaoliao-dock')) return;
    var button = document.createElement('button');
    button.className = 'xiaoliao-dock';
    button.type = 'button';
    button.setAttribute('aria-label', '打开小料自取');
    button.innerHTML = '<span class="xiaoliao-art"><img src="./assets/resources/xiaoliao-screen-mobile.png" width="384" height="368" alt="小料自取"></span>';

    var modal = document.createElement('div');
    modal.className = 'xiaoliao-modal';
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML =
      '<section class="xiaoliao-panel" role="dialog" aria-modal="true" aria-labelledby="xiaoliao-title">' +
        '<button class="xiaoliao-close" type="button" aria-label="关闭">×</button>' +
        '<header><p>RESOURCE STATION / 团队资料站</p><h2 id="xiaoliao-title">小料自取</h2><span>品牌资料可直接预览，或下载到本地慢慢看。</span></header>' +
        '<div class="xiaoliao-list">' +
          '<article><span>PDF · 44 页 · 18.4 MB</span><h3>淘宝 IP 淘小宝规范手册 2026</h3><p>完整原版文件</p><div><a href="./assets/resources/taoxiaobao-brand-guide-2026.pdf" target="_blank" rel="noreferrer">在线预览</a><a href="./assets/resources/taoxiaobao-brand-guide-2026.pdf" download="淘宝IP淘小宝规范手册2026.pdf">下载原版</a></div></article>' +
          '<article><span>PDF · 59 页 · 网页优化版 9.6 MB</span><h3>2026 淘宝品牌规范</h3><p>完整页数，适合网页预览与下载</p><div><a href="./assets/resources/taobao-brand-guide-2026-preview.pdf" target="_blank" rel="noreferrer">快速预览</a><a href="./assets/resources/taobao-brand-guide-2026-preview.pdf" download="2026淘宝品牌规范.pdf">下载 PDF</a></div></article>' +
        '</div>' +
      '</section>';
    document.body.appendChild(button);
    document.body.appendChild(modal);

    var storedPosition = null;
    try { storedPosition = JSON.parse(localStorage.getItem('xiaoliao-dock-position-v2') || 'null'); } catch (_) {}
    if (storedPosition && Number.isFinite(storedPosition.left) && Number.isFinite(storedPosition.top)) {
      button.style.left = Math.max(0, Math.min(innerWidth - button.offsetWidth, storedPosition.left)) + 'px';
      button.style.top = Math.max(0, Math.min(innerHeight - button.offsetHeight, storedPosition.top)) + 'px';
      button.style.right = 'auto';
    }

    var drag = null;
    var dragged = false;
    button.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      var rect = button.getBoundingClientRect();
      drag = { x: event.clientX, y: event.clientY, left: rect.left, top: rect.top };
      dragged = false;
      button.classList.add('is-dragging');
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove', function (event) {
      if (!drag) return;
      var dx = event.clientX - drag.x;
      var dy = event.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 5) dragged = true;
      button.style.left = Math.max(0, Math.min(innerWidth - button.offsetWidth, drag.left + dx)) + 'px';
      button.style.top = Math.max(0, Math.min(innerHeight - button.offsetHeight, drag.top + dy)) + 'px';
      button.style.right = 'auto';
    });
    button.addEventListener('pointerup', function () {
      if (!drag) return;
      drag = null;
      button.classList.remove('is-dragging');
      if (dragged) {
        try { localStorage.setItem('xiaoliao-dock-position-v2', JSON.stringify({ left: parseFloat(button.style.left), top: parseFloat(button.style.top) })); } catch (_) {}
      }
    });

    function open() {
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(function () { modal.classList.add('is-open'); });
      q('.xiaoliao-close', modal).focus();
    }
    function close() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      setTimeout(function () { modal.hidden = true; }, 180);
      button.focus();
    }
    button.addEventListener('click', function (event) {
      if (dragged) { event.preventDefault(); dragged = false; return; }
      open();
    });
    function syncDockVisibility() { button.hidden = !!q('.entry-page'); }
    syncDockVisibility();
    new MutationObserver(syncDockVisibility).observe(document.body, { childList: true, subtree: true });
    q('.xiaoliao-close', modal).addEventListener('click', close);
    modal.addEventListener('mousedown', function (event) { if (event.target === modal) close(); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.hidden) close();
    });
  }

  function makeIdeaCard(item) {
    var article = document.createElement('article');
    article.className = 'idea-card cn-shared-card';
    article.dataset.uploadId = item.id;
    var visual;
    if (String(item.type).startsWith('image/')) {
      visual = document.createElement('img'); visual.src = item.url; visual.alt = item.name;
    } else if (String(item.type).startsWith('video/')) {
      visual = document.createElement('video'); visual.src = item.url; visual.controls = true; visual.preload = 'metadata';
    } else {
      visual = document.createElement('div'); visual.className = 'file-icon'; visual.textContent = item.format.slice(0, 4);
    }
    var meta = document.createElement('div');
    meta.className = 'idea-meta';
    meta.innerHTML = '<span>' + item.format + ' · 团队共享</span><h3></h3><p>' + (item.size / 1048576).toFixed(1) + ' MiB</p><div><a target="_blank" rel="noreferrer">打开</a><a download>下载</a><button type="button" class="cn-upload-delete">删除</button></div>';
    q('h3', meta).textContent = item.name;
    qa('a', meta).forEach(function (link) { link.href = item.url; });
    qa('a', meta)[1].download = item.name;
    q('button', meta).addEventListener('click', function () {
      if (!confirm('确认从团队共享空间删除“' + item.name + '”？')) return;
      api('/api/uploads/' + encodeURIComponent(item.id), { method: 'DELETE' }).then(function () { article.remove(); });
    });
    article.appendChild(visual); article.appendChild(meta);
    return article;
  }

  function buildJoyEditor() {
    if (joyEditor) return joyEditor;
    var modal = document.createElement('div');
    modal.className = 'cn-joy-editor-modal';
    modal.hidden = true;
    modal.innerHTML = '<form class="cn-joy-editor" role="dialog" aria-modal="true" aria-labelledby="cn-joy-editor-title">' +
      '<button type="button" class="cn-joy-editor-close" aria-label="关闭团队照片编辑器">×</button>' +
      '<p>NEW MEMORY / 新增团队存档</p><h3 id="cn-joy-editor-title">填写照片信息</h3>' +
      '<label><span>图片名 *</span><input name="title" maxlength="40" required placeholder="例如：夏日团建"></label>' +
      '<label><span>一句话描述 *</span><input name="description" maxlength="70" required placeholder="写下这张照片的快乐瞬间"></label>' +
      '<button type="submit">保存为下一条团队存档</button><small role="status"></small></form>';
    document.body.appendChild(modal);
    var form = q('form', modal);
    function close() { modal.hidden = true; pendingJoyFile = null; form.reset(); }
    q('.cn-joy-editor-close', modal).addEventListener('click', close);
    modal.addEventListener('mousedown', function (event) { if (event.target === modal) close(); });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!pendingJoyFile) return;
      var submit = q('button[type="submit"]', form);
      var status = q('small', form);
      submit.disabled = true;
      status.textContent = '正在持久保存…';
      uploadSharedFile(pendingJoyFile, 'joy', {
        title: form.elements.title.value.trim(),
        description: form.elements.description.value.trim()
      }).then(function () { close(); }).catch(function (error) {
        status.textContent = '保存失败：' + error.message;
      }).finally(function () { submit.disabled = false; });
    });
    joyEditor = { modal: modal, form: form };
    return joyEditor;
  }

  function openJoyEditor(file) {
    var editor = buildJoyEditor();
    pendingJoyFile = file;
    editor.form.elements.title.value = file.name.replace(/\.[^.]+$/, '').slice(0, 40);
    editor.form.elements.description.value = '';
    editor.modal.hidden = false;
    setTimeout(function () { editor.form.elements.title.focus(); }, 30);
  }

  function showJoyItem(item, number) {
    var media = q('.joy-media');
    var now = q('.joy-now');
    if (!media || !now) return;
    media.innerHTML = '';
    var visual = document.createElement(String(item.type).startsWith('video/') ? 'video' : 'img');
    visual.src = item.url;
    if (visual.tagName === 'VIDEO') visual.controls = true;
    else visual.alt = item.title || item.name;
    media.appendChild(visual);
    now.textContent = 'NOW PLAYING / ' + String(number).padStart(2, '0') + '　' + (item.title || item.name);
  }

  function bindBuiltInJoyRows(hotspots) {
    qa(':scope > button', hotspots).slice(0, BUILT_IN_JOY_ITEMS.length).forEach(function (button, index) {
      if (button.dataset.cnJoyBound === '1') return;
      button.dataset.cnJoyBound = '1';
      button.type = 'button';
      button.addEventListener('click', function (event) {
        event.stopPropagation();
        showJoyItem(BUILT_IN_JOY_ITEMS[index], index + 1);
      });
    });
  }

  function buildJoySketch() {
    var screen = q('.joy-screen');
    if (!screen || q('.cn-joy-sketch', screen)) return;

    var sticker = document.createElement('button');
    sticker.type = 'button';
    sticker.className = 'cn-joy-sketch';
    sticker.setAttribute('aria-label', '查看东东三周年手绘纪念图');
    sticker.innerHTML = '<span>MEMORY SKETCH</span><img src="./joy/dongdong-3years-illustration.jpg" alt="东东三周年团队手绘纪念图">';

    var modal = document.createElement('div');
    modal.className = 'cn-joy-sketch-modal';
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = '<button type="button" class="cn-joy-sketch-close" aria-label="关闭手绘纪念图">×</button>' +
      '<figure><img src="./joy/dongdong-3years-illustration.jpg" alt="东东三周年团队手绘纪念图"><figcaption>MEMORY SKETCH / 东东三周年</figcaption></figure>';

    function open() {
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(function () { modal.classList.add('is-open'); });
    }
    function close() {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      setTimeout(function () { modal.hidden = true; }, 180);
    }

    sticker.addEventListener('click', open);
    q('.cn-joy-sketch-close', modal).addEventListener('click', close);
    modal.addEventListener('mousedown', function (event) { if (event.target === modal) close(); });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.hidden) close();
    });
    screen.appendChild(sticker);
    document.body.appendChild(modal);
  }

  function renderJoyArchive(items) {
    var oldGallery = q('.cn-joy-gallery');
    if (oldGallery) oldGallery.remove();
    var hotspots = q('.joy-hotspots');
    if (!hotspots) return;
    buildJoySketch();
    bindBuiltInJoyRows(hotspots);
    qa('.cn-joy-upload-row', hotspots).forEach(function (node) { node.remove(); });
    var joyItems = STATIC_JOY_ITEMS.concat(items.filter(function (item) { return item.space === 'joy'; }));
    hotspots.classList.toggle('cn-joy-list-mode', joyItems.length > 0);
    var uploadLabel = q(':scope > label', hotspots);
    if (uploadLabel) {
      uploadLabel.setAttribute('role', 'button');
      uploadLabel.setAttribute('aria-label', '上传新的团队照片或视频');
    }
    joyItems.forEach(function (item, index) {
      var number = index + 3;
      var row = document.createElement('div');
      row.className = 'cn-joy-upload-row' + (item.static ? ' cn-joy-static-row' : '');
      var select = document.createElement('button');
      select.type = 'button';
      select.className = 'cn-joy-select';
      select.innerHTML = '<strong>' + String(number).padStart(2, '0') + '</strong><span><b></b><small></small></span>';
      q('b', select).textContent = item.title || item.name;
      q('small', select).textContent = item.description || '团队上传的快乐存档。';
      select.addEventListener('click', function () { showJoyItem(item, number); });
      row.appendChild(select);
      if (!item.static) {
        var remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'cn-joy-delete';
        remove.textContent = '删除';
        remove.setAttribute('aria-label', '删除团队照片 ' + (item.title || item.name));
        remove.addEventListener('click', function () {
          if (!confirm('确认删除“' + (item.title || item.name) + '”？')) return;
          api('/api/uploads/' + encodeURIComponent(item.id), { method: 'DELETE' }).then(loadUploads);
        });
        row.appendChild(remove);
      }
      hotspots.insertBefore(row, uploadLabel);
    });
  }

  function renderSharedUploads(items) {
    var ideaWrap = q('.idea-bank .idea-cards');
    if (ideaWrap) {
      qa('.cn-shared-card', ideaWrap).forEach(function (node) { node.remove(); });
      items.filter(function (item) { return item.space === 'idea'; }).forEach(function (item) {
        ideaWrap.insertBefore(makeIdeaCard(item), q('.idea-upload', ideaWrap));
      });
    }
    renderJoyArchive(items);
  }

  function loadUploads() {
    api('/api/uploads').then(function (data) {
      latestUploads = data.uploads || [];
      renderSharedUploads(latestUploads);
      var status = q('.idea-status');
      if (status && !status.textContent.startsWith('已保存')) status.textContent = '上传内容会持久保存到团队共享空间，刷新或重新打开后仍可查看。';
    }).catch(function () {});
  }

  function uploadSharedFile(file, space, metadata) {
      var status = space === 'idea' ? q('.idea-status') : null;
      if (file.size > 100 * 1024 * 1024) return Promise.reject(new Error('文件超过 100 MiB'));
      if (status) status.textContent = '正在保存到团队共享空间…';
      fileToDataUrl(file).then(function (data) {
        return api('/api/uploads', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: file.name, type: file.type, format: (file.name.split('.').pop() || 'FILE').toUpperCase(), space: space, title: metadata && metadata.title, description: metadata && metadata.description, data: data })
        });
      }).then(function () {
        if (status) status.textContent = '已保存到团队共享空间：' + file.name;
        return loadUploads();
      }).catch(function (error) {
        if (status) status.textContent = '共享保存失败：' + error.message;
        throw error;
      });
  }

  function bindPersistentUploads() {
    document.addEventListener('change', function (event) {
      var input = event.target;
      if (!input || input.type !== 'file' || !input.files || !input.files[0]) return;
      var space = input.closest('#knowledge') ? 'idea' : input.closest('#joy') ? 'joy' : '';
      if (space === 'joy') {
        event.stopPropagation();
        openJoyEditor(input.files[0]);
        input.value = '';
        return;
      }
      if (space) uploadSharedFile(input.files[0], space).catch(function () {});
    }, true);
    document.addEventListener('drop', function (event) {
      var zone = event.target.closest && event.target.closest('.idea-upload');
      var file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
      if (zone && file) uploadSharedFile(file, 'idea');
    }, true);
  }

  function init() {
    buildResourceDock();
    bindPersistentUploads();
    loadUploads();
    var observer = new MutationObserver(function () {
      if (!q('.idea-bank') || !q('.joy-screen')) return;
      observer.disconnect();
      renderSharedUploads(latestUploads);
      var status = q('.idea-status');
      if (status) status.textContent = '上传内容会持久保存到团队共享空间，刷新或重新打开后仍可查看。';
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
