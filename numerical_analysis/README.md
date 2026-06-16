# 一维定态薛定谔方程数值验证

本目录独立验证课堂题目中的两类数值方法，采用自然单位
`hbar = m = 1`：

- 无限深势阱 `0 < x < 1`
  - 二阶中心差分，`N = 100` 个内部网格点
  - 打靶法 `solve_ivp + Brent`
  - 与解析解 `E_n = n^2 pi^2 / 2` 对比
- 一维谐振子 `V(x) = x^2 / 2`，区域 `[-5, 5]`
  - 二阶中心差分，`N = 100` 个内部网格点
  - 基于偶宇称的打靶法
  - 与解析基态能量 `E_0 = 0.5` 对比

## 运行

```bash
python3 numerical_analysis/solve_schrodinger.py
```

程序会在 `numerical_analysis/results/` 中生成：

- `energy_comparison.csv`：能量、绝对误差和相对误差
- `summary.json`：便于后续网页或 PPT 读取的结构化结果
- `infinite_well_comparison.png`：势阱能级和波函数对比
- `harmonic_oscillator_comparison.png`：谐振子基态对比

## 数值定义

`N = 100` 表示 100 个内部未知点。边界 `psi(0) = psi(L) = 0`
不进入矩阵，因此步长为 `h = L / (N + 1)`，Hamiltonian 为
`100 x 100` 三对角矩阵。
