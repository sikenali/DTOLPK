const { contextBridge, ipcRenderer } = require('electron');

// 存储命令行参数
let commandLineArgs = {};

// 监听命令行参数事件
ipcRenderer.on('command-line-args', (event, args) => {
    commandLineArgs = args;
});

// 使用 contextBridge 安全地暴露 API 到渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 文件选择 API
    selectFile: (options) => ipcRenderer.invoke('select-file', options),
    
    // 保存文件 API
    saveFile: (options) => ipcRenderer.invoke('save-file', options),
    
    // 目录选择 API
    selectDirectory: (options) => ipcRenderer.invoke('select-directory', options),
    
    // 读取文件 API
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    
    // 写入文件 API
    writeFile: (data) => ipcRenderer.invoke('write-file', data),
    
    // 获取文件列表 API
    getFiles: (options) => ipcRenderer.invoke('get-files', options),
    
    // 获取系统信息 API
    getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
    
    // 获取命令行参数
    getCommandLineArgs: () => commandLineArgs,
    
    // 生成 LPK 包 API
    generateLpk: (data) => ipcRenderer.invoke('generate-lpk', data),
    
    // 解析 YAML API
    parseYaml: (content) => ipcRenderer.invoke('parse-yaml', content),
    
    // 检查文件是否存在 API
    isFile: (filePath) => ipcRenderer.invoke('is-file', filePath),
    
    // 显示消息框 API
    showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
    
    // 打开目录 API
    openDirectory: (directoryPath) => ipcRenderer.invoke('open-directory', directoryPath),
    
    // 运行命令 API
    runCommand: (data) => ipcRenderer.invoke('run-command', data)
});

// 暴露必要的 Node.js 模块到渲染进程（仅在需要时）
// 注意：暴露过多模块会降低安全性，只暴露必要的模块
contextBridge.exposeInMainWorld('nodeAPI', {
    // 可以在这里暴露必要的 Node.js API
    // 例如：path, os 等
});