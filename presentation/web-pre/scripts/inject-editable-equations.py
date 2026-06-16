#!/usr/bin/env python3
"""Replace [[EQ:name]] markers with editable Office Math equations."""

from __future__ import annotations

import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

from latex2mathml.converter import convert as latex_to_mathml
from lxml import etree
from mathml2omml import convert as mathml_to_omml


EQUATIONS = {
    "schrodinger_1d": r"-\frac{1}{2}\frac{\mathrm{d}^2\psi}{\mathrm{d}x^2}+V(x)\psi=E\psi",
    "boundary_well": r"0<x<L,\quad \psi(0)=0,\quad \psi(L)=0",
    "grid_dx": r"x_i=i\Delta x,\quad i=1,\ldots,100,\quad \Delta x=\frac{L}{N+1}=\frac{1}{101}",
    "central_diff": r"\left.\frac{\mathrm{d}^2\psi}{\mathrm{d}x^2}\right|_{x_i}\approx\frac{\psi_{i+1}-2\psi_i+\psi_{i-1}}{\Delta x^2}",
    "discrete_eq": r"-\frac{\psi_{i-1}}{2\Delta x^2}+\left(\frac{1}{\Delta x^2}+V_i\right)\psi_i-\frac{\psi_{i+1}}{2\Delta x^2}=E\psi_i",
    "eigen_problem": r"H\psi=E\psi",
    "energy_well": r"E_n=\frac{n^2\pi^2}{2L^2}",
    "taylor_error": r"\frac{\psi_{i+1}-2\psi_i+\psi_{i-1}}{\Delta x^2}=\psi''(x_i)+\frac{\Delta x^2}{12}\psi^{(4)}(x_i)+O(\Delta x^4)",
    "fd_closed": r"E_n^{\mathrm{FD}}=\frac{2}{\Delta x^2}\sin^2\left(\frac{n\pi}{2(N+1)}\right)",
    "rel_error": r"\frac{E_n^{\mathrm{FD}}-E_n}{E_n}\approx-\frac{n^2\pi^2}{12L^2}\Delta x^2",
    "ode_second": r"-\frac{1}{2}\psi''(x)+V(x)\psi(x)=E\psi(x)",
    "ode_system": r"y_1' = y_2,\quad y_2'=2[V(x)-E]y_1",
    "initial_cond": r"\psi(0)=0,\quad \psi'(0)=1",
    "residual": r"F(E)=\psi_E(L),\quad F(E)=0",
    "shooting_energy": r"E_n=\frac{n^2\pi^2}{2}",
    "comparison_wave": r"E_n=\frac{n^2\pi^2}{2L^2},\quad \phi_n(x)=\sqrt{\frac{2}{L}}\sin(n\pi x)",
    "separation_result": r"\psi_{nlm}(r,\theta,\phi)=R_{nl}(r)Y_l^m(\theta,\phi)",
    "schrodinger_3d": r"\left[-\frac{\hbar^2}{2\mu}\nabla^2+V(r)\right]\psi(r,\theta,\phi)=E\psi(r,\theta,\phi)",
    "separation_ansatz": r"\psi(r,\theta,\phi)=R(r)Y(\theta,\phi)",
    "laplacian_split": r"\nabla^2=\frac{1}{r^2}\frac{\partial}{\partial r}\left(r^2\frac{\partial}{\partial r}\right)-\frac{\hat L^2}{\hbar^2r^2}",
    "l2_eigen": r"\hat L^2Y=l(l+1)\hbar^2Y",
    "phi_eq": r"\frac{\mathrm{d}^2\Phi}{\mathrm{d}\phi^2}+m^2\Phi=0",
    "phi_solution": r"\Phi_m(\phi)=\frac{1}{\sqrt{2\pi}}e^{im\phi}",
    "periodicity": r"\Phi(\phi+2\pi)=\Phi(\phi)\Rightarrow e^{i2\pi m}=1",
    "lz_eigen": r"\hat L_zY_l^m=m\hbar Y_l^m",
    "theta_eq": r"\frac{1}{\sin\theta}\frac{\mathrm{d}}{\mathrm{d}\theta}\left(\sin\theta\frac{\mathrm{d}\Theta}{\mathrm{d}\theta}\right)+\left[l(l+1)-\frac{m^2}{\sin^2\theta}\right]\Theta=0",
    "legendre_eq": r"(1-x^2)y''-2xy'+\left[l(l+1)-\frac{m^2}{1-x^2}\right]y=0",
    "legendre_reg": r"\Theta(\theta)\propto P_l^m(\cos\theta),\quad |m|\le l",
    "spherical_harmonics": r"Y_l^m(\theta,\phi)=N_{lm}P_l^m(\cos\theta)e^{im\phi}",
    "spherical_negative": r"Y_l^{-m}=(-1)^m\left[Y_l^m\right]^*",
    "quantum_range": r"l=0,1,2,\ldots,\quad m=-l,-l+1,\ldots,l",
    "radial_original": r"-\frac{\hbar^2}{2\mu r^2}\frac{\mathrm{d}}{\mathrm{d}r}\left(r^2\frac{\mathrm{d}R}{\mathrm{d}r}\right)+\left[V(r)+\frac{\hbar^2l(l+1)}{2\mu r^2}\right]R=ER",
    "u_sub": r"u(r)=rR(r)",
    "radial_u": r"-\frac{\hbar^2}{2\mu}\frac{\mathrm{d}^2u}{\mathrm{d}r^2}+V_{\mathrm{eff}}(r)u=Eu",
    "veff": r"V_{\mathrm{eff}}(r)=V(r)+\frac{\hbar^2l(l+1)}{2\mu r^2}",
    "coulomb": r"V(r)=-\frac{e^2}{4\pi\varepsilon_0r},\quad \rho=\frac{2r}{na_0}",
    "radial_factor": r"R_{nl}(\rho)=e^{-\rho/2}\rho^l v(\rho)",
    "laguerre_eq": r"\rho v''+(2l+2-\rho)v'+(n-l-1)v=0",
    "laguerre_solution": r"v(\rho)=L_{n-l-1}^{2l+1}(\rho)",
    "node_count": r"N_r=n-l-1",
    "full_wavefunction": r"\psi_{nlm}(r,\theta,\phi)=\mathcal{N}_{nlm}R_{nl}(r)Y_l^m(\theta,\phi)",
    "energy_hydrogen": r"E_n=-\frac{\mu e^4}{2(4\pi\varepsilon_0)^2\hbar^2}\frac{1}{n^2}=-\frac{13.6\ \mathrm{eV}}{n^2}",
    "degeneracy": r"g_n=\sum_{l=0}^{n-1}(2l+1)=n^2",
    "synthesis_fd": r"F(E)=\psi_E(L)=0",
    "synthesis_h": r"\psi_{nlm}=R_{nl}Y_l^m",
    "baseline_analytical": r"E_n=\frac{n^2\pi^2}{2L^2},\quad E_n^{\mathrm{H}}=-\frac{13.6\ \mathrm{eV}}{n^2}",
    "baseline_numerical": r"H\boldsymbol{\psi}=E\boldsymbol{\psi},\quad F(E)=\psi_E(L)=0",
    "dx_order": r"\frac{\psi_{i+1}-2\psi_i+\psi_{i-1}}{\Delta x^2}=\psi''(x_i)+O(\Delta x^2)",
    "shooting_error_terms": r"\varepsilon_{\mathrm{shoot}}\approx\varepsilon_{\mathrm{ODE}}+\varepsilon_{\mathrm{root}}+\varepsilon_{\mathrm{residual}}",
    "finite_truncation": r"x_{\max},r_{\max}<\infty",
    "floating_roundoff": r"\varepsilon_{\mathrm{round}}\sim10^{-16}",
    "quarter_rule": r"N\uparrow 2\times,\quad \Delta x\downarrow \frac12,\quad |\varepsilon|\downarrow \frac14",
    "ho_errors": r"0.0613\%\quad \mathrm{vs.}\quad 1.55\times10^{-8}\%",
}

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "a14": "http://schemas.microsoft.com/office/drawing/2010/main",
    "m": "http://schemas.openxmlformats.org/officeDocument/2006/math",
}
MARKER = re.compile(r"^\[\[EQ:([a-z0-9_]+)\]\]$")


