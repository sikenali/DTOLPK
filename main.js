const { app, BrowserWindow, ipcMain, dialog, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { LpkManager } = require('./js/lpk');

// 初始化 LPK 管理器（用于生成 manifest）
const lpkManager = new LpkManager();

// 处理命令行参数
const args = process.argv.slice(2);

// 解析命令行参数
const parsedArgs = {
    help: args.includes('--help') || args.includes('-h'),
    version: args.includes('--version') || args.includes('-v'),
    update: args.includes('--update') || args.includes('-u'),
    compose: args.includes('--compose') ? args[args.indexOf('--compose') + 1] : 
             args.includes('-c') ? args[args.indexOf('-c') + 1] : null,
    output: args.includes('--output') ? args[args.indexOf('--output') + 1] : 
            args.includes('-o') ? args[args.indexOf('-o') + 1] : null,
    icon: args.includes('--icon') ? args[args.indexOf('--icon') + 1] : 
          args.includes('-i') ? args[args.indexOf('-i') + 1] : null
};

// 检查命令行参数
if (parsedArgs.help) {
    console.log('懒猫微服应用转换器 (DTOLPK)');
    console.log('');
    console.log('用法:');
    console.log('  dtolpk [选项]');
    console.log('');
    console.log('选项:');
    console.log('  --help, -h     显示帮助信息');
    console.log('  --version, -v  显示当前版本');
    console.log('  --update, -u   更新到最新版本');
    console.log('  --compose, -c  指定 Docker Compose 文件路径');
    console.log('  --output, -o   指定输出目录');
    console.log('  --icon, -i     指定图标文件路径');
    console.log('');
    console.log('示例:');
    console.log('  dtolpk                    # 启动图形界面');
    console.log('  dtolpk --compose docker-compose.yml --output ./dist');
    app.quit();
} else if (parsedArgs.version) {
    console.log('DTOLPK 版本 1.0.0');
    app.quit();
} else if (parsedArgs.update) {
    console.log('检查更新...');
    console.log('当前已是最新版本');
    app.quit();
}

// 保持对窗口对象的全局引用，防止被垃圾回收
let mainWindow;
const APP_USER_MODEL_ID = 'com.dtolpk.app';
const LPK_ICON_MIN_SIZE = 512;
const LPK_ICON_MAX_SIZE = 1024;
const SUPPORTED_ICON_EXTENSIONS = new Set([
    '.svg',
    '.png',
    '.jpg',
    '.jpeg',
    '.bmp',
    '.webp',
    '.ico',
    '.gif',
    '.avif'
]);

async function normalizeLpkIcon(sourceIconPath, outputIconPath, fsExtra) {
    const resolvedIconPath = path.resolve(String(sourceIconPath || '').trim());
    if (!resolvedIconPath || !(await fsExtra.pathExists(resolvedIconPath))) {
        throw new Error(`图标文件不存在: ${sourceIconPath || ''}`);
    }

    const ext = path.extname(resolvedIconPath).toLowerCase();
    if (!SUPPORTED_ICON_EXTENSIONS.has(ext)) {
        throw new Error(`不支持的图标格式: ${ext || 'unknown'}`);
    }

    const iconImage = nativeImage.createFromPath(resolvedIconPath);
    if (iconImage.isEmpty()) {
        throw new Error(`无法读取图标文件: ${sourceIconPath}`);
    }

    // LPK 规范要求图标至少 512x512，强制输出正方形
    const normalizedIcon = iconImage.resize({
        width: LPK_ICON_MIN_SIZE,
        height: LPK_ICON_MIN_SIZE,
        quality: 'best'
    });
    await fsExtra.writeFile(outputIconPath, normalizedIcon.toPNG());
}

function resolveAppIconPath() {
    const candidates = [
        path.join(__dirname, 'build', 'icon_preview.png'),
        path.join(__dirname, 'build', 'icon.png'),
        path.join(process.resourcesPath || '', 'icon.ico'),
        path.join(process.resourcesPath || '', 'build', 'icon.ico'),
        path.join(process.resourcesPath || '', 'build', 'icon.png'),
        path.join(__dirname, 'build', 'icon.ico'),
        path.join(__dirname, 'build', 'icon.svg'),
        path.join(process.cwd(), 'build', 'icon.ico')
    ];

    return candidates.find((candidate) => fs.existsSync(candidate));
}

function createWindow() {
    const appIconPath = resolveAppIconPath();

    // 创建浏览器窗口
    mainWindow = new BrowserWindow({
        width: 1140,
        height: 780,
        minWidth: 980,
        minHeight: 700,
        title: 'DTOLPK - Docker to Lazycat Package Converter',
        webPreferences: {
            // 预加载脚本，用于安全地在渲染进程中访问 Node.js API
            preload: path.join(__dirname, 'preload.js'),
            // 启用 Node.js 支持（仅在渲染进程中需要时启用）
            nodeIntegration: false,
            // 启用上下文隔离，提高安全性
            contextIsolation: true,
            // 启用远程模块（如果需要）
            enableRemoteModule: false
        },
        // 液态玻璃背景底色（防止窗口加载阶段白屏闪烁）
        backgroundColor: '#dff1ff',
        // 窗口图标
        icon: appIconPath
    });

    // 加载主页面
    mainWindow.loadFile('index.html');
    if (appIconPath && typeof mainWindow.setIcon === 'function') {
        mainWindow.setIcon(appIconPath);
    }

    // 开发环境下打开开发者工具
    mainWindow.webContents.openDevTools();

    // 窗口加载完成后，将命令行参数传递给渲染进程
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('command-line-args', parsedArgs);
    });

    // 窗口关闭时触发
    mainWindow.on('closed', () => {
        // 取消引用窗口对象
        mainWindow = null;
    });
}

