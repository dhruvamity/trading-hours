.PHONY: all data clean analyze validate report schedule app test

PYTHON ?= python3

all: data clean analyze validate report schedule test

data:
	$(PYTHON) -m tradeclock.download.runner

clean:
	$(PYTHON) -m tradeclock.clean.validator

analyze:
	$(PYTHON) -m tradeclock.classify.classifier

validate:
	$(PYTHON) -m tradeclock.validate.runner

report:
	$(PYTHON) -m tradeclock.report.generate_report

schedule:
	$(PYTHON) -m tradeclock.classify.classifier

app:
	$(PYTHON) -m tradeclock

test:
	$(PYTHON) -m pytest -v tests
