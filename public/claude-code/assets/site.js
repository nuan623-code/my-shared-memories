/* =============================================================================
   Claude Code 学习站 · 共用脚本
   功能:主题三档切换(跟随系统/浅色/深色)、阅读进度条、目录生成与高亮、
        Tip 索引搜索、prompt 一键复制。
   注意:各页面 <head> 里另有一段内联的主题引导脚本(防白闪),两处的
        localStorage 键名必须一致:cc-theme ∈ system|light|dark。
   ========================================================================== */
(function () {
  'use strict';

  /* ---- 界面语言:按 <html lang> 切换文案(en 页面复用同一份脚本) ---- */
  var EN = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var T = EN
    ? { system: 'System', light: 'Light', dark: 'Dark', themeLabel: 'Theme',
        copy: 'Copy', copied: 'Copied',
        noHit: 'No matching tip. Try another keyword, or browse the clusters below.' }
    : { system: '跟随系统', light: '浅色', dark: '深色', themeLabel: '主题切换',
        copy: '复制', copied: '已复制',
        noHit: '没有命中的 Tip。换个关键词试试,或浏览下面的分簇列表。' };

  /* ---- 主题三档切换 ---- */
  var KEY = 'cc-theme';
  function getMode() {
    try {
      var v = localStorage.getItem(KEY);
      return v === 'light' || v === 'dark' ? v : 'system';
    } catch (e) { return 'system'; }
  }
  function applyMode(mode) {
    var root = document.documentElement;
    if (mode === 'light' || mode === 'dark') root.setAttribute('data-theme', mode);
    else root.removeAttribute('data-theme');
  }
  function initThemeSwitch() {
    var host = document.getElementById('theme-switch');
    if (!host) return;
    var modes = [['system', T.system], ['light', T.light], ['dark', T.dark]];
    host.setAttribute('role', 'group');
    host.setAttribute('aria-label', T.themeLabel);
    modes.forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = m[1];
      b.dataset.mode = m[0];
      b.addEventListener('click', function () {
        try { localStorage.setItem(KEY, m[0]); } catch (e) { /* 隐私模式下忽略 */ }
        applyMode(m[0]);
        render();
      });
      host.appendChild(b);
    });
    function render() {
      var cur = getMode();
      host.querySelectorAll('button').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.mode === cur));
      });
    }
    render();
  }

  /* ---- 阅读进度条 ---- */
  function initProgress() {
    var bar = document.getElementById('cc-progress');
    if (!bar) return;
    function update() {
      var doc = document.documentElement;
      var max = doc.scrollHeight - doc.clientHeight;
      bar.style.width = (max > 0 ? (doc.scrollTop / max) * 100 : 0) + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---- 目录:从正文 h2/h3 生成,滚动时高亮当前节 ---- */
  function initToc() {
    var toc = document.getElementById('toc');
    var doc = document.querySelector('article.doc');
    if (!toc || !doc) return;
    var heads = doc.querySelectorAll('h2, h3');
    if (!heads.length) { toc.style.display = 'none'; return; }
    var ol = document.createElement('ol');
    heads.forEach(function (h, i) {
      if (!h.id) h.id = 'sec-' + (i + 1);
      var li = document.createElement('li');
      if (h.tagName === 'H3') li.className = 'lv3';
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      ol.appendChild(li);
    });
    toc.appendChild(ol);
    var links = toc.querySelectorAll('a');
    function highlight() {
      var pos = window.scrollY + 90;
      var current = links[0];
      heads.forEach(function (h, i) { if (h.offsetTop <= pos) current = links[i]; });
      links.forEach(function (a) { a.classList.toggle('active', a === current); });
    }
    window.addEventListener('scroll', highlight, { passive: true });
    highlight();
  }

  /* ---- Tip 索引搜索:数据在 #tips-index 的内联 JSON 里(每日任务维护) ---- */
  function initTipsSearch() {
    var input = document.getElementById('tips-search');
    var dataEl = document.getElementById('tips-index');
    var results = document.getElementById('search-results');
    var clusters = document.getElementById('tips-clusters');
    if (!input || !dataEl || !results || !clusters) return;
    var index = [];
    try { index = JSON.parse(dataEl.textContent) || []; } catch (e) { index = []; }
    input.addEventListener('input', function () {
      var q = input.value.trim().toLowerCase();
      if (!q) {
        results.classList.remove('on');
        clusters.classList.remove('off');
        return;
      }
      var terms = q.split(/\s+/);
      var hits = index.filter(function (t) {
        var hay = [t.title, t.question, t.summary, t.cluster, (t.keywords || []).join(' ')]
          .join(' ').toLowerCase();
        return terms.every(function (w) { return hay.indexOf(w) !== -1; });
      });
      var base = EN ? '/en/claude-code/tips/' : '/claude-code/tips/';
      var html = hits.length
        ? '<ul class="tip-list">' + hits.map(function (t) {
            return '<li><a href="' + base + t.slug + '.html">' +
              '<span class="chip">' + t.cluster + '</span><span>' + t.title + '</span></a></li>';
          }).join('') + '</ul>'
        : '<p class="no-hit">' + T.noHit + '</p>';
      results.innerHTML = html;
      results.classList.add('on');
      clusters.classList.add('off');
    });
  }

  /* ---- prompt 一键复制 ---- */
  function initCopy() {
    document.querySelectorAll('pre.prompt').forEach(function (pre) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.textContent = T.copy;
      btn.addEventListener('click', function () {
        var code = pre.querySelector('code');
        var text = (code || pre).innerText.replace(new RegExp('^' + T.copy + '\\n?'), '');
        navigator.clipboard.writeText(text).then(function () {
          btn.textContent = T.copied;
          setTimeout(function () { btn.textContent = T.copy; }, 1600);
        });
      });
      pre.appendChild(btn);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    initThemeSwitch();
    initProgress();
    initToc();
    initTipsSearch();
    initCopy();
  });
})();
