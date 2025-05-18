import { TFile } from 'obsidian';
import { FileParser } from './fileParser';

export interface ListCountResult {
    [date: string]: number;
}

export class ListCounter {
    private fileParser: FileParser | null = null;

    /**
     * Set the file parser
     * @param fileParser File parser instance
     */
    setFileParser(fileParser: FileParser): void {
        this.fileParser = fileParser;
    }

    /**
     * Count unordered lists under specified titles in diary files
     * @param files Array of diary files
     * @param titles Array of titles to count lists under
     * @returns Object with dates as keys and list counts as values
     */
    async countLists(files: TFile[], titles: string[]): Promise<ListCountResult> {
        if (!this.fileParser) {
            throw new Error('File parser not set');
        }

        const result: ListCountResult = {};

        // Process each file
        for (const file of files) {
            // Get date from filename
            const date = file.basename;
            
            // Read file content
            const content = await this.fileParser.readFileContent(file);
            
            // Count lists under specified titles
            const count = this.countListsInContent(content, titles);
            
            // Store result
            result[date] = count;
        }

        return result;
    }

    /**
     * Count unordered lists under specified titles in content
     * @param content File content
     * @param titles Array of titles to count lists under
     * @returns Total count of list items
     */
    private countListsInContent(content: string, titles: string[]): number {
        let totalCount = 0;
        
        // Process each title
        for (const title of titles) {
            // Find title in content
            const titleRegex = new RegExp(`#+\\s+${this.escapeRegExp(title)}`, 'i');
            const titleMatch = content.match(titleRegex);
            
            if (titleMatch && titleMatch.index !== undefined) {
                // Get title position
                const titlePos = titleMatch.index;
                
                // Find next title or end of content
                const nextTitleMatch = content.slice(titlePos + 1).match(/#+\s+/);
                const nextTitlePos = nextTitleMatch && nextTitleMatch.index !== undefined
                    ? titlePos + 1 + nextTitleMatch.index 
                    : content.length;
                
                // Get content between titles
                const sectionContent = content.slice(titlePos, nextTitlePos);
                
                // Count unordered list items
                const listItemRegex = /^\s*-\s+/gm;
                const listItems = sectionContent.match(listItemRegex);
                
                // Add to total count
                if (listItems) {
                    totalCount += listItems.length;
                }
            }
        }
        
        return totalCount;
    }

    /**
     * Escape special characters in string for use in regex
     * @param string String to escape
     * @returns Escaped string
     */
    private escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
