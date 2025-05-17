import { Plugin } from 'obsidian';
import { ListHeatmapSettings } from './settings';
import { ListCountResult } from './listCounter';

export interface CacheData {
    version: string;
    lastUpdated: number;
    settings: {
        diaryFolderPath: string;
        customTitles: string[];
    };
    data: {
        [date: string]: number;
    };
}

export class DataCache {
    private plugin: Plugin;
    private cacheData: CacheData | null = null;
    private readonly CACHE_FILE = 'list-heatmap-cache.json';
    private readonly CACHE_VERSION = '1.0';

    constructor(plugin: Plugin) {
        this.plugin = plugin;
    }

    /**
     * 加载缓存数据
     * @returns 缓存数据
     */
    async loadCache(): Promise<CacheData | null> {
        try {
            // 从插件数据目录加载缓存文件
            const data = await this.plugin.loadData();
            if (data && data.cacheData) {
                this.cacheData = data.cacheData;
                return this.cacheData;
            }
            return null;
        } catch (error) {
            console.error('加载缓存数据失败:', error);
            return null;
        }
    }

    /**
     * 保存缓存数据
     */
    async saveCache(): Promise<void> {
        try {
            if (!this.cacheData) return;
            
            // 获取当前插件数据
            const data = await this.plugin.loadData() || {};
            
            // 更新缓存数据
            data.cacheData = this.cacheData;
            
            // 保存到插件数据
            await this.plugin.saveData(data);
        } catch (error) {
            console.error('保存缓存数据失败:', error);
        }
    }

    /**
     * 更新缓存数据
     * @param listCounts 列表统计结果
     * @param settings 插件设置
     */
    async updateCache(listCounts: ListCountResult, settings: ListHeatmapSettings): Promise<void> {
        // 如果未启用缓存，则不更新
        if (!settings.cacheEnabled) {
            return;
        }

        this.cacheData = {
            version: this.CACHE_VERSION,
            lastUpdated: Date.now(),
            settings: {
                diaryFolderPath: settings.diaryFolderPath,
                customTitles: [...settings.customTitles],
            },
            data: { ...listCounts }
        };

        await this.saveCache();
    }

    /**
     * 获取缓存数据
     * @param settings 当前插件设置
     * @returns 缓存的列表统计结果
     */
    async getCachedData(settings: ListHeatmapSettings): Promise<ListCountResult | null> {
        // 如果未启用缓存，则返回 null
        if (!settings.cacheEnabled) {
            return null;
        }

        // 如果缓存数据为空，尝试加载
        if (!this.cacheData) {
            this.cacheData = await this.loadCache();
        }

        // 如果仍然为空或缓存版本不匹配，返回 null
        if (!this.cacheData || this.cacheData.version !== this.CACHE_VERSION) {
            return null;
        }

        // 检查设置是否变更
        if (
            this.cacheData.settings.diaryFolderPath !== settings.diaryFolderPath ||
            JSON.stringify(this.cacheData.settings.customTitles) !== JSON.stringify(settings.customTitles)
        ) {
            // 设置已变更，缓存无效
            return null;
        }

        return this.cacheData.data;
    }

    /**
     * 清除缓存数据
     */
    async clearCache(): Promise<void> {
        this.cacheData = null;
        
        // 获取当前插件数据
        const data = await this.plugin.loadData() || {};
        
        // 删除缓存数据
        if (data.cacheData) {
            delete data.cacheData;
            await this.plugin.saveData(data);
        }
    }

    /**
     * 检查缓存是否有效
     * @param settings 当前插件设置
     * @returns 缓存是否有效
     */
    async isCacheValid(settings: ListHeatmapSettings): Promise<boolean> {
        // 如果未启用缓存，则缓存无效
        if (!settings.cacheEnabled) {
            return false;
        }

        // 如果缓存数据为空，尝试加载
        if (!this.cacheData) {
            this.cacheData = await this.loadCache();
        }

        // 如果仍然为空或缓存版本不匹配，缓存无效
        if (!this.cacheData || this.cacheData.version !== this.CACHE_VERSION) {
            return false;
        }

        // 检查设置是否变更
        if (
            this.cacheData.settings.diaryFolderPath !== settings.diaryFolderPath ||
            JSON.stringify(this.cacheData.settings.customTitles) !== JSON.stringify(settings.customTitles)
        ) {
            // 设置已变更，缓存无效
            return false;
        }

        return true;
    }

    /**
     * 获取缓存最后更新时间
     * @returns 最后更新时间的时间戳，如果没有缓存则返回 null
     */
    getLastUpdated(): number | null {
        return this.cacheData ? this.cacheData.lastUpdated : null;
    }
}
