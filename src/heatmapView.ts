import { ItemView, WorkspaceLeaf } from 'obsidian';
import { ListHeatmapSettings } from './settings';
import ListHeatmapPlugin from './main';
import { ListCountResult } from './listCounter';
import * as d3 from 'd3';

export const VIEW_TYPE_HEATMAP = 'list-heatmap-view';

export class HeatmapView extends ItemView {
    private plugin: ListHeatmapPlugin;
    private contentEl: HTMLElement;
    private heatmapContainer: HTMLElement;
    private controlsContainer: HTMLElement;
    private currentView: 'year' | 'month';
    private currentYear: number;
    private currentMonth: number;

    constructor(leaf: WorkspaceLeaf, plugin: ListHeatmapPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.currentView = this.plugin.settings.defaultView;
        
        const now = new Date();
        this.currentYear = now.getFullYear();
        this.currentMonth = now.getMonth() + 1;
    }

    getViewType(): string {
        return VIEW_TYPE_HEATMAP;
    }

    getDisplayText(): string {
        return '列表热图';
    }

    async onOpen(): Promise<void> {
        // 创建视图容器
        this.contentEl = this.containerEl.children[1].createDiv({ cls: 'list-heatmap-container' });
        
        // 创建控制区域
        this.controlsContainer = this.contentEl.createDiv({ cls: 'list-heatmap-controls' });
        this.createControls();
        
        // 创建热图容器
        this.heatmapContainer = this.contentEl.createDiv({ cls: 'list-heatmap-chart' });
        
        // 初始渲染热图
        await this.refresh();
    }

    async onClose(): Promise<void> {
        // 清理视图
        this.contentEl.empty();
    }

    /**
     * 刷新热图视图
     */
    async refresh(): Promise<void> {
        // 清空热图容器
        this.heatmapContainer.empty();
        
        // 获取数据
        let data: ListCountResult | null = null;
        
        // 尝试从缓存获取数据
        if (this.plugin.settings.cacheEnabled) {
            data = await this.plugin.dataCache.getCachedData(this.plugin.settings);
        }
        
        // 如果缓存无效，重新获取数据
        if (!data) {
            await this.plugin.refreshData();
            data = await this.plugin.dataCache.getCachedData(this.plugin.settings);
        }
        
        // 如果仍然没有数据，显示提示信息
        if (!data) {
            this.heatmapContainer.createEl('div', { 
                text: '没有数据可显示。请确保设置了正确的日记文件夹路径和统计标题，然后点击刷新按钮。',
                cls: 'list-heatmap-no-data'
            });
            return;
        }
        
        // 渲染热图
        if (this.currentView === 'year') {
            this.renderYearHeatmap(data);
        } else {
            this.renderMonthHeatmap(data);
        }
        
        // 显示最后更新时间
        const lastUpdated = this.plugin.dataCache.getLastUpdated();
        if (lastUpdated) {
            const dateStr = new Date(lastUpdated).toLocaleString();
            this.contentEl.createEl('div', { 
                text: `最后更新: ${dateStr}`,
                cls: 'list-heatmap-last-updated'
            });
        }
    }

