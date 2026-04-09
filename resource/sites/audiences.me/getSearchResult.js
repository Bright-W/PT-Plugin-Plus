/**
 * NexusPHP 默认搜索结果解析类
 */
(function (options, Searcher) {
  class Parser {
    constructor() {
      this.haveData = false;
      if (/takelogin\.php|<form action="\?returnto=/.test(options.responseText)) {
        options.status = ESearchResultParseStatus.needLogin; //`[${options.site.name}]需要登录后再搜索`;
        return;
      }

      options.isLogged = true;

      if (
        /没有种子|No [Tt]orrents?|Your search did not match anything|用准确的关键字重试/.test(
          options.responseText
        )
      ) {
        options.status = ESearchResultParseStatus.noTorrents; // `[${options.site.name}]没有搜索到相关的种子`;
        return;
      }

      this.haveData = true;
      this.site = options.site;
    }

    /**
     * 获取搜索结果
     */
    getResult() {
      if (!this.haveData) {
        return [];
      }
      let site = options.site;
      let site_url_help = PTServiceFilters.parseURL(site.url);
      let selector = options.resultSelector || "table.torrents:last";
      let table = options.page.find(selector);
      // 获取种子列表行
      let rows = table.find('> tbody > tr[data-torrent-row="1"]');
      if (rows.length == 0) {
        options.status = ESearchResultParseStatus.torrentTableIsEmpty; //`[${options.site.name}]没有定位到种子列表，或没有相关的种子`;
        return [];
      }
      let results = [];

      if (site.url.lastIndexOf("/") != site.url.length - 1) {
        site.url += "/";
      }

      try {
        // 遍历数据行
        for (let index = 0; index < rows.length; index++) {
          const row = rows.eq(index);
          //row.find(".torrent-info-text-name .new").remove();
          let title = row.find("table.torrentname a[href*='details.php']");
          if (title.length == 0) {
            continue;
          }
          let link = title.attr("href");
          if (link && link.substr(0, 4) !== "http") {
            link = `${site.url}${link}`;
          }

          // 获取下载链接
          let url = row.find("a.torrent-row-action-link--download").attr("href");
          if (url && url.substr(0, 4) !== "http") {
            url = `${site.url}${url}`;
          }

          if (!url) {
            continue;
          }

          url = url +
            (site && site.passkey ? "&passkey=" + site.passkey : "");

          let data = {
            title: title.attr("title"),
            subTitle: row.attr('data-description') || "",
            link,
            url,
            size: row.children("td").eq(4).text() || 0,
            time: row.children("td").eq(3).find("span").attr('title') || "",
            author: row.children("td").eq(9).text() || "",
            seeders: row.attr('data-seeders') || 0,
            leechers: row.attr('data-leechers') || 0,
            completed: row.attr('data-times-completed') || 0,
            comments: row.children("td").eq(2).text() || 0, 
            site: site,
            tags: Searcher.getRowTags(this.site, row),
            entryName: options.entry.name,
            category: this.getCategory(row),
            progress: Searcher.getFieldValue(this.site, row, "progress"),
            status: Searcher.getFieldValue(this.site, row, "status"),
            imdbId: this.getIMDbId(row)
          };

          results.push(data);
        }
      } catch (error) {
        options.status = ESearchResultParseStatus.parseError;
        options.errorMsg = error.stack;
        //`[${options.site.name}]获取种子信息出错: ${error.stack}`;
      }

      return results;
    }

    /**
     * 获取IMDbId
     * @param {*} row
     */
    getIMDbId(row)
    {
      let imdbId = Searcher.getFieldValue(this.site, row, "imdbId");
      if (imdbId) {
        return imdbId;
      }

      try {
        let link = row.find("a[href*='imdb.com/title/tt']").first().attr("href");
        if (link)
        {
          imdbId = link.match(/(tt\d+)/);
          if (imdbId)
            return imdbId[0];
        }
      } catch (error){
        console.log(error)
        return null;
      }
      return null;
    }

    /**
     * 获取分类
     * @param {*} row 当前行
     */
    getCategory(row) {
      let result = {
        name: "",
        link: ""
      };
      let link = row.find("a:first");
      let img = link.find("img:first");

      if (link.length) {
        result.link = link.attr("href");
        if (result.link.substr(0, 4) !== "http") {
          result.link = options.site.url + result.link;
        }
      }

      if (img.length) {
        result.name = img.attr("title") || img.attr("alt");
      } else {
        result.name = link.text();
      }
      return result;
    }
  }

  let parser = new Parser(options);
  options.results = parser.getResult();
  console.log(options.results);
})(options, options.searcher);
