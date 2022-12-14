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

const fetchHTMLDocument = (url: RequestInfo | URL, fetchMethod = "GET") => {
  return fetch(url, { method: fetchMethod, credentials: "include" }).then(
    (r) => r.text(),
    (err) => Promise.reject(err)
  ).then((t) => {
    const parser = new DOMParser();
    return parser.parseFromString(t, "text/html");
  });
};

function htmlToElement<T extends HTMLElement>(html: string): T {
  const template = document.createElement('template');
  html = html.trim(); // Never return a text node of whitespace as the result
  template.innerHTML = html;
  return template.content.firstChild as T;
}

export { parseTimestamp, fetchHTMLDocument, htmlToElement }