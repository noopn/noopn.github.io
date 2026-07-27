// scripts/dynamic_link_injector.js
hexo.extend.filter.register('after_render:html', function(str, data) {
  const regex = /<iframe\s+([^>]*?)src=["']https?:\/\/drawio\.iftrue\.club\/?([^"']*)["']([^>]*?)\s*(\/?)>/gi;

  return str.replace(regex, (match, p1, path = '', p2, slash) => {
    const safePath = path.startsWith('/') ? path : '/' + path;
    const p2Str = p2.trim() ? ' ' + p2.trim() : ''; 
    const closing = slash ? ' />' : '>';
    
    // 关键优化：去掉原有的 src 属性，将相对路径暂存到 data-drawio-path 属性中
    return `<iframe ${p1}data-drawio-path="${safePath}" data-dynamic-site="b-site"${p2Str}${closing}`;
  });
});