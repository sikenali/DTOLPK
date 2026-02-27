// 配置管理模块
class ConfigManager {
    constructor() {
        this.config = this.loadConfig();
    }
    
    // 加载配置
    loadConfig() {
        try {
            // 检查是否是首次启动
            const isFirstLaunch = localStorage.getItem('dtolpk-first-launch') === null;
            
            // 如果是首次启动，使用默认配置并标记为已启动
            if (isFirstLaunch) {
                localStorage.setItem('dtolpk-first-launch', 'false');
                return this.getDefaultConfig();
            }
            
            // 从 localStorage 加载配置
            const savedConfig = localStorage.getItem('dtolpk-config');
            if (savedConfig) {
                const config = JSON.parse(savedConfig);
                // 确保版本号不为'0.0.1'
                if (config.app.version === '0.0.1') {
                    config.app.version = '';
                }
                return config;
            }
        } catch (error) {
            console.error('加载配置失败:', error);
        }
        
        // 默认配置
        return this.getDefaultConfig();
    }
    
    // 获取默认配置
    getDefaultConfig() {
        return {
            app: {
                name: '',
                package: '',
                version: '',
                description: '',
                homepage: '',
                author: '',
                license: '',
                unsupportedPlatforms: [],
                hasVersionRequirement: false,
                minOsVersion: '>= 1.0.18',
                locales: {
                    zh: {
                        name: '',
                        description: ''
                    },
                    en: {
                        name: '',
                        description: ''
                    }
                }
            },
            features: {
                backgroundTask: false,
                multiInstance: false,
                publicPath: false,
                gpuAccel: false,
                kvmAccel: false,
                usbAccel: false,
                fileHandler: false
            },
            application: {
                workdir: '/lzcapp/pkg/content/',
                image: '',
                healthCheck: {
                    testUrl: '',
                    startPeriod: '90s',
                    disable: false
                },
                handlers: {
                    errorPageTemplates: {
                        '502': '',
                        '404': ''
                    }
                },
                fileHandler: {
                    mime: [],
                    actions: {
                        open: '',
                        new: '',
                        download: ''
                    }
                }
            },
            resources: {
                iconPath: '',
                composePath: ''
            },
            routes: [],
            images: {
                pushTarget: 'none',
                registryUrl: '',
                boxName: ''
            },
            build: {
                context: '.',
                dockerfile: ''
            },
            advanced: {
                envVariables: [],
                volumes: []
            },
            output: {
                directory: '',
                dockerfilePath: ''
            }
        };
    }
    
    // 保存配置
    saveConfig() {
        try {
            localStorage.setItem('dtolpk-config', JSON.stringify(this.config));
            return true;
        } catch (error) {
            console.error('保存配置失败:', error);
            return false;
        }
    }
    
    // 从表单中获取配置
    getConfigFromForm() {
        // 安全获取DOM元素值的辅助函数
        const getElementValue = (id, defaultValue = '') => {
            const element = document.getElementById(id);
            return element ? element.value : defaultValue;
        };
        
        // 安全获取DOM元素checked状态的辅助函数
        const getElementChecked = (id, defaultValue = false) => {
            const element = document.getElementById(id);
            return element ? element.checked : defaultValue;
        };
        
        const config = {
            app: {
                name: getElementValue('app-name'),
                package: getElementValue('app-package'),
                version: getElementValue('app-version'),
                description: getElementValue('app-description'),
                homepage: getElementValue('app-homepage'),
                author: getElementValue('app-author'),
                unsupportedPlatforms: this.getUnsupportedPlatforms(),
                hasVersionRequirement: getElementChecked('has-version-requirement'),
                minOsVersion: getElementValue('min-os-version', '>= 1.0.18')
            },
            features: {
                backgroundTask: getElementChecked('feature-background-task'),
                multiInstance: getElementChecked('feature-multi-instance'),
                publicPath: getElementChecked('feature-public-path'),
                gpuAccel: getElementChecked('feature-gpu-accel'),
                kvmAccel: getElementChecked('feature-kvm-accel'),
                usbAccel: getElementChecked('feature-usb-accel'),
                fileHandler: getElementChecked('feature-file-handler')
            },
            resources: {
                iconPath: getElementValue('icon-path'),
                composePaths: JSON.parse(localStorage.getItem('composePaths') || '[]') // 从localStorage获取多个Docker Compose文件路径
            },
            routes: this.getRoutes(),
            images: {
                pushTarget: getElementValue('push-target', 'none'),
                registryUrl: getElementValue('registry-url'),
                boxName: getElementValue('box-name', 'default')
            },
            build: {
                context: getElementValue('build-context', '.'),
                dockerfile: getElementValue('dockerfile-path')
            },
            advanced: {
                envVariables: this.getEnvVariables(),
                volumes: this.getVolumes()
            },
            output: {
                directory: getElementValue('output-directory'),
                dockerfilePath: getElementValue('dockerfile-output-path', '')
            }
        };
        
        this.config = config;
        this.saveConfig();
        return config;
    }
    
