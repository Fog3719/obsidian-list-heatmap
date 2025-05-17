# Obsidian List Heatmap Plugin
[中文版](/README_zh.md)

This is an Obsidian plugin that counts the number of unordered lists under specific headings in daily note files and displays the statistics in a GitHub-style heatmap in the sidebar panel.

![](image/image.png)

> [!TIP]
> This plugin is developed by an LLM. If you encounter any issues during use, you can fix them with the help of an LLM.

## Features
![](image/image_01.png)
- Counts the number of unordered lists under user-defined headings in daily note files (YYYY-MM-DD format) within a specified path
- Visualizes the statistics in a GitHub-style heatmap in the sidebar panel
- Supports both yearly and monthly views
- Supports custom heatmap color ranges
- Data is locally cached for persistence
- Provides manual refresh functionality
- Automatically clears the cache when the path or heading is changed

## Installation

### Manual Installation

1. Download the latest release package
2. Unzip the downloaded file
3. Copy the unzipped folder to the Obsidian plugins directory (`.obsidian/plugins/`)
4. Enable the plugin in Obsidian

### Install via BRAT

1. Install the [BRAT](https://github.com/TfTHacker/obsidian42-brat) plugin
2. Add this repository address in the BRAT settings
3. Enable the plugin in Obsidian

## Usage

1. After installing and enabling the plugin, a calendar icon will appear in the right sidebar of Obsidian
2. Click the icon to open the List Heatmap panel
3. Configure the daily notes folder path and the headings to be counted in the plugin settings
4. The heatmap will automatically display the daily unordered list statistics

## Configuration Options

- **Daily Notes Folder Path**: Specify the folder path containing your daily note files
- **Counted Headings**: Specify the headings under which unordered lists are counted (separate multiple headings with commas)
- **Heatmap Color Settings**: Customize the heatmap color range
- **Default View**: Set the default time range for the heatmap (yearly or monthly view)
- **Enable Cache**: Enable data caching to improve performance

## Development

### Prerequisites

- [Node.js](https://nodejs.org/)
- [pnpm](https://pnpm.io/) (recommended) or npm

### Local Development

1. Clone this repository
2. Install dependencies: `pnpm install` or `npm install`
3. Build the plugin: `pnpm build` or `npm run build`
4. Development mode: `pnpm dev` or `npm run dev`

## License

[MIT](LICENSE)