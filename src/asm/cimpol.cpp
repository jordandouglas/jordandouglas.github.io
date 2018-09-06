/* 
	--------------------------------------------------------------------
	--------------------------------------------------------------------
	This file is part of SimPol.
    SimPol is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.
    SimPol is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.
    You should have received a copy of the GNU General Public License
    along with SimPol.  If not, see <http://www.gnu.org/licenses/>. 
    --------------------------------------------------------------------
    --------------------------------------------------------------------
-*/


#include "Parameter.h"
#include "XMLparser.h"
#include "Settings.h"
#include "Model.h"
#include "Simulator.h"
#include "State.h"
#include "Plots.h"
#include "FreeEnergy.h"
#include "TranslocationRatesCache.h"
#include "MCMC.h"
#include "SimulatorPthread.h"
#include "BayesianCalculations.h"
#include "PosteriorDistributionSample.h"
#include "SimPol_vRNA_interface.h"
#include "SimulatorResultSummary.h"


#include <iostream>
#include <string>
#include <random>
#include <vector>
#include <map>
#include <chrono>
#include <ctime>
#include <thread>


using namespace std;




/* Optional arguments: 
				
				-xml <filename>: load in an xml file
				-logO <filename>: log file to write to
				-logI <filename>: log file to read from (only used by -summary and -sample)
				-nthreads <n>: number of threads to split simulations over (default 1)
				-MCMC: perform MCMC instead of simulating (default false)
				-plotO <foldername> folder name to save plot data into (only if MCMC is false) 
				-resume: resumes MCMC from the last state printed in the file specified by -logO and appends to -logO (default false)
				-summary: prints a summary of the log file specified by -logI into the terminal (default false)
				-sample: samples from posterior under a given model according to the experiment data presented in -xml xmlfile (default false)
							If -logI is specified then will sample from the posterior distribution
							If -summary is also specified then will use the geometric median
							Otherwise will sample from the distributions specified in -xml xmlfile
							This will be printed into terminal, or -logO file if specified
				-marginal: if -summary is enabled then will print a marginal-model geometric median summary. Models 
*/

