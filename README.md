# DTOLPK

一个Docker转LPK文件格式的图形化工具，支持自动解析 Docker Compose 文件，生成符合懒猫微服规范的 LPK 包。

## 功能介绍

- **图形化界面**：直观易用的界面，支持分步配置
- **Docker Compose 自动解析**：自动提取环境变量、卷挂载和端口信息
- **智能路由配置**：根据端口号自动判断路由类型（HTTP/HTTPS/端口）
- **镜像配置优化**：支持懒猫微服官方镜像仓库配置
- **实时预览**：支持图标预览和配置验证
- **数据持久化**：保存配置，重启后自动恢复
- **多平台支持**：支持 Windows、macOS、Linux 平台

## 安装与使用

### 安装

```
npm install -g docker2lzc
```

### 命令行使用

```
docker2lzc --help       # 显示帮助信息
docker2lzc --version    # 获取当前版本
docker2lzc --update     # 更新到最新版本
docker2lzc              # 启动图形化界面
docker2lzc --compose <file> --output <dir>  # 命令行模式转换
```

### 图形化界面使用

1. 启动应用程序
2. 按照步骤填写应用信息
3. 选择 Docker Compose 文件
4. 配置路由和镜像
5. 点击开始转换
6. 转换完成后选择是否打开生成目录

## 各平台编译生成

### 环境要求

- Node.js >= 14.x
- npm >= 6.x
- Git

### Windows 平台

```bash
# 克隆仓库
git clone https://github.com/sikenali/DTOLPK.git
cd DTOLPK

# 安装依赖
npm install

# 编译生成 Windows 可执行文件
npm run build:win
```

生成的文件将位于 `dist` 目录下，包含 `.exe` 安装包和便携版。

### macOS 平台

```bash
# 克隆仓库
git clone https://github.com/sikenali/DTOLPK.git
cd DTOLPK

# 安装依赖
npm install

# 编译生成 macOS 应用
npm run build:mac
```

生成的文件将位于 `dist` 目录下，包含 `.dmg` 安装包。

### Linux 平台

```bash
# 克隆仓库
git clone https://github.com/sikenali/DTOLPK.git
cd DTOLPK

# 安装依赖
npm install

# 编译生成 Linux 包
npm run build:linux
```

生成的文件将位于 `dist` 目录下，包含 `.deb`、`.rpm` 和 `.AppImage` 等格式。

### 构建脚本说明

项目中包含以下构建脚本：

- `npm run build:win` - 构建 Windows 平台应用
- `npm run build:mac` - 构建 macOS 平台应用
- `npm run build:linux` - 构建 Linux 平台应用
- `npm run build:all` - 构建所有平台应用

## 项目结构

```
DTOLPK/
├── main.js              # 主进程代码
├── preload.js           # 预加载脚本
├── index.html           # 主页面
├── js/
│   ├── config.js        # 配置管理
│   └── steps.js         # 步骤管理
├── package.json         # 项目配置
└── README.md            # 项目说明
```

## 技术栈

- Electron - 跨平台桌面应用框架
- Node.js - JavaScript 运行时
- HTML/CSS/JavaScript - 前端技术
- YAML - 配置文件格式

## 致谢

感谢 [fzlrkj](https://gitee.com/fzlrkj/docker2lzc) 为本项目免费提供的命令行开发工具。

## 免责声明

- 这个程序是一个免费且开源的AI工具实现的项目。它旨在通过界面操作使其打包步骤图形化，方便更多人为懒猫微服社区作出贡献。
- 在使用时，由于基于AI工具开发，可能存在软件自身不稳定的情况，以及生成LPK安装后可能导致不确定的因素，如需保证LPK质量，请遵守懒猫微服官方LPK格式文件规范，并通过 [官方开发者手册](https://developer.lazycat.cloud/publish-app.html) 申请账号进行上架发布。
- 该程序仅进行客户端上进行转换数据操作，数据来源开源的项目，不会拦截、存储或篡改任何用户数据。
 在使用该程序之前，您应该了解并承担相应的风险，包括但不限于版权纠纷、法律限制等，这与该程序无关。
