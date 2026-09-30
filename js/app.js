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
      ? `<ul class="notes${t.body.some((b) => b.length > 60) ? " long" : ""}">${t.body.map((b) => `<li>${mark(b)}</li>`).join("")}</ul>` : "";
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
    const dots = [[-1, -1, 0], [1, -1, 1], [-1, 1, 2], [1, 1, 3]]  // ロゴと同じ並び（紫・青・緑・オレンジ）
      .map(([x, y, i]) => `<i style="--x:${x};--y:${y};--c:var(--c-${i})"></i>`).join("");
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
        <div class="burst" aria-hidden="true">${dots}</div>
        <h1 class="about-logo">TREND JAM<b>!</b></h1>
        <p class="about-sub">ABOUT US ／ 私たちの活動</p>
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
