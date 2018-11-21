#!/bin/bash -e

echo "Compiling with WASM..."


source ./../emsdk/emsdk_env.sh --build=Release



emcc -s WASM=1 -o Program_wasm.html -s "EXTRA_EXPORTED_RUNTIME_METHODS=['ccall', 'cwrap', 'Pointer_stringify']" -O1 -O2 -O3 -std=c++11 -fpermissive  -s ALLOW_MEMORY_GROWTH=1 -s WASM_MEM_MAX=1073741824 -s NO_EXIT_RUNTIME=1 main.cpp WasmInterface.cpp ../model/Calculations.cpp



