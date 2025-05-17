import { App, TFile, TFolder } from 'obsidian';

export class FileParser {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * 获取指定路径下的日记文件
     * @param folderPath 日记文件夹路径
     * @returns 日记文件列表
     */
    async getDiaryFiles(folderPath: string): Promise<TFile[]> {
        // 获取文件夹
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!folder || !(folder instanceof TFolder)) {
            console.error(`路径 ${folderPath} 不是有效的文件夹`);
            return [];
        }

        // 获取所有文件
        const files = folder.children
            .filter(file => file instanceof TFile && file.extension === 'md')
            .map(file => file as TFile)
            // 筛选符合日记命名格式的文件 (YYYY-MM-DD)
            .filter(file => /^\d{4}-\d{2}-\d{2}\.md$/.test(file.name));

        return files;
    }

    /**
     * 解析文件内容
     * @param file 文件对象
     * @returns 文件内容
     */
    async parseFile(file: TFile): Promise<string> {
        return await this.app.vault.read(file);
    }

    /**
     * 解析文件内容中的标题和列表
     * @param content 文件内容
     * @returns 解析结果，包含标题和标题下的列表
     */
    parseContent(content: string): { [title: string]: string[] } {
        const result: { [title: string]: string[] } = {};
        const lines = content.split('\n');
        
        let currentTitle = '';
        let inTitle = false;
        
        for (const line of lines) {
            // 检查是否是标题行
            const titleMatch = line.match(/^(#{1,6})\s+(.+)$/);
            if (titleMatch) {
                currentTitle = titleMatch[2].trim();
                inTitle = true;
                result[currentTitle] = [];
                continue;
            }
            
            // 如果在标题下，检查是否是无序列表项
            if (inTitle) {
                const listItemMatch = line.match(/^(\s*)-\s+(.+)$/);
                if (listItemMatch) {
                    // 只统计直接位于标题下的无序列表，不包括子标题下的列表
                    result[currentTitle].push(listItemMatch[2].trim());
                } else if (line.match(/^#{1,6}\s+/)) {
                    // 如果遇到新标题，结束当前标题的统计
                    inTitle = false;
                }
            }
        }
        
        return result;
    }

    /**
     * 获取文件的创建日期
     * @param file 文件对象
     * @returns 日期字符串 (YYYY-MM-DD)
     */
    getFileDate(file: TFile): string {
        // 从文件名中提取日期 (YYYY-MM-DD)
        const dateMatch = file.name.match(/^(\d{4}-\d{2}-\d{2})\.md$/);
        if (dateMatch) {
            return dateMatch[1];
        }
        
        // 如果文件名不符合格式，使用文件创建时间
        const date = new Date(file.stat.ctime);
        return date.toISOString().split('T')[0];
    }
}
