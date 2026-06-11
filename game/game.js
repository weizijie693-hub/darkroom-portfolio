/* ============================================================
   暗房潜影 · Darkroom Shadow
   像素 2D 探索收集游戏
   ============================================================ */

(function () {
    'use strict';

    // ============================================================
    //  常量 & 配置
    // ============================================================
    const W = 320;          // 内部逻辑分辨率（宽）
    const H = 240;          // 内部逻辑分辨率（高）
    const SCALE = 2;        // 显示缩放倍率
    const TILE = 16;        // 瓦片尺寸（像素）
    const COLS = 20;        // 地图列数
    const ROWS = 15;        // 地图行数
    const FPS = 60;
    const FRAME_TIME = 1000 / FPS;

    // ——— 色盘（暗房美学） ———
    const C = {
        BLACK:      '#0a0a0a',
        DARK:       '#141212',
        WALL:       '#1a1816',
        WALL2:      '#221e1a',
        FLOOR:      '#1e1c1a',
        FLOOR2:     '#25211e',
        WOOD:       '#2a2318',
        WOOD2:      '#352c1e',
        METAL:      '#2a2826',
        AMBER:      '#f5c542',
        AMBER2:     '#d4a037',
        AMBER_DIM:  '#6a5a25',
        RED:        '#c0392b',
        RED_DIM:    '#4a1a15',
        CREAM:      '#f5f0e8',
        CREAM2:     '#c4bca8',
        CREAM3:     '#8a8476',
        FILM:       '#d4a037',
        FILM2:      '#8a7020',
        SKIN:       '#e8ddd0',
        SKIN2:      '#b8a898',
        SHIRT:      '#3a3028',
        SHIRT2:     '#2a2018',
        HAIR:       '#1a1410',
        HIGHLIGHT:  '#f5c542',
        VIGNETTE:   'rgba(0,0,0,',
    };

    // ============================================================
    //  地图数据（更开阔的布局）
    //   0=地板  1=墙   2=操作台  3=放大机
    // ============================================================
    const MAP_TEMPLATE = [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    ];

    // ——— 关卡配置（每关独立机制） ———
    const MAX_LEVEL = 11;
    const LEVEL_META = [
        { name: '装卷',   subtitle: 'LOAD FILM',      desc: '新手关 · 收集5帧',               icon: '🎞' },
        { name: '过片',   subtitle: 'WIND ON',        desc: '[限时]7帧·帧数倒扣',              icon: '⏱' },
        { name: '光圈',   subtitle: 'APERTURE',       desc: '[限时]脉冲·8帧',                  icon: '💡' },
        { name: '快門',   subtitle: 'SHUTTER',        desc: '[限时]反应·8帧',                  icon: '📸' },
        { name: '測光',   subtitle: 'METER',          desc: '[限时]流失·9帧',                  icon: '☀' },
        { name: '重曝',   subtitle: 'DOUBLE EXP',     desc: '[限时+血包]双灯·10帧',             icon: '⚠' },
        { name: '移軸',   subtitle: 'TILT SHIFT',     desc: '[限时+血包]光源·11帧',            icon: '↗' },
        { name: '頻閃',   subtitle: 'STROBE',         desc: '[限时+血包]频闪·11帧',            icon: '⚡' },
        { name: '濾鏡',   subtitle: 'FILTERS',        desc: '[限时+血包]冷暖双光',             icon: '🔦' },
        { name: '顯影',   subtitle: 'FINAL PRINT',    desc: '[限时+血包]放大机·8帧',           icon: '🏆' },
        { name: '暗房之暗', subtitle: 'DARKROOM BOSS',  desc: '六重威胁集于一身 · 你能生还吗？', icon: '💀' },
    ];

    function getLevelConfig(level) {
        const idx = Math.min(level, MAX_LEVEL) - 1;
        const filmCounts  = [5, 7, 8, 8, 9, 10, 11, 11, 10, 8, 10];
        const speeds      = [0.010, 0.022, 0.026, 0.030, 0.035, 0.048, 0.052, 0.056, 0.048, 0.045, 0.040];
        const damages     = [0.35, 0.45, 0.50, 0.52, 0.42, 0.62, 0.65, 0.68, 0.45, 0.72, 0.95];
        const chaserSpeed = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.85, 0.75];
        return {
            filmCount: filmCounts[idx],
            safelightSpeed: speeds[idx],
            damage: damages[idx],
            chaserSpeed: chaserSpeed[idx],
            mechanic: idx,
            meta: LEVEL_META[idx],
        };
    }

    // ——— 帧计数器（二级全局变量） ———
    let frameCounter = 60;        // 限时关卡的剩余帧数（10秒内必须捡道具）
    const FRAME_DRAIN_RATE = 6;   // 每秒消耗帧数

    // ——— 脉冲安全灯参数 ———
    let pulsePhase = 0;           // 脉冲相位
    let beamWidth = 0.35;         // 当前光束宽度

    // ——— 双安全灯 ———
    let safelight2Angle = 0;
    let safelight2Dir = 1;

    // ——— 追逐者（Level 5） ———
    let chaser = { x: -100, y: -100, active: false };
    const CHASER_RADIUS = 24;
    let safelightOriginX = 160;   // 移动光源X（关卡7）
    let beamOn = true;            // 频闪开关（关卡8）

    // 生成关卡胶片
    function generateFilmPositions(count) {
        const margin = 2;
        const positions = [];
        const used = new Set();
        let _safety = 0;
        while (positions.length < count && _safety < 1000) {
            _safety++;
            const tx = margin + Math.floor(Math.random() * (COLS - 2 * margin));
            const ty = margin + Math.floor(Math.random() * (ROWS - 2 * margin));
            if (MAP_TEMPLATE[ty][tx] !== 0) continue;
            const key = tx + ',' + ty;
            if (used.has(key)) continue;
            used.add(key);
            positions.push({ tx, ty });
        }
        return positions;
    }

    // 安全灯扫射参数
    const SAFELIGHT = {
        originX: 160,        // 光源 X（天花板中央）
        originY: 0,          // 光源 Y
        range: 148,          // 光束长度（加长）
        angleMin: -0.7,      // 最小角度（弧度）
        angleMax: 0.7,       // 最大角度（弧度）
    };

    // ============================================================
    //  画板引用
    // ============================================================
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // 内部离屏 Canvas（像素操作）
    const offscreen = document.createElement('canvas');
    offscreen.width = W;
    offscreen.height = H;
    const offCtx = offscreen.getContext('2d');

    // ============================================================
    //  像素绘制基元
    // ============================================================
    function px(x, y, color) {
        offCtx.fillStyle = color;
        offCtx.fillRect(x, y, 1, 1);
    }

    function rect(x, y, w, h, color) {
        offCtx.fillStyle = color;
        offCtx.fillRect(x, y, w, h);
    }

    function drawSprite(data, x, y, palette) {
        // data: 二维数组 [行][列]，值 = 调色板索引，-1 = 透明
        for (let row = 0; row < data.length; row++) {
            for (let col = 0; col < data[row].length; col++) {
                const idx = data[row][col];
                if (idx >= 0 && idx < palette.length) {
                    px(x + col, y + row, palette[idx]);
                }
            }
        }
    }

    // ============================================================
    //  点阵字体（3×5 英数 + 常用符号）
    // ============================================================
    const FONT = {
        'A': [[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
        'B': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,1,0]],
        'C': [[0,1,1],[1,0,0],[1,0,0],[1,0,0],[0,1,1]],
        'D': [[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
        'E': [[1,1,1],[1,0,0],[1,1,1],[1,0,0],[1,1,1]],
        'F': [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,0,0]],
        'G': [[0,1,1],[1,0,0],[1,0,1],[1,0,1],[0,1,1]],
        'H': [[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
        'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
        'J': [[0,0,1],[0,0,1],[0,0,1],[1,0,1],[0,1,0]],
        'K': [[1,0,1],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
        'L': [[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
        'M': [[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1]],
        'N': [[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1]],
        'O': [[0,1,0],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
        'P': [[1,1,0],[1,0,1],[1,1,0],[1,0,0],[1,0,0]],
        'Q': [[0,1,0],[1,0,1],[1,0,1],[0,1,0],[0,0,1]],
        'R': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
        'S': [[0,1,1],[1,0,0],[0,1,0],[0,0,1],[1,1,0]],
        'T': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
        'U': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
        'V': [[1,0,1],[1,0,1],[1,0,1],[0,1,0],[0,1,0]],
        'W': [[1,0,1],[1,0,1],[1,1,1],[1,1,1],[1,0,1]],
        'X': [[1,0,1],[1,0,1],[0,1,0],[1,0,1],[1,0,1]],
        'Y': [[1,0,1],[1,0,1],[0,1,0],[0,1,0],[0,1,0]],
        'Z': [[1,1,1],[0,0,1],[0,1,0],[1,0,0],[1,1,1]],
        '0': [[0,1,0],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
        '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
        '2': [[0,1,0],[1,0,1],[0,0,1],[0,1,0],[1,1,1]],
        '3': [[1,1,0],[0,0,1],[0,1,0],[0,0,1],[1,1,0]],
        '4': [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
        '5': [[1,1,1],[1,0,0],[1,1,0],[0,0,1],[1,1,0]],
        '6': [[0,1,1],[1,0,0],[1,1,0],[1,0,1],[0,1,0]],
        '7': [[1,1,1],[0,0,1],[0,1,0],[0,1,0],[0,1,0]],
        '8': [[0,1,0],[1,0,1],[0,1,0],[1,0,1],[0,1,0]],
        '9': [[0,1,0],[1,0,1],[0,1,1],[0,0,1],[0,1,0]],
        ' ': [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
        '.': [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,1,0]],
        ',': [[0,0,0],[0,0,0],[0,0,0],[0,1,0],[1,0,0]],
        '!': [[0,1,0],[0,1,0],[0,1,0],[0,0,0],[0,1,0]],
        ':': [[0,0,0],[0,1,0],[0,0,0],[0,1,0],[0,0,0]],
        '-': [[0,0,0],[0,0,0],[1,1,1],[0,0,0],[0,0,0]],
        '+': [[0,0,0],[0,1,0],[1,1,1],[0,1,0],[0,0,0]],
        '/': [[0,0,1],[0,0,1],[0,1,0],[1,0,0],[1,0,0]],
        '%': [[1,0,1],[0,0,1],[0,1,0],[1,0,0],[1,0,1]],
        '[': [[1,1,0],[1,0,0],[1,0,0],[1,0,0],[1,1,0]],
        ']': [[0,1,1],[0,0,1],[0,0,1],[0,0,1],[0,1,1]],
    };

    function drawText(text, x, y, color, spacing) {
        spacing = spacing || 4;
        const chars = text.toUpperCase().split('');
        let cx = x;
        for (const ch of chars) {
            const glyph = FONT[ch];
            if (!glyph) { cx += spacing; continue; }
            for (let row = 0; row < 5; row++) {
                for (let col = 0; col < 3; col++) {
                    if (glyph[row][col]) {
                        px(cx + col, y + row, color);
                    }
                }
            }
            cx += spacing;
        }
    }

    function drawTextCentered(text, y, color, spacing) {
        const totalWidth = text.length * (spacing || 4);
        const x = (W - totalWidth) / 2;
        drawText(text, Math.floor(x), y, color, spacing);
    }

    // ============================================================
    //  精灵数据
    // ============================================================
    // 玩家角色精灵表（12×16）—— 4 方向 × 2 帧
    // 0=透明 1=肤色 2=头发 3=衣服 4=相机
    const PLAYER_SPRITES = {
        // ——— 朝下 ———
        down0: [
            [0,0,0,0,1,1,1,1,0,0,0,0],
            [0,0,0,1,1,1,1,1,1,0,0,0],
            [0,0,0,1,2,2,2,1,1,0,0,0],
            [0,0,1,1,2,2,2,1,1,1,0,0],
            [0,0,1,1,2,2,2,2,1,1,0,0],
            [0,0,1,1,3,3,3,3,1,1,0,0],
            [0,1,1,1,1,1,1,3,3,1,1,0],
            [0,1,1,1,1,1,1,3,3,1,1,0],
            [0,1,1,1,1,4,1,1,1,1,1,0],
            [1,1,1,1,4,4,4,4,1,1,1,1],
            [1,1,4,4,4,3,4,4,4,4,1,1],
            [0,1,3,3,3,3,3,3,3,3,1,0],
            [0,1,3,3,3,3,3,3,3,3,1,0],
            [0,0,1,3,3,3,3,3,3,1,0,0],
            [0,0,0,1,1,1,1,1,1,0,0,0],
            [0,0,0,0,0,1,0,1,0,0,0,0],
        ],
        down1: [
            [0,0,0,0,1,1,1,1,0,0,0,0],
            [0,0,0,1,1,1,1,1,1,0,0,0],
            [0,0,0,1,2,2,2,1,1,0,0,0],
            [0,0,1,1,2,2,2,1,1,1,0,0],
            [0,0,1,1,2,2,2,2,1,1,0,0],
            [0,0,1,1,3,3,3,3,1,1,0,0],
            [0,1,1,1,1,1,1,3,3,1,1,0],
            [0,1,1,1,1,1,1,3,3,1,1,0],
            [0,1,1,1,1,4,1,1,1,1,1,0],
            [1,1,1,1,4,4,4,4,1,1,1,1],
            [1,1,4,4,4,3,4,4,4,4,1,1],
            [0,1,3,3,3,3,3,3,3,3,1,0],
            [0,1,3,3,3,3,3,3,3,3,1,0],
            [0,0,0,3,3,0,0,3,3,0,0,0],
            [0,0,0,0,1,1,1,1,0,0,0,0],
            [0,0,0,0,1,0,0,1,0,0,0,0],
        ],
        // ——— 朝上 ———
        up0: [
            [0,0,0,0,2,2,2,2,0,0,0,0],
            [0,0,0,2,2,2,2,2,2,0,0,0],
            [0,0,0,2,1,1,1,2,2,0,0,0],
            [0,0,1,1,1,1,1,1,2,1,0,0],
            [0,0,1,1,1,1,1,1,1,1,0,0],
            [0,0,1,1,3,3,3,3,1,1,0,0],
            [0,1,1,1,1,1,1,3,3,1,1,0],
            [0,1,1,1,1,1,1,3,3,1,1,0],
            [0,1,1,1,4,4,4,4,1,1,1,0],
            [1,1,1,4,4,4,4,4,4,1,1,1],
            [1,1,4,4,3,3,4,4,4,4,1,1],
            [0,1,3,3,3,3,3,3,3,3,1,0],
            [0,1,3,3,3,3,3,3,3,3,1,0],
            [0,0,1,3,3,3,3,3,3,1,0,0],
            [0,0,0,1,1,1,1,1,1,0,0,0],
            [0,0,0,0,0,1,0,1,0,0,0,0],
        ],
        up1: [
            [0,0,0,0,2,2,2,2,0,0,0,0],
            [0,0,0,2,2,2,2,2,2,0,0,0],
            [0,0,0,2,1,1,1,2,2,0,0,0],
            [0,0,1,1,1,1,1,1,2,1,0,0],
            [0,0,1,1,1,1,1,1,1,1,0,0],
            [0,0,1,1,3,3,3,3,1,1,0,0],
            [0,1,1,1,1,1,1,3,3,1,1,0],
            [0,1,1,1,1,1,1,3,3,1,1,0],
            [0,1,1,1,4,4,4,4,1,1,1,0],
            [1,1,1,4,4,4,4,4,4,1,1,1],
            [1,1,4,4,3,3,4,4,4,4,1,1],
            [0,1,3,3,3,3,3,3,3,3,1,0],
            [0,1,3,3,3,3,3,3,3,3,1,0],
            [0,0,0,3,3,0,0,3,3,0,0,0],
            [0,0,0,0,1,1,1,1,0,0,0,0],
            [0,0,0,0,1,0,0,1,0,0,0,0],
        ],
        // ——— 朝左 ———
        left0: [
            [0,0,0,0,0,1,1,1,0,0,0,0],
            [0,0,0,0,1,1,1,1,1,0,0,0],
            [0,0,0,0,1,2,2,1,1,0,0,0],
            [0,0,0,1,1,2,2,1,1,0,0,0],
            [0,0,0,1,1,2,2,1,1,0,0,0],
            [0,0,0,1,3,3,3,1,1,0,0,0],
            [0,0,1,1,1,1,3,1,1,0,0,0],
            [0,0,1,1,1,1,3,1,1,0,0,0],
            [0,0,1,1,4,1,1,1,1,0,0,0],
            [0,1,1,4,4,4,1,1,1,1,0,0],
            [0,1,4,4,4,4,3,4,1,1,0,0],
            [0,0,3,3,3,3,3,3,1,0,0,0],
            [0,0,3,3,3,3,3,3,1,0,0,0],
            [0,0,0,3,3,3,3,1,0,0,0,0],
            [0,0,0,0,1,1,1,0,0,0,0,0],
            [0,0,0,0,0,1,0,0,0,0,0,0],
        ],
        left1: [
            [0,0,0,0,0,1,1,1,0,0,0,0],
            [0,0,0,0,1,1,1,1,1,0,0,0],
            [0,0,0,0,1,2,2,1,1,0,0,0],
            [0,0,0,1,1,2,2,1,1,0,0,0],
            [0,0,0,1,1,2,2,1,1,0,0,0],
            [0,0,0,1,3,3,3,1,1,0,0,0],
            [0,0,1,1,1,1,3,1,1,0,0,0],
            [0,0,1,1,1,1,3,1,1,0,0,0],
            [0,0,1,1,4,1,1,1,1,0,0,0],
            [0,1,1,4,4,4,1,1,1,1,0,0],
            [0,1,4,4,4,4,3,4,1,1,0,0],
            [0,0,3,3,0,0,3,3,1,0,0,0],
            [0,0,0,3,3,3,3,0,0,0,0,0],
            [0,0,0,0,1,1,1,0,0,0,0,0],
            [0,0,0,0,1,0,1,0,0,0,0,0],
            [0,0,0,0,0,1,0,0,0,0,0,0],
        ],
    };
    // 朝右 = 朝左的镜像
    PLAYER_SPRITES.right0 = PLAYER_SPRITES.left0.map(row => [...row].reverse());
    PLAYER_SPRITES.right1 = PLAYER_SPRITES.left1.map(row => [...row].reverse());

    const PLAYER_PALETTE = [
        'transparent',      // 0
        C.SKIN,             // 1
        C.HAIR,             // 2
        C.SHIRT,            // 3
        C.SHIRT2,           // 4
    ];

    // 胶片帧精灵（10×10）—— 35mm 胶片框风格，带齿孔
    const FILM_SPRITE = [
        [0,1,1,1,1,1,1,1,1,0],
        [1,2,2,2,2,2,2,2,2,1],
        [1,2,0,0,0,0,0,0,2,1],
        [1,2,0,3,3,3,3,0,2,1],
        [1,2,0,3,3,3,3,0,2,1],
        [1,2,0,3,3,3,3,0,2,1],
        [1,2,0,3,3,3,3,0,2,1],
        [1,2,0,0,0,0,0,0,2,1],
        [1,2,2,2,2,2,2,2,2,1],
        [0,1,1,1,1,1,1,1,1,0],
    ];

    const FILM_PALETTE = [
        'transparent',      // 0
        C.FILM2,            // 1 — 边框（暗金）
        C.FILM,             // 2 — 胶片（琥珀）
        C.CREAM3,           // 3 — 影像（银灰）
    ];

    // 额外帧精灵（限时关卡的奖励道具）—— 加号标记
    const BONUS_SPRITE = [
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [1,1,1,1,1,1,1,1,1,1],
        [1,1,1,1,1,1,1,1,1,1],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
        [0,0,0,0,1,1,0,0,0,0],
    ];

    const BONUS_PALETTE = ['transparent', C.AMBER, C.AMBER2];

    // 停止精灵（L5 补偿剂）—— 圆圈
    const STOP_SPRITE = [
        [0,0,0,1,1,1,1,0,0,0],
        [0,0,1,2,2,2,2,1,0,0],
        [0,1,2,2,2,2,2,2,1,0],
        [1,2,2,2,2,2,2,2,2,1],
        [1,2,2,2,2,2,2,2,2,1],
        [1,2,2,2,2,2,2,2,2,1],
        [1,2,2,2,2,2,2,2,2,1],
        [0,1,2,2,2,2,2,2,1,0],
        [0,0,1,2,2,2,2,1,0,0],
        [0,0,0,1,1,1,1,0,0,0],
    ];
    const STOP_PALETTE = ['transparent', C.CREAM3, C.AMBER];

    // ============================================================
    //  瓦片渲染
    // ============================================================
    function drawTile(tile, tx, ty) {
        const x = tx * TILE;
        const y = ty * TILE;

        switch (tile) {
            case 0: // 地板
                rect(x, y, TILE, TILE, C.FLOOR);
                // 细微纹理
                if ((tx + ty) % 2 === 0) {
                    rect(x + 3, y + 3, 1, 1, C.FLOOR2);
                    rect(x + 11, y + 9, 1, 1, C.FLOOR2);
                } else {
                    rect(x + 7, y + 5, 1, 1, C.FLOOR2);
                }
                break;

            case 1: // 墙
                rect(x, y, TILE, TILE, C.WALL);
                rect(x, y + 14, TILE, 2, C.WALL2);
                // 砖缝
                if (ty % 2 === 0) {
                    rect(x + 7, y + 4, 2, 1, C.DARK);
                } else {
                    rect(x + 7, y + 10, 2, 1, C.DARK);
                }
                break;

            case 2: // 操作台
                rect(x, y, TILE, TILE, C.FLOOR);
                rect(x, y + 10, TILE, 6, C.WOOD);
                rect(x, y + 9, TILE, 1, C.WOOD2);
                rect(x + 2, y + 11, 2, 3, C.METAL);
                rect(x + 12, y + 11, 2, 3, C.METAL);
                break;

            case 3: // 放大机
                rect(x, y, TILE, TILE, C.FLOOR);
                // 底座
                rect(x + 2, y + 10, 12, 6, C.METAL);
                // 立柱
                rect(x + 7, y + 2, 2, 8, C.METAL);
                // 机头
                rect(x + 3, y + 1, 10, 3, C.WOOD);
                rect(x + 5, y + 0, 6, 1, C.AMBER_DIM);
                break;

            case 4: // 水槽
                rect(x, y, TILE, TILE, C.FLOOR);
                rect(x, y + 8, TILE, 8, C.METAL);
                rect(x + 1, y + 9, TILE - 2, 1, C.DARK);
                rect(x + 3, y + 10, 3, 4, C.WALL2);
                rect(x + 10, y + 10, 3, 4, C.WALL2);
                break;

            case 5: // 柜子
                rect(x, y, TILE, TILE, C.FLOOR);
                rect(x + 1, y + 2, 14, 14, C.WOOD);
                rect(x + 2, y + 3, 5, 5, C.WOOD2);
                rect(x + 9, y + 3, 5, 5, C.WOOD2);
                rect(x + 2, y + 10, 5, 5, C.WOOD2);
                rect(x + 9, y + 10, 5, 5, C.WOOD2);
                // 把手
                px(x + 5, y + 5, C.AMBER_DIM);
                px(x + 12, y + 5, C.AMBER_DIM);
                px(x + 5, y + 12, C.AMBER_DIM);
                px(x + 12, y + 12, C.AMBER_DIM);
                break;

            case 6: // 晾干架
                rect(x, y, TILE, TILE, C.FLOOR);
                rect(x + 1, y + 0, 1, TILE, C.METAL);
                rect(x + 14, y + 0, 1, TILE, C.METAL);
                rect(x + 2, y + 3, 12, 1, C.CREAM3);
                rect(x + 2, y + 8, 12, 1, C.CREAM3);
                break;

            case 7: // 架子
                rect(x, y, TILE, TILE, C.FLOOR);
                rect(x + 0, y + 0, TILE, 2, C.WOOD);
                rect(x + 0, y + 7, TILE, 2, C.WOOD);
                rect(x + 0, y + 14, TILE, 2, C.WOOD);
                break;

            default:
                rect(x, y, TILE, TILE, '#ff00ff');
        }
    }

    // ============================================================
    //  游戏状态
    // ============================================================
    let map = [];
    let player = { x: 160, y: 208, w: 12, h: 16, speed: 1.2 };
    let films = [];
    let filmCount = 0;
    let totalFilms = 3;
    let exposure = 100;           // 显影值 0-100
    let gameTime = 0;             // 游戏帧计数
    let keys = {};                // 键盘状态
    let screenState = 'title';    // title | playing | won | gameover
    let titleBlink = 0;
    let wonTimer = 0;
    let particles = [];
    let safelightAngle = 0;
    let safelightDir = 1;
    let flashAlpha = 0;           // 收集闪光
    let currentLevel = 1;         // 当前关卡
    let safelightSpeed = 0.008;   // 动态安全灯速度
    let safelightDamage = 0.2;    // 动态伤害
    let tipTimer = 0;             // 关卡提示剩余帧数（独立计时）
    let playerDir = 'down';       // 角色朝向：up/down/left/right
    let isMoving = false;         // 玩家是否在移动（供 HUD 回调访问）
    let animFrame = 0;            // 动画帧 0/1
    let animTimer = 0;            // 动画计时器
    let wasMoving = false;        // 上一帧是否在移动

    // ============================================================
    //  粒子系统
    // ============================================================
    function addParticles(x, y, color, count) {
        for (let i = 0; i < count; i++) {
            particles.push({
                x: x, y: y,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                life: 30 + Math.random() * 20,
                maxLife: 50,
                color: color,
                size: 1 + Math.random() * 2,
            });
        }
    }

    function updateParticles() {
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            if (p.life <= 0) {
                particles.splice(i, 1);
            }
        }
    }

    function drawParticles() {
        for (const p of particles) {
            const alpha = p.life / p.maxLife;
            offCtx.globalAlpha = alpha * 0.8;
            rect(Math.floor(p.x), Math.floor(p.y), p.size, p.size, p.color);
        }
        offCtx.globalAlpha = 1;
    }

    // ============================================================
    //  音效系统（Web Audio API）
    // ============================================================
    const SOUND = { ctx: null, enabled: true };

    function initAudio() {
        try { SOUND.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { SOUND.enabled = false; }
    }

    function playTone(freq, duration, type, volume) {
        if (!SOUND.enabled || !SOUND.ctx) return;
        try {
            const osc = SOUND.ctx.createOscillator();
            const gain = SOUND.ctx.createGain();
            osc.type = type || 'square';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(volume || 0.08, SOUND.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, SOUND.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(SOUND.ctx.destination);
            osc.start();
            osc.stop(SOUND.ctx.currentTime + duration);
        } catch (e) { /* 静默失败 */ }
    }

    function playNoise(duration, volume) {
        if (!SOUND.enabled || !SOUND.ctx) return;
        try {
            const bufferSize = SOUND.ctx.sampleRate * duration;
            const buffer = SOUND.ctx.createBuffer(1, bufferSize, SOUND.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            const src = SOUND.ctx.createBufferSource();
            src.buffer = buffer;
            const gain = SOUND.ctx.createGain();
            gain.gain.setValueAtTime(volume || 0.03, SOUND.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, SOUND.ctx.currentTime + duration);
            src.connect(gain);
            gain.connect(SOUND.ctx.destination);
            src.start();
        } catch (e) { /* 静默失败 */ }
    }

    function sfxPickup() { playTone(880, 0.1, 'sine', 0.1); setTimeout(() => playTone(1320, 0.15, 'sine', 0.08), 80); }
    function sfxStep() { playNoise(0.04, 0.03); }
    function sfxHit() { playTone(180, 0.15, 'sawtooth', 0.06); }
    function sfxLevelUp() {
        [660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => playTone(f, 0.12, 'sine', 0.08), i * 80));
    }
    function sfxWin() {
        [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.2, 'sine', 0.1), i * 120));
    }
    function sfxGameOver() { playTone(300, 0.3, 'sawtooth', 0.06); setTimeout(() => playTone(200, 0.4, 'sawtooth', 0.05), 200); }

    // ============================================================
    //  地图初始化
    // ============================================================
    function initMap() {
        map = MAP_TEMPLATE.map(row => [...row]);
    }

    function isSolidTile(tx, ty) {
        if (tx < 0 || tx >= COLS || ty < 0 || ty >= ROWS) return true;
        return map[ty][tx] !== 0;
    }

    function isSolidAt(px, py, w, h) {
        // 检查矩形四个角是否与实心瓦片碰撞
        const corners = [
            { x: px, y: py },
            { x: px + w - 1, y: py },
            { x: px, y: py + h - 1 },
            { x: px + w - 1, y: py + h - 1 },
        ];
        for (const c of corners) {
            const tx = Math.floor(c.x / TILE);
            const ty = Math.floor(c.y / TILE);
            if (isSolidTile(tx, ty)) return true;
        }
        return false;
    }

    // ============================================================
    //  胶片初始化
    // ============================================================
    function initFilms() {
        const cfg = getLevelConfig(currentLevel);
        totalFilms = cfg.filmCount;
        const spawns = generateFilmPositions(totalFilms);
        films = spawns.map(s => ({
            x: s.tx * TILE + 3,
            y: s.ty * TILE + 3,
            w: 10,
            h: 10,
            collected: false,
            bob: Math.random() * Math.PI * 2,
            isBonus: false,
        }));

        // 奖励帧：L2有 + L3起每关都有时间限制
        const BOSS = cfg.mechanic >= 10;
        if (cfg.mechanic === 1 || currentLevel >= 3) {
            const bonusSpawns = generateFilmPositions(3);
            bonusSpawns.forEach(s => {
                films.push({
                    x: s.tx * TILE + 3,
                    y: s.ty * TILE + 3,
                    w: 10, h: 10,
                    collected: false,
                    bob: Math.random() * Math.PI * 2,
                    isBonus: true,
                    isStop: false,
                });
            });
        }
        // 血包：L5有 + L6起每关都有 + L10有 + Boss有
        if (cfg.mechanic === 4 || cfg.mechanic === 9 || currentLevel >= 6 || BOSS) {
            const count = (BOSS || cfg.mechanic === 4) ? 4 : 2;
            const stopSpawns = generateFilmPositions(count);
            stopSpawns.forEach(s => {
                films.push({
                    x: s.tx * TILE + 3,
                    y: s.ty * TILE + 3,
                    w: 10, h: 10,
                    collected: false,
                    bob: Math.random() * Math.PI * 2,
                    isBonus: false,
                    isStop: true,
                });
            });
        }
    }

    // ============================================================
    //  安全灯
    // ============================================================
    function updateSafelight() {
        const cfg = getLevelConfig(currentLevel);
        const m = cfg.mechanic;
        const BOSS = m >= 10;

        // 基础摆动
        safelightAngle += safelightSpeed * safelightDir;
        if (safelightAngle > SAFELIGHT.angleMax) {
            safelightAngle = SAFELIGHT.angleMax;
            safelightDir = -1;
        } else if (safelightAngle < SAFELIGHT.angleMin) {
            safelightAngle = SAFELIGHT.angleMin;
            safelightDir = 1;
        }

        // 脉冲光圈 (L3)
        if (m === 2 || BOSS) {
            pulsePhase += 0.025;
            beamWidth = 0.1 + 0.25 * (0.5 + 0.5 * Math.sin(pulsePhase));
        } else {
            beamWidth = 0.35;
        }

        // 双安全灯 (L6)
        if (m === 5 || BOSS) {
            safelight2Angle += safelightSpeed * 0.7 * safelight2Dir;
            if (safelight2Angle > 0.5) safelight2Dir = -1;
            else if (safelight2Angle < -0.5) safelight2Dir = 1;
        }

        // 移动光源 (L7)
        if (m === 6 || BOSS) {
            safelightOriginX = 80 + 160 * (0.5 + 0.5 * Math.sin(gameTime * 0.008));
        } else {
            safelightOriginX = 160;
        }

        // 频闪 (L8)
        if (m === 7 || BOSS) {
            beamOn = Math.sin(gameTime * 0.08) > 0.2;
        } else {
            beamOn = true;
        }

        // 双色滤镜 (L9)
        if (m === 8 || BOSS) {
            safelight2Angle += safelightSpeed * 0.85 * safelight2Dir;
            if (safelight2Angle > 0.6) safelight2Dir = -1;
            else if (safelight2Angle < -0.6) safelight2Dir = 1;
        }

        // 追逐者 (L10 + Boss)
        if (m === 9 || BOSS) {
            if (!chaser.active && (BOSS || gameTime > 120)) {
                chaser.active = true;
                chaser.x = 160 + (Math.random() - 0.5) * 100;
                chaser.y = 30 + Math.random() * 30;
            }
            if (chaser.active) {
                const dx = player.x - chaser.x;
                const dy = player.y - chaser.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const cs = cfg.chaserSpeed || 0.7;
                if (dist > 0) {
                    chaser.x += (dx / dist) * cs;
                    chaser.y += (dy / dist) * cs;
                }
                chaser.x = Math.max(0, Math.min(W, chaser.x));
                chaser.y = Math.max(0, Math.min(H, chaser.y));
            }
        }
    }

    function isInSafelight(px, py, pw, ph) {
        const cfg = getLevelConfig(currentLevel);
        const m = cfg.mechanic;
        const BOSS = m >= 10;
        const cx = px + pw / 2;
        const cy = py + ph / 2;
        const halfCone = (m === 2 || BOSS) ? beamWidth : 0.35;

        // 频闪关闭时无伤害
        if ((m === 7 || BOSS) && !beamOn) return false;

        function checkLight(ox, oy, angle) {
            const dx = cx - ox;
            const dy = cy - oy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > SAFELIGHT.range) return false;
            const beamAngle = angle + Math.PI / 2;
            let diff = Math.atan2(dy, dx) - beamAngle;
            while (diff > Math.PI) diff -= 2 * Math.PI;
            while (diff < -Math.PI) diff += 2 * Math.PI;
            return Math.abs(diff) < halfCone;
        }

        // 主安全灯（使用移动光源X）
        if (checkLight(safelightOriginX, SAFELIGHT.originY, safelightAngle)) return true;

        // 双安全灯 (L6)
        if (m === 5 || BOSS) {
            if (checkLight(320, 0, safelight2Angle)) return true;
        }

        // 双色滤镜 (L9) - 第二道光束更危险
        if (m === 8 || BOSS) {
            if (checkLight(50, 0, safelight2Angle)) return true;
        }

        // 追逐者 (L10 + Boss)
        if ((m === 9 || BOSS) && chaser.active) {
            const dx = cx - chaser.x;
            const dy = cy - chaser.y;
            if (dx * dx + dy * dy < CHASER_RADIUS * CHASER_RADIUS) return true;
        }

        return false;
    }

    function drawSafelight() {
        const cfg = getLevelConfig(currentLevel);
        const m = cfg.mechanic;
        const BOSS = m >= 10;
        const range = SAFELIGHT.range;
        const halfCone = (m === 2 || BOSS) ? beamWidth : 0.35;

        // 频闪时灯光闪烁
        if ((m === 7 || BOSS) && !beamOn) {
            // 灯灭 - 几乎不画
            if (Math.floor(gameTime / 10) % 2 === 0) {
                offCtx.globalAlpha = 0.04;
                rect(safelightOriginX - 2, 0, 4, 4, C.AMBER);
                offCtx.globalAlpha = 1;
            }
            drawTextCentered('⚡ STROBE', 230, C.CREAM3, 5);
            return;
        }

        const mainColor = (m === 9 || BOSS) ? C.RED : C.AMBER;
        const mainDim = (m === 9 || BOSS) ? C.RED_DIM : C.AMBER_DIM;

        function drawBeam(ox, oy, angle, cone, beamColor, glowColor) {
            for (let i = 3; i >= 0; i--) {
                const alpha = 0.03 - i * 0.007;
                if (alpha <= 0) continue;
                const spread = cone * (1 + i * 0.5);
                offCtx.globalAlpha = alpha;
                offCtx.beginPath();
                offCtx.moveTo(ox, oy);
                offCtx.arc(ox, oy, range - i * 15, angle - spread, angle + spread);
                offCtx.closePath();
                offCtx.fillStyle = beamColor;
                offCtx.fill();
            }
            offCtx.globalAlpha = 1;
            offCtx.globalAlpha = 0.6 + 0.3 * Math.sin(gameTime * 0.05);
            rect(ox - 3, oy - 3, 6, 6, beamColor);
            offCtx.globalAlpha = 1;
        }

        // 主灯
        const angle1 = safelightAngle + Math.PI / 2;
        drawBeam(safelightOriginX, SAFELIGHT.originY, angle1, halfCone, mainColor, mainDim);

        // L3: 光圈指示
        if (m === 2 || BOSS) {
            const safe = halfCone < 0.25;
            drawTextCentered(safe ? '◈ NARROW' : '◆ WIDE', 230, safe ? C.AMBER : C.CREAM3, 5);
        }

        // L4: 反应指示
        if (m === 3 || BOSS) {
            drawTextCentered('📸 MOVE = FASTER', 230, C.CREAM3, 4);
        }

        // L5: 被动曝光流失
        if (m === 4 || BOSS) {
            drawTextCentered('☀ EXPOSURE LEAKING', 230, C.CREAM3, 4);
        }

        // L6: 双安全灯
        if (m === 5 || BOSS) {
            const angle2 = safelight2Angle + Math.PI / 2;
            drawBeam(320, 0, angle2, 0.3, C.AMBER, C.AMBER_DIM);
        }

        // L7: 移动光源指示
        if (m === 6 || BOSS) {
            drawTextCentered('↗ LIGHT MOVING', 230, C.CREAM3, 5);
        }

        // L8: 频闪指示
        if ((m === 7 || BOSS) && beamOn) {
            drawTextCentered('⚡ ON', 230, C.AMBER, 5);
        }

        // L9: 第二道光束（白色/蓝色）
        if (m === 8 || BOSS) {
            const angle2 = safelight2Angle + Math.PI / 2;
            drawBeam(50, 0, angle2, 0.3, '#88bbff', '#446688');
            drawTextCentered('🔦 WARM + COLD', 230, C.CREAM3, 4);
        }

        // L10: 追逐者 + Boss
        if ((m === 9 || BOSS) && chaser.active) {
            const cx = Math.floor(chaser.x);
            const cy = Math.floor(chaser.y);
            for (let r = CHASER_RADIUS; r >= 0; r -= 4) {
                const alpha = 0.08 * (1 - r / CHASER_RADIUS);
                offCtx.globalAlpha = alpha;
                offCtx.beginPath();
                offCtx.arc(cx, cy, r, 0, Math.PI * 2);
                offCtx.fillStyle = C.RED;
                offCtx.fill();
            }
            offCtx.globalAlpha = 1;
            offCtx.globalAlpha = 0.8 + 0.2 * Math.sin(gameTime * 0.1);
            rect(cx - 4, cy - 4, 8, 8, C.RED);
            offCtx.globalAlpha = 1;
            // 标识
            drawText('ENLARGER', cx - 20, cy + 10, C.RED, 4);
        }

        // Boss 标识
        if (BOSS) {
            drawTextCentered('💀 BOSS LEVEL', 2, C.RED, 5);
        }
    }

    // ============================================================
    //  渲染：地图
    // ============================================================
    function drawMap() {
        for (let ty = 0; ty < ROWS; ty++) {
            for (let tx = 0; tx < COLS; tx++) {
                drawTile(map[ty][tx], tx, ty);
            }
        }
    }

    // ============================================================
    //  渲染：胶片
    // ============================================================
    function drawFilms() {
        for (const f of films) {
            if (f.collected) continue;
            f.bob += 0.04;
            const bobY = Math.sin(f.bob) * 1;
            const px = Math.floor(f.x);
            const py = Math.floor(f.y + bobY);
            if (f.isStop) {
                drawSprite(STOP_SPRITE, px, py, STOP_PALETTE);
            } else if (f.isBonus) {
                drawSprite(BONUS_SPRITE, px, py, BONUS_PALETTE);
            } else {
                drawSprite(FILM_SPRITE, px, py, FILM_PALETTE);
            }
        }
    }

    // ============================================================
    //  渲染：玩家
    // ============================================================
    function drawPlayer() {
        const px = Math.floor(player.x);
        const py = Math.floor(player.y);
        const key = playerDir + (animFrame % 2);
        const sprite = PLAYER_SPRITES[key] || PLAYER_SPRITES.down0;
        drawSprite(sprite, px, py, PLAYER_PALETTE);

        // 受伤害时闪红
        if (exposure <= 30 && Math.floor(gameTime / 6) % 2 === 0) {
            offCtx.globalAlpha = 0.25;
            rect(px, py, player.w, player.h, C.RED);
            offCtx.globalAlpha = 1;
        }
    }

    // ============================================================
    //  渲染：HUD
    // ============================================================
    function drawHUD() {
        const cfg = getLevelConfig(currentLevel);

        // ——— 左上：胶片计数（像相机计片器） ———
        const frameLabel = (cfg.mechanic === 1 || currentLevel >= 3) ? 'FRM' : 'FILM';
        drawText(frameLabel, 4, 4, C.CREAM2);

        // 胶片 icon（小胶片框）
        if (filmCount > 0) {
            for (let i = 0; i < Math.min(filmCount, 5); i++) {
                rect(4 + i * 8, 12, 6, 4, C.FILM);
                px(4 + i * 8, 12, C.CREAM3);
                px(4 + i * 8 + 5, 12, C.CREAM3);
                px(4 + i * 8, 15, C.CREAM3);
                px(4 + i * 8 + 5, 15, C.CREAM3);
            }
        }
        const countStr = filmCount + '/' + totalFilms;
        drawText(countStr, 4, 18, C.AMBER);

        // ——— 右上：关卡名 ———
        const meta = LEVEL_META[currentLevel - 1] || LEVEL_META[0];
        drawText(meta.icon + ' ' + meta.name, W - 90, 4, C.CREAM2);
        const levelStr = 'LV.' + currentLevel;
        drawText(levelStr, W - 90, 14, C.CREAM3);

        // ——— 显影值（像测光表） ———
        const barX = W - 90;
        const barY = 24;
        const barW = 86;
        const barH = 6;
        rect(barX, barY, barW, barH, C.DARK);
        const fillW = Math.floor((exposure / 100) * barW);
        const fillColor = exposure > 60 ? C.AMBER : (exposure > 30 ? C.AMBER2 : C.RED);
        rect(barX + 1, barY + 1, fillW - 2, barH - 2, fillColor);
        // 测光表标记
        drawText('+', barX + barW - 8, barY - 1, C.CREAM3);
        drawText('-', barX + 2, barY - 1, C.CREAM3);
        // 曝光值数字
        const expStr2 = String(Math.floor(exposure)).padStart(3, ' ');
        drawText(expStr2, W - 38, 33, exposure > 30 ? C.CREAM2 : C.RED);

        // ——— 倒计时（L2 及 L3 起每关） ———
        if (cfg.mechanic === 1 || currentLevel >= 3) {
            const warn = frameCounter < 30;
            drawText('CNT', 4, 28, warn ? C.RED : C.CREAM2);
            drawText(String(frameCounter).padStart(3, ' '), 4, 35, warn ? C.RED : C.AMBER);
        }

        // ——— 关卡专用指示器 ———
        const lvlHud = [
            null,                                            // L1: 无
            null,                                            // L2: 帧数倒计时已在左上
            (w, safe) => { drawText('F:' + Math.round(w*100) + '%', W-70, 32, safe ? C.AMBER : C.CREAM3); },
            () => { drawText(isMoving ? '!! MOVING !!' : 'STANDING', W-90, 32, isMoving ? C.RED : C.CREAM2); },
            () => { drawText('DRAINING', W-90, 32, C.RED_DIM); },
            () => { drawText('2x LIGHT', W-90, 32, C.RED_DIM); },
            () => { drawText('MOVING', W-90, 32, C.CREAM3); },
            () => { drawText(beamOn ? 'ON' : 'OFF', W-90, 32, beamOn ? C.AMBER : C.CREAM3); },
            () => { drawText('COLD BEAM', W-90, 32, '#88bbff'); },
            () => {
                if (chaser.active) { drawText('CHASER', W-90, 32, C.RED); drawText('!!', W-40, 39, C.RED); }
                else { drawText('ENLARGER', W-90, 32, C.CREAM3); }
            },
        ][cfg.mechanic < 10 ? cfg.mechanic : 0];
        if (typeof lvlHud === 'function') {
            if (cfg.mechanic === 2) { const wPct = Math.round((beamWidth-0.1)/0.5*100); lvlHud(beamWidth, beamWidth < 0.25); }
            else { lvlHud(); }
        }

        // Boss 关特殊标识
        if (cfg.mechanic >= 10) {
            drawText('BOSS', W - 90, 32, C.RED);
            drawText('ALL ON', W - 90, 40, C.AMBER);
        }

        // 暗角效果
        drawVignette();
    }

    function drawVignette() {
        // 四边暗角
        const grad = offCtx.createRadialGradient(W/2, H/2, 40, W/2, H/2, 160);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.5)');
        offCtx.fillStyle = grad;
        offCtx.fillRect(0, 0, W, H);

        // 受伤害时边缘泛红
        if (exposure < 40) {
            const intensity = (40 - exposure) / 40 * 0.3;
            offCtx.globalAlpha = intensity;
            offCtx.fillStyle = C.RED;
            offCtx.fillRect(0, 0, W, H);
            offCtx.globalAlpha = 1;
        }
    }

    // ——— 关卡提示（仅显示关卡名） ———
    function drawLevelTip() {
        if (tipTimer <= 0) return;
        const meta = LEVEL_META[currentLevel - 1] || LEVEL_META[0];
        const alpha = Math.min(1, tipTimer / 30);

        offCtx.globalAlpha = alpha * 0.5;
        rect(8, 100, W - 16, 16, C.BLACK);
        offCtx.globalAlpha = alpha;

        drawTextCentered(meta.icon + ' 第' + currentLevel + '关 · ' + meta.name + ' (' + meta.subtitle + ')', 105, C.AMBER, 5);

        offCtx.globalAlpha = 1;
    }

    // ============================================================
    //  渲染：屏幕
    // ============================================================
    function drawTitleScreen() {
        // 背景
        rect(0, 0, W, H, C.BLACK);

        // 地面反射光晕
        const grad = offCtx.createRadialGradient(W/2, H/2 + 20, 10, W/2, H/2 + 20, 100);
        grad.addColorStop(0, C.AMBER_DIM);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        offCtx.fillStyle = grad;
        offCtx.fillRect(0, 0, W, H);

        // 安全灯（闪烁）
        titleBlink += 0.04;
        const blink = 0.4 + 0.3 * Math.sin(titleBlink);
        offCtx.globalAlpha = blink * 0.15;
        offCtx.beginPath();
        offCtx.arc(W/2, 30, 80, 0, Math.PI * 2);
        offCtx.fillStyle = C.AMBER;
        offCtx.fill();
        offCtx.globalAlpha = 1;

        // 安全灯点
        offCtx.globalAlpha = 0.6 + 0.3 * Math.sin(titleBlink * 1.5);
        rect(W/2 - 2, 28, 4, 4, C.AMBER);
        offCtx.globalAlpha = 1;

        // 标题 "暗房"
        drawChineseTitle();

        // 副标题
        drawTextCentered('DARKROOM SHADOW', 108, C.AMBER2);
        drawTextCentered('A FILM PHOTOGRAPHY GAME', 116, C.CREAM3, 4);
        drawTextCentered('---', 124, C.CREAM3);

        // 相机图标（像素风）
        // 机身
        rect(W/2 - 20, 134, 40, 14, C.DARK);
        rect(W/2 - 16, 132, 32, 4, C.DARK);
        // 镜头
        rect(W/2 - 6, 136, 12, 10, C.METAL);
        rect(W/2 - 4, 138, 8, 6, C.WALL2);
        // 取景器
        rect(W/2 + 10, 133, 6, 4, C.WALL2);

        // 操作提示
        drawTextCentered('WASD / ARROWS TO MOVE', 160, C.CREAM3);
        drawTextCentered('🎞 COLLECT YELLOW FILM FRAMES', 168, C.CREAM3, 4);
        // 闪烁 "CLICK TO START"
        if (Math.floor(titleBlink * 2) % 2 === 0) {
            drawTextCentered('CLICK ANYWHERE TO START', 180, C.CREAM);
        }

        // 快速说明
        rect(W/2 - 90, 194, 180, 22, C.BLACK);
        drawText('[ARROW/WASD] Move', 12, 198, C.CREAM2, 4);

        // 底部版权
        drawTextCentered('DARKROOM STUDIO 2026', 232, C.CREAM3, 3);

        // 暗角
        const vg = offCtx.createRadialGradient(W/2, H/2, 60, W/2, H/2, 160);
        vg.addColorStop(0, 'rgba(0,0,0,0)');
        vg.addColorStop(1, 'rgba(0,0,0,0.7)');
        offCtx.fillStyle = vg;
        offCtx.fillRect(0, 0, W, H);
    }

    function drawChineseTitle() {
        // 用 5×7 像素手绘 "暗" "房" 两个字（简化版）
        // "暗" — 7×7 像素
        const an = [
            [0,1,0,0,1,0,0],
            [1,0,1,0,1,0,1],
            [0,1,0,1,0,1,0],
            [1,1,1,1,1,1,1],
            [0,1,0,1,0,1,0],
            [0,1,0,1,0,1,0],
            [0,0,0,1,0,0,0],
        ];
        // "房" — 7×7 像素
        const fang = [
            [0,1,1,0,1,1,0],
            [0,1,0,0,1,0,1],
            [0,1,1,1,1,1,1],
            [0,1,0,0,1,0,1],
            [0,1,0,0,1,0,1],
            [1,1,1,1,0,0,0],
            [1,0,1,0,0,0,0],
        ];

        const startX = Math.floor(W / 2) - 16;
        const startY = 70;

        for (let row = 0; row < 7; row++) {
            for (let col = 0; col < 7; col++) {
                if (an[row][col]) px(startX + col, startY + row, C.AMBER);
                if (fang[row][col]) px(startX + 10 + col, startY + row, C.AMBER);
            }
        }
    }

    function drawWinScreen() {
        // 半透明背景
        rect(0, 0, W, H, C.BLACK);

        // 照片显影动画
        wonTimer++;
        const progress = Math.min(wonTimer / 90, 1);

        // 照片框
        const px = 96, py = 40, pw = 128, ph = 96;
        rect(px, py, pw, ph, C.WOOD);
        rect(px + 4, py + 4, pw - 8, ph - 8, C.FLOOR);

        // 照片从中心向四周显影
        if (progress > 0) {
            const revealW = Math.floor((pw - 8) * progress);
            const revealH = Math.floor((ph - 8) * progress);
            const rx = px + 4 + (pw - 8 - revealW) / 2;
            const ry = py + 4 + (ph - 8 - revealH) / 2;

            // 绘制像素风景照（简化）
            for (let i = 0; i < revealH; i++) {
                for (let j = 0; j < revealW; j++) {
                    const gx = rx + j - (px + 4);
                    const gy = ry + i - (py + 4);
                    // 简单的渐变风景
                    if (gy < revealH * 0.4) {
                        px(rx + j, ry + i, C.AMBER2); // 天空
                    } else if (gy < revealH * 0.6) {
                        px(rx + j, ry + i, C.CREAM3); // 远山
                    } else if (gy < revealH * 0.75) {
                        px(rx + j, ry + i, C.WOOD2);  // 地面
                    } else {
                        px(rx + j, ry + i, C.FLOOR2); // 近地
                    }
                    // 太阳
                    if (j > revealW * 0.7 && gy > revealH * 0.25 && gy < revealH * 0.35) {
                        px(rx + j, ry + i, C.CREAM);
                    }
                }
            }
        }

        // 文字
        const textY = 150;
        drawTextCentered('FILM DEVELOPED', textY, C.AMBER);
        drawTextCentered('SUCCESS', textY + 10, C.CREAM3);

        // 评分
        const seconds = Math.floor(gameTime / 60);
        let grade = 'S';
        if (seconds > 120) grade = 'A';
        if (seconds > 180) grade = 'B';
        if (seconds > 240) grade = 'C';
        if (exposure < 40) grade = String.fromCharCode(grade.charCodeAt(0) + 1);
        if (exposure < 20) grade = String.fromCharCode(grade.charCodeAt(0) + 1);

        drawTextCentered('GRADE: ' + grade, textY + 28, C.AMBER);

        // 统计
        const secStr = String(seconds).padStart(3, ' ');
        const expStr = String(Math.floor(exposure)).padStart(3, ' ');
        drawTextCentered('TIME: ' + secStr + 'S', textY + 42, C.CREAM2);
        drawTextCentered('EXPOSURE: ' + expStr + '%', textY + 50, C.CREAM2);

        if (wonTimer > 120 && Math.floor(wonTimer / 15) % 2 === 0) {
            drawTextCentered('CLICK TO RESTART', textY + 68, C.CREAM);
        }

        // 暗角
        drawVignette();
    }

    function drawGameOverScreen() {
        rect(0, 0, W, H, 'rgba(10,0,0,0.8)');

        const cfg = getLevelConfig(currentLevel);
        if (cfg.mechanic >= 10) {
            drawTextCentered('💀 THE DARKROOM WON', 90, C.RED);
            drawTextCentered('BOSS UNDEFEATED', 102, C.RED);
        } else if (frameCounter <= 0 && currentLevel >= 2) {
            drawTextCentered('OUT OF FRAMES', 90, C.RED);
            drawTextCentered('NOT ENOUGH TIME', 102, C.RED);
        } else if (cfg.mechanic === 4 || currentLevel >= 6) {
            drawTextCentered('ENLARGER CAUGHT YOU', 90, C.RED);
            drawTextCentered('FILM EXPOSED', 102, C.RED);
        } else {
            drawTextCentered('EXPOSURE OVERLOAD', 90, C.RED);
            drawTextCentered('FILM RUINED', 102, C.RED);
        }

        // 闪烁的重试文字
        if (Math.floor(gameTime / 15) % 2 === 0) {
            drawTextCentered('CLICK TO RETRY', 150, C.CREAM);
        }

        drawTextCentered('FILM COLLECTED: ' + filmCount + '/' + totalFilms, 120, C.CREAM2);

        drawVignette();
    }

    // ============================================================
    //  更新逻辑
    // ============================================================
    function updatePlaying() {
        gameTime++;

        // ——— 玩家移动 ———
        let dx = 0, dy = 0;
        if (keys['ArrowLeft'] || keys['KeyA']) dx -= player.speed;
        if (keys['ArrowRight'] || keys['KeyD']) dx += player.speed;
        if (keys['ArrowUp'] || keys['KeyW']) dy -= player.speed;
        if (keys['ArrowDown'] || keys['KeyS']) dy += player.speed;

        // 对角线归一化
        isMoving = (dx !== 0 || dy !== 0);
        if (dx !== 0 && dy !== 0) {
            dx *= 0.707;
            dy *= 0.707;
        }

        // 方向 & 动画
        if (dy < 0) playerDir = 'up';
        else if (dy > 0) playerDir = 'down';
        if (dx < 0) playerDir = 'left';
        else if (dx > 0) playerDir = 'right';

        if (isMoving) {
            animTimer++;
            if (animTimer % 8 === 0) { animFrame = (animFrame + 1) % 2; sfxStep(); }
        } else {
            animFrame = 0;
            animTimer = 0;
        }

        // L4: 反应性——动越快光越快
        const baseSpeed = getLevelConfig(currentLevel).safelightSpeed;
        const mech = getLevelConfig(currentLevel).mechanic;
        if (mech === 3 || mech >= 10) {
            if (isMoving) {
                safelightSpeed = Math.min(baseSpeed * 3.5, safelightSpeed + 0.005);
            } else {
                safelightSpeed = Math.max(baseSpeed, safelightSpeed - 0.001);
            }
        }

        // X 轴碰撞
        if (dx !== 0) {
            const nx = player.x + dx;
            if (!isSolidAt(nx, player.y, player.w, player.h)) {
                player.x = nx;
            } else {
                player.x = Math.round(player.x / TILE) * TILE;
            }
        }

        // Y 轴碰撞
        if (dy !== 0) {
            const ny = player.y + dy;
            if (!isSolidAt(player.x, ny, player.w, player.h)) {
                player.y = ny;
            } else {
                player.y = Math.round(player.y / TILE) * TILE;
            }
        }

        // 边界限制
        player.x = Math.max(0, Math.min(W - player.w, player.x));
        player.y = Math.max(0, Math.min(H - player.h, player.y));

        // ——— 胶片收集（距离检测，容错更大） ———
        const pCenterX = player.x + player.w / 2;
        const pCenterY = player.y + player.h / 2;
        for (const f of films) {
            if (f.collected) continue;
            const fCenterX = f.x + f.w / 2;
            const fCenterY = f.y + f.h / 2;
            const dx = pCenterX - fCenterX;
            const dy = pCenterY - fCenterY;
            if (dx * dx + dy * dy < 16 * 16) {
                f.collected = true;
                if (f.isStop) {
                    exposure = Math.min(100, exposure + 25);
                    flashAlpha = 1;
                    sfxPickup();
                    addParticles(f.x + 5, f.y + 5, C.AMBER, 10);
                } else if (f.isBonus) {
                    frameCounter += 18;
                    flashAlpha = 1;
                    sfxPickup();
                    addParticles(f.x + 4, f.y + 4, C.AMBER2, 8);
                } else {
                    filmCount++;
                    flashAlpha = 1;
                    sfxPickup();
                    addParticles(f.x + 5, f.y + 5, C.AMBER, 12);

                    if (filmCount >= totalFilms) {
                        if (currentLevel < MAX_LEVEL) {
                            sfxLevelUp();
                            currentLevel++;
                            const cfg = getLevelConfig(currentLevel);
                            safelightSpeed = cfg.safelightSpeed;
                            safelightDamage = cfg.damage;
                            frameCounter = 60;
                            chaser.active = false;
                            chaser.x = -100; chaser.y = -100;
                            safelightAngle = 0; safelightDir = 1;
                            safelight2Angle = 0; safelight2Dir = 1;
                            beamOn = true; safelightOriginX = 160;
                            pulsePhase = 0; beamWidth = 0.35;
                            player.x = 160; player.y = 200;
                            exposure = 100; filmCount = 0;
                            gameTime = 0;
                            flashAlpha = 0; particles = [];
                            tipTimer = 240;
                            initMap();
                            initFilms();
                        } else {
                            screenState = 'won';
                            sfxWin();
                            wonTimer = 0;
                        }
                    }
                }
            }
        }

        // ——— 安全灯伤害 ———
        if (isInSafelight(player.x, player.y, player.w, player.h)) {
            exposure -= safelightDamage;
            if (Math.floor(gameTime) % 30 === 0) sfxHit();
            if (exposure <= 0) {
                exposure = 0;
                screenState = 'gameover';
                sfxGameOver();
                gameTime = 0;
            }
        } else {
            const recover = (getLevelConfig(currentLevel).mechanic === 4) ? 0.005 : 0.025;
            exposure = Math.min(100, exposure + recover);
        }

        if (getLevelConfig(currentLevel).mechanic === 4 || getLevelConfig(currentLevel).mechanic >= 10) {
            exposure -= 0.035;
            if (exposure <= 0) {
                exposure = 0;
                screenState = 'gameover';
                sfxGameOver();
            }
        }

        if (currentLevel >= 2 && gameTime % (60 / FRAME_DRAIN_RATE) === 0) {
            frameCounter--;
            if (frameCounter <= 0) {
                exposure = 0;
                screenState = 'gameover';
                sfxGameOver();
            }
        }

        if ((getLevelConfig(currentLevel).mechanic === 4 || getLevelConfig(currentLevel).mechanic >= 10) && !chaser.active) {
            chaser.x = 160 + (Math.random() - 0.5) * 60;
            chaser.y = 20;
        }

        // ——— 安全灯更新 ———
        updateSafelight();

        // ——— 粒子更新 ———
        updateParticles();

        // ——— 闪光衰减 ———
        if (flashAlpha > 0) flashAlpha = Math.max(0, flashAlpha - 0.03);

        // ——— 关卡提示倒计时 ———
        if (tipTimer > 0) tipTimer--;
    }

    // ============================================================
    //  主渲染
    // ============================================================
    function render() {
        // 清空离屏画布
        offCtx.fillStyle = C.BLACK;
        offCtx.fillRect(0, 0, W, H);

        switch (screenState) {
            case 'title':
                drawTitleScreen();
                break;

            case 'playing':
                drawMap();
                drawFilms();
                drawSafelight();
                drawPlayer();
                drawParticles();
                drawHUD();

                // 收集闪光
                if (flashAlpha > 0) {
                    offCtx.globalAlpha = flashAlpha * 0.3;
                    offCtx.fillStyle = C.AMBER;
                    offCtx.fillRect(0, 0, W, H);
                    offCtx.globalAlpha = 1;
                }

                // 胶片颗粒噪点
                if (exposure < 50) {
                    const noise = Math.random() * (50 - exposure) * 0.3;
                    for (let i = 0; i < noise; i++) {
                        const nx = Math.floor(Math.random() * W);
                        const ny = Math.floor(Math.random() * H);
                        offCtx.globalAlpha = 0.15;
                        offCtx.fillStyle = Math.random() > 0.5 ? C.CREAM : C.BLACK;
                        offCtx.fillRect(nx, ny, 1, 1);
                    }
                    offCtx.globalAlpha = 1;
                }

                // 关卡提示浮层
                drawLevelTip();
                break;

            case 'won':
                drawWinScreen();
                break;

            case 'gameover':
                drawMap();
                drawFilms();
                drawSafelight();
                drawPlayer();
                drawHUD();
                drawGameOverScreen();
                break;
        }

        // 将离屏画布缩放到显示画布
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(offscreen, 0, 0, W, H, 0, 0, W * SCALE, H * SCALE);
    }

    // ============================================================
    //  游戏循环
    // ============================================================
    let lastTime = 0;
    let accumulator = 0;

    function gameLoop(timestamp) {
        const delta = timestamp - lastTime;
        lastTime = timestamp;

        // 固定时间步长
        accumulator += delta;
        while (accumulator >= FRAME_TIME) {
            if (screenState === 'playing') {
                updatePlaying();
            } else if (screenState === 'title') {
                titleBlink += 1;
            } else if (screenState === 'gameover') {
                gameTime++;
            }
            accumulator -= FRAME_TIME;
        }

        render();
        requestAnimationFrame(gameLoop);
    }

    // ============================================================
    //  输入处理
    // ============================================================
    document.addEventListener('keydown', e => {
        keys[e.code] = true;

        if (e.code === 'Space' && screenState !== 'title') {
            e.preventDefault();
            if (screenState === 'won' && wonTimer > 120) resetToTitle();
            if (screenState === 'gameover') resetToTitle();
        }
    });

    document.addEventListener('keyup', e => {
        keys[e.code] = false;
    });

    // 触摸/点击支持（移动端）
    canvas.addEventListener('click', () => {
        if (screenState === 'title') {
            startGame();
        } else if (screenState === 'won' && wonTimer > 120) {
            resetToTitle();
        } else if (screenState === 'gameover') {
            resetToTitle();
        }
    });

    // ——— 触摸虚拟摇杆（移动端） ———
    if ('ontouchstart' in window) {
        const touchKeys = {};
        const btnSize = 48, btnGap = 8;
        const btnY = H * SCALE - btnSize - 12;
        const btnX = 12;

        // 创建 D-pad 按钮 DOM
        const dpad = document.createElement('div');
        dpad.style.cssText = 'position:fixed;z-index:10;bottom:12px;left:12px;user-select:none;touch-action:none;';
        dpad.innerHTML = `
            <div style="position:relative;width:${btnSize*3+btnGap*2}px;height:${btnSize*3+btnGap*2}px;">
                <div data-dir="up"    style="position:absolute;top:0;left:${btnSize+btnGap}px;width:${btnSize}px;height:${btnSize}px;background:rgba(245,197,66,0.2);border:1px solid rgba(245,197,66,0.3);border-radius:6px;display:flex;align-items:center;justify-content:center;color:rgba(245,197,66,0.5);font-size:20px;">▲</div>
                <div data-dir="down"  style="position:absolute;bottom:0;left:${btnSize+btnGap}px;width:${btnSize}px;height:${btnSize}px;background:rgba(245,197,66,0.2);border:1px solid rgba(245,197,66,0.3);border-radius:6px;display:flex;align-items:center;justify-content:center;color:rgba(245,197,66,0.5);font-size:20px;">▼</div>
                <div data-dir="left"  style="position:absolute;top:${btnSize+btnGap}px;left:0;width:${btnSize}px;height:${btnSize}px;background:rgba(245,197,66,0.2);border:1px solid rgba(245,197,66,0.3);border-radius:6px;display:flex;align-items:center;justify-content:center;color:rgba(245,197,66,0.5);font-size:20px;">◀</div>
                <div data-dir="right" style="position:absolute;top:${btnSize+btnGap}px;right:0;width:${btnSize}px;height:${btnSize}px;background:rgba(245,197,66,0.2);border:1px solid rgba(245,197,66,0.3);border-radius:6px;display:flex;align-items:center;justify-content:center;color:rgba(245,197,66,0.5);font-size:20px;">▶</div>
            </div>
        `;
        document.body.appendChild(dpad);

        const codeMap = { 'up': 'ArrowUp', 'down': 'ArrowDown', 'left': 'ArrowLeft', 'right': 'ArrowRight' };
        dpad.querySelectorAll('[data-dir]').forEach(el => {
            const code = codeMap[el.dataset.dir];
            el.addEventListener('touchstart', e => { e.preventDefault(); keys[code] = true; el.style.background = 'rgba(245,197,66,0.4)'; });
            el.addEventListener('touchend', e => { e.preventDefault(); keys[code] = false; el.style.background = 'rgba(245,197,66,0.2)'; });
            el.addEventListener('touchcancel', e => { keys[code] = false; el.style.background = 'rgba(245,197,66,0.2)'; });
        });
    }

    // ============================================================
    //  游戏控制
    // ============================================================
    function startGame() {
        screenState = 'playing';
        player.x = 160;
        player.y = 200;
        exposure = 100;
        filmCount = 0;
        gameTime = 0;
        flashAlpha = 0;
        particles = [];
        safelightAngle = 0;
        safelightDir = 1;
        safelight2Angle = 0;
        safelight2Dir = 1;
        currentLevel = 1;
        frameCounter = 60;
        pulsePhase = 0;
        beamWidth = 0.35;
        beamOn = true;
        safelightOriginX = 160;
        chaser.active = false;
        chaser.x = -100;
        chaser.y = -100;
        tipTimer = 240;
        gameTime = 0;
        const cfg = getLevelConfig(1);
        safelightSpeed = cfg.safelightSpeed;
        safelightDamage = cfg.damage;
        initMap();
        initFilms();
    }

    function resetToTitle() {
        screenState = 'title';
        titleBlink = 0;
        wonTimer = 0;
        gameTime = 0;
        currentLevel = 1;
    }

    // ============================================================
    //  主屏交互（点击启动）
    // ============================================================
    // 在标题画面点击也会触发
    // 已经在 click 事件中处理

    // ============================================================
    //  启动
    // ============================================================
    function init() {
        initAudio();
        initMap();
        initFilms();

        // 初始玩家位置
        player.x = 160;
        player.y = 208;

        // 清除键盘状态
        keys = {};

        // 启动游戏循环
        requestAnimationFrame(gameLoop);
    }

    init();

})();
