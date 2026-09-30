// 公開版の入口のパスワード画面（簡易。画面を隠すだけで、データそのものは暗号化していない）
// パスワードは SHA-256 のハッシュで照合する。変えるときは HASH を差し替える
//   例: node -e "console.log(require('crypto').createHash('sha256').update('新しいパスワード').digest('hex'))"
(() => {
  const HASH = "8983ee570379fd290b174487885737b384d187d605a02f16b9a8b04bb52ea8b0";
  const KEY = "trendjam-pass";
  const root = document.documentElement;
  const gate = document.getElementById("gate");

  const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
  const save = (v) => { try { localStorage.setItem(KEY, v); } catch {} };
  const open = () => { root.classList.remove("locked"); gate.remove(); };

  // パソコンのファイルとして開いたとき（file://）は聞かない
  if (location.protocol === "file:" || read() === HASH) { open(); return; }

  const form = document.getElementById("gate-form");
  const input = document.getElementById("gate-pass");
  const err = document.getElementById("gate-err");
  input.focus();

  const sha256 = async (s) => {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const h = await sha256(input.value.trim());
    if (h === HASH) {
      save(h);
      open();
    } else {
      err.hidden = false;
      form.classList.remove("shake"); void form.offsetWidth; form.classList.add("shake");
      input.select();
    }
  });
})();
