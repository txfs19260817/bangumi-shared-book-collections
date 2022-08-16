import { htmlToElement } from "./utils";

export const createSettingsDialog = () => {
  const dialog = htmlToElement<HTMLDialogElement>(`
  <dialog id="dialog">
  <form id="dialog-form" method="dialog">
      <h2>设置</h2>
      <h3>提交后请刷新以生效改动</h3>
      <div>
        <label for="maxpages">获取最近读过的前多少页条目的评论：</label>
        <input id="maxpages" name="maxpages" type="number" value="${GM_getValue("maxpages") || cp.MAX_PAGES}" />
      </div>
      <div>
        <label for="maxresults">最多显示评论的数目：</label>
        <input id="maxresults" name="maxresults" type="number" value="${GM_getValue("maxresults") || cp.MAX_RESULTS}" />
      </div>
      <div>
        <label for="showstars">显示评分：</label>
        <input type="hidden" name="showstars" value="false" />
        <input id="showstars" name="showstars" type="checkbox" value="true" ${GM_getValue("showstars") ? "checked" : ""} />
      </div>
      <div>
        <label for="watchlist">关注列表（每行一个条目数字id，列表中的条目的最新评论一定会被收集）：</label>
        <br />
        <textarea id="watchlist" name="watchlist" rows="6" placeholder="例:\n326125\n329803">${GM_getValue("watchlist").map((s) => s.trim()).join("\n")}</textarea>
      </div>
      <div class="buttons-wrapper">
        <button type="submit">Submit</button>
        <button type="reset">Reset</button>
      </div>
    </form>
  </dialog>`);
  dialog.firstElementChild.addEventListener("submit", function (e) {
    e.preventDefault();
    const data = new FormData(e.target as HTMLFormElement);
    [...data.entries()].forEach((kv) => {
      const k = kv[0];
      let v: any = kv[1];
      if (k === "watchlist") {
        v = (kv[1] as string).split("\n").filter((n) => Number.isInteger(Number(n)) && Number(n) > 0);
      } else if (k === "showstars") {
        v = v === "true";
      }
      GM_setValue(k, v);
      console.log(GM_getValue(k));
    });
    dialog.close();
  });
  document.body.appendChild(dialog);
  GM_registerMenuCommand("设置", () => {
    dialog.showModal();
  });
}