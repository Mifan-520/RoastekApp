# OpenCode Project Configuration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Configure current directory as OpenCode project by creating `.opencode` configuration file

**Architecture:** Create JSON configuration file in current directory, then verify OpenCode recognizes the project and shows sessions in `opencode session list`

**Tech Stack:** OpenCode CLI, JSON, Windows file system

---

### Task 1: Create .opencode configuration file

**Files:**
- Create: `C:\Users\Mifan\Desktop\app\.opencode`

**Step 1: Write the failing test**
```bash
# Test that .opencode file doesn't exist
if exist ".opencode" (
    echo "FAIL: .opencode file already exists"
    exit 1
) else (
    echo "PASS: .opencode file does not exist"
)
```

**Step 2: Run test to verify it fails**
Run: `test_file_exists.bat` (or manual check)
Expected: PASS (file doesn't exist)

**Step 3: Write minimal implementation**
Create `.opencode` file with content:
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

**Step 4: Run test to verify it passes**
Run: `if exist ".opencode" (echo "PASS: File created") else (echo "FAIL: File not created")`
Expected: PASS

**Step 5: Commit**
```bash
git add .opencode
git commit -m "feat: add OpenCode project configuration"
```

### Task 2: Verify JSON format

**Files:**
- Modify: `C:\Users\Mifan\Desktop\app\.opencode`

**Step 1: Write the failing test**
```bash
# Test JSON validity
python -c "import json; json.load(open('.opencode'))" 2>nul
if %errorlevel% equ 0 (
    echo "PASS: JSON is valid"
) else (
    echo "FAIL: JSON is invalid"
    exit 1
)
```

**Step 2: Run test to verify it fails**
Run: `test_json_validity.bat`
Expected: PASS (JSON should be valid)

**Step 3: Write minimal implementation**
No code needed if JSON is already valid. If invalid, fix JSON syntax.

**Step 4: Run test to verify it passes**
Run: `test_json_validity.bat`
Expected: PASS

**Step 5: Commit**
```bash
git add .opencode
git commit -m "fix: validate JSON configuration"
```

### Task 3: Test OpenCode session list

**Files:**
- No file changes

**Step 1: Write the failing test**
```bash
# Test that opencode session list shows project
opencode session list > session_list.txt 2>&1
findstr /c:"app" session_list.txt > nul
if %errorlevel% equ 0 (
    echo "PASS: Session list shows project"
) else (
    echo "FAIL: Session list doesn't show project"
    exit 1
)
```

**Step 2: Run test to verify it fails**
Run: `test_session_list.bat`
Expected: May fail if project not recognized

**Step 3: Write minimal implementation**
No code changes needed. Configuration should be recognized.

**Step 4: Run test to verify it passes**
Run: `test_session_list.bat`
Expected: PASS after configuration is recognized

**Step 5: Commit**
```bash
git add session_list.txt
git commit -m "test: verify OpenCode project configuration"
```

### Task 4: Create test session

**Files:**
- No file changes

**Step 1: Write the failing test**
```bash
# Test creating a new session
opencode run "test session" > create_session.txt 2>&1
findstr /c:"created" create_session.txt > nul
if %errorlevel% equ 0 (
    echo "PASS: Session created successfully"
) else (
    echo "FAIL: Session creation failed"
    exit 1
)
```

**Step 2: Run test to verify it fails**
Run: `test_create_session.bat`
Expected: PASS (session should be created)

**Step 3: Write minimal implementation**
No code changes needed.

**Step 4: Run test to verify it passes**
Run: `test_create_session.bat`
Expected: PASS

**Step 5: Commit**
```bash
git add create_session.txt
git commit -m "test: verify session creation with project config"
```

### Task 5: Verify session list shows new session

**Files:**
- No file changes

**Step 1: Write the failing test**
```bash
# Test that new session appears in list
opencode session list > new_session_list.txt 2>&1
findstr /c:"test session" new_session_list.txt > nul
if %errorlevel% equ 0 (
    echo "PASS: New session appears in list"
) else (
    echo "FAIL: New session not in list"
    exit 1
)
```

**Step 2: Run test to verify it fails**
Run: `test_new_session_in_list.bat`
Expected: PASS (session should appear)

**Step 3: Write minimal implementation**
No code changes needed.

**Step 4: Run test to verify it passes**
Run: `test_new_session_in_list.bat`
Expected: PASS

**Step 5: Commit**
```bash
git add new_session_list.txt
git commit -m "test: verify new session appears in project list"
```

## Execution Options

Plan complete and saved to `docs/plans/2026-03-17-opencode-project-configuration-implementation.md`. Two execution options:

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

Which approach?