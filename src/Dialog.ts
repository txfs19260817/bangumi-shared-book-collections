import { htmlToElement } from "./utils";

export const createSettingsDialog = () => {
  const dialog = htmlToElement<HTMLDialogElement>(`
  <dialog id="dialog">
    <form id="dialog-form" method="dialog">
      <h2>共读设置</h2>
      <h3>提交后请刷新以生效改动</h3>
      <div>
        <label for="maxpages">获取最近读过的前多少页条目的评论：</label>
        <input id="maxpages" name="maxpages" type="number" value="${GM_getValue("maxpages") || cp.MAX_PAGES}" min="1" />
      </div>
      <div>
        <label for="maxresults">最多显示评论的数目：</label>
        <input id="maxresults" name="maxresults" type="number" value="${GM_getValue("maxresults") || cp.MAX_RESULTS}" min="1" />
      </div>
      <div>
        <label for="showstars">显示评分：</label>
        <input type="hidden" name="showstars" value="false" />
        <input id="showstars" name="showstars" type="checkbox" value="true" ${GM_getValue("showstars") ? "checked" : ""} />
      </div>
      <div>
        <label for="disablesettings">不在首页显示设置按钮：</label>
        <input type="hidden" name="disablesettings" value="false" />
        <input id="disablesettings" name="disablesettings" type="checkbox" value="true" ${GM_getValue("disablesettings") ? "checked" : ""} />
        <p style="color: gray;">（控制设置按钮在首页的可见性，选中后仍可在Tampermonkey类插件中设置）</p>
      </div>
      <div>
        <label for="watchlist">关注列表（每行一个条目数字id，列表中的条目的最新评论一定会被收集）：</label>
        <br />
        <textarea id="watchlist" name="watchlist" class="quick" rows="6" cols="10" placeholder="例:\n326125\n329803">${GM_getValue("watchlist").map((s) => s.trim()).join("\n")}</textarea>
      </div>
      <div>
        <button type="submit">Submit</button>
        <button type="reset">Reset</button>
        <button type="button" onclick="document.getElementById('dialog').close()">Close</button>
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
      } else if (k === "showstars" || k === "disablesettings") {
        v = v === "true";
      }
      GM_setValue(k, v);
    });
    dialog.close();
  });

  // dialog style
  dialog.style.borderRadius = "12px";
  dialog.style.borderColor = "#F09199";
  dialog.style.boxShadow = "0 0 #0000, 0 0 #0000, 0 25px 50px -12px rgba(0, 0, 0, 0.25)";

  // inject dialog element
  document.body.appendChild(dialog);

  // userscript menu
  GM_registerMenuCommand("设置", () => {
    dialog.showModal();
  });
}