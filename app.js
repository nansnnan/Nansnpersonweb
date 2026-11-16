(() => {
  'use strict';

  const input = document.getElementById('site-search');
  const results = document.getElementById('search-results');

  const MAX_RESULTS = 6;

  const index = buildIndex();
  let activeIndex = -1;
  let currentItems = [];

  function buildIndex() {
    const items = [];

    document.querySelectorAll('.section').forEach((section) => {
      const title = section.querySelector('.section-title');
      const desc = section.querySelector('.section-desc');
      if (!title) return;

      items.push({
        title: title.textContent.trim(),
        desc: desc ? desc.textContent.trim() : '',
        tag: '章节',
        target: section
      });
    });

    document.querySelectorAll('.card').forEach((card) => {
      const title = card.querySelector('.card-title');
      const desc = card.querySelector('.card-desc');
      const badge = card.querySelector('.card-badge');
      if (!title) return;

      items.push({
        title: title.textContent.trim(),
        desc: desc ? desc.textContent.trim() : '',
        tag: badge ? badge.textContent.trim() : '功能',
        target: card
      });
    });

    return items;
  }

  function score(item, query) {
    const title = item.title.toLowerCase();
    const desc = item.desc.toLowerCase();
    if (title === query) return 100;
    if (title.startsWith(query)) return 80;
    if (title.includes(query)) return 60;
    if (desc.includes(query)) return 30;
    return 0;
  }

  function search(query) {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    return index
      .map((item) => ({ item, score: score(item, q) }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_RESULTS)
      .map((entry) => entry.item);
  }

  function highlight(text, query) {
    const fragment = document.createDocumentFragment();
    const q = query.trim().toLowerCase();
    if (!q) {
      fragment.append(text);
      return fragment;
    }

    const lower = text.toLowerCase();
    let cursor = 0;
    let pos = lower.indexOf(q);

    while (pos !== -1) {
      if (pos > cursor) fragment.append(text.slice(cursor, pos));
      const mark = document.createElement('mark');
      mark.textContent = text.slice(pos, pos + q.length);
      fragment.append(mark);
      cursor = pos + q.length;
      pos = lower.indexOf(q, cursor);
    }

    if (cursor < text.length) fragment.append(text.slice(cursor));
    return fragment;
  }

  function render(query) {
    results.textContent = '';
    activeIndex = -1;

    if (!query.trim()) {
      close();
      return;
    }

    currentItems = search(query);

    if (currentItems.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'search-empty';
      empty.textContent = `没有找到与「${query.trim()}」相关的内容`;
      results.append(empty);
      open();
      return;
    }

    currentItems.forEach((item, i) => {
      const li = document.createElement('li');
      li.className = 'search-result';
      li.id = `search-option-${i}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');

      const head = document.createElement('div');
      head.className = 'search-result-head';

      const title = document.createElement('span');
      title.className = 'search-result-title';
      title.append(highlight(item.title, query));

      const tag = document.createElement('span');
      tag.className = 'search-result-tag';
      tag.textContent = item.tag;

      head.append(title, tag);

      const desc = document.createElement('p');
      desc.className = 'search-result-desc';
      desc.textContent = item.desc;

      li.append(head, desc);
      li.addEventListener('mousedown', (event) => event.preventDefault());
      li.addEventListener('click', () => select(i));

      results.append(li);
    });

    open();
  }

  function open() {
    results.hidden = false;
    input.setAttribute('aria-expanded', 'true');
  }

  function close() {
    results.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    activeIndex = -1;
  }

  function setActive(index) {
    const options = results.querySelectorAll('.search-result');
    if (options.length === 0) return;

    activeIndex = (index + options.length) % options.length;

    options.forEach((option, i) => {
      const isActive = i === activeIndex;
      option.classList.toggle('is-active', isActive);
      option.setAttribute('aria-selected', String(isActive));
    });

    const active = options[activeIndex];
    input.setAttribute('aria-activedescendant', active.id);
    active.scrollIntoView({ block: 'nearest' });
  }

  function select(index) {
    const item = currentItems[index];
    if (!item) return;

    close();
    input.value = '';
    input.blur();

    const { target } = item;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });

    if (target.classList.contains('card')) {
      target.classList.add('is-flash');
      setTimeout(() => target.classList.remove('is-flash'), 1600);
    }
    target.focus?.({ preventScroll: true });
  }

  input.addEventListener('input', () => render(input.value));

  input.addEventListener('focus', () => {
    if (input.value.trim()) render(input.value);
  });

  input.addEventListener('keydown', (event) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (results.hidden) render(input.value);
        setActive(activeIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (results.hidden) render(input.value);
        setActive(activeIndex - 1);
        break;
      case 'Enter':
        if (!results.hidden && currentItems.length > 0) {
          event.preventDefault();
          select(activeIndex >= 0 ? activeIndex : 0);
        }
        break;
      case 'Escape':
        if (!results.hidden) {
          event.preventDefault();
          close();
        }
        break;
    }
  });

  document.addEventListener('mousedown', (event) => {
    if (!event.target.closest('.search')) close();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.metaKey || event.ctrlKey || event.altKey) return;

    const el = document.activeElement;
    const isTyping =
      el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el?.isContentEditable;

    if (isTyping) return;

    event.preventDefault();
    input.focus();
    input.select();
  });
})();
