#!/bin/bash -e


echo "Running Pauser..."
echo "$(dirname $0)/./Pauser"
#cd $(dirname $0)
vrna_library_loc="$(dirname $0)/../../../src/asm/ViennaRNA"
echo "The vRNA library should be saved at $vrna_library_loc/libViennaRNA.so"

export LD_LIBRARY_PATH=$vrna_library_loc:$LD_LIBRARY_PATH./

$(dirname $0)/./Pauser "$@"



