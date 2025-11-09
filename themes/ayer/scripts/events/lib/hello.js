"use strict";

module.exports = (hexo) => {
  const isZh = hexo.theme.i18n.languages[0].search(/zh-CN/i) !== -1;
  if (isZh) {
    hexo.log.info(`文档: https://shen-yu.gitee.io/2019/ayer/`);
  } else {
    hexo.log.info(`Docs: https://github.com/Shen-Yu/hexo-theme-ayer`);
  }
};