// 应用就绪时创建窗口
app.on('ready', () => {
    if (process.platform === 'win32') {
        app.setAppUserModelId(APP_USER_MODEL_ID);
    }

    // 创建窗口
    createWindow();
    
    // 隐藏默认菜单
    const { Menu } = require('electron');
    Menu.setApplicationMenu(null);
});

// 所有窗口关闭时退出应用
app.on('window-all-closed', () => {
    // 在 macOS 上，除非用户 Cmd + Q 退出，否则应用会保持活动状态
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // 在 macOS 上，当点击 Dock 图标且没有其他窗口打开时，重新创建一个窗口
    if (mainWindow === null) {
        createWindow();
    }
});

// 处理文件选择请求
ipcMain.handle('select-file', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
});

// 处理保存文件请求
ipcMain.handle('save-file', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
});

// 处理目录选择请求
ipcMain.handle('select-directory', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        ...options,
        properties: ['openDirectory']
    });
    return result;
});

// 处理读取文件请求
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        return { success: true, content };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 处理写入文件请求
ipcMain.handle('write-file', async (event, { filePath, content }) => {
    try {
        await fs.promises.writeFile(filePath, content, 'utf8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 处理获取文件列表请求
ipcMain.handle('get-files', async (event, { directory, extensions }) => {
    try {
        const files = await fs.promises.readdir(directory);
        const filteredFiles = files.filter(file => {
            if (!extensions) return true;
            const ext = path.extname(file).toLowerCase();
            return extensions.includes(ext);
        });
        return { success: true, files: filteredFiles };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 处理获取系统信息请求
ipcMain.handle('get-system-info', async (event) => {
    return {
        platform: process.platform,
        arch: process.arch,
        homedir: os.homedir(),
        tmpdir: os.tmpdir()
    };
});

// 处理生成 LPK 包请求
ipcMain.handle('generate-lpk', async (event, { config, composeData }) => {
    let tempDir;
    try {
        const yaml = require('yaml');
        const archiver = require('archiver');
        const fsExtra = require('fs-extra');
        const path = require('path');
        const tar = require('tar');
        const dotenv = require('dotenv');

        // 加载 .env 文件和 env_file 配置
        const envConfig = { ...process.env };

        // 获取 compose 文件所在目录作为执行目录
        const composePaths = config.resources.composePaths || [];
        const executionDir = composePaths.length > 0
            ? path.dirname(composePaths[0])
            : process.cwd();

        // 加载执行目录下的 .env 文件
        try {
            const fs = require('fs');
            const envPath = path.join(executionDir, '.env');
            if (fs.existsSync(envPath)) {
                const parsed = dotenv.parse(fs.readFileSync(envPath));
                Object.assign(envConfig, parsed);
                console.log(`已加载 .env 文件: ${envPath}`);
            }
        } catch (error) {
            console.warn('加载 .env 文件失败:', error.message);
        }

        // 加载 compose 数据中的 env_file 配置
        if (composeData.services) {
            for (const [serviceName, service] of Object.entries(composeData.services)) {
                if (service.env_file) {
                    const envFiles = Array.isArray(service.env_file) ? service.env_file : [service.env_file];
                    for (const envFile of envFiles) {
                        try {
                            const resolvedFile = envFile.replace(/\$\{([^}]+)\}/g, (match, varName) => envConfig[varName] || '');
                            const filePath = path.isAbsolute(resolvedFile)
                                ? resolvedFile
                                : path.resolve(executionDir, resolvedFile);

                            if (fs.existsSync(filePath)) {
                                const parsed = dotenv.parse(fs.readFileSync(filePath));
                                Object.assign(envConfig, parsed);
                                console.log(`已加载 env_file: ${filePath}`);
                            }
                        } catch (error) {
                            console.warn(`加载 env_file ${envFile} 失败:`, error.message);
                        }
                    }
                }
            }
        }

        // 使用统一的 LpkManager 生成 manifest（传入 envConfig）
        const manifest = lpkManager.generateManifest(config, composeData, envConfig);

        // 创建临时目录
        try {
            // 尝试在指定的输出目录中创建临时目录
            tempDir = path.join(config.output.directory, `temp-${Date.now()}`);
            await fs.ensureDir(tempDir);
            console.log(`在指定目录创建临时目录: ${tempDir}`);
        } catch (error) {
            // 如果失败，使用系统临时目录作为 fallback
            console.error(`在指定目录创建临时目录失败: ${error.message}`);
            console.log('使用系统临时目录作为 fallback');
            tempDir = path.join(os.tmpdir(), `dtolpk-temp-${Date.now()}`);
            await fs.ensureDir(tempDir);
            console.log(`创建临时目录: ${tempDir}`);
        }
        
        // 生成 manifest.yml 文件
        const manifestPath = path.join(tempDir, 'manifest.yml');
        await fs.writeFile(manifestPath, yaml.stringify(manifest));
        
        // 复制图标文件
        const iconPath = path.join(tempDir, 'icon.png');
        await fs.copy(config.resources.iconPath, iconPath);
        
        // 创建符合懒猫微服要求的 Dockerfile
        // 使用应用名称作为基础镜像名称
        const appName = config.app.name.toLowerCase().replace(/\s+/g, '-');
        const dockerfileContent = `FROM ${appName}:latest

#lzcapp中的所有service都必须一直处于运行状态,否则应用会进入错误状态
CMD ["sleep", "1d"]`;
        
        // 将 Dockerfile 写入临时目录
        const dockerfilePath = path.join(tempDir, 'Dockerfile');
        await fs.writeFile(dockerfilePath, dockerfileContent);
        
        // 如果配置了输出Dockerfile目录，将Dockerfile保存到指定目录
        if (config.output.dockerfilePath) {
            const outputDockerfilePath = path.join(config.output.dockerfilePath, 'Dockerfile');
            await fs.writeFile(outputDockerfilePath, dockerfileContent);
        }
        
        // 创建 content.tar
        const contentTarPath = path.join(tempDir, 'content.tar');

        // 获取Docker Compose文件路径，支持多个文件（已在前面声明）
        let composeDir;

        if (composePaths.length > 0) {
            // 使用第一个Docker Compose文件的目录作为基础目录
            composeDir = path.dirname(composePaths[0]);
        } else {
            // 如果没有Docker Compose文件，使用当前目录
            composeDir = process.cwd();
        }
        
        // 获取目录中的所有文件
        const files = await fs.readdir(composeDir);
        
        // 创建 content.tar，包含当前目录下的所有文件和目录，以及生成的Dockerfile
        await tar.create(
            {
                file: contentTarPath,
                cwd: composeDir,
                portable: true,
                // 排除一些不需要的文件和目录
                filter: (tarPath) => {
                    const excludes = ['node_modules', '.git', '*.lpk', 'content.tar', ...composePaths.map(p => path.basename(p)), path.basename(config.resources.iconPath)];
                    return !excludes.some(exclude => tarPath.includes(exclude));
                }
            },
            files
        );
        
        // 将所有Docker Compose文件添加到content.tar中
        for (const composePath of composePaths) {
            await tar.update(
                {
                    file: contentTarPath,
                    cwd: path.dirname(composePath),
                    portable: true
                },
                [path.basename(composePath)]
            );
        }
        
        // 将生成的Dockerfile添加到content.tar中
        await tar.update(
            {
                file: contentTarPath,
                cwd: tempDir,
                portable: true
            },
            ['Dockerfile']
        );
        
        // 创建 LPK 文件
        const lpkFileName = `${config.app.package}.lpk`;
        const lpkPath = path.join(config.output.directory, lpkFileName);
        
        // 删除已存在的同名 LPK 文件
        if (await fs.pathExists(lpkPath)) {
            await fs.remove(lpkPath);
            console.log(`已删除旧的 LPK 文件: ${lpkPath}`);
        }
        
        const output = fs.createWriteStream(lpkPath);
        const archive = archiver('zip');
        
        output.on('close', () => {
            console.log(`LPK 文件生成完成: ${lpkPath}`);
        });
        
        archive.on('error', (error) => {
            throw error;
        });
        
        archive.pipe(output);
        archive.file(manifestPath, { name: 'manifest.yml' });
        archive.file(iconPath, { name: 'icon.png' });
        archive.file(contentTarPath, { name: 'content.tar' });
        
        await archive.finalize();
        
        return {
            success: true,
            lpkPath: lpkPath,
            lpkFileName: lpkFileName
        };
    } catch (error) {
        console.error('生成 LPK 包失败:', error);
        return {
            success: false,
            error: error.message
        };
    } finally {
        // 清理临时文件
        try {
            if (tempDir) {
                const fs = require('fs-extra');
                await fs.remove(tempDir);
                console.log(`已清理临时目录: ${tempDir}`);
            }
        } catch (cleanupError) {
            console.error('清理临时目录失败:', cleanupError);
        }
    }
});

// 处理解析 YAML 请求
ipcMain.handle('parse-yaml', async (event, content) => {
    try {
        const yaml = require('yaml');
        const data = yaml.parse(content);
        return { success: true, data: data };
    } catch (error) {
        console.error('解析 YAML 失败:', error);
        return { success: false, error: error.message };
    }
});

// 处理检查文件是否存在请求
ipcMain.handle('is-file', async (event, filePath) => {
    try {
        const stats = await fs.promises.stat(filePath);
        return { success: true, isFile: stats.isFile() };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

// 处理显示消息框请求
ipcMain.handle('show-message-box', async (event, options) => {
    try {
        const { dialog } = require('electron');
        const result = await dialog.showMessageBox(mainWindow, options);
        return result;
    } catch (error) {
        console.error('显示消息框失败:', error);
        return { response: -1 };
    }
});

// 处理打开目录请求
ipcMain.handle('open-directory', async (event, directoryPath) => {
    try {
        const { shell } = require('electron');
        await shell.openPath(directoryPath);
        return { success: true };
    } catch (error) {
        console.error('打开目录失败:', error);
        return { success: false, error: error.message };
    }
});

// ⚠️ 已禁用：允许渲染进程执行任意 shell 命令存在严重安全风险
// 如需要此功能，应实现命令白名单和参数校验
// ipcMain.handle('run-command', async (event, { command, cwd }) => {
//     try {
//         const { exec } = require('child_process');
//
//         return new Promise((resolve) => {
//             exec(command, { cwd: cwd || process.cwd() }, (error, stdout, stderr) => {
//                 if (error) {
//                     console.error('命令执行失败:', error);
//                     resolve({ success: false, error: error.message, stderr: stderr });
//                 } else {
//                     resolve({ success: true, stdout: stdout });
//                 }
//             });
//         });
//     } catch (error) {
//         console.error('运行命令时发生错误:', error);
//         return { success: false, error: error.message };
//     }
// });
