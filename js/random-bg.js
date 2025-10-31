;(function () {
  var maxCount = 40; // bg1.jpg ~ bg40.jpg
  try {
    var index = Math.floor(Math.random() * maxCount) + 1;
    var url = '/blog/image/bg' + index + '.jpg';
    // 以 !important 覆盖主题的固定背景
    var css = [
      'html, body {',
      '  background-image: url(' + url + ') !important;',
      '  background-repeat: no-repeat !important;',
      '  background-size: cover !important;',
      '  background-attachment: fixed !important;',
      '  background-position: center center !important;',
      '}'
    ].join('\n');
    var style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  } catch (e) {
    // 忽略错误，保持主题原有背景
  }
})();


