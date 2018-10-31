#!/bin/bash -e

echo "Building SimpolC..."

g++ -std=c++11 -O3 -fpermissive -pthread -o SimpolC cimpol.cpp ../../../src/asm/SimPol_vRNA_interface.c ../../../src/asm/HTMLobject.cpp ../../../src/asm/Coordinates.cpp  \
   ../../../src/asm/Parameter.cpp ../../../src/asm/SlippageLandscapes.cpp ../../../src/asm/XMLparser.cpp ../../../src/asm/ParameterHeatmapData.cpp ../../../src/asm/Plots.cpp ../../../src/asm/PlotSettings.cpp ../../../src/asm/GelCalibrationSearch.cpp  \
    ../../../src/asm/BayesianCalculations.cpp ../../../src/asm/Model.cpp ../../../src/asm/MCMC.cpp ../../../src/asm/ExperimentalData.cpp ../../../src/asm/WasmMessengerNull.cpp ../../../src/asm/SimulatorPthread.cpp \
    ../../../src/asm/PosteriorDistributionSample.cpp ../../../src/asm/Simulator.cpp ../../../src/asm/State.cpp ../../../src/asm/Sequence.cpp ../../../src/asm/SimulatorResultSummary.cpp ../../../src/asm/Settings.cpp ../../../src/asm/FreeEnergy.cpp ../../../src/asm/TranslocationRatesCache.cpp \
    ../../../src/asm/Polymerase.cpp ../../../src/asm/randomc/mersenne.cpp ../../../src/asm/tinyxml/tinystr.cpp ../../../src/asm/tinyxml/tinyxml.cpp ../../../src/asm/tinyxml/tinyxmlerror.cpp ../../../src/asm/tinyxml/tinyxmlparser.cpp ../../../src/asm/GelLaneData.cpp \


echo "Done! Saved to SimpolC"
