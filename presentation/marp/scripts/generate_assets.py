#!/usr/bin/env python3
"""Generate deterministic SVG charts for the Marp numerical-method slides."""

from __future__ import annotations

import csv
import shutil
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


ROOT = Path(__file__).resolve().parents[3]
RESULTS = ROOT / "numerical_analysis" / "results"
OUTPUT = ROOT / "presentation" / "marp" / "assets"
KATEX_DIST = ROOT / "node_modules" / "katex" / "dist"

BLUE = "#0071E3"
ORANGE = "#D86600"
INK = "#1D1D1F"
MUTED = "#6E6E73"
HAIR = "#D2D2D7"


def load_csv(name: str) -> list[dict[str, str]]:
    with (RESULTS / name).open(encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def configure_matplotlib() -> None:
    plt.rcParams.update(
        {
            "font.family": "sans-serif",
            "font.sans-serif": [
                "Helvetica Neue",
                "PingFang SC",
                "Arial Unicode MS",
                "DejaVu Sans",
            ],
            "mathtext.fontset": "stix",
            "axes.edgecolor": INK,
            "axes.labelcolor": INK,
            "xtick.color": MUTED,
            "ytick.color": MUTED,
            "svg.fonttype": "none",
        }
    )


def energy_chart() -> None:
    rows = [
        row
        for row in load_csv("energy_comparison.csv")
        if row["problem"] == "Infinite square well"
        and row["method"] == "Finite difference"
    ]
    levels = np.array([int(row["level"]) for row in rows])
    numerical = np.array([float(row["numerical"]) for row in rows])
    analytical = np.array([float(row["analytical"]) for row in rows])

    figure, axis = plt.subplots(figsize=(6.6, 4.0))
    axis.plot(
        levels,
        analytical,
        color=INK,
        linewidth=2.0,
        marker="o",
        markerfacecolor="white",
        markeredgewidth=1.8,
        markersize=7,
        label="Analytical",
        zorder=2,
    )
    axis.plot(
        levels,
        numerical,
        color=BLUE,
        linewidth=3.0,
        marker="o",
        markersize=5,
        label="Finite difference",
        zorder=3,
    )
    axis.set_xlim(0.7, 5.3)
    axis.set_ylim(0, 132)
    axis.set_xticks(levels)
    axis.set_yticks([0, 40, 80, 120])
    axis.set_xlabel("Quantum number  n")
    axis.set_ylabel("Energy  E")
    axis.grid(axis="y", color=HAIR, linewidth=0.8, alpha=0.8)
    axis.spines[["top", "right"]].set_visible(False)
    axis.legend(frameon=False, loc="upper left", ncol=2)
    figure.patch.set_alpha(0)
    axis.patch.set_alpha(0)
    figure.tight_layout()
    figure.savefig(OUTPUT / "energy-levels.svg", transparent=True, bbox_inches="tight")
    plt.close(figure)


def convergence_chart() -> None:
    rows = load_csv("convergence.csv")
    figure, axis = plt.subplots(figsize=(6.4, 4.35))

    for level, color, marker in [(1, BLUE, "o"), (5, "#FF9F0A", "s")]:
        selected = [row for row in rows if int(row["level"]) == level]
        dx = np.array([float(row["dx"]) for row in selected])
        error = np.array([float(row["relative_error"]) for row in selected])
        axis.loglog(
            dx,
            error,
            color=color,
            marker=marker,
            linewidth=2.6,
            markersize=6,
            label=f"n = {level}",
        )

    reference_dx = np.array([1 / 401, 1 / 26])
    axis.loglog(
        reference_dx,
        0.55 * reference_dx**2,
        color=MUTED,
        linestyle="--",
        linewidth=1.8,
        label=r"$O(\Delta x^2)$",
    )
    axis.set_xlabel(r"Grid spacing  $\Delta x$")
    axis.set_ylabel("Absolute relative error")
    axis.grid(which="major", color=HAIR, linewidth=0.8, alpha=0.8)
    axis.grid(which="minor", color="#E8E8ED", linewidth=0.5, alpha=0.7)
    axis.spines[["top", "right"]].set_visible(False)
    axis.legend(frameon=False, loc="upper left")
    figure.patch.set_alpha(0)
    axis.patch.set_alpha(0)
    figure.tight_layout()
    figure.savefig(OUTPUT / "convergence.svg", transparent=True, bbox_inches="tight")
    plt.close(figure)


def copy_math_runtime() -> None:
    for obsolete_asset in ("katex.min.js", "auto-render.min.js"):
        (OUTPUT / obsolete_asset).unlink(missing_ok=True)
    shutil.copytree(KATEX_DIST / "fonts", OUTPUT / "fonts", dirs_exist_ok=True)
    shutil.copy2(KATEX_DIST / "katex.min.css", OUTPUT / "katex-local.css")


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    configure_matplotlib()
    energy_chart()
    convergence_chart()
    copy_math_runtime()
    print(f"Generated SVG assets in {OUTPUT}")


if __name__ == "__main__":
    main()
