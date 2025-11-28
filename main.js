const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

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

function createWindow() {
    // 创建浏览器窗口
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 1024,
        minHeight: 768,
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
        // 浅色主题
        backgroundColor: '#ffffff',
        // 窗口图标
        icon: path.join(__dirname, 'build', 'icon.ico')
    });

    // 加载主页面
    mainWindow.loadFile('index.html');

    // 开发环境下打开开发者工具
    // mainWindow.webContents.openDevTools();

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
    // 创建窗口
    createWindow();
    
    // 隐藏默认菜单
    const { Menu } = require('electron');
    Menu.setApplicationMenu(null);
    
    // 设置应用图标（影响任务栏）
    if (process.platform === 'win32') {
        // Windows平台
        app.setAppUserModelId('com.dtolpk.app');
        // 设置任务栏图标
        app.setAppUserModelId('com.dtolpk.app');
    }
    
    // 设置应用图标
    const iconPath = path.join(__dirname, 'build', 'icon.ico');
    if (process.platform === 'win32') {
        // Windows平台
        app.setAppUserModelId('com.dtolpk.app');
    } else if (process.platform === 'darwin') {
        // macOS平台
        // macOS平台不需要额外设置图标，会自动使用Info.plist中配置的图标
    } else {
        // Linux平台
        // Linux平台会自动使用窗口图标作为应用图标
    }
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
    try {
        const yaml = require('yaml');
        const archiver = require('archiver');
        const fs = require('fs-extra');
        const path = require('path');
        const tar = require('tar');
        
        // 生成 manifest.yml
        const manifest = {
            'lzc-sdk-version': '0.1',
            name: config.app.name,
            package: config.app.package,
            version: config.app.version,
            description: config.app.description,
            homepage: config.app.homepage,
            author: config.app.author,
            application: {
                subdomain: config.app.package.split('.').pop(),
                background_task: config.features.backgroundTask,
                multi_instance: config.features.multiInstance,
                gpu_accel: config.features.gpuAccel,
                kvm_accel: config.features.kvmAccel,
                usb_accel: config.features.usbAccel,
                // 禁用应用级别的健康检查，避免不必要的健康检查失败
                health_check: {
                    disable: true
                }
            },
            services: {}
        };
        
        // 添加不支持的平台
        if (config.app.unsupportedPlatforms && config.app.unsupportedPlatforms.length > 0) {
            manifest.unsupported_platforms = config.app.unsupportedPlatforms;
        }
        
        // 添加系统版本要求
        if (config.app.hasVersionRequirement) {
            manifest.min_os_version = config.app.minOsVersion;
        }
        
        // 添加公开路由
        if (config.features.publicPath && config.routes) {
            const publicPaths = config.routes
                .filter(route => route.type === 'http' || route.type === 'https')
                .map(route => route.path);
            
            if (publicPaths.length > 0) {
                manifest.application.public_path = publicPaths;
            }
        }
        
        // 添加文件关联
        if (config.features.fileHandler) {
            manifest.application.file_handler = {
                mime: ['text/plain', 'application/json'],
                actions: {
                    open: '/open?file=%u'
                }
            };
        }
        
        // 添加路由配置
        let httpRoutes = [];
        let ingressRoutes = [];
        
        if (config.routes && config.routes.length > 0) {
            httpRoutes = config.routes
                .filter(route => route.type === 'http' || route.type === 'https')
                .map(route => {
                    // 获取服务名称，确保跳过'app'服务（懒猫微服的保留名称）
                    let serviceName = route.service;
                    if (!serviceName) {
                        // 从composeData.services中获取第一个非'app'的服务名称
                        serviceName = Object.keys(composeData.services).find(name => name !== 'app') || Object.keys(composeData.services)[0];
                    }
                    // 对于HTTP/HTTPS路由，使用用户在界面上设置的实际端口
                    // 根据懒猫微服官方文档，路由目标格式应为 http://service.package.lzcapp:port
                    const targetPort = route.target || '80';
                    // 直接使用原始服务名称，不转换为小写，符合懒猫微服官方示例
                    const targetUrl = `http://${serviceName}.${config.app.package}.lzcapp:${targetPort}`;
                    return `${route.path}=${targetUrl}`;
                });
            
            ingressRoutes = config.routes
                .filter(route => route.type === 'port')
                .map(route => ({
                    protocol: route.protocol || 'tcp',
                    // 根据懒猫微服官方文档，端口号必须是整数
                    port: parseInt(route.target),
                    service: route.service || Object.keys(composeData.services)[0]
                }));
        }
        
        // 如果没有HTTP路由配置，添加默认的根路径路由
        if (httpRoutes.length === 0 && composeData.services && Object.keys(composeData.services).length > 0) {
            // 获取第一个非'app'的服务名称
            let serviceName = Object.keys(composeData.services).find(name => name !== 'app') || Object.keys(composeData.services)[0];
            // 根据懒猫微服官方文档，路由目标格式应为 http://service.package.lzcapp:port
            // 直接使用原始服务名称，不转换为小写，符合懒猫微服官方示例
            httpRoutes = [`/=http://${serviceName}.${config.app.package}.lzcapp:80`];
        }
        
        if (httpRoutes.length > 0) {
            manifest.application.routes = httpRoutes;
        }
        
        if (ingressRoutes.length > 0) {
            manifest.application.ingress = ingressRoutes;
        }
        
        // 确保 application 对象存在必要的字段
        if (!manifest.application.subdomain) {
            // 根据懒猫微服官方文档，subdomain 应为包名的最后一部分
            manifest.application.subdomain = config.app.package.split('.').pop();
        }
        
        // 添加服务配置
            if (composeData.services && typeof composeData.services === 'object') {
                for (const [serviceName, service] of Object.entries(composeData.services)) {
                    // 跳过名为'app'的服务，这是懒猫微服的保留名称
                    if (serviceName === 'app') {
                        continue;
                    }
                    
                    // 直接使用原始服务名称，不转换为小写，符合懒猫微服官方示例
                    let serviceConfig = {};
                    
                    // 根据镜像配置处理镜像
                    if (config.images.pushTarget === 'lazycat') {
                        // 懒猫微服官方仓库配置 - 直接使用用户输入的完整镜像地址
                        const imageName = config.images.boxName || service.image || `temp-${serviceName}-${Date.now()}`;
                        
                        serviceConfig = {
                            image: imageName,
                            // 确保服务能够真正启动并监听端口
                            // 只有当没有提供命令时，才添加默认命令
                            command: service.command,
                            // 确保服务在后台持续运行
                            restart: 'always'
                        };
                    } else {
                        // 其他镜像配置
                        serviceConfig = {
                            image: service.image || `temp-${serviceName}-${Date.now()}`,
                            // 确保服务能够真正启动并监听端口
                            command: service.command,
                            // 确保服务在后台持续运行
                            restart: 'always'
                        };
                    }
                    
                    // 确保服务配置中包含必要的字段
                    if (!serviceConfig.command && service.image) {
                        // 如果没有命令且有镜像，不添加默认的sleep命令，让服务使用镜像的默认命令
                        delete serviceConfig.command;
                    }
                    
                    // 添加环境变量
                    if (service.environment) {
                        if (Array.isArray(service.environment)) {
                            serviceConfig.environment = service.environment;
                        } else if (typeof service.environment === 'object') {
                            serviceConfig.environment = Object.entries(service.environment)
                                .map(([key, value]) => `${key}=${value}`);
                        }
                    }
                    
                    // 添加命令
                    if (service.command) {
                        if (Array.isArray(service.command)) {
                            serviceConfig.command = service.command.join(' ');
                        } else {
                            serviceConfig.command = service.command;
                        }
                    }
                    
                    // 添加入口点
                    if (service.entrypoint) {
                        if (Array.isArray(service.entrypoint)) {
                            serviceConfig.entrypoint = service.entrypoint.join(' ');
                        } else {
                            serviceConfig.entrypoint = service.entrypoint;
                        }
                    }
                    
                    // 添加依赖关系
                    if (service.depends_on) {
                        if (Array.isArray(service.depends_on)) {
                            serviceConfig.depends_on = service.depends_on;
                        } else if (typeof service.depends_on === 'object') {
                            serviceConfig.depends_on = Object.keys(service.depends_on);
                        }
                    }
                    
                    // 添加卷挂载 - 确保使用/lzcapp开头的路径
                    if (service.volumes && Array.isArray(service.volumes)) {
                        serviceConfig.binds = [];
                        
                        for (const volume of service.volumes) {
                            let bindMount;
                            if (typeof volume === 'string') {
                                // 处理字符串格式的卷挂载
                                const parts = volume.split(':');
                                if (parts.length >= 2) {
                                    // 确保源路径以/lzcapp开头
                                    let source = parts[0];
                                    const target = parts.slice(1).join(':');
                                    
                                    // 如果源路径不是以/lzcapp开头，使用默认路径
                                    if (source && !source.startsWith('/lzcapp')) {
                                        // 根据卷的用途选择合适的/lzcapp子目录
                                        if (source.includes('config')) {
                                            source = `/lzcapp/var/${serviceName}/config`;
                                        } else if (source.includes('log') || source.includes('logs')) {
                                            source = `/lzcapp/var/${serviceName}/logs`;
                                        } else if (source.includes('data')) {
                                            source = `/lzcapp/var/${serviceName}/data`;
                                        } else {
                                            source = `/lzcapp/var/${serviceName}/${path.basename(source)}`;
                                        }
                                    }
                                    
                                    bindMount = `${source}:${target}`;
                                } else {
                                    bindMount = volume;
                                }
                            } else if (typeof volume === 'object' && volume.source && volume.target) {
                                // 处理对象格式的卷挂载
                                let source = volume.source;
                                const target = volume.target;
                                
                                // 如果源路径不是以/lzcapp开头，使用默认路径
                                if (source && !source.startsWith('/lzcapp')) {
                                    // 根据卷的用途选择合适的/lzcapp子目录
                                    if (source.includes('config')) {
                                        source = `/lzcapp/var/${serviceName}/config`;
                                    } else if (source.includes('log') || source.includes('logs')) {
                                        source = `/lzcapp/var/${serviceName}/logs`;
                                    } else if (source.includes('data')) {
                                        source = `/lzcapp/var/${serviceName}/data`;
                                    } else {
                                        source = `/lzcapp/var/${serviceName}/${path.basename(source)}`;
                                    }
                                }
                                
                                bindMount = `${source}:${target}`;
                            }
                            
                            if (bindMount) {
                                serviceConfig.binds.push(bindMount);
                            }
                        }
                    }
                    
                    // 添加健康检查
                    if (service.healthcheck && typeof service.healthcheck === 'object') {
                        const healthCheck = {};
                        
                        if (service.healthcheck.test) {
                            healthCheck.test = service.healthcheck.test;
                        }
                        
                        // 设置合理的默认值，避免健康检查过早失败
                        healthCheck.start_period = service.healthcheck.start_period || '90s';
                        healthCheck.interval = service.healthcheck.interval || '30s';
                        healthCheck.timeout = service.healthcheck.timeout || '10s';
                        healthCheck.retries = service.healthcheck.retries || 5;
                        
                        serviceConfig.health_check = healthCheck;
                    } else {
                        // 如果没有健康检查配置，添加默认配置或禁用健康检查
                        // 禁用健康检查以避免不必要的健康检查失败
                        serviceConfig.health_check = {
                            disable: true
                        };
                    }
                    
                    manifest.services[serviceName] = serviceConfig;
                }
            }
        
        // 创建临时目录
        const tempDir = path.join(config.output.directory, `temp-${Date.now()}`);
        await fs.ensureDir(tempDir);
        
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
        
        // 获取Docker Compose文件路径，支持多个文件
        const composePaths = config.resources.composePaths || [];
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
        
        // 清理临时文件
        await fs.remove(tempDir);
        
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

// 处理运行命令请求
ipcMain.handle('run-command', async (event, { command, cwd }) => {
    try {
        const { exec } = require('child_process');
        
        return new Promise((resolve) => {
            exec(command, { cwd: cwd || process.cwd() }, (error, stdout, stderr) => {
                if (error) {
                    console.error('命令执行失败:', error);
                    resolve({ success: false, error: error.message, stderr: stderr });
                } else {
                    resolve({ success: true, stdout: stdout });
                }
            });
        });
    } catch (error) {
        console.error('运行命令时发生错误:', error);
        return { success: false, error: error.message };
    }
});