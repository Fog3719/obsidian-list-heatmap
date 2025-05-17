export interface ListHeatmapSettings {
    diaryFolderPath: string;          // 日记文件夹路径
    customTitles: string[];           // 用户自定义标题
    colorRanges: {                    // 热图颜色范围
        min: number;
        max: number;
        color: string;
    }[];
    defaultView: 'year' | 'month';    // 默认视图
    cacheEnabled: boolean;            // 是否启用缓存
}

export const DEFAULT_SETTINGS: ListHeatmapSettings = {
    diaryFolderPath: '日记/',
    customTitles: ['今日任务', '待办事项'],
    colorRanges: [
        { min: 1, max: 5, color: '#FFE8E8' },
        { min: 6, max: 10, color: '#FFC7C7' },
        { min: 11, max: 15, color: '#FFA5A5' },
        { min: 16, max: 20, color: '#FF8E8E' },
        { min: 21, max: Number.MAX_SAFE_INTEGER, color: '#FF6B6B' }
    ],
    defaultView: 'year',
    cacheEnabled: true
};
