---
marp: true
theme: quantum-keynote
paginate: true
math: katex
html: true
size: 16:9
title: 一维薛定谔方程的差分矩阵与误差分析
description: 三页 Marp 数值方法试制
---

<link rel="stylesheet" href="../assets/katex-local.css">

<div class="kicker">FINITE DIFFERENCE · DISCRETIZATION</div>

# 空间离散后，薛定谔方程成为 **100×100** 矩阵本征值问题。

<div class="grid-2 derive-grid">
<div>

<div class="section-label">01 · 连续问题与边界</div>

<div class="math-block">

$$
-\frac{\hbar^2}{2m}\frac{\mathrm d^2\psi}{\mathrm dx^2}
+V(x)\psi=E\psi,\qquad \hbar=m=1
$$

$$
\psi(0)=\psi(L)=0,\quad
x_i=i\Delta x,\quad
\Delta x=\frac{L}{N+1}=\frac{1}{101}
$$

</div>

<div class="section-label">02 · 中心差分</div>

<div class="math-block compact">

$$
\left.\frac{\mathrm d^2\psi}{\mathrm dx^2}\right|_{x_i}
\approx
\frac{\psi_{i+1}-2\psi_i+\psi_{i-1}}{\Delta x^2}
$$

$$
-\frac{\psi_{i-1}}{2\Delta x^2}
+\left(\frac{1}{\Delta x^2}+V_i\right)\psi_i
-\frac{\psi_{i+1}}{2\Delta x^2}
=E\psi_i
$$

</div>

<div class="rule"></div>
<p class="note">每个网格点只与左右相邻点耦合，因此矩阵天然是三对角结构。</p>

</div>
<div class="matrix-panel">

<div class="section-label">03 · HAMILTONIAN MATRIX</div>
<p><strong>无限深势阱内部</strong>　$V_i=0$</p>

<div class="metric-row">
  <div class="metric"><span>主对角元</span><strong>$1/\Delta x^2=10201$</strong></div>
  <div class="metric orange"><span>相邻对角元</span><strong>$-1/(2\Delta x^2)=-5100.5$</strong></div>
</div>

<div class="math-block">

$$
H=
\begin{bmatrix}
10201 & -5100.5 & 0 & \cdots & 0\\
-5100.5 & 10201 & -5100.5 & \cdots & 0\\
0 & -5100.5 & 10201 & \ddots & \vdots\\
\vdots & \vdots & \ddots & \ddots & -5100.5\\
0 & 0 & \cdots & -5100.5 & 10201
\end{bmatrix}
$$

</div>

<div class="equation-caption">
  <div class="math-block">$$H\boldsymbol{\psi}=E\boldsymbol{\psi}$$</div>
  <div><strong>本征值 $E$：允许能量</strong><br><span class="note">本征向量 $\boldsymbol{\psi}$：离散波函数</span></div>
</div>

</div>
</div>

<!--
讲解顺序：先说明 N=100 指 100 个内部未知点，所以 Δx=1/101；再从中心差分落到单点离散方程。最后指出每一行只有三个非零系数，因此形成三对角矩阵。差分法把允许能量变成矩阵本征值，把波函数变成矩阵本征向量。
-->

---

<div class="kicker">EIGENVALUE VALIDATION</div>

# 没有代入解析能量公式，矩阵仍复现了最低五个能级。

<div class="grid-2 result-grid">
<div>

<div class="section-label">能量随量子数增长</div>
<div class="chart-card">
  <img src="../assets/energy-levels.svg" alt="无限深势阱前五个能级的差分解与解析解对比">
</div>
<p class="legend-note">两条曲线在能量尺度上几乎重合，但差分结果始终略低。</p>

</div>
<div>

<table class="result-table">
  <thead>
    <tr><th>$n$</th><th>差分解</th><th>解析解</th><th>相对误差</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>4.934404</td><td>4.934802</td><td>−0.00806%</td></tr>
    <tr><td>2</td><td>19.732844</td><td>19.739209</td><td>−0.03225%</td></tr>
    <tr><td>3</td><td>44.381001</td><td>44.413220</td><td>−0.07254%</td></tr>
    <tr><td>4</td><td>78.855032</td><td>78.956835</td><td>−0.12894%</td></tr>
    <tr><td>5</td><td>123.121584</td><td>123.370055</td><td>−0.20140%</td></tr>
  </tbody>
</table>

<div class="verify-formula">

$$E_n=\frac{n^2\pi^2}{2L^2}$$

<strong>解析公式只用于计算完成后的验证</strong>
</div>

<div class="code-strip">eigh_tridiagonal(..., select_range=(0, 4)) → 只求最低五个本征值</div>

</div>
</div>

<!--
这一页先强调数值求解没有使用解析能量公式。矩阵求解器只读取主对角和次对角数组，并返回最低五个本征值。解析公式在最后才用于核对。所有数值值略低于解析值，而且误差随 n 增大。
-->

---

<div class="kicker">ERROR & CONVERGENCE</div>

# 离散误差按 **$\Delta x^2$** 收敛，但高能级会放大误差。

<div class="grid-2 error-grid">
<div>

<div class="section-label">误差从哪里来？</div>
<p class="note">中心差分不等于真实二阶导数，而是泰勒展开的二阶近似：</p>

<div class="math-block compact">

$$
\frac{\psi_{i+1}-2\psi_i+\psi_{i-1}}{\Delta x^2}
=
\psi''(x_i)
+\frac{\Delta x^2}{12}\psi^{(4)}(x_i)
+O(\Delta x^4)
$$

</div>

<div class="error-card">
  <div class="error-order"><small>主误差阶</small><strong>$O(\Delta x^2)$</strong></div>
  <div class="error-chain">$N$ 近似加倍　→　$\Delta x$ 减半　→　误差约降为 $1/4$</div>
</div>

<div class="section-label">无限深势阱的离散能级</div>

<div class="math-block compact">

$$
E_n^{\mathrm{FD}}
=\frac{2}{\Delta x^2}
\sin^2\!\left(\frac{n\pi}{2(N+1)}\right)
$$

$$
\frac{E_n^{\mathrm{FD}}-E_n}{E_n}
\approx
-\frac{n^2\pi^2}{12L^2}\Delta x^2
$$

</div>

<div class="micro-conclusions">
  <span>负号：差分能量略低于解析值</span>
  <span>$n^2$：高能级误差更容易放大</span>
</div>

</div>
<div>

<div class="chart-title">真实计算的双对数收敛图</div>
<img class="convergence-chart" src="../assets/convergence.svg" alt="n等于1和5时差分本征值误差随网格步长二阶收敛">

<div class="takeaway">
同一 $\Delta x$ 下，$n=5$ 的误差始终更大：高能级波函数振荡更快，有限网格更难准确描述其曲率。
</div>

</div>
</div>

<!--
中心差分的主误差来自 Δx² 项，所以网格加倍时误差大约下降到四分之一。右侧是 N=25、50、100、200、400 的真实结果。两条曲线都与二阶参考线平行；同时 n=5 始终高于 n=1，说明高能级振荡更快，对网格分辨率要求更高。
-->