def equation_element(latex: str) -> etree._Element:
    mathml = latex_to_mathml(latex)
    omml = mathml_to_omml(mathml)
    wrapped = (
        f'<a14:m xmlns:a14="{NS["a14"]}" xmlns:m="{NS["m"]}">'
        f'<m:oMathPara><m:oMathParaPr><m:jc m:val="centerGroup"/>'
        f"</m:oMathParaPr>{omml}</m:oMathPara></a14:m>"
    )
    return etree.fromstring(wrapped.encode("utf-8"))


def replace_markers(slide_path: Path) -> int:
    parser = etree.XMLParser(remove_blank_text=False)
    tree = etree.parse(str(slide_path), parser)
    count = 0
    for paragraph in tree.xpath("//a:p", namespaces=NS):
        text = "".join(paragraph.xpath(".//a:t/text()", namespaces=NS)).strip()
        match = MARKER.match(text)
        if not match:
            continue
        name = match.group(1)
        if name not in EQUATIONS:
            raise KeyError(f"Unknown equation marker: {name}")
        paragraph_properties = paragraph.find(f"{{{NS['a']}}}pPr")
        end_properties = paragraph.find(f"{{{NS['a']}}}endParaRPr")
        for child in list(paragraph):
            if child is not paragraph_properties and child is not end_properties:
                paragraph.remove(child)
        paragraph.insert(1 if paragraph_properties is not None else 0, equation_element(EQUATIONS[name]))
        count += 1
    tree.write(str(slide_path), xml_declaration=True, encoding="UTF-8", standalone=True)
    return count


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("usage: inject-editable-equations.py <pptx>")
    pptx = Path(sys.argv[1]).resolve()
    if not pptx.exists():
        raise FileNotFoundError(pptx)
    with tempfile.TemporaryDirectory(prefix="editable-equations-") as temp:
        unpacked = Path(temp) / "pptx"
        with zipfile.ZipFile(pptx) as archive:
            archive.extractall(unpacked)
        total = 0
        for slide_path in sorted((unpacked / "ppt" / "slides").glob("slide*.xml")):
            total += replace_markers(slide_path)
        leftovers = []
        for slide_path in sorted((unpacked / "ppt" / "slides").glob("slide*.xml")):
            if b"[[EQ:" in slide_path.read_bytes():
                leftovers.append(slide_path.name)
        if leftovers:
            raise RuntimeError(f"Equation markers left in {', '.join(leftovers)}")
        output = Path(temp) / "native.pptx"
        with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as archive:
            for item in unpacked.rglob("*"):
                if item.is_file():
                    archive.write(item, item.relative_to(unpacked))
        shutil.copy2(output, pptx)
    print(f"Inserted {total} native Office Math equations into {pptx}")


if __name__ == "__main__":
    main()
