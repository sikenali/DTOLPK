// 步骤管理模块
class StepManager {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 8;
        this.init();
    }
    
    init() {
        // 初始化步骤状态
        this.updateStepStatus();
        
        // 加载当前步骤数据
        this.loadStepData(this.currentStep);
        
        // 自动加载保存的 Dockerfile 和 docker-compose.yml 数据
        this.autoLoadSavedData();
        
        // 处理命令行参数
        this.handleCommandLineArgs();
        
        // 确保DOM完全加载后再绑定事件监听器
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.bindEvents();
            });
        } else {
            this.bindEvents();
        }
    }
    
    // 自动加载保存的 Dockerfile 和 docker-compose.yml 数据
    autoLoadSavedData() {
        try {
            // 加载多个 Docker Compose 文件数据
            const savedComposePaths = JSON.parse(localStorage.getItem('composePaths') || '[]');
            const savedComposeContents = JSON.parse(localStorage.getItem('composeContents') || '{}');
            
            if (savedComposePaths.length > 0) {
                // 显示文件列表
                this.displayComposeFilesList(savedComposePaths, savedComposeContents);
                // 自动解析第一个 Docker Compose 文件
                this.autoParseComposeFile(savedComposePaths[0]);
            }
            
            // 加载 Dockerfile 数据
            const savedDockerfilePath = localStorage.getItem('dockerfilePath');
            const savedDockerfileContent = localStorage.getItem('dockerfileContent');
            if (savedDockerfilePath && savedDockerfileContent) {
                document.getElementById('dockerfile-path').value = savedDockerfilePath;
                document.getElementById('dockerfile-content').value = savedDockerfileContent;
            }
            
            // 监听文件路径输入框变化，自动保存和加载文件内容
            this.bindFilePathChangeEvents();
        } catch (error) {
            console.error('自动加载保存的数据失败:', error);
        }
    }
    
    // 绑定文件路径输入框变化事件
    bindFilePathChangeEvents() {
        // 监听 Dockerfile 文件路径输入框变化
        const dockerfilePathInput = document.getElementById('dockerfile-path');
        if (dockerfilePathInput) {
            dockerfilePathInput.addEventListener('change', async (e) => {
                const filePath = e.target.value;
                await this.loadAndSaveFileContent(filePath, 'dockerfile');
            });
            
            // 监听输入事件，当用户粘贴文件路径时也能触发
            dockerfilePathInput.addEventListener('input', async (e) => {
                const filePath = e.target.value;
                // 只有当输入框失去焦点或按下回车键时才保存
                if (e.type === 'input' && e.inputType !== 'insertFromPaste') {
                    return;
                }
                await this.loadAndSaveFileContent(filePath, 'dockerfile');
            });
        }
        
        // 监听 Dockerfile 文件内容变化
        const dockerfileContentInput = document.getElementById('dockerfile-content');
        if (dockerfileContentInput) {
            dockerfileContentInput.addEventListener('input', (e) => {
                const content = e.target.value;
                const path = document.getElementById('dockerfile-path').value;
                localStorage.setItem('dockerfileContent', content);
                if (path) {
                    localStorage.setItem('dockerfilePath', path);
                }
            });
        }
    }
    
    // 显示 Docker Compose 文件列表
    displayComposeFilesList(composePaths, composeContents) {
        const container = document.getElementById('compose-files-list');
        
        // 清空容器并移除所有事件监听器
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        
        composePaths.forEach((filePath) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'flex items-center space-x-3 mb-2 p-3 border border-gray-200 rounded-lg';
            
            // 文件路径显示
            const filePathSpan = document.createElement('span');
            filePathSpan.className = 'flex-1 text-sm font-medium truncate';
            filePathSpan.textContent = filePath;
            
            // 刷新按钮
            const refreshBtn = document.createElement('button');
            refreshBtn.className = 'btn-secondary text-xs';
            refreshBtn.innerHTML = '<i class="fa fa-sync-alt"></i>';
            refreshBtn.title = '刷新文件内容';
            refreshBtn.addEventListener('click', async () => {
                await this.refreshComposeFile(filePath);
            });
            
            // 删除按钮
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-danger text-xs';
            deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';
            deleteBtn.title = '删除文件';
            deleteBtn.addEventListener('click', () => {
                // 使用文件路径而不是索引来删除文件
                this.removeComposeFileByPath(filePath);
            });
            
            // 查看内容按钮
            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn-primary text-xs';
            viewBtn.textContent = '查看';
            viewBtn.addEventListener('click', async () => {
                await this.viewComposeFileContent(filePath, composeContents[filePath]);
            });
            
            fileItem.appendChild(filePathSpan);
            fileItem.appendChild(viewBtn);
            fileItem.appendChild(refreshBtn);
            fileItem.appendChild(deleteBtn);
            container.appendChild(fileItem);
        });
    }
    
    // 根据文件路径删除 Docker Compose 文件
    removeComposeFileByPath(filePath) {
        try {
            // 获取现有文件列表
            const savedComposePaths = JSON.parse(localStorage.getItem('composePaths') || '[]');
            const savedComposeContents = JSON.parse(localStorage.getItem('composeContents') || '{}');
            
            // 找到文件的索引
            const index = savedComposePaths.indexOf(filePath);
            if (index === -1) {
                throw new Error('文件不存在');
            }
            
            // 删除文件
            savedComposePaths.splice(index, 1);
            delete savedComposeContents[filePath];
            
            // 保存到 localStorage
            localStorage.setItem('composePaths', JSON.stringify(savedComposePaths));
            localStorage.setItem('composeContents', JSON.stringify(savedComposeContents));
            
            // 更新文件列表显示
            this.displayComposeFilesList(savedComposePaths, savedComposeContents);
            
            // 如果还有文件，显示第一个文件的内容
            if (savedComposePaths.length > 0) {
                document.getElementById('compose-content').value = savedComposeContents[savedComposePaths[0]];
            } else {
                document.getElementById('compose-content').value = '';
            }
            
            this.showNotification('Docker Compose 文件已删除', 'success');
        } catch (error) {
            console.error('删除 Docker Compose 文件失败:', error);
            alert('删除 Docker Compose 文件失败: ' + error.message);
        }
    }
    
    // 查看 Docker Compose 文件内容
    async viewComposeFileContent(filePath, content) {
        if (content) {
            document.getElementById('compose-content').value = content;
        } else {
            // 如果没有缓存的内容，重新读取文件
            const readResult = await window.electronAPI.readFile(filePath);
            if (readResult.success) {
                document.getElementById('compose-content').value = readResult.content;
            }
        }
    }
    
    // 加载并保存文件内容
    async loadAndSaveFileContent(filePath, fileType) {
        try {
            if (!filePath) {
                return;
            }
            
            // 检查文件是否存在
            const fs = require('fs');
            if (!fs.existsSync(filePath)) {
                return;
            }
            
            // 读取文件内容
            const readResult = await window.electronAPI.readFile(filePath);
            if (readResult.success) {
                // 保存文件内容到 localStorage
                localStorage.setItem(`${fileType}Path`, filePath);
                localStorage.setItem(`${fileType}Content`, readResult.content);
                
                // 更新 UI
                if (fileType === 'compose') {
                    document.getElementById('compose-content').value = readResult.content;
                    // 自动解析 Docker Compose 文件
                    await this.autoParseComposeFile(filePath);
                } else if (fileType === 'dockerfile') {
                    document.getElementById('dockerfile-content').value = readResult.content;
                }
            }
        } catch (error) {
            console.error(`加载并保存${fileType}文件内容失败:`, error);
        }
    }
    
    // 处理命令行参数
    handleCommandLineArgs() {
        try {
            // 从 electronAPI 获取命令行参数
            const args = window.electronAPI.getCommandLineArgs();
            
            // 如果有命令行参数，填充到表单中
            if (args) {
                // 处理 compose 参数
                if (args.compose) {
                    // 不再使用单个 compose-path 元素，而是使用多个 compose 文件
                    this.addComposeFile(args.compose);
                }
                
                // 处理 output 参数
                if (args.output) {
                    document.getElementById('output-directory').value = args.output;
                }
                
                // 处理 icon 参数
                if (args.icon) {
                    document.getElementById('icon-path').value = args.icon;
                    // 更新图标预览
                    const iconPreview = document.getElementById('icon-preview');
                    const img = iconPreview.querySelector('img');
                    img.src = args.icon;
                    iconPreview.style.display = 'block';
                }
            }
        } catch (error) {
            console.error('处理命令行参数失败:', error);
        }
    }
    
    bindEvents() {
        try {
            console.log('开始绑定事件监听器...');
            
            // 步骤导航点击事件 - 使用事件委托，绑定在父元素上，确保事件监听器始终有效
            const stepsContainer = document.querySelector('.sidebar ul');
            if (stepsContainer) {
                console.log('找到步骤导航容器，绑定点击事件委托');
                stepsContainer.addEventListener('click', (e) => {
                    const stepItem = e.target.closest('.step-item');
                    if (stepItem) {
                        const step = parseInt(stepItem.dataset.step);
                        this.goToStep(step);
                    }
                });
            } else {
                console.error('未找到步骤导航容器');
            }
            
            // 系统版本要求复选框事件
            const hasVersionRequirement = document.getElementById('has-version-requirement');
            if (hasVersionRequirement) {
                hasVersionRequirement.addEventListener('change', (e) => {
                    const versionField = document.getElementById('version-requirement-field');
                    versionField.style.display = e.target.checked ? 'block' : 'none';
                });
            } else {
                console.error('未找到 has-version-requirement 元素');
            }
            
            // 镜像推送目标选择事件
            const pushTarget = document.getElementById('push-target');
            if (pushTarget) {
                pushTarget.addEventListener('change', (e) => {
                    const customRegistryField = document.getElementById('custom-registry-field');
                    const lazycatBoxField = document.getElementById('lazycat-box-field');
                    customRegistryField.style.display = e.target.value === 'custom' ? 'block' : 'none';
                    lazycatBoxField.style.display = e.target.value === 'lazycat' ? 'block' : 'none';
                });
            } else {
                console.error('未找到 push-target 元素');
            }
            
            // 文件选择按钮事件
            const selectIconBtn = document.getElementById('select-icon-btn');
            if (selectIconBtn) {
                selectIconBtn.addEventListener('click', () => {
                    this.selectIconFile();
                });
            } else {
                console.error('未找到 select-icon-btn 元素');
            }
            
            const selectComposeBtn = document.getElementById('select-compose-btn');
            if (selectComposeBtn) {
                selectComposeBtn.addEventListener('click', () => {
                    this.selectComposeFile();
                });
            } else {
                console.error('未找到 select-compose-btn 元素');
            }
            
            const selectOutputDirBtn = document.getElementById('select-output-dir-btn');
            if (selectOutputDirBtn) {
                selectOutputDirBtn.addEventListener('click', () => {
                    this.selectOutputDirectory();
                });
            } else {
                console.error('未找到 select-output-dir-btn 元素');
            }
            
            const selectDockerfileBtn = document.getElementById('select-dockerfile-btn');
            if (selectDockerfileBtn) {
                selectDockerfileBtn.addEventListener('click', () => {
                    this.selectDockerfile();
                });
            } else {
                console.error('未找到 select-dockerfile-btn 元素');
            }
            
            const selectDockerfileOutputBtn = document.getElementById('select-dockerfile-output-btn');
            if (selectDockerfileOutputBtn) {
                selectDockerfileOutputBtn.addEventListener('click', () => {
                    this.selectDockerfileOutputDirectory();
                });
            } else {
                console.error('未找到 select-dockerfile-output-btn 元素');
            }
            
            // 文件刷新按钮事件
            const refreshDockerfileBtn = document.getElementById('refresh-dockerfile-btn');
            if (refreshDockerfileBtn) {
                refreshDockerfileBtn.addEventListener('click', () => {
                    this.refreshDockerfile();
                });
            } else {
                console.error('未找到 refresh-dockerfile-btn 元素');
            }
            
            const refreshComposeBtn = document.getElementById('refresh-compose-btn');
            if (refreshComposeBtn) {
                refreshComposeBtn.addEventListener('click', () => {
                    this.refreshComposeFile();
                });
            } else {
                console.error('未找到 refresh-compose-btn 元素');
            }
            
            // 文件删除按钮事件
            const removeIconBtn = document.getElementById('remove-icon-btn');
            if (removeIconBtn) {
                removeIconBtn.addEventListener('click', () => {
                    this.removeIconFile();
                });
            } else {
                console.error('未找到 remove-icon-btn 元素');
            }
            
            // 添加路由按钮事件
            const addRouteBtn = document.getElementById('add-route-btn');
            if (addRouteBtn) {
                addRouteBtn.addEventListener('click', () => {
                    this.addRoute();
                });
            } else {
                console.error('未找到 add-route-btn 元素');
            }
            
            // 添加环境变量按钮事件
            const addEnvBtn = document.getElementById('add-env-btn');
            if (addEnvBtn) {
                addEnvBtn.addEventListener('click', () => {
                    this.addEnvVariable();
                });
            } else {
                console.error('未找到 add-env-btn 元素');
            }
            
            // 添加卷挂载按钮事件
            const addVolumeBtn = document.getElementById('add-volume-btn');
            if (addVolumeBtn) {
                addVolumeBtn.addEventListener('click', () => {
                    this.addVolume();
                });
            } else {
                console.error('未找到 add-volume-btn 元素');
            }
            
            // 开始转换按钮事件
            const startConvertBtn = document.getElementById('start-convert-btn');
            if (startConvertBtn) {
                startConvertBtn.addEventListener('click', () => {
                    this.startConversion();
                });
            } else {
                console.error('未找到 start-convert-btn 元素');
            }
            
            console.log('事件监听器绑定完成');
        } catch (error) {
            console.error('绑定事件监听器时发生错误:', error);
        }
    }
    

    

    

    

    

    

    

    

    

    

    

    
    // 运行命令（需要在 preload.js 和 main.js 中添加对应的 API）
    

    
    // 保存当前步骤数据
    saveStepData() {
        const stepData = {};
        
        // 根据当前步骤保存对应数据
        switch (this.currentStep) {
            case 1: // 应用信息
                stepData.appName = document.getElementById('app-name').value;
                stepData.appPackage = document.getElementById('app-package').value;
                stepData.appVersion = document.getElementById('app-version').value;
                stepData.appAuthor = document.getElementById('app-author').value;
                stepData.appDescription = document.getElementById('app-description').value;
                stepData.appHomepage = document.getElementById('app-homepage').value;
                stepData.platforms = {
                    ios: document.getElementById('platform-ios').checked,
                    android: document.getElementById('platform-android').checked,
                    linux: document.getElementById('platform-linux').checked,
                    windows: document.getElementById('platform-windows').checked,
                    macos: document.getElementById('platform-macos').checked,
                    tvos: document.getElementById('platform-tvos').checked
                };
                stepData.hasVersionRequirement = document.getElementById('has-version-requirement').checked;
                stepData.minOsVersion = document.getElementById('min-os-version').value;
                break;
            case 2: // 应用功能
                stepData.features = {
                    backgroundTask: document.getElementById('feature-background-task').checked,
                    multiInstance: document.getElementById('feature-multi-instance').checked,
                    publicPath: document.getElementById('feature-public-path').checked,
                    gpuAccel: document.getElementById('feature-gpu-accel').checked,
                    kvmAccel: document.getElementById('feature-kvm-accel').checked,
                    usbAccel: document.getElementById('feature-usb-accel').checked,
                    fileHandler: document.getElementById('feature-file-handler').checked
                };
                break;
            case 3: // 资源选择
                stepData.iconPath = document.getElementById('icon-path').value;
                // 多个Docker Compose文件由displayComposeFilesList方法处理，不再需要这里保存单个compose-path
                break;
            case 4: // 路由配置
                const routes = [];
                document.querySelectorAll('.route-item').forEach(routeItem => {
                    const routeId = routeItem.dataset.routeId;
                    const routeType = routeItem.querySelector('.route-type').value;
                    const protocol = routeItem.querySelector('.port-config select')?.value || '';
                    const inputs = routeItem.querySelectorAll('.input-field');
                    // 正确的索引：路径是第三个input-field（索引2），目标是第四个input-field（索引3）
                    const path = inputs[2]?.value || '';
                    const target = inputs[3]?.value || '';
                    
                    routes.push({
                        id: routeId,
                        type: routeType,
                        protocol: protocol,
                        path: path,
                        target: target
                    });
                });
                stepData.routes = routes;
                break;
            case 5: // 镜像配置
                stepData.pushTarget = document.getElementById('push-target').value;
                stepData.registryUrl = document.getElementById('registry-url').value;
                stepData.boxName = document.getElementById('box-name').value;
                break;
            case 6: // 构建配置
                stepData.buildContext = document.getElementById('build-context').value;
                stepData.dockerfilePath = document.getElementById('dockerfile-path').value;
                break;
            case 7: // 高级配置
                const envVariables = [];
                document.querySelectorAll('.env-item').forEach(envItem => {
                    const name = envItem.querySelectorAll('.input-field')[0]?.value || '';
                    const value = envItem.querySelectorAll('.input-field')[1]?.value || '';
                    if (name || value) {
                        envVariables.push({ name, value });
                    }
                });
                
                const volumes = [];
                document.querySelectorAll('.volume-item').forEach(volumeItem => {
                    const source = volumeItem.querySelectorAll('.input-field')[0]?.value || '';
                    const target = volumeItem.querySelectorAll('.input-field')[1]?.value || '';
                    if (source || target) {
                        volumes.push({ source, target });
                    }
                });
                
                stepData.envVariables = envVariables;
                stepData.volumes = volumes;
                break;
            case 8: // 生成 LPK
                stepData.outputDirectory = document.getElementById('output-directory').value;
                break;
        }
        
        // 保存到localStorage
        localStorage.setItem(`step-${this.currentStep}-data`, JSON.stringify(stepData));
    }
    
    // 加载步骤数据
    loadStepData(step) {
        const savedData = localStorage.getItem(`step-${step}-data`);
        if (!savedData) return;
        
        const stepData = JSON.parse(savedData);
        
        // 根据步骤加载对应数据
        switch (step) {
            case 1: // 应用信息
                if (stepData.appName) document.getElementById('app-name').value = stepData.appName;
                if (stepData.appPackage) document.getElementById('app-package').value = stepData.appPackage;
                if (stepData.appVersion) document.getElementById('app-version').value = stepData.appVersion;
                if (stepData.appAuthor) document.getElementById('app-author').value = stepData.appAuthor;
                if (stepData.appDescription) document.getElementById('app-description').value = stepData.appDescription;
                if (stepData.appHomepage) document.getElementById('app-homepage').value = stepData.appHomepage;
                
                if (stepData.platforms) {
                    document.getElementById('platform-ios').checked = stepData.platforms.ios || false;
                    document.getElementById('platform-android').checked = stepData.platforms.android || false;
                    document.getElementById('platform-linux').checked = stepData.platforms.linux || false;
                    document.getElementById('platform-windows').checked = stepData.platforms.windows || false;
                    document.getElementById('platform-macos').checked = stepData.platforms.macos || false;
                    document.getElementById('platform-tvos').checked = stepData.platforms.tvos || false;
                }
                
                if (stepData.hasVersionRequirement !== undefined) {
                    document.getElementById('has-version-requirement').checked = stepData.hasVersionRequirement;
                    const versionField = document.getElementById('version-requirement-field');
                    versionField.style.display = stepData.hasVersionRequirement ? 'block' : 'none';
                }
                
                if (stepData.minOsVersion) document.getElementById('min-os-version').value = stepData.minOsVersion;
                break;
            case 2: // 应用功能
                if (stepData.features) {
                    document.getElementById('feature-background-task').checked = stepData.features.backgroundTask || false;
                    document.getElementById('feature-multi-instance').checked = stepData.features.multiInstance || false;
                    document.getElementById('feature-public-path').checked = stepData.features.publicPath || false;
                    document.getElementById('feature-gpu-accel').checked = stepData.features.gpuAccel || false;
                    document.getElementById('feature-kvm-accel').checked = stepData.features.kvmAccel || false;
                    document.getElementById('feature-usb-accel').checked = stepData.features.usbAccel || false;
                    document.getElementById('feature-file-handler').checked = stepData.features.fileHandler || false;
                }
                break;
            case 3: // 资源选择
                if (stepData.iconPath) {
                    document.getElementById('icon-path').value = stepData.iconPath;
                    // 更新图标预览
                    const iconPreview = document.getElementById('icon-preview');
                    const img = iconPreview.querySelector('img');
                    img.src = stepData.iconPath;
                    iconPreview.style.display = 'block';
                }
                // 多个Docker Compose文件由autoLoadSavedData方法处理，不再需要这里设置单个compose-path
                break;
            case 4: // 路由配置
                // 路由数据需要特殊处理，先清空现有路由
                document.getElementById('routes-container').innerHTML = '';
                if (stepData.routes && stepData.routes.length > 0) {
                    stepData.routes.forEach(route => {
                        this.addRoute();
                        // 找到最后添加的路由项并填充数据
                        const routeItems = document.querySelectorAll('.route-item');
                        const lastRouteItem = routeItems[routeItems.length - 1];
                        
                        // 设置路由类型
                        const routeTypeSelect = lastRouteItem.querySelector('.route-type');
                        routeTypeSelect.value = route.type;
                        
                        // 设置协议
                        const protocolSelect = lastRouteItem.querySelector('.port-config select');
                        if (protocolSelect) protocolSelect.value = route.protocol;
                        
                        // 设置路径和目标 - 使用正确的索引
                        const inputs = lastRouteItem.querySelectorAll('.input-field');
                        if (inputs[2]) inputs[2].value = route.path;
                        if (inputs[3]) inputs[3].value = route.target;
                        
                        // 更新路由配置显示
                        this.toggleRouteConfig(routeTypeSelect, lastRouteItem);
                    });
                } else {
                    // 如果没有保存的数据，添加一个默认的路由配置项
                    this.addRoute();
                }
                break;
            case 5: // 镜像配置
                if (stepData.pushTarget) {
                    document.getElementById('push-target').value = stepData.pushTarget;
                    // 更新仓库字段显示
                    const customRegistryField = document.getElementById('custom-registry-field');
                    const lazycatBoxField = document.getElementById('lazycat-box-field');
                    customRegistryField.style.display = stepData.pushTarget === 'custom' ? 'block' : 'none';
                    lazycatBoxField.style.display = stepData.pushTarget === 'lazycat' ? 'block' : 'none';
                }
                if (stepData.registryUrl) document.getElementById('registry-url').value = stepData.registryUrl;
                if (stepData.boxName) document.getElementById('box-name').value = stepData.boxName;
                break;
            case 6: // 构建配置
                if (stepData.buildContext) document.getElementById('build-context').value = stepData.buildContext;
                if (stepData.dockerfilePath) document.getElementById('dockerfile-path').value = stepData.dockerfilePath;
                break;
            case 7: // 高级配置
                // 清空现有环境变量和卷挂载
                document.getElementById('env-variables-container').innerHTML = '';
                document.getElementById('volumes-container').innerHTML = '';
                
                // 加载环境变量
                if (stepData.envVariables && stepData.envVariables.length > 0) {
                    stepData.envVariables.forEach(env => {
                        this.addEnvVariable();
                        const envItems = document.querySelectorAll('.env-item');
                        const lastEnvItem = envItems[envItems.length - 1];
                        const inputs = lastEnvItem.querySelectorAll('.input-field');
                        if (inputs[0]) inputs[0].value = env.name;
                        if (inputs[1]) inputs[1].value = env.value;
                    });
                } else {
                    // 如果没有保存的数据，添加一个默认的环境变量配置项
                    this.addEnvVariable();
                }
                
                // 加载卷挂载
                if (stepData.volumes && stepData.volumes.length > 0) {
                    stepData.volumes.forEach(volume => {
                        this.addVolume();
                        const volumeItems = document.querySelectorAll('.volume-item');
                        const lastVolumeItem = volumeItems[volumeItems.length - 1];
                        const inputs = lastVolumeItem.querySelectorAll('.input-field');
                        if (inputs[0]) inputs[0].value = volume.source;
                        if (inputs[1]) inputs[1].value = volume.target;
                    });
                } else {
                    // 如果没有保存的数据，添加一个默认的卷挂载配置项
                    this.addVolume();
                }
                break;
            case 8: // 生成 LPK
                if (stepData.outputDirectory) document.getElementById('output-directory').value = stepData.outputDirectory;
                break;
        }
    }
    
    // 切换到指定步骤
    goToStep(step) {
        if (step < 1 || step > this.totalSteps) {
            return;
        }
        
        // 保存当前步骤数据
        this.saveStepData();
        
        // 隐藏所有步骤内容
        document.querySelectorAll('.step-content').forEach(content => {
            content.style.display = 'none';
        });
        
        // 显示当前步骤内容
        document.getElementById(`step-${step}`).style.display = 'block';
        
        // 更新当前步骤
        this.currentStep = step;
        
        // 加载步骤数据
        this.loadStepData(step);
        
        // 根据步骤添加默认配置项
        switch (step) {
            case 4: // 路由配置
                // 如果没有路由配置项，添加一个默认的
                if (document.querySelectorAll('.route-item').length === 0) {
                    this.addRoute();
                }
                break;
                
            case 5: // 镜像配置
                // 确保根据当前选择显示正确的输入框
                const pushTarget = document.getElementById('push-target');
                if (pushTarget) {
                    const customRegistryField = document.getElementById('custom-registry-field');
                    const lazycatBoxField = document.getElementById('lazycat-box-field');
                    customRegistryField.style.display = pushTarget.value === 'custom' ? 'block' : 'none';
                    lazycatBoxField.style.display = pushTarget.value === 'lazycat' ? 'block' : 'none';
                }
                break;
                
            case 7: // 高级配置
                // 如果没有环境变量配置项，添加一个默认的
                if (document.querySelectorAll('.env-item').length === 0) {
                    this.addEnvVariable();
                }
                // 如果没有卷挂载配置项，添加一个默认的
                if (document.querySelectorAll('.volume-item').length === 0) {
                    this.addVolume();
                }
                break;
        }
        
        // 更新步骤状态
        this.updateStepStatus();
        
        // 更新进度条
        this.updateProgress();
    }
    
    // 上一步
    prevStep() {
        if (this.currentStep > 1) {
            this.goToStep(this.currentStep - 1);
        }
    }
    
    // 下一步
    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.goToStep(this.currentStep + 1);
        }
    }
    
    // 更新步骤状态
    updateStepStatus() {
        // 菜单项标题映射
        const stepTitles = {
            1: '应用信息',
            2: '应用功能',
            3: '资源配置',
            4: '路由配置',
            5: '镜像配置',
            6: '构建配置',
            7: '高级配置',
            8: '生成 LPK'
        };
        
        // 更新步骤导航状态
        document.querySelectorAll('.step-item').forEach(item => {
            const step = parseInt(item.dataset.step);
            const menuItem = item.querySelector('div');
            const iconContainer = item.querySelector('.w-9.h-9');
            const icon = iconContainer.querySelector('i');
            
            // 根据步骤设置不同的图标
            const iconMap = {
                1: 'fa fa-info-circle',      // 应用信息
                2: 'fa fa-cogs',             // 应用功能
                3: 'fa fa-file-import',      // 资源配置
                4: 'fa fa-network-wired',    // 路由配置
                5: 'fa fa-docker',           // 镜像配置
                6: 'fa fa-hammer',           // 构建配置
                7: 'fa fa-sliders',          // 高级配置
                8: 'fa fa-file-export'       // 生成 LPK
            };
            
            if (step === this.currentStep) {
                // 当前步骤 - 背景覆盖整个导航区域，使用较浅的蓝色
                menuItem.className = 'flex items-center space-x-3 cursor-pointer p-3 transition-all duration-200 bg-blue-50';
                iconContainer.className = 'w-9 h-9 flex items-center justify-center';
                icon.className = `${iconMap[step]} text-blue-500`;
                menuItem.querySelector('.font-medium').className = 'font-medium text-blue-700';
            } else {
                // 其他步骤
                menuItem.className = 'flex items-center space-x-3 cursor-pointer p-3 transition-all duration-200 hover:bg-blue-50';
                iconContainer.className = 'w-9 h-9 flex items-center justify-center';
                icon.className = `${iconMap[step]} text-gray-600`;
                menuItem.querySelector('.font-medium').className = 'font-medium text-gray-800';
            }
        });
        
        // 更新配置信息标题
        document.getElementById('section-title').textContent = stepTitles[this.currentStep];
    }
    
    // 更新进度信息
    updateProgress() {
        const progress = (this.currentStep / this.totalSteps) * 100;
        document.getElementById('progress-text').textContent = `${this.currentStep}/${this.totalSteps}`;
        document.getElementById('progress-fill').style.width = `${progress}%`;
    }
    
    // 选择图标文件
    async selectIconFile() {
        console.log('selectIconFile 方法被调用');
        try {
            console.log('调用 window.electronAPI.selectFile');
            const result = await window.electronAPI.selectFile({
                title: '选择图标文件',
                filters: [
                    { name: 'Image Files', extensions: ['png', 'jpg', 'jpeg', 'gif'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
            });
            
            console.log('selectFile 返回结果:', result);
            
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                document.getElementById('icon-path').value = filePath;
                
                // 显示图标预览
                const iconPreview = document.getElementById('icon-preview');
                const img = iconPreview.querySelector('img');
                img.src = filePath;
                iconPreview.style.display = 'block';
            }
        } catch (error) {
            console.error('选择图标文件失败:', error);
            alert('选择图标文件失败: ' + error.message);
        }
    }
    
    // 选择 Docker Compose 文件
    async selectComposeFile() {
        console.log('selectComposeFile 方法被调用');
        try {
            console.log('调用 window.electronAPI.selectFile');
            const result = await window.electronAPI.selectFile({
                title: '选择 Docker Compose 或 YAML 文件',
                filters: [
                    { name: 'YAML Files', extensions: ['yml', 'yaml', 'docker-compose.yml', 'docker-compose.yaml'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile', 'multiSelections'] // 支持多选
            });
            
            console.log('selectFile 返回结果:', result);
            
            if (!result.canceled && result.filePaths.length > 0) {
                for (const filePath of result.filePaths) {
                    await this.addComposeFile(filePath);
                }
                // 自动解析第一个 Docker Compose 文件
                await this.autoParseComposeFile(result.filePaths[0]);
            }
        } catch (error) {
            console.error('选择 Docker Compose 文件失败:', error);
            alert('选择 Docker Compose 文件失败: ' + error.message);
        }
    }
    
    // 添加 Docker Compose 文件
    async addComposeFile(filePath) {
        try {
            // 读取文件内容
            const readResult = await window.electronAPI.readFile(filePath);
            if (readResult.success) {
                // 获取现有文件列表
                const savedComposePaths = JSON.parse(localStorage.getItem('composePaths') || '[]');
                const savedComposeContents = JSON.parse(localStorage.getItem('composeContents') || '{}');
                
                // 如果文件已存在，不重复添加
                if (!savedComposePaths.includes(filePath)) {
                    // 添加新文件
                    savedComposePaths.push(filePath);
                    savedComposeContents[filePath] = readResult.content;
                    
                    // 保存到 localStorage
                    localStorage.setItem('composePaths', JSON.stringify(savedComposePaths));
                    localStorage.setItem('composeContents', JSON.stringify(savedComposeContents));
                    
                    // 更新文件列表显示
                    this.displayComposeFilesList(savedComposePaths, savedComposeContents);
                    
                    // 显示文件内容
                    document.getElementById('compose-content').value = readResult.content;
                }
            }
        } catch (error) {
            throw error;
        }
    }
    
    // 刷新 Docker Compose 文件内容
    async refreshComposeFile(filePath) {
        console.log('refreshComposeFile 方法被调用');
        try {
            if (!filePath) {
                alert('请先选择 Docker Compose 文件');
                return;
            }
            
            // 读取文件内容
            const readResult = await window.electronAPI.readFile(filePath);
            if (readResult.success) {
                // 获取现有文件列表
                const savedComposePaths = JSON.parse(localStorage.getItem('composePaths') || '[]');
                const savedComposeContents = JSON.parse(localStorage.getItem('composeContents') || '{}');
                
                // 更新文件内容
                savedComposeContents[filePath] = readResult.content;
                
                // 保存到 localStorage
                localStorage.setItem('composeContents', JSON.stringify(savedComposeContents));
                
                // 更新文件列表显示
                this.displayComposeFilesList(savedComposePaths, savedComposeContents);
                
                // 显示文件内容
                document.getElementById('compose-content').value = readResult.content;
                
                // 自动解析 Docker Compose 文件，提取环境变量、卷挂载和端口信息
                await this.autoParseComposeFile(filePath);
                this.showNotification('Docker Compose 文件内容已刷新', 'success');
            }
        } catch (error) {
            console.error('刷新 Docker Compose 文件失败:', error);
            alert('刷新 Docker Compose 文件失败: ' + error.message);
        }
    }
    

    
    // 自动解析 Docker Compose 文件，提取环境变量、卷挂载和端口信息
    async autoParseComposeFile(filePath) {
        try {
            // 解析单个 Docker Compose 文件
            const composeData = await this.parseComposeFile(filePath);
            
            if (!composeData.services) {
                return;
            }
            
            // 提取所有服务的环境变量、卷挂载和端口信息
            const allEnvVars = [];
            const allVolumes = [];
            const allPorts = [];
            
            for (const [serviceName, service] of Object.entries(composeData.services)) {
                // 提取环境变量
                if (service.environment) {
                    const envVars = this.extractEnvVars(service.environment);
                    allEnvVars.push(...envVars);
                }
                
                // 提取卷挂载
                if (service.volumes) {
                    const volumes = this.extractVolumes(service.volumes);
                    allVolumes.push(...volumes);
                }
                
                // 提取端口信息，传递服务名称
                if (service.ports) {
                    const ports = this.extractPorts(service.ports, serviceName);
                    allPorts.push(...ports);
                }
            }
            
            // 填充环境变量
            this.fillEnvVars(allEnvVars);
            
            // 填充卷挂载
            this.fillVolumes(allVolumes);
            
            // 填充端口信息到路由配置
            this.fillPortsToRoutes(allPorts);
            
            // 保存自动解析的数据到配置中
            configManager.getConfigFromForm();
            
            // 保存所有相关步骤的数据到localStorage
            // 直接保存路由配置，不修改currentStep
            const routesContainer = document.getElementById('routes-container');
            const routeItems = routesContainer.querySelectorAll('.route-item');
            const routes = [];
            routeItems.forEach(routeItem => {
                const routeId = routeItem.dataset.routeId;
                const routeType = routeItem.querySelector('.route-type').value;
                const protocol = routeItem.querySelector('.port-config select')?.value || '';
                const inputs = routeItem.querySelectorAll('.input-field');
                const path = inputs[2]?.value || '';
                const target = inputs[3]?.value || '';
                
                routes.push({
                    id: routeId,
                    type: routeType,
                    protocol: protocol,
                    path: path,
                    target: target
                });
            });
            localStorage.setItem('step-4-data', JSON.stringify({ routes }));
            
            // 直接保存高级配置，不修改currentStep
            const envVariables = [];
            document.querySelectorAll('.env-item').forEach(envItem => {
                const name = envItem.querySelectorAll('.input-field')[0]?.value || '';
                const value = envItem.querySelectorAll('.input-field')[1]?.value || '';
                if (name || value) {
                    envVariables.push({ name, value });
                }
            });
            
            const volumes = [];
            document.querySelectorAll('.volume-item').forEach(volumeItem => {
                const source = volumeItem.querySelectorAll('.input-field')[0]?.value || '';
                const target = volumeItem.querySelectorAll('.input-field')[1]?.value || '';
                if (source || target) {
                    volumes.push({ source, target });
                }
            });
            localStorage.setItem('step-7-data', JSON.stringify({ envVariables, volumes }));
            
            // 显示成功消息
            this.showNotification('文件解析成功', 'success');
        } catch (error) {
            console.error('自动解析 Docker Compose 文件失败:', error);
            // 显示错误消息
            this.showNotification('自动解析 Docker Compose 文件失败: ' + error.message, 'error');
        }
    }
    
    // 解析单个 Docker Compose 文件
    async parseComposeFile(filePath) {
        try {
            const yaml = require('yaml');
            const fs = require('fs');
            const content = fs.readFileSync(filePath, 'utf8');
            return yaml.parse(content);
        } catch (error) {
            console.error('解析 Docker Compose 文件失败:', error);
            throw error;
        }
    }
    
    // 解析所有 Docker Compose 文件
    async parseAllComposeFiles() {
        try {
            // 获取所有保存的 Docker Compose 文件路径
            const savedComposePaths = JSON.parse(localStorage.getItem('composePaths') || '[]');
            let combinedData = { services: {} };
            
            // 解析每个文件并合并数据
            for (const filePath of savedComposePaths) {
                const composeData = await this.parseComposeFile(filePath);
                if (composeData.services) {
                    // 合并服务配置
                    combinedData.services = { ...combinedData.services, ...composeData.services };
                }
            }
            
            return combinedData;
        } catch (error) {
            console.error('解析所有 Docker Compose 文件失败:', error);
            throw error;
        }
    }
    
    // 提取环境变量
    extractEnvVars(environment) {
        const envVars = [];
        
        if (Array.isArray(environment)) {
            // 数组格式：["VAR1=value1", "VAR2=value2"]
            for (const envStr of environment) {
                const [key, ...valueParts] = envStr.split('=');
                if (key) {
                    envVars.push({ key, value: valueParts.join('=') });
                }
            }
        } else if (typeof environment === 'object' && environment !== null) {
            // 对象格式：{ VAR1: "value1", VAR2: "value2" }
            for (const [key, value] of Object.entries(environment)) {
                envVars.push({ key, value: String(value) });
            }
        }
        
        return envVars;
    }
    
    // 提取卷挂载
    extractVolumes(volumes) {
        const extractedVolumes = [];
        
        for (const volume of volumes) {
            if (typeof volume === 'string') {
                // 字符串格式："source:target:mode"
                const parts = volume.split(':');
                if (parts.length >= 2) {
                    const source = parts[0];
                    const target = parts[1];
                    extractedVolumes.push({ source, target });
                }
            } else if (typeof volume === 'object' && volume !== null) {
                // 对象格式：{ source: "source", target: "target", mode: "mode" }
                if (volume.source && volume.target) {
                    extractedVolumes.push({ source: volume.source, target: volume.target });
                }
            }
        }
        
        return extractedVolumes;
    }
    
    // 提取端口信息
    extractPorts(ports, serviceName) {
        const extractedPorts = [];
        
        for (const port of ports) {
            let hostPort, containerPort, proto = 'tcp';
            
            if (typeof port === 'string') {
                // 字符串格式："hostPort:containerPort" 或 "containerPort" 或 "hostPort:containerPort/proto"
                const parts = port.split(':');
                
                if (parts.length === 1) {
                    // 只有容器端口
                    containerPort = parts[0].split('/')[0];
                    proto = parts[0].split('/')[1] || 'tcp';
                    hostPort = containerPort;
                } else {
                    // 有主机端口和容器端口
                    hostPort = parts[0];
                    containerPort = parts[1].split('/')[0];
                    proto = parts[1].split('/')[1] || 'tcp';
                }
            } else if (typeof port === 'object' && port !== null) {
                // 对象格式：{ published: "hostPort", target: "containerPort", protocol: "tcp" }
                hostPort = port.published || port.hostPort || port.target;
                containerPort = port.target || port.containerPort;
                proto = port.protocol || 'tcp';
            } else {
                continue;
            }
            
            extractedPorts.push({ hostPort, containerPort, proto, service: serviceName });
        }
        
        return extractedPorts;
    }
    
    // 填充环境变量到表单
    fillEnvVars(envVars) {
        const container = document.getElementById('env-variables-container');
        
        // 清空现有环境变量
        container.innerHTML = '';
        
        // 使用文档片段减少 DOM 操作次数
        for (const envVar of envVars) {
            this.addEnvVariable();
            const envItems = container.querySelectorAll('.env-item');
            const lastEnvItem = envItems[envItems.length - 1];
            const inputs = lastEnvItem.querySelectorAll('.input-field');
            if (inputs[0]) inputs[0].value = envVar.key;
            if (inputs[1]) inputs[1].value = envVar.value;
        }
    }
    
    // 填充卷挂载到表单
    fillVolumes(volumes) {
        const container = document.getElementById('volumes-container');
        
        // 清空现有卷挂载
        container.innerHTML = '';
        
        // 使用文档片段减少 DOM 操作次数
        for (const volume of volumes) {
            this.addVolume();
            const volumeItems = container.querySelectorAll('.volume-item');
            const lastVolumeItem = volumeItems[volumeItems.length - 1];
            const inputs = lastVolumeItem.querySelectorAll('.input-field');
            if (inputs[0]) inputs[0].value = volume.source;
            if (inputs[1]) inputs[1].value = volume.target;
        }
    }
    
    // 填充端口信息到路由配置
    fillPortsToRoutes(ports) {
        const container = document.getElementById('routes-container');
        
        // 清空现有路由配置
        container.innerHTML = '';
        
        // 跟踪是否添加了HTTP/HTTPS路由
        let hasHttpRoute = false;
        
        // 添加提取的端口信息作为路由
        for (const port of ports) {
            this.addRoute();
            const routeItems = container.querySelectorAll('.route-item');
            const lastRouteItem = routeItems[routeItems.length - 1];
            
            // 设置路由类型
            const routeTypeSelect = lastRouteItem.querySelector('.route-type');
            
            // 设置协议
            const protocolSelect = lastRouteItem.querySelector('.port-config select');
            
            // 获取所有输入框
            const inputs = lastRouteItem.querySelectorAll('.input-field');
            
            // 从docker-compose文件获取端口信息
            const containerPort = parseInt(port.containerPort);
            const serviceName = port.service || 'service';
            const proto = port.proto || 'tcp';
            
            let routeType, target, protocol, path;
            
            // 根据端口号智能判断路由类型
            if ([80, 443, 8080, 8081, 8888, 9000].includes(containerPort)) {
                // 常见HTTP/HTTPS端口，设置为http路由类型
                routeType = 'http';
                path = '/';
                target = containerPort; // 使用实际的容器端口，而不是空字符串
                protocol = proto;
                hasHttpRoute = true;
            } else {
                // 其他端口，设置为port路由类型
                routeType = 'port';
                target = containerPort;
                protocol = proto;
                path = '/';
                
                // 根据端口号智能判断协议（仅在端口路由类型下）
                if ([53, 123, 161, 162].includes(containerPort)) {
                    protocol = 'udp';
                }
            }
            
            // 设置路由类型
            if (routeTypeSelect) {
                routeTypeSelect.value = routeType;
                
                // 设置协议（仅端口类型路由）
                if (protocolSelect && routeType === 'port') {
                    protocolSelect.value = protocol;
                }
                
                // 设置路径和端口号
                if (inputs[2]) inputs[2].value = path;
                if (inputs[3]) inputs[3].value = target;
                
                // 更新路由配置显示
                this.toggleRouteConfig(routeTypeSelect, lastRouteItem);
            }
            
            // 触发输入验证，更新样式
            inputs.forEach(input => {
                this.validateRouteInput(input);
            });
        }
        
        // 如果没有提取到端口信息或没有HTTP/HTTPS路由，添加一个默认的HTTP根路径路由
        if (ports.length === 0 || !hasHttpRoute) {
            this.addRoute();
            const routeItems = container.querySelectorAll('.route-item');
            const lastRouteItem = routeItems[routeItems.length - 1];
            const routeTypeSelect = lastRouteItem.querySelector('.route-type');
            const inputs = lastRouteItem.querySelectorAll('.input-field');
            
            if (routeTypeSelect) {
                // 设置为HTTP路由类型
                routeTypeSelect.value = 'http';
                // 设置默认路径
                if (inputs[2]) inputs[2].value = '/';
                // 更新路由配置显示
                this.toggleRouteConfig(routeTypeSelect, lastRouteItem);
            }
        }
    }
    
    // 选择输出目录
    async selectOutputDirectory() {
        console.log('selectOutputDirectory 方法被调用');
        try {
            console.log('调用 window.electronAPI.selectDirectory');
            const result = await window.electronAPI.selectDirectory({
                title: '选择输出目录'
            });
            
            console.log('selectDirectory 返回结果:', result);
            
            if (!result.canceled && result.filePaths.length > 0) {
                const directoryPath = result.filePaths[0];
                document.getElementById('output-directory').value = directoryPath;
            }
        } catch (error) {
            console.error('选择输出目录失败:', error);
            alert('选择输出目录失败: ' + error.message);
        }
    }
    
    // 选择 Dockerfile 文件
    async selectDockerfile() {
        console.log('selectDockerfile 方法被调用');
        try {
            console.log('调用 window.electronAPI.selectFile');
            const result = await window.electronAPI.selectFile({
                title: '选择 Dockerfile 文件',
                filters: [
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
            });
            
            console.log('selectFile 返回结果:', result);
            
            if (!result.canceled && result.filePaths.length > 0) {
                const filePath = result.filePaths[0];
                await this.loadAndSaveDockerfile(filePath);
            }
        } catch (error) {
            console.error('选择 Dockerfile 文件失败:', error);
            alert('选择 Dockerfile 文件失败: ' + error.message);
        }
    }
    
    // 刷新 Dockerfile 文件内容
    async refreshDockerfile() {
        console.log('refreshDockerfile 方法被调用');
        try {
            const filePath = document.getElementById('dockerfile-path').value;
            if (!filePath) {
                alert('请先选择 Dockerfile 文件');
                return;
            }
            
            await this.loadAndSaveDockerfile(filePath);
            this.showNotification('Dockerfile 文件内容已刷新', 'success');
        } catch (error) {
            console.error('刷新 Dockerfile 文件失败:', error);
            alert('刷新 Dockerfile 文件失败: ' + error.message);
        }
    }
    
    // 加载并保存 Dockerfile 文件内容
    async loadAndSaveDockerfile(filePath) {
        try {
            document.getElementById('dockerfile-path').value = filePath;
            
            // 读取并显示文件内容
            const readResult = await window.electronAPI.readFile(filePath);
            if (readResult.success) {
                document.getElementById('dockerfile-content').value = readResult.content;
                // 保存文件内容到 localStorage
                localStorage.setItem('dockerfileContent', readResult.content);
                localStorage.setItem('dockerfilePath', filePath);
            }
        } catch (error) {
            throw error;
        }
    }
    
    // 选择 Dockerfile 输出目录
    async selectDockerfileOutputDirectory() {
        console.log('selectDockerfileOutputDirectory 方法被调用');
        try {
            console.log('调用 window.electronAPI.selectDirectory');
            const result = await window.electronAPI.selectDirectory({
                title: '选择 Dockerfile 输出目录'
            });
            
            console.log('selectDirectory 返回结果:', result);
            
            if (!result.canceled && result.filePaths.length > 0) {
                const directoryPath = result.filePaths[0];
                document.getElementById('dockerfile-output-path').value = directoryPath;
            }
        } catch (error) {
            console.error('选择 Dockerfile 输出目录失败:', error);
            alert('选择 Dockerfile 输出目录失败: ' + error.message);
        }
    }
    
    // 删除图标文件
    removeIconFile() {
        try {
            document.getElementById('icon-path').value = '';
            document.getElementById('icon-preview').style.display = 'none';
            this.showNotification('图标已删除', 'success');
        } catch (error) {
            console.error('删除图标失败:', error);
            this.showNotification('删除图标失败', 'error');
        }
    }
    
    // 添加路由配置
    addRoute() {
        const container = document.getElementById('routes-container');
        const routeId = Date.now();
        
        const routeHtml = `
            <div class="route-item p-4 border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200" data-route-id="${routeId}">
                <div class="flex justify-between items-center mb-3">
                    <div class="font-medium text-gray-800">路由配置</div>
                    <button type="button" class="text-red-500 hover:text-red-700 transition-colors duration-200" onclick="stepManager.removeRoute(${routeId})">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                    <label class="block text-sm font-medium text-gray-700 mb-1">路由类型</label>
                    <select class="input-field route-type border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                        <option value="http">HTTP 路由</option>
                        <option value="https">HTTPS 路由</option>
                        <option value="port" selected>TCP/UDP 端口</option>
                        <option value="static">静态文件</option>
                        <option value="exec">执行命令</option>
                    </select>
                </div>
                    <div class="port-config">
                        <label class="block text-sm font-medium text-gray-700 mb-1">协议</label>
                        <select class="input-field border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500">
                            <option value="tcp" selected>TCP</option>
                            <option value="udp">UDP</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">路径</label>
                        <input type="text" class="input-field border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="如 /api/" value="/">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">端口号</label>
                        <input type="text" class="input-field border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" placeholder="如 8080">
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', routeHtml);
        
        // 绑定路由类型变化事件
        const routeItem = container.lastElementChild;
        const routeTypeSelect = routeItem.querySelector('.route-type');
        routeTypeSelect.addEventListener('change', (e) => {
            this.toggleRouteConfig(e.target, routeItem);
        });
        
        // 添加输入验证
        const inputs = routeItem.querySelectorAll('.input-field');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.validateRouteInput(e.target);
            });
        });
        
        // 初始化路由配置
        this.toggleRouteConfig(routeTypeSelect, routeItem);
    }
    
    // 验证路由输入
    validateRouteInput(input) {
        // 移除之前的验证状态
        input.classList.remove('border-red-500', 'border-green-500');
        
        // 获取当前路由类型
        if (!input) return;
        
        const routeItem = input.closest('.route-item');
        if (!routeItem) return;
        
        const routeTypeSelect = routeItem.querySelector('.route-type');
        if (!routeTypeSelect) return;
        
        const routeType = routeTypeSelect.value;
        
        // 根据不同路由类型进行验证
        if (routeType === 'port') {
            // 端口号验证
            if (input.closest('.port-config') && input.tagName === 'SELECT') {
                // 协议选择不需要验证
                return;
            }
            
            // 端口号输入验证
            if (input.placeholder === '如 8080') {
                const portValue = input.value;
                if (portValue) {
                    const port = parseInt(portValue);
                    if (isNaN(port) || port < 1 || port > 65535) {
                        input.classList.add('border-red-500');
                    } else {
                        input.classList.add('border-green-500');
                    }
                }
            }
        } else if (routeType === 'http' || routeType === 'https') {
            // HTTP/HTTPS 目标 URL 验证
            if (input.placeholder === '如 http://service.appid.lzcapp:8000') {
                const urlValue = input.value;
                if (urlValue) {
                    try {
                        new URL(urlValue);
                        input.classList.add('border-green-500');
                    } catch {
                        input.classList.add('border-red-500');
                    }
                }
            }
        } else if (routeType === 'static') {
            // 静态文件目录验证
            if (input.placeholder === '如 /lzcapp/pkg/content/dist/') {
                const staticPath = input.value;
                if (staticPath) {
                    // 静态文件路径应该以/lzcapp开头
                    if (staticPath.startsWith('/lzcapp')) {
                        input.classList.add('border-green-500');
                    } else {
                        input.classList.add('border-red-500');
                    }
                }
            }
        } else if (routeType === 'exec') {
            // 执行命令验证
            if (input.placeholder === '如 exec://8000,/lzcapp/pkg/content/bin/backend') {
                const execCommand = input.value;
                if (execCommand) {
                    // 执行命令应该以exec://开头
                    if (execCommand.startsWith('exec://')) {
                        input.classList.add('border-green-500');
                    } else {
                        input.classList.add('border-red-500');
                    }
                }
            }
        }
    }
    
    // 切换路由配置
    toggleRouteConfig(selectElement, routeItem) {
        // 添加空值检查
        if (!selectElement || !routeItem) {
            return;
        }
        
        const routeType = selectElement.value;
        const portConfig = routeItem.querySelector('.port-config');
        
        // 查找所有标签和输入框
        const labels = routeItem.querySelectorAll('label');
        const inputs = routeItem.querySelectorAll('.input-field');
        
        // 确保找到足够的元素
        if (labels.length < 4 || inputs.length < 4) {
            return;
        }
        
        // 获取关键元素，添加空值检查
        const pathLabel = labels[2];
        const pathInput = inputs[2];
        const targetLabel = labels[3];
        const targetInput = inputs[3];
        
        if (!pathLabel || !pathInput || !targetLabel || !targetInput) {
            return;
        }
        
        // 根据LZC SDK manifest.yml格式优化路由配置
        if (routeType === 'port') {
            // TCP/UDP 端口路由
            portConfig.style.display = 'block';
            pathLabel.textContent = '路径';
            pathInput.placeholder = '如 /';
            targetLabel.textContent = '端口号';
            targetInput.placeholder = '如 8080';
            targetInput.value = targetInput.value || '';
        } else if (routeType === 'static') {
            // 静态文件路由
            portConfig.style.display = 'none';
            pathLabel.textContent = '路径';
            pathInput.placeholder = '如 /static/';
            targetLabel.textContent = '静态文件目录';
            targetInput.placeholder = '如 /lzcapp/pkg/content/dist/';
            targetInput.value = targetInput.value || '';
        } else if (routeType === 'exec') {
            // 执行命令路由
            portConfig.style.display = 'none';
            pathLabel.textContent = '路径';
            pathInput.placeholder = '如 /api/';
            targetLabel.textContent = '执行命令';
            targetInput.placeholder = '如 exec://8000,/lzcapp/pkg/content/bin/backend';
            targetInput.value = targetInput.value || '';
        } else {
            // HTTP/HTTPS 路由
            portConfig.style.display = 'none';
            pathLabel.textContent = '路径';
            pathInput.placeholder = '如 /api/';
            targetLabel.textContent = '目标 URL';
            targetInput.placeholder = '如 http://service.appid.lzcapp:8000';
            targetInput.value = targetInput.value || '';
        }
        
        // 触发输入验证，更新样式
        inputs.forEach(input => {
            this.validateRouteInput(input);
        });
    }
    
    // 移除路由配置
    removeRoute(routeId) {
        const routeItem = document.querySelector(`[data-route-id="${routeId}"]`);
        if (routeItem) {
            routeItem.remove();
        }
    }
    
    // 添加环境变量
    addEnvVariable() {
        const container = document.getElementById('env-variables-container');
        const envId = Date.now();
        
        const envHtml = `
            <div class="env-item flex items-center space-x-3" data-env-id="${envId}">
                <input type="text" class="input-field flex-1" placeholder="变量名">
                <input type="text" class="input-field flex-1" placeholder="变量值">
                <button type="button" class="text-danger" onclick="stepManager.removeEnvVariable(${envId})">
                    <i class="fa fa-trash"></i>
                </button>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', envHtml);
    }
    
    // 移除环境变量
    removeEnvVariable(envId) {
        const envItem = document.querySelector(`[data-env-id="${envId}"]`);
        if (envItem) {
            envItem.remove();
        }
    }
    
    // 添加卷挂载
    addVolume() {
        const container = document.getElementById('volumes-container');
        const volumeId = Date.now();
        
        const volumeHtml = `
            <div class="volume-item p-4 border border-gray-200 rounded-lg" data-volume-id="${volumeId}">
                <div class="flex justify-between items-center mb-3">
                    <div class="font-medium">卷挂载配置</div>
                    <button type="button" class="text-danger" onclick="stepManager.removeVolume(${volumeId})">
                        <i class="fa fa-trash"></i>
                    </button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">源路径</label>
                        <input type="text" class="input-field" placeholder="如 ./data">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">目标路径</label>
                        <input type="text" class="input-field" placeholder="如 /app/data">
                    </div>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', volumeHtml);
    }
    
    // 移除卷挂载
    removeVolume(volumeId) {
        const volumeItem = document.querySelector(`[data-volume-id="${volumeId}"]`);
        if (volumeItem) {
            volumeItem.remove();
        }
    }
    
    // 开始转换
    async startConversion() {
        const logContainer = document.getElementById('convert-log');
        logContainer.innerHTML = '<div class="text-gray-500">开始转换...</div>';
        
        // 初始化进度
        let progress = 0;
        const totalSteps = 5;
        
        // 更新进度显示
        const updateProgress = (currentStep, message) => {
            progress = Math.round((currentStep / totalSteps) * 100);
            document.getElementById('progress-percentage').textContent = `${progress}%`;
            document.getElementById('convert-progress-fill').style.width = `${progress}%`;
            this.log(message);
        };
        
        try {
            // 1. 收集配置信息
            updateProgress(1, '正在收集配置信息...');
            const config = configManager.getConfigFromForm();
            
            // 2. 验证配置
            const validation = configManager.validateConfig();
            if (!validation.valid) {
                this.log('<span class="text-danger">配置验证失败：</span>');
                validation.errors.forEach(error => {
                    this.log(`<span class="text-danger">- ${error}</span>`);
                });
                this.showNotification('配置验证失败，请检查输入信息！', 'error');
                return;
            }
            
            // 3. 检查是否有 Docker Compose 文件，如果没有，生成一个
            let composeData = null;
            let composePaths = JSON.parse(localStorage.getItem('composePaths') || '[]');
            
            if (composePaths.length > 0) {
                updateProgress(2, '正在解析所有 Docker Compose 文件...');
                composeData = await this.parseAllComposeFiles();
                // 更新配置中的 composePaths 字段
                config.resources.composePaths = composePaths;
            } else {
                updateProgress(2, '没有 Docker Compose 文件，正在生成...');
                // 生成默认的 docker-compose.yml 文件
                const composePath = await this.generateDefaultComposeFile(config);
                // 将生成的文件添加到配置中
                composePaths = [composePath];
                config.resources.composePaths = composePaths;
                // 保存到 localStorage
                localStorage.setItem('composePaths', JSON.stringify(composePaths));
                localStorage.setItem('composeContents', JSON.stringify({ [composePath]: '' }));
                composeData = await this.parseComposeFile(composePath);
            }
            
            // 4. 调用主进程生成 LPK 包
            updateProgress(3, '正在生成 manifest.yml...');
            updateProgress(4, '正在创建 content.tar...');
            updateProgress(5, '正在打包 LPK 文件...');
            
            // 通过 IPC 调用主进程生成 LPK 包
            const result = await window.electronAPI.generateLpk({ config, composeData });
            
            if (result.success) {
                // 5. 转换完成
                this.log(`<span class="text-success">转换完成！LPK 文件已生成：${result.lpkFileName}</span>`);
                this.log(`<span class="text-success">文件路径：${result.lpkPath}</span>`);
                this.showNotification('转换成功！LPK 文件已生成', 'success');
                
                // 弹出生成目录对话框，询问是否直接访问
                const lpkDirectory = result.lpkPath.substring(0, result.lpkPath.lastIndexOf('\\'));
                await this.showOpenDirectoryDialog(lpkDirectory);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            this.log(`<span class="text-danger">转换失败：${error.message}</span>`);
            console.error('转换失败:', error);
            this.showNotification('转换失败！请检查日志信息。', 'error');
        }
    }
    
    // 生成默认的 docker-compose.yml 文件
    async generateDefaultComposeFile(config) {
        try {
            // 创建默认的 docker-compose.yml 内容
            const defaultComposeContent = `version: '3'

services:
  ${config.app.package.split('.').pop()}:
    build:
      context: .
      dockerfile: ${config.build.dockerfile || 'Dockerfile'}
    ports:
      - "80:80"
    volumes:
      - /lzcapp/var/${config.app.package.split('.').pop()}/data:/app/data
    environment:
      - NODE_ENV=production
`;
            
            // 创建临时 docker-compose.yml 文件
            const tempDir = await window.electronAPI.getSystemInfo().then(info => info.tmpdir);
            const composePath = `${tempDir}/docker-compose-${Date.now()}.yml`;
            
            await window.electronAPI.writeFile({ filePath: composePath, content: defaultComposeContent });
            
            return composePath;
        } catch (error) {
            console.error('生成默认 docker-compose.yml 文件失败:', error);
            throw error;
        }
    }
    
    // 解析 Docker Compose 文件
    async parseComposeFile(filePath) {
        try {
            // 检查文件是否存在且是文件，不是目录
            const isFileResult = await window.electronAPI.isFile(filePath);
            if (!isFileResult.success) {
                throw new Error('检查 Docker Compose 文件失败：' + isFileResult.error);
            }
            if (!isFileResult.isFile) {
                throw new Error('Docker Compose 文件路径必须是一个文件，而不是目录');
            }
            
            const result = await window.electronAPI.readFile(filePath);
            if (!result.success) {
                throw new Error('读取 Docker Compose 文件失败：' + result.error);
            }
            
            // 使用 window.electronAPI 解析 YAML
            const yamlResult = await window.electronAPI.parseYaml(result.content);
            if (!yamlResult.success) {
                throw new Error('解析 Docker Compose 文件失败：' + yamlResult.error);
            }
            
            return yamlResult.data;
        } catch (error) {
            console.error('解析 Docker Compose 文件失败:', error);
            throw error;
        }
    }
    
    // 显示通知
    showNotification(message, type) {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 transition-all duration-300 transform translate-x-full`;
        
        // 设置通知样式
        if (type === 'success') {
            notification.className += ' bg-green-100 border border-green-200 text-green-800';
        } else if (type === 'error') {
            notification.className += ' bg-red-100 border border-red-200 text-red-800';
        } else {
            notification.className += ' bg-blue-100 border border-blue-200 text-blue-800';
        }
        
        // 设置通知内容
        notification.innerHTML = `
            <div class="flex items-center space-x-2">
                <i class="fa fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                <div>${message}</div>
            </div>
        `;
        
        // 添加到页面
        document.body.appendChild(notification);
        
        // 显示通知
        setTimeout(() => {
            notification.classList.remove('translate-x-full');
        }, 100);
        
        // 3秒后隐藏通知
        setTimeout(() => {
            notification.classList.add('translate-x-full');
            // 动画结束后移除元素
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
    
    // 显示打开目录对话框
    async showOpenDirectoryDialog(directory) {
        try {
            // 创建自定义美化对话框
            const dialog = this.createCustomDialog({
                title: '转换成功',
                message: 'LPK 文件已成功生成，是否直接打开生成目录？',
                buttons: [
                    { text: '是', value: 0, primary: true },
                    { text: '否', value: 1 }
                ]
            });
            
            // 显示对话框
            const result = await this.showCustomDialog(dialog);
            
            if (result === 0) {
                // 用户点击了"是"，打开目录
                await window.electronAPI.openDirectory(directory);
            }
        } catch (error) {
            console.error('打开目录失败:', error);
        }
    }
    
    // 创建自定义对话框
    createCustomDialog(options) {
        // 创建对话框容器
        const dialog = document.createElement('div');
        dialog.className = 'custom-dialog fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        
        // 创建对话框内容
        const dialogContent = document.createElement('div');
        dialogContent.className = 'bg-white rounded-lg shadow-xl max-w-md w-full p-6';
        
        // 创建标题
        const title = document.createElement('div');
        title.className = 'text-xl font-semibold text-gray-800 mb-4';
        title.textContent = options.title;
        dialogContent.appendChild(title);
        
        // 创建消息内容
        const message = document.createElement('div');
        message.className = 'text-gray-600 mb-6';
        message.textContent = options.message;
        dialogContent.appendChild(message);
        
        // 创建按钮容器
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex justify-end space-x-3';
        
        // 创建按钮
        options.buttons.forEach(button => {
            const btn = document.createElement('button');
            btn.className = `px-6 py-2 rounded-lg font-medium transition-all duration-200 ${button.primary ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`;
            btn.textContent = button.text;
            btn.dataset.value = button.value;
            buttonContainer.appendChild(btn);
        });
        
        dialogContent.appendChild(buttonContainer);
        dialog.appendChild(dialogContent);
        
        return dialog;
    }
    
    // 显示自定义对话框
    showCustomDialog(dialog) {
        return new Promise((resolve) => {
            // 添加对话框到页面
            document.body.appendChild(dialog);
            
            // 添加按钮事件监听器
            const buttons = dialog.querySelectorAll('button');
            buttons.forEach(button => {
                button.addEventListener('click', () => {
                    const value = parseInt(button.dataset.value);
                    resolve(value);
                    // 移除对话框
                    document.body.removeChild(dialog);
                });
            });
            
            // 添加点击外部关闭事件
            dialog.addEventListener('click', (e) => {
                if (e.target === dialog) {
                    // 点击外部，默认返回取消值
                    resolve(1);
                    document.body.removeChild(dialog);
                }
            });
        });
    }
    
    // 日志输出
    log(message) {
        const logContainer = document.getElementById('convert-log');
        const logItem = document.createElement('div');
        logItem.innerHTML = `[${new Date().toLocaleTimeString()}] ${message}`;
        logContainer.appendChild(logItem);
        logContainer.scrollTop = logContainer.scrollHeight;
    }
}

