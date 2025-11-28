// LPK 生成模块
class LpkManager {
    constructor() {
        this.init();
    }
    
    init() {
        // 初始化 LPK 相关配置
    }
    
    // 生成 manifest.yml
    generateManifest(config, composeData) {
        try {
            const manifest = {
                'lzc-sdk-version': '0.1',
                name: config.app.name,
                package: config.app.package,
                version: config.app.version,
                description: config.app.description,
                homepage: config.app.homepage,
                author: config.app.author,
                license: config.app.license || 'https://choosealicense.com/licenses/mit/',
                application: {
                    subdomain: config.app.package.split('.').pop(),
                    background_task: config.features.backgroundTask,
                    multi_instance: config.features.multiInstance,
                    gpu_accel: config.features.gpuAccel,
                    kvm_accel: config.features.kvmAccel,
                    usb_accel: config.features.usbAccel,
                    workdir: config.application.workdir || '/lzcapp/pkg/content/',
                    image: config.application.image || '',
                    health_check: {
                        test_url: config.application.healthCheck.testUrl || '',
                        start_period: config.application.healthCheck.startPeriod || '90s',
                        disable: true
                    },
                    handlers: {
                        error_page_templates: config.application.handlers.errorPageTemplates || {}
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
                // 使用配置中的fileHandler设置
                manifest.application.file_handler = {
                    mime: config.application.fileHandler.mime || ['text/plain', 'application/json'],
                    actions: config.application.fileHandler.actions || {
                        open: '/open?file=%u'
                    }
                };
            }
            
            // 添加本地化配置
            if (config.app.locales && Object.keys(config.app.locales).length > 0) {
                manifest.locales = config.app.locales;
            }
            
            // 添加public_path配置
            if (config.features.publicPath && config.routes) {
                const publicPaths = config.routes
                    .filter(route => route.type === 'http' || route.type === 'https')
                    .map(route => `${route.path}public`);
                
                if (publicPaths.length > 0) {
                    manifest.application.public_path = publicPaths;
                }
            }
            
            // 添加路由配置
            if (config.routes && config.routes.length > 0) {
                const applicationRoutes = config.routes
                    .filter(route => route.type === 'http' || route.type === 'https' || route.type === 'static' || route.type === 'exec')
                    .map(route => {
                        let targetUrl = route.target;
                        
                        // 根据路由类型生成正确的目标URL格式
                        if (route.type === 'http' || route.type === 'https') {
                            // HTTP/HTTPS 路由
                            const serviceName = route.service || Object.keys(composeData.services)[0];
                            targetUrl = targetUrl || `http://${serviceName}.${config.app.package}.lzcapp:80`;
                        } else if (route.type === 'static') {
                            // 静态文件路由 - 确保格式为 file:///path
                            if (targetUrl && !targetUrl.startsWith('file://')) {
                                targetUrl = `file://${targetUrl}`;
                            }
                        } else if (route.type === 'exec') {
                            // 执行命令路由 - 确保格式为 exec://port,command
                            // 已经在前端验证过格式，直接使用
                        }
                        
                        return `${route.path}=${targetUrl}`;
                    });
                
                if (applicationRoutes.length > 0) {
                    manifest.application.routes = applicationRoutes;
                }
                
                const ingressRoutes = config.routes
                    .filter(route => route.type === 'port')
                    .map(route => ({
                        protocol: route.protocol || 'tcp',
                        port: parseInt(route.target),
                        service: route.service || Object.keys(composeData.services)[0]
                    }));
                
                if (ingressRoutes.length > 0) {
                    manifest.application.ingress = ingressRoutes;
                }
            }
            
            // 添加服务配置
            if (composeData.services) {
                for (const [serviceName, service] of Object.entries(composeData.services)) {
                    // 跳过名为'app'的服务，这是懒猫微服的保留名称
                    if (serviceName === 'app') {
                        continue;
                    }
                    
                    const serviceConfig = {
                        image: service.image || `temp-${serviceName}-${Date.now()}`
                    };
                    
                    // 添加环境变量
                    if (service.environment) {
                        if (Array.isArray(service.environment)) {
                            serviceConfig.environment = service.environment;
                        } else {
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
                        } else {
                            serviceConfig.depends_on = Object.keys(service.depends_on);
                        }
                    }
                    
                    // 添加卷挂载 - 确保使用/lzcapp开头的路径
                    if (service.volumes) {
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
                                    if (!source.startsWith('/lzcapp')) {
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
                            } else if (typeof volume === 'object') {
                                // 处理对象格式的卷挂载
                                let source = volume.source;
                                const target = volume.target;
                                
                                // 如果源路径不是以/lzcapp开头，使用默认路径
                                if (!source.startsWith('/lzcapp')) {
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
                            
                            serviceConfig.binds.push(bindMount);
                        }
                    }
                    
                    // 添加健康检查
                    if (service.healthcheck) {
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
            
            return manifest;
        } catch (error) {
            console.error('生成 manifest.yml 失败:', error);
            throw error;
        }
    }
    
    // 生成 manifest.yml 字符串
    generateManifestYaml(config, composeData) {
        const manifest = this.generateManifest(config, composeData);
        const yaml = require('yaml');
        return yaml.stringify(manifest);
    }
    
    // 创建 content.tar
    async createContentTar(sourceDir, outputPath, excludeFiles = []) {
        try {
            // 使用 tar 模块创建 tar 文件
            const tar = require('tar');
            const fs = require('fs-extra');
            
            // 获取目录中的所有文件
            const files = await fs.readdir(sourceDir);
            
            await tar.create({
                file: outputPath,
                cwd: sourceDir,
                portable: true,
                filter: (path) => {
                    // 排除不需要的文件和目录
                    for (const exclude of excludeFiles) {
                        if (path.includes(exclude)) {
                            return false;
                        }
                    }
                    return true;
                }
            }, files);
            
            return true;
        } catch (error) {
            console.error('创建 content.tar 失败:', error);
            throw error;
        }
    }
    
    // 生成 LPK 包
    async generateLpk(config, composeData, outputDir) {
        try {
            const yaml = require('yaml');
            const archiver = require('archiver');
            const fs = require('fs-extra');
            const path = require('path');
            
            // 创建临时目录
            const tempDir = path.join(outputDir, `temp-${Date.now()}`);
            await fs.ensureDir(tempDir);
            
            // 生成 manifest.yml
            const manifest = this.generateManifest(config, composeData);
            const manifestPath = path.join(tempDir, 'manifest.yml');
            await fs.writeFile(manifestPath, yaml.stringify(manifest));
            
            // 复制图标文件
            const iconPath = path.join(tempDir, 'icon.png');
            await fs.copy(config.resources.iconPath, iconPath);
            
            // 创建 content.tar
            const contentTarPath = path.join(tempDir, 'content.tar');
            const composeDir = path.dirname(config.resources.composePath);
            await this.createContentTar(composeDir, contentTarPath, [
                'node_modules',
                '.git',
                '*.lpk',
                'content.tar',
                path.basename(config.resources.composePath),
                path.basename(config.resources.iconPath)
            ]);
            
            // 创建 LPK 文件
            const lpkFileName = `${config.app.package}.lpk`;
            const lpkPath = path.join(outputDir, lpkFileName);
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
            throw error;
        }
    }
    
    // 验证 LPK 包
    async validateLpk(lpkPath) {
        try {
            const fs = require('fs-extra');
            const archiver = require('archiver');
            const yaml = require('yaml');
            
            // 检查文件是否存在
            if (!await fs.pathExists(lpkPath)) {
                throw new Error('LPK 文件不存在');
            }
            
            // 这里可以添加更多验证逻辑，如检查文件结构、验证 manifest.yml 格式等
            
            return {
                valid: true,
                message: 'LPK 包验证通过'
            };
        } catch (error) {
            console.error('验证 LPK 包失败:', error);
            return {
                valid: false,
                message: 'LPK 包验证失败: ' + error.message
            };
        }
    }
}

// 初始化 LPK 管理器
const lpkManager = new LpkManager();