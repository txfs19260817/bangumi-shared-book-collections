// ==UserScript==
// @name        Bangumi shared book collections
// @namespace   http://tampermonkey.net/
// @version     1.0.10
// @author      txfs19260817
// @source      https://github.com/txfs19260817/bangumi-shared-book-collections
// @license     WTFPL
// @icon        https://bangumi.tv/img/favicon.ico
// @match       http*://*.bangumi.tv/
// @match       http*://*.bgm.tv/
// @match       http*://*.chii.in/
// @grant       GM_registerMenuCommand
// @grant       GM_getValue
// @grant       GM_setValue
// ==/UserScript==

/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: ./src/utils.ts
const parseTimestamp = s => {
  if (!s.includes("ago")) {
    return new Date(s);
  }
  const now = new Date();
  const d = s.match(/(\d+)d/i)?.[1] || "0";
  const h = s.match(/(\d+)h/i)?.[1] || "0";
  const m = s.match(/(\d+)m/i)?.[1] || "0";
  now.setDate(now.getDate() - +d);
  now.setHours(now.getHours() - +h);
  now.setMinutes(now.getMinutes() - +m);
  return now;
};
const fetchHTMLDocument = function (url) {
  let fetchMethod = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : "GET";
  return fetch(url, {
    method: fetchMethod,
    credentials: "include"
  }).then(r => r.text(), err => Promise.reject(err)).then(t => {
    const parser = new DOMParser();
    return parser.parseFromString(t, "text/html");
  });
};
function htmlToElement(html) {
  const template = document.createElement('template');
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild;
}

;// CONCATENATED MODULE: ./src/CommentParser.ts

