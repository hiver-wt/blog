;(function () {
  // 简单的前端覆盖：按路径语言调整站点标题与副标题
  var langs = {
    'zh-CN': { title: 'hiver-Blog', subtitles: ['欢迎来到我的博客！', '记录与分享'] },
    'en': { title: 'hiver Blog', subtitles: ['Welcome to my blog!', 'Notes and Sharing'] },
    'ja': { title: 'hiverのブログ', subtitles: ['ようこそ！', '記録とシェア'] }
  };

  function detectLang() {
    var p = location.pathname;
    if (/^\/blog\/en\//.test(p) || p === '/blog/en' || p === '/en/' || p === '/en') return 'en';
    if (/^\/blog\/ja\//.test(p) || p === '/blog/ja' || p === '/ja/' || p === '/ja') return 'ja';
    return 'zh-CN';
  }

  function setText(el, text) { if (el && typeof text === 'string') el.textContent = text; }

  function pickSubtitle(arr) { return Array.isArray(arr) && arr.length ? arr[0] : ''; }

  try {
    var lang = detectLang();
    var conf = langs[lang] || langs['zh-CN'];
    // document.title
    if (conf.title) document.title = conf.title;
    // 尝试多种选择器兼容主题不同版本
    var siteTitle = document.querySelector('#site-title')
      || document.querySelector('.site-title')
      || document.querySelector('#site-name')
      || document.querySelector('#site-name a');
    setText(siteTitle, conf.title);

    var subtitleEl = document.querySelector('#subtitle')
      || document.querySelector('.subtitle')
      || document.querySelector('.site-subtitle');
    var sub = pickSubtitle(conf.subtitles);
    setText(subtitleEl, sub);
  } catch (e) {
    // 忽略
  }
})();


