.PHONY: all pdf diagrams clean clean-diagrams

TEX = lualatex
OUT = build
MAIN = main.tex
PUML = plantuml
DIAGRAMS = \
	plantuml/system-architecture.puml \
	plantuml/user-flows.puml \
	plantuml/database-er.puml

all: diagrams pdf

pdf:
	mkdir -p $(OUT)
	$(TEX) -interaction=nonstopmode -halt-on-error -output-directory=$(OUT) $(MAIN)
	$(TEX) -interaction=nonstopmode -halt-on-error -output-directory=$(OUT) $(MAIN)

diagrams:
	@if command -v $(PUML) >/dev/null 2>&1; then \
		$(PUML) -tpng -o ../figures $(DIAGRAMS); \
	else \
		echo "PlantUML is not installed; LaTeX will use diagram placeholders."; \
	fi

clean:
	rm -f $(OUT)/*.aux $(OUT)/*.log $(OUT)/*.out $(OUT)/*.toc $(OUT)/*.lof $(OUT)/*.lot $(OUT)/*.fls $(OUT)/*.fdb_latexmk

clean-diagrams:
	rm -f figures/system-architecture.png figures/user-flows.png figures/database-er.png
