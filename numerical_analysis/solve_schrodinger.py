#!/usr/bin/env python3
"""Numerical and analytical comparisons for 1D Schrodinger problems.

Units: hbar = m = 1.
"""

from __future__ import annotations

import csv
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Callable

import matplotlib.pyplot as plt
import numpy as np
from scipy.integrate import solve_ivp
from scipy.linalg import eigh_tridiagonal
from scipy.optimize import brentq


OUTPUT_DIR = Path(__file__).resolve().parent / "results"


@dataclass(frozen=True)
class EnergyComparison:
    problem: str
    method: str
    level: int
    numerical: float
    analytical: float
    absolute_error: float
    relative_error_percent: float


def make_comparison(
    problem: str,
    method: str,
    level: int,
    numerical: float,
    analytical: float,
) -> EnergyComparison:
    absolute_error = abs(numerical - analytical)
    return EnergyComparison(
        problem=problem,
        method=method,
        level=level,
        numerical=float(numerical),
        analytical=float(analytical),
        absolute_error=float(absolute_error),
        relative_error_percent=float(100.0 * absolute_error / abs(analytical)),
    )


def finite_difference_spectrum(
    x_min: float,
    x_max: float,
    interior_points: int,
    potential: Callable[[np.ndarray], np.ndarray],
    levels: int,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Solve H psi = E psi using a centered second-order difference."""
    h = (x_max - x_min) / (interior_points + 1)
    x = np.linspace(x_min + h, x_max - h, interior_points)
    diagonal = np.full(interior_points, 1.0 / h**2) + potential(x)
    off_diagonal = np.full(interior_points - 1, -0.5 / h**2)
    energies, states = eigh_tridiagonal(
        diagonal,
        off_diagonal,
        select="i",
        select_range=(0, levels - 1),
    )

    # eigh_tridiagonal normalizes discrete vectors. Convert to integral
    # normalization so sum(|psi|^2 h) = 1.
    states = states / np.sqrt(h)
    return x, energies, states


def shooting_residual(
    energy: float,
    x_start: float,
    x_end: float,
    initial_state: tuple[float, float],
    potential: Callable[[float], float],
) -> float:
    """Return psi(x_end) after integrating the Schrodinger ODE."""

    def rhs(x: float, y: np.ndarray) -> tuple[float, float]:
        psi, derivative = y
        return derivative, 2.0 * (potential(x) - energy) * psi

    solution = solve_ivp(
        rhs,
        (x_start, x_end),
        initial_state,
        method="DOP853",
        rtol=1e-11,
        atol=1e-13,
    )
    return float(solution.y[0, -1])


def find_shooting_roots(
    residual: Callable[[float], float],
    energy_min: float,
    energy_max: float,
    roots_needed: int,
    scan_points: int = 4000,
) -> np.ndarray:
    """Locate sign changes, then refine each eigenvalue with Brent's method."""
    scan = np.linspace(energy_min, energy_max, scan_points)
    values = np.array([residual(float(energy)) for energy in scan])
    roots: list[float] = []

    for left, right, f_left, f_right in zip(
        scan[:-1], scan[1:], values[:-1], values[1:]
    ):
        if f_left == 0.0:
            candidate = float(left)
        elif f_left * f_right < 0.0:
            candidate = float(
                brentq(residual, float(left), float(right), xtol=1e-12, rtol=1e-13)
            )
        else:
            continue

        if not roots or abs(candidate - roots[-1]) > 1e-7:
            roots.append(candidate)
        if len(roots) == roots_needed:
            return np.array(roots)

    raise RuntimeError(
        f"Found only {len(roots)} roots in [{energy_min}, {energy_max}]"
    )


def infinite_well_results(
    length: float = 1.0, interior_points: int = 100
) -> tuple[list[EnergyComparison], np.ndarray, np.ndarray, np.ndarray]:
    x, fd_energies, fd_states = finite_difference_spectrum(
        0.0,
        length,
        interior_points,
        potential=lambda positions: np.zeros_like(positions),
        levels=5,
    )
    levels = np.arange(1, 6)
    analytical = levels**2 * np.pi**2 / (2.0 * length**2)

    residual = lambda energy: shooting_residual(
        energy,
        0.0,
        length,
        (0.0, 1.0),
        potential=lambda position: 0.0,
    )
    shooting_energies = find_shooting_roots(
        residual,
        energy_min=0.1,
        energy_max=55.0,
        roots_needed=3,
    )

    comparisons = [
        make_comparison(
            "Infinite square well", "Finite difference", int(level), numerical, exact
        )
        for level, numerical, exact in zip(levels, fd_energies, analytical)
    ]
    comparisons.extend(
        make_comparison(
            "Infinite square well", "Shooting", int(level), numerical, exact
        )
        for level, numerical, exact in zip(
            levels[:3], shooting_energies, analytical[:3]
        )
    )
    return comparisons, x, fd_states, analytical


def harmonic_oscillator_results(
    x_max: float = 5.0, interior_points: int = 100
) -> tuple[list[EnergyComparison], np.ndarray, np.ndarray]:
    x, fd_energies, fd_states = finite_difference_spectrum(
        -x_max,
        x_max,
        interior_points,
        potential=lambda positions: 0.5 * positions**2,
        levels=3,
    )

    # The ground state is even: psi(0)=1 and psi'(0)=0. Shooting only over
    # [0, 5] is much better conditioned than starting in the forbidden region.
    residual = lambda energy: shooting_residual(
        energy,
        0.0,
        x_max,
        (1.0, 0.0),
        potential=lambda position: 0.5 * position**2,
    )
    shooting_ground = find_shooting_roots(
        residual,
        energy_min=0.1,
        energy_max=1.2,
        roots_needed=1,
        scan_points=1200,
    )[0]

    exact_ground = 0.5
    comparisons = [
        make_comparison(
            "Harmonic oscillator",
            "Finite difference",
            0,
            fd_energies[0],
            exact_ground,
        ),
        make_comparison(
            "Harmonic oscillator",
            "Shooting",
            0,
            shooting_ground,
            exact_ground,
        ),
    ]
    return comparisons, x, fd_states


def write_csv(comparisons: list[EnergyComparison]) -> None:
    path = OUTPUT_DIR / "energy_comparison.csv"
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=EnergyComparison.__annotations__)
        writer.writeheader()
        writer.writerows(asdict(row) for row in comparisons)


