import { App, TFile, TFolder } from 'obsidian';

export class FileParser {
    private app: App;

    constructor(app: App) {
        this.app = app;
    }

    /**
     * Get diary files from the specified folder path
     * @param folderPath Path to the diary folder
     * @returns Array of diary files
     */
    async getDiaryFiles(folderPath: string): Promise<TFile[]> {
        // Get folder
        const folder = this.app.vault.getAbstractFileByPath(folderPath);
        if (!folder || !(folder instanceof TFolder)) {
            return [];
        }

        // Filter diary files (YYYY-MM-DD.md format)
        const diaryFiles = folder.children
            .filter(file => 
                file instanceof TFile && 
                file.extension === 'md' &&
                this.isDiaryFilename(file.basename)
            ) as TFile[];

        return diaryFiles;
    }

    /**
     * Check if a filename matches the diary format (YYYY-MM-DD)
     * @param filename Filename to check
     * @returns Whether the filename is in diary format
     */
    private isDiaryFilename(filename: string): boolean {
        // Check if filename matches YYYY-MM-DD format
        return /^\d{4}-\d{2}-\d{2}$/.test(filename);
    }

    /**
     * Read file content
     * @param file File to read
     * @returns File content as string
     */
    async readFileContent(file: TFile): Promise<string> {
        return await this.app.vault.read(file);
    }
}
