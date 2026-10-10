(() => {
  const { members, order, ai, vols } = window.JAM;
  const latest = vols[vols.length - 1];
  const app = document.getElementById("app");
  const qInput = document.getElementById("q");
  const WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const color = (m) => m === ai ? "var(--c-ai)" : members.includes(m) ? `var(--c-${members.indexOf(m)})` : "var(--c-guest)";
  const label = (m) => m === ai ? "AI's PICK" : m;
  const fmtDate = (d) => {
    const dt = new Date(d + "T00:00:00");
    return `${d.replaceAll("-", ".")}<span>${WEEK[dt.getDay()]}</span>`;
  };
  const searchUrl = (q, m) => "#/search?" + new URLSearchParams({ ...(q && { q }), ...(m && { m }) });

  // 検索語をハイライト（元の文字列で区切ってから部分ごとにエスケープする）
  let hl = null;
  const mark = (s) => {
    if (!hl) return esc(s);
    return String(s ?? "").split(hl).map((part, i) => i % 2 ? `<mark>${esc(part)}</mark>` : esc(part)).join("");
  };

  // ---------- リンク先頭の小さな四角 ----------
  // 画像：公開版はリンク先の画像 URL をそのまま参照（icon）、私用版は取り込み済みの画像（thumb）
  // 画像がない・読めないときはサイトのアイコン（ファビコン）、それも読めないときはサイト名の頭文字
  const favicon = (url) => {
    try { return `https://www.google.com/s2/favicons?sz=128&domain=${new URL(url).hostname}`; } catch { return ""; }
  };
  const ico = (l) => {
    const fav = favicon(l.url);
    const img = (window.JAM.public ? l.icon : l.thumb) || fav;
    const initial = [...String(l.site || l.title || "?").trim()][0] || "?";
    return `<span class="ico${img === fav ? " fav" : ""}" data-i="${esc(initial)}">${img ? `<img src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" data-fav="${esc(fav)}" onerror="icoErr(this)">` : ""}</span>`;
  };
  window.icoErr = (img) => {
    if (img.dataset.fav && img.src !== img.dataset.fav) { img.parentNode.classList.add("fav"); img.src = img.dataset.fav; }
    else img.remove();
  };

  // メモの行。「●」で始まる行は小見出し（四角の代わりに●）、その下の行は印なしで小見出しの文字にそろえる
  function noteItems(lines) {
    let under = false;
    return lines.map((b) => {
      const h = b.match(/^[●・]\s*(.+)$/);
      if (h) { under = true; return `<li class="nh">${mark(h[1])}</li>`; }
      return `<li${under ? ' class="ni"' : ""}>${mark(b)}</li>`;
    }).join("");
  }

  // ---------- カード ----------
  function card(t, v, { showVol = false } = {}) {
    const main = t.links.find((l) => l.thumb) || null;
    const others = t.links.filter((l) => l !== main);
    const who = `<a class="who" data-i="${t.member === ai ? "✦" : esc(t.member[0])}" href="${searchUrl("", t.member)}">${esc(label(t.member))}</a>`;
    const vol = showVol ? `<a class="volchip" href="#/vol/${v.vol}">Vol.${v.vol}</a>` : "";
    // 公開版：画像の代わりに AI が言い換えた要点を窓に出す
    const first = t.links[0];
    const hero = t.card && first
      ? `<div class="hero summary">${who}${vol}<a class="hero-link" href="${esc(first.url)}" target="_blank" rel="noopener" aria-label="${esc(first.title)}"></a>
          <p class="sum-head">${mark(t.card.head)}</p>
          ${t.card.points.length ? `<ul>${t.card.points.map((p) => `<li>${mark(p)}</li>`).join("")}</ul>` : ""}
          <span class="sum-site">${esc(first.site)} ↗</span></div>`
      : main
      ? `<div class="hero${main.tall ? " tall" : ""}">${who}${vol}<a class="hero-link" href="${esc(main.url)}" target="_blank" rel="noopener"><img src="${esc(main.thumb)}" alt="" loading="lazy"></a></div>`
      : `<div class="hero plain">${who}${vol}<p>${mark(t.title)}</p></div>`;
    const notes = t.body.length
      ? `<ul class="notes${t.body.some((b) => b.length > 60) ? " long" : ""}">${noteItems(t.body)}</ul>` : "";
    const tags = t.tags.length
      ? `<div class="tags">${t.tags.map((g) => `<a class="tag" href="${searchUrl("#" + g)}">#${mark(g)}</a>`).join("")}</div>` : "";
    const pics = t.images.length ? `<div class="pics">${t.images.map((p) => `<img src="${esc(p)}" alt="" loading="lazy">`).join("")}</div>` : "";
    const src = (l) => `
      <a class="src" href="${esc(l.url)}" target="_blank" rel="noopener">
        ${ico(l)}
        <span class="t">${mark(l.title)}</span>${l.site !== l.title ? `<span class="s">${esc(l.site)}</span>` : ""}<span class="arrow">↗</span>
      </a>`;
    const links = [main, ...others].filter(Boolean).map((l) => src(l)).join("");
    return `
      <article class="card${t.member === ai ? " ai" : ""}" style="--c:${color(t.member)}">
        ${hero}
        <div class="card-body">
          ${main || t.card ? `<h3>${mark(t.title)}</h3>` : ""}
          ${notes}${pics}${tags}
          ${links ? `<div class="links">${links}</div>` : ""}
        </div>
      </article>`;
  }

  const grid = (talks) =>
    `<section class="talks${talks.length % 3 === 0 && talks.length % 2 ? " three" : ""}">${talks.join("")}</section>`;

  // 号の見出しの下の一言（木曜は AI's PICK だけ先に載る）
  function lead(v) {
    const people = v.talks.filter((t) => t.member !== ai).length;
    const hasAi = v.talks.some((t) => t.member === ai);
    if (!people) return "AI's PICK 先行公開中！4人の持ち寄りはジャムのあとに更新";
    return `今週の持ち寄り${people}トレンド${hasAi ? " ＋ AI's PICK" : ""}`;
  }

  // ---------- 号 ----------
  function issue(v, isHome) {
    const i = vols.indexOf(v);
    const prev = vols[i - 1], next = vols[i + 1];
    const pager = isHome ? "" : `
      <nav class="pager">
        <a class="${prev ? "" : "off"}" href="${prev ? "#/vol/" + prev.vol : "#/"}">← Vol.${prev ? prev.vol : ""}</a>
        <a href="#/">最新号へ</a>
        <a class="${next ? "" : "off"}" href="${next ? "#/vol/" + next.vol : "#/"}">Vol.${next ? next.vol : ""} →</a>
      </nav>`;
    return `
      <div class="issue-head">
        <h1 class="vol"><small>Vol.</small>${v.vol}</h1>
        <div class="issue-meta">
          <span class="kicker">${v === latest ? "LATEST ISSUE" : "BACK ISSUE"}</span>
          <p class="date">${fmtDate(v.date)}</p>
          <p class="lead">${lead(v)}</p>
          ${pager}
        </div>
      </div>
      ${grid(v.talks.map((t) => card(t, v)))}`;
  }

  function backIssues(except) {
    const list = vols.filter((v) => v !== except).reverse();
    return `
      <h2 class="section-title">BACK ISSUES</h2>
      <div class="issues">${list.map((v) => `
        <a class="issue" href="#/vol/${v.vol}">
          <div class="issue-no"><small>VOL.</small><b>${v.vol}</b></div>
          <div class="issue-main">
            <div class="issue-date">${v.date.replaceAll("-", ".")}</div>
            ${window.JAM.public ? "" : `<div class="mosaic">${v.talks.slice(0, 4).map((t) => {
              const th = t.links.find((l) => l.thumb);
              return `<span style="--c:${color(t.member)};${th ? `background-image:url('${th.thumb}')` : ""}"></span>`;
            }).join("")}</div>`}
            <ul>${v.talks.map((t) => `<li style="--c:${color(t.member)}">${t.member === ai ? "<b>AI</b> " : ""}${esc(t.title)}</li>`).join("")}</ul>
          </div>
        </a>`).join("")}
      </div>`;
  }

  // ---------- 検索 ----------
  const norm = (s) => s.normalize("NFKC").toLowerCase();
  function haystack(t) {
    return norm([t.member, t.title, ...t.body, ...t.tags.map((g) => "#" + g),
      ...(t.card ? [t.card.head, ...t.card.points] : []),
      ...t.links.flatMap((l) => [l.title, l.site, l.desc])].join(" "));
  }

  function search(q, m) {
    const words = norm(q).split(/[\s　]+/).filter(Boolean);
    const hits = [];
    for (const v of [...vols].reverse())
      for (const t of v.talks) {
        if (m && t.member !== m) continue;
        const h = haystack(t);
        if (words.every((w) => h.includes(w))) hits.push({ t, v });
      }
    const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const plain = words.map((w) => w.replace(/^#/, "")).filter(Boolean);
    hl = plain.length ? new RegExp(`(${plain.map(escRe).join("|")})`, "gi") : null;

    const allMembers = [...new Set(vols.flatMap((v) => v.talks.map((t) => t.member)))];
    const title = q ? `「${esc(q)}」` : m ? `${esc(label(m))} の発表` : "すべての発表";
    const html = `
      <div class="result-head">
        <h1>${title}</h1>
        <p>${hits.length} 件見つかりました${m && q ? `（${esc(label(m))} のみ）` : ""}</p>
        <div class="filters">
          <a class="${m ? "" : "on"}" href="${searchUrl(q, "")}">全員</a>
          ${allMembers.map((x) => `<a style="--c:${color(x)}" class="${x === m ? "on" : ""}" href="${searchUrl(q, x)}">${esc(label(x))}</a>`).join("")}
        </div>
      </div>
      ${hits.length ? grid(hits.map(({ t, v }) => card(t, v, { showVol: true })))
        : `<div class="empty"><b>NO HIT…</b>別のことばで探してみてください</div>`}`;
    hl = null;
    return html;
  }

  // ---------- 私たちの活動 ----------
  // メンバー紹介（まだの人は空欄の枠を出す）
  const PROFILE_FIELDS = [["role", "役割・得意分野"], ["words", "ひとこと紹介"], ["media", "愛用メディア"]];
  const PROFILES = {
    "K.M": {
      role: "トレジャムのマンネ✨\nSNSを徘徊しながら、最新トレンドを日々キャッチしています！",
      words: "生粋の音楽ヲタクです！\n女性アイドル→K-POP→ボカロ→ジャニーズ→歌い手と、いろんな沼を渡り歩き現在はバンド（邦ロック）にどハマり中。\n激推しバンドは…パーカーズ！",
      media: "TikTok・Instagram・Netflix",
    },
    "E.S": {
      role: "平成育ちのミーハー気質✨\nSNSや街なかのトレンドは、まずチェック！流行りものは気になったらすぐ試してみるタイプ。",
      words: "スイーツとキャラクターものが好き\n新作・限定・コラボの誘惑には、めっぽう弱いです。\n最近はガチャガチャの沼にハマっています😊",
      media: "X・TikTok・Instagram",
    },
    "I.M": {
      role: "トレンドには左右されないタイプ。\n冷静な目で「今」を捉えています。\n流行を追うより、丁寧に暮らすことに心惹かれています。",
      words: "タニラー／アロイダー／ゴムの木マニア／アクアリスト／歴男／Coffeeholic…\n趣味が多すぎて、少しお疲れ気味です。",
      media: "テレビ・YouTube・歴史人",
    },
    "M.O": {
      role: "読書、AI、サンフレッチェ広島をこよなく愛すシルバーミドル。JAMの発起人。",
      words: "「好きなことを好きなだけ」＝努力の娯楽化。それこそが、最強の上達法だと思っています。",
      media: "Podcast・radiko・DAZN",
    },
  };

  function about() {
    const dots = [0, 1, 2, 3].map((i) => `<i style="--c:var(--c-${i})"></i>`).join("");  // ロゴと同じ並び（紫・青・緑・オレンジ）
    // 以前の動画（FACES）の顔のある●（4人）。最後はロゴマークの4つの点に収まる
    const faces = [[-1, -1, 0], [1, -1, 1], [-1, 1, 2], [1, 1, 3]]
      .map(([x, y, i]) => `<i class="face" data-x="${x}" data-y="${y}" style="--c:${i ? `var(--c-${i})` : "#9B6BD3"}"><b>* *</b></i>`).join("");
    const cards = order.map((m) => `
      <article class="member" style="--c:${color(m)}">
        <div class="member-photo"><span>${esc(m)}</span></div>
        <div class="member-body">
          <p class="member-name">${esc(m)}</p>
          ${PROFILE_FIELDS.map(([k, label]) => PROFILES[m]?.[k]
            ? `<div class="prof"><span>${label}</span><p>${esc(PROFILES[m][k])}</p></div>`
            : `<p class="ph${k === "words" ? " long" : ""}">${label}</p>`).join("")}
        </div>
      </article>`).join("");
    return `
      <section class="about-hero" aria-label="TREND JAM!">
        ${reel()}
        <div class="troupe" aria-hidden="true">${faces}</div>
        <span class="about-mark" aria-hidden="true">${dots}</span>
        <h1 class="about-logo">TREND JAM<svg class="bang" viewBox="0 0 309 830" role="img" aria-label="!"><path d="M30 0H275L242 547H65Z"/><circle cx="152.5" cy="705" r="100"/></svg></h1>
        <p class="about-sub">ABOUT US ／ 私たちの活動</p>
        <p class="sc-cap end-cap">トレンドジャム！</p>
        <div class="hero-switch" role="group" aria-label="オープニング動画を選ぶ">
          <button class="hs-arrow" type="button" data-step="-1" aria-label="前の動画">‹</button>
          ${HERO_MODES.map((m, i) => `<button class="hs-dot" type="button" data-mode="${m.key}" aria-label="動画${i + 1}：${m.name}"></button>`).join("")}
          <span class="hs-name"></span>
          <button class="hs-arrow" type="button" data-step="1" aria-label="次の動画">›</button>
        </div>
      </section>
      <section class="about-copy">
        <p>情報があふれ、流行の寿命がどんどん短くなるいま、「売れたもの」を追いかけるだけでなく「これから来る兆し」をつかまえたい。</p>
        <p>東光印刷のマーケッター4人が、毎週金曜に1本ずつトレンドを持ち寄る週例会、それが<strong>TREND JAM</strong>。</p>
        <p>年齢も、趣味嗜好も、日頃触れるメディアもバラバラな4人。同じニュースでも「おもしろい」と感じるポイントが違うからこそ、その<span class="hl">“ズレ”を重ね合わせる</span>と、ひとりでは見落としていた兆しが浮かび上がってきます。</p>
        <p>第10回からはAIも加わり、5つの視点で“新たなヒットの芽”を探しています。</p>
      </section>
      <h2 class="section-title">MEMBERS</h2>
      <section class="members">${cards}</section>
      <p class="about-back"><a class="btn" href="#/">最新号を見る →</a></p>`;
  }

  // ---------- 私たちの活動の冒頭リール ----------
  // 場面ごとに背景色ごと切り替わる約5秒のリール → 最後に4つの点（4人）とロゴが出て止まる
  const SCENES = [
    { key: "dot", cap: "ひとつの気づきから。" },
    { key: "find", word: "FIND", cap: "見つける。" },
    { key: "bring", word: "BRING", cap: "持ち寄る。" },
    { key: "jam", word: "JAM", cap: "重ねる。" },
  ];
  const letters = (w) => [...w].map((ch, i) => `<span style="--i:${i}">${esc(ch)}</span>`).join("");
  function reel() {
    // JAM の場面のタイル：8×3 マスを全部埋めて長方形に（四隅は角の立つ四角）。4人の色＋黒
    // 「-」は真ん中の帯（JAM）が乗るマス。左上から斜めの波のように順に出る
    const C = { P: "var(--c-0)", B: "var(--c-1)", G: "var(--c-2)", O: "var(--c-3)", K: "var(--ink)", Y: "#FFD23F" };
    const LAYOUT = [
      ["square P", "circle O", "stripes B", "quarter G", "ring K", "half O", "bars B", "square G"],
      ["half B", "ring G", "-", "-", "-", "-", "ring O", "stripes O"],
      ["square O", "bars P", "dot K", "circle G", "quarter B", "stripes P", "ball Y", "square P"],  // ball＝リールを通して出てくる黄色い●
    ];
    const tiles = LAYOUT.flatMap((row, r) => row.map((cell, c) => {
      if (cell === "-") return `<b class="t-gap"></b>`;
      const [shape, col] = cell.split(" ");
      return `<i class="t-${shape}" style="--c:${C[col]};--d:${(r + c) * 32}ms"></i>`;
    })).join("");
    const body = {
      dot: `<span class="dot-core"></span><span class="dot-ring"></span><span class="dot-ring r2"></span>`,
      find: `<span class="find-ball"></span><h2 class="sc-word drop">${letters("FIND")}</h2>`,
      bring: `<span class="bring-axis"></span><h2 class="sc-word rise">${letters("BRING")}</h2>`,
      jam: `<div class="jam-grid">${tiles}<h2 class="sc-word jam-word">${letters("JAM")}</h2></div>`,
    };
    return `
      <div class="reel" aria-hidden="true">
        ${SCENES.map((sc, i) => `
          <div class="sc sc-${sc.key}" data-i="${i}">
            ${body[sc.key]}
            <p class="sc-cap">${sc.cap}</p>
          </div>`).join("")}
        <p class="hud hud-tl">TREND JAM! — REEL 2026</p>
        <p class="hud hud-tr"><span class="hud-no">01</span> / 0${SCENES.length}</p>
      </div>
      <button class="reel-skip" type="button">スキップ ›</button>`;
  }

  // 冒頭の動画は2本。枠の下の「‹ ● ○ ›」かスワイプで選ぶ（最初は REEL）
  const HERO_MODES = [{ key: "reel", name: "REEL" }, { key: "faces", name: "FACES" }];
  let heroMode = "reel", reelRun = 0, heroTimer = null;

  function playHero(mode = heroMode) {
    heroMode = mode;
    const run = ++reelRun;
    clearInterval(heroTimer);
    const hero = app.querySelector(".about-hero");
    if (!hero) return;
    // 前の動画の動きを止めて、最初の状態に戻す（CSS のアニメーションは残す）
    hero.getAnimations({ subtree: true }).forEach((a) => { if (!(a instanceof CSSAnimation)) a.cancel(); });
    hero.querySelectorAll(".sc.on, .end-wipe").forEach((el) => el.classList.contains("end-wipe") ? el.remove() : el.classList.remove("on"));
    hero.classList.remove("done", "show", "playing");
    hero.dataset.mode = mode;
    void hero.offsetWidth;  // クラスを付け直したときに CSS のアニメーションが最初から動くように
    setupSwitch(hero);
    const finish = () => {
      if (run !== reelRun) return;
      clearInterval(heroTimer);
      hero.getAnimations({ subtree: true }).forEach((a) => { if (!(a instanceof CSSAnimation)) a.cancel(); });
      hero.classList.remove("playing");
      hero.classList.add("done", "show");
      hero.querySelectorAll(".sc.on, .end-wipe").forEach((el) => el.classList.contains("end-wipe") ? el.remove() : el.classList.remove("on"));
    };
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !hero.animate) { finish(); return; }
    hero.classList.add("playing");
    let skipped = false;
    const alive = () => run === reelRun && !skipped;  // 別の動画に切り替えた・スキップしたら、続きは動かさない
    hero.querySelector(".reel-skip").onclick = () => { skipped = true; finish(); };
    if (mode === "faces") playFaces(hero, alive, finish);
    else playReel(hero, alive, finish);
  }

  // 切り替えボタンとスワイプ。黒い幕が横に流れて、スライドのように次の動画へ
  function setupSwitch(hero) {
    const sw = hero.querySelector(".hero-switch");
    const idx = HERO_MODES.findIndex((m) => m.key === heroMode);
    sw.querySelectorAll(".hs-dot").forEach((d) => d.classList.toggle("on", d.dataset.mode === heroMode));
    sw.querySelector(".hs-name").textContent = `${idx + 1}/${HERO_MODES.length} ${HERO_MODES[idx].name}`;
    const go = (to, dir) => slideTo(hero, to, dir);
    sw.onclick = (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      if (btn.dataset.mode) { const to = HERO_MODES.findIndex((m) => m.key === btn.dataset.mode); go(to, to >= idx ? 1 : -1); }
      else go((idx + +btn.dataset.step + HERO_MODES.length) % HERO_MODES.length, +btn.dataset.step);
    };
    let x0 = null;
    hero.onpointerdown = (e) => { if (e.pointerType !== "mouse") x0 = e.clientX; };
    hero.onpointerup = (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) go((idx + (dx < 0 ? 1 : -1) + HERO_MODES.length) % HERO_MODES.length, dx < 0 ? 1 : -1);
    };
  }

  let sliding = false;
  async function slideTo(hero, to, dir) {
    if (sliding) return;
    sliding = true;
    const cover = document.createElement("div");
    cover.className = "slide-cover";
    hero.appendChild(cover);
    const from = dir > 0 ? "100%" : "-100%", out = dir > 0 ? "-100%" : "100%";
    await cover.animate([{ transform: `translateX(${from})` }, { transform: "translateX(0)" }],
      { duration: 220, easing: "cubic-bezier(.6,0,.4,1)", fill: "forwards" }).finished.catch(() => {});
    playHero(HERO_MODES[to].key);
    hero.appendChild(cover);  // playHero が幕より下に描いたものの上に残す
    await cover.animate([{ transform: "translateX(0)" }, { transform: `translateX(${out})` }],
      { duration: 260, easing: "cubic-bezier(.6,0,.4,1)", fill: "forwards" }).finished.catch(() => {});
    cover.remove();
    sliding = false;
  }

  // 1本目 REEL：場面ごとに背景色ごと切り替わるリール → 紫の幕がしぼんでロゴの点 → 4つの点が回ってロゴ
  function playReel(hero, alive, finish) {
    // 待ち時間はアニメーションの時計で数える（裏のタブで開いたときもずれない）
    const wait = (ms) => hero.animate([], { duration: ms }).finished.catch(() => {});
    // 緩急：最初の「気づき」はたっぷり（緊張）、そこからは速いテンポで（緩和）
    const DUR = [2800, 1450, 1100, 1350];  // 円・FIND・BRING・JAM（ms）
    const scenes = [...hero.querySelectorAll(".sc")];
    const no = hero.querySelector(".hud-no");
    (async () => {
      for (let i = 0; i < scenes.length; i++) {
        if (!alive()) return;
        scenes.forEach((el) => el.classList.toggle("on", el === scenes[i]));
        hero.dataset.tone = scenes[i].classList.contains("sc-jam") ? "light" : "dark";
        no.textContent = String(i + 1).padStart(2, "0");
        if (SCENES[i].key === "find") bounceBall(scenes[i]);
        await wait(DUR[i]);
      }
      if (!alive()) return;
      await wipeToMark(hero);
      if (alive()) finish();
    })();
  }

  // 2本目 FACES（以前の動画）：4人の●が四隅から集まる → 表情を変えてまばたき → 輪になってくるくる回る
  // → 一度外へ広がる → それぞれ縮んでロゴマークの4つの点に収まり、ロゴが出る（●が4つ＝4人）
  function playFaces(hero, alive, finish) {
    const faces = [...hero.querySelectorAll(".face")];
    hero.dataset.tone = "dark";
    faces.forEach((f) => { f.firstChild.textContent = "* *"; });
    const W = hero.clientWidth, H = hero.clientHeight;
    const S = Math.round(Math.min(H * 0.36, W * 0.24, 220));  // ●の大きさ
    hero.style.setProperty("--s", S + "px");
    // 登場の動きは開始前から最初の形で待つ（both）。後半の動きは始まるまで前の動きを邪魔しない（forwards）
    const opt = (ms, delay, easing, fill = "both") => ({ duration: ms, delay, easing, fill });
    const spot = (el) => [+el.dataset.x, +el.dataset.y];
    const home = (el) => { const [x, y] = spot(el); return `translate(${x * S * 0.54}px, ${y * S * 0.54}px)`; };
    // 1. 4人の●：画面の外から大きいまま滑り込み、真ん中で寄り合う（少し弾む）
    faces.forEach((el, i) => {
      const [x, y] = spot(el);
      el.animate([
        { transform: `translate(${x * W * 0.7}px, ${y * H * 0.85}px) scale(1.8)` },
        { transform: `${home(el)} scale(1)` },
      ], opt(650, i * 90, "cubic-bezier(.3,1.4,.5,1)"));
    });
    // 2. 表情をパッパッと変える（●ごとに少しずらす）
    const EYES = ["* *", "- -", "o o", "> <", "^ ^", "+ +", "o o", "- -"];
    let tick = 0;
    heroTimer = setInterval(() => {
      if (!alive()) { clearInterval(heroTimer); return; }
      tick++;
      faces.forEach((f, i) => { f.firstChild.textContent = EYES[(tick + i * 2) % EYES.length]; });
      if (tick >= 13) clearInterval(heroTimer);
    }, 220);
    // 3. 4人で輪になって、くるくる2回転（回りながら少し寄って小さくなる）
    const SPIN = 1500, SPIN_MS = 1000;
    const near = (el) => { const [x, y] = spot(el); return `translate(${x * S * 0.36}px, ${y * S * 0.36}px)`; };
    faces.forEach((el) => el.animate([
      { transform: `rotate(0deg) ${home(el)} scale(1)` },
      { transform: `rotate(720deg) ${near(el)} scale(.78)` },
    ], opt(SPIN_MS, SPIN, "cubic-bezier(.45,0,.35,1)", "forwards")));
    // 4. 一度、外へパッと広がる
    const BURST = SPIN + SPIN_MS, BURST_MS = 380;
    const far = (el) => { const [x, y] = spot(el); return `translate(${x * W * 0.3}px, ${y * H * 0.3}px)`; };
    faces.forEach((el) => el.animate([
      { transform: `${near(el)} scale(.78)` },
      { transform: `${far(el)} scale(.62)` },
    ], opt(BURST_MS, BURST, "cubic-bezier(.2,.9,.3,1)", "forwards")));
    // 5. 吸い込まれるように、ロゴマークの4つの点へまとまる
    const mark = hero.querySelector(".about-mark");
    const box = hero.getBoundingClientRect();
    const cx = box.left + W / 2, cy = box.top + H / 2;
    const T = BURST + BURST_MS + 90;
    faces.forEach((f) => f.firstChild.animate([{ opacity: 1 }, { opacity: 0 }], opt(150, T, "linear", "forwards")));
    const gather = [...mark.children].map((dot, i) => {
      const r = dot.getBoundingClientRect();
      return faces[i].animate([
        { transform: `${far(faces[i])} scale(.62)` },
        { transform: `translate(${r.left + r.width / 2 - cx}px, ${r.top + r.height / 2 - cy}px) scale(${r.width / S})` },
      ], opt(560, T + i * 50, "cubic-bezier(.75,0,.25,1)", "forwards"));
    });
    // ロゴと下の帯を出し、点がそろったら本物のマークに入れ替える
    // （タイマーではなくアニメーションの進み具合に合わせる。裏のタブで開いたときもずれないように）
    hero.animate([], { duration: T + 480 }).finished.then(() => { if (alive()) hero.classList.add("show"); }).catch(() => {});
    Promise.all(gather.map((a) => a.finished)).then(() => { if (alive()) finish(); }).catch(() => {});
  }

  // リールの最後 → ロゴ：一瞬で画面が紫になり、紫が円の形でしぼんで左上の紫の●にぴったり重なる。
  // そこで紫の幕を外すと、同じ場所・同じ大きさの●が残り、4つの●の回転（CSS の mark-spin）へそのままつながる
  async function wipeToMark(hero) {
    const dot = hero.querySelector(".about-mark i");
    if (!dot) return;
    const hb = hero.getBoundingClientRect(), db = dot.getBoundingClientRect();
    const cx = db.left + db.width / 2 - hb.left, cy = db.top + db.height / 2 - hb.top, r = db.width / 2;
    const R = Math.hypot(Math.max(cx, hb.width - cx), Math.max(cy, hb.height - cy)) + 2;  // 画面の四隅まで覆う大きさ
    const wipe = document.createElement("div");
    wipe.className = "end-wipe";
    hero.appendChild(wipe);
    hero.querySelectorAll(".sc.on").forEach((el) => el.classList.remove("on"));  // 紫の下はもう要らない
    const at = (rad) => `circle(${rad}px at ${cx}px ${cy}px)`;
    // 紫一色を一瞬（約0.07秒）見せてから、約0.48秒でしぼむ
    await wipe.animate(
      [{ clipPath: at(R) }, { clipPath: at(R), offset: 0.126, easing: "cubic-bezier(.65,0,.35,1)" }, { clipPath: at(r) }],
      { duration: 550, fill: "forwards" }).finished.catch(() => {});
    wipe.remove();
  }

  // FIND の黄色い玉：上の外から斜めに落ちてきて F・I・N・D の上で1回ずつ弾み、D からそのまま右下の外へ落ちていく
  // ひとつの重力で放物線を計算して、細かいコマ（約16ms）で並べる（横は等速、縦だけ重力。最後の跳ねも同じ物理で続く）
  // 文字の位置は画面の幅で変わるので、場面が始まったときに測って道すじを作る
  function bounceBall(scene) {
    const ball = scene.querySelector(".find-ball");
    const spans = [...scene.querySelectorAll(".drop span")];
    const box = scene.getBoundingClientRect();
    const b = ball.offsetWidth;
    const fs = parseFloat(getComputedStyle(spans[0]).fontSize);
    // 玉の基準（CSS の left:50%; top:50%）からの移動量。文字の位置は動きの影響を受けない offsetLeft で測る（場面の左上から）
    const ox = box.width / 2, oy = box.height / 2;
    const land = spans.map((sp) => ({
      x: sp.offsetLeft + sp.offsetWidth / 2 - b / 2 - ox,
      y: sp.offsetTop + fs * 0.12 - b - oy,  // 文字の上端（字面の少し下がった位置）
    }));

    // 跳ねの高さ（文字の大きさに対する比）：F→I → I→N → N→D → D から外へ。だんだん低く
    // 下げ幅を大きくすると跳ねの時間が縮んで横の速さが上がっていくので、控えめに下げる
    const H = [0, 0.72, 0.63, 0.55, 0.47].map((r) => r * fs);
    H[0] = land[0].y + oy + b * 1.5;  // 入り：場面の上の外から落ちてくる高さ
    const T0 = 120, BUDGET = 1260;  // 場面は 1450ms（playHero の DUR）。最初の待ちと、外へ抜けるまでをこの中に収める
    const exitX = box.width - ox + b, exitY = box.height - oy + b;  // ここを越えたら画面の外

    // 重力 g で道すじを作る（g が決まれば時間はすべて決まる）
    const plan = (g) => {
      const segs = [];
      // 着地→着地：高さ h の山を越える放物線（出発と着地の高さの差も考える）
      for (let i = 0; i < land.length - 1; i++) {
        const p = land[i], q = land[i + 1], h = H[i + 1];
        const vy = -Math.sqrt(2 * g * h);
        const top = p.y - h;  // 山の頂点の高さ
        const t = -vy / g + Math.sqrt(2 * Math.max(q.y - top, 0) / g);
        segs.push({ x0: p.x, y0: p.y, vx: (q.x - p.x) / t, vy, t });
      }
      // D から外へ：同じ横の勢いで跳ね上がり、そのまま落ちて右か下の外へ抜けるまで
      const d = land[land.length - 1], vx = segs[segs.length - 1].vx, vy = -Math.sqrt(2 * g * H[4]);
      const tx = (exitX - d.x) / vx;
      const ty = (-vy + Math.sqrt(vy * vy + 2 * g * (exitY - d.y))) / g;
      segs.push({ x0: d.x, y0: d.y, vx, vy, t: Math.min(tx, ty), out: true });
      // 入り：場面の上の外から、F→I と同じ横の速さで斜めに落ちてきて F に着地（F で急に減速しない）
      const tIn = Math.sqrt(2 * H[0] / g);
      segs.unshift({ x0: land[0].x - segs[0].vx * tIn, y0: land[0].y - H[0], vx: segs[0].vx, vy: 0, t: tIn });
      return segs;
    };
    // 文字の大きさに合わせた重力で一度計算し、場面の時間に収まるように重力だけを強める（形は同じまま速くなる）
    let g = (8 * H[1]) / (300 * 300);
    let segs = plan(g);
    const sum = segs.reduce((a, s) => a + s.t, 0);
    if (sum > BUDGET) { g *= (sum / BUDGET) ** 2; segs = plan(g); }

    // コマに並べる。着地の瞬間だけ玉を少しつぶす（下端をそろえるため、つぶした分だけ下げる）
    const STEP = 16, total = T0 + segs.reduce((a, s) => a + s.t, 0);
    const kf = [], lands = [];
    const at = (ms, x, y, squash) => kf.push({
      offset: Math.min(ms / total, 1),
      transform: squash
        ? `translate(${x}px, ${y + b * 0.09}px) scale(1.18, 0.82)`
        : `translate(${x}px, ${y}px) scale(1, 1)`,
    });
    at(0, segs[0].x0, segs[0].y0);
    let t0 = T0;
    at(t0, segs[0].x0, segs[0].y0);
    segs.forEach((s) => {
      for (let t = STEP; t < s.t; t += STEP) at(t0 + t, s.x0 + s.vx * t, s.y0 + s.vy * t + g * t * t / 2);
      t0 += s.t;
      const x = s.x0 + s.vx * s.t, y = s.y0 + s.vy * s.t + g * s.t * s.t / 2;
      if (s.out) { at(t0, x, y); return; }
      at(t0, x, y, true);  // 着地
      lands.push(t0);
    });
    kf.forEach((k, i) => { if (i && k.offset < kf[i - 1].offset) k.offset = kf[i - 1].offset; });
    kf[kf.length - 1].offset = 1;
    ball.animate(kf, { duration: total, easing: "linear", fill: "both" });

    // 着地した文字を少しだけ沈ませる（計算した着地の瞬間に合わせる）
    spans.forEach((sp, i) => {
      sp.animate(
        [{ translate: "0 0" }, { translate: "0 7%", offset: 0.3 }, { translate: "0 0" }],
        { duration: 200, delay: lands[i], easing: "ease-out" });
    });
  }

  // ---------- TREND JAM! と著作権（#/copyright） ----------
  function copyright() {
    return `
      <div class="cr">
        <header class="cr-head">
          <span class="kicker">COPYRIGHT</span>
          <h1>TREND JAM! と著作権</h1>
          <p class="lead">社内公開にあたり、社内法務に確認した結果のまとめです（1分で読めます）</p>
        </header>

        <section class="cr-card" style="--c:var(--c-2)">
          <span class="cr-label">結論</span>
          <h2 class="cr-verdict"><span>今のサイトの形なら、</span><mark><span>著作権者の許可なしで</span><span>社内公開してOK</span></mark><span>という判断です。</span></h2>
          <p>リンク先の写真やイラストは他人の著作物ですが、次の2つの理由から、問題ないと整理されました。</p>
        </section>

        <section class="cr-card" style="--c:var(--c-1)">
          <span class="cr-label">理由</span>
          <div class="cr-reason">
            <span class="no">1</span>
            <h3>画像がとても小さい</h3>
            <p>リンク欄の画像はアイコンほどの大きさです。元の写真やイラストの特徴が伝わるほどではないので、そもそも「コピー（複製）」に当たらないと考えられます。</p>
          </div>
          <div class="cr-reason">
            <span class="no">2</span>
            <h3>リンク先の案内に付いてくる「軽い利用」</h3>
            <p>このサイトの役割は、AIがまとめた要点と一緒にリンク先を案内することです。小さな画像はそれに付いてくる軽い利用で、著作権法で許可がいらないとされる「軽微利用」に当たると整理できます。</p>
          </div>
          <p class="cr-note"><strong>「引用」ではありません。</strong>引用として認められるのは、自分の意見が主役で、他人の作品が脇役の場合です。記事の要約紹介はこれに当たらないため、引用を根拠にはしていません。</p>
        </section>

        <section class="cr-card" style="--c:var(--c-3)">
          <span class="cr-label">見る人へのお願い</span>
          <h2>社内の情報共有の場として使ってください</h2>
          <ul class="cr-asks">
            <li>社外の人への共有、SNSへの投稿、スクリーンショットの社外送付はしない</li>
            <li>サイトの画像を保存したり、資料などに転用したりしない</li>
            <li>詳しい内容や画像は、リンク先の元のページで見る</li>
            <li>気になる画像や表示を見つけたら、運営メンバーに知らせる</li>
          </ul>
        </section>

        <p class="cr-foot">この判断は、今のサイトの形（画像の大きさ・見せ方）が前提です。運営側で表示のしかたを見直しながら続けていきます。</p>
        <p class="about-back"><a class="btn" href="#/">← TREND JAM! のトップに戻る</a></p>
      </div>`;
  }

  // ---------- ルーティング ----------
  let wasSearch = false;
  function route() {
    const h = location.hash || "#/";
    const isSearch = h.startsWith("#/search");
    let html;
    document.querySelector(".about-btn").classList.toggle("on", h.startsWith("#/about"));
    document.querySelector(".foot").hidden = h.startsWith("#/copyright");  // 著作権のページはフッターなし
    if (h.startsWith("#/about")) {
      html = about();
      document.title = "私たちの活動 — TREND JAM!";
      if (document.activeElement !== qInput) qInput.value = "";
    } else if (h.startsWith("#/copyright")) {
      html = copyright();
      document.title = "TREND JAM! と著作権";
      if (document.activeElement !== qInput) qInput.value = "";
    } else if (h.startsWith("#/search")) {
      const p = new URLSearchParams(h.split("?")[1] || "");
      const q = p.get("q") || "", m = p.get("m") || "";
      if (document.activeElement !== qInput) qInput.value = q;
      html = search(q, m);
      document.title = `${q || m || "検索"} — TREND JAM!`;
    } else {
      const n = +(h.match(/^#\/vol\/(\d+)/) || [])[1];
      const v = vols.find((x) => x.vol === n) || latest;
      const isHome = !n || v === latest && !n;
      html = issue(v, isHome) + backIssues(v);
      document.title = isHome ? "TREND JAM!" : `Vol.${v.vol} — TREND JAM!`;
      if (document.activeElement !== qInput) qInput.value = "";
    }
    app.innerHTML = html;
    playHero();
    if (!(isSearch && wasSearch)) window.scrollTo(0, 0);
    wasSearch = isSearch;
  }

  let timer;
  qInput.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const q = qInput.value.trim();
      const m = new URLSearchParams((location.hash.split("?")[1]) || "").get("m") || "";
      location.replace(q || m ? searchUrl(q, location.hash.startsWith("#/search") ? m : "") : "#/");
    }, 180);
  });
  document.getElementById("search").addEventListener("submit", (e) => { e.preventDefault(); qInput.blur(); });

  // ティッカー（最新号の見出し）
  const items = latest.talks.map((t) => `<span style="--c:${color(t.member)}">${esc(label(t.member))}｜${esc(t.title)}</span>`).join("");
  document.getElementById("ticker").innerHTML = `<span style="--c:#17131F">Vol.${latest.vol} ${latest.date.replaceAll("-", ".")}</span>${items}`.repeat(4);
  document.getElementById("foot-members").innerHTML =
    [...order, ai].map((m) => `<a style="--c:${color(m)}" href="${searchUrl("", m)}">● ${esc(m)}</a>`).join("");

  window.addEventListener("hashchange", route);
  route();
})();
