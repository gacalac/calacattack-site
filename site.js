// ================================================================
//  CalacAttack — shared page code. No need to edit this file.
//  Each page keeps its own list (tools, interactives, links) at
//  the top of its HTML file.
// ================================================================

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function splitTags(tag) {
  if (!tag) return [];
  return tag.split(/[,/]/).map(t => t.trim()).filter(Boolean);
}

// Cards for the Tools and Interactives pages.
// section: "tools" or "interactives" (sets the card color)
function renderCards(items, rootId, section) {
  const root = document.getElementById(rootId);
  if (!items.length) {
    root.appendChild(el('p', 'empty', 'Nothing posted yet.'));
    return;
  }
  const grid = el('div', 'grid');
  for (const item of items) {
    const live = item.url && item.url.trim() !== '';
    const card = el(live ? 'a' : 'div', 'card ' + section + (live ? '' : ' soon'));
    if (live) {
      card.href = item.url;
      card.target = '_blank';
      card.rel = 'noopener';
    }
    card.appendChild(el('h2', 'card-title', item.title));
    card.appendChild(el('p', 'card-desc', live ? item.desc : 'Coming soon.'));

    const foot = el('div', 'card-foot');
    const tags = el('div', 'tags');
    for (const t of splitTags(item.tag)) tags.appendChild(el('span', 'tag', t));
    foot.appendChild(tags);
    if (live) foot.appendChild(el('span', 'open', 'Open ↗'));
    card.appendChild(foot);

    grid.appendChild(card);
  }
  root.appendChild(grid);
}

// Grouped rows for the Links page.
function renderLinks(items, rootId) {
  const root = document.getElementById(rootId);
  if (!items.length) {
    root.appendChild(el('p', 'empty', 'No links posted yet.'));
    return;
  }
  const groups = new Map();
  for (const item of items) {
    const key = item.group || '';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  for (const [name, list] of groups) {
    const section = el('section', 'group');
    if (name) section.appendChild(el('h2', 'group-label', name));
    const ul = el('ul', 'rows');
    for (const item of list) {
      const li = el('li');
      const a = el('a', 'row');
      a.href = item.url;
      a.target = '_blank';
      a.rel = 'noopener';
      const text = el('div', 'row-text');
      text.appendChild(el('div', 'row-title', item.title));
      if (item.note) text.appendChild(el('div', 'row-note', item.note));
      a.append(text, el('span', 'open', 'Open ↗'));
      li.appendChild(a);
      ul.appendChild(li);
    }
    section.appendChild(ul);
    root.appendChild(section);
  }
}