    /**
     * 创建控制区域
     */
    private createControls(): void {
        // 清空控制区域
        this.controlsContainer.empty();
        
        // 创建视图切换按钮
        const viewToggle = this.controlsContainer.createDiv({ cls: 'list-heatmap-view-toggle' });
        
        // 年视图按钮
        const yearBtn = viewToggle.createEl('button', { 
            text: '年视图',
            cls: this.currentView === 'year' ? 'active' : ''
        });
        yearBtn.addEventListener('click', () => {
            this.currentView = 'year';
            this.refresh();
        });
        
        // 月视图按钮
        const monthBtn = viewToggle.createEl('button', { 
            text: '月视图',
            cls: this.currentView === 'month' ? 'active' : ''
        });
        monthBtn.addEventListener('click', () => {
            this.currentView = 'month';
            this.refresh();
        });
        
        // 创建时间导航
        const timeNav = this.controlsContainer.createDiv({ cls: 'list-heatmap-time-nav' });
        
        // 上一年/月按钮
        const prevBtn = timeNav.createEl('button', { text: '←' });
        prevBtn.addEventListener('click', () => {
            if (this.currentView === 'year') {
                this.currentYear--;
            } else {
                this.currentMonth--;
                if (this.currentMonth < 1) {
                    this.currentMonth = 12;
                    this.currentYear--;
                }
            }
            this.refresh();
        });
        
        // 当前年/月显示
        const currentTime = timeNav.createEl('span', { 
            text: this.currentView === 'year' 
                ? `${this.currentYear}` 
                : `${this.currentYear}年${this.currentMonth}月`
        });
        
        // 下一年/月按钮
        const nextBtn = timeNav.createEl('button', { text: '→' });
        nextBtn.addEventListener('click', () => {
            if (this.currentView === 'year') {
                this.currentYear++;
            } else {
                this.currentMonth++;
                if (this.currentMonth > 12) {
                    this.currentMonth = 1;
                    this.currentYear++;
                }
            }
            this.refresh();
        });
        
        // 刷新按钮
        const refreshBtn = this.controlsContainer.createEl('button', { 
            text: '刷新数据',
            cls: 'list-heatmap-refresh-btn'
        });
        refreshBtn.addEventListener('click', async () => {
            await this.plugin.refreshData();
            this.refresh();
        });
    }

    /**
     * 渲染年度热图
     * @param data 统计数据
     */
    private renderYearHeatmap(data: ListCountResult): void {
        // 准备数据
        const yearData = this.prepareYearData(data, this.currentYear);
        
        // 设置尺寸和边距
        const cellSize = 12;
        const cellMargin = 2;
        const weekCount = 53;
        const dayCount = 7;
        const width = (cellSize + cellMargin) * weekCount;
        const height = (cellSize + cellMargin) * dayCount;
        const margin = { top: 20, right: 20, bottom: 20, left: 40 };
        
        // 创建 SVG 容器
        const svg = d3.select(this.heatmapContainer)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // 创建星期标签
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        svg.selectAll('.weekday-label')
            .data(weekdays)
            .enter()
            .append('text')
            .attr('class', 'weekday-label')
            .attr('x', -5)
            .attr('y', (d, i) => (cellSize + cellMargin) * i + cellSize / 2)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .text(d => d);
        
        // 创建月份标签
        const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
        const monthPositions = this.getMonthPositions(this.currentYear);
        
        svg.selectAll('.month-label')
            .data(months)
            .enter()
            .append('text')
            .attr('class', 'month-label')
            .attr('x', (d, i) => {
                const pos = monthPositions[i];
                return pos ? (cellSize + cellMargin) * pos.week : 0;
            })
            .attr('y', -5)
            .text(d => d);
        
        // 创建热图单元格
        svg.selectAll('.day')
            .data(yearData)
            .enter()
            .append('rect')
            .attr('class', 'day')
            .attr('width', cellSize)
            .attr('height', cellSize)
            .attr('x', d => (cellSize + cellMargin) * d.week)
            .attr('y', d => (cellSize + cellMargin) * d.day)
            .attr('fill', d => this.getColorForCount(d.count))
            .attr('rx', 2)
            .attr('ry', 2)
            .append('title')
            .text(d => `${d.date}: ${d.count} 个列表项`);
    }

    /**
     * 渲染月度热图
     * @param data 统计数据
     */
    private renderMonthHeatmap(data: ListCountResult): void {
        // 准备数据
        const monthData = this.prepareMonthData(data, this.currentYear, this.currentMonth);
        
        // 计算日历布局
        const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1);
        const startDay = firstDay.getDay(); // 0 = 周日, 1 = 周一, ...
        const daysInMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
        
        // 设置尺寸和边距
        const cellSize = 40;
        const cellMargin = 5;
        const colCount = 7; // 一周7天
        const rowCount = Math.ceil((daysInMonth + startDay) / colCount);
        const width = (cellSize + cellMargin) * colCount;
        const height = (cellSize + cellMargin) * rowCount;
        const margin = { top: 40, right: 20, bottom: 20, left: 20 };
        
        // 创建 SVG 容器
        const svg = d3.select(this.heatmapContainer)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // 创建星期标签
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        svg.selectAll('.weekday-label')
            .data(weekdays)
            .enter()
            .append('text')
            .attr('class', 'weekday-label')
            .attr('x', (d, i) => (cellSize + cellMargin) * i + cellSize / 2)
            .attr('y', -15)
            .attr('text-anchor', 'middle')
            .text(d => d);
        
