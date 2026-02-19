# Video2Text 快速参考指南

## 改进说明

v1.1 版本大幅改进了错误处理和用户体验，现在能够：

✅ **智能识别各种链接格式**
- 标准视频链接
- 收藏夹链接（自动识别并提供解决方案）
- 用户主页链接
- note链接
- 短链接

✅ **自动错误诊断和建议**
- 自动检测需要登录的视频
- 提供详细的解决方案
- 交互式Cookie输入

✅ **友好的错误提示**
- 清晰的错误说明
- 分步骤的解决指南
- 智能建议

## 常见问题快速解决

### 问题1：收藏夹链接无法下载

**错误信息：**
```
✗ 错误: 此链接需要登录认证
```

**解决方案：**
```bash
# 方案1（推荐）：从抖音APP复制分享链接
# 1. 打开抖音APP，找到该视频
# 2. 点击分享按钮，复制链接
# 3. 使用复制的链接

# 方案2：提供Cookie
npm run cli extract "视频链接" --cookie "你的cookie"
```

### 问题2：视频需要登录

**错误信息：**
```
✗ 错误: 需要提供Cookie才能下载此视频
```

**解决方案：**
工具会自动提示是否提供Cookie，你可以：
1. 选择"Yes"并粘贴Cookie
2. 或从抖音APP复制公开分享链接

### 问题3：链接格式不正确

**错误信息：**
```
✗ 错误: 不支持直接下载收藏夹
```

**原因：**你使用的是收藏夹页面链接，不是单个视频链接

**解决方案：**
使用正确的链接格式：
- ❌ `https://www.douyin.com/user/self?modal_id=xxx` （收藏夹）
- ✅ `https://www.douyin.com/video/xxx` （单个视频）
- ✅ `https://v.douyin.com/xxx/` （分享短链接）

## 支持的链接格式

| 类型 | 格式示例 | 是否需要Cookie |
|------|----------|---------------|
| 标准视频 | `https://www.douyin.com/video/7595594238893840886` | 通常不需要 |
| 短链接 | `https://v.douyin.com/xxx/` | 通常不需要 |
| Note | `https://www.douyin.com/note/7595594238893840886` | 通常不需要 |
| 收藏夹 | `https://www.douyin.com/user/self?showTab=favorite_collection` | **需要** |
| 用户主页 | `https://www.douyin.com/user/xxx` | 不支持 |

## 获取Cookie的方法

1. **浏览器方法：**
   ```
   1. 打开 Chrome/Safari，访问抖音网页版
   2. 登录你的账号
   3. 按 F12 打开开发者工具
   4. 切换到 Network 标签
   5. 刷新页面
   6. 点击任意请求
   7. 在 Headers 中找到 Cookie 字段
   8. 复制完整内容
   ```

2. **使用Cookie：**
   ```bash
   # 临时使用（单次）
   npm run cli extract "URL" --cookie "你的cookie"

   # 永久设置（推荐）
   export DOUYIN_COOKIE="你的cookie"
   npm run cli extract "URL"
   ```

## 最佳实践

### ✅ 推荐做法

```bash
# 1. 使用公开视频的分享链接（最简单）
npm run cli extract "https://v.douyin.com/xxx/"

# 2. 批量处理公开视频
cat > videos.txt << EOF
https://v.douyin.com/xxx/
https://v.douyin.com/yyy/
https://v.douyin.com/zzz/
EOF
npm run cli extract --file videos.txt --format srt

# 3. 需要登录的视频
export DOUYIN_COOKIE="你的cookie"
npm run cli extract "URL"
```

### ❌ 不推荐做法

```bash
# 不要使用收藏夹链接
npm run cli extract "https://www.douyin.com/user/self?showTab=favorite_collection"

# 不要使用用户主页链接
npm run cli extract "https://www.douyin.com/user/xxx"
```

## 交互式体验

工具现在支持交互式操作：

1. **自动提示解决方案** - 遇到错误时自动显示解决步骤
2. **交互式Cookie输入** - 可以选择立即提供Cookie
3. **智能URL识别** - 自动从各种格式中提取视频ID

## 错误代码参考

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| `此链接需要登录认证` | 收藏夹或私密视频 | 提供Cookie或使用分享链接 |
| `不支持直接下载收藏夹` | 批量下载收藏夹 | 提供单个视频链接 |
| `不支持直接下载用户主页` | 用户主页链接 | 提供具体视频链接 |
| `无法识别的链接格式` | 非抖音链接 | 使用正确的抖音链接 |
| `不是有效的抖音链接` | URL格式错误 | 检查链接是否完整 |

## 常用命令速查

```bash
# 查看帮助
npm run cli -- --help

# 单个视频（自动识别格式）
npm run cli extract "URL"

# 指定输出格式
npm run cli extract "URL" --format srt

# 指定输出目录
npm run cli extract "URL" --output ./my-videos

# 使用更大的模型（提高准确度）
npm run cli extract "URL" --model small

# 批量处理
npm run cli extract --file urls.txt

# 使用Cookie
npm run cli extract "URL" --cookie "cookie内容"

# 启动Web服务
npm run cli serve --port 3000
```

## 调试技巧

```bash
# 保留临时文件（用于调试）
npm run cli extract "URL" --keep

# 查看详细日志
tail -f logs/$(ls -t logs/ | head -1)
```

---

**提示：** 如果遇到任何问题，工具会自动提供详细的解决方案，按照提示操作即可！
