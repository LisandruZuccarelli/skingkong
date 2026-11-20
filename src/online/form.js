// Formulaire HTML superposé au canvas (la saisie de texte au clavier / sur mobile est bien plus fiable en DOM).
// Pendant qu'il est ouvert, les touches ne pilotent plus le jeu.
const CSS = `
.skf-back{position:fixed;inset:0;background:rgba(10,13,36,.72);display:flex;align-items:center;justify-content:center;z-index:10;font-family:ui-monospace,Menlo,Consolas,monospace}
.skf{background:#0e1650;border:3px solid #7ee8ff;box-shadow:0 0 0 3px #0a0d24,0 8px 0 3px rgba(0,0,0,.4);padding:18px 20px;width:min(92vw,380px);color:#fff;image-rendering:pixelated}
.skf h2{margin:0 0 6px;color:#ffc83d;font-size:20px;letter-spacing:2px;text-transform:uppercase}
.skf p{margin:0 0 12px;color:#9fb2ea;font-size:13px;line-height:1.4}
.skf label{display:block;margin:8px 0 3px;color:#cfe0ff;font-size:12px;letter-spacing:1px;text-transform:uppercase}
.skf input[type=text],.skf input[type=email],.skf input[type=password]{box-sizing:border-box;width:100%;padding:9px 10px;font:inherit;font-size:16px;color:#fff;background:#0a0d24;border:2px solid #2a3060;outline:none}
.skf input:focus{border-color:#7ee8ff}
.skf .chk{display:flex;gap:8px;align-items:center;margin-top:10px;text-transform:none;font-size:13px;color:#fff}
.skf .chk input{width:18px;height:18px;accent-color:#ffc83d}
.skf .err{min-height:18px;margin:10px 0 0;color:#ff6b78;font-size:13px}
.skf .row{display:flex;gap:10px;margin-top:12px}
.skf button{flex:1;padding:10px;font:inherit;font-size:15px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;border:2px solid #0a0d24;cursor:pointer}
.skf .ok{background:#ffc83d;color:#0a0d24}.skf .ok:disabled{opacity:.6;cursor:wait}
.skf .ko{background:#2a3060;color:#cfe0ff}
.skf small{display:block;margin-top:10px;color:#7f8cc8;font-size:11px;line-height:1.4}`;

let styled = false;

/**
 * fields : [{ name, label, type: 'text'|'email'|'password'|'checkbox', max, auto }]
 * onSubmit(values) : async ; lève une erreur → message affiché, le formulaire reste ouvert.
 */
export function openForm(game, { title, intro = '', fields, submit = 'VALIDER', note = '', onSubmit, onClose = () => {} }) {
  if (typeof document === 'undefined') return null;
  if (!styled) { const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); styled = true; }
  const back = document.createElement('div');
  back.className = 'skf-back';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  back.innerHTML = `<form class="skf" novalidate><h2>${esc(title)}</h2>${intro ? `<p>${esc(intro)}</p>` : ''}
    ${fields.map((f) => f.type === 'checkbox'
      ? `<label class="chk"><input type="checkbox" name="${f.name}"> ${esc(f.label)}</label>`
      : `<label for="skf-${f.name}">${esc(f.label)}</label><input id="skf-${f.name}" name="${f.name}" type="${f.type || 'text'}" maxlength="${f.max || 80}" autocomplete="${f.auto || 'off'}" autocapitalize="off" spellcheck="false">`).join('')}
    <div class="err" role="alert"></div>
    <div class="row"><button type="button" class="ko">Annuler</button><button type="submit" class="ok">${esc(submit)}</button></div>
    ${note ? `<small>${esc(note)}</small>` : ''}</form>`;
  document.body.appendChild(back);
  game.input.blocked = true;
  game.input.keys.clear();
  const form = back.querySelector('form');
  const err = back.querySelector('.err');
  const ok = back.querySelector('.ok');
  const close = () => {
    back.remove();
    game.input.blocked = false;
    game.input.keys.clear();
    game.canvas.focus();
    onClose();
  };
  back.querySelector('.ko').onclick = close;
  back.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') close(); });
  form.onsubmit = async (e) => {
    e.preventDefault();
    const values = {};
    for (const f of fields) { const el = form.elements[f.name]; values[f.name] = f.type === 'checkbox' ? el.checked : el.value; }
    ok.disabled = true; err.textContent = '';
    try { await onSubmit(values); close(); }
    catch (ex) { err.textContent = String(ex.message || ex).toUpperCase(); ok.disabled = false; }
  };
  setTimeout(() => { const first = form.querySelector('input'); if (first) first.focus(); }, 30);
  return { close };
}