class CommentParser {
  SHOW_STARS = true;
  WATCHLIST = [];
  constructor() {
    let max_pages = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 5;
    let max_results = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 100;
    let show_stars = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;
    let watchlist = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : [];
    this.MAX_PAGES = max_pages;
    this.MAX_RESULTS = max_results;
    this.SHOW_STARS = show_stars;
    this.WATCHLIST = watchlist;
    this.uid = CommentParser.getUID();
  }
  defaultAvatarElem = userUrl => {
    const avatar = document.createElement("span");
    const userAvatarAnchor = document.createElement("a");
    const userAvatarSpan = document.createElement("span");
    userAvatarSpan.classList.add("avatarNeue", "avatarReSize40", "ll");
    userAvatarSpan.style.backgroundImage = 'url("//lain.bgm.tv/pic/user/l/icon.jpg")';
    userAvatarAnchor.href = userUrl;
    userAvatarAnchor.appendChild(userAvatarSpan);
    avatar.classList.add("avatar");
    avatar.appendChild(userAvatarAnchor);
    return avatar;
  };
  sids2subjects = async sids => {
    const DOMs = await Promise.all(sids.map(s => fetchHTMLDocument(`${location.origin}/subject/${s}/comments`)));
    return DOMs.map((d, i) => ({
      url: `${location.origin}/subject/${sids[i]}/comments`,
      title: d.querySelector("#headerSubject > h1 > a").text,
      cover: d.querySelector("#subject_inner_info > a > img").src
    }));
  };
  fetchComments = async () => {
    // URL to the list of read books
    const readCollectionURL = `${location.origin}/book/list/${this.uid}/collect`;

    // The first page of the list of read books
    const firstPage = await fetchHTMLDocument(readCollectionURL);

    // Get the total page number, yet limit it to MAX_PAGES
    const maxPageNum = Math.min(this.MAX_PAGES, Math.max(...Array.from(document.getElementsByClassName('page_inner')[0].childNodes) // get paginator elements
    .filter(e => e instanceof HTMLAnchorElement && e.href.length > 0) // keep anchors w/ href
    .map(e => +(e.href.match(/[0-9]+$/)[0] || 1) // parse page numbers
    )) // get the maximum of the array
    );

    // Get DOMs by URLs
    const readCollectionURLs = Array.from({
      length: maxPageNum
    }, (_, i) => i + 1).map(i => `${readCollectionURL}?page=${i}`); // [1, ..., maxPageNum]
    readCollectionURLs.shift(); // [2, ..., maxPageNum]
    const pages = await Promise.all(readCollectionURLs.map(u => fetchHTMLDocument(u)));
    pages.unshift(firstPage); // all DOMs here

    // Get all subject URLs from the list, along with title and cover attributes
    const subjects = pages.flatMap(page => Array.from(page.getElementById("browserItemList").children).map(c => ({
      url: c.firstElementChild.href + "/comments",
      title: c.getElementsByTagName('h3')[0].textContent.trim(),
      cover: c.getElementsByTagName('img')[0].src
    })));

    // fetch watchlist subjects which are not shown in what we've already obtained
    const sidSet = new Set(subjects.map(s => s.url.slice(0, -9).match(/\d+$/)[0]));
    const filteredWatchlist = this.WATCHLIST.map(i => i.trim()).filter(i => !sidSet.has(i));
    subjects.push(...(await this.sids2subjects(filteredWatchlist)));

    // Get DOMs by URLs
    const commentPageDOMs = (await Promise.all(subjects.map(s => fetchHTMLDocument(s.url)))).map(d => d.getElementById("comment_box"));

    // Extract comment elements: comment class="text" ; avatar class="avatar"
    const commentElementLists = commentPageDOMs.map(p => Array.from(p.getElementsByClassName("text")));
    const avatarElementLists = commentPageDOMs.map(p => Array.from(p.getElementsByClassName("avatar")));
    avatarElementLists.forEach((avatarElements, i) => {
      avatarElements.forEach((e, j) => {
        if (e.firstElementChild instanceof HTMLSpanElement) {
          // adjust avatar span class
          e.firstElementChild.classList.replace("rr", "ll");
          e.firstElementChild.classList.replace("avatarSize32", "avatarReSize40");
          e.firstElementChild.style.marginLeft = '6px';
        }
      });
    });
    const outputComments = commentElementLists.flatMap((commentElements, i) => commentElements.map((c, j) => ({
      subjectUrl: subjects[i].url,
      subjectTitle: subjects[i].title,
      subjectCover: subjects[i].cover,
      userAvatarElement: avatarElementLists[i][j],
      userUrl: avatarElementLists[i][j].href,
      username: avatarElementLists[i][j].text,
      date: parseTimestamp(c.getElementsByTagName('small')[0].textContent.slice(2)),
      comment: c.getElementsByTagName('p')[0].textContent,
      stars: c.getElementsByClassName("starlight")[0]?.classList.value.match(/\d+/)?.[0] ?? 0
    })).filter(c => !c.userUrl.includes(this.uid)) // exclude the current user
    );

    return outputComments.sort((a, b) => +b.date - +a.date).slice(0, this.MAX_RESULTS);
  };
  commentDataToTLList = data => {
    const ul = document.createElement("ul");
    const lis = data.map(d => {
      const li = document.createElement("li");
      li.classList.add("clearit", "tml_item");
      // avatar
      li.appendChild(d.userAvatarElement);
      // info
      const info = document.createElement("span");
      info.classList.add("clearit", "info");
      // info - cover
      const coverAnchor = document.createElement("a");
      const coverImg = document.createElement("img");
      coverImg.classList.add("rr");
      coverImg.src = d.subjectCover;
      coverImg.height = 48;
      coverImg.width = 48;
      coverAnchor.appendChild(coverImg);
      info.appendChild(coverAnchor);
      // info - username
      const userAnchor = document.createElement("a");
      userAnchor.href = d.userUrl;
      userAnchor.textContent = d.username;
      userAnchor.classList.add("l");
      info.appendChild(userAnchor);
      const connector = document.createElement("span");
      connector.textContent = " 读过 ";
      info.appendChild(connector);
      // info - subject
      const subjectAnchor = document.createElement("a");
      subjectAnchor.href = d.subjectUrl;
      subjectAnchor.textContent = d.subjectTitle;
      subjectAnchor.classList.add("l");
      info.appendChild(subjectAnchor);
      // info - comment
      const collectInfo = document.createElement("div");
      collectInfo.classList.add("collectInfo");
      const quoteDiv = document.createElement("div");
      quoteDiv.classList.add("quote");
      const quoteQ = document.createElement("q");
      quoteQ.textContent = d.comment;
      quoteDiv.appendChild(quoteQ);
      if (this.SHOW_STARS && d.stars > 0) {
        const starSpan = document.createElement("span");
        starSpan.classList.add("starstop-s");
        const starlightSpan = document.createElement("span");
        starlightSpan.classList.add("starlight", `stars${d.stars}`);
        starSpan.appendChild(starlightSpan);
        collectInfo.appendChild(starSpan);
      }
      collectInfo.appendChild(quoteDiv);
      info.appendChild(collectInfo);
      // info - date
      const dateP = document.createElement("p");
      dateP.classList.add("date");
      dateP.textContent = d.date.toLocaleString();
      info.appendChild(dateP);
      // info done
      li.appendChild(info);
      return li;
    });
    lis.forEach(l => {
      ul.appendChild(l);
    });
    return ul;
  };
  static getUID = () => document.querySelector("#headerNeue2 > div > div.idBadgerNeue > a").href.split("user/")[1];
}
;// CONCATENATED MODULE: ./src/Dialog.ts

