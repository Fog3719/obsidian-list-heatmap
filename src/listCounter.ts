import { TFile } from 'obsidian';
import { FileParser } from './fileParser';

export interface ListCountResult {
    [date: string]: number;
}

export class ListCounter {
    private fileParser: FileParser;

    constructor() {
        // FileParser 将在使用时由主插件类提供
    }

    /**
     * 统计文件中特定标题下的无序列表数量
     * @param files 日记文件列表
     * @param titles 要统计的标题列表
     * @returns 按日期统计的列表数量
     */
    async countLists(files: TFile[], titles: string[]): Promise<ListCountResult> {
        const result: ListCountResult = {};
        
        // 如果没有指定标题，返回空结果
        if (!titles || titles.length === 0) {
            return result;
        }
        
        // 遍历所有文件
        for (const file of files) {
            try {
                // 获取文件日期
                const date = this.fileParser.getFileDate(file);
                
                // 读取文件内容
                const content = await this.fileParser.parseFile(file);
                
                // 解析文件内容
                const parsedContent = this.fileParser.parseContent(content);
                
                // 统计指定标题下的无序列表数量
                let count = 0;
                for (const title of titles) {
                    if (parsedContent[title]) {
                        count += parsedContent[title].length;
                    }
                }
                
                // 记录结果
                result[date] = count;
            } catch (error) {
                console.error(`处理文件 ${file.name} 时出错:`, error);
            }
        }
        
        return result;
    }

    /**
     * 设置文件解析器
     * @param parser 文件解析器实例
     */
    setFileParser(parser: FileParser) {
        this.fileParser = parser;
    }
}