    // 将配置填充到表单
    fillFormFromConfig() {
        // 填充基本信息
        const appName = document.getElementById('app-name');
        if (appName) appName.value = this.config.app.name || '';
        
        const appPackage = document.getElementById('app-package');
        if (appPackage) appPackage.value = this.config.app.package || '';
        
        const appVersion = document.getElementById('app-version');
        if (appVersion) appVersion.value = this.config.app.version || '';
        
        const appDescription = document.getElementById('app-description');
        if (appDescription) appDescription.value = this.config.app.description || '';
        
        // 填充资源选择
        const iconPath = document.getElementById('icon-path');
        if (iconPath) {
            iconPath.value = this.config.resources.iconPath || '';
            if (iconPath.value && window.stepManager && typeof window.stepManager.setIconPreview === 'function') {
                window.stepManager.setIconPreview(iconPath.value);
            }
        }
        
        // 填充构建配置
        const dockerfilePath = document.getElementById('dockerfile-path');
        if (dockerfilePath) dockerfilePath.value = this.config.build.dockerfile || '';
        
        // 填充输出LPK目录
        const outputDirectory = document.getElementById('output-directory');
        if (outputDirectory) outputDirectory.value = this.config.output.directory || '';
        
        // 填充路由配置
        const routesContainer = document.getElementById('routes-container');
        if (routesContainer) {
            this.fillRoutes(this.config.routes || []);
        }
        
        // 填充环境变量
        const envVariablesContainer = document.getElementById('env-variables-container');
        if (envVariablesContainer) {
            this.fillEnvVariables(this.config.advanced.envVariables || []);
        }
        
        // 填充卷挂载
        const volumesContainer = document.getElementById('volumes-container');
        if (volumesContainer) {
            this.fillVolumes(this.config.advanced.volumes || []);
        }
    }
    
    // 获取不支持的平台
    getUnsupportedPlatforms() {
        const platforms = [];
        if (document.getElementById('platform-ios').checked) platforms.push('ios');
        if (document.getElementById('platform-android').checked) platforms.push('android');
        if (document.getElementById('platform-linux').checked) platforms.push('linux');
        if (document.getElementById('platform-windows').checked) platforms.push('windows');
        if (document.getElementById('platform-macos').checked) platforms.push('macos');
        if (document.getElementById('platform-tvos').checked) platforms.push('tvos');
        return platforms;
    }
    
    // 填充不支持的平台
    fillUnsupportedPlatforms(platforms) {
        document.getElementById('platform-ios').checked = platforms.includes('ios');
        document.getElementById('platform-android').checked = platforms.includes('android');
        document.getElementById('platform-linux').checked = platforms.includes('linux');
        document.getElementById('platform-windows').checked = platforms.includes('windows');
        document.getElementById('platform-macos').checked = platforms.includes('macos');
        document.getElementById('platform-tvos').checked = platforms.includes('tvos');
    }
    
