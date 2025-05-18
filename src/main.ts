import { App, Plugin, PluginSettingTab, Setting, TFile, TFolder, WorkspaceLeaf, ColorComponent } from 'obsidian';
import { ListHeatmapSettings, DEFAULT_SETTINGS } from './settings';
import { FileParser } from './fileParser';
import { ListCounter } from './listCounter';
import { DataCache } from './dataCache';
import { HeatmapView, VIEW_TYPE_HEATMAP } from './heatmapView';

export default class ListHeatmapPlugin extends Plugin {
	settings: ListHeatmapSettings;
	fileParser: FileParser;
	listCounter: ListCounter;
	dataCache: DataCache;

	async onload() {
		// Load settings first before initializing other components
		await this.loadSettings();

		// Initialize modules
		this.fileParser = new FileParser(this.app);
		this.listCounter = new ListCounter();
		this.dataCache = new DataCache(this);
		
		// Set file parser
		this.listCounter.setFileParser(this.fileParser);

		// Register view
		this.registerView(
			VIEW_TYPE_HEATMAP,
			(leaf) => new HeatmapView(leaf, this)
		);

		// Add sidebar icon
		this.addRibbonIcon('calendar-with-checkmark', 'List Heatmap', () => {
			this.activateView();
		});

		// Add commands
		this.addCommand({
			id: 'refresh-list-heatmap',
			name: 'Refresh List Heatmap',
			callback: () => {
				this.refreshData();
			},
		});

		// Add settings tab
		this.addSettingTab(new ListHeatmapSettingTab(this.app, this));
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_HEATMAP);
	}

	async loadSettings() {
		// Load saved data with explicit key
		const savedData = await this.loadData();
		
		// Merge with default settings, ensuring all required fields exist
		this.settings = Object.assign({}, DEFAULT_SETTINGS, savedData || {});
		
		// Log loaded settings for debugging
		console.log('List Heatmap: Settings loaded', this.settings);
	}

	async saveSettings() {
		// Save settings with explicit key
		await this.saveData(this.settings);
		console.log('List Heatmap: Settings saved', this.settings);
	}

	async refreshData() {
		// Get diary files
		const diaryFiles = await this.fileParser.getDiaryFiles(this.settings.diaryFolderPath);
		
		// Count lists
		const listCounts = await this.listCounter.countLists(
			diaryFiles, 
			this.settings.customTitles
		);
		
		// Update cache
		await this.dataCache.updateCache(listCounts, this.settings);
		
		// Refresh view
		this.refreshView();
	}

	async activateView() {
		const { workspace } = this.app;
		
		// Check if view already exists
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_HEATMAP)[0];
		
		if (!leaf) {
			// Create new sidebar view
			const rightLeaf = workspace.getRightLeaf(false);
			if (rightLeaf) {
				leaf = rightLeaf;
				await leaf.setViewState({
					type: VIEW_TYPE_HEATMAP,
					active: true,
				});
			}
		}
		
		// Activate view
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}

	refreshView() {
		// Refresh all heatmap views
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_HEATMAP);
		for (const leaf of leaves) {
			if (leaf.view instanceof HeatmapView) {
				leaf.view.refresh();
			}
		}
	}
	
	// Get diary filename
	getDiaryFilename(date: string): string | undefined {
		// Build possible filename format
		const possibleFilename = `${date}.md`;
		
		// Get diary folder
		const folder = this.app.vault.getAbstractFileByPath(this.settings.diaryFolderPath);
		if (!folder || !(folder instanceof TFolder)) {
			return undefined;
		}
		
		// Find matching file
		const file = folder.children.find(file => 
			file instanceof TFile && file.name === possibleFilename
		);
		
		return file ? file.path : undefined;
	}
	
	// Open diary file
	openDiaryFile(filePath: string): void {
		const file = this.app.vault.getAbstractFileByPath(filePath);
		if (file instanceof TFile) {
			this.app.workspace.getLeaf().openFile(file);
		}
	}
}

class ListHeatmapSettingTab extends PluginSettingTab {
	plugin: ListHeatmapPlugin;

