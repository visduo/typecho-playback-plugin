# 前言

Typecho 主题配套的文章放映插件。

# playback

[更新记录](https://github.com/visduo/typecho-playback-plugin/blob/main/CHANGELOG.md) | [更新计划](https://github.com/visduo/typecho-playback-plugin/issues) | [插件下载](https://github.com/visduo/typecho-playback-plugin/releases/) | [Github 开源](https://github.com/visduo/typecho-playback-plugin)

请仔细阅读使用说明和注意事项，如果有任何问题或者建议，可以留言与我交流反馈。

# 适配指南

三方主题适配该插件，需要提前导入 jQuery，自行提供放映按钮并将按钮 id 设置为 enterPlayback，其余样式可自行优化。

示例：

```html
<button class="vertical-btn playback-minitool" id="enterPlayback">
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-collection-play" viewBox="0 0 16 16">
        <path d="M2 3a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 0-1h-11A.5.5 0 0 0 2 3m2-2a.5.5 0 0 0 .5.5h7a.5.5 0 0 0 0-1h-7A.5.5 0 0 0 4 1m2.765 5.576A.5.5 0 0 0 6 7v5a.5.5 0 0 0 .765.424l4-2.5a.5.5 0 0 0 0-.848z"/>
        <path d="M1.5 14.5A1.5 1.5 0 0 1 0 13V6a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 16 6v7a1.5 1.5 0 0 1-1.5 1.5zm13-1a.5.5 0 0 0 .5-.5V6a.5.5 0 0 0-.5-.5h-13A.5.5 0 0 0 1 6v7a.5.5 0 0 0 .5.5z"/>
    </svg>
</button>
```

# Tips

二创、移植，劳烦动动手点个 Star，燕过留声，人过留名。

若这个项目帮到你，不妨留下一颗 Star 支持下～