    // 获取路由配置
    getRoutes() {
        const routes = [];
        const routeItems = document.querySelectorAll('.route-item');
        const isValidPort = (value) => {
            const port = parseInt(String(value || '').trim(), 10);
            return Number.isInteger(port) && port >= 1 && port <= 65535;
        };
        
        routeItems.forEach(item => {
            const routeType = item.querySelector('.route-type').value;
            const inputs = item.querySelectorAll('.input-field');
            // 使用正确的索引：路径是第三个input-field（索引2），目标是第四个input-field（索引3）
            let path = inputs[2]?.value || '';
            let target = inputs[3]?.value || '';
            let protocol = 'tcp';
            
            if (routeType === 'port') {
                const protocolSelect = item.querySelector('.port-config select');
                protocol = protocolSelect?.value || 'tcp';
                let portValue = String(path || '').trim();
                let targetValue = String(target || '').trim();
                if (!isValidPort(portValue) && isValidPort(targetValue)) {
                    const tmp = portValue;
                    portValue = targetValue;
                    targetValue = tmp;
                }
                path = targetValue || '/';
                target = portValue;
            }
            
            routes.push({
                type: routeType,
                path: path,
                target: target,
                protocol: protocol
            });
        });
        
        return routes;
    }
    
    // 填充路由配置
    fillRoutes(routes) {
        const container = document.getElementById('routes-container');
        container.innerHTML = '';

        if (!Array.isArray(routes) || routes.length === 0) {
            if (window.stepManager && typeof window.stepManager.addRoute === 'function') {
                window.stepManager.addRoute();
            }
            return;
        }
        
        routes.forEach(route => {
            // 使用 stepManager.addRoute() 方法添加路由
            stepManager.addRoute();
            const routeItem = container.lastElementChild;
            
            // 填充路由数据
            routeItem.querySelector('.route-type').value = route.type;
            
            // 使用正确的索引：路径是第三个input-field（索引2），目标是第四个input-field（索引3）
            const inputs = routeItem.querySelectorAll('.input-field');
            if (route.type === 'port') {
                if (inputs[2]) inputs[2].value = route.target || '';
                if (inputs[3]) inputs[3].value = route.path || '/';
            } else {
                if (inputs[2]) inputs[2].value = route.path;
                if (inputs[3]) inputs[3].value = route.target;
            }
            
            if (route.type === 'port') {
                const protocolSelect = routeItem.querySelector('.port-config select');
                if (protocolSelect) {
                    protocolSelect.value = route.protocol || 'tcp';
                }
            }
            
            // 更新路由配置显示
            const routeTypeSelect = routeItem.querySelector('.route-type');
            stepManager.toggleRouteConfig(routeTypeSelect, routeItem);
        });
    }
    
    // 获取环境变量
    getEnvVariables() {
        const envVariables = [];
        const envItems = document.querySelectorAll('.env-item');
        
        envItems.forEach(item => {
            const key = item.querySelectorAll('.input-field')[0].value;
            const value = item.querySelectorAll('.input-field')[1].value;
            
            if (key) {
                envVariables.push({ key, value });
            }
        });
        
        return envVariables;
    }
    
    // 填充环境变量
    fillEnvVariables(envVariables) {
        const container = document.getElementById('env-variables-container');
        container.innerHTML = '';

        if (!Array.isArray(envVariables) || envVariables.length === 0) {
            if (window.stepManager && typeof window.stepManager.addEnvVariable === 'function') {
                window.stepManager.addEnvVariable();
            }
            return;
        }
        
        envVariables.forEach(env => {
            // 使用 stepManager.addEnvVariable() 方法添加环境变量
            stepManager.addEnvVariable();
            const envItem = container.lastElementChild;
            
            // 填充环境变量数据
            envItem.querySelectorAll('.input-field')[0].value = env.key;
            envItem.querySelectorAll('.input-field')[1].value = env.value;
        });
    }
    
