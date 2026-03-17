# OpenCode 项目配置设计方案

## 问题描述

用户希望在当前工作区目录（`C:\Users\Mifan\Desktop\app`）配置为 OpenCode 项目，以便 `opencode session list` 命令能正确显示与该项目关联的会话。

## 原因分析

### 1. 当前状态
- 当前工作区没有 `.opencode` 配置文件
- OpenCode 数据库中可能没有当前目录的项目记录
- `opencode session list` 根据项目关联过滤会话，导致显示为空

### 2. 配置需求
根据用户选择，需要创建 `.opencode` 配置文件，包含：
- 项目名称和 ID
- 工作区路径映射
- 会话存储配置

## 解决方案

### 方案比较

#### 方案1：基本JSON配置文件（推荐）
创建 `.opencode` 文件，包含基本配置：
- 项目名称：使用当前目录名 "app"
- 项目ID：自动生成或使用时间戳
- 工作区路径：映射当前目录及其子目录
- 会话存储：使用 SQLite 数据库

**优点**：
- 简单快速，立即生效
- 满足基本需求
- 易于后续扩展

**缺点**：
- 配置选项有限

#### 方案2：增强JSON配置文件
在基本配置基础上增加更多选项：
- 忽略文件模式
- 默认会话设置
- 环境变量配置
- 插件配置

**优点**：
- 更灵活，适合复杂项目
- 提供更多控制选项

**缺点**：
- 配置时间较长
- 可能过于复杂

#### 方案3：YAML格式配置文件
使用YAML格式代替JSON：

**优点**：
- 更易读和编辑
- 支持注释

**缺点**：
- 需要确保OpenCode支持YAML
- 可能增加兼容性风险

### 推荐方案
**方案1：基本JSON配置文件**，因为：
1. 满足用户当前需求
2. 简单快速
3. 易于扩展

## 设计细节

### 配置文件结构
创建 `.opencode` 文件，内容如下：

```json
{
  "project": {
    "name": "app",
    "id": "app-2026-03-17"
  },
  "workspace": {
    "root": "C:\\Users\\Mifan\\Desktop\\app",
    "paths": {
      "backend": "backend",
      "frontend": "frontend",
      "docs": "docs"
    }
  },
  "sessions": {
    "storage": "sqlite",
    "database": "C:\\Users\\Mifan\\.config\\opencode\\sessions.db"
  }
}
```

### 创建步骤
1. **定位目录**：切换到 `C:\Users\Mifan\Desktop\app`
2. **创建文件**：使用文本编辑器创建 `.opencode` 文件
3. **写入配置**：将上述JSON内容写入文件
4. **验证配置**：运行 `opencode session list` 检查是否显示会话

### 验证方法
1. **文件验证**：检查 `.opencode` 文件是否存在且内容正确
2. **命令验证**：运行 `opencode session list` 查看会话列表
3. **数据库验证**：检查会话数据库是否有关联记录

### 错误处理
1. **文件创建失败**：检查权限和路径
2. **配置无效**：验证JSON格式，使用在线JSON验证工具
3. **会话仍为空**：检查数据库连接和项目关联

## 风险与注意事项

1. **JSON格式错误**：确保JSON语法正确，避免逗号、引号错误
2. **路径格式**：Windows路径使用双反斜杠（`\\`）
3. **权限问题**：确保有权限创建文件和写入数据库
4. **OpenCode版本兼容性**：不同版本可能配置格式不同

## 下一步

1. 创建 `.opencode` 配置文件
2. 验证配置是否生效
3. 检查 `opencode session list` 是否显示会话
4. 如有问题，调整配置并重新验证

## 相关文档
- [2026-03-17-opencode-session-empty-design.md](2026-03-17-opencode-session-empty-design.md) - 会话为空问题分析