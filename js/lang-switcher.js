;(function () {
  var LANGS = [
    { code: 'zh-CN', label: '中文', prefix: '' },
    { code: 'en', label: 'English', prefix: '/en' },
    { code: 'ja', label: '日本語', prefix: '/ja' }
  ];

  var BASE = '/blog'; // 你的 root

  function getCurrentLang() {
    var p = location.pathname;
    if (p.indexOf(BASE + '/en/') === 0 || p === BASE + '/en') return 'en';
    if (p.indexOf(BASE + '/ja/') === 0 || p === BASE + '/ja') return 'ja';
    return 'zh-CN';
  }

  function buildTargetUrl(targetLang) {
    var url = new URL(location.href);
    var p = url.pathname;
    var cur = getCurrentLang();
    // 归一化：确保以 BASE 开头
    if (p.indexOf(BASE) !== 0) return BASE + (targetLang === 'zh-CN' ? '/' : ('/' + targetLang + '/'));

    // 去掉现有语言前缀
    var rest = p.slice(BASE.length);
    if (cur !== 'zh-CN') {
      var seg = '/' + cur;
      if (rest.indexOf(seg + '/') === 0) rest = rest.slice(seg.length); // /en/xxx -> /xxx
      else if (rest === seg) rest = '/';
    }

    // 拼接目标语言前缀
    var prefix = targetLang === 'zh-CN' ? '' : '/' + targetLang;
    var normalized = BASE + prefix + rest;
    // 双斜杠归一化
    normalized = normalized.replace(/\/\/+/, '/');
    return normalized + url.search + url.hash;
  }

  function createSwitcher() {
    var select = document.createElement('select');
    select.setAttribute('aria-label', 'language switcher');
    select.style.marginLeft = '8px';
    select.style.height = '28px';
    select.style.borderRadius = '4px';
    select.style.padding = '2px 6px';
    select.style.background = 'var(--card-bg, rgba(0,0,0,0.03))';
    select.style.color = 'inherit';

    LANGS.forEach(function (l) {
      var opt = document.createElement('option');
      opt.value = l.code;
      opt.textContent = l.label;
      select.appendChild(opt);
    });

    var preferred = localStorage.getItem('site_lang_pref');
    var cur = getCurrentLang();
    select.value = preferred || cur;

    select.addEventListener('change', function () {
      var next = select.value;
      localStorage.setItem('site_lang_pref', next);
      var target = buildTargetUrl(next);
      location.href = target;
    });

    return select;
  }

  function mount() {
    // 尝试挂载到导航栏
    var container = document.querySelector('#nav .menus_items') || document.querySelector('#nav') || document.querySelector('nav');
    if (!container) return;

    var wrapper = document.createElement('div');
    wrapper.style.display = 'inline-block';
    wrapper.style.marginLeft = '8px';
    wrapper.appendChild(createSwitcher());

    container.appendChild(wrapper);
  }

  // 首次访问按偏好语言跳转（仅首页路径时生效，避免干扰深链）
  try {
    var pref = localStorage.getItem('site_lang_pref');
    if (pref && getCurrentLang() !== pref) {
      // 仅在访问 BASE 或 BASE/ 时触发自动跳转
      if (location.pathname === BASE || location.pathname === BASE + '/') {
        location.replace(buildTargetUrl(pref));
        return;
      }
    }
  } catch (_) {}

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();