    // 获取卷挂载
    getVolumes() {
        const volumes = [];
        const volumeItems = document.querySelectorAll('.volume-item');
        
        volumeItems.forEach(item => {
            const source = item.querySelectorAll('.input-field')[0].value;
            const target = item.querySelectorAll('.input-field')[1].value;
            
            if (source && target) {
                volumes.push({ source, target });
            }
        });
        
        return volumes;
    }
    
    // 填充卷挂载
    fillVolumes(volumes) {
        const container = document.getElementById('volumes-container');
        container.innerHTML = '';

        if (!Array.isArray(volumes) || volumes.length === 0) {
            if (window.stepManager && typeof window.stepManager.addVolume === 'function') {
                window.stepManager.addVolume();
            }
            return;
        }
        
        volumes.forEach(volume => {
            // 使用 stepManager.addVolume() 方法添加卷挂载
            stepManager.addVolume();
            const volumeItem = container.lastElementChild;
            
            // 填充卷挂载数据
            volumeItem.querySelectorAll('.input-field')[0].value = volume.source;
            volumeItem.querySelectorAll('.input-field')[1].value = volume.target;
        });
    }
    
    // 重置配置
    resetConfig() {
        // 重置为默认配置
        this.config = {
            app: {
                name: '',
                package: '',
                version: '',
                description: '',
                homepage: '',
                author: '',
                unsupportedPlatforms: [],
                hasVersionRequirement: false,
                minOsVersion: '>= 1.0.18'
            },
            features: {
                backgroundTask: false,
                multiInstance: false,
                publicPath: false,
                gpuAccel: false,
                kvmAccel: false,
                usbAccel: false,
                fileHandler: false
            },
            resources: {
                iconPath: '',
                composePath: ''
            },
            routes: [],
            images: {
                pushTarget: 'none',
                registryUrl: '',
                boxName: ''
            },
            build: {
                context: '.',
                dockerfile: ''
            },
            advanced: {
                envVariables: [],
                volumes: []
            },
            output: {
                directory: ''
            }
        };
        this.fillFormFromConfig();
        this.saveConfig();
    }
    
    // 验证配置是否完整
    validateConfig() {
        const errors = [];
        
        // 验证基本信息
        if (!this.config.app.name) {
            errors.push('应用名称不能为空');
        }
        
        if (!this.config.app.package) {
            errors.push('应用包名不能为空');
        }
        
        if (!this.config.app.version) {
            errors.push('应用版本不能为空');
        }
        
        // 验证资源选择
        if (!this.config.resources.iconPath) {
            errors.push('请选择图标文件');
        }
        
        if (!this.config.resources.composePaths || this.config.resources.composePaths.length === 0) {
            errors.push('请选择 Docker Compose 文件');
        }
        
        // 验证镜像配置
        if (this.config.images.pushTarget === 'custom' && !this.config.images.registryUrl) {
            errors.push('请输入自定义镜像仓库地址');
        }
        
        // 验证输出目录
        if (!this.config.output.directory) {
            errors.push('请选择输出目录');
        }
        
        return {
            valid: errors.length === 0,
            errors: errors
        };
    }
}

// 初始化配置管理器
const configManager = new ConfigManager();

// 页面加载完成后，从配置中填充表单
document.addEventListener('DOMContentLoaded', () => {
    // 确保 stepManager 对象存在后再调用 fillFormFromConfig
    if (window.stepManager) {
        configManager.fillFormFromConfig();
    } else {
        // 如果 stepManager 还不存在，延迟执行或等待 stepManager 创建
        setTimeout(() => {
            if (window.stepManager) {
                configManager.fillFormFromConfig();
            }
        }, 100);
    }
});

// 保存配置按钮事件（如果需要）
// document.getElementById('save-config-btn').addEventListener('click', () => {
//     configManager.getConfigFromForm();
//     configManager.saveConfig();
//     alert('配置已保存');
// });

// 重置配置按钮事件（如果需要）
// document.getElementById('reset-config-btn').addEventListener('click', () => {
//     if (confirm('确定要重置配置吗？')) {
//         configManager.resetConfig();
//         alert('配置已重置');
//     }
// });
