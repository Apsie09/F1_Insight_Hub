# F1 Insight Hub LaTeX Report

This folder contains the LaTeX version of the project documentation.

## Build

Run from `docs/report/`:

```bash
make
```

The compiled PDF is written to:

```text
build/main.pdf
```

## Screenshots

Replace the screenshot placeholders in `main.tex` by putting images under:

```text
figures/
```

Then replace each `\screenshotplaceholder{...}{...}` call with a normal LaTeX figure, for example:

```latex
\begin{figure}[H]
    \centering
    \includegraphics[width=0.45\textwidth]{figures/home-screen.png}
    \caption{Home screen на приложението}
\end{figure}
```

## Diagrams

The architecture, flow and ER diagrams are stored as PlantUML source files under:

```text
plantuml/
```

Generate diagram images with:

```bash
make diagrams
```

This writes PNG files under:

```text
figures/
```

The LaTeX document includes these generated PNG files. If PlantUML is not installed or the PNG files are missing, `main.tex` renders readable placeholders instead of failing the PDF build.

Current PlantUML sources:

```text
plantuml/system-architecture.puml
plantuml/user-flows.puml
plantuml/database-er.puml
```
