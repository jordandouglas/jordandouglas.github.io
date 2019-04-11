 #!/bin/bash -e

echo "Building SimpolC with the ViennaRNA library..."

vrna_library_loc="`pwd`/../../../src/asm/ViennaRNA"
vrna_wd_option="-L$vrna_library_loc"
vrna_wd_option=$vrna_wd_option"/"
echo "The vRNA library should be saved at $vrna_library_loc/libViennaRNA.so"


g++ $vrna_wd_option -std=c++11 -O3 -fpermissive -pthread   cimpol.cpp  \
 ../../../src/asm/HTMLobject.cpp ../../../src/asm/Coordinates.cpp  \
  ../../../src/asm/Parameter.cpp ../../../src/asm/SlippageLandscapes.cpp ../../../src/asm/XMLparser.cpp \
  ../../../src/asm/ParameterHeatmapData.cpp ../../../src/asm/Plots.cpp ../../../src/asm/PlotSettings.cpp \
  ../../../src/asm/GelCalibrationSearch.cpp   ../../../src/asm/BayesianCalculations.cpp ../../../src/asm/Model.cpp  \
  ../../../src/asm/MCMC.cpp ../../../src/asm/ExperimentalData.cpp ../../../src/asm/WasmMessengerNull.cpp ../../../src/asm/SimulatorPthread.cpp \
  ../../../src/asm/PosteriorDistributionSample.cpp ../../../src/asm/Simulator.cpp ../../../src/asm/State.cpp \
  ../../../src/asm/Sequence.cpp ../../../src/asm/SimulatorResultSummary.cpp ../../../src/asm/Settings.cpp ../../../src/asm/FreeEnergy.cpp \
  ../../../src/asm/TranslocationRatesCache.cpp ../../../src/asm/Polymerase.cpp ../../../src/asm/randomc/mersenne.cpp \
  ../../../src/asm/tinyxml/tinystr.cpp ../../../src/asm/tinyxml/tinyxml.cpp ../../../src/asm/tinyxml/tinyxmlerror.cpp \
  ../../../src/asm/tinyxml/tinyxmlparser.cpp ../../../src/asm/GelLaneData.cpp ../../../src/asm/SitewiseSummary.cpp \
   ../../../src/asm/MultipleSequenceAlignment.cpp ../../../src/asm/BayesClassifier.cpp  -o SimpolC -lViennaRNA


#g++ $vrna_wd_option -Wall -std=c++11 -O3 -fpermissive -pthread main.cpp -o SimpolC -lViennaRNA 

echo "Exiting"
