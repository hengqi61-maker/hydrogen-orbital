# Reveal.js 量子本征值问题汇报

独立的 18 页互动网页汇报。前 7 页讨论差分矩阵法与打靶法，后 11 页从三维中心势分离变量推导到氢原子完整解析解，并在结尾统一数值量子化与解析量子化。

公式均保留为 LaTeX 源码并由 KaTeX 原生排版；曲线使用可缩放 SVG，轨道图来自根目录氢原子项目的计算结果。该工程不修改根目录项目原有的开发与构建入口。

## 本地运行

在仓库根目录执行：

```bash
npm run pre:dev
```

生产构建与预览：

```bash
npm run pre:build
npm run pre:preview
```

## 演示快捷键

- 方向键：翻页
- `O`：概览
- `S`：讲者视图
- `F`：浏览器全屏
- 第 18 页：打开根目录氢原子 Three.js 互动项目
- 互动页 `1` / `2` / `3`：吸附到前三个本征值
- 互动页 `A` / `D`：能量减小或增大 `0.01`
- 互动页 `Shift+A` / `Shift+D`：能量减小或增大 `0.1`
- 互动页 `P`：开始或暂停扫描
- 互动页 `R`：恢复默认状态

## 数据与部署

图表由 `numerical_analysis/results/*.csv` 生成，KaTeX 字体与脚本均复制到本地构建产物，不依赖 CDN。

```bash
npm run pages:build
```

该命令生成：

- `pages-dist/index.html`：原氢原子项目
- `pages-dist/pre/index.html`：本网页汇报

GitHub Pages 工作流位于 `.github/workflows/pages.yml`，仅支持手动触发。
