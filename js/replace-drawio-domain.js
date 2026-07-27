
const DOMAIN_MAP = {
    'blog.iftrue.club': 'https://drawio.iftrue.club',
    'blog.iftrue.me': 'https://drawio.iftrue.me',
    'localhost': 'https://drawio.iftrue.club'
};
document.addEventListener("DOMContentLoaded", function () {
    const currentHost = window.location.hostname;

    let targetBase = DOMAIN_MAP[currentHost];
    if (!targetBase) {
        const tld = currentHost.split('.').pop();
        targetBase = `https://drawio.iftrue.${tld}`;
    }

    // 抓取所有带有标识的 iframe
    const dynamicIframes = document.querySelectorAll('iframe[data-dynamic-site="b-site"]');

    dynamicIframes.forEach(iframe => {
        // 从 data-drawio-path 提取之前暂存的路径
        const path = iframe.getAttribute('data-drawio-path');
        if (path) {
            // 组装完整的 URL 并正式赋值给 src，此时浏览器才会真正开始加载图表
            iframe.src = targetBase.replace(/\/$/, '') + path;
        }
    });
});