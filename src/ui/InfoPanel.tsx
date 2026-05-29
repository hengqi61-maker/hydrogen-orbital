import type { OrbitalData, QuantumState } from "../physics/HydrogenTypes";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  inputState: QuantumState;
  displayedData: OrbitalData | null;
  error: string | null;
}

export function InfoPanel({
  collapsed,
  onToggle,
  inputState,
  displayedData,
  error,
}: Props) {
  return (
    <aside className={`info-panel ${collapsed ? "collapsed" : ""}`}>
      <button type="button" onClick={onToggle}>
        {collapsed ? "Show Info" : "Hide Info"}
      </button>

      {!collapsed && (
        <>
          <h2>Hydrogen Orbital</h2>

          <section>
            <h3>Input state</h3>
            <p>n = {inputState.n}</p>
            <p>l = {inputState.l}</p>
            <p>m = {inputState.m}</p>
          </section>

          {error && (
            <section className="error">
              <h3>Invalid quantum numbers</h3>
              <p>{error}</p>
              <p>合法条件：n &gt;= 1，0 &lt;= l &lt; n，-l &lt;= m &lt;= l。</p>
            </section>
          )}

          {displayedData && (
            <section>
              <h3>Displayed state</h3>
              <p>n = {displayedData.state.n}</p>
              <p>l = {displayedData.state.l}</p>
              <p>m = {displayedData.state.m}</p>
              <p>轨道名称：{displayedData.name}</p>
              <p>能级关系：{displayedData.energyText}</p>
              <p>径向节点数：{displayedData.radialNodes}</p>
              <p>角向节点数：{displayedData.angularNodes}</p>
              <p>径向概率峰值 r_peak ≈ {displayedData.rPeak.toFixed(3)} a0</p>
              <p>
                归一化检查：integral r²|R|²dr ≈{" "}
                {displayedData.normalization.toFixed(4)}
              </p>
            </section>
          )}

          <section className="note">
            电子云表示 |ψ|² 概率密度，不是电子的经典运动轨迹。
          </section>
        </>
      )}
    </aside>
  );
}
