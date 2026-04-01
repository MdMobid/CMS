CC=gcc
CFLAGS=-Wall -O2
TARGET=lab

all: $(TARGET)
	@echo "Build complete. Run: python3 gui_launcher.py"

$(TARGET): lab.c
	$(CC) $(CFLAGS) -o $(TARGET) lab.c -lm

clean:
	rm -f $(TARGET) lab_data/*.csv

install-deps:
	pip3 install openpyxl --break-system-packages

.PHONY: all clean install-deps
