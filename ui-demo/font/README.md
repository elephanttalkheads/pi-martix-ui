# 原始字体归档

应用加载的字体在 `src/renderer/src/assets/fonts/`（随 vite 打包）。本目录保存**原始全量字体**，用于将来重新子集化/核对，不被构建引用。

| 文件 | 来源 | 许可证 | 用途 |
|---|---|---|---|
| `SarasaTermSC-Regular.ttf` | [be5invis/Sarasa-Gothic](https://github.com/be5invis/Sarasa-Gothic) releases（sarasa-term-sc-ttf 包） | SIL OFL 1.1 | CJK 回退字体（中文正文） |
| `Matrix-Code.ttf` | [Rezmason/matrix](https://github.com/Rezmason/matrix) `assets/Matrix-Code.ttf` | MIT | 电影官方镜像片假名，数字雨/雨轨 canvas |

## 重新生成 Sarasa 子集

应用加载的是 GB2312 子集（`assets/fonts/SarasaTermSC-Regular.subset.woff2`，约 990KB）。
字符集变化时用 fonttools 重新生成（字符集文件含 GB2312 全部汉字 + ASCII + CJK 标点 + 假名）：

```bash
.venv-fonts/Scripts/python.exe -m fontTools.subset ui-demo/font/SarasaTermSC-Regular.ttf \
  --text-file=<字符集.txt> --flavor=woff2 \
  --output-file=src/renderer/src/assets/fonts/SarasaTermSC-Regular.subset.woff2 \
  --no-hinting --desubroutinize
```

子集化属于 OFL 允许的修改；Sarasa 未声明 Reserved Font Name，`@font-face` 沿用原名合法。

## Matrix-Code.ttf 注意

cmap 仅覆盖：全角片假名 34 字（アウエオカキケコサシスセソタツテナニヌネハヒホマミムメモヤヨラリワー）+ 数字 `012345789`（**无 6**）+ `*+<>:|`。canvas 字符集必须落在映射内，否则回退系统字体穿帮。
