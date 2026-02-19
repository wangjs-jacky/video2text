#!/bin/bash
# Video2Text v1.1.0 使用演示

echo "=========================================="
echo "Video2Text v1.1.0 - 智能视频转文字工具"
echo "=========================================="
echo ""

# 演示1: 查看帮助
echo "📚 演示1: 查看帮助信息"
echo "命令: npm run cli -- --help"
echo ""

# 演示2: 测试收藏夹链接
echo "🔍 演示2: 测试收藏夹链接（你的案例）"
echo "命令: npm run cli extract 'https://www.douyin.com/user/self?modal_id=7595594238893840886&showTab=favorite_collection'"
echo "预期: 自动识别并提供解决方案"
echo ""

# 演示3: 标准视频链接
echo "✅ 演示3: 标准视频链接"
echo "命令: npm run cli extract 'https://www.douyin.com/video/7595594238893840886'"
echo "预期: 提示需要Cookie并提供解决方案"
echo ""

# 演示4: 批量处理
echo "📦 演示4: 批量处理"
echo "1. 创建链接文件: echo 'https://v.douyin.com/xxx/' > urls.txt"
echo "2. 批量提取: npm run cli extract --file urls.txt --format srt"
echo ""

# 演示5: 使用Cookie
echo "🔐 演示5: 使用Cookie下载私密视频"
echo "命令: npm run cli extract 'URL' --cookie '你的cookie'"
echo "或者: export DOUYIN_COOKIE='cookie' && npm run cli extract 'URL'"
echo ""

# 演示6: Web服务
echo "🌐 演示6: 启动Web服务"
echo "命令: npm run cli serve --port 3000"
echo "访问: http://localhost:3000"
echo ""

echo "=========================================="
echo "🎯 关键改进"
echo "=========================================="
echo "✅ 智能URL识别 - 自动识别各种链接格式"
echo "✅ 友好错误提示 - 提供详细解决方案"
echo "✅ 交互式处理 - 即时提供Cookie并重试"
echo "✅ 完整文档 - README + 快速指南 + 更新日志"
echo ""

echo "=========================================="
echo "📖 快速参考"
echo "=========================================="
echo "• README.md - 完整使用指南"
echo "• QUICK_START.md - 快速参考"
echo "• CHANGELOG.md - 更新日志"
echo "• IMPROVEMENTS.md - 改进详情"
echo ""

echo "=========================================="
echo "🚀 立即开始"
echo "=========================================="
echo "1. 查看帮助: npm run cli -- --help"
echo "2. 测试链接: npm run cli extract '你的链接'"
echo "3. 启动Web: npm run cli serve"
echo ""

# 实际演示
read -p "是否运行实际演示？(y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    echo ""
    echo "运行演示..."
    echo ""

    echo "1️⃣  测试收藏夹链接智能识别："
    echo "命令: npm run cli extract 'https://www.douyin.com/user/self?modal_id=7595594238893840886&showTab=favorite_collection' --format txt 2>&1 | head -30"
    echo ""
    echo "按任意键继续..."
    read -n 1 -s
    echo ""

    echo "2️⃣  查看版本信息："
    npm run cli -- --version
    echo ""

    echo "✅ 演示完成！"
fi

echo ""
echo "=========================================="
echo "感谢使用 Video2Text v1.1.0！"
echo "=========================================="
