const parseTimestamp = (s: string) => {
  if (!s.includes("ago")) {
    return new Date(s);
  }
  const now = new Date();
  const d = s.match(/(\d+)d/i)?.[1] || "0";
  const h = s.match(/(\d+)h/i)?.[1] || "0";
  const m = s.match(/(\d+)m/i)?.[1] || "0";
  now.setDate(now.getDate() - (+d));
  now.setHours(now.getHours() - (+h));
  now.setMinutes(now.getMinutes() - (+m));
  return now;
}

const getUID = () => {
  return document
    .querySelector<HTMLAnchorElement>("#headerNeue2 > div > div.idBadgerNeue > a")
    .href
    .split("user/")[1];
}

const fetchHTMLDocument = (url: RequestInfo | URL, fetchMethod = "GET") => {
  return fetch(url, { method: fetchMethod, credentials: "include" }).then(
    (r) => r.text(),
    (err) => Promise.reject(err)
  ).then((t) => {
    const parser = new DOMParser();
    return parser.parseFromString(t, "text/html");
  });
};

const defaultAvatarElem = (userUrl: string) => {
  const avatar = document.createElement("span");
  const userAvatarAnchor = document.createElement("a");
  const userAvatarSpan = document.createElement("span");
  userAvatarSpan.classList.add("avatarNeue", "avatarReSize40", "ll");
  userAvatarSpan.style.backgroundImage = 'url("//lain.bgm.tv/pic/user/l/icon.jpg")'
  userAvatarAnchor.href = userUrl;
  userAvatarAnchor.appendChild(userAvatarSpan);
  avatar.classList.add("avatar");
  avatar.appendChild(userAvatarAnchor);
  return avatar;
}

const MAX_PAGES = 5;

const fetchComments = async (uid: string) => {
  const url = `${location.origin}/book/list/${uid}/collect`;
  const firstPage = await fetchHTMLDocument(url);
  // TODO: latest pages
  const maxPageNum = Math.min(MAX_PAGES, firstPage.getElementsByClassName('page_inner')[0].childElementCount - 1);
  const pageURLs = Array.from({ length: maxPageNum }, (_, i) => i + 1).map((i) => `${url}?page=${i}`)
  pageURLs.shift(); // [2, ..., maxPageNum]
  const pages = await Promise.all(pageURLs.map((u) => fetchHTMLDocument(u)));
  pages.unshift(firstPage);

  const subjectUrls = pages
    .flatMap((page) => Array.from(page.getElementById("browserItemList").children).map((c) => (c.firstElementChild as HTMLAnchorElement).href + "/comments"));
  const subjectCovers = pages
    .flatMap((page) => Array.from(page.getElementById("browserItemList").children).map((c) => c.getElementsByTagName('img')[0].src));
  const commentPageDOMs = await Promise.all(subjectUrls.map((u) => fetchHTMLDocument(u)));
  const commentElements = commentPageDOMs.map((p) => Array.from(p.getElementsByClassName("text")));
  const avatarElements: HTMLAnchorElement[] = commentPageDOMs.flatMap((p) => Array.from(p.querySelectorAll('#comment_box > div > .avatar')));
  const uid2avatar = new Map<string, HTMLAnchorElement>();
  avatarElements.forEach((e) => {
    // adjust avatar span class
    e.firstElementChild.classList.replace("rr", "ll");
    e.firstElementChild.classList.replace("avatarSize32", "avatarReSize40");
    (e.firstElementChild as HTMLSpanElement).style.marginLeft = '6px';
    // parse username from href
    const username = e.href.split('/').at(-1);
    uid2avatar.set(username, e);
  });
  const subjectTitles = pages
    .flatMap((page) => Array.from(page.getElementById("browserItemList").children).map((c) => c.getElementsByTagName('h3')[0].textContent.trim()));
  const data = commentElements.flatMap((cs, i) => {
    return cs.map((c) => {
      const userAnchor = c.firstElementChild as HTMLAnchorElement;
      return {
        subjectUrl: subjectUrls[i],
        subjectTitle: subjectTitles[i],
        subjectCover: subjectCovers[i],
        userAvatarElement: uid2avatar.get(userAnchor.href.split('/').at(-1)) ?? defaultAvatarElem(userAnchor.href),
        userUrl: userAnchor.href,
        username: userAnchor.text,
        date: parseTimestamp(c.getElementsByTagName('small')[0].textContent.slice(2)),
        comment: c.getElementsByTagName('p')[0].textContent,
      } as Comment
    }).filter((c) => (!c.userUrl.includes(uid)));
  });
  data.sort((a, b) => (+b.date) - (+a.date));
  return data
}

const commentDataToTLList = (data: Comment[]) => {
  const ul = document.createElement("ul");
  const lis = data.map((d) => {
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
    collectInfo.appendChild(quoteDiv);
    info.appendChild(collectInfo);
    // info - date
    const dateP = document.createElement("p");
    dateP.classList.add("date");
    dateP.textContent = d.date.toLocaleString();
    info.appendChild(dateP);
    // info done
    li.appendChild(info);
    return li
  });
  lis.forEach((l) => { ul.appendChild(l) });
  return ul;
}

export { getUID, commentDataToTLList, fetchComments }