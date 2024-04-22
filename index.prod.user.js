// ==UserScript==
// @name        Bangumi shared book collections
// @namespace   http://tampermonkey.net/
// @version     1.0.11
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
const fetchHTMLDocument = (url, fetchMethod = "GET") => {
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
  uid = CommentParser.getUID();
  constructor(max_pages = 5, max_results = 100, show_stars = true, watchlist = []) {
    this.MAX_PAGES = max_pages;
    this.MAX_RESULTS = max_results;
    this.SHOW_STARS = show_stars;
    this.WATCHLIST = watchlist;
  }
  async fetchComments() {
    const readCollectionURL = `${location.origin}/book/list/${this.uid}/collect`;
    const readCollectionFirstPage = await fetchHTMLDocument(readCollectionURL);
    const maxPageNum = this.getMaxPageNumber(readCollectionFirstPage);
    const urls = Array.from({
      length: maxPageNum - 1
    }, (_, i) => `${readCollectionURL}?page=${i + 2}`);
    const followingPages = await Promise.all(urls.map(url => fetchHTMLDocument(url)));
    console.log(urls);
    const subjects = this.extractSubjects([readCollectionFirstPage, ...followingPages]);
    const watchlistSubjects = await this.fetchWatchlistSubjects(subjects);
    const comments = await this.fetchCommentDetails([...watchlistSubjects, ...subjects]);
    return this.sortAndFilterComments(comments);
  }
  extractSubjects(pages) {
    return pages.flatMap(page => Array.from(page.getElementById("browserItemList").children).map(child => ({
      url: child.firstElementChild.href + "/comments",
      title: child.getElementsByTagName('h3')[0].textContent.trim(),
      cover: child.getElementsByTagName('img')[0].src
    })));
  }
  async fetchWatchlistSubjects(subjects) {
    if (!this.WATCHLIST) {
      return [];
    }
    const sidSet = new Set(subjects.map(s => s.url.split("/").at(-2)));
    const filteredWatchlist = this.WATCHLIST.filter(id => !sidSet.has(id));
    return this.sids2subjects(filteredWatchlist);
  }
  async sids2subjects(sids) {
    const DOMs = await Promise.all(sids.map(sid => fetchHTMLDocument(`${location.origin}/subject/${sid}/comments`)));
    return DOMs.map((doc, index) => ({
      url: `${location.origin}/subject/${sids[index]}/comments`,
      title: doc.querySelector("#headerSubject > h1 > a").textContent,
      cover: doc.querySelector("#subject_inner_info > a > img").src
    }));
  }
  async fetchCommentDetails(subjects) {
    const commentPages = await Promise.all(subjects.map(subject => fetchHTMLDocument(subject.url)));
    return commentPages.flatMap((page, i) => this.extractCommentsFromPage(page, subjects[i]));
  }
  extractCommentsFromPage(page, subject) {
    const commentDivs = Array.from(page.getElementsByClassName("item clearit"));
    return commentDivs.map(c => this.parseCommentDivToBgmComment(c, subject));
  }
  parseCommentDivToBgmComment(commentDiv, subject) {
    const avatarElement = commentDiv.querySelector('.avatar > span');
    const userUrl = `${location.origin}${commentDiv.querySelector('a.avatar').getAttribute('href')}`;
    const username = commentDiv.querySelector('.text_container .l').textContent;
    const dateText = commentDiv.querySelector('.text_container small:last-of-type').textContent.split('@')[1].trim();
    const commentText = commentDiv.querySelector('.text_container p').textContent;
    const starElement = commentDiv.querySelector('.starlight');
    const stars = starElement ? +starElement.classList.value.match(/\d+/)?.[0] ?? 0 : 0;
    return {
      subjectCover: subject.cover,
      subjectTitle: subject.title,
      subjectUrl: subject.url,
      userAvatarElement: this.createAvatarElement(avatarElement.style.backgroundImage, userUrl),
      userUrl,
      username,
      date: parseTimestamp(dateText),
      comment: commentText,
      stars
    };
  }
  createAvatarElement(imageUrl, userUrl) {
    const outerSpan = document.createElement('span');
    outerSpan.classList.add('avatar');
    const anchor = document.createElement('a');
    anchor.href = userUrl;
    anchor.classList.add('avatar');
    const imgSpan = document.createElement('span');
    imgSpan.classList.add('avatarNeue', 'avatarReSize40', 'll');
    imgSpan.style.backgroundImage = imageUrl;
    anchor.appendChild(imgSpan);
    outerSpan.appendChild(anchor);
    return outerSpan;
  }
  commentDataToTLList(comments) {
    const ul = document.createElement("ul");
    comments.forEach(comment => {
      const li = this.createDetailedLI(comment);
      ul.appendChild(li);
    });
    return ul;
  }
  createDetailedLI(comment) {
    const li = document.createElement('li');
    li.className = 'clearit tml_item';
    li.appendChild(comment.userAvatarElement);
    const coverAnchor = document.createElement('a');
    coverAnchor.href = comment.subjectUrl;
    coverAnchor.className = 'l rr';
    const coverSpan = document.createElement('span');
    coverSpan.className = 'cover';
    const img = document.createElement('img');
    img.src = comment.subjectCover;
    img.alt = comment.subjectTitle;
    img.width = 60;
    coverSpan.appendChild(img);
    coverAnchor.appendChild(coverSpan);
    li.appendChild(coverAnchor);
    const infoSpan = document.createElement('span');
    infoSpan.className = 'info clearit';
    const userAnchor = document.createElement('a');
    userAnchor.href = comment.userUrl;
    userAnchor.className = 'l';
    userAnchor.textContent = comment.username;
    infoSpan.appendChild(userAnchor);
    const readText = document.createTextNode(' 读过 ');
    infoSpan.appendChild(readText);
    const subjectAnchor = document.createElement('a');
    subjectAnchor.href = comment.subjectUrl;
    subjectAnchor.className = 'l';
    subjectAnchor.textContent = comment.subjectTitle;
    infoSpan.appendChild(subjectAnchor);
    const collectInfoDiv = document.createElement('div');
    collectInfoDiv.className = 'collectInfo';
    const commentDiv = document.createElement('div');
    commentDiv.className = 'comment';
    commentDiv.textContent = comment.comment;
    if (this.SHOW_STARS && comment.stars > 0) {
      const starsSpan = document.createElement('span');
      starsSpan.className = 'starstop-s';
      const starlightSpan = document.createElement('span');
      starlightSpan.className = `starlight stars${comment.stars}`;
      starsSpan.appendChild(starlightSpan);
      commentDiv.appendChild(starsSpan);
    }
    collectInfoDiv.appendChild(commentDiv);
    infoSpan.appendChild(collectInfoDiv);
    const dateDiv = document.createElement('div');
    dateDiv.className = 'post_actions date';
    dateDiv.textContent = comment.date.toLocaleString();
    infoSpan.appendChild(dateDiv);
    li.appendChild(infoSpan);
    return li;
  }
  getMaxPageNumber(firstPage) {
    const paginator = firstPage.getElementsByClassName('page_inner')[0];
    const pageLinks = Array.from(paginator.childNodes).filter(node => node instanceof HTMLAnchorElement).map(node => +node.href.match(/[0-9]+$/)[0]);
    return Math.min(this.MAX_PAGES, Math.max(...pageLinks));
  }
  sortAndFilterComments(comments) {
    return comments.filter(comment => !comment.userUrl.includes(this.uid)).sort((a, b) => +b.date - +a.date).slice(0, this.MAX_RESULTS);
  }
  static getUID() {
    return document.querySelector("#headerNeue2 > div > div.idBadgerNeue > a").href.split("user/")[1];
  }
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
  constructor(disable_settings = false) {
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
  loaded(...nodes) {
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