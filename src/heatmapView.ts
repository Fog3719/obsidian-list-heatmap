import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { ListHeatmapSettings } from './settings';
import ListHeatmapPlugin from './main';
import { ListCountResult } from './listCounter';
import * as d3 from 'd3';

export const VIEW_TYPE_HEATMAP = 'list-heatmap-view';

interface HeatmapDayData {
    date: string;
    day: number;
    week?: number;
    count: number;
    filename?: string; // Add filename property for hover display and click navigation
}

export class HeatmapView extends ItemView {
    private plugin: ListHeatmapPlugin;
    private heatmapContainer: HTMLElement;
    private controlsContainer: HTMLElement;
    private lastUpdatedContainer: HTMLElement; // Container for last updated time
    private currentView: 'year' | 'month';
    private currentYear: number;
    private currentMonth: number;
    // Change contentEl to protected to avoid conflict with base class
    protected heatmapContentEl: HTMLElement;

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
        return 'List Heatmap';
    }

    async onOpen(): Promise<void> {
        // Create view container
        this.heatmapContentEl = this.containerEl.children[1].createDiv({ cls: 'list-heatmap-container' });
        
        // Create controls area
        this.controlsContainer = this.heatmapContentEl.createDiv({ cls: 'list-heatmap-controls' });
        this.createControls();
        
        // Create heatmap container
        this.heatmapContainer = this.heatmapContentEl.createDiv({ cls: 'list-heatmap-chart' });
        
        // Create last updated time container
        this.lastUpdatedContainer = this.heatmapContentEl.createDiv({ cls: 'list-heatmap-last-updated' });
        
        // Initial heatmap rendering
        await this.refresh();
    }

    async onClose(): Promise<void> {
        // Clean up view
        this.heatmapContentEl.empty();
    }

    /**
     * Refresh heatmap view
     */
    async refresh(): Promise<void> {
        // Clear heatmap container
        this.heatmapContainer.empty();
        
        // Clear last updated time container
        this.lastUpdatedContainer.empty();
        
        // Get data
        let data: ListCountResult | null = null;
        
        // Try to get data from cache
        if (this.plugin.settings.cacheEnabled) {
            data = await this.plugin.dataCache.getCachedData(this.plugin.settings);
        }
        
        // If cache is invalid, refresh data
        if (!data) {
            await this.plugin.refreshData();
            data = await this.plugin.dataCache.getCachedData(this.plugin.settings);
        }
        
        // If still no data, show message
        if (!data) {
            this.heatmapContainer.createEl('div', { 
                text: 'No data to display. Please make sure you have set the correct diary folder path and titles to count, then click the refresh button.',
                cls: 'list-heatmap-no-data'
            });
            return;
        }
        
        // Render heatmap
        if (this.currentView === 'year') {
            this.renderYearHeatmap(data);
        } else {
            this.renderMonthHeatmap(data);
        }
        
        // Show last updated time (only one entry)
        const lastUpdated = this.plugin.dataCache.getLastUpdated();
        if (lastUpdated) {
            const dateStr = new Date(lastUpdated).toLocaleString();
            this.lastUpdatedContainer.setText(`Last updated: ${dateStr}`);
        }
    }

    /**
     * Create controls area
     */
    private createControls(): void {
        // Clear controls area
        this.controlsContainer.empty();
        
        // Create view toggle buttons
        const viewToggle = this.controlsContainer.createDiv({ cls: 'list-heatmap-view-toggle' });
        
        // Year view button
        const yearBtn = viewToggle.createEl('button', { 
            text: 'Year View',
            cls: this.currentView === 'year' ? 'active' : ''
        });
        yearBtn.addEventListener('click', () => {
            this.currentView = 'year';
            this.refresh();
        });
        
        // Month view button
        const monthBtn = viewToggle.createEl('button', { 
            text: 'Month View',
            cls: this.currentView === 'month' ? 'active' : ''
        });
        monthBtn.addEventListener('click', () => {
            this.currentView = 'month';
            this.refresh();
        });
        
        // Create time navigation
        const timeNav = this.controlsContainer.createDiv({ cls: 'list-heatmap-time-nav' });
        
        // Previous year/month button
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
        
        // Current year/month display
        const currentTime = timeNav.createEl('span', { 
            text: this.currentView === 'year' 
                ? `${this.currentYear}` 
                : `${this.currentYear}-${this.currentMonth.toString().padStart(2, '0')}`
        });
        
        // Next year/month button
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
        
        // Refresh button
        const refreshBtn = this.controlsContainer.createEl('button', { 
            text: 'Refresh Data',
            cls: 'list-heatmap-refresh-btn'
        });
        refreshBtn.addEventListener('click', async () => {
            await this.plugin.refreshData();
            this.refresh();
        });
    }

    /**
     * Render year heatmap
     * @param data Statistics data
     */
    private renderYearHeatmap(data: ListCountResult): void {
        // Prepare data
        const yearData = this.prepareYearData(data, this.currentYear);
        
        // Set size and margins
        const cellSize = 12;
        const cellMargin = 2;
        const weekCount = 53;
        const dayCount = 7;
        const width = (cellSize + cellMargin) * weekCount;
        const height = (cellSize + cellMargin) * dayCount;
        const margin = { top: 20, right: 20, bottom: 20, left: 40 };
        
        // Create SVG container
        const svg = d3.select(this.heatmapContainer)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Create weekday labels
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        svg.selectAll('.weekday-label')
            .data(weekdays)
            .enter()
            .append('text')
            .attr('class', 'weekday-label')
            .attr('x', -5)
            .attr('y', (d: string, i: number) => (cellSize + cellMargin) * i + cellSize / 2)
            .attr('text-anchor', 'end')
            .attr('dominant-baseline', 'middle')
            .text((d: string) => d);
        
        // Create month labels
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthPositions = this.getMonthPositions(this.currentYear);
        
        svg.selectAll('.month-label')
            .data(months)
            .enter()
            .append('text')
            .attr('class', 'month-label')
            .attr('x', (d: string, i: number) => {
                const pos = monthPositions[i];
                return pos ? (cellSize + cellMargin) * pos.week : 0;
            })
            .attr('y', -5)
            .text((d: string) => d);
        
        // Create heatmap cells
        const plugin = this.plugin;
        
        svg.selectAll('.day')
            .data(yearData)
            .enter()
            .append('rect')
            .attr('class', 'day')
            .attr('width', cellSize)
            .attr('height', cellSize)
            .attr('x', (d: HeatmapDayData) => (cellSize + cellMargin) * (d.week || 0))
            .attr('y', (d: HeatmapDayData) => (cellSize + cellMargin) * d.day)
            .attr('fill', (d: HeatmapDayData) => this.getColorForCount(d.count))
            .attr('rx', 2)
            .attr('ry', 2)
            .attr('cursor', (d: HeatmapDayData) => d.filename ? 'pointer' : 'default')
            .on('click', function(event: MouseEvent, d: HeatmapDayData) {
                if (d.filename) {
                    plugin.openDiaryFile(d.filename);
                }
            })
            .append('title')
            .text((d: HeatmapDayData) => {
                let tooltip = `${d.date}: ${d.count} list items`;
                if (d.filename) {
                    tooltip += `\nFile: ${d.filename}`;
                }
                return tooltip;
            });
    }

    /**
     * Render month heatmap
     * @param data Statistics data
     */
    private renderMonthHeatmap(data: ListCountResult): void {
        // Prepare data
        const monthData = this.prepareMonthData(data, this.currentYear, this.currentMonth);
        
        // Calculate calendar layout
        const firstDay = new Date(this.currentYear, this.currentMonth - 1, 1);
        const startDay = firstDay.getDay(); // 0 = Sunday, 1 = Monday, ...
        const daysInMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();
        
        // Set size and margins
        const cellSize = 40;
        const cellMargin = 5;
        const colCount = 7; // 7 days in a week
        const rowCount = Math.ceil((daysInMonth + startDay) / colCount);
        const width = (cellSize + cellMargin) * colCount;
        const height = (cellSize + cellMargin) * rowCount;
        const margin = { top: 40, right: 20, bottom: 20, left: 20 };
        
        // Create SVG container
        const svg = d3.select(this.heatmapContainer)
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);
        
        // Create weekday labels
        const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        svg.selectAll('.weekday-label')
            .data(weekdays)
            .enter()
            .append('text')
            .attr('class', 'weekday-label')
            .attr('x', (d: string, i: number) => (cellSize + cellMargin) * i + cellSize / 2)
            .attr('y', -15)
            .attr('text-anchor', 'middle')
            .text((d: string) => d);
        
        // Create date cells
        const getColorForCount = this.getColorForCount.bind(this);
        const plugin = this.plugin;
        
        svg.selectAll('.day')
            .data(monthData)
            .enter()
            .append('g')
            .attr('class', 'day-cell')
            .attr('transform', (d: HeatmapDayData) => {
                const col = (d.day + startDay - 1) % 7;
                const row = Math.floor((d.day + startDay - 1) / 7);
                return `translate(${(cellSize + cellMargin) * col}, ${(cellSize + cellMargin) * row})`;
            })
            .attr('cursor', (d: HeatmapDayData) => d.filename ? 'pointer' : 'default')
            .on('click', function(event: MouseEvent, d: HeatmapDayData) {
                if (d.filename) {
                    plugin.openDiaryFile(d.filename);
                }
            })
            .each(function(d: HeatmapDayData) {
                const self = d3.select(this);
                
                // Create date background
                self.append('rect')
                    .attr('width', cellSize)
                    .attr('height', cellSize)
                    .attr('fill', d.count > 0 ? getColorForCount(d.count) : '#f0f0f0')
                    .attr('rx', 4)
                    .attr('ry', 4);
                
                // Create date text
                self.append('text')
                    .attr('x', cellSize / 2)
                    .attr('y', cellSize / 3)
                    .attr('text-anchor', 'middle')
                    .attr('dominant-baseline', 'middle')
                    .attr('fill', d.count > 10 ? '#fff' : '#333')
                    .text(d.day);
                
                // Create count text
                if (d.count > 0) {
                    self.append('text')
                        .attr('x', cellSize / 2)
                        .attr('y', cellSize * 2/3)
                        .attr('text-anchor', 'middle')
                        .attr('dominant-baseline', 'middle')
                        .attr('fill', d.count > 10 ? '#fff' : '#333')
                        .attr('font-size', '0.8em')
                        .text(d.count);
                }
                
                // Add hover tooltip
                if (d.filename) {
                    self.append('title')
                        .text(`${d.date}: ${d.count} list items\nFile: ${d.filename}`);
                } else {
                    self.append('title')
                        .text(`${d.date}: ${d.count} list items`);
                }
            });
    }

    /**
     * Prepare year data
     * @param data Original statistics data
     * @param year Year
     * @returns Processed year data
     */
    private prepareYearData(data: ListCountResult, year: number): HeatmapDayData[] {
        const result: HeatmapDayData[] = [];
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        
        // Iterate through each day of the year
        for (let d = new Date(yearStart); d <= yearEnd; d.setDate(d.getDate() + 1)) {
            const date = d.toISOString().split('T')[0]; // YYYY-MM-DD
            const day = d.getDay(); // 0 = Sunday, 1 = Monday, ...
            
            // Calculate week number (relative to year start)
            const dayOfYear = Math.floor((d.getTime() - yearStart.getTime()) / (24 * 60 * 60 * 1000));
            const week = Math.floor(dayOfYear / 7);
            
            // Get count, default to 0 if none
            const count = data[date] || 0;
            
            // Get filename (if any)
            const filename = this.plugin.getDiaryFilename(date);
            
            result.push({ date, day, week, count, filename });
        }
        
        return result;
    }

    /**
     * Prepare month data
     * @param data Original statistics data
     * @param year Year
     * @param month Month
     * @returns Processed month data
     */
    private prepareMonthData(data: ListCountResult, year: number, month: number): HeatmapDayData[] {
        const result: HeatmapDayData[] = [];
        const daysInMonth = new Date(year, month, 0).getDate();
        
        // Iterate through each day of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const d = new Date(year, month - 1, day);
            const date = d.toISOString().split('T')[0]; // YYYY-MM-DD
            
            // Get count, default to 0 if none
            const count = data[date] || 0;
            
            // Get filename (if any)
            const filename = this.plugin.getDiaryFilename(date);
            
            result.push({ date, day, count, filename });
        }
        
        return result;
    }

    /**
     * Get month positions
     * @param year Year
     * @returns Month positions array
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
     * Get color based on count
     * @param count Count value
     * @returns Color code
     */
    getColorForCount(count: number): string {
        // If count is 0, return default color
        if (count === 0) {
            return '#ebedf0';
        }
        
        // Get color based on settings color ranges
        for (const range of this.plugin.settings.colorRanges) {
            if (count >= range.min && count <= range.max) {
                return range.color;
            }
        }
        
        // If no matching range, return the last color
        return this.plugin.settings.colorRanges[this.plugin.settings.colorRanges.length - 1].color;
    }
}
