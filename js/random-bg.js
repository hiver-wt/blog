;(function () {
  var maxCount = 40; // bg1.jpg ~ bg40.jpg
  try {
    var index = Math.floor(Math.random() * maxCount) + 1;
    var url = '/blog/image/bg' + index + '.jpg';
    var body = document.body;
    if (!body) return;
    body.style.backgroundImage = 'url(' + url + ')';
    body.style.backgroundRepeat = 'no-repeat';
    body.style.backgroundSize = 'cover';
    body.style.backgroundAttachment = 'fixed';
    body.style.backgroundPosition = 'center center';
  } catch (e) {
    // 忽略错误，保持主题原有背景
  }
})();


