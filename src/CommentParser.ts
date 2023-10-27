import {fetchHTMLDocument, parseTimestamp} from "./utils";

export class CommentParser {
  uid: string
  MAX_PAGES: number;
  MAX_RESULTS: number;
  SHOW_STARS: boolean = true;
  WATCHLIST: string[] = [];

  constructor(max_pages: number = 5, max_results: number = 100, show_stars: boolean = true, watchlist: string[] = []) {
    this.MAX_PAGES = max_pages;
    this.MAX_RESULTS = max_results;
    this.SHOW_STARS = show_stars;
    this.WATCHLIST = watchlist;
    this.uid = CommentParser.getUID();
  }

  private defaultAvatarElem = (userUrl: string) => {
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

  sids2subjects = async (sids: string[]): Promise<Subject[]> => {
    const DOMs = await Promise.all(sids.map((s) => fetchHTMLDocument(`${location.origin}/subject/${s}/comments`)));

    return DOMs.map((d, i) => ({
      url: `${location.origin}/subject/${sids[i]}/comments`,
      title: d.querySelector<HTMLAnchorElement>("#headerSubject > h1 > a").text,
      cover: d.querySelector<HTMLImageElement>("#subject_inner_info > a > img").src,
    }));
  }

  fetchComments = async () => {
    // URL to the list of read books
    const readCollectionURL = `${location.origin}/book/list/${this.uid}/collect`;

    // The first page of the list of read books
    const firstPage = await fetchHTMLDocument(readCollectionURL);

    // Get the total page number, yet limit it to MAX_PAGES
    const maxPageNum = Math.min(
      this.MAX_PAGES,
      Math.max(...Array.from(
        document.getElementsByClassName('page_inner')[0].childNodes) // get paginator elements
        .filter((e) => e instanceof HTMLAnchorElement && e.href.length > 0) // keep anchors w/ href
        .map((e: HTMLAnchorElement) => +(e.href.match(/[0-9]+$/)[0] || 1) // parse page numbers
        )) // get the maximum of the array
    );

    // Get DOMs by URLs
    const readCollectionURLs = Array.from({length: maxPageNum}, (_, i) => i + 1).map((i) => `${readCollectionURL}?page=${i}`); // [1, ..., maxPageNum]
    readCollectionURLs.shift(); // [2, ..., maxPageNum]
    const pages = await Promise.all(readCollectionURLs.map((u) => fetchHTMLDocument(u)));
    pages.unshift(firstPage); // all DOMs here

    // Get all subject URLs from the list, along with title and cover attributes
    const subjects: Subject[] = pages.flatMap(
      (page) => Array.from(page.getElementById("browserItemList").children)
        .map((c) => ({
          url: (c.firstElementChild as HTMLAnchorElement).href + "/comments",
          title: c.getElementsByTagName('h3')[0].textContent.trim(),
          cover: c.getElementsByTagName('img')[0].src,
        }))
    );

    // fetch watchlist subjects which are not shown in what we've already obtained
    const sidSet = new Set<string>(subjects.map((s) => s.url.slice(0, -9).match(/\d+$/)[0]));
    const filteredWatchlist = this.WATCHLIST.map((i) => i.trim()).filter((i) => !sidSet.has(i));
    subjects.push(...await this.sids2subjects(filteredWatchlist));

    // Get DOMs by URLs
    const commentPageDOMs = (await Promise.all(subjects.map((s) => fetchHTMLDocument(s.url))))
      .map((d) => d.getElementById("comment_box") as HTMLDivElement);

    // Extract comment elements: comment class="text" ; avatar class="avatar"
    const commentElementLists = commentPageDOMs.map((p) => Array.from(p.getElementsByClassName("text")));
    const avatarElementLists = commentPageDOMs.map((p) => Array.from(p.getElementsByClassName("avatar") as HTMLCollectionOf<HTMLAnchorElement>));
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
    const outputComments = commentElementLists.flatMap((commentElements, i) =>
      commentElements.map((c, j) =>
        ({
          subjectUrl: subjects[i].url,
          subjectTitle: subjects[i].title,
          subjectCover: subjects[i].cover,
          userAvatarElement: avatarElementLists[i][j],
          userUrl: avatarElementLists[i][j].href,
          username: avatarElementLists[i][j].text,
          date: parseTimestamp(c.getElementsByTagName('small')[0].textContent.slice(2)),
          comment: c.getElementsByTagName('p')[0].textContent,
          stars: c.getElementsByClassName("starlight")[0]?.classList.value.match(/\d+/)?.[0] ?? 0,
        } as Comment)).filter((c) => (!c.userUrl.includes(this.uid))) // exclude the current user
    );
    return outputComments.sort((a, b) => (+b.date) - (+a.date)).slice(0, this.MAX_RESULTS);
  }

  commentDataToTLList = (data: Comment[]) => {
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
      return li
    });
    lis.forEach((l) => {
      ul.appendChild(l)
    });
    return ul;
  }

  static getUID = () => document
    .querySelector<HTMLAnchorElement>("#headerNeue2 > div > div.idBadgerNeue > a")
    .href
    .split("user/")[1]
}
