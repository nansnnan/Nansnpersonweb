(() => {
  'use strict';

  const VERSION = 'v1.0.10';

  const RELEASES = [
    {
      version: 'v1.0.10',
      date: '2026-11-18',
      items: [
        '青云杯出场名单加入同人规避：同一轮中优先避免同一选手代表多支队伍出场；两队共用选手时，成员充足则改派该队其他队员。'
      ]
    },
    {
      version: 'v1.0.9',
      date: '2026-11-18',
      items: [
        '青云杯比分改为胜方获得分差、未得分一方计 0 分，单副、局分与总分不再出现负分。'
      ]
    },
    {
      version: 'v1.0.8',
      date: '2026-11-18',
      items: [
        '调整青云杯模拟器每局副数：第一赛段 12 副、第二赛段 16 副、第三至第五赛段 20 副；第二至第五赛段决胜局为 8 副，第一赛段不设 8 副决胜局。'
      ]
    },
    {
      version: 'v1.0.7',
      date: '2026-11-18',
      items: [
        '首页新增「斗地主比赛模拟」分类，上线「青云杯模拟器」。',
        '按青云杯赛制实现 24 队瑞士轮、三败淘汰赛、半决赛与决赛，支持随机对阵、单局/整场模拟和赛段/本届数据汇总。',
        '内置 24 队名单与隐藏选手实力，按复式团体赛两桌计分，统计净胜分、总胜率、地主/农民胜率与平均叫分，并支持随时重新开始。'
      ]
    },
    {
      version: 'v1.0.6',
      date: '2026-11-17',
      items: [
        '残局挑战新增积分系统：胜利 +2～10 分，失败 -2～10 分，积分可为负数。',
        '新增段位系统与公开段位表，段位随积分自动变化，可通过「段位表」悬浮窗口查看。',
        '新增金币系统：初始 100，重新发牌消耗 10；胜利 +10～100，失败 -10～50；金币为 0 时可免费领取 20。'
      ]
    },
    {
      version: 'v1.0.5',
      date: '2026-11-17',
      items: [
        '残局挑战双方手牌改为各自随机 5–15 张，允许双方张数不同。',
        '对局进行中禁用「重新发牌」，仅在本方尚未出牌或本局结束后才能重新开始。'
      ]
    },
    {
      version: 'v1.0.4',
      date: '2026-11-17',
      items: [
        '残局挑战新增对手牌面开关，可随时切换显示或隐藏对手手牌。'
      ]
    },
    {
      version: 'v1.0.3',
      date: '2026-11-17',
      items: [
        '新增「斗地主残局挑战」工具，与机器自动对弈；每局双方各自随机 5–15 张牌，你先出牌。',
        '对局严格按斗地主牌型与大小规则校验，先出完牌者获胜，并记录双方出牌过程。'
      ]
    },
    {
      version: 'v1.0.2',
      date: '2026-11-16',
      items: [
        '新增「斗地主研讨」工具，可输入三家手牌，按标准规则校验牌型、出牌并记录过程。',
        '功能区新增「斗地主」分类，将发牌器与研讨工具归入同一分组。'
      ]
    },
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