	constructor(app: App, plugin: ListHeatmapPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		containerEl.createEl('h2', { text: 'List Heatmap Settings' });

		// Diary folder path setting
		new Setting(containerEl)
			.setName('Diary Folder Path')
			.setDesc('Specify the folder path containing diary files')
			.addText(text => text
				.setPlaceholder('Example: Diary/')
				.setValue(this.plugin.settings.diaryFolderPath)
				.onChange(async (value) => {
					// If path changes, clear cache
					if (value !== this.plugin.settings.diaryFolderPath) {
						await this.plugin.dataCache.clearCache();
					}
					this.plugin.settings.diaryFolderPath = value;
					await this.plugin.saveSettings();
				}));

		// Custom titles setting
		new Setting(containerEl)
			.setName('Count Titles')
			.setDesc('Specify titles under which to count unordered lists (separate multiple titles with commas)')
			.addText(text => text
				.setPlaceholder('Example: Daily Tasks, To-Do Items')
				.setValue(this.plugin.settings.customTitles.join(', '))
				.onChange(async (value) => {
					const newTitles = value.split(',').map(t => t.trim()).filter(t => t);
					// If titles change, clear cache
					if (JSON.stringify(newTitles) !== JSON.stringify(this.plugin.settings.customTitles)) {
						await this.plugin.dataCache.clearCache();
					}
					this.plugin.settings.customTitles = newTitles;
					await this.plugin.saveSettings();
				}));

		// Heatmap color range settings - using table layout
		containerEl.createEl('h3', { text: 'Heatmap Color Settings' });
		
		// Create color settings table
		const colorTable = containerEl.createEl('table', { cls: 'list-heatmap-color-table' });
		const headerRow = colorTable.createEl('tr');
		headerRow.createEl('th', { text: 'List Count Range' });
		headerRow.createEl('th', { text: 'Color' });
		
		// Add existing color ranges
		this.plugin.settings.colorRanges.forEach((range, index) => {
			this.addColorRangeRow(colorTable, range, index);
		});
		
		// Add button row
		const buttonRow = colorTable.createEl('tr');
		const buttonCell = buttonRow.createEl('td', { attr: { colspan: '2' } });
		
		// Add new range button
		const addButton = buttonCell.createEl('button', { 
			text: 'Add New Range',
			cls: 'list-heatmap-add-range-btn'
		});
		addButton.addEventListener('click', async () => {
			const newRange = { 
				min: this.plugin.settings.colorRanges.length > 0 ? 
					this.plugin.settings.colorRanges[this.plugin.settings.colorRanges.length - 1].max + 1 : 1, 
				max: this.plugin.settings.colorRanges.length > 0 ? 
					this.plugin.settings.colorRanges[this.plugin.settings.colorRanges.length - 1].max + 5 : 5, 
				color: '#FFE8E8' 
			};
			this.plugin.settings.colorRanges.push(newRange);
			this.addColorRangeRow(colorTable, newRange, this.plugin.settings.colorRanges.length - 1);
			await this.plugin.saveSettings();
			this.plugin.refreshView();
		});

		// Default view setting
		new Setting(containerEl)
			.setName('Default View')
			.setDesc('Set the default time range for the heatmap display')
			.addDropdown(dropdown => dropdown
				.addOption('year', 'Year View')
				.addOption('month', 'Month View')
				.setValue(this.plugin.settings.defaultView)
				.onChange(async (value: 'year' | 'month') => {
					this.plugin.settings.defaultView = value;
					await this.plugin.saveSettings();
					this.plugin.refreshView();
				}));

		// Cache setting
		new Setting(containerEl)
			.setName('Enable Cache')
			.setDesc('Enable data caching to improve performance')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.cacheEnabled)
				.onChange(async (value) => {
					this.plugin.settings.cacheEnabled = value;
					if (!value) {
						await this.plugin.dataCache.clearCache();
					}
					await this.plugin.saveSettings();
				}));

		// Manual refresh button
		new Setting(containerEl)
			.setName('Refresh Data')
			.setDesc('Manually refresh list count data')
			.addButton(button => button
				.setButtonText('Refresh')
				.onClick(async () => {
					await this.plugin.refreshData();
				}));
	}
	
	// Add color range row
	private addColorRangeRow(table: HTMLTableElement, range: {min: number, max: number, color: string}, index: number): void {
		const row = table.createEl('tr');
		
		// Range input cell
		const rangeCell = row.createEl('td');
		const minInput = rangeCell.createEl('input', { 
			type: 'number',
			value: range.min.toString(),
			cls: 'list-heatmap-range-input'
		});
		rangeCell.createSpan({ text: ' - ' });
		
		const maxInput = rangeCell.createEl('input', { 
			type: 'number',
			value: range.max === Number.MAX_SAFE_INTEGER ? '' : range.max.toString(),
			placeholder: '+',
			cls: 'list-heatmap-range-input'
		});
		
		// Color picker cell
		const colorCell = row.createEl('td');
		const colorPreview = colorCell.createEl('span', { 
			cls: 'list-heatmap-color-preview',
			attr: { style: `background-color: ${range.color}` }
		});
		
		const colorInput = colorCell.createEl('input', { 
			cls: 'list-heatmap-color-input',
			type: 'text',
			value: range.color
		});
		
		// Create color picker
		const colorPicker = new ColorComponent(colorCell);
		colorPicker.setValue(range.color);
		colorPicker.onChange(async (value) => {
			this.plugin.settings.colorRanges[index].color = value;
			colorPreview.style.backgroundColor = value;
			colorInput.value = value;
			await this.plugin.saveSettings();
			this.plugin.refreshView();
		});
		
		// Delete button
		const deleteBtn = colorCell.createEl('button', { 
			text: 'Delete',
			cls: 'list-heatmap-delete-range-btn'
		});
		deleteBtn.addEventListener('click', async () => {
			this.plugin.settings.colorRanges.splice(index, 1);
			row.remove();
			await this.plugin.saveSettings();
			this.plugin.refreshView();
			// Redisplay settings panel to update indices
			this.display();
		});
		
		// Listen for range input changes
		minInput.addEventListener('change', async () => {
			const min = parseInt(minInput.value);
			if (!isNaN(min)) {
				this.plugin.settings.colorRanges[index].min = min;
				await this.plugin.saveSettings();
				this.plugin.refreshView();
			}
		});
		
		maxInput.addEventListener('change', async () => {
			const max = maxInput.value ? parseInt(maxInput.value) : Number.MAX_SAFE_INTEGER;
			if (!isNaN(max)) {
				this.plugin.settings.colorRanges[index].max = max;
				await this.plugin.saveSettings();
				this.plugin.refreshView();
			}
		});
		
		// Listen for color input changes
		colorInput.addEventListener('change', async () => {
			this.plugin.settings.colorRanges[index].color = colorInput.value;
			colorPreview.style.backgroundColor = colorInput.value;
			colorPicker.setValue(colorInput.value);
			await this.plugin.saveSettings();
			this.plugin.refreshView();
		});
	}
}
