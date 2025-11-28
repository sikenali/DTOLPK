// Docker 处理模块
class DockerManager {
    constructor() {
        this.init();
    }
    
    init() {
        // 初始化 Docker 相关配置
    }
    
    // 解析 Docker Compose 文件
    async parseComposeFile(filePath) {
        try {
            // 读取文件内容
            const result = await window.electronAPI.readFile(filePath);
            if (!result.success) {
                throw new Error('无法读取 Docker Compose 文件: ' + result.error);
            }
            
            // 解析 YAML
            const yaml = require('yaml');
            const composeData = yaml.parse(result.content);
            
            // 验证是否是有效的 docker-compose 文件
            if (!composeData.services) {
                throw new Error('选择的文件不是有效的 docker-compose 文件');
            }
            
            return composeData;
        } catch (error) {
            console.error('解析 Docker Compose 文件失败:', error);
            throw error;
        }
    }
    
    // 获取服务列表
    getServices(composeData) {
        if (!composeData.services) {
            return [];
        }
        
        return Object.keys(composeData.services);
    }
    
    // 获取服务配置
    getServiceConfig(composeData, serviceName) {
        if (!composeData.services || !composeData.services[serviceName]) {
            return null;
        }
        
        return composeData.services[serviceName];
    }
    
    // 获取端口映射
    getPortMappings(composeData, serviceName) {
        const service = this.getServiceConfig(composeData, serviceName);
        if (!service || !service.ports) {
            return [];
        }
        
        const portMappings = [];
        
        for (const port of service.ports) {
            let hostPort, containerPort, protocol = 'tcp';
            
            if (typeof port === 'string') {
                // 处理字符串格式，如 "8080:80" 或 "8080:80/tcp"
                const parts = port.split(':');
                if (parts.length === 1) {
                    // 只有容器端口，如 "80"
                    containerPort = parts[0];
                    hostPort = containerPort;
                } else {
                    // 有主机端口和容器端口
                    hostPort = parts[0];
                    containerPort = parts[1];
                }
                
                // 处理协议后缀，如 "/tcp" 或 "/udp"
                if (containerPort.includes('/')) {
                    const containerParts = containerPort.split('/');
                    containerPort = containerParts[0];
                    protocol = containerParts[1];
                }
            } else if (typeof port === 'object') {
                // 处理对象格式
                hostPort = port.published || port.target;
                containerPort = port.target;
                protocol = port.protocol || 'tcp';
            }
            
            portMappings.push({
                hostPort: hostPort,
                containerPort: containerPort,
                protocol: protocol
            });
        }
        
        return portMappings;
    }
    
    // 获取环境变量
    getEnvironmentVariables(composeData, serviceName) {
        const service = this.getServiceConfig(composeData, serviceName);
        if (!service || !service.environment) {
            return [];
        }
        
        const envVars = [];
        
        if (Array.isArray(service.environment)) {
            // 数组格式，如 ["KEY=value", "ANOTHER_KEY=another_value"]
            for (const env of service.environment) {
                if (typeof env === 'string' && env.includes('=')) {
                    const [key, value] = env.split('=', 2);
                    envVars.push({ key, value });
                }
            }
        } else {
            // 对象格式，如 { KEY: "value", ANOTHER_KEY: "another_value" }
            for (const [key, value] of Object.entries(service.environment)) {
                envVars.push({ key, value });
            }
        }
        
        return envVars;
    }
    
    // 获取卷挂载
    getVolumes(composeData, serviceName) {
        const service = this.getServiceConfig(composeData, serviceName);
        if (!service || !service.volumes) {
            return [];
        }
        
        const volumes = [];
        
        for (const volume of service.volumes) {
            let source, target, mode = 'rw';
            
            if (typeof volume === 'string') {
                // 处理字符串格式，如 "./data:/app/data" 或 "my-volume:/app/data:ro"
                const parts = volume.split(':');
                
                if (parts.length === 1) {
                    // 只有目标路径，如 "/app/data"
                    target = parts[0];
                } else if (parts.length === 2) {
                    // 有源路径和目标路径，如 "./data:/app/data"
                    source = parts[0];
                    target = parts[1];
                } else {
                    // 有模式，如 "./data:/app/data:ro"
                    source = parts[0];
                    target = parts[1];
                    mode = parts[2];
                }
            } else if (typeof volume === 'object') {
                // 处理对象格式
                source = volume.source;
                target = volume.target;
                mode = volume.read_only ? 'ro' : 'rw';
            }
            
            volumes.push({
                source: source,
                target: target,
                mode: mode
            });
        }
        
        return volumes;
    }
    
    // 构建镜像
    async buildImage(buildContext, dockerfile, tag) {
        // 这里应该调用 Docker API 或执行 docker build 命令
        // 目前只是模拟实现
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    imageId: `image-${Date.now()}`,
                    tag: tag
                });
            }, 2000);
        });
    }
    
    // 推送镜像
    async pushImage(imageTag, registryUrl) {
        // 这里应该调用 Docker API 或执行 docker push 命令
        // 目前只是模拟实现
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    pushedImage: `${registryUrl}/${imageTag}`
                });
            }, 3000);
        });
    }
    
    // 拉取镜像
    async pullImage(imageTag) {
        // 这里应该调用 Docker API 或执行 docker pull 命令
        // 目前只是模拟实现
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    pulledImage: imageTag
                });
            }, 2000);
        });
    }
    
    // 标记镜像
    async tagImage(sourceTag, targetTag) {
        // 这里应该调用 Docker API 或执行 docker tag 命令
        // 目前只是模拟实现
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve({
                    success: true,
                    taggedImage: targetTag
                });
            }, 1000);
        });
    }
}

// 初始化 Docker 管理器
const dockerManager = new DockerManager();