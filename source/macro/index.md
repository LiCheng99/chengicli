---
title: 宏程序生成器
date: 2026-10-27 11:20:00
description: 宏程序生成器 —— 加工中心 39 个 + 车床 3 个常用宏程序在线生成，螺旋铣孔、内外圆、方腔、键槽、多边形、锥面、球面、螺纹铣、孔阵列，参数一改程序跟着变，NC 代码语法高亮可下载
comments: false
---

<link rel="stylesheet" href="/css/macro-gen.css?v=20261027h">

<div class="mg-app" id="mgApp">
  <div class="mg-head">
    <div class="mg-tabs" role="tablist">
      <button type="button" class="mg-tab is-on" data-kind="mill">加工中心</button>
      <button type="button" class="mg-tab" data-kind="lathe">车床</button>
    </div>
    <p class="mg-hint">加工中心 39 个模板、车床 3 个。选模板 → 填参数 → 下面实时出程序。全部是 Fanuc B 类宏程序，带着 <code>#</code> 变量，改一处整篇跟着变。</p>
  </div>

  <div class="mg-picker" id="mgPicker"></div>

  <div class="mg-body">
    <div class="mg-left">
      <div class="mg-form" id="mgForm"></div>
    </div>
    <div class="mg-right">
      <div class="mg-bar">
        <span class="mg-name" id="mgName">—</span>
        <div class="mg-acts">
          <button type="button" id="mgCopy">复制</button>
          <button type="button" id="mgDl">下载 .NC</button>
        </div>
      </div>
      <pre class="mg-code"><code id="mgCode"></code></pre>
      <p class="mg-desc" id="mgDesc"></p>
    </div>
  </div>
</div>