const createSettingsDialog = () => {
  const dialog = htmlToElement(`
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
        <textarea id="watchlist" name="watchlist" class="quick" rows="6" cols="10" placeholder="例:\n326125\n329803">${GM_getValue("watchlist").map(s => s.trim()).join("\n")}</textarea>
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
    const data = new FormData(e.target);
    [...data.entries()].forEach(kv => {
      const k = kv[0];
      let v = kv[1];
      if (k === "watchlist") {
        v = kv[1].split("\n").filter(n => Number.isInteger(Number(n)) && Number(n) > 0);
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
};
;// CONCATENATED MODULE: ./src/TabItem.ts
class TabItem {
  states = {
    loading: {
      text: "⏳",
      cursor: "wait"
    },
    done: {
      text: "共读",
      cursor: "pointer"
    }
  };
  li = document.createElement("li");
  a = document.createElement("a");
  constructor() {
    let disable_settings = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : false;
    this.DISABLE_SETTINGS = disable_settings;
    // initialize
    this.a.id = "tab_bsbc";
    this.applyState(this.states.loading);
    this.li.appendChild(this.a);
    document.getElementById('timelineTabs').appendChild(this.li);
  }
  settingAnchor() {
    const a = document.createElement("a");
    a.text = "⚙️设置";
    a.style.cursor = "pointer";
    a.onclick = function () {
      document.getElementById("dialog").showModal();
    };
    const li = document.createElement("li");
    li.appendChild(a);
    return li;
  }
  applyState(state) {
    this.a.text = state.text;
    this.a.style.cursor = state.cursor;
  }
  loaded() {
    for (var _len = arguments.length, nodes = new Array(_len), _key = 0; _key < _len; _key++) {
      nodes[_key] = arguments[_key];
    }
    this.applyState(this.states.done);
    // add onclick handler
    const a = this.a;
    this.a.onclick = function () {
      if (a.classList.contains("focus")) return;
      ["tab_all", "tab_say", "tab_subject", "tab_progress", "tab_blog"].forEach(id => {
        document.getElementById(id).classList.remove("focus");
      });
      a.classList.add("focus");
      document.getElementById("timeline").replaceChildren(...nodes);
    };
    if (!this.DISABLE_SETTINGS) {
      // add settings button
      document.getElementById('timelineTabs').appendChild(this.settingAnchor());
    }
  }
}
;// CONCATENATED MODULE: ./src/index.ts



async function main() {
  const tabItem = new TabItem(!!GM_getValue("disablesettings"));
  const cp = new CommentParser(GM_getValue("maxpages"), GM_getValue("maxresults"), !!GM_getValue("showstars"), GM_getValue("watchlist"));
  cp.fetchComments().then(data => {
    createSettingsDialog();
    tabItem.loaded(cp.commentDataToTLList(data)); // TODO: pagination?
  });
}

main().catch(e => {
  console.error(e);
});
/******/ })()
;