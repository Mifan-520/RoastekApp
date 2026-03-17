# Opencode Session Empty Analysis and Solution Design

## 问题描述

用户在工作区中运行 `opencode session list` 命令时，显示会话列表为空。但通过 OpenCode 的内部工具（`session_list`）检查，发现存在会话记录。

## 原因分析

### 1. 会话存储机制
OpenCode 会话存储在 SQLite 数据库（`C:\Users\Mifan\.local\share\opencode\opencode.db`）中。数据库中存在多个会话记录，包括与当前工作区相关的会话。

### 2. `opencode session list` 过滤逻辑
`opencode session list` 命令可能根据以下条件过滤会话：
- **项目关联**：会话与特定项目（`project_id`）关联。当前工作区目录（`C:\Users\Mifan\Desktop\app`）可能没有对应的项目记录，或者项目配置不正确。
- **工作树匹配**：项目的工作树路径（`C:\Users\Mifan\Desktop\app\git`）与当前目录不匹配。
- **会话状态**：可能只显示未归档、未删除的会话。

### 3. 当前工作区配置
当前工作区是一个 Git 仓库，但 OpenCode 项目配置中，工作树路径指向 `C:\Users\Mifan\Desktop\app\git`，而当前目录是 `C:\Users\Mifan\Desktop\app`。这可能导致会话过滤不正确。

## 解决方案

### 方案一：检查并修复项目配置
1. 使用 `opencode db` 查询当前工作区的项目记录。
2. 如果项目不存在，创建新项目或修复现有项目的工作树路径。
3. 确保会话的 `project_id` 与当前项目匹配。

### 方案二：使用数据库查询直接查看会话
1. 使用 `opencode db "SELECT * FROM session WHERE directory LIKE '%app%';"` 查询所有相关会话。
2. 手动管理会话，不依赖 `opencode session list` 命令。

### 方案三：配置 OpenCode 项目识别当前目录
1. 在当前目录下运行 `opencode` 命令，让 OpenCode 自动创建项目配置。
2. 或者手动创建 `.opencode` 配置文件，指定项目工作树。

## 推荐方案

推荐**方案一**，因为它是根本解决方案，确保 OpenCode 项目配置正确，从而 `opencode session list` 能正常显示会话。

## 设计细节

### 步骤 1：检查项目配置
```sql
SELECT * FROM project WHERE worktree LIKE '%app%';
```

### 步骤 2：修复项目工作树
如果项目工作树路径不正确，更新数据库：
```sql
UPDATE project SET worktree = 'C:\Users\Mifan\Desktop\app' WHERE id = 'ffe870450d2e1663e0a695a42c8d4f122246e9a8';
```

### 步骤 3：验证会话列表
重新运行 `opencode session list`，检查是否显示相关会话。

### 步骤 4：创建新会话测试
运行 `opencode run "test"` 创建新会话，然后检查列表。

## 风险与注意事项

- 直接修改数据库可能损坏数据，建议先备份。
- OpenCode 版本更新可能改变会话存储逻辑。
- 多个项目配置可能导致冲突。

## 下一步

1. 执行方案一，检查并修复项目配置。
2. 验证 `opencode session list` 显示正确会话。
3. 如果问题持续，考虑方案二或方案三。