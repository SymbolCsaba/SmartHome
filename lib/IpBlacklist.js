const url = require("url");
const linefeed = require('os').EOL;
const fs = require('fs');
const got = require('got');

module.exports = {
  _ips: [],
  _whitelist: [],

  comparer: function (element, needle) { return element - needle; },

  loadFromFile: function (filename) {
    const lines = fs.readFileSync(filename)
      .toString()
      .split(linefeed)
      .filter(function (row) { return row != '' && !row.startsWith('#'); });

    lines.forEach(function (line) {
      const match = line.match(/([0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3})/);
      if (match)
        this._ips.push(match[1]);
    }.bind(this));
  },

  retrieveFromUrl: async function (url) {
    const response = await got(url);
    const responselines = response.body
      .split('\n')
      .filter(function (row) { return row != '' && !row.startsWith('#'); });

    responselines.forEach(function (line) {
      const match = line.match(/^([0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3}.[0-9]{1,3})/);
      if (match)
        this._ips.push(match[1]);
    }.bind(this));
  },

  buildBlackList: async function (settings) {
    for (var i = 0; i < settings.blackLists.length; i++) {
      const blacklist = settings.blackLists[i];

      const parsedurl = url.parse(blacklist);
      if (parsedurl.host)
        await this.retrieveFromUrl(blacklist);
      else
        if (fs.existsSync(blacklist))
          this.loadFromFile(blacklist);
    };

    this._ips.sort(this.comparer);

    console.info("[BlackList] Initialized with " + this._ips.length + " IP addresses");
  },

  check: function (settings) {

    this.buildBlackList(settings);
    setInterval(function () { this._whitelist = []; }.bind(this), settings.whiteListLifeTimeMs);

    const hook = function (request, response, next) {

      const reqip = request.headers['x-forwarded-for'] || request.connection.remoteAddress;

      if (this._whitelist.includes(reqip))
        next();
      else {
        const isbanned = this._ips.includes(reqip);
        if (isbanned) {
          if (typeof settings.onFailRequest === "function")
            settings.onFailRequest(reqip);

          return;
        }
        else
          this._whitelist.push(reqip);

        next();
      }
    }.bind(this);

    return hook;
  },

}