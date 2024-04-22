import {fetchHTMLDocument, parseTimestamp} from "./utils";

export class CommentParser {
  uid: string = CommentParser.getUID();
  MAX_PAGES: number;
  MAX_RESULTS: number;
  SHOW_STARS: boolean;
  WATCHLIST: string[];

  constructor(max_pages: number = 5, max_results: number = 100, show_stars: boolean = true, watchlist: string[] = []) {
    this.MAX_PAGES = max_pages;
    this.MAX_RESULTS = max_results;
    this.SHOW_STARS = show_stars;
    this.WATCHLIST = watchlist;
  }

  async fetchComments() {
    const readCollectionURL = `${location.origin}/book/list/${this.uid}/collect`;
    const readCollectionFirstPage = await fetchHTMLDocument(readCollectionURL);
    const maxPageNum = this.getMaxPageNumber(readCollectionFirstPage);
    const urls = Array.from({length: maxPageNum-1}, (_, i) => `${readCollectionURL}?page=${i + 2}`);
    const followingPages = await Promise.all(urls.map(url => fetchHTMLDocument(url)));
    console.log(urls)
    const subjects = this.extractSubjects([readCollectionFirstPage, ...followingPages]);
    const watchlistSubjects = await this.fetchWatchlistSubjects(subjects);
    const comments = await this.fetchCommentDetails([...watchlistSubjects, ...subjects]);
    return this.sortAndFilterComments(comments);
  }

  private extractSubjects(pages: Document[]): Subject[] {
    return pages.flatMap(page =>
      Array.from(page.getElementById("browserItemList").children)
        .map(child => ({
          url: (child.firstElementChild as HTMLAnchorElement).href + "/comments",
          title: child.getElementsByTagName('h3')[0].textContent.trim(),
          cover: child.getElementsByTagName('img')[0].src,
        }))
    );
  }

  private async fetchWatchlistSubjects(subjects: Subject[]): Promise<Subject[]> {
    if (!this.WATCHLIST) {
      return [];
    }
    const sidSet = new Set<string>(subjects.map(s => s.url.split("/").at(-2)));
    const filteredWatchlist = this.WATCHLIST.filter(id => !sidSet.has(id));
    return this.sids2subjects(filteredWatchlist);
  }

  private async sids2subjects(sids: string[]): Promise<Subject[]> {
    const DOMs = await Promise.all(sids.map(sid => fetchHTMLDocument(`${location.origin}/subject/${sid}/comments`)));
    return DOMs.map((doc, index) => ({
      url: `${location.origin}/subject/${sids[index]}/comments`,
      title: doc.querySelector<HTMLAnchorElement>("#headerSubject > h1 > a").textContent,
      cover: doc.querySelector<HTMLImageElement>("#subject_inner_info > a > img").src
    }));
  }

  private async fetchCommentDetails(subjects: Subject[]): Promise<BgmComment[]> {
    const commentPages = await Promise.all(subjects.map(subject => fetchHTMLDocument(subject.url)));
    return commentPages.flatMap((page, i) => this.extractCommentsFromPage(page, subjects[i]));
  }

  private extractCommentsFromPage(page: Document, subject: Subject): BgmComment[] {
    const commentDivs = Array.from(page.getElementsByClassName("item clearit") as HTMLCollectionOf<HTMLDivElement>);
    return commentDivs.map((c) => this.parseCommentDivToBgmComment(c, subject));
  }

  parseCommentDivToBgmComment(commentDiv: HTMLDivElement, subject: Subject): BgmComment {
    const avatarElement = commentDiv.querySelector('.avatar > span') as HTMLSpanElement;
    const userUrl = `${location.origin}${commentDiv.querySelector('a.avatar').getAttribute('href')}`;
    const username = commentDiv.querySelector('.text_container .l').textContent;
    const dateText = commentDiv.querySelector('.text_container small:last-of-type').textContent.split('@')[1].trim();
    const commentText = commentDiv.querySelector('.text_container p').textContent;
    const starElement: HTMLSpanElement | null = commentDiv.querySelector('.starlight');
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

  private createAvatarElement(imageUrl: string, userUrl: string): HTMLSpanElement {
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

  commentDataToTLList(comments: BgmComment[]): HTMLElement {
    const ul = document.createElement("ul");
    comments.forEach(comment => {
      const li = this.createDetailedLI(comment);
      ul.appendChild(li);
    });
    return ul;
  }

  private createDetailedLI(comment: BgmComment): HTMLLIElement {
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

  private getMaxPageNumber(firstPage: Document): number {
    const paginator = firstPage.getElementsByClassName('page_inner')[0];
    const pageLinks = Array.from(paginator.childNodes)
      .filter(node => node instanceof HTMLAnchorElement)
      .map(node => +(node as HTMLAnchorElement).href.match(/[0-9]+$/)[0]);
    return Math.min(this.MAX_PAGES, Math.max(...pageLinks));
  }

  private sortAndFilterComments(comments: BgmComment[]): BgmComment[] {
    return comments
      .filter(comment => !comment.userUrl.includes(this.uid))
      .sort((a, b) => (+b.date) - (+a.date))
      .slice(0, this.MAX_RESULTS);
  }

  static getUID(): string {
    return document.querySelector<HTMLAnchorElement>("#headerNeue2 > div > div.idBadgerNeue > a").href.split("user/")[1];
  }
}
