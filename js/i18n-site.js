;(function () {
  // 简单的前端覆盖：按路径语言调整站点标题、副标题与菜单文本
  var langs = {
    'zh-CN': {
      title: 'hiver-Blog',
      subtitles: ['欢迎来到我的博客！', '记录与分享'],
      menu: {
        '/blog/': '主页',
        '/blog/archives/': '归档',
        '/blog/tags/': '标签',
        '/blog/categories/': '分类',
        '/blog/link/': '链接',
        '/blog/about/': '关于'
      }
    },
    'en': {
      title: 'hiver Blog',
      subtitles: ['Welcome to my blog!', 'Notes and Sharing'],
      menu: {
        '/blog/': 'Home',
        '/blog/archives/': 'Archives',
        '/blog/tags/': 'Tags',
        '/blog/categories/': 'Categories',
        '/blog/link/': 'Links',
        '/blog/about/': 'About'
      }
    },
    'ja': {
      title: 'hiverのブログ',
      subtitles: ['ようこそ！', '記録とシェア'],
      menu: {
        '/blog/': 'ホーム',
        '/blog/archives/': 'アーカイブ',
        '/blog/tags/': 'タグ',
        '/blog/categories/': 'カテゴリー',
        '/blog/link/': 'リンク',
        '/blog/about/': 'について'
      }
    }
  };

  function detectLang() {
    var p = location.pathname;
    if (/^\/blog\/en\//.test(p) || p === '/blog/en' || p === '/en/' || p === '/en') return 'en';
    if (/^\/blog\/ja\//.test(p) || p === '/blog/ja' || p === '/ja/' || p === '/ja') return 'ja';
    return 'zh-CN';
  }

  function setText(el, text) { if (el && typeof text === 'string') el.textContent = text; }
  function pickSubtitle(arr) { return Array.isArray(arr) && arr.length ? arr[0] : ''; }

  function rewriteMenu(menuMap) {
    try {
      var anchors = document.querySelectorAll('nav a, #nav a, .menus_item a, .menu a');
      if (!anchors || !anchors.length) return;
      anchors.forEach(function (a) {
        var href = a.getAttribute('href') || '';
        // 归一化为以 /blog/ 开头
        if (href === '/') href = '/blog/';
        if (/^\/archives\/?$/.test(href)) href = '/blog/archives/';
        if (/^\/tags\/?$/.test(href)) href = '/blog/tags/';
        if (/^\/categories\/?$/.test(href)) href = '/blog/categories/';
        if (/^\/link\/?$/.test(href)) href = '/blog/link/';
        if (/^\/about\/?$/.test(href)) href = '/blog/about/';
        var key = Object.keys(menuMap).find(function (k) { return href.indexOf(k) === 0; });
        if (key) setText(a, menuMap[key]);
      });
    } catch (_) {}
  }

  try {
    var lang = detectLang();
    var conf = langs[lang] || langs['zh-CN'];
    if (conf.title) document.title = conf.title;
    var siteTitle = document.querySelector('#site-title')
      || document.querySelector('.site-title')
      || document.querySelector('#site-name')
      || document.querySelector('#site-name a');
    setText(siteTitle, conf.title);

    var subtitleEl = document.querySelector('#subtitle')
      || document.querySelector('.subtitle')
      || document.querySelector('.site-subtitle');
    setText(subtitleEl, pickSubtitle(conf.subtitles));

    if (conf.menu) rewriteMenu(conf.menu);
  } catch (e) {
    // 忽略
  }
})();


