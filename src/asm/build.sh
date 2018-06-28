#!/bin/bash -e

echo "Building SimpolC..."

g++ -std=c++11 -O3 -fpermissive -pthread -o SimpolC cimpol.cpp HTMLobject.cpp Coordinates.cpp SimPol_vRNA_interfaceNull.cpp \
   Parameter.cpp SlippageLandscapes.cpp XMLparser.cpp ParameterHeatmapData.cpp Plots.cpp PlotSettings.cpp GelCalibrationSearch.cpp  \
    BayesianCalculations.cpp Model.cpp MCMC.cpp ExperimentalData.cpp WasmMessengerNull.cpp SimulatorPthread.cpp \
    PosteriorDistributionSample.cpp Simulator.cpp State.cpp Sequence.cpp SimulatorResultSummary.cpp Settings.cpp FreeEnergy.cpp TranslocationRatesCache.cpp \
    Polymerase.cpp randomc/mersenne.cpp tinyxml/tinystr.cpp tinyxml/tinyxml.cpp tinyxml/tinyxmlerror.cpp tinyxml/tinyxmlparser.cpp GelLaneData.cpp

echo "Done! Saved to SimpolC"
