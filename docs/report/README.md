# F1 Insight Hub Project Report

This folder contains the final LaTeX documentation for the F1 Insight Hub team course project. The report is written in Bulgarian and documents the mobile application, backend API, database model, ML component, testing approach, user scenarios, screenshots, diagrams, and individual contribution information.

## Folder Structure

```text
docs/report/
  main.tex              Main LaTeX source file
  Makefile              Build commands for PDF and PlantUML diagrams
  build/main.pdf        Generated final report
  figures/              Screenshots, generated diagrams, ML figures, TU logo
  plantuml/             PlantUML source files for project diagrams
```

## Main Files

- `main.tex` is the source of the final report.
- `build/main.pdf` is the generated PDF submitted with the project.
- `figures/` contains application screenshots, architecture diagrams, ER diagram, user flow diagram, XGBoost diagram, and SHAP analysis figure.
- `plantuml/` contains editable source files for the diagrams.

## Build the Report

Run from `docs/report/`:

```bash
make
```

The compiled PDF is written to:

```text
build/main.pdf
```

The build uses LuaLaTeX because the report contains Bulgarian text and custom fonts.

## Diagram Generation

The report includes PNG diagrams generated from PlantUML source files:

```text
plantuml/system-architecture.puml
plantuml/user-flows.puml
plantuml/database-er.puml
```

Generate diagram images with:

```bash
make diagrams
```

This writes or updates:

```text
figures/system-architecture.png
figures/user-flows.png
figures/database-er.png
```

