# Obsidian 列表热图插件架构设计

## 1. 整体架构

插件将采用模块化设计，主要包含以下几个核心模块：

1. **主插件类** - 负责初始化和协调各模块
2. **文件解析模块** - 负责读取和解析日记文件
3. **列表统计模块** - 负责统计特定标题下的无序列表
4. **数据缓存模块** - 负责数据的持久化存储和管理
5. **热图渲染模块** - 负责在侧边栏中渲染GitHub风格热图
6. **设置模块** - 负责管理用户自定义设置

## 2. 数据流

```
日记文件 → 文件解析模块 → 列表统计模块 → 数据缓存模块 ↔ 热图渲染模块 ← 设置模块
```

## 3. 模块详细设计

### 3.1 主插件类 (main.ts)

- 实现 Obsidian 插件接口
- 初始化各个模块
- 注册命令和事件监听
- 创建侧边栏视图

### 3.2 文件解析模块 (fileParser.ts)

- 获取指定路径下的日记文件
- 解析Markdown文件内容
- 识别文件中的标题和列表结构

### 3.3 列表统计模块 (listCounter.ts)

- 接收解析后的文件内容
- 根据用户设置的标题，统计无序列表数量
- 按日期组织统计结果

### 3.4 数据缓存模块 (dataCache.ts)

- 将统计结果持久化存储到本地文件
- 提供数据读取接口
- 实现缓存清理逻辑

### 3.5 热图渲染模块 (heatmapRenderer.ts)

- 创建热图视图组件
- 根据统计数据渲染GitHub风格热图
- 实现热图交互功能

### 3.6 设置模块 (settings.ts)

- 定义设置界面
- 管理用户自定义设置
- 监听设置变更并触发相应操作

## 4. 技术栈

- **TypeScript** - 主要开发语言
- **Obsidian API** - 插件开发框架
- **D3.js** - 用于热图渲染
- **Svelte** - 用于UI组件开发（可选）

## 5. 文件结构

```
obsidian-list-heatmap/
├── main.ts                 # 主插件类
├── fileParser.ts           # 文件解析模块
├── listCounter.ts          # 列表统计模块
├── dataCache.ts            # 数据缓存模块
├── heatmapRenderer.ts      # 热图渲染模块
├── settings.ts             # 设置模块
├── styles.css              # 样式文件
├── manifest.json           # 插件清单
├── package.json            # 项目配置
└── tsconfig.json           # TypeScript配置
```

## 6. 关键接口设计

### 6.1 设置接口

```typescript
interface ListHeatmapSettings {
  diaryFolderPath: string;          // 日记文件夹路径
  customTitles: string[];           // 用户自定义标题
  colorRanges: {                    // 热图颜色范围
    min: number;
    max: number;
    color: string;
  }[];
  defaultView: 'year' | 'month';    // 默认视图
  cacheEnabled: boolean;            // 是否启用缓存
}
```

### 6.2 缓存数据结构

```typescript
interface CacheData {
  version: string;                  // 缓存版本
  lastUpdated: number;              // 最后更新时间
  settings: {                       // 生成缓存时的设置
    diaryFolderPath: string;
    customTitles: string[];
  };
  data: {                           // 按日期存储的统计数据
    [date: string]: number;
  };
}
```

### 6.3 热图数据接口

```typescript
interface HeatmapData {
  date: string;                     // 日期 (YYYY-MM-DD)
  count: number;                    // 列表数量
  intensity: number;                // 热度强度 (0-4)
}
```

## 7. 扩展性考虑

- 设计时考虑未来可能添加更多统计维度
- 预留热图样式扩展接口
- 考虑与其他Obsidian插件的兼容性

## 8. 性能优化策略

- 使用缓存减少重复解析
- 懒加载侧边栏内容
- 增量更新而非全量重新统计
- 限制单次处理的文件数量