def plot_infinite_well(
    comparisons: list[EnergyComparison],
    x: np.ndarray,
    states: np.ndarray,
) -> None:
    fd_rows = [
        row
        for row in comparisons
        if row.problem == "Infinite square well" and row.method == "Finite difference"
    ]
    shooting_rows = [
        row
        for row in comparisons
        if row.problem == "Infinite square well" and row.method == "Shooting"
    ]

    figure, axes = plt.subplots(1, 2, figsize=(12, 4.6))
    levels = np.arange(1, 6)
    axes[0].plot(
        levels,
        [row.analytical for row in fd_rows],
        "o-",
        label="Analytical",
    )
    axes[0].plot(
        levels,
        [row.numerical for row in fd_rows],
        "s--",
        label="Finite difference",
    )
    axes[0].plot(
        levels[:3],
        [row.numerical for row in shooting_rows],
        "x",
        markersize=9,
        markeredgewidth=2,
        label="Shooting",
    )
    axes[0].set_xlabel("Quantum number n")
    axes[0].set_ylabel("Energy")
    axes[0].set_title("Infinite well energy levels")
    axes[0].grid(alpha=0.25)
    axes[0].legend()

    for index in range(3):
        numerical_state = states[:, index]
        analytical_state = np.sqrt(2.0) * np.sin((index + 1) * np.pi * x)
        if np.dot(numerical_state, analytical_state) < 0:
            numerical_state = -numerical_state
        axes[1].plot(x, numerical_state, label=f"FD n={index + 1}")
        axes[1].plot(x, analytical_state, "--", alpha=0.7)
    axes[1].set_xlabel("x")
    axes[1].set_ylabel("Normalized wavefunction")
    axes[1].set_title("Wavefunctions: numerical (solid) vs exact (dashed)")
    axes[1].grid(alpha=0.25)
    axes[1].legend(ncol=3, fontsize=8)

    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "infinite_well_comparison.png", dpi=200)
    plt.close(figure)


def plot_harmonic_oscillator(
    comparisons: list[EnergyComparison],
    x: np.ndarray,
    states: np.ndarray,
) -> None:
    numerical_state = states[:, 0]
    analytical_state = np.pi ** (-0.25) * np.exp(-(x**2) / 2.0)
    if np.dot(numerical_state, analytical_state) < 0:
        numerical_state = -numerical_state

    figure, axes = plt.subplots(1, 2, figsize=(11, 4.4))
    labels = ["Analytical", "Finite difference", "Shooting"]
    values = [
        0.5,
        next(row.numerical for row in comparisons if row.method == "Finite difference"),
        next(row.numerical for row in comparisons if row.method == "Shooting"),
    ]
    axes[0].bar(labels, values, color=["#222222", "#3478f6", "#ff9f0a"])
    axes[0].axhline(0.5, color="#222222", linewidth=1)
    axes[0].set_ylim(0.49, 0.505)
    axes[0].set_ylabel("Ground-state energy")
    axes[0].set_title("Harmonic oscillator ground state")
    axes[0].tick_params(axis="x", rotation=12)
    axes[0].grid(axis="y", alpha=0.25)

    axes[1].plot(x, analytical_state, "--", label="Analytical")
    axes[1].plot(x, numerical_state, label="Finite difference")
    axes[1].set_xlabel("x")
    axes[1].set_ylabel("Normalized wavefunction")
    axes[1].set_title("Ground-state wavefunction")
    axes[1].grid(alpha=0.25)
    axes[1].legend()

    figure.tight_layout()
    figure.savefig(OUTPUT_DIR / "harmonic_oscillator_comparison.png", dpi=200)
    plt.close(figure)


