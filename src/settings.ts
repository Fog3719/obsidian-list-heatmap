export interface ListHeatmapSettings {
    diaryFolderPath: string;          // Diary folder path
    customTitles: string[];           // Custom headings
    colorRanges: {                    // Heatmap color ranges
        min: number;
        max: number;
        color: string;
    }[];
    defaultView: 'year' | 'month';    // Default view
    cacheEnabled: boolean;            // Enable cache
}

export const DEFAULT_SETTINGS: ListHeatmapSettings = {
    diaryFolderPath: 'diary/',
    customTitles: ['Today\'s tasks', 'Todo items'],
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
