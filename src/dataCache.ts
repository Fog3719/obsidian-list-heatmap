import { Plugin } from 'obsidian';
import { ListHeatmapSettings } from './settings';

export class DataCache {
    private plugin: Plugin;
    private lastUpdated: number | null = null;

    constructor(plugin: Plugin) {
        this.plugin = plugin;
    }

    /**
     * Update cache with new data
     * @param data Data to cache
     * @param settings Current settings
     */
    async updateCache(data: any, settings: ListHeatmapSettings): Promise<void> {
        // Create cache object
        const cache = {
            cacheData: data,
            cacheSettings: {
                diaryFolderPath: settings.diaryFolderPath,
                customTitles: settings.customTitles
            },
            cacheLastUpdated: Date.now()
        };
        
        // Save to separate cache file using Obsidian's adapter API
        const cacheFilePath = '.obsidian-list-heatmap-cache.json';
        await this.plugin.app.vault.adapter.write(
            cacheFilePath,
            JSON.stringify(cache, null, 2)
        );
        
        // Update last updated timestamp
        this.lastUpdated = cache.cacheLastUpdated;
    }

    /**
     * Get cached data if valid
     * @param settings Current settings
     * @returns Cached data or null if invalid
     */
    async getCachedData(settings: ListHeatmapSettings): Promise<any | null> {
        try {
            // Load cache from separate cache file
            const cacheFilePath = '.obsidian-list-heatmap-cache.json';
            const cacheContent = await this.plugin.app.vault.adapter.read(cacheFilePath);
            const cache = JSON.parse(cacheContent);
            
            // Check if cache exists
            if (!cache || !cache.cacheData) {
                return null;
            }
            
            // Check if settings have changed
            if (
                cache.cacheSettings.diaryFolderPath !== settings.diaryFolderPath ||
                JSON.stringify(cache.cacheSettings.customTitles) !== JSON.stringify(settings.customTitles)
            ) {
                return null;
            }
            
            // Update last updated timestamp
            this.lastUpdated = cache.cacheLastUpdated;
            
            // Return cached data
            return cache.cacheData;
        } catch (error) {
            console.log('List Heatmap: Error loading cache', error);
            return null;
        }
    }

    /**
     * Clear cache
     */
    async clearCache(): Promise<void> {
        try {
            const cacheFilePath = '.obsidian-list-heatmap-cache.json';
            await this.plugin.app.vault.adapter.write(
                cacheFilePath,
                JSON.stringify({}, null, 2)
            );
            this.lastUpdated = null;
        } catch (error) {
            console.log('List Heatmap: Error clearing cache', error);
        }
    }

    /**
     * Get last updated timestamp
     * @returns Last updated timestamp or null if not available
     */
    getLastUpdated(): number | null {
        return this.lastUpdated;
    }
}