        // 创建日期单元格
        svg.selectAll('.day')
            .data(monthData)
            .enter()
            .append('g')
            .attr('class', 'day-cell')
            .attr('transform', d => {
                const col = (d.day + startDay - 1) % 7;
                const row = Math.floor((d.day + startDay - 1) / 7);
                return `translate(${(cellSize + cellMargin) * col}, ${(cellSize + cellMargin) * row})`;
            })
            .each(function(d) {
                // 创建日期背景
                d3.select(this)
                    .append('rect')
                    .attr('width', cellSize)
                    .attr('height', cellSize)
                    .attr('fill', d.count > 0 ? d3.heatmapView.getColorForCount(d.count) : '#f0f0f0')
                    .attr('rx', 4)
                    .attr('ry', 4);
                
                // 创建日期文本
                d3.select(this)
                    .append('text')
                    .attr('x', cellSize / 2)
                    .attr('y', cellSize / 3)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('fill', d.count > 10 ? '#fff' : '#333')
                    .text(d.day);
                
                // 创建计数文本
                if (d.count > 0) {
                    d3.select(this)
                        .append('text')
                        .attr('x', cellSize / 2)
                        .attr('y', cellSize * 2/3)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .attr('fill', d.count > 10 ? '#fff' : '#333')
                        .attr('font-size', '0.8em')
                        .text(d.count);
                }
            });
    }

    /**
     * 准备年度数据
     * @param data 原始统计数据
     * @param year 年份
     * @returns 处理后的年度数据
     */
    private prepareYearData(data: ListCountResult, year: number): Array<{date: string, day: number, week: number, count: number}> {
        const result = [];
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        
        // 遍历年份中的每一天
        for (let d = new Date(yearStart); d <= yearEnd; d.setDate(d.getDate() + 1)) {
            const date = d.toISOString().split('T')[0]; // YYYY-MM-DD
            const day = d.getDay(); // 0 = 周日, 1 = 周一, ...
            
            // 计算周数 (相对于年初)
            const dayOfYear = Math.floor((d.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000));
            const week = Math.floor(dayOfYear / 7);
            
            // 获取计数，如果没有则为0
            const count = data[date] || 0;
            
            result.push({ date, day, week, count });
        }
        
        return result;
    }

    /**
     * 准备月度数据
     * @param data 原始统计数据
     * @param year 年份
     * @param month 月份
     * @returns 处理后的月度数据
     */
    private prepareMonthData(data: ListCountResult, year: number, month: number): Array<{date: string, day: number, count: number}> {
        const result = [];
        const daysInMonth = new Date(year, month, 0).getDate();
        
        // 遍历月份中的每一天
        for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(year, month - 1, day);
            const date = d.toISOString().split('T')[0]; // YYYY-MM-DD
            
            // 获取计数，如果没有则为0
            const count = data[date] || 0;
            
            result.push({ date, day, count });
        }
        
        return result;
    }

    /**
     * 获取月份位置
     * @param year 年份
     * @returns 月份位置数组
     */
    private getMonthPositions(year: number): Array<{week: number, day: number} | null> {
        const positions = [];
        
        for (let month = 0; month < 12; month++) {
            const firstDay = new Date(year, month, 1);
            const dayOfYear = Math.floor((firstDay.getTime() - new Date(year, 0, 1).getTime()) / (24 * 60 * 60 * 1000));
            const week = Math.floor(dayOfYear / 7);
            const day = firstDay.getDay();
            
            positions.push({ week, day });
        }
        
        return positions;
    }

    /**
     * 根据计数获取颜色
     * @param count 计数值
     * @returns 颜色代码
     */
    getColorForCount(count: number): string {
        // 如果计数为0，返回默认颜色
        if (count === 0) {
            return '#ebedf0';
        }
        
        // 根据设置的颜色范围获取颜色
        for (const range of this.plugin.settings.colorRanges) {
            if (count >= range.min && count <= range.max) {
                return range.color;
            }
        }
        
        // 如果没有匹配的范围，返回最后一个颜色
        return this.plugin.settings.colorRanges[this.plugin.settings.colorRanges.length - 1].color;
    }
}
