#!/bin/bash -e

echo "Building SimpolC..."

g++ -std=c++11 -pthread -o SimpolC cimpol.cpp HTMLobject.cpp Coordinates.cpp Parameter.cpp XMLparser.cpp ParameterHeatmapData.cpp Plots.cpp PlotSettings.cpp BayesianCalculations.cpp Model.cpp MCMC.cpp ExperimentalData.cpp WasmMessengerNull.cpp SimulatorPthread.cpp PosteriorDistriutionSample.cpp Simulator.cpp State.cpp Sequence.cpp Settings.cpp FreeEnergy.cpp TranslocationRatesCache.cpp Polymerase.cpp randomc/mersenne.cpp tinyxml/tinystr.cpp tinyxml/tinyxml.cpp tinyxml/tinyxmlerror.cpp tinyxml/tinyxmlparser.cpp 


echo "Done! Saved to SimpolC"
