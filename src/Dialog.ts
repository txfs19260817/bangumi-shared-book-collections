import { htmlToElement, t } from "./utils";

export const createSettingsDialog = () => {
  const dialog = htmlToElement<HTMLDialogElement>(`
  <dialog id="dialog">
    <form id="dialog-form" method="dialog">
      <h2>${t('settings_title')}</h2>
      <h3>${t('settings_subtitle')}</h3>
      <div>
        <label for="maxpages">${t('max_pages_label')}</label>
        <input id="maxpages" name="maxpages" type="number" value="${GM_getValue("maxpages") || cp.MAX_PAGES}" min="1" />
      </div>
      <div>
        <label for="maxresults">${t('max_results_label')}</label>
        <input id="maxresults" name="maxresults" type="number" value="${GM_getValue("maxresults") || cp.MAX_RESULTS}" min="1" />
      </div>
      <div>
        <label for="showstars">${t('show_stars_label')}</label>
        <input type="hidden" name="showstars" value="false" />
        <input id="showstars" name="showstars" type="checkbox" value="true" ${GM_getValue("showstars") ? "checked" : ""} />
      </div>
      <div>
        <label for="language">${t('language_label')}</label>
        <select id="language" name="language">
          <option value="" ${!GM_getValue("language") ? "selected" : ""}>${t('language_auto')}</option>
          <option value="zh" ${GM_getValue("language") === "zh" ? "selected" : ""}>${t('language_zh')}</option>
          <option value="en" ${GM_getValue("language") === "en" ? "selected" : ""}>${t('language_en')}</option>
          <option value="ja" ${GM_getValue("language") === "ja" ? "selected" : ""}>${t('language_ja')}</option>
        </select>
      </div>
      <div>
        <label for="disablesettings">${t('disable_settings_label')}</label>
        <input type="hidden" name="disablesettings" value="false" />
        <input id="disablesettings" name="disablesettings" type="checkbox" value="true" ${GM_getValue("disablesettings") ? "checked" : ""} />
        <p style="color: gray;">${t('disable_settings_help')}</p>
      </div>
      <div>
        <label for="watchlist">${t('watchlist_label')}</label>
        <br />
        <textarea id="watchlist" name="watchlist" class="quick" rows="6" cols="10" placeholder="${t('watchlist_placeholder')}">${GM_getValue("watchlist").map((s: string) => s.trim()).join("\n")}</textarea>
      </div>
      <div>
        <button type="submit">${t('submit_button')}</button>
        <button type="reset">${t('reset_button')}</button>
        <button type="button" onclick="document.getElementById('dialog').close()">${t('close_button')}</button>
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
      } else if (k === "language") {
        v = v === "" ? null : v; // Store null for auto-detect
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
  GM_registerMenuCommand(t('settings_menu'), () => {
    dialog.showModal();
  });
}