int main(int argc, char** argv) { 

	
    cout << "Starting Simpol_cpp" << endl;
	auto startTime = std::chrono::system_clock::now();

	// Parse arguments
	bool doMCMC = false;
	for (int i = 1; i < argc; i ++){

		string arg = string(argv[i]);

		if (arg == "-MCMC") doMCMC = true;
		
		else if (arg == "-sim") doMCMC = false;
		
		else if (arg == "-wasm") isWASM = true;

		else if (arg == "-resume") _resumeFromLogfile = true; 

		else if (arg == "-summary") _printSummary = true; 

		else if (arg == "-sample") _sampleFromLikelihood = true; 

		else if (arg == "-marginal") _marginalModel = true; 
		
		else if(arg == "-xml" && i+1 < argc) {
			i++;
			inputXMLfilename = string(argv[i]);
			//char filename[] = "/home/jdou557/Documents/Cimpol/SimpolC/SimpolC/about/Examples/benchmark.xml";
			//char filename[] = "/home/jdou557/Documents/Cimpol/SimpolC/SimpolC/models12.xml";

		}
		
		
		else if(arg == "-logO" && i+1 < argc) {
			i++;
			outputFilename = string(argv[i]);
		}


		else if(arg == "-logI" && i+1 < argc) {
			i++;
			_inputLogFileName = string(argv[i]);
		}

		else if(arg == "-plotO" && i+1 < argc) {
			i++;
			_plotFolderName = string(argv[i]);
		}


		else if(arg == "-nthreads" && i+1 < argc) {
			i++;
			N_THREADS = atoi(argv[i]);
		}


		else {
			cout << "Invalid command line arguments" << endl;
			exit(0);
		}
		
	}


	if (_printSummary && _inputLogFileName == ""){
		cout << "You have enabled summary mode. Please specify a log file with -logI" << endl;
		exit(0);
	}

	if (_printSummary && inputXMLfilename == ""){
		cout << "You have enabled summary mode. Please specify an input xml file with -xml" << endl;
		exit(0);
	}


	if (_sampleFromLikelihood && _printSummary && inputXMLfilename == ""){
		cout << "You have enabled posterior sampling mode using the geometric median. Please specify an input log file with -logI" << endl;
		exit(0);
	}

	if (_sampleFromLikelihood && inputXMLfilename == ""){
		cout << "You have enabled posterior sampling mode. Please specify an input xml file with -xml" << endl;
		exit(0);
	}
	
	
	// Initialise the thermodynamic parameter table
	FreeEnergy::init_BP_parameters();
	
	if (!isWASM){
		Settings::init();
		currentModel = new Model();
		Settings::activatePolymerase("polII");
		Settings::sampleAll();
		Settings::initSequences();
	}


	if (inputXMLfilename != ""){
		char* filename = new char[inputXMLfilename.length() + 1];
		strcpy(filename, inputXMLfilename.c_str());
		bool succ = XMLparser::parseXMLFromFilename(filename);
		delete [] filename;
		if (!succ) exit(1);

	}


	Settings::sampleAll();
	currentSequence->initRateTable(); // Ensure that the current sequence's translocation rate cache is up to date
	currentSequence->initRNAunfoldingTable();
	SimulatorPthread::init(); 
	Plots::init();
	if (PrimerType == "ssRNA") vRNA_init(complementSequence.c_str());


    //complementSequence = Settings::complementSeq(templateSequence, TemplateType.substr(2) == "RNA");

	
	 // If no arguments then exit now
    if (argc == 1) {
    	
    	cout << "Please enter command line arguments to start Simpol" << endl;
    	exit(1);
    }


    //Settings::print();

    //return 1;

	// Perform MCMC
	if (doMCMC){
		MCMC::initMCMC(false);
		MCMC::beginMCMC();
	}


	// Sample from the posterior
	else if (_sampleFromLikelihood){
		vector<PosteriorDistributionSample*> statesPostBurnin(0);
		if (_inputLogFileName != "") statesPostBurnin = BayesianCalculations::loadLogFile(_inputLogFileName, _chiSqthreshold_min);
		if (_printSummary && statesPostBurnin.size() > 0) { // Use geometric median as the single state to sample from 
			statesPostBurnin.resize(1);
			BayesianCalculations::printModelFrequencies(statesPostBurnin);
			statesPostBurnin.at(0) = BayesianCalculations::getGeometricMedian(statesPostBurnin, true, true);
			cout << "Sampling new data using geometric median parameters" << endl;
		}
		else if (!_printSummary && statesPostBurnin.size() > 0) cout << "Sampling new data using parameters in posterior distribution " << _inputLogFileName << endl;
		else cout << "Sampling new data using parameters specified by " << inputXMLfilename << endl;
		BayesianCalculations::sampleFromPosterior(statesPostBurnin);
	}


	// Read in log file and print a summary to the terminal
	else if (_printSummary){
		vector<PosteriorDistributionSample*> statesPostBurnin = BayesianCalculations::loadLogFile(_inputLogFileName, _chiSqthreshold_min);
		BayesianCalculations::printModelFrequencies(statesPostBurnin);

		if (_marginalModel) BayesianCalculations::printMarginalGeometricMedians(statesPostBurnin);
		else BayesianCalculations::getGeometricMedian(statesPostBurnin, true, true);
	}


	// Just simulate
	else{
   		SimulatorResultSummary* resultsSummary = SimulatorPthread::performNSimulations(ntrials_sim, true);
		cout << "Mean velocity: " << resultsSummary->get_meanVelocity() << "bp/s" << endl;
		cout << "Sequence length: " << templateSequence.length() << endl;
   	}

	
	auto endTime = std::chrono::system_clock::now();
	std::chrono::duration<double> elapsed_seconds = endTime-startTime;
	cout << "Time elapsed: " << elapsed_seconds.count() << "s" << endl;


   return 0;

}