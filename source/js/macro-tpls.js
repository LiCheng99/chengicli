/* ============================================================
 * macro-tpls.js —— 宏程序模板库（/macro/）
 *   加工中心 39 个 + 车床 3 个，共 42 个
 *   这里只放「参数定义 + NC 生成」，界面逻辑在 macro-gen.js
 *   Node 下可以 require 进来做批量自检
 *
 * 约定：
 *   - 深度类参数一律填正数，程序内部取负（#4=-20.）
 *   - 内孔顺铣走 G02，外圆顺铣走 G03；要逆铣就把两者对调
 *   - 程序号 O0001~O0039 对应加工中心，O0040~ 对应车床
 * ============================================================ */
(function () {
  'use strict';

  /* 数值统一保留小数，顺手抹掉 -0 这种不好看的写法 */
  function num(n, dec) {
    n = Number(n);
    if (!isFinite(n)) n = 0;
    var d = dec == null ? 3 : dec;
    var p = Math.pow(10, d);
    var r = Math.round(n * p) / p;
    if (r === 0) r = 0;
    return String(r);
  }

  /* 变量行对齐：#3=50 补空格到 17 列再写注释，看着整齐也好改 */
  function v(name, val, note) {
    var s = name + '=' + val;
    if (s.length < 17) { while (s.length < 17) s += ' '; }
    else { s += '  '; }
    return s + '(' + note + ')';
  }

  function pushHeader(L, title, note) {
    L.push(title);
    if (note) L.push('(' + note + ')');
    L.push('');
  }

  /* ================================================================
   *  中文注释 → 英文注释
   *  Fanuc 面板显示不了中文，导出的 NC 里注释必须全是 ASCII。
   *  源码里保持中文好维护，这里在导出时统一翻译一遍。
   *  匹配按「长串优先」，短词放后面不会把长句打断。
   * ================================================================ */
  var CMT = [
    /* ---- 孔系 ---- */
    ['最后一圈不超深', 'LAST REV CLAMPED TO DEPTH'],
    ['在孔底移到轨迹半径', 'MOVE TO PATH RADIUS AT BOTTOM'],
    ['穿过底孔下到孔底', 'PLUNGE THROUGH PILOT TO BOTTOM'],
    ['起刀 Z, 孔底以下', 'START Z, BELOW HOLE BOTTOM'],
    ['中心下到本圈高度', 'PLUNGE AT CENTER TO THIS Z'],
    ['到底光整一圈', 'FULL CIRCLE AT BOTTOM'],
    ['孔口光整一圈', 'FULL CIRCLE AT HOLE TOP'],
    ['底面光整一圈', 'FULL CIRCLE ON BOTTOM FACE'],
    ['本层整圆一圈', 'FULL CIRCLE AT THIS LEVEL'],
    ['径向进到锥面', 'FEED TO TAPER SURFACE'],
    ['口部直径, Z=0', 'TOP DIA, Z=0'],
    ['锥孔深度, 负值', 'TAPER DEPTH, NEGATIVE'],
    ['本层锥面半径', 'TAPER RADIUS THIS LEVEL'],
    ['每圈下刀', 'PITCH PER REV'],
    ['每圈上升', 'RISE PER REV'],
    ['精加工余量', 'FINISH STOCK'],
    ['中心下刀一层', 'PLUNGE AT CENTER, ONE PASS'],
    ['中心下刀', 'PLUNGE AT CENTER'],
    ['径向进刀', 'RADIAL FEED IN'],
    ['轨迹半径', 'PATH RADIUS'],
    ['孔口', 'HOLE TOP'],
    ['孔心 X', 'HOLE CENTER X'],
    ['孔心 Y', 'HOLE CENTER Y'],
    ['孔口处', 'AT HOLE TOP'],
    ['孔底', 'HOLE BOTTOM'],
    ['圆心 X', 'CENTER X'],
    ['圆心 Y', 'CENTER Y'],
    ['中心 X', 'CENTER X'],
    ['中心 Y', 'CENTER Y'],
    ['孔径', 'HOLE DIA'],
    ['凸台直径', 'BOSS DIA'],
    ['底部直径', 'BOTTOM DIA'],
    ['外径', 'OD'],
    ['刀具直径', 'TOOL DIA'],
    ['球刀直径', 'BALL NOSE DIA'],
    ['球刀半径', 'BALL NOSE RADIUS'],
    ['球半径 R', 'BALL RADIUS R'],
    ['圆角 R', 'FILLET R'],
    ['圆角圆心半径', 'FILLET CENTER RADIUS'],
    ['刀心圆弧半径', 'CUTTER CENTER ARC RADIUS'],
    ['从孔壁根部起算', 'MEASURED FROM WALL ROOT'],
    ['本圈轨迹半径', 'PATH RADIUS THIS RING'],
    ['角度步距, 度', 'ANGLE STEP, DEG'],
    ['深度, 负值', 'DEPTH, NEGATIVE'],
    ['高度, 负值', 'HEIGHT, NEGATIVE'],
    ['当前 Z', 'CURRENT Z'],
    ['本圈 Z', 'Z THIS RING'],
    ['绕孔一圈', 'ONE CIRCLE AROUND HOLE'],
    ['逆时针绕外圆下行', 'CCW AROUND OD, DOWNWARD'],
    ['退回圆心', 'RETURN TO CENTER'],
    ['回中心', 'RETURN TO CENTER'],
    ['整圆一圈', 'FULL CIRCLE'],
    ['到孔口为止', 'UP TO HOLE TOP'],
    ['每层切深', 'DEPTH PER PASS'],
    ['球顶', 'BALL TOP'],
    ['球心 X', 'BALL CENTER X'],
    ['球心 Y', 'BALL CENTER Y'],
    ['层距, Z', 'LAYER STEP, Z'],
    ['本层刀心圆半径', 'CUTTER CENTER R THIS LEVEL'],

    /* ---- 平面 ---- */
    ['矩形区域往复面铣', 'RECT FACE MILL'],
    ['圆形区域同心环', 'CIRCLE FACE MILL'],
    ['长度, X 向', 'LENGTH, X'],
    ['宽度, Y 向', 'WIDTH, Y'],
    ['行距系数', 'STEPOVER RATIO'],
    ['环距系数', 'RING PITCH RATIO'],
    ['最大刀心半径', 'MAX CUTTER CENTER R'],
    ['X 半行程', 'X HALF TRAVEL'],
    ['Y 半行程', 'Y HALF TRAVEL'],
    ['走刀行数', 'PASS COUNT'],
    ['实际行距', 'ACTUAL STEPOVER'],
    ['已走行数', 'PASS INDEX'],
    ['当前 Y 偏移', 'Y OFFSET NOW'],
    ['走刀方向', 'CUT DIRECTION'],
    ['区域直径', 'ZONE DIA'],
    ['第一圈半径', 'FIRST RING RADIUS'],
    ['当前圈半径', 'CURRENT RING R'],
    ['最外圈光一刀', 'FINISH PASS ON OUTER RING'],
    ['每圈外扩', 'EXPAND PER REV'],
    ['当前角度', 'CURRENT ANGLE'],
    ['当前半径', 'CURRENT RADIUS'],
    ['终止角', 'END ANGLE'],
    ['圈数', 'REV COUNT'],
    ['行距', 'STEPOVER'],
    ['环距', 'RING PITCH'],
    ['起点 X', 'START X'],
    ['起点 Y', 'START Y'],
    ['覆盖宽度', 'COVER WIDTH'],
    ['刀盘直径', 'CUTTER HEAD DIA'],
    ['切深, 负值', 'CUT DEPTH, NEGATIVE'],
    ['从最上一行开始', 'START AT TOP ROW'],
    ['单向切削', 'ONE WAY CUT'],
    ['快速回起点', 'RAPID BACK TO START'],
    ['抬刀', 'RETRACT'],
    /* ---- 槽与型腔 ---- */
    ['横向可分布宽度', 'AVAILABLE WIDTH'],
    ['螺旋半径 = 刀径/4', 'SPIRAL R = TOOL DIA/4'],
    ['螺旋下刀一层', 'HELICAL RAMP ONE PASS'],
    ['沿槽走到另一端', 'CUT ALONG SLOT TO FAR END'],
    ['槽长, 圆心距', 'SLOT LENGTH, CENTER DIST'],
    ['槽深, 负值', 'SLOT DEPTH, NEGATIVE'],
    ['槽中心 Y', 'SLOT CENTER Y'],
    ['槽起点 X', 'SLOT START X'],
    ['槽宽', 'SLOT WIDTH'],
    ['先沿壁清一圈', 'WALL PASS FIRST'],
    ['中间光栅', 'RASTER INSIDE'],
    ['最内环别缩成一条线', 'KEEP INNER RING OPEN'],
    ['移到本环左下角', 'MOVE TO LOWER LEFT OF RING'],
    ['第几环, 从内到外', 'RING INDEX, INSIDE OUT'],
    ['本环 X 半行程', 'X HALF TRAVEL THIS RING'],
    ['本环 Y 半行程', 'Y HALF TRAVEL THIS RING'],
    ['腔中心 X', 'POCKET CENTER X'],
    ['腔中心 Y', 'POCKET CENTER Y'],
    ['腔长, X 向', 'POCKET LENGTH, X'],
    ['腔宽, Y 向', 'POCKET WIDTH, Y'],
    ['腔深, 负值', 'POCKET DEPTH, NEGATIVE'],
    ['引到左下角外侧', 'LEAD IN OUTSIDE LOWER LEFT'],
    ['分刀数', 'PASS COUNT'],
    ['第几刀', 'PASS INDEX'],
    ['本环', 'THIS RING'],
    ['第几环', 'RING INDEX'],
    ['环数', 'RING COUNT'],
    ['走一刀', 'CUT ONE PASS'],
    ['回起点', 'BACK TO START'],
    ['下刀', 'PLUNGE'],
    ['X 半长', 'X HALF LENGTH'],
    ['Y 半宽', 'Y HALF WIDTH'],
    ['建立刀补', 'ENGAGE CUTTER COMP'],

    /* ---- 轮廓 ---- */
    ['引到左边中部外侧', 'LEAD IN OUTSIDE LEFT MIDDLE'],
    ['引到第一个顶点外侧', 'LEAD IN OUTSIDE FIRST VERTEX'],
    ['闭合回第一个顶点', 'CLOSE BACK TO FIRST VERTEX'],
    ['第几个顶点, 奇数在内凹点', 'VERTEX INDEX, ODD IS INNER POINT'],
    ['点表: #100 起存 X, #200 起存 Y, 按图纸改数值即可', 'PT TABLE: X FROM #100, Y FROM #200, EDIT TO DRAWING'],
    ['点表: #100 起 X, #200 起 Y, 按图纸改数值', 'PT TABLE: X FROM #100, Y FROM #200, EDIT TO DRAWING'],
    ['坐标点表: #100 起存 X, #200 起存 Y', 'PT TABLE: X FROM #100, Y FROM #200'],
    ['左上圆角', 'TOP LEFT RADIUS'],
    ['右上圆角', 'TOP RIGHT RADIUS'],
    ['右下圆角', 'LOWER RIGHT RADIUS'],
    ['左下圆角', 'LOWER LEFT RADIUS'],
    ['左边直段', 'LEFT STRAIGHT'],
    ['上边直段', 'TOP STRAIGHT'],
    ['右边直段', 'RIGHT STRAIGHT'],
    ['下边直段', 'BOTTOM STRAIGHT'],
    ['外接圆半径', 'CIRCUMSCRIBED R'],
    ['外接半径 R', 'CIRCUMSCRIBED R'],
    ['内凹半径 = 0.382R', 'INNER R = 0.382R'],
    ['奇数点用内凹半径', 'ODD VERTEX USES INNER R'],
    ['默认外顶点', 'DEFAULT OUTER VERTEX'],
    ['第几个顶点', 'VERTEX INDEX'],
    ['参考中心 X', 'REF CENTER X'],
    ['参考中心 Y', 'REF CENTER Y'],
    ['长半轴 A', 'MAJOR SEMI AXIS A'],
    ['短半轴 B', 'MINOR SEMI AXIS B'],
    ['缩放系数 = 宽度/32', 'SCALE = WIDTH/32'],
    ['参数 t, 度', 'PARAM t, DEG'],
    ['引到第 1 点', 'LEAD IN TO POINT 1'],
    ['对边宽', 'ACROSS FLATS'],
    ['边数', 'SIDE COUNT'],
    ['点数', 'POINT COUNT'],
    ['闭合', 'CLOSE'],

    /* ---- 斜面与曲面 ---- */
    ['坐标系绕起点转 #3 度', 'ROTATE COORD #3 DEG ABOUT START'],
    ['斜着走一刀', 'CUT ALONG TILTED DIRECTION'],
    ['取消坐标旋转', 'CANCEL COORD ROTATION'],
    ['过渡比例 0=方 1=圆', 'BLEND RATIO 0=SQ 1=CIRCLE'],
    ['过渡高度, 负值', 'TRANSITION HEIGHT, NEGATIVE'],
    ['方形的极坐标半径', 'SQUARE POLAR RADIUS'],
    ['方形边缘半径', 'SQUARE EDGE RADIUS'],
    ['本层插值半径', 'INTERP RADIUS THIS LEVEL'],
    ['底边方宽', 'BOTTOM SQUARE WIDTH'],
    ['顶部圆直径', 'TOP CIRCLE DIA'],
    ['扣掉刀半径', 'MINUS TOOL RADIUS'],
    ['起点 X, 此处 Z=0', 'START X, Z=0 HERE'],
    ['斜面长度, X 向', 'TAPER LENGTH, X'],
    ['斜面角度, 度', 'TAPER ANGLE, DEG'],
    ['沿 X 已走距离', 'X DISTANCE TRAVELED'],
    ['分段长度', 'SEGMENT LENGTH'],
    ['本点 Z', 'Z AT THIS POINT'],
    ['旋转中心 X', 'ROT ROTATION CENTER X'],
    ['旋转中心 Y', 'ROTATION CENTER Y'],
    ['坐标系转角, 度', 'COORD ROTATION, DEG'],
    ['本行 Y', 'Y THIS ROW'],
    ['第几行', 'ROW INDEX'],
    ['行数', 'ROW COUNT'],
    ['斜率', 'SLOPE'],
    ['球心', 'BALL CENTER'],
    ['球刀', 'BALL NOSE'],
    ['层距', 'LAYER STEP'],

    /* ---- 螺纹 ---- */
    ['总回转角度', 'TOTAL SWEEP ANGLE'],
    ['螺纹中心 X', 'THREAD CENTER X'],
    ['螺纹中心 Y', 'THREAD CENTER Y'],
    ['螺纹大径', 'MAJOR DIA'],
    ['螺纹长度', 'THREAD LENGTH'],
    ['螺旋圈数', 'HELICAL REV COUNT'],
    ['一圈升一个螺距', 'ONE PITCH PER REV'],
    ['整圆, Z 不变', 'FULL CIRCLE, Z CONSTANT'],
    ['下降一个螺距', 'STEP DOWN ONE PITCH'],
    ['铣刀直径', 'MILL DIA'],
    ['回转角', 'SWEEP ANGLE'],
    ['第几圈', 'REV INDEX'],
    ['螺距', 'PITCH'],
    ['小径 = 大径 - 2×牙高', 'MINOR DIA = MAJOR - 2 x HEIGHT'],
    ['牙高, 单边 = 0.6495P', 'THREAD HEIGHT, PER SIDE = 0.6495P'],

    /* ---- 孔阵列与沉孔 ---- */
    ['圆周均布孔螺旋铣', 'BOLT HOLE HELICAL MILL'],
    ['本圈第几个孔', 'HOLE INDEX THIS RING'],
    ['分布圆心 X', 'BOLT CENTER X'],
    ['分布圆心 Y', 'BOLT CENTER Y'],
    ['单孔轨迹半径', 'PATH RADIUS PER HOLE'],
    ['底孔深度, 负值', 'PILOT DEPTH, NEGATIVE'],
    ['本层轨迹半径', 'PATH RADIUS THIS LEVEL'],
    ['先抬到孔口以上', 'RETRACT ABOVE HOLE TOP FIRST'],
    ['沉头深度', 'CSK DEPTH'],
    ['沉头大径', 'CSK MAJOR DIA'],
    ['底孔直径', 'PILOT DIA'],
    ['分布半径', 'BOLT CIRCLE R'],
    ['孔深, 负值', 'HOLE DEPTH, NEGATIVE'],
    ['每圈半径增量', 'RADIUS STEP PER RING'],
    ['每圈孔数', 'HOLES PER RING'],
    ['本圈半径', 'RADIUS THIS RING'],
    ['起始半径', 'START RADIUS'],
    ['锥面层深', 'CONE LAYER DEPTH'],
    ['孔底光整', 'FINISH PASS AT BOTTOM'],
    ['本孔角度', 'ANGLE THIS HOLE'],
    ['1. 钻底孔', '1. DRILL PILOT'],
    ['2. 铣沉头锥面', '2. MILL COUNTERSINK'],
    ['R 平面', 'R PLANE'],
    ['孔计数', 'HOLE INDEX'],
    ['角步距', 'ANGLE STEP'],
    ['当前角', 'CURRENT ANGLE'],
    ['孔位 X', 'HOLE X'],
    ['孔位 Y', 'HOLE Y'],
    ['行数, Y 向', 'ROWS, Y'],
    ['列数, X 向', 'COLUMNS, X'],
    ['第几个孔', 'HOLE INDEX'],
    ['回孔心', 'BACK TO HOLE CENTER'],
    ['下到本层', 'FEED TO THIS LEVEL'],
    ['列距', 'COL PITCH'],
    ['孔数', 'HOLE COUNT'],
    ['孔深', 'HOLE DEPTH'],

    /* ---- 车床 ---- */
    ['每刀切深, 半径', 'CUT DEPTH PER PASS, RADIUS'],
    ['X 精车余量, 直径', 'X FINISH STOCK, DIA'],
    ['收尾贴到槽的另一侧', 'FINISH AGAINST FAR WALL'],
    ['加工长度', 'MACHINING LENGTH'],
    ['毛坯直径', 'BLANK DIA'],
    ['成品直径', 'FINISH DIA'],
    ['槽起点 Z', 'GROOVE START Z'],
    ['槽深, 单边', 'GROOVE DEPTH, PER SIDE'],
    ['槽底直径', 'GROOVE BOTTOM DIA'],
    ['当前 Z 偏移', 'Z OFFSET NOW'],
    ['Z 精车余量', 'Z FINISH STOCK'],
    ['刀宽', 'TOOL WIDTH'],

    /* ---- 补漏 ---- */
    ['起点 Y, 轮廓线', 'START Y, ON PROFILE'],
    ['斜线进刀, 建立左刀补', 'RAMP IN, ENGAGE G41'],
    ['引到轮廓外侧上方', 'LEAD IN ABOVE PROFILE OUTSIDE'],
    ['沿轮廓走一刀', 'CUT ALONG PROFILE'],
    ['取消刀补, 引出', 'G40, LEAD OUT'],
    ['引入引出距离', 'LEAD IN OUT DIST'],
    ['当前 dz, 从球顶往下', 'dz FROM BALL TOP DOWN'],
    ['当前 dz, 从球底往上', 'dz FROM BALL BOTTOM UP'],
    ['刀心球面半径 Rc', 'CUTTER CENTER SPHERE Rc'],
    ['起始 Z = Rc', 'START Z = Rc'],
    ['起始 Z = -Rc', 'START Z = -Rc'],
    ['从球底往上', 'FROM BALL BOTTOM UP'],
    ['球底', 'BALL BOTTOM'],
    ['起始角, 度', 'START ANGLE, DEG'],
    ['终止角, 度', 'END ANGLE, DEG'],
    ['总深度, 负值', 'TOTAL DEPTH, NEGATIVE'],
    ['Y 向半行程', 'Y HALF TRAVEL'],
    ['下刀一层', 'PLUNGE ONE PASS'],
    ['沿轮廓', 'ALONG PROFILE'],
    ['轮廓线', 'PROFILE LINE'],
    ['走刀长度', 'CUT LENGTH'],
    ['径向切宽', 'RADIAL WIDTH'],
    ['圆弧半径', 'ARC RADIUS'],
    ['退回中心', 'RETURN TO CENTER'],
    ['宽度', 'WIDTH'],
    [' 度', ' DEG'],
    ['行', 'ROW'],
    ['列', 'COL']
  ];

  /* 长串优先，短词放后面不会把长句切碎 */
  CMT.sort(function (a, b) { return b[0].length - a[0].length; });

  function trText(s) {
    for (var i = 0; i < CMT.length; i++) {
      if (s.indexOf(CMT[i][0]) >= 0) s = s.split(CMT[i][0]).join(CMT[i][1]);
    }
    return s.replace(/·/g, '-').replace(/，/g, ', ').replace(/、/g, ', ').replace(/；/g, '; ');
  }

  /* 只翻译注释段（行内第一个括号之后），代码部分一个字符都不动 */
  function trCode(code) {
    return String(code).split('\n').map(function (l) {
      var i = l.indexOf('(');
      if (i < 0) return l;
      return l.slice(0, i) + trText(l.slice(i));
    }).join('\n');
  }

  /* 加工中心统一开头：绝对坐标、G54、取消补偿、公制 */
  function millHead(L, p) {
    L.push('G90 G54 G17 G40 G49 G80 G21');
    L.push('G00 X' + num(p.x) + ' Y' + num(p.y));
    L.push('S' + p.s + ' M03');
    L.push('G43 H' + p.h + ' Z50');
    L.push('');
  }

  /* 加工中心统一结尾 */
  function millEnd(L) {
    L.push('');
    L.push('G00 Z50');
    L.push('M05');
    L.push('M30');
  }

  var TPL = {

    /* ================================================================
     *  一、孔系（内孔 / 外圆 / 锥面 / 孔口）
     * ================================================================ */

    pocket: {
      kind: 'mill', g: 'hole', no: 'O0001',
      name: '内孔螺旋铣',
      desc: '刀具在孔中心斜进刀，沿圆周连续螺旋下刀，每转一圈只降一个「每圈下刀量」，到底再整圆光一刀。刀路是一整条螺旋线，没有分层接刀痕，适合圆孔、圆腔、沉孔的精加工。轨迹半径 =（孔径 − 刀径）/ 2 − 余量，必须大于 0。',
      fields: [
        { k: 'x', label: '圆心 X', def: 0, step: 0.1 },
        { k: 'y', label: '圆心 Y', def: 0, step: 0.1 },
        { k: 'd', label: '孔径', def: 50, step: 0.1, min: 1 },
        { k: 'z', label: '深度', def: 20, step: 0.1, min: 0.1, tip: '填正数，程序自动取负' },
        { k: 'td', label: '刀具直径', def: 10, step: 0.1, min: 1 },
        { k: 'q', label: '每圈下刀', def: 2, step: 0.1, min: 0.05, tip: '螺旋一圈沿 Z 下降的量，一般 0.5~2' },
        { k: 'fin', label: '精加工余量', def: 0.5, step: 0.1, min: 0 },
        { k: 's', label: '转速 S', def: 2000, step: 50 },
        { k: 'f', label: '进给 F', def: 1000, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        var r = (p.d - p.td) / 2 - p.fin;
        if (r <= 0) return '刀具太大或余量太大：轨迹半径算出来是 ' + num(r) + '，必须大于 0';
        return null;
      },
      gen: function (p) {
        var r = (p.d - p.td) / 2 - p.fin;
        var z = -Math.abs(p.z);
        var L = [];
        pushHeader(L, 'O0001 (HELICAL POCKET MILL)', 'HELICAL POCKET MILL - CONTINUOUS SPIRAL DOWN, FINISH PASS');
        millHead(L, p);

        L.push(v('#1', num(p.x), '圆心 X'));
        L.push(v('#2', num(p.y), '圆心 Y'));
        L.push(v('#3', num(p.d), '孔径'));
        L.push(v('#4', num(z), '深度, 负值'));
        L.push(v('#5', num(p.td), '刀具直径'));
        L.push(v('#6', num(p.q), '每圈下刀'));
        L.push(v('#7', num(p.fin), '精加工余量'));
        L.push(v('#8', '[#3-#5]/2-#7', '轨迹半径 ' + num(r)));
        L.push('');

        L.push('G01 Z0 F' + num(p.f * 0.6));
        L.push('G01 X[#1+#8] F' + num(p.f));
        L.push('');
        L.push('#9=0             (当前 Z)');
        L.push('WHILE [#9 GT #4] DO 1');
        L.push('  #9=#9-#6');
        L.push('  IF [#9 LT #4] THEN #9=#4    (最后一圈不超深)');
        L.push('  G02 X[#1+#8] Y#2 Z#9 I-[#8] J0 F' + num(p.f));
        L.push('END 1');
        L.push('');
        L.push('G02 X[#1+#8] Y#2 I-[#8] J0 F' + num(p.f * 0.8) + '   (到底光整一圈)');
        L.push('G01 X#1 F' + num(p.f * 0.6) + '       (退回圆心)');
        millEnd(L);
        return L.join('\n');
      }
    },

    helixHole: {
      kind: 'mill', g: 'hole', no: 'O0002',
      name: '螺旋铣孔',
      desc: '先在孔位钻一个底孔，铣刀从底孔穿下来，再<b>由下往上</b>螺旋扩孔，铁屑靠自重往下掉，不会二次切削。适合大直径通孔、法兰螺栓过孔。跟「内孔螺旋铣」的区别：那个从上往下、刀在孔口起刀，这个必须事先有底孔、从孔底起刀。',
      fields: [
        { k: 'x', label: '圆心 X', def: 0, step: 0.1 },
        { k: 'y', label: '圆心 Y', def: 0, step: 0.1 },
        { k: 'd', label: '孔径', def: 60, step: 0.1, min: 1 },
        { k: 'th', label: '板厚', def: 20, step: 0.1, min: 0.5, tip: '通孔深度，刀具会快速下到孔底下方 3mm' },
        { k: 'td', label: '刀具直径', def: 12, step: 0.1, min: 1 },
        { k: 'q', label: '每圈上升', def: 1.5, step: 0.1, min: 0.05 },
        { k: 'fin', label: '精加工余量', def: 0.3, step: 0.1, min: 0 },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 800, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        var r = (p.d - p.td) / 2 - p.fin;
        if (r <= 0) return '刀具太大或余量太大：轨迹半径算出来是 ' + num(r) + '，必须大于 0';
        if (p.td > p.d - 4) return '底孔要能让刀穿过：刀具直径应小于孔径减 4mm';
        return null;
      },
      gen: function (p) {
        var r = (p.d - p.td) / 2 - p.fin;
        var bot = -Math.abs(p.th) - 3;
        var L = [];
        pushHeader(L, 'O0002 (BOTTOM-UP HELICAL BORE)', 'BOTTOM-UP HELICAL BORE - PRE-DRILL, EXPAND UPWARD');
        millHead(L, p);

        L.push(v('#1', num(p.x), '圆心 X'));
        L.push(v('#2', num(p.y), '圆心 Y'));
        L.push(v('#3', num(p.d), '孔径'));
        L.push(v('#4', num(bot), '起刀 Z, 孔底以下'));
        L.push(v('#5', num(p.td), '刀具直径'));
        L.push(v('#6', num(p.q), '每圈上升'));
        L.push(v('#7', num(p.fin), '精加工余量'));
        L.push(v('#8', '[#3-#5]/2-#7', '轨迹半径 ' + num(r)));
        L.push('');

        L.push('G00 Z#4          (穿过底孔下到孔底)');
        L.push('G01 X[#1+#8] F' + num(p.f * 0.5) + '    (在孔底移到轨迹半径)');
        L.push('');
        L.push('#9=#4           (当前 Z)');
        L.push('WHILE [#9 LT 0] DO 1');
        L.push('  #9=#9+#6');
        L.push('  IF [#9 GT 0] THEN #9=0      (到孔口为止)');
        L.push('  G02 X[#1+#8] Y#2 Z#9 I-[#8] J0 F' + num(p.f));
        L.push('END 1');
        L.push('');
        L.push('G02 X[#1+#8] Y#2 I-[#8] J0 F' + num(p.f * 0.8) + '   (孔口光整一圈)');
        L.push('G01 X#1 F' + num(p.f * 0.6));
        millEnd(L);
        return L.join('\n');
      }
    },

    boreMill: {
      kind: 'mill', g: 'hole', no: 'O0003',
      name: '内孔铣',
      desc: '分层整圆：在孔中心垂直下刀一个层深，径向走到轨迹半径，走一整圈，回中心再下一层。圆度靠机床圆弧插补保证，不依赖螺旋功能，老系统也能跑。切削负载比连续螺旋大，适合软材料和大切宽。',
      fields: [
        { k: 'x', label: '圆心 X', def: 0, step: 0.1 },
        { k: 'y', label: '圆心 Y', def: 0, step: 0.1 },
        { k: 'd', label: '孔径', def: 40, step: 0.1, min: 1 },
        { k: 'z', label: '深度', def: 25, step: 0.1, min: 0.1, tip: '填正数，程序自动取负' },
        { k: 'td', label: '刀具直径', def: 10, step: 0.1, min: 1 },
        { k: 'q', label: '每层切深', def: 3, step: 0.1, min: 0.1 },
        { k: 'fin', label: '精加工余量', def: 0.3, step: 0.1, min: 0 },
        { k: 's', label: '转速 S', def: 1500, step: 50 },
        { k: 'f', label: '进给 F', def: 600, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        var r = (p.d - p.td) / 2 - p.fin;
        if (r <= 0) return '刀具太大或余量太大：轨迹半径算出来是 ' + num(r) + '，必须大于 0';
        return null;
      },
      gen: function (p) {
        var r = (p.d - p.td) / 2 - p.fin;
        var z = -Math.abs(p.z);
        var L = [];
        pushHeader(L, 'O0003 (BORE MILLING)', 'BORE MILLING - LAYER BY LAYER, FULL CIRCLE');
        millHead(L, p);

        L.push(v('#1', num(p.x), '圆心 X'));
        L.push(v('#2', num(p.y), '圆心 Y'));
        L.push(v('#3', num(p.d), '孔径'));
        L.push(v('#4', num(z), '深度, 负值'));
        L.push(v('#5', num(p.td), '刀具直径'));
        L.push(v('#6', num(p.q), '每层切深'));
        L.push(v('#7', num(p.fin), '精加工余量'));
        L.push(v('#8', '[#3-#5]/2-#7', '轨迹半径 ' + num(r)));
        L.push('');

        L.push('#9=0             (当前 Z)');
        L.push('WHILE [#9 GT #4] DO 1');
        L.push('  #9=#9-#6');
        L.push('  IF [#9 LT #4] THEN #9=#4');
        L.push('  G01 Z#9 F' + num(p.f * 0.5) + '       (中心下刀一层)');
        L.push('  G01 X[#1+#8] F' + num(p.f) + '      (径向进刀)');
        L.push('  G02 I-[#8] J0           (整圆一圈)');
        L.push('  G01 X#1                 (回中心)');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    coneIn: {
      kind: 'mill', g: 'hole', no: 'O0004',
      name: '内圆锥铣',
      desc: '锥孔用等高分层做：每下降一层，按锥度算出该高度对应的半径，走一整圈。半径随 Z 线性收缩，所以层距越小锥面越光。适合锥孔、锥形沉孔、锥面密封口。',
      fields: [
        { k: 'x', label: '锥孔中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '锥孔中心 Y', def: 0, step: 0.1 },
        { k: 'd1', label: '口部直径', def: 50, step: 0.1, min: 1, tip: 'Z=0 处的直径，即大端' },
        { k: 'd2', label: '底部直径', def: 30, step: 0.1, min: 0.1, tip: '锥底的小端直径' },
        { k: 'z', label: '锥孔深度', def: 20, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 10, step: 0.1, min: 1 },
        { k: 'q', label: '每层切深', def: 1, step: 0.1, min: 0.05 },
        { k: 'fin', label: '精加工余量', def: 0.2, step: 0.1, min: 0 },
        { k: 's', label: '转速 S', def: 2000, step: 50 },
        { k: 'f', label: '进给 F', def: 800, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.d2 >= p.d1) return '底部直径必须小于口部直径，否则不是锥孔';
        var rmin = p.d2 / 2 - p.td / 2 - p.fin;
        if (rmin <= 0) return '刀太大：锥底半径 ' + num(p.d2 / 2) + ' 减刀半径后是 ' + num(rmin) + '，无法加工';
        if (p.z <= 0) return '锥孔深度必须大于 0';
        return null;
      },
      gen: function (p) {
        var dep = Math.abs(p.z);
        var L = [];
        pushHeader(L, 'O0004 (TAPER BORE MILL)', 'TAPER BORE MILL - CONSTANT Z LAYERS');
        millHead(L, p);

        L.push(v('#1', num(p.x), '中心 X'));
        L.push(v('#2', num(p.y), '中心 Y'));
        L.push(v('#3', num(p.d1), '口部直径, Z=0'));
        L.push(v('#4', num(p.d2), '底部直径'));
        L.push(v('#5', num(-dep), '锥孔深度, 负值'));
        L.push(v('#6', num(p.td), '刀具直径'));
        L.push(v('#7', num(p.q), '每层切深'));
        L.push(v('#8', num(p.fin), '精加工余量'));
        L.push('');

        L.push('G01 Z0 F' + num(p.f * 0.6));
        L.push('#9=0             (当前 Z)');
        L.push('WHILE [#9 GT #5] DO 1');
        L.push('  #9=#9-#7');
        L.push('  IF [#9 LT #5] THEN #9=#5');
        L.push('  #10=[#3/2]+[[#4-#3]/2]*[-#9/#5]-#6/2-#8   (本层锥面半径)');
        L.push('  G01 Z#9 F' + num(p.f * 0.5) + '       (中心下刀)');
        L.push('  G01 X[#1+#10] F' + num(p.f) + '     (径向进到锥面)');
        L.push('  G02 I-[#10] J0');
        L.push('  G01 X#1');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    odHelix: {
      kind: 'mill', g: 'hole', no: 'O0005',
      name: '外径螺旋铣',
      desc: '铣外圆柱面：刀具绕凸台外侧连续螺旋下降，一圈降一个「每圈下刀量」。适合圆形凸台、圆柱外形、圆轴端头的分层铣削。轨迹半径 =（凸台直径 + 刀径）/ 2 + 余量。',
      fields: [
        { k: 'x', label: '圆心 X', def: 0, step: 0.1 },
        { k: 'y', label: '圆心 Y', def: 0, step: 0.1 },
        { k: 'd', label: '凸台直径', def: 60, step: 0.1, min: 1 },
        { k: 'z', label: '铣削高度', def: 20, step: 0.1, min: 0.1, tip: '从工件顶面 Z=0 往下算' },
        { k: 'td', label: '刀具直径', def: 12, step: 0.1, min: 1 },
        { k: 'q', label: '每圈下刀', def: 2, step: 0.1, min: 0.05 },
        { k: 'fin', label: '精加工余量', def: 0.5, step: 0.1, min: 0, tip: '外形留量时填正数，一刀到位填 0' },
        { k: 's', label: '转速 S', def: 2000, step: 50 },
        { k: 'f', label: '进给 F', def: 1000, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.td <= 0) return '刀具直径必须大于 0';
        if (p.z <= 0) return '铣削高度必须大于 0';
        return null;
      },
      gen: function (p) {
        var r = (p.d + p.td) / 2 + p.fin;
        var z = -Math.abs(p.z);
        var L = [];
        pushHeader(L, 'O0005 (OD HELICAL MILL)', 'OD HELICAL MILL - COUNTER CLOCKWISE DOWNWARD');
        millHead(L, p);

        L.push(v('#1', num(p.x), '圆心 X'));
        L.push(v('#2', num(p.y), '圆心 Y'));
        L.push(v('#3', num(p.d), '凸台直径'));
        L.push(v('#4', num(z), '高度, 负值'));
        L.push(v('#5', num(p.td), '刀具直径'));
        L.push(v('#6', num(p.q), '每圈下刀'));
        L.push(v('#7', num(p.fin), '精加工余量'));
        L.push(v('#8', '[#3+#5]/2+#7', '轨迹半径 ' + num(r)));
        L.push('');

        L.push('G01 Z0 F' + num(p.f * 0.5));
        L.push('G01 X[#1+#8] F' + num(p.f));
        L.push('');
        L.push('#9=0             (当前 Z)');
        L.push('WHILE [#9 GT #4] DO 1');
        L.push('  #9=#9-#6');
        L.push('  IF [#9 LT #4] THEN #9=#4');
        L.push('  G03 X[#1+#8] Y#2 Z#9 I-[#8] J0 F' + num(p.f) + '   (逆时针绕外圆下行)');
        L.push('END 1');
        L.push('');
        L.push('G03 X[#1+#8] Y#2 I-[#8] J0 F' + num(p.f * 0.8) + '   (底面光整一圈)');
        millEnd(L);
        return L.join('\n');
      }
    },

    odMill: {
      kind: 'mill', g: 'hole', no: 'O0006',
      name: '外径铣',
      desc: '外圆分层整圆：每一层绕凸台走一整圈，圈内 Z 不变，走完再下降。比连续螺旋的单圈切削更轻，适合刚性一般的小机床，也便于逐层观察让刀情况。',
      fields: [
        { k: 'x', label: '圆心 X', def: 0, step: 0.1 },
        { k: 'y', label: '圆心 Y', def: 0, step: 0.1 },
        { k: 'd', label: '凸台直径', def: 60, step: 0.1, min: 1 },
        { k: 'z', label: '铣削高度', def: 20, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 12, step: 0.1, min: 1 },
        { k: 'q', label: '每层切深', def: 3, step: 0.1, min: 0.1 },
        { k: 'fin', label: '精加工余量', def: 0.5, step: 0.1, min: 0 },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 800, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.td <= 0) return '刀具直径必须大于 0';
        return null;
      },
      gen: function (p) {
        var r = (p.d + p.td) / 2 + p.fin;
        var z = -Math.abs(p.z);
        var L = [];
        pushHeader(L, 'O0006 (OD LAYER MILL)', 'OD LAYER MILL - LAYER BY LAYER, FULL CIRCLE');
        millHead(L, p);

        L.push(v('#1', num(p.x), '圆心 X'));
        L.push(v('#2', num(p.y), '圆心 Y'));
        L.push(v('#3', num(p.d), '凸台直径'));
        L.push(v('#4', num(z), '高度, 负值'));
        L.push(v('#5', num(p.td), '刀具直径'));
        L.push(v('#6', num(p.q), '每层切深'));
        L.push(v('#7', num(p.fin), '精加工余量'));
        L.push(v('#8', '[#3+#5]/2+#7', '轨迹半径 ' + num(r)));
        L.push('');

        L.push('G00 X[#1+#8] Y#2');
        L.push('G01 Z0 F' + num(p.f * 0.5));
        L.push('#9=0             (当前 Z)');
        L.push('WHILE [#9 GT #4] DO 1');
        L.push('  #9=#9-#6');
        L.push('  IF [#9 LT #4] THEN #9=#4');
        L.push('  G01 Z#9 F' + num(p.f * 0.5));
        L.push('  G03 X[#1+#8] Y#2 I-[#8] J0 F' + num(p.f) + '   (本层整圆一圈)');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    sideMill: {
      kind: 'mill', g: 'hole', no: 'O0007',
      name: '侧边铣',
      desc: '沿一条直边把侧面余量分层铣掉，用 G41 左刀补，程序里按图纸轮廓编程、刀补号里填实际刀半径。径向一次切宽取「径向切宽」参数，一般不超过刀径的 0.7 倍，切宽大就分几刀或改用矩形铣。',
      fields: [
        { k: 'x', label: '起点 X', def: 0, step: 0.1 },
        { k: 'y', label: '起点 Y', def: 0, step: 0.1, tip: '轮廓线上的点，刀会偏在这条线的 +Y 一侧' },
        { k: 'l', label: '走刀长度', def: 100, step: 0.1, min: 1, tip: '沿 +X 方向，终点 = 起点 + 长度' },
        { k: 'w', label: '径向切宽', def: 5, step: 0.1, min: 0.1 },
        { k: 'z', label: '总深度', def: 10, step: 0.1, min: 0.1 },
        { k: 'q', label: '每层切深', def: 2, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 12, step: 0.1, min: 1 },
        { k: 'dn', label: '刀补号 D', def: 1, step: 1, min: 1, tip: '机床刀补表里 D 值应等于实际刀半径' },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 700, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.w > p.td * 0.75) return '径向切宽 ' + num(p.w) + ' 超过刀径的 0.75 倍（' + num(p.td * 0.75) + '），请分刀或换大刀';
        if (p.q > p.td) return '每层切深不应大于刀径';
        return null;
      },
      gen: function (p) {
        var z = -Math.abs(p.z);
        var out = p.td + 2;
        var L = [];
        pushHeader(L, 'O0007 (SIDE MILLING G41)', 'SIDE MILLING - LAYER CUT, G41 LEFT COMP');
        millHead(L, p);

        L.push(v('#1', num(p.x), '起点 X'));
        L.push(v('#2', num(p.y), '起点 Y, 轮廓线'));
        L.push(v('#3', num(p.l), '走刀长度'));
        L.push(v('#4', num(p.w), '径向切宽'));
        L.push(v('#5', num(z), '总深度, 负值'));
        L.push(v('#6', num(p.q), '每层切深'));
        L.push(v('#7', num(p.td), '刀具直径'));
        L.push(v('#9', num(out), '引入引出距离'));
        L.push('');

        L.push('G00 X#1 Y[#2+#9]        (引到轮廓外侧上方)');
        L.push('G01 Z0 F' + num(p.f * 0.5));
        L.push('#10=0           (当前 Z)');
        L.push('WHILE [#10 GT #5] DO 1');
        L.push('  #10=#10-#6');
        L.push('  IF [#10 LT #5] THEN #10=#5');
        L.push('  G01 Z#10 F' + num(p.f * 0.4) + '       (下刀一层)');
        L.push('  G41 D' + p.dn + ' G01 X#1 Y#2 F' + num(p.f * 0.5) + '   (斜线进刀, 建立左刀补)');
        L.push('  G01 X[#1+#3] F' + num(p.f) + '        (沿轮廓走一刀)');
        L.push('  G40 G01 Y[#2+#9] F' + num(p.f * 0.5) + '   (取消刀补, 引出)');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    holeRound: {
      kind: 'mill', g: 'hole', no: 'O0008',
      name: '孔口倒圆角',
      desc: '球刀绕孔口做 R 圆角：把圆角的圆弧截面按角度切成若干圈，每圈算一个轨迹半径和一个 Z，绕孔走一整圈。R 必须大于球刀半径，否则刀尖切不到根部。',
      fields: [
        { k: 'x', label: '孔心 X', def: 0, step: 0.1 },
        { k: 'y', label: '孔心 Y', def: 0, step: 0.1 },
        { k: 'd', label: '孔径', def: 30, step: 0.1, min: 1 },
        { k: 'r', label: '圆角 R', def: 3, step: 0.1, min: 0.1, tip: '孔壁与端面之间的过渡圆弧半径' },
        { k: 'td', label: '球刀直径', def: 4, step: 0.1, min: 0.5 },
        { k: 'a', label: '角度步距', def: 5, step: 1, min: 1, tip: '每圈转过的圆弧角，越小越光但程序越长' },
        { k: 's', label: '转速 S', def: 3000, step: 100 },
        { k: 'f', label: '进给 F', def: 400, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.r <= p.td / 2) return '圆角 R（' + num(p.r) + '）必须大于球刀半径（' + num(p.td / 2) + '），否则球刀下不到根部';
        if (p.d <= 0) return '孔径必须大于 0';
        return null;
      },
      gen: function (p) {
        var cr = p.d / 2 + p.r;
        var ar = p.r - p.td / 2;
        var L = [];
        pushHeader(L, 'O0008 (HOLE EDGE FILLET R)', 'HOLE EDGE R FILLET - BALL NOSE, CONSTANT Z');
        millHead(L, p);

        L.push(v('#1', num(p.x), '孔心 X'));
        L.push(v('#2', num(p.y), '孔心 Y'));
        L.push(v('#3', num(p.d), '孔径'));
        L.push(v('#4', num(p.r), '圆角 R'));
        L.push(v('#5', num(p.td), '球刀直径'));
        L.push(v('#6', num(p.a), '角度步距, 度'));
        L.push(v('#7', '[#3/2]+#4', '圆角圆心半径 ' + num(cr)));
        L.push(v('#8', '#4-#5/2', '刀心圆弧半径 ' + num(ar)));
        L.push('');

        L.push('G00 Z5');
        L.push('G01 Z0 F' + num(p.f * 0.5));
        L.push('#9=180          (从孔壁根部起算)');
        L.push('WHILE [#9 GE 90] DO 1');
        L.push('  #10=#7+#8*COS[#9]       (本圈轨迹半径)');
        L.push('  #11=-#4+#8*SIN[#9]      (本圈 Z)');
        L.push('  G01 Z#11 F' + num(p.f * 0.4) + '      (中心下到本圈高度)');
        L.push('  G01 X[#1+#10] F' + num(p.f) + '    (径向进刀)');
        L.push('  G02 I-[#10] J0          (绕孔一圈)');
        L.push('  G01 X#1 Y#2             (回中心)');
        L.push('  #9=#9-#6');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    /* ================================================================
     *  二、平面（面铣）
     * ================================================================ */

    rectFace: {
      kind: 'mill', g: 'face', no: 'O0009',
      name: '矩形平面铣',
      desc: '在矩形区域里往复光栅走刀，一个来回走两行，顺铣逆铣交替。行数按刀径的百分比自动算，再把实际行距均分回去，保证刚好铺满、不多切一刀。适合台阶面、大方坯的平面粗精铣。',
      fields: [
        { k: 'x', label: '中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '中心 Y', def: 0, step: 0.1 },
        { k: 'l', label: '区域长度', def: 100, step: 0.1, min: 1, tip: 'X 向' },
        { k: 'w', label: '区域宽度', def: 60, step: 0.1, min: 1, tip: 'Y 向' },
        { k: 'td', label: '刀具直径', def: 12, step: 0.1, min: 1 },
        { k: 'k', label: '行距系数', def: 0.7, step: 0.05, min: 0.2, max: 0.95, tip: '行距 = 刀径 × 系数，0.6~0.8 常用' },
        { k: 'z', label: '总深度', def: 2, step: 0.1, min: 0.1 },
        { k: 'q', label: '每层切深', def: 2, step: 0.1, min: 0.1 },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 900, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.td >= p.l || p.td >= p.w) return '刀具直径必须小于区域的长和宽';
        return null;
      },
      gen: function (p) {
        var z = -Math.abs(p.z);
        var hx = (p.l - p.td) / 2;
        var hy = (p.w - p.td) / 2;
        var step = p.td * p.k;
        var rows = Math.max(2, Math.ceil((p.w - p.td) / step) + 1);
        var real = (p.w - p.td) / (rows - 1);
        var L = [];
        pushHeader(L, 'O0009 (RECT FACE MILL)', 'RECT FACE MILL - ZIGZAG, ONE WAY CUT');
        millHead(L, p);

        L.push(v('#1', num(p.x), '中心 X'));
        L.push(v('#2', num(p.y), '中心 Y'));
        L.push(v('#3', num(p.l), '长度, X 向'));
        L.push(v('#4', num(p.w), '宽度, Y 向'));
        L.push(v('#5', num(p.td), '刀具直径'));
        L.push(v('#6', num(p.k, 2), '行距系数'));
        L.push(v('#7', num(z), '总深度, 负值'));
        L.push(v('#8', num(p.q), '每层切深'));
        L.push('');
        L.push(v('#10', '[#3-#5]/2', 'X 半行程 ' + num(hx)));
        L.push(v('#11', '[#4-#5]/2', 'Y 半行程 ' + num(hy)));
        L.push(v('#12', '#5*#6', '行距 ' + num(step)));
        L.push(v('#13', 'FUP[[#4-#5]/#12]+1', '走刀行数 ' + rows));
        L.push(v('#14', '[#4-#5]/[#13-1]', '实际行距 ' + num(real)));
        L.push('');

        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #7] DO 1');
        L.push('  #20=#20-#8');
        L.push('  IF [#20 LT #7] THEN #20=#7');
        L.push('  G01 Z#20 F' + num(p.f * 0.4));
        L.push('  #21=0                   (已走行数)');
        L.push('  #22=-#11                (当前 Y 偏移)');
        L.push('  #23=1                   (走刀方向)');
        L.push('  G01 Y[#2+#22] F' + num(p.f));
        L.push('  WHILE [#21 LT #13] DO 2');
        L.push('    #24=#1+#10*#23');
        L.push('    G01 X#24 F' + num(p.f));
        L.push('    #21=#21+1');
        L.push('    IF [#21 GE #13] THEN GOTO 200');
        L.push('    #22=#22+#14');
        L.push('    G01 Y[#2+#22]');
        L.push('    #23=-#23');
        L.push('  END 2');
        L.push('  N200');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    circleFace: {
      kind: 'mill', g: 'face', no: 'O0010',
      name: '圆形平面铣',
      desc: '圆形区域从中心一圈一圈往外扩（同心整圆），每圈半径加一个环距，最后一圈贴着外缘光一刀。圆域粗铣最省事的一种，走刀方向一致、没有反向冲击。',
      fields: [
        { k: 'x', label: '中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '中心 Y', def: 0, step: 0.1 },
        { k: 'd', label: '区域直径', def: 80, step: 0.1, min: 1 },
        { k: 'td', label: '刀具直径', def: 12, step: 0.1, min: 1 },
        { k: 'k', label: '环距系数', def: 0.7, step: 0.05, min: 0.2, max: 0.95, tip: '环距 = 刀径 × 系数' },
        { k: 'z', label: '总深度', def: 2, step: 0.1, min: 0.1 },
        { k: 'q', label: '每层切深', def: 2, step: 0.1, min: 0.1 },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 900, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.td >= p.d) return '刀具直径必须小于区域直径';
        return null;
      },
      gen: function (p) {
        var z = -Math.abs(p.z);
        var rmax = (p.d - p.td) / 2;
        var L = [];
        pushHeader(L, 'O0010 (CIRCLE FACE MILL)', 'CIRCLE FACE MILL - CONCENTRIC RINGS');
        millHead(L, p);

        L.push(v('#1', num(p.x), '中心 X'));
        L.push(v('#2', num(p.y), '中心 Y'));
        L.push(v('#3', num(p.d), '区域直径'));
        L.push(v('#4', num(p.td), '刀具直径'));
        L.push(v('#5', num(p.k, 2), '环距系数'));
        L.push(v('#6', num(z), '总深度, 负值'));
        L.push(v('#7', num(p.q), '每层切深'));
        L.push('');
        L.push(v('#10', '[#3-#4]/2', '最大刀心半径 ' + num(rmax)));
        L.push(v('#11', '#4*#5', '环距 ' + num(p.td * p.k)));
        L.push(v('#12', '#4*0.45', '第一圈半径'));
        L.push('');

        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #6] DO 1');
        L.push('  #20=#20-#7');
        L.push('  IF [#20 LT #6] THEN #20=#6');
        L.push('  G01 Z#20 F' + num(p.f * 0.4));
        L.push('  #21=#12                 (当前圈半径)');
        L.push('  G01 X[#1+#21] F' + num(p.f));
        L.push('  WHILE [#21 LT #10] DO 2');
        L.push('    G02 I-[#21] J0        (整圆一圈)');
        L.push('    G01 X#1');
        L.push('    #21=#21+#11');
        L.push('    IF [#21 GT #10] THEN #21=#10');
        L.push('    G01 X[#1+#21]');
        L.push('  END 2');
        L.push('  G02 I-[#21] J0          (最外圈光一刀)');
        L.push('  G01 X#1');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    spiralFace: {
      kind: 'mill', g: 'face', no: 'O0011',
      name: '螺旋铣平面',
      desc: '从中心向外的阿基米德螺线，半径随角度线性增长，方向一直在转、没有换向停顿，切削力平稳，适合精铣平面和铝件高速走刀。Fanuc 不支持变半径螺旋插补，所以螺线用一堆很短的小直线逼近（角度步距越小越光）。',
      fields: [
        { k: 'x', label: '中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '中心 Y', def: 0, step: 0.1 },
        { k: 'd', label: '区域直径', def: 100, step: 0.1, min: 1 },
        { k: 'td', label: '刀具直径', def: 12, step: 0.1, min: 1 },
        { k: 'k', label: '环距系数', def: 0.7, step: 0.05, min: 0.2, max: 0.95, tip: '螺线每转一圈外扩的量 = 刀径 × 系数' },
        { k: 'a', label: '角度步距', def: 5, step: 1, min: 1, tip: '每段对应的圆心角，5°~10° 常用' },
        { k: 'z', label: '总深度', def: 1, step: 0.1, min: 0.1 },
        { k: 'q', label: '每层切深', def: 1, step: 0.1, min: 0.1 },
        { k: 's', label: '转速 S', def: 2500, step: 50 },
        { k: 'f', label: '进给 F', def: 1200, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.td >= p.d) return '刀具直径必须小于区域直径';
        if (p.a <= 0) return '角度步距必须大于 0';
        return null;
      },
      gen: function (p) {
        var z = -Math.abs(p.z);
        var rmax = (p.d - p.td) / 2;
        var pitch = p.td * p.k;
        var turns = Math.max(1, Math.ceil(rmax / pitch));
        var L = [];
        pushHeader(L, 'O0011 (SPIRAL FACE MILL)', 'SPIRAL FACE MILL - ARCHIMEDEAN APPROX');
        millHead(L, p);

        L.push(v('#1', num(p.x), '中心 X'));
        L.push(v('#2', num(p.y), '中心 Y'));
        L.push(v('#3', num(p.d), '区域直径'));
        L.push(v('#4', num(p.td), '刀具直径'));
        L.push(v('#5', num(p.k, 2), '环距系数'));
        L.push(v('#6', num(p.a), '角度步距, 度'));
        L.push(v('#7', num(z), '总深度, 负值'));
        L.push(v('#8', num(p.q), '每层切深'));
        L.push('');
        L.push(v('#10', '[#3-#4]/2', '最大刀心半径 ' + num(rmax)));
        L.push(v('#11', '#4*#5', 'EXPAND PER REV ' + num(pitch)));
        L.push(v('#12', 'FUP[#10/#11]', '圈数 ' + turns));
        L.push(v('#13', '#12*360', '终止角 ' + num(turns * 360, 1)));
        L.push('');

        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #7] DO 1');
        L.push('  #20=#20-#8');
        L.push('  IF [#20 LT #7] THEN #20=#7');
        L.push('  G01 Z#20 F' + num(p.f * 0.4));
        L.push('  #21=0                   (当前角度)');
        L.push('  G01 X#1 Y#2 F' + num(p.f));
        L.push('  WHILE [#21 LE #13] DO 2');
        L.push('    #22=#21/360*#11       (当前半径)');
        L.push('    IF [#22 GT #10] THEN #22=#10');
        L.push('    G01 X[#1+#22*COS[#21]] Y[#2+#22*SIN[#21]] F' + num(p.f));
        L.push('    #21=#21+#6');
        L.push('  END 2');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    flyFace: {
      kind: 'mill', g: 'face', no: 'O0012',
      name: '飞平面',
      desc: '飞刀盘平面铣：只在一个方向切削，走到头抬刀快速返回起点，再横移一个行距往下走。回程不切削，所以每刀都是顺铣，表面纹路一致，是大件平面的常规做法。',
      fields: [
        { k: 'x', label: '起点 X', def: 0, step: 0.1, tip: '区域左下角' },
        { k: 'y', label: '起点 Y', def: 0, step: 0.1 },
        { k: 'l', label: '走刀长度', def: 200, step: 0.1, min: 1, tip: 'X 向' },
        { k: 'w', label: '覆盖宽度', def: 100, step: 0.1, min: 1, tip: 'Y 向' },
        { k: 'td', label: '刀盘直径', def: 63, step: 0.5, min: 1 },
        { k: 'k', label: '行距系数', def: 0.75, step: 0.05, min: 0.2, max: 0.95 },
        { k: 'z', label: '切深', def: 1.5, step: 0.1, min: 0.1, tip: '飞刀通常一刀 0.5~3mm，不分层' },
        { k: 's', label: '转速 S', def: 800, step: 50 },
        { k: 'f', label: '进给 F', def: 600, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.w < p.td) return '覆盖宽度小于刀盘直径，一行就能盖完，检查参数';
        if (p.l <= 0) return '走刀长度必须大于 0';
        return null;
      },
      gen: function (p) {
        var z = -Math.abs(p.z);
        var step = p.td * p.k;
        var L = [];
        pushHeader(L, 'O0012 (FLY CUTTER FACE)', 'FLY CUTTER FACE MILL - ONE WAY, LIFT BETWEEN ROWS');
        millHead(L, p);

        L.push(v('#1', num(p.x), '起点 X'));
        L.push(v('#2', num(p.y), '起点 Y'));
        L.push(v('#3', num(p.l), '走刀长度'));
        L.push(v('#4', num(p.w), '覆盖宽度'));
        L.push(v('#5', num(p.td), '刀盘直径'));
        L.push(v('#6', num(p.k, 2), '行距系数'));
        L.push(v('#7', num(z), '切深, 负值'));
        L.push('');
        L.push(v('#10', '#5*#6', '行距 ' + num(step)));
        L.push(v('#11', '[#4-#5]/2', 'Y 向半行程 ' + num((p.w - p.td) / 2)));
        L.push('');

        L.push('G00 X#1 Y[#2+#11]       (从最上一行开始)');
        L.push('G01 Z#7 F' + num(p.f * 0.4));
        L.push('');
        L.push('#20=#11                 (当前 Y 偏移)');
        L.push('WHILE [#20 GE -#11-0.001] DO 1');
        L.push('  G00 Y[#2+#20]');
        L.push('  G01 X[#1+#3] F' + num(p.f) + '        (单向切削)');
        L.push('  G00 Z[#7+5]           (抬刀)');
        L.push('  G00 X#1               (快速回起点)');
        L.push('  G00 Z#7');
        L.push('  #20=#20-#10');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    arcMill: {
      kind: 'mill', g: 'face', no: 'O0013',
      name: '平面铣圆弧',
      desc: '沿一条指定半径、指定起止角的圆弧分层走刀，用来铣圆弧槽、弧形台阶、圆弧轮廓的外侧。起点终点由角度算出来，I/J 圆心矢量固定指向圆心，所以任意起止角都不会报圆弧错误。',
      fields: [
        { k: 'x', label: '圆心 X', def: 0, step: 0.1 },
        { k: 'y', label: '圆心 Y', def: 0, step: 0.1 },
        { k: 'r', label: '圆弧半径', def: 50, step: 0.1, min: 0.1, tip: '刀心走的半径，不是工件外缘' },
        { k: 'a1', label: '起始角', def: 0, step: 1, tip: '度，0° 在 X+ 方向，逆时针为正' },
        { k: 'a2', label: '终止角', def: 180, step: 1, tip: '与起始角相同即为整圆' },
        { k: 'dir', label: '走向', type: 'select', def: 0, opts: [{ v: 0, t: '逆时针 G03' }, { v: 1, t: '顺时针 G02' }] },
        { k: 'z', label: '总深度', def: 5, step: 0.1, min: 0.1 },
        { k: 'q', label: '每层切深', def: 1, step: 0.1, min: 0.1 },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 700, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.r <= 0) return '圆弧半径必须大于 0';
        return null;
      },
      gen: function (p) {
        var z = -Math.abs(p.z);
        var g = Number(p.dir) ? 'G02' : 'G03';
        var L = [];
        pushHeader(L, 'O0013 (ARC MILL)', 'ARC MILL - LAYER BY LAYER ALONG ARC');
        millHead(L, p);

        L.push(v('#1', num(p.x), '圆心 X'));
        L.push(v('#2', num(p.y), '圆心 Y'));
        L.push(v('#3', num(p.r), '圆弧半径'));
        L.push(v('#4', num(p.a1, 2), '起始角, 度'));
        L.push(v('#5', num(p.a2, 2), '终止角, 度'));
        L.push(v('#6', num(z), '总深度, 负值'));
        L.push(v('#7', num(p.q), '每层切深'));
        L.push('');

        L.push('G00 X[#1+#3*COS[#4]] Y[#2+#3*SIN[#4]]');
        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #6] DO 1');
        L.push('  #20=#20-#7');
        L.push('  IF [#20 LT #6] THEN #20=#6');
        L.push('  G01 Z#20 F' + num(p.f * 0.4));
        L.push('  G01 X[#1+#3*COS[#4]] Y[#2+#3*SIN[#4]] F' + num(p.f));
        L.push('  ' + g + ' X[#1+#3*COS[#5]] Y[#2+#3*SIN[#5]] I-[#3*COS[#4]] J-[#3*SIN[#4]] F' + num(p.f));
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    /* ================================================================
     *  三、槽与腔
     * ================================================================ */

    slot: {
      kind: 'mill', g: 'slot', no: 'O0014',
      name: '铣键槽',
      desc: '直槽分层铣：槽宽大于刀径时，横向分几刀把宽度铺满，每一刀从槽一端直走到另一端再分开。适合键槽、直通槽、压条槽。槽宽必须不小于刀径，否则刀进不去。',
      fields: [
        { k: 'x', label: '槽起点 X', def: 0, step: 0.1, tip: '槽左端圆头圆心' },
        { k: 'y', label: '槽中心 Y', def: 0, step: 0.1 },
        { k: 'l', label: '槽长', def: 60, step: 0.1, min: 1, tip: '两端圆头圆心的距离，不是总长' },
        { k: 'w', label: '槽宽', def: 12, step: 0.1, min: 0.1 },
        { k: 'z', label: '槽深', def: 6, step: 0.1, min: 0.1 },
        { k: 'q', label: '每层切深', def: 1.5, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 10, step: 0.1, min: 1 },
        { k: 'k', label: '行距系数', def: 0.75, step: 0.05, min: 0.2, max: 0.95 },
        { k: 's', label: '转速 S', def: 1200, step: 50 },
        { k: 'f', label: '进给 F', def: 400, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.w < p.td) return '槽宽 ' + num(p.w) + ' 小于刀径 ' + num(p.td) + '，刀下不去，请换小刀';
        if (p.l <= 0) return '槽长必须大于 0';
        return null;
      },
      gen: function (p) {
        var z = -Math.abs(p.z);
        var span = p.w - p.td;
        var step = p.td * p.k;
        var pass = span > 0.001 ? Math.max(1, Math.ceil(span / step)) : 0;
        var real = pass > 0 ? span / pass : 0;
        var L = [];
        pushHeader(L, 'O0014 (KEYWAY SLOT MILL)', 'KEYWAY SLOT MILL - LAYER BY LAYER');
        millHead(L, p);

        L.push(v('#1', num(p.x), '槽起点 X'));
        L.push(v('#2', num(p.y), '槽中心 Y'));
        L.push(v('#3', num(p.l), '槽长, 圆心距'));
        L.push(v('#4', num(p.w), '槽宽'));
        L.push(v('#5', num(p.td), '刀具直径'));
        L.push(v('#6', num(z), '槽深, 负值'));
        L.push(v('#7', num(p.q), '每层切深'));
        L.push('');
        L.push(v('#10', num(span), '横向可分布宽度 ' + num(span)));
        L.push(v('#11', num(real), '实际行距 ' + num(real)));
        L.push(v('#12', num(pass), '分刀数 ' + pass));
        L.push('');

        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #6] DO 1');
        L.push('  #20=#20-#7');
        L.push('  IF [#20 LT #6] THEN #20=#6');
        L.push('  #21=0                   (第几刀)');
        L.push('  #22=-#10/2              (当前 Y 偏移)');
        L.push('  WHILE [#21 LE #12] DO 2');
        L.push('    G00 X#1 Y[#2+#22]');
        L.push('    G01 Z#20 F' + num(p.f * 0.4) + '      (下刀)');
        L.push('    G01 X[#1+#3] F' + num(p.f) + '      (走一刀)');
        L.push('    G00 Z[#20+2]          (抬刀)');
        L.push('    G00 X#1');
        L.push('    #22=#22+#11');
        L.push('    #21=#21+1');
        L.push('  END 2');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    slotHelix: {
      kind: 'mill', g: 'slot', no: 'O0015',
      name: '螺旋铣键槽',
      desc: '用螺旋插补斜着下刀，而不是垂直扎下去：一圈小螺旋降一个层深，然后沿槽走到另一端。垂直下刀在硬材料上会顶刀、崩刃，螺旋下刀把轴向力转成径向切削力，排屑也顺。适合深槽、硬料槽、盲槽。',
      fields: [
        { k: 'x', label: '槽起点 X', def: 0, step: 0.1 },
        { k: 'y', label: '槽中心 Y', def: 0, step: 0.1 },
        { k: 'l', label: '槽长', def: 50, step: 0.1, min: 1, tip: '两端圆头圆心距' },
        { k: 'w', label: '槽宽', def: 10, step: 0.1, min: 0.1 },
        { k: 'z', label: '槽深', def: 8, step: 0.1, min: 0.1 },
        { k: 'q', label: '每层切深', def: 1, step: 0.1, min: 0.05 },
        { k: 'td', label: '刀具直径', def: 8, step: 0.1, min: 1 },
        { k: 's', label: '转速 S', def: 1500, step: 50 },
        { k: 'f', label: '进给 F', def: 350, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.w < p.td) return '槽宽 ' + num(p.w) + ' 小于刀径 ' + num(p.td) + '，刀下不去';
        if (p.td * 0.25 > p.w / 2) return '刀太大，放不下螺旋下刀的小圆';
        return null;
      },
      gen: function (p) {
        var z = -Math.abs(p.z);
        var hr = p.td * 0.25;
        var L = [];
        pushHeader(L, 'O0015 (HELICAL SLOT MILL)', 'HELICAL SLOT MILL - RAMP DOWN IN SPIRAL');
        millHead(L, p);

        L.push(v('#1', num(p.x), '槽起点 X'));
        L.push(v('#2', num(p.y), '槽中心 Y'));
        L.push(v('#3', num(p.l), '槽长, 圆心距'));
        L.push(v('#4', num(p.w), '槽宽'));
        L.push(v('#5', num(p.td), '刀具直径'));
        L.push(v('#6', num(z), '槽深, 负值'));
        L.push(v('#7', num(p.q), '每层切深'));
        L.push(v('#8', num(hr), '螺旋半径 = 刀径/4'));
        L.push('');

        L.push('G00 X[#1+#8] Y#2');
        L.push('G01 Z1 F' + num(p.f * 0.5));
        L.push('');
        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #6] DO 1');
        L.push('  #20=#20-#7');
        L.push('  IF [#20 LT #6] THEN #20=#6');
        L.push('  G02 X[#1+#8] Y#2 Z#20 I-[#8] J0 F' + num(p.f * 0.6) + '   (螺旋下刀一层)');
        L.push('  G01 X[#1+#3] F' + num(p.f) + '          (沿槽走到另一端)');
        L.push('  G00 Z[#20+1]               (抬刀)');
        L.push('  G00 X[#1+#8]               (回起点)');
        L.push('  G01 Z#20 F' + num(p.f * 0.5));
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    squarePocket: {
      kind: 'mill', g: 'slot', no: 'O0016',
      name: '内方铣',
      desc: '方腔分层清腔：每一层先沿四壁贴边绕一圈（把壁清干净），再在中间往返光栅铺满。四角的圆角半径等于刀半径，图纸要求更小的角 R 得换小刀或补一道清角。',
      fields: [
        { k: 'x', label: '腔中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '腔中心 Y', def: 0, step: 0.1 },
        { k: 'l', label: '腔长', def: 100, step: 0.1, min: 1, tip: 'X 向' },
        { k: 'w', label: '腔宽', def: 60, step: 0.1, min: 1, tip: 'Y 向' },
        { k: 'z', label: '腔深', def: 15, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 12, step: 0.1, min: 1 },
        { k: 'q', label: '每层切深', def: 2, step: 0.1, min: 0.1 },
        { k: 'k', label: '行距系数', def: 0.7, step: 0.05, min: 0.2, max: 0.95 },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 900, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.td >= p.l || p.td >= p.w) return '刀具直径必须小于腔体的长和宽';
        return null;
      },
      gen: function (p) {
        var z = -Math.abs(p.z);
        var hx = (p.l - p.td) / 2;
        var hy = (p.w - p.td) / 2;
        var step = p.td * p.k;
        var rows = Math.max(2, Math.ceil((p.w - p.td) / step) + 1);
        var real = (p.w - p.td) / (rows - 1);
        var L = [];
        pushHeader(L, 'O0016 (SQUARE POCKET MILL)', 'SQUARE POCKET MILL - WALL PASS THEN RASTER');
        millHead(L, p);

        L.push(v('#1', num(p.x), '腔中心 X'));
        L.push(v('#2', num(p.y), '腔中心 Y'));
        L.push(v('#3', num(p.l), '腔长, X 向'));
        L.push(v('#4', num(p.w), '腔宽, Y 向'));
        L.push(v('#5', num(p.td), '刀具直径'));
        L.push(v('#6', num(z), '腔深, 负值'));
        L.push(v('#7', num(p.q), '每层切深'));
        L.push(v('#8', num(p.k, 2), '行距系数'));
        L.push('');
        L.push(v('#10', '[#3-#5]/2', 'X 半行程 ' + num(hx)));
        L.push(v('#11', '[#4-#5]/2', 'Y 半行程 ' + num(hy)));
        L.push(v('#12', '#5*#8', '行距 ' + num(step)));
        L.push(v('#13', 'FUP[[#4-#5]/#12]+1', '走刀行数 ' + rows));
        L.push(v('#14', '[#4-#5]/[#13-1]', '实际行距 ' + num(real)));
        L.push('');

        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #6] DO 1');
        L.push('  #20=#20-#7');
        L.push('  IF [#20 LT #6] THEN #20=#6');
        L.push('  G01 Z#20 F' + num(p.f * 0.4));
        L.push('  (先沿壁清一圈)');
        L.push('  G01 X[#1-#10] Y[#2-#11] F' + num(p.f));
        L.push('  G01 X[#1+#10]');
        L.push('  G01 Y[#2+#11]');
        L.push('  G01 X[#1-#10]');
        L.push('  G01 Y[#2-#11]');
        L.push('  (中间光栅)');
        L.push('  #21=0                   (已走行数)');
        L.push('  #22=-#11');
        L.push('  #23=1');
        L.push('  WHILE [#21 LT #13] DO 2');
        L.push('    #24=#1+#10*#23');
        L.push('    G01 X#24 F' + num(p.f));
        L.push('    #21=#21+1');
        L.push('    IF [#21 GE #13] THEN GOTO 300');
        L.push('    #22=#22+#14');
        L.push('    G01 Y[#2+#22]');
        L.push('    #23=-#23');
        L.push('  END 2');
        L.push('  N300');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    squareContour: {
      kind: 'mill', g: 'slot', no: 'O0017',
      name: '内方轮廓铣',
      desc: '只走方腔的轮廓，不做中间清腔：沿四壁一圈一圈往里缩，缩够「环切宽度」就停。用于精铣侧壁、修整台阶侧面，或者中间已经钻掉了只要清边的情况。',
      fields: [
        { k: 'x', label: '腔中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '腔中心 Y', def: 0, step: 0.1 },
        { k: 'l', label: '腔长', def: 100, step: 0.1, min: 1 },
        { k: 'w', label: '腔宽', def: 60, step: 0.1, min: 1 },
        { k: 'bw', label: '环切宽度', def: 20, step: 0.1, min: 0.1, tip: '从壁往里清多宽' },
        { k: 'z', label: '腔深', def: 15, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 12, step: 0.1, min: 1 },
        { k: 'q', label: '每层切深', def: 2, step: 0.1, min: 0.1 },
        { k: 'k', label: '环距系数', def: 0.7, step: 0.05, min: 0.2, max: 0.95 },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 800, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        var hx = (p.l - p.td) / 2;
        var hy = (p.w - p.td) / 2;
        if (hx <= 0 || hy <= 0) return '刀具直径太大，放不进这个腔';
        if (p.bw > Math.min(hx, hy)) return '环切宽度超过可环切范围（最多 ' + num(Math.min(hx, hy)) + '）';
        return null;
      },
      gen: function (p) {
        var z = -Math.abs(p.z);
        var hx = (p.l - p.td) / 2;
        var hy = (p.w - p.td) / 2;
        var gap = p.td * p.k;
        var ring = Math.max(1, Math.ceil(p.bw / gap));
        var real = p.bw / ring;
        var L = [];
        pushHeader(L, 'O0017 (SQUARE CONTOUR MILL)', 'SQUARE CONTOUR MILL - RING BY RING');
        millHead(L, p);

        L.push(v('#1', num(p.x), '腔中心 X'));
        L.push(v('#2', num(p.y), '腔中心 Y'));
        L.push(v('#3', num(p.l), '腔长, X 向'));
        L.push(v('#4', num(p.w), '腔宽, Y 向'));
        L.push(v('#5', num(p.td), '刀具直径'));
        L.push(v('#6', num(z), '腔深, 负值'));
        L.push(v('#7', num(p.q), '每层切深'));
        L.push('');
        L.push(v('#10', '[#3-#5]/2', 'X 半行程 ' + num(hx)));
        L.push(v('#11', '[#4-#5]/2', 'Y 半行程 ' + num(hy)));
        L.push(v('#12', num(real), '环距 ' + num(real)));
        L.push(v('#13', num(ring), '环数 ' + ring));
        L.push('');

        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #6] DO 1');
        L.push('  #20=#20-#7');
        L.push('  IF [#20 LT #6] THEN #20=#6');
        L.push('  G01 Z#20 F' + num(p.f * 0.4));
        L.push('  #21=0                       (第几环)');
        L.push('  WHILE [#21 LE #13] DO 2');
        L.push('    #22=#10-#21*#12           (本环 X 半行程)');
        L.push('    #23=#11-#21*#12           (本环 Y 半行程)');
        L.push('    G01 X[#1-#22] Y[#2-#23] F' + num(p.f));
        L.push('    G01 X[#1+#22]');
        L.push('    G01 Y[#2+#23]');
        L.push('    G01 X[#1-#22]');
        L.push('    G01 Y[#2-#23]');
        L.push('    #21=#21+1');
        L.push('  END 2');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    rectBoss: {
      kind: 'mill', g: 'slot', no: 'O0018',
      name: '矩形铣',
      desc: '矩形凸台的外形铣，四角是直角，用 G41 左刀补按图纸轮廓编程，刀补号里填实际刀半径。分层往下走，适合方凸台、方块外形、模具镶块。要带 R 角的用「长方形倒圆角」。',
      fields: [
        { k: 'x', label: '中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '中心 Y', def: 0, step: 0.1 },
        { k: 'l', label: '长度', def: 100, step: 0.1, min: 1, tip: 'X 向，凸台实际尺寸' },
        { k: 'w', label: '宽度', def: 60, step: 0.1, min: 1, tip: 'Y 向' },
        { k: 'z', label: '铣削高度', def: 20, step: 0.1, min: 0.1 },
        { k: 'q', label: '每层切深', def: 3, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 12, step: 0.1, min: 1 },
        { k: 'dn', label: '刀补号 D', def: 1, step: 1, min: 1, tip: '机床刀补表 D 值 = 实际刀半径' },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 800, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.l <= 0 || p.w <= 0) return '长宽必须大于 0';
        if (p.td >= p.l || p.td >= p.w) return '刀具直径太大，无法绕这个凸台';
        return null;
      },
      gen: function (p) {
        var z = -Math.abs(p.z);
        var hx = p.l / 2;
        var hy = p.w / 2;
        var out = p.td + 3;
        var L = [];
        pushHeader(L, 'O0018 (RECT BOSS MILL)', 'RECT BOSS MILL - G41 LEFT COMP');
        millHead(L, p);

        L.push(v('#1', num(p.x), '中心 X'));
        L.push(v('#2', num(p.y), '中心 Y'));
        L.push(v('#3', num(hx), 'X 半长 ' + num(hx)));
        L.push(v('#4', num(hy), 'Y 半宽 ' + num(hy)));
        L.push(v('#5', num(p.td), '刀具直径'));
        L.push(v('#6', num(z), '高度, 负值'));
        L.push(v('#7', num(p.q), '每层切深'));
        L.push(v('#9', num(out), '引入引出距离'));
        L.push('');

        L.push('G00 X[#1-#3-#9] Y[#2-#4]    (引到左下角外侧)');
        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #6] DO 1');
        L.push('  #20=#20-#7');
        L.push('  IF [#20 LT #6] THEN #20=#6');
        L.push('  G01 Z#20 F' + num(p.f * 0.4));
        L.push('  G41 D' + p.dn + ' G01 X[#1-#3] Y[#2-#4] F' + num(p.f * 0.6) + '   (建立刀补)');
        L.push('  G01 X[#1+#3] F' + num(p.f));
        L.push('  G01 Y[#2+#4]');
        L.push('  G01 X[#1-#3]');
        L.push('  G01 Y[#2-#4]');
        L.push('  G40 G01 X[#1-#3-#9] F' + num(p.f * 0.6) + '   (取消刀补, 引出)');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    spiralRect: {
      kind: 'mill', g: 'slot', no: 'O0019',
      name: '螺旋铣矩形',
      desc: '矩形腔由内向外一圈一圈放大，每圈是一个同心矩形，拐角处直接换向。本质是把圆形的螺旋环切搬到了方腔上，走刀路径短、空行程少。环形之间的径向步距按刀径算。',
      fields: [
        { k: 'x', label: '腔中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '腔中心 Y', def: 0, step: 0.1 },
        { k: 'l', label: '腔长', def: 100, step: 0.1, min: 1 },
        { k: 'w', label: '腔宽', def: 70, step: 0.1, min: 1 },
        { k: 'z', label: '腔深', def: 12, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 12, step: 0.1, min: 1 },
        { k: 'q', label: '每层切深', def: 2, step: 0.1, min: 0.1 },
        { k: 'k', label: '环距系数', def: 0.7, step: 0.05, min: 0.2, max: 0.95 },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 900, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.td >= p.l || p.td >= p.w) return '刀具直径必须小于腔体的长和宽';
        return null;
      },
      gen: function (p) {
        var z = -Math.abs(p.z);
        var hx = (p.l - p.td) / 2;
        var hy = (p.w - p.td) / 2;
        var gap = p.td * p.k;
        var ring = Math.max(1, Math.ceil(Math.min(hx, hy) / gap));
        var real = Math.min(hx, hy) / ring;
        var L = [];
        pushHeader(L, 'O0019 (SPIRAL RECT MILL)', 'SPIRAL RECT MILL - INSIDE OUT RINGS');
        millHead(L, p);

        L.push(v('#1', num(p.x), '腔中心 X'));
        L.push(v('#2', num(p.y), '腔中心 Y'));
        L.push(v('#3', num(p.l), '腔长, X 向'));
        L.push(v('#4', num(p.w), '腔宽, Y 向'));
        L.push(v('#5', num(p.td), '刀具直径'));
        L.push(v('#6', num(z), '腔深, 负值'));
        L.push(v('#7', num(p.q), '每层切深'));
        L.push('');
        L.push(v('#10', '[#3-#5]/2', 'X 半行程 ' + num(hx)));
        L.push(v('#11', '[#4-#5]/2', 'Y 半行程 ' + num(hy)));
        L.push(v('#12', num(real), '环距 ' + num(real)));
        L.push(v('#13', num(ring), '环数 ' + ring));
        L.push('');

        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #6] DO 1');
        L.push('  #20=#20-#7');
        L.push('  IF [#20 LT #6] THEN #20=#6');
        L.push('  G01 Z#20 F' + num(p.f * 0.4));
        L.push('  #21=#13                     (第几环, 从内到外)');
        L.push('  WHILE [#21 GE 0] DO 2');
        L.push('    #22=#10-#21*#12           (本环 X 半行程)');
        L.push('    #23=#11-#21*#12           (本环 Y 半行程)');
        L.push('    IF [#22 LT #12] THEN #22=#12    (最内环别缩成一条线)');
        L.push('    IF [#23 LT #12] THEN #23=#12');
        L.push('    G01 X[#1-#22] Y[#2-#23] F' + num(p.f) + '   (移到本环左下角)');
        L.push('    G01 X[#1+#22]');
        L.push('    G01 Y[#2+#23]');
        L.push('    G01 X[#1-#22]');
        L.push('    G01 Y[#2-#23]');
        L.push('    #21=#21-1');
        L.push('  END 2');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    rectRound: {
      kind: 'mill', g: 'slot', no: 'O0020',
      name: '长方形倒圆角',
      desc: '带 R 角的矩形轮廓铣：四条直边 + 四段圆弧，用 G41 左刀补按图纸编程。R 角是轮廓本身的圆角，不是刀尖自然圆弧，所以能做出任意大小的角 R（只要刀半径小于 R）。',
      fields: [
        { k: 'x', label: '中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '中心 Y', def: 0, step: 0.1 },
        { k: 'l', label: '长度', def: 100, step: 0.1, min: 1, tip: 'X 向总长' },
        { k: 'w', label: '宽度', def: 60, step: 0.1, min: 1, tip: 'Y 向总宽' },
        { k: 'r', label: '圆角 R', def: 10, step: 0.1, min: 0.1, tip: '四角圆角半径' },
        { k: 'z', label: '铣削高度', def: 15, step: 0.1, min: 0.1 },
        { k: 'q', label: '每层切深', def: 3, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 10, step: 0.1, min: 1 },
        { k: 'dn', label: '刀补号 D', def: 1, step: 1, min: 1 },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 800, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.r * 2 >= Math.min(p.l, p.w)) return '圆角 R × 2 必须小于短边，否则两条圆角接上了';
        if (p.td / 2 >= p.r) return '刀半径（' + num(p.td / 2) + '）必须小于圆角 R，否则 R 角铣不出来';
        return null;
      },
      gen: function (p) {
        var z = -Math.abs(p.z);
        var hx = p.l / 2;
        var hy = p.w / 2;
        var r = p.r;
        var out = p.td + 3;
        var L = [];
        pushHeader(L, 'O0020 (ROUNDED RECT BOSS)', 'ROUNDED RECT BOSS - G41 LEFT COMP');
        millHead(L, p);

        L.push(v('#1', num(p.x), '中心 X'));
        L.push(v('#2', num(p.y), '中心 Y'));
        L.push(v('#3', num(hx), 'X 半长 ' + num(hx)));
        L.push(v('#4', num(hy), 'Y 半宽 ' + num(hy)));
        L.push(v('#5', num(r), '圆角 R'));
        L.push(v('#6', num(p.td), '刀具直径'));
        L.push(v('#7', num(z), '高度, 负值'));
        L.push(v('#8', num(p.q), '每层切深'));
        L.push(v('#9', num(out), '引入引出距离'));
        L.push('');

        L.push('G00 X[#1-#3-#9] Y[#2-#4+#5]    (引到左边中部外侧)');
        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #7] DO 1');
        L.push('  #20=#20-#8');
        L.push('  IF [#20 LT #7] THEN #20=#7');
        L.push('  G01 Z#20 F' + num(p.f * 0.4));
        L.push('  G41 D' + p.dn + ' G01 X[#1-#3] Y[#2-#4+#5] F' + num(p.f * 0.6) + '   (建立刀补)');
        L.push('  G01 Y[#2+#4-#5] F' + num(p.f) + '        (左边直段)');
        L.push('  G03 X[#1-#3+#5] Y[#2+#4] R#5           (左上圆角)');
        L.push('  G01 X[#1+#3-#5]                        (上边直段)');
        L.push('  G03 X[#1+#3] Y[#2+#4-#5] R#5           (右上圆角)');
        L.push('  G01 Y[#2-#4+#5]                        (右边直段)');
        L.push('  G03 X[#1+#3-#5] Y[#2-#4] R#5           (右下圆角)');
        L.push('  G01 X[#1-#3+#5]                        (下边直段)');
        L.push('  G03 X[#1-#3] Y[#2-#4+#5] R#5           (左下圆角)');
        L.push('  G40 G01 X[#1-#3-#9] F' + num(p.f * 0.6) + '   (取消刀补, 引出)');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    /* ================================================================
     *  四、轮廓
     * ================================================================ */

    polygon: {
      kind: 'mill', g: 'contour', no: 'O0021',
      name: '铣多边形',
      desc: '正 N 边形凸台的外形铣：只要给「对边宽」和边数，程序自动换算外接圆半径（R = 对边宽 / 2 ÷ cos(180°/N)），再用 COS/SIN 算出每个顶点。改边数不用重画图。用 G41 左刀补按轮廓编程。',
      fields: [
        { k: 'x', label: '中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '中心 Y', def: 0, step: 0.1 },
        { k: 'n', label: '边数', def: 6, step: 1, min: 3, max: 36, tip: '3~36，六方头填 6' },
        { k: 'sw', label: '对边宽', def: 60, step: 0.1, min: 1, tip: '两条平行边之间的距离' },
        { k: 'a', label: '起始角', def: 0, step: 1, tip: '度，第一个顶点的方位' },
        { k: 'z', label: '高度', def: 20, step: 0.1, min: 0.1 },
        { k: 'q', label: '每层切深', def: 3, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 12, step: 0.1, min: 1 },
        { k: 'dn', label: '刀补号 D', def: 1, step: 1, min: 1 },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 800, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.n < 3 || p.n !== Math.floor(p.n)) return '边数必须是不小于 3 的整数';
        if (p.td / 2 >= p.sw / 2) return '刀半径（' + num(p.td / 2) + '）不能大于内切圆半径（' + num(p.sw / 2) + '）';
        return null;
      },
      gen: function (p) {
        var R = (p.sw / 2) / Math.cos(Math.PI / p.n);
        var z = -Math.abs(p.z);
        var L = [];
        pushHeader(L, 'O0021 (POLYGON MILL)', 'POLYGON MILL - REGULAR N SIDES, G41 LEFT COMP');
        millHead(L, p);

        L.push(v('#1', num(p.x), '中心 X'));
        L.push(v('#2', num(p.y), '中心 Y'));
        L.push(v('#3', num(p.n), '边数'));
        L.push(v('#4', num(p.sw), '对边宽'));
        L.push(v('#5', num(p.a, 2), '起始角, 度'));
        L.push(v('#6', num(z), '高度, 负值'));
        L.push(v('#7', num(p.q), '每层切深'));
        L.push(v('#10', '[#4/2]/COS[180/#3]', '外接圆半径 ' + num(R)));
        L.push('');

        L.push('G00 X[#1+#10*1.4*COS[#5]] Y[#2+#10*1.4*SIN[#5]]   (引到第一个顶点外侧)');
        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #6] DO 1');
        L.push('  #20=#20-#7');
        L.push('  IF [#20 LT #6] THEN #20=#6');
        L.push('  G01 Z#20 F' + num(p.f * 0.4));
        L.push('  G41 D' + p.dn + ' G01 X[#1+#10*COS[#5]] Y[#2+#10*SIN[#5]] F' + num(p.f * 0.6));
        L.push('  #21=1                     (第几个顶点)');
        L.push('  WHILE [#21 LT #3] DO 2');
        L.push('    #22=#5+#21*360/#3');
        L.push('    G01 X[#1+#10*COS[#22]] Y[#2+#10*SIN[#22]] F' + num(p.f));
        L.push('    #21=#21+1');
        L.push('  END 2');
        L.push('  G01 X[#1+#10*COS[#5]] Y[#2+#10*SIN[#5]]   (闭合回第一个顶点)');
        L.push('  G40 G01 X[#1+#10*1.4*COS[#5]] Y[#2+#10*1.4*SIN[#5]] F' + num(p.f * 0.6));
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    polyAny: {
      kind: 'mill', g: 'contour', no: 'O0022',
      name: '任意多边形',
      desc: '点表驱动的闭合轮廓：<code>#100 #101 …</code> 存 X 坐标，<code>#200 #201 …</code> 存 Y 坐标，按顺序连成一条闭合轮廓。程序按「点数」自动展开，改点数重新生成一次，再把坐标改成图纸上的实际值。适合非正多边形、异形凸台。',
      fields: [
        { k: 'x', label: '中心 X', def: 0, step: 0.1, tip: '只用于生成默认点，改点表后以点表为准' },
        { k: 'y', label: '中心 Y', def: 0, step: 0.1 },
        { k: 'n', label: '点数', def: 6, step: 1, min: 3, max: 20 },
        { k: 'r', label: '默认外接半径', def: 40, step: 0.1, min: 1, tip: '生成默认正多边形用，之后手改点表' },
        { k: 'z', label: '高度', def: 15, step: 0.1, min: 0.1 },
        { k: 'q', label: '每层切深', def: 3, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 12, step: 0.1, min: 1 },
        { k: 'dn', label: '刀补号 D', def: 1, step: 1, min: 1 },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 800, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.n < 3) return '至少 3 个点才能围成轮廓';
        return null;
      },
      gen: function (p) {
        var n = Math.round(p.n);
        var z = -Math.abs(p.z);
        var L = [];
        pushHeader(L, 'O0022 (POINT-TABLE CONTOUR)', 'POINT TABLE CONTOUR - G41 LEFT COMP');
        millHead(L, p);

        L.push('(点表: #100 起存 X, #200 起存 Y, 按图纸改数值即可)');
        for (var i = 0; i < n; i++) {
          var ang = -90 + i * 360 / n;
          var px = p.x + p.r * Math.cos(ang * Math.PI / 180);
          var py = p.y + p.r * Math.sin(ang * Math.PI / 180);
          L.push(v('#' + (100 + i), num(px), 'X' + (i + 1)));
          L.push(v('#' + (200 + i), num(py), 'Y' + (i + 1)));
        }
        L.push('');
        L.push(v('#1', num(p.x), '参考中心 X'));
        L.push(v('#2', num(p.y), '参考中心 Y'));
        L.push(v('#3', num(n), '点数'));
        L.push(v('#4', num(p.td), '刀具直径'));
        L.push(v('#5', num(z), '高度, 负值'));
        L.push(v('#6', num(p.q), '每层切深'));
        L.push('');

        L.push('G00 X#100 Y#200    (引到第 1 点)');
        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #5] DO 1');
        L.push('  #20=#20-#6');
        L.push('  IF [#20 LT #5] THEN #20=#5');
        L.push('  G01 Z#20 F' + num(p.f * 0.4));
        L.push('  G41 D' + p.dn + ' G01 X#100 Y#200 F' + num(p.f * 0.6));
        for (var j = 1; j < n; j++) {
          L.push('  G01 X#' + (100 + j) + ' Y#' + (200 + j) + ' F' + num(p.f));
        }
        L.push('  G01 X#100 Y#200             (闭合)');
        L.push('  G40 G01 X[#100+#4] Y#200 F' + num(p.f * 0.6) + '    (取消刀补, 引出)');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    hex: {
      kind: 'mill', g: 'contour', no: 'O0023',
      name: '外六方铣削',
      desc: '六方头专用：按「对边宽」直接算六个顶点，一个顶点一段直线，走完一圈是一层。比通用多边形少两个参数，扳手口、六角螺母、六方轴端都用这个。',
      fields: [
        { k: 'x', label: '中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '中心 Y', def: 0, step: 0.1 },
        { k: 'sw', label: '对边宽', def: 50, step: 0.1, min: 1, tip: '扳手口尺寸' },
        { k: 'a', label: '起始角', def: 0, step: 1, tip: '度，0° 时第一个顶点在 X+ 方向' },
        { k: 'z', label: '高度', def: 20, step: 0.1, min: 0.1 },
        { k: 'q', label: '每层切深', def: 3, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 12, step: 0.1, min: 1 },
        { k: 'dn', label: '刀补号 D', def: 1, step: 1, min: 1 },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 800, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.td / 2 >= p.sw / 2) return '刀半径不能大于内切圆半径（对边宽的一半）';
        return null;
      },
      gen: function (p) {
        var R = (p.sw / 2) / Math.cos(Math.PI / 6);
        var z = -Math.abs(p.z);
        var L = [];
        pushHeader(L, 'O0023 (HEXAGON MILL)', 'HEXAGON MILL - G41 LEFT COMP');
        millHead(L, p);

        L.push(v('#1', num(p.x), '中心 X'));
        L.push(v('#2', num(p.y), '中心 Y'));
        L.push(v('#3', num(p.sw), '对边宽'));
        L.push(v('#4', num(p.a, 2), '起始角, 度'));
        L.push(v('#5', num(z), '高度, 负值'));
        L.push(v('#6', num(p.q), '每层切深'));
        L.push(v('#10', '[#3/2]/COS[30]', '外接圆半径 ' + num(R)));
        L.push('');

        L.push('G00 X[#1+#10*1.4*COS[#4]] Y[#2+#10*1.4*SIN[#4]]');
        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #5] DO 1');
        L.push('  #20=#20-#6');
        L.push('  IF [#20 LT #5] THEN #20=#5');
        L.push('  G01 Z#20 F' + num(p.f * 0.4));
        L.push('  G41 D' + p.dn + ' G01 X[#1+#10*COS[#4]] Y[#2+#10*SIN[#4]] F' + num(p.f * 0.6));
        L.push('  #21=1');
        L.push('  WHILE [#21 LT 6] DO 2');
        L.push('    #22=#4+#21*60');
        L.push('    G01 X[#1+#10*COS[#22]] Y[#2+#10*SIN[#22]] F' + num(p.f));
        L.push('    #21=#21+1');
        L.push('  END 2');
        L.push('  G01 X[#1+#10*COS[#4]] Y[#2+#10*SIN[#4]]');
        L.push('  G40 G01 X[#1+#10*1.4*COS[#4]] Y[#2+#10*1.4*SIN[#4]] F' + num(p.f * 0.6));
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    star: {
      kind: 'mill', g: 'contour', no: 'O0024',
      name: '五角星',
      desc: '五角星轮廓：10 个顶点，外顶点在半径 R 的圆上、内凹点在 0.382R 的圆上（标准五角星比例），两点交替连线就是星形。每层走一圈，用 G41 补偿刀半径。',
      fields: [
        { k: 'x', label: '中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '中心 Y', def: 0, step: 0.1 },
        { k: 'r', label: '外接半径 R', def: 50, step: 0.1, min: 1, tip: '星尖到中心的距离' },
        { k: 'a', label: '起始角', def: -90, step: 1, tip: '-90° 时星尖朝上' },
        { k: 'z', label: '高度', def: 10, step: 0.1, min: 0.1 },
        { k: 'q', label: '每层切深', def: 2, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 8, step: 0.1, min: 1 },
        { k: 'dn', label: '刀补号 D', def: 1, step: 1, min: 1 },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 700, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.r <= 0) return '外接半径必须大于 0';
        if (p.td / 2 >= p.r * 0.382 * 0.8) return '刀太大，内凹点那里切不进去';
        return null;
      },
      gen: function (p) {
        var rr = p.r * 0.381966;
        var z = -Math.abs(p.z);
        var L = [];
        pushHeader(L, 'O0024 (FIVE-POINT STAR)', 'FIVE POINT STAR - G41 LEFT COMP');
        millHead(L, p);

        L.push(v('#1', num(p.x), '中心 X'));
        L.push(v('#2', num(p.y), '中心 Y'));
        L.push(v('#3', num(p.r), '外接半径 R'));
        L.push(v('#4', num(rr), '内凹半径 = 0.382R'));
        L.push(v('#5', num(p.a, 2), '起始角, 度'));
        L.push(v('#6', num(z), '高度, 负值'));
        L.push(v('#7', num(p.q), '每层切深'));
        L.push('');

        L.push('G00 X#1 Y#2');
        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #6] DO 1');
        L.push('  #20=#20-#7');
        L.push('  IF [#20 LT #6] THEN #20=#6');
        L.push('  G01 Z#20 F' + num(p.f * 0.4));
        L.push('  G41 D' + p.dn + ' G01 X[#1+#3*COS[#5]] Y[#2+#3*SIN[#5]] F' + num(p.f * 0.6));
        L.push('  #21=1                     (第几个顶点, 奇数在内凹点)');
        L.push('  WHILE [#21 LT 10] DO 2');
        L.push('    #22=#5+#21*36');
        L.push('    #23=#3                  (默认外顶点)');
        L.push('    IF [[#21 MOD 2] EQ 1] THEN #23=#4    (奇数点用内凹半径)');
        L.push('    G01 X[#1+#23*COS[#22]] Y[#2+#23*SIN[#22]] F' + num(p.f));
        L.push('    #21=#21+1');
        L.push('  END 2');
        L.push('  G01 X[#1+#3*COS[#5]] Y[#2+#3*SIN[#5]]');
        L.push('  G40 G01 X#1 Y#2 F' + num(p.f * 0.6));
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    ellipse: {
      kind: 'mill', g: 'contour', no: 'O0025',
      name: '铣椭圆',
      desc: '椭圆轮廓：X = 长半轴 × cos t，Y = 短半轴 × sin t，按角度步距分成很多小直线段连起来。步距 5° 时轮廓误差已经很小，要更光就调小。带 G41 补偿刀半径。',
      fields: [
        { k: 'x', label: '中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '中心 Y', def: 0, step: 0.1 },
        { k: 'ra', label: '长半轴 A', def: 60, step: 0.1, min: 0.5, tip: 'X 方向的半长' },
        { k: 'rb', label: '短半轴 B', def: 35, step: 0.1, min: 0.5, tip: 'Y 方向的半长' },
        { k: 'a', label: '角度步距', def: 5, step: 1, min: 1, tip: '越小轮廓越准，程序也越长' },
        { k: 'z', label: '高度', def: 10, step: 0.1, min: 0.1 },
        { k: 'q', label: '每层切深', def: 2, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 10, step: 0.1, min: 1 },
        { k: 'dn', label: '刀补号 D', def: 1, step: 1, min: 1 },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 800, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.ra <= 0 || p.rb <= 0) return '长短半轴必须大于 0';
        if (p.rb > p.ra) return '短半轴不应大于长半轴，检查是否填反';
        return null;
      },
      gen: function (p) {
        var z = -Math.abs(p.z);
        var L = [];
        pushHeader(L, 'O0025 (ELLIPSE MILL)', 'ELLIPSE MILL - G41 LEFT COMP');
        millHead(L, p);

        L.push(v('#1', num(p.x), '中心 X'));
        L.push(v('#2', num(p.y), '中心 Y'));
        L.push(v('#3', num(p.ra), '长半轴 A'));
        L.push(v('#4', num(p.rb), '短半轴 B'));
        L.push(v('#5', num(p.a, 2), '角度步距, 度'));
        L.push(v('#6', num(z), '高度, 负值'));
        L.push(v('#7', num(p.q), '每层切深'));
        L.push('');

        L.push('G00 X[#1+#3] Y#2');
        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #6] DO 1');
        L.push('  #20=#20-#7');
        L.push('  IF [#20 LT #6] THEN #20=#6');
        L.push('  G01 Z#20 F' + num(p.f * 0.4));
        L.push('  G41 D' + p.dn + ' G01 X[#1+#3] Y#2 F' + num(p.f * 0.6));
        L.push('  #21=0                     (当前角度)');
        L.push('  WHILE [#21 LE 360] DO 2');
        L.push('    G01 X[#1+#3*COS[#21]] Y[#2+#4*SIN[#21]] F' + num(p.f));
        L.push('    #21=#21+#5');
        L.push('  END 2');
        L.push('  G01 X[#1+#3] Y#2          (闭合)');
        L.push('  G40 G01 X[#1+#3+#7] Y#2 F' + num(p.f * 0.6));
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    heart: {
      kind: 'mill', g: 'contour', no: 'O0026',
      name: '笛卡尔心形线',
      desc: '用直角坐标参数方程画心形：x = 16sin³t，y = 13cos t − 5cos2t − 2cos3t − cos4t。原始曲线宽约 32 个单位，程序按「宽度」自动换算缩放比例，所以填实际 mm 就行。t 从 0° 走到 360° 一圈闭合。',
      fields: [
        { k: 'x', label: '中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '中心 Y', def: 0, step: 0.1 },
        { k: 'w', label: '图形宽度', def: 64, step: 0.5, min: 1, tip: '原始公式宽 32 单位，这里填实际毫米' },
        { k: 'a', label: '角度步距', def: 3, step: 1, min: 0.5, tip: '越小曲线越顺' },
        { k: 'z', label: '高度', def: 6, step: 0.1, min: 0.1 },
        { k: 'q', label: '每层切深', def: 1.5, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 3, step: 0.1, min: 0.2, tip: '尖角处要用小刀' },
        { k: 'dn', label: '刀补号 D', def: 1, step: 1, min: 1 },
        { k: 's', label: '转速 S', def: 4000, step: 100 },
        { k: 'f', label: '进给 F', def: 500, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.w <= 0) return '图形宽度必须大于 0';
        if (p.a <= 0) return '角度步距必须大于 0';
        return null;
      },
      gen: function (p) {
        var k = p.w / 32;
        var z = -Math.abs(p.z);
        var L = [];
        pushHeader(L, 'O0026 (CARDIOID HEART)', 'CARDIOID HEART - PARAMETRIC EQUATION');
        millHead(L, p);

        L.push(v('#1', num(p.x), '中心 X'));
        L.push(v('#2', num(p.y), '中心 Y'));
        L.push(v('#3', num(k, 5), '缩放系数 = 宽度/32'));
        L.push(v('#4', num(p.a, 2), '角度步距, 度'));
        L.push(v('#5', num(z), '高度, 负值'));
        L.push(v('#6', num(p.q), '每层切深'));
        L.push('');

        L.push('G00 X#1 Y[#2+#3*5]');
        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #5] DO 1');
        L.push('  #20=#20-#6');
        L.push('  IF [#20 LT #5] THEN #20=#5');
        L.push('  G01 Z#20 F' + num(p.f * 0.4));
        L.push('  G41 D' + p.dn + ' G01 X#1 Y[#2+#3*5] F' + num(p.f * 0.6));
        L.push('  #21=0                     (参数 t, 度)');
        L.push('  WHILE [#21 LE 360] DO 2');
        L.push('    #22=#3*16*SIN[#21]*SIN[#21]*SIN[#21]                                    (x)');
        L.push('    #23=#3*[13*COS[#21]-5*COS[2*#21]-2*COS[3*#21]-COS[4*#21]]              (y)');
        L.push('    G01 X[#1+#22] Y[#2+#23] F' + num(p.f));
        L.push('    #21=#21+#4');
        L.push('  END 2');
        L.push('  G40 G01 X#1 Y[#2+#3*5] F' + num(p.f * 0.6));
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    contour: {
      kind: 'mill', g: 'contour', no: 'O0027',
      name: '轮廓铣',
      desc: '点表闭合轮廓的通用框架，额外支持选补偿方向：<code>G41</code> 铣凸台外形，<code>G42</code> 铣型腔内壁。先用「点数」生成骨架，再按图纸把 <code>#100 / #200</code> 起的坐标改成实际值，点数改了重新生成一次程序即可。',
      fields: [
        { k: 'n', label: '点数', def: 6, step: 1, min: 3, max: 24, tip: '轮廓上有几个转折点' },
        { k: 'x', label: '参考中心 X', def: 0, step: 0.1, tip: '只用于生成默认点' },
        { k: 'y', label: '参考中心 Y', def: 0, step: 0.1 },
        { k: 'r', label: '默认半径', def: 40, step: 0.1, min: 1, tip: '生成默认正多边形用' },
        { k: 'side', label: '补偿方向', type: 'select', def: 0, opts: [{ v: 0, t: 'G41 外形/凸台' }, { v: 1, t: 'G42 内腔/型腔' }] },
        { k: 'z', label: '高度', def: 15, step: 0.1, min: 0.1 },
        { k: 'q', label: '每层切深', def: 3, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 10, step: 0.1, min: 1 },
        { k: 'dn', label: '刀补号 D', def: 1, step: 1, min: 1 },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 800, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.n < 3) return '至少 3 个点才能围成轮廓';
        return null;
      },
      gen: function (p) {
        var n = Math.round(p.n);
        var z = -Math.abs(p.z);
        var g = Number(p.side) ? 'G42' : 'G41';
        var L = [];
        pushHeader(L, 'O0027 (CONTOUR MILL)', 'CLOSED POINT TABLE, ' + g + ' COMP');
        millHead(L, p);

        L.push('(点表: #100 起 X, #200 起 Y, 按图纸改数值)');
        for (var i = 0; i < n; i++) {
          var ang = -90 + i * 360 / n;
          L.push(v('#' + (100 + i), num(p.x + p.r * Math.cos(ang * Math.PI / 180)), 'X' + (i + 1)));
          L.push(v('#' + (200 + i), num(p.y + p.r * Math.sin(ang * Math.PI / 180)), 'Y' + (i + 1)));
        }
        L.push('');
        L.push(v('#3', num(n), '点数'));
        L.push(v('#4', num(p.td), '刀具直径'));
        L.push(v('#5', num(z), '高度, 负值'));
        L.push(v('#6', num(p.q), '每层切深'));
        L.push('');

        L.push('G00 X#100 Y#200');
        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #5] DO 1');
        L.push('  #20=#20-#6');
        L.push('  IF [#20 LT #5] THEN #20=#5');
        L.push('  G01 Z#20 F' + num(p.f * 0.4));
        L.push('  ' + g + ' D' + p.dn + ' G01 X#100 Y#200 F' + num(p.f * 0.6));
        for (var j = 1; j < n; j++) {
          L.push('  G01 X#' + (100 + j) + ' Y#' + (200 + j) + ' F' + num(p.f));
        }
        L.push('  G01 X#100 Y#200             (闭合)');
        L.push('  G40 G01 X[#100+#4*1.5] Y#200 F' + num(p.f * 0.6));
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    squareRound: {
      kind: 'mill', g: 'contour', no: 'O0028',
      name: '天圆地方',
      desc: '方变圆过渡件：每一层截面都是「方和圆的插值」——底层是边长 A 的正方形，顶层是直径 D 的圆，中间按高度比例过渡。方的极坐标半径取 A/2 ÷ max(|cosφ|,|sinφ|)，跟圆半径加权平均，再减去刀半径就是刀心轨迹。',
      fields: [
        { k: 'x', label: '中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '中心 Y', def: 0, step: 0.1 },
        { k: 'a', label: '底边方宽', def: 80, step: 0.1, min: 1, tip: '底部正方形的边长' },
        { k: 'd', label: '顶部圆直径', def: 40, step: 0.1, min: 1 },
        { k: 'ht', label: '过渡高度', def: 40, step: 0.1, min: 0.5 },
        { k: 'q', label: '每层切深', def: 2, step: 0.1, min: 0.1 },
        { k: 'st', label: '角度步距', def: 10, step: 1, min: 2, tip: '每层轮廓用多少度一段逼近' },
        { k: 'td', label: '刀具直径', def: 10, step: 0.1, min: 1 },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 800, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.a <= 0 || p.d <= 0) return '方宽和圆直径都必须大于 0';
        if (p.st <= 0) return '角度步距必须大于 0';
        if (p.td >= Math.min(p.a, p.d)) return '刀具太大，放不进过渡件';
        return null;
      },
      gen: function (p) {
        var dep = Math.abs(p.ht);
        var L = [];
        pushHeader(L, 'O0028 (SQUARE TO ROUND)', 'SQUARE TO ROUND - CONSTANT Z INTERPOLATION');
        millHead(L, p);

        L.push(v('#1', num(p.x), '中心 X'));
        L.push(v('#2', num(p.y), '中心 Y'));
        L.push(v('#3', num(p.a), '底边方宽'));
        L.push(v('#4', num(p.d), '顶部圆直径'));
        L.push(v('#5', num(-dep), '过渡高度, 负值'));
        L.push(v('#6', num(p.q), '每层切深'));
        L.push(v('#7', num(p.st), '角度步距, 度'));
        L.push(v('#8', num(p.td), '刀具直径'));
        L.push('');

        L.push('G00 X#1 Y#2');
        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('#20=0           (当前 Z)');
        L.push('WHILE [#20 GT #5] DO 1');
        L.push('  #20=#20-#6');
        L.push('  IF [#20 LT #5] THEN #20=#5');
        L.push('  #9=[-#20/#5]              (过渡比例 0=方 1=圆)');
        L.push('  G01 Z#20 F' + num(p.f * 0.4));
        L.push('  #21=0                     (当前角度)');
        L.push('  G00 X[#1+[#3/2-#8/2]] Y#2');
        L.push('  WHILE [#21 LE 360] DO 2');
        L.push('    #22=ABS[COS[#21]]        (方形的极坐标半径)');
        L.push('    #23=ABS[SIN[#21]]');
        L.push('    IF [#23 GT #22] THEN #22=#23');
        L.push('    #22=[#3/2]/#22           (方形边缘半径)');
        L.push('    #24=#22+[[#4/2]-#22]*#9  (本层插值半径)');
        L.push('    #24=#24-#8/2             (扣掉刀半径)');
        L.push('    G01 X[#1+#24*COS[#21]] Y[#2+#24*SIN[#21]] F' + num(p.f));
        L.push('    #21=#21+#7');
        L.push('  END 2');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    /* ================================================================
     *  五、斜面与曲面
     * ================================================================ */

    slopeCalc: {
      kind: 'mill', g: 'slope', no: 'O0029',
      name: '宏铣斜面',
      desc: '用三角函数算斜面：每沿 X 走一小段，Z 按 tanθ 同步下降一段，一堆小直线拼出一条准确的斜线。适合精铣斜面、斜导轨、拔模斜度。Z0 要设在斜面起点（X 起点处）的高度上。',
      fields: [
        { k: 'x', label: '起点 X', def: 0, step: 0.1, tip: '斜面起点，此处 Z=0' },
        { k: 'y', label: '起点 Y', def: 0, step: 0.1 },
        { k: 'l', label: '斜面长度', def: 100, step: 0.1, min: 1, tip: 'X 向水平投影长度' },
        { k: 'ang', label: '斜面角度', def: 10, step: 0.5, min: 0.1, max: 85, tip: '度，相对水平面' },
        { k: 'w', label: '宽度', def: 40, step: 0.1, min: 0.1, tip: 'Y 向要铣多宽' },
        { k: 'td', label: '刀具直径', def: 12, step: 0.1, min: 1 },
        { k: 'k', label: '行距系数', def: 0.7, step: 0.05, min: 0.2, max: 0.95 },
        { k: 'seg', label: '分段长度', def: 2, step: 0.5, min: 0.5, tip: '每段小直线的长度，越小越准' },
        { k: 's', label: '转速 S', def: 2000, step: 50 },
        { k: 'f', label: '进给 F', def: 800, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.ang <= 0 || p.ang >= 90) return '斜面角度要在 0~90° 之间';
        if (p.w <= 0) return '宽度必须大于 0';
        return null;
      },
      gen: function (p) {
        var tan = Math.tan(p.ang * Math.PI / 180);
        var step = p.td * p.k;
        var rows = Math.max(1, Math.ceil(p.w / step));
        var real = p.w / rows;
        var L = [];
        pushHeader(L, 'O0029 (TAPER SURFACE MILL)', 'TAPER SURFACE MILL - BALL OR FLAT, ROW BY ROW');
        millHead(L, p);

        L.push(v('#1', num(p.x), '起点 X, 此处 Z=0'));
        L.push(v('#2', num(p.y), '起点 Y'));
        L.push(v('#3', num(p.l), '斜面长度, X 向'));
        L.push(v('#4', num(p.ang, 2), '斜面角度, 度'));
        L.push(v('#5', num(p.w), '宽度, Y 向'));
        L.push(v('#6', num(p.td), '刀具直径'));
        L.push(v('#7', num(p.seg), '分段长度'));
        L.push('');
        L.push(v('#10', 'TAN[#4]', '斜率 ' + num(tan, 4)));
        L.push(v('#11', num(real), '行距 ' + num(real)));
        L.push(v('#12', num(rows), '行数 ' + rows));
        L.push('');

        L.push('G00 X#1 Y#2');
        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('#20=0           (第几行)');
        L.push('WHILE [#20 LT #12] DO 1');
        L.push('  #21=#2+#20*#11           (本行 Y)');
        L.push('  #22=0                    (沿 X 已走距离)');
        L.push('  G01 Y#21 F' + num(p.f));
        L.push('  WHILE [#22 LE #3] DO 2');
        L.push('    #23=-#10*#22           (本点 Z)');
        L.push('    G01 X[#1+#22] Z#23 F' + num(p.f));
        L.push('    #22=#22+#7');
        L.push('  END 2');
        L.push('  G00 Z5');
        L.push('  G00 X#1');
        L.push('  G00 Z0');
        L.push('  #20=#20+1');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    slopeRot: {
      kind: 'mill', g: 'slope', no: 'O0030',
      name: '铣斜面',
      desc: '坐标系旋转版斜面铣：用 G68 把坐标系转一个角度，斜面方向就永远是「沿 X 走、Z 线性下降」，斜着摆在台面上的工件不用重新装夹。和「宏铣斜面」的区别是它靠 G68，不靠三角函数算点。',
      fields: [
        { k: 'x', label: '起点 X', def: 0, step: 0.1, tip: '旋转中心，也是斜面起点' },
        { k: 'y', label: '起点 Y', def: 0, step: 0.1 },
        { k: 'rot', label: '坐标系转角', def: 0, step: 1, tip: '工件在台面上斜放的角度，度' },
        { k: 'l', label: '走刀长度', def: 100, step: 0.1, min: 1 },
        { k: 'ang', label: '斜面角度', def: 10, step: 0.5, min: 0.1, max: 85 },
        { k: 'w', label: '宽度', def: 40, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 12, step: 0.1, min: 1 },
        { k: 'k', label: '行距系数', def: 0.7, step: 0.05, min: 0.2, max: 0.95 },
        { k: 's', label: '转速 S', def: 2000, step: 50 },
        { k: 'f', label: '进给 F', def: 800, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.ang <= 0 || p.ang >= 90) return '斜面角度要在 0~90° 之间';
        return null;
      },
      gen: function (p) {
        var tan = Math.tan(p.ang * Math.PI / 180);
        var step = p.td * p.k;
        var rows = Math.max(1, Math.ceil(p.w / step));
        var real = p.w / rows;
        var L = [];
        pushHeader(L, 'O0030 (TAPER MILL G68)', 'TAPER MILL - G68 COORD ROTATION');
        millHead(L, p);

        L.push(v('#1', num(p.x), '旋转中心 X'));
        L.push(v('#2', num(p.y), '旋转中心 Y'));
        L.push(v('#3', num(p.rot, 2), '坐标系转角, 度'));
        L.push(v('#4', num(p.l), '走刀长度'));
        L.push(v('#5', num(p.ang, 2), '斜面角度, 度'));
        L.push(v('#6', num(p.w), '宽度'));
        L.push(v('#7', num(p.td), '刀具直径'));
        L.push('');
        L.push(v('#10', 'TAN[#5]', '斜率 ' + num(tan, 4)));
        L.push(v('#11', num(real), '行距 ' + num(real)));
        L.push(v('#12', num(rows), '行数 ' + rows));
        L.push('');

        L.push('G68 X#1 Y#2 R#3        (坐标系绕起点转 #3 度)');
        L.push('G00 X#1 Y#2');
        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('#20=0           (第几行)');
        L.push('WHILE [#20 LT #12] DO 1');
        L.push('  #21=#2+#20*#11');
        L.push('  G01 Y#21 F' + num(p.f));
        L.push('  G01 X[#1+#4] Z[-#10*#4] F' + num(p.f) + '    (斜着走一刀)');
        L.push('  G00 Z5');
        L.push('  G00 X#1');
        L.push('  G00 Z0');
        L.push('  #20=#20+1');
        L.push('END 1');
        L.push('G69                    (取消坐标旋转)');
        millEnd(L);
        return L.join('\n');
      }
    },

    sphere: {
      kind: 'mill', g: 'slope', no: 'O0031',
      name: '铣凹凸半球',
      desc: '球面用等高分层：高度 z 处刀心的圆半径 ρ = √(Rc² − z²)，Rc 是刀心到球心的距离——凸球取 R + 刀半径，凹球取 R − 刀半径。每层走一整圈，层距越小球面越光。球刀加工，Z0 设在球心位置。',
      fields: [
        { k: 'x', label: '球心 X', def: 0, step: 0.1 },
        { k: 'y', label: '球心 Y', def: 0, step: 0.1 },
        { k: 'r', label: '球半径 R', def: 40, step: 0.1, min: 1 },
        { k: 'mode', label: '凸/凹', type: 'select', def: 0, opts: [{ v: 0, t: '凸半球' }, { v: 1, t: '凹半球' }] },
        { k: 'td', label: '球刀直径', def: 10, step: 0.1, min: 0.5 },
        { k: 'q', label: '层距 (Z)', def: 1, step: 0.1, min: 0.05 },
        { k: 's', label: '转速 S', def: 3000, step: 100 },
        { k: 'f', label: '进给 F', def: 800, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (Number(p.mode) === 1 && p.td / 2 >= p.r) return '凹球：刀半径必须小于球半径';
        if (p.r <= 0) return '球半径必须大于 0';
        return null;
      },
      gen: function (p) {
        var convex = !Number(p.mode);
        var rc = convex ? p.r + p.td / 2 : p.r - p.td / 2;
        var z0 = convex ? rc : -rc;
        var L = [];
        pushHeader(L, 'O0031 (HEMISPHERE MILL)', convex ? 'CONVEX HEMISPHERE - BALL NOSE, CONSTANT Z' : 'CONCAVE HEMISPHERE - BALL NOSE, CONSTANT Z');
        millHead(L, p);

        L.push(v('#1', num(p.x), '球心 X'));
        L.push(v('#2', num(p.y), '球心 Y'));
        L.push(v('#3', num(p.r), '球半径 R'));
        L.push(v('#4', num(p.td / 2), '球刀半径'));
        L.push(v('#5', num(rc), '刀心球面半径 Rc ' + num(rc)));
        L.push(v('#6', num(p.q), '层距, Z'));
        L.push(v('#7', num(z0), convex ? 'START Z = Rc AT BALL TOP' : 'START Z = -Rc AT BALL BOTTOM'));
        L.push('');

        L.push('G00 X#1 Y#2');
        if (convex) {
          L.push('G00 Z[#7+5]');
          L.push('#20=#7                  (当前 dz, 从球顶往下)');
          L.push('WHILE [#20 GE 0] DO 1');
          L.push('  #21=SQRT[#5*#5-#20*#20]   (本层刀心圆半径)');
          L.push('  G00 Z[#20+1]');
          L.push('  G01 Z#20 F' + num(p.f * 0.4));
          L.push('  G01 X[#1+#21] F' + num(p.f));
          L.push('  IF [#21 GT 0.01] THEN G02 I-[#21] J0');
          L.push('  G01 X#1 Y#2');
          L.push('  #20=#20-#6');
          L.push('END 1');
        } else {
          L.push('G00 Z5');
          L.push('#20=#7                  (当前 dz, 从球底往上)');
          L.push('WHILE [#20 LE 0] DO 1');
          L.push('  #21=SQRT[#5*#5-#20*#20]');
          L.push('  G00 X#1 Y#2');
          L.push('  G01 Z#20 F' + num(p.f * 0.4));
          L.push('  G01 X[#1+#21] F' + num(p.f));
          L.push('  IF [#21 GT 0.01] THEN G02 I-[#21] J0');
          L.push('  G01 X#1 Y#2');
          L.push('  #20=#20+#6');
          L.push('END 1');
        }
        millEnd(L);
        return L.join('\n');
      }
    },

    /* ================================================================
     *  六、螺纹铣削
     * ================================================================ */

    threadIn: {
      kind: 'mill', g: 'thread', no: 'O0032',
      name: '内螺纹铣',
      desc: '螺纹铣刀走螺旋插补：一圈升一个螺距，Z 与回转同步，一次成牙。要求系统支持螺旋插补（Fanuc 0i 以上都行，G02/G03 带 Z 和 I/J）。右旋用 G02 配 Z 下降，左旋对调。比丝锥安全，断了也好取。',
      fields: [
        { k: 'x', label: '螺纹中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '螺纹中心 Y', def: 0, step: 0.1 },
        { k: 'd', label: '螺纹大径', def: 30, step: 0.1, min: 1, tip: '公称直径，M30 填 30' },
        { k: 'p', label: '螺距', def: 2, step: 0.25, min: 0.25 },
        { k: 'l', label: '螺纹长度', def: 25, step: 0.5, min: 0.5 },
        { k: 'td', label: '铣刀直径', def: 16, step: 0.1, min: 1, tip: '单齿螺纹铣刀的切削直径' },
        { k: 'dir', label: '旋向', type: 'select', def: 0, opts: [{ v: 0, t: '右旋 (G02)' }, { v: 1, t: '左旋 (G03)' }] },
        { k: 's', label: '转速 S', def: 2500, step: 100 },
        { k: 'f', label: '进给 F', def: 500, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.td >= p.d) return '铣刀直径必须小于螺纹大径';
        if (p.p <= 0) return '螺距必须大于 0';
        if (p.l < p.p) return '螺纹长度至少要有一个螺距';
        return null;
      },
      gen: function (p) {
        var r = (p.d - p.td) / 2;
        var turns = Math.ceil(p.l / p.p);
        var g = Number(p.dir) ? 'G03' : 'G02';
        var L = [];
        pushHeader(L, 'O0032 (INTERNAL THREAD MILL)', 'INTERNAL THREAD MILL - HELICAL, SINGLE TOOTH');
        millHead(L, p);

        L.push(v('#1', num(p.x), '螺纹中心 X'));
        L.push(v('#2', num(p.y), '螺纹中心 Y'));
        L.push(v('#3', num(p.d), '螺纹大径'));
        L.push(v('#4', num(p.p, 4), '螺距'));
        L.push(v('#5', num(p.l), '螺纹长度'));
        L.push(v('#6', num(p.td), '铣刀直径'));
        L.push(v('#8', '[#3-#6]/2', '轨迹半径 ' + num(r)));
        L.push(v('#10', num(turns), '螺旋圈数 ' + turns));
        L.push('');

        L.push('G00 X#1 Y#2');
        L.push('G00 Z2');
        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('G01 X[#1+#8] F' + num(p.f * 0.6));
        L.push('#9=0            (当前 Z)');
        L.push('#20=0           (第几圈)');
        L.push('WHILE [#20 LT #10] DO 1');
        L.push('  #9=#9-#4');
        L.push('  ' + g + ' X[#1+#8] Y#2 Z#9 I-[#8] J0 F' + num(p.f) + '    (一圈升一个螺距)');
        L.push('  #20=#20+1');
        L.push('END 1');
        L.push('');
        L.push('G01 X#1 F' + num(p.f * 0.6) + '        (退回中心)');
        millEnd(L);
        return L.join('\n');
      }
    },

    threadG23: {
      kind: 'mill', g: 'thread', no: 'O0033',
      name: 'G2G3 铣螺纹',
      desc: '阶梯式螺纹铣：每圈走一个完整整圆（Z 不变），圈末再下降一个螺距。不用螺旋插补功能，老系统、国产系统也能跑。牙型是台阶状的螺旋近似，圈距越小越接近理论螺旋线。',
      fields: [
        { k: 'x', label: '螺纹中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '螺纹中心 Y', def: 0, step: 0.1 },
        { k: 'd', label: '螺纹大径', def: 30, step: 0.1, min: 1 },
        { k: 'p', label: '螺距', def: 2, step: 0.25, min: 0.25 },
        { k: 'l', label: '螺纹长度', def: 25, step: 0.5, min: 0.5 },
        { k: 'td', label: '铣刀直径', def: 16, step: 0.1, min: 1 },
        { k: 'dir', label: '旋向', type: 'select', def: 0, opts: [{ v: 0, t: '右旋 (G02)' }, { v: 1, t: '左旋 (G03)' }] },
        { k: 's', label: '转速 S', def: 2500, step: 100 },
        { k: 'f', label: '进给 F', def: 500, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.td >= p.d) return '铣刀直径必须小于螺纹大径';
        if (p.p <= 0) return '螺距必须大于 0';
        return null;
      },
      gen: function (p) {
        var r = (p.d - p.td) / 2;
        var turns = Math.ceil(p.l / p.p);
        var g = Number(p.dir) ? 'G03' : 'G02';
        var L = [];
        pushHeader(L, 'O0033 (THREAD MILL G02/G03 STEP)', 'THREAD MILL - FULL TURN THEN STEP DOWN ONE PITCH');
        millHead(L, p);

        L.push(v('#1', num(p.x), '螺纹中心 X'));
        L.push(v('#2', num(p.y), '螺纹中心 Y'));
        L.push(v('#3', num(p.d), '螺纹大径'));
        L.push(v('#4', num(p.p, 4), '螺距'));
        L.push(v('#5', num(p.l), '螺纹长度'));
        L.push(v('#6', num(p.td), '铣刀直径'));
        L.push(v('#8', '[#3-#6]/2', '轨迹半径 ' + num(r)));
        L.push(v('#10', num(turns), '圈数 ' + turns));
        L.push('');

        L.push('G00 X#1 Y#2');
        L.push('G00 Z2');
        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('G01 X[#1+#8] F' + num(p.f * 0.6));
        L.push('#9=0            (当前 Z)');
        L.push('#20=0');
        L.push('WHILE [#20 LT #10] DO 1');
        L.push('  ' + g + ' X[#1+#8] Y#2 I-[#8] J0 F' + num(p.f) + '    (整圆, Z 不变)');
        L.push('  #9=#9-#4');
        L.push('  G01 X[#1+#8] Z#9 F' + num(p.f * 1.5) + '   (下降一个螺距)');
        L.push('  G01 X[#1+#8] Y#2 F' + num(p.f));
        L.push('  #20=#20+1');
        L.push('END 1');
        L.push('');
        L.push('G01 X#1 F' + num(p.f * 0.6));
        millEnd(L);
        return L.join('\n');
      }
    },

    threadG1: {
      kind: 'mill', g: 'thread', no: 'O0034',
      name: 'G1 铣螺纹',
      desc: '全部用直线段逼近螺旋线，一段一度一段地连：X/Y 按圆周走、Z 按角度比例下降。对没有任何螺旋插补功能的系统也成立，段数越多牙型越准，但程序会长、进给要降。',
      fields: [
        { k: 'x', label: '螺纹中心 X', def: 0, step: 0.1 },
        { k: 'y', label: '螺纹中心 Y', def: 0, step: 0.1 },
        { k: 'd', label: '螺纹大径', def: 30, step: 0.1, min: 1 },
        { k: 'p', label: '螺距', def: 2, step: 0.25, min: 0.25 },
        { k: 'l', label: '螺纹长度', def: 25, step: 0.5, min: 0.5 },
        { k: 'td', label: '铣刀直径', def: 16, step: 0.1, min: 1 },
        { k: 'a', label: '角度步距', def: 10, step: 1, min: 2, max: 45, tip: '每段圆弧角，10° 一档比较稳' },
        { k: 'dir', label: '旋向', type: 'select', def: 0, opts: [{ v: 0, t: '右旋 (角度递增)' }, { v: 1, t: '左旋 (角度递减)' }] },
        { k: 's', label: '转速 S', def: 2500, step: 100 },
        { k: 'f', label: '进给 F', def: 400, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.td >= p.d) return '铣刀直径必须小于螺纹大径';
        if (p.a <= 0) return '角度步距必须大于 0';
        return null;
      },
      gen: function (p) {
        var r = (p.d - p.td) / 2;
        var turns = Math.ceil(p.l / p.p);
        var right = !Number(p.dir);
        var L = [];
        pushHeader(L, 'O0034 (THREAD MILL G01)', 'THREAD MILL - LINEAR APPROX, NO HELICAL NEEDED');
        millHead(L, p);

        L.push(v('#1', num(p.x), '螺纹中心 X'));
        L.push(v('#2', num(p.y), '螺纹中心 Y'));
        L.push(v('#3', num(p.d), '螺纹大径'));
        L.push(v('#4', num(p.p, 4), '螺距'));
        L.push(v('#5', num(p.l), '螺纹长度'));
        L.push(v('#6', num(p.td), '铣刀直径'));
        L.push(v('#7', num(p.a, 2), '角度步距, 度'));
        L.push(v('#8', '[#3-#6]/2', '轨迹半径 ' + num(r)));
        L.push(v('#10', num(turns * 360, 1), '总回转角度 ' + turns * 360));
        L.push('');

        L.push('G00 X#1 Y#2');
        L.push('G00 Z2');
        L.push('G01 Z0 F' + num(p.f * 0.4));
        L.push('G01 X[#1+#8] F' + num(p.f * 0.6));
        L.push('#20=0           (回转角)');
        L.push('WHILE [' + (right ? '#20 LE #10' : '#20 GE 0') + '] DO 1');
        L.push('  #21=#1+#8*COS[#20]');
        L.push('  #22=#2+#8*SIN[#20]');
        L.push('  #23=-#20/360*#4');
        L.push('  G01 X#21 Y#22 Z#23 F' + num(p.f));
        if (right) L.push('  #20=#20+#7');
        else L.push('  #20=#20-#7');
        L.push('END 1');
        L.push('');
        L.push('G01 X#1 F' + num(p.f * 0.6));
        millEnd(L);
        return L.join('\n');
      }
    },

    /* ================================================================
     *  七、孔阵列与沉孔
     * ================================================================ */

    boltDrill: {
      kind: 'mill', g: 'pattern', no: 'O0035',
      name: '钻等分圆周孔',
      desc: '法兰、端盖上最常见的等分孔：角步距 = 360 ÷ 孔数，第 n 个孔的角度 = 起始角 + n × 步距，再用 COS/SIN 算出 XY 调 G81。改孔数不用改程序，只要改一个变量。',
      fields: [
        { k: 'x', label: '圆心 X', def: 0, step: 0.1 },
        { k: 'y', label: '圆心 Y', def: 0, step: 0.1 },
        { k: 'r', label: '分布半径', def: 60, step: 0.1, min: 0.1 },
        { k: 'n', label: '孔数', def: 8, step: 1, min: 1 },
        { k: 'a', label: '起始角', def: 0, step: 1, tip: '度，0° 在 X+ 方向，逆时针为正' },
        { k: 'z', label: '孔深', def: 25, step: 0.1, min: 0.1, tip: '填正数，程序自动取负' },
        { k: 'rr', label: 'R 平面', def: 2, step: 0.1, min: 0 },
        { k: 's', label: '转速 S', def: 1200, step: 50 },
        { k: 'f', label: '进给 F', def: 150, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.n < 1 || p.n !== Math.floor(p.n)) return '孔数必须是大于 0 的整数';
        if (p.r <= 0) return '分布半径必须大于 0';
        return null;
      },
      gen: function (p) {
        var z = -Math.abs(p.z);
        var L = [];
        pushHeader(L, 'O0035 (BOLT CIRCLE DRILL)', 'BOLT CIRCLE DRILL - G81');
        millHead(L, p);

        L.push(v('#1', num(p.x), '圆心 X'));
        L.push(v('#2', num(p.y), '圆心 Y'));
        L.push(v('#3', num(p.r), '分布半径'));
        L.push(v('#4', p.n, '孔数'));
        L.push(v('#5', num(p.a, 2), '起始角, 度'));
        L.push(v('#6', num(z), '孔深, 负值'));
        L.push(v('#7', num(p.rr), 'R 平面'));
        L.push('');

        L.push('#10=0           (孔计数)');
        L.push('#11=360/#4      (角步距 ' + num(360 / p.n, 3) + ' 度)');
        L.push('');
        L.push('WHILE [#10 LT #4] DO 1');
        L.push('  #12=#5+#10*#11          (当前角)');
        L.push('  #13=#1+#3*COS[#12]      (孔位 X)');
        L.push('  #14=#2+#3*SIN[#12]      (孔位 Y)');
        L.push('  G00 X#13 Y#14');
        L.push('  G81 Z#6 R#7 F' + p.f);
        L.push('  #10=#10+1');
        L.push('END 1');
        L.push('');
        L.push('G80');
        millEnd(L);
        return L.join('\n');
      }
    },

    boltMulti: {
      kind: 'mill', g: 'pattern', no: 'O0036',
      name: '圆周等距钻孔',
      desc: '多圈圆周孔（同心圆分布）：内圈半径打底，每往外一圈半径加一个增量，每圈都按孔数等分。大型法兰、回转支承、多排螺栓孔一次跑完，圈数和孔数都只是变量。',
      fields: [
        { k: 'x', label: '圆心 X', def: 0, step: 0.1 },
        { k: 'y', label: '圆心 Y', def: 0, step: 0.1 },
        { k: 'r0', label: '起始半径', def: 40, step: 0.1, min: 0.1 },
        { k: 'ring', label: '圈数', def: 2, step: 1, min: 1 },
        { k: 'dr', label: '半径增量', def: 25, step: 0.1, min: 0.1, tip: '每往外一圈半径加多少' },
        { k: 'n', label: '每圈孔数', def: 8, step: 1, min: 1 },
        { k: 'a', label: '起始角', def: 0, step: 1 },
        { k: 'z', label: '孔深', def: 20, step: 0.1, min: 0.1 },
        { k: 'rr', label: 'R 平面', def: 2, step: 0.1, min: 0 },
        { k: 's', label: '转速 S', def: 1200, step: 50 },
        { k: 'f', label: '进给 F', def: 150, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.n < 1) return '每圈孔数至少为 1';
        if (p.ring < 1) return '圈数至少为 1';
        if (p.dr <= 0) return '半径增量必须大于 0';
        return null;
      },
      gen: function (p) {
        var z = -Math.abs(p.z);
        var L = [];
        pushHeader(L, 'O0036 (MULTI-RING DRILL)', 'MULTI RING DRILL - EQUAL SPACING PER RING');
        millHead(L, p);

        L.push(v('#1', num(p.x), '圆心 X'));
        L.push(v('#2', num(p.y), '圆心 Y'));
        L.push(v('#3', num(p.r0), '起始半径'));
        L.push(v('#4', p.ring, '圈数'));
        L.push(v('#5', num(p.dr), '每圈半径增量'));
        L.push(v('#6', p.n, '每圈孔数'));
        L.push(v('#7', num(p.a, 2), '起始角, 度'));
        L.push(v('#8', num(z), '孔深, 负值'));
        L.push(v('#9', num(p.rr), 'R 平面'));
        L.push('');

        L.push('#20=0           (第几圈)');
        L.push('WHILE [#20 LT #4] DO 1');
        L.push('  #21=#3+#20*#5           (本圈半径)');
        L.push('  #22=0                   (本圈第几个孔)');
        L.push('  WHILE [#22 LT #6] DO 2');
        L.push('    #23=#7+#22*360/#6');
        L.push('    G00 X[#1+#21*COS[#23]] Y[#2+#21*SIN[#23]]');
        L.push('    G81 Z#8 R#9 F' + p.f);
        L.push('    #22=#22+1');
        L.push('  END 2');
        L.push('  #20=#20+1');
        L.push('END 1');
        L.push('');
        L.push('G80');
        millEnd(L);
        return L.join('\n');
      }
    },

    gridDrill: {
      kind: 'mill', g: 'pattern', no: 'O0037',
      name: '矩形阵列钻孔',
      desc: '行列阵列：给起点、行数、列数、行距、列距，双层循环一行一行往外铺。模板、盖板、散热孔一次跑完，行列数改了也不用重编。',
      fields: [
        { k: 'x', label: '起点 X', def: 0, step: 0.1, tip: '左下角第一个孔' },
        { k: 'y', label: '起点 Y', def: 0, step: 0.1 },
        { k: 'row', label: '行数 (Y)', def: 4, step: 1, min: 1 },
        { k: 'col', label: '列数 (X)', def: 5, step: 1, min: 1 },
        { k: 'dy', label: '行距', def: 30, step: 0.1, min: 0.1 },
        { k: 'dx', label: '列距', def: 30, step: 0.1, min: 0.1 },
        { k: 'z', label: '孔深', def: 15, step: 0.1, min: 0.1 },
        { k: 'rr', label: 'R 平面', def: 2, step: 0.1, min: 0 },
        { k: 's', label: '转速 S', def: 1200, step: 50 },
        { k: 'f', label: '进给 F', def: 150, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.row < 1 || p.col < 1) return '行数和列数都至少为 1';
        return null;
      },
      gen: function (p) {
        var z = -Math.abs(p.z);
        var L = [];
        pushHeader(L, 'O0037 (RECT GRID DRILL)', 'RECT GRID DRILL - G81');
        millHead(L, p);

        L.push(v('#1', num(p.x), '起点 X'));
        L.push(v('#2', num(p.y), '起点 Y'));
        L.push(v('#3', p.row, '行数, Y 向'));
        L.push(v('#4', p.col, '列数, X 向'));
        L.push(v('#5', num(p.dy), '行距'));
        L.push(v('#6', num(p.dx), '列距'));
        L.push(v('#7', num(z), '孔深, 负值'));
        L.push(v('#8', num(p.rr), 'R 平面'));
        L.push('');

        L.push('#20=0           (行)');
        L.push('WHILE [#20 LT #3] DO 1');
        L.push('  #21=0                   (列)');
        L.push('  WHILE [#21 LT #4] DO 2');
        L.push('    G00 X[#1+#21*#6] Y[#2+#20*#5]');
        L.push('    G81 Z#7 R#8 F' + p.f);
        L.push('    #21=#21+1');
        L.push('  END 2');
        L.push('  #20=#20+1');
        L.push('END 1');
        L.push('');
        L.push('G80');
        millEnd(L);
        return L.join('\n');
      }
    },

    boltMill: {
      kind: 'mill', g: 'pattern', no: 'O0038',
      name: '铣等分圆周孔',
      desc: '圆周上均布的大孔用铣刀一个个螺旋铣出来：外层循环算孔位角度，内层在孔位螺旋下刀铣圆。孔径大、钻头买不到或者不想买的时候就用这个，一个刀干完一整圈。',
      fields: [
        { k: 'x', label: '圆心 X', def: 0, step: 0.1 },
        { k: 'y', label: '圆心 Y', def: 0, step: 0.1 },
        { k: 'rc', label: '分布半径', def: 60, step: 0.1, min: 0.1 },
        { k: 'n', label: '孔数', def: 6, step: 1, min: 1 },
        { k: 'a', label: '起始角', def: 0, step: 1 },
        { k: 'hd', label: '孔径', def: 20, step: 0.1, min: 1 },
        { k: 'z', label: '孔深', def: 15, step: 0.1, min: 0.1 },
        { k: 'td', label: '刀具直径', def: 10, step: 0.1, min: 1 },
        { k: 'q', label: '每圈下刀', def: 2, step: 0.1, min: 0.05 },
        { k: 's', label: '转速 S', def: 1800, step: 50 },
        { k: 'f', label: '进给 F', def: 600, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        var r = (p.hd - p.td) / 2;
        if (r <= 0) return '刀具太大：孔径 ' + num(p.hd) + ' 减刀径 ' + num(p.td) + ' 后无法铣';
        if (p.n < 1) return '孔数至少为 1';
        return null;
      },
      gen: function (p) {
        var r = (p.hd - p.td) / 2;
        var z = -Math.abs(p.z);
        var L = [];
        pushHeader(L, 'O0038 (BOLT HOLE MILL)', 'BOLT HOLE MILL - HELICAL PER HOLE');
        millHead(L, p);

        L.push(v('#1', num(p.x), '分布圆心 X'));
        L.push(v('#2', num(p.y), '分布圆心 Y'));
        L.push(v('#3', num(p.rc), '分布半径'));
        L.push(v('#4', p.n, '孔数'));
        L.push(v('#5', num(p.a, 2), '起始角, 度'));
        L.push(v('#6', num(p.hd), '孔径'));
        L.push(v('#7', num(z), '孔深, 负值'));
        L.push(v('#8', num(p.td), '刀具直径'));
        L.push(v('#9', num(p.q), '每圈下刀'));
        L.push(v('#11', '[#6-#8]/2', '单孔轨迹半径 ' + num(r)));
        L.push('');

        L.push('#20=0           (第几个孔)');
        L.push('WHILE [#20 LT #4] DO 1');
        L.push('  #21=#5+#20*360/#4        (本孔角度)');
        L.push('  #22=#1+#3*COS[#21]       (孔心 X)');
        L.push('  #23=#2+#3*SIN[#21]       (孔心 Y)');
        L.push('  G00 X#22 Y#23');
        L.push('  G00 Z2');
        L.push('  G01 Z0 F' + num(p.f * 0.4));
        L.push('  G01 X[#22+#11] F' + num(p.f));
        L.push('  #24=0');
        L.push('  WHILE [#24 GT #7] DO 2');
        L.push('    #24=#24-#9');
        L.push('    IF [#24 LT #7] THEN #24=#7');
        L.push('    G02 X[#22+#11] Y#23 Z#24 I-[#11] J0 F' + num(p.f));
        L.push('  END 2');
        L.push('  G02 X[#22+#11] Y#23 I-[#11] J0 F' + num(p.f * 0.8) + '   (孔底光整)');
        L.push('  G00 Z50');
        L.push('  #20=#20+1');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    csk: {
      kind: 'mill', g: 'pattern', no: 'O0039',
      name: '圆周沉头孔',
      desc: '先钻底孔、再铣沉头锥面：锥面按等高分层，每下降一层半径加一点点，最后一层到沉头大径。锥角按图纸（90° 或 82°），沉头深度 =（大径 − 底孔径）/ 2 ÷ tan(锥角/2)，程序自动算。',
      fields: [
        { k: 'x', label: '圆心 X', def: 0, step: 0.1 },
        { k: 'y', label: '圆心 Y', def: 0, step: 0.1 },
        { k: 'rc', label: '分布半径', def: 60, step: 0.1, min: 0 },
        { k: 'n', label: '孔数', def: 6, step: 1, min: 1 },
        { k: 'a', label: '起始角', def: 0, step: 1 },
        { k: 'd1', label: '沉头大径', def: 20, step: 0.1, min: 1 },
        { k: 'd0', label: '底孔直径', def: 11, step: 0.1, min: 0.5 },
        { k: 'ang', label: '锥角', def: 90, step: 1, min: 30, max: 160, tip: '90° 最常见，内六角螺钉 82°' },
        { k: 'th', label: '底孔深度', def: 20, step: 0.1, min: 0.1 },
        { k: 'td', label: '铣刀直径', def: 8, step: 0.1, min: 1 },
        { k: 'q', label: '锥面层深', def: 0.5, step: 0.1, min: 0.1 },
        { k: 's', label: '转速 S', def: 2500, step: 100 },
        { k: 'f', label: '进给 F', def: 400, step: 10 },
        { k: 'h', label: '刀补号 H', def: 1, step: 1, min: 1 }
      ],
      check: function (p) {
        if (p.d0 >= p.d1) return '底孔直径必须小于沉头大径';
        if (p.td >= p.d0) return '铣刀直径（' + num(p.td) + '）必须小于底孔径（' + num(p.d0) + '），否则进不去';
        return null;
      },
      gen: function (p) {
        var hd = (p.d1 - p.d0) / 2 / Math.tan(p.ang / 2 * Math.PI / 180);
        var z = -Math.abs(p.th);
        var L = [];
        pushHeader(L, 'O0039 (COUNTERSINK HOLES)', 'COUNTERSINK - PILOT DRILL THEN CONE MILL');
        millHead(L, p);

        L.push(v('#1', num(p.x), '分布圆心 X'));
        L.push(v('#2', num(p.y), '分布圆心 Y'));
        L.push(v('#3', num(p.rc), '分布半径'));
        L.push(v('#4', p.n, '孔数'));
        L.push(v('#5', num(p.a, 2), '起始角, 度'));
        L.push(v('#6', num(p.d1), '沉头大径'));
        L.push(v('#7', num(p.d0), '底孔直径'));
        L.push(v('#8', num(hd, 4), '沉头深度 ' + num(hd)));
        L.push(v('#9', num(z), '底孔深度, 负值'));
        L.push(v('#10', num(p.td), '铣刀直径'));
        L.push(v('#11', num(p.q), '锥面层深'));
        L.push('');

        L.push('#20=0           (第几个孔)');
        L.push('WHILE [#20 LT #4] DO 1');
        L.push('  #21=#5+#20*360/#4');
        L.push('  #22=#1+#3*COS[#21]       (孔心 X)');
        L.push('  #23=#2+#3*SIN[#21]       (孔心 Y)');
        L.push('  (1. 钻底孔)');
        L.push('  G00 X#22 Y#23');
        L.push('  G83 Z#9 R2 Q3 F' + p.f);
        L.push('  G80');
        L.push('  (2. 铣沉头锥面)');
        L.push('  #24=0                   (当前 Z)');
        L.push('  WHILE [#24 GT -#8] DO 2');
        L.push('    #24=#24-#11');
        L.push('    IF [#24 LT -#8] THEN #24=-#8');
        L.push('    #25=[#7/2]+[[#6-#7]/2]*[-#24/#8]-#10/2   (本层轨迹半径)');
        L.push('    G00 Z2                    (先抬到孔口以上)');
        L.push('    G00 X#22 Y#23             (回孔心)');
        L.push('    G01 Z#24 F' + num(p.f * 0.4) + '       (下到本层)');
        L.push('    G01 X[#22+#25] F' + num(p.f) + '     (径向进到锥面)');
        L.push('    G02 I-[#25] J0');
        L.push('  END 2');
        L.push('  #20=#20+1');
        L.push('END 1');
        millEnd(L);
        return L.join('\n');
      }
    },

    /* ================================================================
     *  八、车床
     * ================================================================ */

    turn: {
      kind: 'lathe', g: 'lathe', no: 'O0040',
      name: '外圆粗车 (G71)',
      desc: '标准 G71 两段式：先给轮廓，再让系统自动分层。改了毛坯和成品直径，轮廓段和切削参数一起跟着变。P 段（N100）只能有 X 向移动，Z 要从下一段开始，否则系统报警。',
      fields: [
        { k: 'd1', label: '毛坯直径', def: 50, step: 0.5, min: 1 },
        { k: 'd2', label: '成品直径', def: 40, step: 0.5, min: 1 },
        { k: 'l', label: '加工长度', def: 100, step: 0.5, min: 1, tip: 'Z 从端面 0 起算' },
        { k: 'q', label: '每刀切深', def: 2, step: 0.1, min: 0.1, tip: '半径值，G71 的 U' },
        { k: 'ux', label: 'X 精车余量', def: 0.5, step: 0.1, min: 0, tip: '直径值' },
        { k: 'wz', label: 'Z 精车余量', def: 0.1, step: 0.05, min: 0 },
        { k: 's', label: '转速 S', def: 800, step: 50 },
        { k: 'f', label: '粗车进给', def: 0.25, step: 0.05, min: 0.01 }
      ],
      check: function (p) {
        if (p.d2 >= p.d1) return '成品直径必须小于毛坯直径';
        return null;
      },
      gen: function (p) {
        var L = [];
        pushHeader(L, 'O0040 (OD ROUGH TURNING G71)', 'OD ROUGH TURNING - G71');

        L.push('G99 G97 G40 G21');
        L.push('T0101');
        L.push('S' + p.s + ' M03');
        L.push('G00 X' + num(p.d1 + 4) + ' Z2');
        L.push('');
        L.push(v('#1', num(p.d1), '毛坯直径'));
        L.push(v('#2', num(p.d2), '成品直径'));
        L.push(v('#3', num(p.l), '加工长度'));
        L.push(v('#4', num(p.q), '每刀切深, 半径'));
        L.push(v('#5', num(p.ux), 'X 精车余量, 直径'));
        L.push(v('#6', num(p.wz), 'Z 精车余量'));
        L.push('');
        L.push('G71 U#4 R0.5');
        L.push('G71 P100 Q110 U#5 W#6 F' + num(p.f, 2));
        L.push('');
        L.push('N100 G00 X#2');
        L.push('G01 Z0 F' + num(p.f * 0.6, 2));
        L.push('G01 Z-[#3]');
        L.push('N110 G01 X[#1+2]');
        L.push('');
        L.push('G70 P100 Q110');
        L.push('G00 X[#1+4] Z100');
        L.push('M05');
        L.push('M30');
        return L.join('\n');
      }
    },

    groove: {
      kind: 'lathe', g: 'lathe', no: 'O0041',
      name: '外圆切槽',
      desc: '按刀宽逐刀平移，每一刀切到槽底再抬刀。槽宽不是刀宽整数倍时，最后一刀会自动贴到槽的另一侧。抬刀高度要大于工件外径，否则回程会撞。',
      fields: [
        { k: 'd', label: '外径', def: 50, step: 0.5, min: 1 },
        { k: 'z0', label: '槽起点 Z', def: -30, step: 0.5, tip: '槽靠近卡盘那一侧的 Z 坐标' },
        { k: 'wd', label: '槽宽', def: 5, step: 0.1, min: 0.1 },
        { k: 'dp', label: '槽深', def: 3, step: 0.1, min: 0.1, tip: '单边深度' },
        { k: 'bw', label: '刀宽', def: 3, step: 0.1, min: 0.1 },
        { k: 's', label: '转速 S', def: 500, step: 50 },
        { k: 'f', label: '进给 F', def: 0.08, step: 0.01, min: 0.01 }
      ],
      check: function (p) {
        if (p.bw > p.wd) return '刀宽不能大于槽宽';
        if (p.dp >= p.d / 2) return '槽深不能大于等于半径';
        return null;
      },
      gen: function (p) {
        var bottom = p.d - 2 * p.dp;
        var last = p.z0 - (p.wd - p.bw);
        var L = [];
        pushHeader(L, 'O0041 (OD GROOVING)', 'OD GROOVING - PLUNGE CUT');

        L.push('G99 G97 G40 G21');
        L.push('T0202');
        L.push('S' + p.s + ' M03');
        L.push('G00 X' + num(p.d + 2) + ' Z' + num(p.z0 + 2));
        L.push('');
        L.push(v('#1', num(p.d), '外径'));
        L.push(v('#2', num(p.z0), '槽起点 Z'));
        L.push(v('#3', num(p.wd), '槽宽'));
        L.push(v('#4', num(p.dp), '槽深, 单边'));
        L.push(v('#5', num(p.bw), '刀宽'));
        L.push(v('#6', num(bottom), '槽底直径'));
        L.push('');
        L.push('#10=0           (当前 Z 偏移)');
        L.push('WHILE [#10 LE [#3-#5]+0.001] DO 1');
        L.push('  G00 Z[#2-#10]');
        L.push('  G01 X#6 F' + num(p.f, 2));
        L.push('  G00 X[#1+1]');
        L.push('  #10=#10+#5');
        L.push('END 1');
        L.push('');
        L.push('G00 Z' + num(last) + '         (收尾贴到槽的另一侧)');
        L.push('G01 X#6 F' + num(p.f, 2));
        L.push('G00 X[#1+1]');
        L.push('G00 Z' + num(p.z0));
        L.push('G00 X[#1+4] Z100');
        L.push('M05');
        L.push('M30');
        return L.join('\n');
      }
    },

    thread: {
      kind: 'lathe', g: 'lathe', no: 'O0042',
      name: '车螺纹 (G76)',
      desc: '按 60° 公制螺纹算：小径 = 大径 − 1.0825P，牙高 = 0.6495P。G76 的 P/Q 单位是微米，程序里已经换算好。55° 英制、管螺纹系数不同，别混用。',
      fields: [
        { k: 'd', label: '螺纹大径', def: 30, step: 0.5, min: 1 },
        { k: 'p', label: '螺距', def: 2, step: 0.25, min: 0.25 },
        { k: 'l', label: '螺纹长度', def: 40, step: 0.5, min: 1 },
        { k: 's', label: '转速 S', def: 600, step: 50 },
        { k: 'q', label: '第一刀切深', def: 0.3, step: 0.05, min: 0.05, tip: 'mm，程序换算成微米' },
        { k: 'rp', label: '精车次数', def: 2, step: 1, min: 1, tip: 'G76 第一行的 P 前两位' }
      ],
      check: function (p) {
        if (p.p <= 0) return '螺距必须大于 0';
        return null;
      },
      gen: function (p) {
        var h = 0.6495 * p.p;
        var minor = p.d - 2 * h;
        var deg = String(p.rp).padStart(2, '0');
        var L = [];
        pushHeader(L, 'O0042 (THREADING G76)', 'OD THREADING - G76, 60 DEG METRIC');

        L.push('G99 G97 G40 G21');
        L.push('T0303');
        L.push('S' + p.s + ' M03');
        L.push('G00 X' + num(p.d + 5) + ' Z5');
        L.push('');
        L.push(v('#1', num(p.d), '螺纹大径'));
        L.push(v('#2', num(p.p, 3), '螺距'));
        L.push(v('#3', num(p.l), '螺纹长度'));
        L.push(v('#4', num(h, 4), '牙高, 单边 = 0.6495P'));
        L.push(v('#5', num(minor, 4), '小径 = 大径 - 2×牙高'));
        L.push('');
        L.push('G76 P' + deg + '0060 Q' + Math.round(p.q * 1000) + ' R0.05');
        L.push('G76 X#5 Z-[#3] P' + Math.round(h * 1000) + ' Q' + Math.round(p.q * 1000) + ' F#2');
        L.push('');
        L.push('G00 X' + num(p.d + 5) + ' Z100');
        L.push('M05');
        L.push('M30');
        return L.join('\n');
      }
    }
  };

  /* 所有模板的 gen 统一过一遍翻译，导出即英文注释 */
  Object.keys(TPL).forEach(function (k) {
    var raw = TPL[k].gen;
    TPL[k].gen = function (p) { return trCode(raw(p)); };
  });

  if (typeof window !== 'undefined') window.MACRO_TPL = TPL;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TPL: TPL, num: num, v: v, pushHeader: pushHeader };
  }
})();
