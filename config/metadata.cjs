const { author, dependencies, repository, version, license } = require('../package.json')

module.exports = {
  name: 'Bangumi shared book collections',
  namespace: 'http://tampermonkey.net/',
  version: version,
  author: author,
  source: repository.url,
  license: license,
  icon: 'https://bangumi.tv/img/favicon.ico',
  match: [
    'http*://*.bangumi.tv/',
    'http*://*.bgm.tv/',
    'http*://*.chii.in/'
  ],
  require: [],
  grant: [
    'GM_registerMenuCommand',
    'GM_getValue',
    'GM_setValue',
  ],
  connect: [],
}
