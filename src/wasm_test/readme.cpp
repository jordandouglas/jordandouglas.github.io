



To compile c++ with the GNU compiler so it can be run from the command line:

cd wasm_interface
bash compile_GNU.sh
./Program




To compile with WebAssembly:


1) Install Clang and node.js


2) To install webassembly see https://webassembly.org/getting-started/developers-guide/

All you have to do is copy the following into the terminal from this directory

git clone https://github.com/juj/emsdk.git
cd emsdk
emsdk install latest

git clone https://github.com/kripken/emscripten
cd emscripten



3) 
cd wasm_interface
bash compile_WASM.sh

