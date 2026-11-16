(() => {
  'use strict';

  const VERSION = 'v1.0.1';

  const RELEASES = [
    {
      version: 'v1.0.1',
      date: '2026-11-16',
      items: [
        '功能区移除全部预设占位，上线首个工具「斗地主发牌器」。',
        '发牌器支持随机发牌、指定 3 / 4 / 5 炸及以上牌型，以及随机底牌概率统计。'
      ]
    },
    {
      version: 'v1.0.0',
      date: '2026-11-16',
      items: [
        '站点正式上线，支持自定义域名与 HTTPS 访问。',
        '新增站内搜索，输入关键词即可定位内容，支持匹配高亮、方向键选择与回车跳转。',
        '搭建功能区框架，预留图片压缩、二维码生成、文本对比、时间戳转换、单位换算等工具位。',
        '全站适配手机与桌面端，并跟随系统自动切换深色模式。',
        '页脚新增版本号与更新公告入口。'
      ]
    }
  ];

  document.querySelectorAll('[data-site-version]').forEach((el) => {
    el.textContent = VERSION;
  });

  const changelogBody = document.querySelector('#changelog .modal-body');

  if (changelogBody) {
    RELEASES.forEach((release) => {
      const article = document.createElement('article');
      article.className = 'release';

      const head = document.createElement('div');
      head.className = 'release-head';

      const version = document.createElement('h3');
      version.className = 'release-version';
      version.textContent = release.version;

      const date = document.createElement('time');
      date.className = 'release-date';
      date.dateTime = release.date;
      date.textContent = release.date;

      head.append(version, date);

      const list = document.createElement('ul');
      list.className = 'release-list';

      release.items.forEach((text) => {
        const item = document.createElement('li');
        item.textContent = text;
        list.append(item);
      });

      article.append(head, list);
      changelogBody.append(article);
    });
  }

  const openDialogOf = () => document.querySelector('.modal:not([hidden])');

  function getFocusable(dialog) {
    return [...dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter((el) => el.offsetParent !== null);
  }

  function openDialog(dialog) {
    if (!dialog || !dialog.hidden) return;

    dialog._lastFocused = document.activeElement;
    dialog.hidden = false;
    document.body.classList.add('modal-open');

    const target = dialog.querySelector('.modal-close') || getFocusable(dialog)[0];
    target?.focus();
  }

  function closeDialog(dialog) {
    if (!dialog || dialog.hidden) return;

    dialog.hidden = true;

    if (!openDialogOf()) document.body.classList.remove('modal-open');

    const lastFocused = dialog._lastFocused;
    delete dialog._lastFocused;
    if (lastFocused?.isConnected) lastFocused.focus();
  }

  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-dialog-open]');
    if (opener) {
      event.preventDefault();
      openDialog(document.getElementById(opener.dataset.dialogOpen));
      return;
    }

    const closer = event.target.closest('[data-close]');
    if (closer) closeDialog(closer.closest('.modal'));
  });

  document.addEventListener('keydown', (event) => {
    const dialog = openDialogOf();
    if (!dialog) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeDialog(dialog);
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = getFocusable(dialog);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})();