<div class="mg-doc">
  <h2>怎么用</h2>
  <ul>
    <li><b>先选机型</b>：加工中心走 X/Y/Z 三轴、调 G43 刀长补偿；车床走 X/Z、调 G99 每转进给。两套模板不通用。</li>
    <li><b>模板按类别分组</b>：孔系 / 平面 / 槽与型腔 / 轮廓 / 斜面曲面 / 螺纹 / 孔阵列。同一个形状往往有好几种走刀方式，看下面的对照表挑。</li>
    <li><b>参数一改右边立刻重算</b>，不用点生成按钮。程序里的 <code>#1 #2 #3…</code> 就是刚才填的数，每个变量后面的括号里是英文注释。</li>
    <li><b>参数明显不合理会直接拦下来</b>：比如刀比孔大、余量吃掉全部轨迹半径、槽宽小于刀径，右边会红字提示，不出程序，也不让复制。</li>
    <li>可以「复制」贴进记事本，或「下载 .NC」存成程序文件。文件名取程序号，例如 <code>O0001.NC</code>，程序号不冲突的话可以直接传机床。</li>
  </ul>

  <h2>同样的形状，用哪个模板</h2>
  <p>下面这些最容易选错，区别就在走刀策略，加工出来的表面质量和效率差得不少。</p>
  <table>
    <thead>
      <tr><th>要加工的东西</th><th>可选模板</th><th>怎么选</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>圆孔 / 圆腔</td>
        <td>内孔螺旋铣、内孔铣、螺旋铣孔</td>
        <td><b>螺旋铣</b>是连续螺旋下刀，一圈一层，没有接刀痕，最常用；<b>内孔铣</b>是每层走一整圆再下降，负载轻、老系统也能跑；<b>螺旋铣孔</b>要事先有底孔，从孔底往上扩，铁屑往下掉，适合大通孔</td>
      </tr>
      <tr>
        <td>圆形凸台 / 外圆</td>
        <td>外径螺旋铣、外径铣</td>
        <td>跟上面同理，一个连续螺旋下行、一个分层整圆。余量填正数就留量</td>
      </tr>
      <tr>
        <td>矩形区域</td>
        <td>矩形平面铣、螺旋铣矩形、飞平面</td>
        <td><b>矩形平面铣</b>往复光栅，来回都切，效率最高；<b>螺旋铣矩形</b>由内向外一环一环扩，空行程少；<b>飞平面</b>单向顺铣、抬刀返回，纹路一致，大件面常用</td>
      </tr>
      <tr>
        <td>圆域平面</td>
        <td>圆形平面铣、螺旋铣平面</td>
        <td>同心整圆一圈圈往外扩，或者阿基米德螺线一路转出去。后者没有换向停顿，精铣、高速铣更顺</td>
      </tr>
      <tr>
        <td>键槽 / 直槽</td>
        <td>铣键槽、螺旋铣键槽</td>
        <td>槽宽分刀自动算。<b>螺旋铣键槽</b>是斜着螺旋下刀，硬料、深槽不顶刀，比垂直扎下去安全</td>
      </tr>
      <tr>
        <td>多边形 / 异形</td>
        <td>铣多边形、外六方铣削、任意多边形、轮廓铣</td>
        <td>正多边形和六方只要给「对边宽 + 边数」；点表类的按图纸填 <code>#100 / #200</code> 起的坐标，<b>轮廓铣</b>还能选 G41 铣凸台或 G42 铣内腔</td>
      </tr>
      <tr>
        <td>螺纹</td>
        <td>内螺纹铣、G2G3 铣螺纹、G1 铣螺纹</td>
        <td><b>内螺纹铣</b>用螺旋插补，一圈升一个螺距，程序最短；<b>G2G3</b> 每圈一个整圆、圈末降一个螺距，不需要螺旋插补；<b>G1</b> 全靠小直线逼近，最老的系统也能跑</td>
      </tr>
      <tr>
        <td>孔阵列</td>
        <td>钻等分圆周孔、圆周等距钻孔、矩形阵列钻孔、铣等分圆周孔、圆周沉头孔</td>
        <td>钻孔用 G81/G83 固定循环；孔太大没钻头就用<b>铣等分圆周孔</b>，一圈孔位螺旋铣出来；<b>圆周沉头孔</b>是钻底孔 + 铣锥面两件事一起做</td>
      </tr>
    </tbody>
  </table>

  <h2>几个通用约定</h2>
  <ul>
    <li><b>深度都填正数</b>，程序内部自动取负（<code>#4=-20.</code>）。填了负号也只会更负，别重复加。</li>
    <li><b>内孔顺铣走 G02、外圆顺铣走 G03</b>。要改成逆铣，把程序里所有 G02 和 G03 对调就行，粗加工时逆铣刀具寿命通常更长。</li>
    <li><b>刀补号</b>：带 <code>D</code> 的模板走 G41/G42 半径补偿，程序按图纸轮廓编程，机床刀补表里的 D 值必须等于<b>实际刀半径</b>；带 <code>H</code> 的只是刀长补偿。</li>
    <li><b>注释全是英文</b>：Fanuc 面板显示不了中文，所以导出的程序里括号注释一律是英文（如 <code>(HOLE DIA)</code>、<code>(DEPTH, NEGATIVE)</code>），整份文件纯 ASCII，老系统也不会乱码。</li>
    <li><b>程序号从 O0001 连续排到 O0042</b>：加工中心 O0001–O0039，车床 O0040–O0042。跟机床里已有程序撞号的话，存之前改掉第一行和文件名。</li>
    <li><b>球面、心形线、天圆地方</b>这类曲面是按等高分层做的，层距填小一点表面才光，程序也会变长。</li>
  </ul>

  <h2>上机床之前</h2>
  <ul>
    <li><b>先空运行</b>。所有程序默认 <code>G54</code>、<code>G90</code> 绝对坐标、刀补 H1，跟你实际用的坐标系和刀号不一定一致，改开头那几行。</li>
    <li><b>验证宏变量</b>：分步执行时按 <code>SETTING → 宏变量</code>，能看到 <code>#1 #2 #3…</code> 的实时值。算错了这一步最明显。</li>
    <li><b>球面模板的 Z0 在球心</b>，天圆地方的 Z0 在底面方形的平面，斜面模板的 Z0 在斜面起点——换模板先确认基准，别沿用上一个程序的原点。</li>
    <li><b>G71 / G76 的格式跟系统版本有关</b>。<code>G71 U… R…</code> 两行式是 Fanuc 0i / 31i 的写法，老的 0T / 0M 是单行 <code>G71 P Q U W D F</code>，要自己换。</li>
    <li><b>转速和进给只是起点</b>。铝、45 钢、不锈钢差得远，按材料、刀具和机床刚性自己调，这里的数只保证能算通。</li>
  </ul>

  <p class="mg-disclaimer">生成结果用于参考和二次修改，正式加工前请务必空运行并核对坐标、刀号、刀补与安全高度。参数算错撞刀的损失，这里不负责。</p>
</div>

<noscript>
  <p style="color:#d9534f">这个页面要靠 JavaScript 计算程序，请在浏览器里允许本页面运行脚本。</p>
</noscript>

<!-- 不加 defer：保证 tpls 一定在 gen 之前执行；版本号一改，浏览器缓存自动失效 -->
<script data-pjax src="/js/macro-tpls.js?v=20261027g"></script>
<script data-pjax src="/js/macro-gen.js?v=20261027g"></script>
