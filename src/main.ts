import { App, Plugin, PluginSettingTab, Setting, TFile, TFolder, WorkspaceLeaf } from 'obsidian';
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
		await this.loadSettings();

		// 初始化各模块
		this.fileParser = new FileParser(this.app);
		this.listCounter = new ListCounter();
		this.dataCache = new DataCache(this);

		// 注册视图
		this.registerView(
			VIEW_TYPE_HEATMAP,
			(leaf) => new HeatmapView(leaf, this)
		);

		// 添加侧边栏图标
		this.addRibbonIcon('calendar-with-checkmark', '列表热图', () => {
			this.activateView();
		});

		// 添加命令
		this.addCommand({
			id: 'refresh-list-heatmap',
			name: '刷新列表热图',
			callback: () => {
				this.refreshData();
			},
		});

		// 添加设置选项卡
		this.addSettingTab(new ListHeatmapSettingTab(this.app, this));

		// 初始加载数据
		this.loadData();
	}

	onunload() {
		this.app.workspace.detachLeavesOfType(VIEW_TYPE_HEATMAP);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async refreshData() {
		// 获取日记文件
		const diaryFiles = await this.fileParser.getDiaryFiles(this.settings.diaryFolderPath);
		
		// 统计列表数量
		const listCounts = await this.listCounter.countLists(
			diaryFiles, 
			this.settings.customTitles
		);
		
		// 更新缓存
		await this.dataCache.updateCache(listCounts, this.settings);
		
		// 刷新视图
		this.refreshView();
	}

	async activateView() {
		const { workspace } = this.app;
		
		// 检查是否已有视图
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_HEATMAP)[0];
		
		if (!leaf) {
			// 创建新的侧边栏视图
			leaf = workspace.getRightLeaf(false);
			await leaf.setViewState({
				type: VIEW_TYPE_HEATMAP,
				active: true,
			});
		}
		
		// 激活视图
		workspace.revealLeaf(leaf);
	}

	refreshView() {
		// 刷新所有热图视图
		const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_HEATMAP);
		for (const leaf of leaves) {
			if (leaf.view instanceof HeatmapView) {
				leaf.view.refresh();
			}
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

		containerEl.createEl('h2', { text: '列表热图设置' });

		// 日记文件夹路径设置
		new Setting(containerEl)
			.setName('日记文件夹路径')
			.setDesc('指定包含日记文件的文件夹路径')
			.addText(text => text
				.setPlaceholder('例如: 日记/')
				.setValue(this.plugin.settings.diaryFolderPath)
				.onChange(async (value) => {
					// 如果路径变更，清除缓存
					if (value !== this.plugin.settings.diaryFolderPath) {
						await this.plugin.dataCache.clearCache();
					}
					this.plugin.settings.diaryFolderPath = value;
					await this.plugin.saveSettings();
				}));

		// 自定义标题设置
		new Setting(containerEl)
			.setName('统计标题')
			.setDesc('指定要统计无序列表的标题（用逗号分隔多个标题）')
			.addText(text => text
				.setPlaceholder('例如: 今日任务, 待办事项')
				.setValue(this.plugin.settings.customTitles.join(', '))
				.onChange(async (value) => {
					const newTitles = value.split(',').map(t => t.trim()).filter(t => t);
					// 如果标题变更，清除缓存
					if (JSON.stringify(newTitles) !== JSON.stringify(this.plugin.settings.customTitles)) {
						await this.plugin.dataCache.clearCache();
					}
					this.plugin.settings.customTitles = newTitles;
					await this.plugin.saveSettings();
				}));

		// 热图颜色范围设置
		new Setting(containerEl)
			.setName('热图颜色设置')
			.setDesc('设置热图颜色范围（格式：1-5:#FF6B6B,6-10:#FF8E8E,...）')
			.addText(text => text
				.setPlaceholder('例如: 1-5:#FF6B6B,6-10:#FF8E8E,11-15:#FFA5A5,16-20:#FFC7C7,21+:#FFE8E8')
				.setValue(this.plugin.settings.colorRanges.map(range => 
					`${range.min}-${range.max === Number.MAX_SAFE_INTEGER ? '+' : range.max}:${range.color}`
				).join(','))
				.onChange(async (value) => {
					try {
						const ranges = value.split(',').map(range => {
							const [rangeStr, color] = range.split(':');
							let min = 1, max = Number.MAX_SAFE_INTEGER;
							
							if (rangeStr.includes('-')) {
								const [minStr, maxStr] = rangeStr.split('-');
								min = parseInt(minStr.trim());
								max = maxStr.trim() === '+' ? Number.MAX_SAFE_INTEGER : parseInt(maxStr.trim());
							} else {
								min = max = parseInt(rangeStr.trim());
							}
							
							return { min, max, color: color.trim() };
						});
						
						this.plugin.settings.colorRanges = ranges;
						await this.plugin.saveSettings();
						this.plugin.refreshView();
					} catch (e) {
						console.error('颜色范围格式错误', e);
					}
				}));

		// 默认视图设置
		new Setting(containerEl)
			.setName('默认视图')
			.setDesc('设置热图默认显示的时间范围')
			.addDropdown(dropdown => dropdown
				.addOption('year', '年视图')
				.addOption('month', '月视图')
				.setValue(this.plugin.settings.defaultView)
				.onChange(async (value: 'year' | 'month') => {
					this.plugin.settings.defaultView = value;
					await this.plugin.saveSettings();
					this.plugin.refreshView();
				}));

		// 缓存设置
		new Setting(containerEl)
			.setName('启用缓存')
			.setDesc('启用数据缓存以提高性能')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.cacheEnabled)
				.onChange(async (value) => {
					this.plugin.settings.cacheEnabled = value;
					if (!value) {
						await this.plugin.dataCache.clearCache();
					}
					await this.plugin.saveSettings();
				}));

		// 手动刷新按钮
		new Setting(containerEl)
			.setName('刷新数据')
			.setDesc('手动刷新列表统计数据')
			.addButton(button => button
				.setButtonText('刷新')
				.onClick(async () => {
					await this.plugin.refreshData();
				}));
	}
}
