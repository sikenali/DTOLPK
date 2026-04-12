/**
 * 环境变量处理工具模块
 * 支持 ${VAR}、${VAR:-default} 格式的环境变量替换
 * 同时支持 .env 文件加载
 */

(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        // Node.js 环境
        module.exports = factory();
    } else {
        // 浏览器环境
        root.EnvUtils = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {

    /**
     * 处理字符串中的环境变量占位符
     * 支持格式：
     *   ${VAR}          - 替换为环境变量值，未设置则为空字符串
     *   ${VAR:-default} - 替换为环境变量值，未设置则使用默认值
     * 
     * @param {string} str - 包含环境变量占位符的字符串
     * @param {Object} envConfig - 环境变量配置对象（可选，默认使用 process.env）
     * @returns {string} - 替换后的字符串
     */
    function processEnvVariables(str, envConfig) {
        if (typeof str !== 'string' || !str.includes('${')) {
            return str;
        }

        const env = envConfig || (typeof process !== 'undefined' ? process.env : {});

        // 匹配 ${VAR} 或 ${VAR:-default} 格式
        const regex = /\$\{([^}:]+)(?::-([^}]*))?\}/g;

        return str.replace(regex, (match, varName, defaultValue) => {
            const value = env[varName];
            if (value !== undefined && value !== '') {
                // 尝试进行类型转换
                return tryConvertType(value);
            }
            if (defaultValue !== undefined) {
                return tryConvertType(defaultValue);
            }
            return '';
        });
    }

    /**
     * 尝试将字符串值转换为合适的类型
     * 注意：环境变量在 Docker/Compose 中通常是纯字符串，
     * 此处仅对明确的布尔值和纯数字进行转换。
     * 字符串 "0" 不会被转换为数字 0（避免 PORT=0 问题）。
     */
    function tryConvertType(value) {
        if (typeof value !== 'string') return value;

        // 尝试转换为布尔值（优先于数字转换）
        if (value === 'true') return true;
        if (value === 'false') return false;

        // 仅对大于 0 的纯数字字符串进行转换，避免 "0" 被转换
        if (/^[1-9]\d*$/.test(value)) {
            return parseInt(value, 10);
        }

        return value;
    }

    /**
     * 加载 .env 文件和 env_file 配置
     * 
     * @param {string} executionDir - 执行目录路径
     * @param {Array} envFiles - env_file 配置数组（可选）
     * @returns {Object} - 合并后的环境变量对象
     */
    function loadEnvFiles(executionDir, envFiles) {
        // 仅在 Node.js 环境中执行（渲染进程中调用将返回空对象）
        if (typeof require === 'undefined') {
            console.warn('loadEnvFiles 只能在 Node.js 环境中调用');
            return {};
        }

        const env = {};

        // 获取 dotenv 模块
        let dotenv;
        try {
            dotenv = require('dotenv');
        } catch (e) {
            console.warn('无法加载 dotenv 模块:', e.message);
            return {};
        }

        // 加载执行目录下的 .env 文件
        if (dotenv) {
            const path = require('path');
            const fs = require('fs');
            const envPath = path.join(executionDir, '.env');
            if (fs.existsSync(envPath)) {
                const parsed = dotenv.parse(fs.readFileSync(envPath));
                Object.assign(env, parsed);
            }
        }

        // 加载 env_file 配置
        if (Array.isArray(envFiles)) {
            const fs = typeof require !== 'undefined' ? require('fs') : null;
            const path = typeof require !== 'undefined' ? require('path') : null;

            for (const envFile of envFiles) {
                if (!fs || !path) break;

                // 处理环境变量替换
                const resolvedFile = processEnvVariables(envFile, { ...process.env, ...env });

                // 解析路径
                let filePath = resolvedFile;
                if (!path.isAbsolute(filePath)) {
                    filePath = path.resolve(executionDir, filePath);
                }

                // 读取并解析 env 文件
                try {
                    if (fs.existsSync(filePath)) {
                        const parsed = dotenv ? dotenv.parse(fs.readFileSync(filePath)) : parseEnvFile(fs.readFileSync(filePath, 'utf8'));
                        Object.assign(env, parsed);
                    }
                } catch (error) {
                    console.warn(`警告: 读取环境变量文件 ${filePath} 失败:`, error.message);
                }
            }
        }

        // 合并系统环境变量
        if (typeof process !== 'undefined' && process.env) {
            Object.assign(env, process.env);
        }

        return env;
    }

    /**
     * 简易的 .env 文件解析（fallback，当 dotenv 不可用时）
     */
    function parseEnvFile(content) {
        const env = {};
        const lines = content.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            // 跳过空行和注释
            if (!trimmed || trimmed.startsWith('#')) continue;

            // 支持 KEY=VALUE 和 KEY="VALUE" 和 KEY='VALUE' 格式
            const match = trimmed.match(/^([^=]+)=(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();

                // 移除引号
                if ((value.startsWith('"') && value.endsWith('"')) ||
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }

                env[key] = value;
            }
        }

        return env;
    }

    return {
        processEnvVariables,
        loadEnvFiles,
        parseEnvFile,
        tryConvertType
    };

});