def write_convergence_results(length: float = 1.0) -> None:
    grid_sizes = np.array([25, 50, 100, 200, 400])
    levels = np.array([1, 5])
    rows: list[dict[str, float | int]] = []

    for interior_points in grid_sizes:
        h = length / (interior_points + 1)
        for level in levels:
            exact = level**2 * np.pi**2 / (2.0 * length**2)
            discrete = 2.0 / h**2 * np.sin(
                level * np.pi / (2.0 * (interior_points + 1))
            ) ** 2
            relative_error = abs((discrete - exact) / exact)
            rows.append(
                {
                    "interior_points": int(interior_points),
                    "level": int(level),
                    "dx": float(h),
                    "finite_difference_energy": float(discrete),
                    "analytical_energy": float(exact),
                    "relative_error": float(relative_error),
                }
            )

    with (OUTPUT_DIR / "convergence.csv").open(
        "w", newline="", encoding="utf-8"
    ) as handle:
        writer = csv.DictWriter(handle, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    figure, axis = plt.subplots(figsize=(6.5, 4.3))
    colors = {1: "#0071E3", 5: "#FF9F0A"}
    markers = {1: "o", 5: "s"}
    for level in levels:
        selected = [row for row in rows if row["level"] == level]
        axis.loglog(
            [row["dx"] for row in selected],
            [row["relative_error"] for row in selected],
            marker=markers[int(level)],
            markersize=7,
            linewidth=2.4,
            color=colors[int(level)],
            label=f"n = {level}",
        )

    reference_dx = np.array([1 / 401, 1 / 26])
    reference = 0.55 * reference_dx**2
    axis.loglog(
        reference_dx,
        reference,
        linestyle="--",
        linewidth=1.8,
        color="#6E6E73",
        label=r"$O(\Delta x^2)$",
    )
    axis.set_xlabel(r"Grid spacing $\Delta x$")
    axis.set_ylabel("Absolute relative error")
    axis.grid(True, which="major", color="#D2D2D7", alpha=0.65, linewidth=0.8)
    axis.grid(True, which="minor", color="#E8E8ED", alpha=0.45, linewidth=0.5)
    axis.legend(frameon=False, loc="upper left")
    axis.spines[["top", "right"]].set_visible(False)
    axis.tick_params(colors="#3A3A3C")
    figure.patch.set_alpha(0.0)
    axis.patch.set_alpha(0.0)
    figure.tight_layout()
    figure.savefig(
        OUTPUT_DIR / "convergence.png",
        dpi=240,
        transparent=True,
        bbox_inches="tight",
    )
    plt.close(figure)


def print_table(comparisons: list[EnergyComparison]) -> None:
    print(
        f"{'Problem':25} {'Method':18} {'Level':>5} "
        f"{'Numerical':>14} {'Analytical':>14} {'Rel. error':>12}"
    )
    print("-" * 96)
    for row in comparisons:
        print(
            f"{row.problem:25} {row.method:18} {row.level:5d} "
            f"{row.numerical:14.9f} {row.analytical:14.9f} "
            f"{row.relative_error_percent:11.6f}%"
        )


def validate(comparisons: list[EnergyComparison]) -> None:
    well_fd = [
        row
        for row in comparisons
        if row.problem == "Infinite square well" and row.method == "Finite difference"
    ]
    well_shooting = [
        row
        for row in comparisons
        if row.problem == "Infinite square well" and row.method == "Shooting"
    ]
    oscillator_fd = next(
        row
        for row in comparisons
        if row.problem == "Harmonic oscillator" and row.method == "Finite difference"
    )
    oscillator_shooting = next(
        row
        for row in comparisons
        if row.problem == "Harmonic oscillator" and row.method == "Shooting"
    )

    assert max(row.relative_error_percent for row in well_fd) < 0.21
    assert max(row.relative_error_percent for row in well_shooting) < 1e-7
    assert oscillator_fd.relative_error_percent < 0.07
    assert oscillator_shooting.relative_error_percent < 1e-4


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    well, well_x, well_states, _ = infinite_well_results()
    oscillator, oscillator_x, oscillator_states = harmonic_oscillator_results()
    comparisons = well + oscillator

    validate(comparisons)
    write_csv(comparisons)
    plot_infinite_well(comparisons, well_x, well_states)
    plot_harmonic_oscillator(oscillator, oscillator_x, oscillator_states)
    write_convergence_results()
    (OUTPUT_DIR / "summary.json").write_text(
        json.dumps([asdict(row) for row in comparisons], indent=2),
        encoding="utf-8",
    )
    print_table(comparisons)
    print(f"\nResults written to {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
