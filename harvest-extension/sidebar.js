const bagEl = document.getElementById('bag');
const countEl = document.getElementById('count');
const toggleButton = document.getElementById('toggleSegl');
const destinationSelect = document.getElementById('destination');
const clearButton = document.getElementById('clear');
const keepButton = document.getElementById('keep');

let active = false;
let items = [];
let destinations = [];
let destination = '';
let keeping = false;
let failedIds = new Set();

browser.runtime.onMessage.addListener(message => {
  if (message?.type === 'poki-changed') refresh();
});

toggleButton.addEventListener('click', async () => {
  try {
    const result = await browser.runtime.sendMessage({ type: 'segl-set-global-active', active: !active });
    active = !!result?.active;
    await refresh();
  } catch (error) {
    console.error(error);
  }
});

destinationSelect.addEventListener('change', async () => {
  destination = destinationSelect.value;
  try {
    await browser.runtime.sendMessage({ type: 'poki-set-destination', board: destination });
  } catch (error) {
    console.error(error);
  }
  render();
});

clearButton.addEventListener('click', async () => {
  if (!items.length || keeping) return;
  try {
    const result = await browser.runtime.sendMessage({ type: 'poki-clear' });
    active = !!result?.active;
    destination = result?.destination || destination;
    items = result?.items || [];
    failedIds.clear();
    render();
  } catch (error) {
    console.error(error);
  }
});

keepButton.addEventListener('click', async () => {
  if (!items.length || keeping || !destination) return;
  keeping = true;
  failedIds.clear();
  render('keeping…');

  try {
    const result = await browser.runtime.sendMessage({ type: 'poki-keep', board: destination });
    active = !!result?.active;
    destination = result?.destination || destination;
    items = result?.items || [];
    failedIds = new Set((result?.failures || []).map(failure => failure.id).filter(Boolean));

    if (result?.ok) {
      render(result.kept ? `kept ${result.kept}` : 'nothing kept');
    } else if (result?.failures?.length) {
      render(`${result.kept || 0} kept · ${result.failures.length} left`);
    } else {
      render('could not keep');
    }
  } catch (error) {
    console.error(error);
    render('could not keep');
  } finally {
    keeping = false;
    clearButton.disabled = !items.length;
    keepButton.disabled = !items.length || !destination;
    destinationSelect.disabled = !destinations.length;
  }
});

refresh();

async function refresh() {
  try {
    const [bagResult, destinationResult] = await Promise.all([
      browser.runtime.sendMessage({ type: 'poki-list' }),
      browser.runtime.sendMessage({ type: 'poki-destinations' })
    ]);

    active = !!bagResult?.active;
    items = bagResult?.items || [];
    destinations = destinationResult?.destinations || [];
    destination = destinationResult?.destination || bagResult?.destination || '';
    render();
  } catch (error) {
    console.error(error);
    render('could not reach eskja');
  }
}

function render(status = '') {
  bagEl.innerHTML = '';
  countEl.textContent = `${items.length} in poki`;
  toggleButton.textContent = active ? 'segl on' : 'segl off';
  toggleButton.classList.toggle('active', active);

  renderDestinations();

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'empty';
    empty.textContent = 'poki empty';
    bagEl.appendChild(empty);
  }

  for (const item of items) {
    const thing = document.createElement('article');
    thing.className = `thing ${item.type}${failedIds.has(item.id) ? ' failed' : ''}`;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove';
    remove.textContent = '×';
    remove.title = 'remove';
    remove.addEventListener('click', async () => {
      try {
        const result = await browser.runtime.sendMessage({ type: 'poki-remove', id: item.id });
        active = !!result?.active;
        destination = result?.destination || destination;
        items = result?.items || [];
        failedIds.delete(item.id);
        render();
      } catch (error) {
        console.error(error);
      }
    });

    const kind = document.createElement('div');
    kind.className = 'kind';
    kind.textContent = item.type === 'text' ? 'text' : 'image';

    const body = document.createElement('div');
    body.className = 'body';
    body.textContent = item.type === 'text'
      ? truncate(item.text || '', 150)
      : imageSummary(item);

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = item.pageTitle
      ? `${truncate(item.pageTitle, 54)} · ${hostish(item.pageUrl)}`
      : (item.pageUrl ? hostish(item.pageUrl) : '');

    thing.append(remove, kind, body, meta);

    if (failedIds.has(item.id)) {
      const failure = document.createElement('div');
      failure.className = 'failure';
      failure.textContent = 'not gathered yet';
      thing.appendChild(failure);
    }

    bagEl.appendChild(thing);
  }

  if (status) {
    const line = document.createElement('div');
    line.className = 'status';
    line.textContent = status;
    bagEl.appendChild(line);
  }

  clearButton.disabled = keeping || !items.length;
  keepButton.disabled = keeping || !items.length || !destination;
}

function renderDestinations() {
  const current = destination;
  destinationSelect.innerHTML = '';

  if (!destinations.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'no eskjur';
    destinationSelect.appendChild(option);
    destinationSelect.disabled = true;
    return;
  }

  destinationSelect.disabled = keeping;

  for (const entry of destinations) {
    const option = document.createElement('option');
    option.value = entry.board;
    option.textContent = entry.label || 'eskja';
    if (entry.board === current) option.selected = true;
    destinationSelect.appendChild(option);
  }

  if (!destinationSelect.value && destinations[0]) {
    destination = destinations[0].board;
    destinationSelect.value = destination;
  }
}

function imageSummary(item) {
  const bits = [];
  if (item.naturalWidth && item.naturalHeight) bits.push(`${item.naturalWidth}×${item.naturalHeight}`);
  if (item.candidateCount > 1) bits.push(`${item.candidateCount} possible sources`);
  return bits.length ? bits.join(' · ') : `image from ${hostish(item.pageUrl)}`;
}

function hostish(url) {
  try { return new URL(url).host.replace(/^www\./, ''); }
  catch (_) { return 'page'; }
}

function truncate(text, max) {
  const value = String(text || '').replace(/\s+/g, ' ').trim();
  return value.length > max ? `${value.slice(0, Math.max(0, max - 1))}…` : value;
}
