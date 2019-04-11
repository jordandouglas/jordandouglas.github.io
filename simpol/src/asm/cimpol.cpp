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


#include "../../../src/asm/Parameter.h"
#include "../../../src/asm/XMLparser.h"
#include "../../../src/asm/Settings.h"
#include "../../../src/asm/Model.h"
#include "../../../src/asm/Simulator.h"
#include "../../../src/asm/State.h"
#include "../../../src/asm/Plots.h"
#include "../../../src/asm/FreeEnergy.h"
#include "../../../src/asm/TranslocationRatesCache.h"
#include "../../../src/asm/MCMC.h"
#include "../../../src/asm/SimulatorPthread.h"
#include "../../../src/asm/BayesianCalculations.h"
#include "../../../src/asm/PosteriorDistributionSample.h"
#include "../../../src/asm/SimPol_vRNA_interface.h"
#include "../../../src/asm/SimulatorResultSummary.h"


#include <iostream>
#include <string>
#include <random>
#include <vector>
#include <map>
#include <chrono>
#include <ctime>
#include <thread>


using namespace std;




/* Arguments: 
				
                -h: prints arguments
				-xml <filename>: load in an xml file
				-logO <filename>: log file to write to
				-logI <filename>: log file to read from (only used by -summary and -RABC)
				-nthreads <n>: number of threads to split simulations over (default 1)
				-MCMC: perform MCMC instead of simulating (default false)
				-plotO <foldername> folder name to save plot data into (only if MCMC is false) 
				-resume: resumes MCMC from the last state printed in the file specified by -logO and appends to -logO (default false)
				-summary: prints a summary of the log file specified by -logI into the terminal (default false)
				-sample or -RABC: samples from posterior under a given model according to the experiment data presented in -xml xmlfile (default false)
							If -logI is specified then will sample from the posterior distribution
							If -summary is also specified then will use the geometric median
							Otherwise will sample from the distributions specified in -xml xmlfile
							This will be printed into terminal, or -logO file if specified
				-marginal: if -summary is enabled then will print a marginal-model geometric median summary. Models 
                -sitesummary <fastaInFile> <outFile>: samples from posterior / prior and prints a sitewise summary to file. Applies to all sequences in <fastaInFile>
                            Summary includes probability of hypertranslocation-induced arrest and probability of RNA-ratchet per site 
*/

int main(int argc, char** argv) { 

	
    cout << "Starting Simpol_cpp" << endl;
	auto startTime = std::chrono::system_clock::now();

	// Parse arguments
	bool doMCMC = false;
    string siteSummaryFile = "";
    string fastaInFile = "";
    bool printHelp = false;
	for (int i = 1; i < argc; i ++){

		string arg = string(argv[i]);

		if (arg == "-MCMC") doMCMC = true;
        
         else if (arg == "-h") printHelp = true;
		
		else if (arg == "-sim") doMCMC = false;
		
		else if (arg == "-wasm") isWASM = true;

		else if (arg == "-resume") _resumeFromLogfile = true; 

		else if (arg == "-summary") _printSummary = true; 

		else if (arg == "-sample" || arg == "-RABC") _sampleFromLikelihood = true; 

		else if (arg == "-marginal") _marginalModel = true; 
		
		else if(arg == "-xml" && i+1 < argc) {
			i++;
			_inputXMLfilename = string(argv[i]);
			//char filename[] = "/home/jdou557/Documents/Cimpol/SimpolC/SimpolC/about/Examples/benchmark.xml";
			//char filename[] = "/home/jdou557/Documents/Cimpol/SimpolC/SimpolC/models12.xml";

		}
		
		
		else if(arg == "-logO" && i+1 < argc) {
			i++;
			_outputFilename = string(argv[i]);
		}
        
        
        else if(arg == "-sitesummary" && i+2 < argc) {
            i++;
            fastaInFile = string(argv[i]);
            i++;
            siteSummaryFile = string(argv[i]);
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
			cout << "Invalid command line arguments." << endl;
            printHelp = true;
		}
		
	}
    
    
    if (printHelp){
    
        
        string tabs = "\t\t";
        cout << "----------------------------------------" << endl;
        cout << "USAGE: bash simpol.sh -xml path/to/session.xml" << endl;
        cout << tabs << "where session.xml is a session file generated by SimPol. (Use the user interface for this part.)" << endl;
        cout << "Optional arguments:" << endl;
        cout << tabs << "-h: Help." << endl;
        cout << tabs << "-logO file.log: Write the MCMC-ABC or R-ABC output into the specified file." << endl;
        cout << tabs << "-nthreads N: Parallelise the simulations over N threads. Multithreading does not work in the web browser, only from the command line. Default: 1." << endl;
        cout << tabs << "-MCMC: Run MCMC-ABC analysis instead of simulating. " << endl;
        cout << tabs << "-resume: Resumes MCMC from the last state printed in the file specified by -logO and appends to -logO. Only applicable if -MCMC is enabled. " << endl;
        cout << tabs << "-logI file.log: Read in the specified file. Only applicable if either -summary or -RABC are activated. " << endl;
        cout << tabs << "-summary: prints a summary of the log file specified by -logI into the terminal. " << endl;
        cout << tabs << "-RABC: Run R-ABC analysis instead of simulating. All states will be printed regardless of the xml-specified value of epsilon. If -logI is specified then will sample from the posterior distribution, otherwise the prior. If -summary is also specified then will sample from the geometric median instead of the whole posterior distribution." << endl;
        cout << tabs << "-sitesummary <fastaInFile> <outFile>: Performs a sitewise summary on all sequences in <fastaInFile> and prints to <outFile>. Summary includes probability of RNA-blockade-induced hypertranslocation arrest and probability of RNA-ratchet per site. If -logI is specified then will sample from the posterior distribution, otherwise the prior." << endl;
        
        cout << "For more information see http://www.polymerase.nz/simpol/about/" << endl;
        
        cout << "----------------------------------------" << endl;
    
        if ( argc > 1) exit(0);
        
    }
    


	if (_printSummary && _inputLogFileName == ""){
		cout << "You have enabled summary mode. Please specify a log file with -logI" << endl;
        cout << "Use -h for help" << endl;
		exit(0);
	}

	if (_printSummary && _inputXMLfilename == ""){
		cout << "You have enabled summary mode. Please specify an input xml file with -xml" << endl;
        cout << "Use -h for help" << endl;
		exit(0);
	}
    
    
    if (_printSummary && _inputXMLfilename == ""){
        cout << "You have enabled summary mode. Please specify an input xml file with -xml" << endl;
        cout << "Use -h for help" << endl;
        exit(0);
    }


	if (_sampleFromLikelihood && _printSummary && _inputXMLfilename == ""){
		cout << "You have enabled posterior sampling mode using the geometric median. Please specify an input log file with -logI" << endl;
        cout << "Use -h for help" << endl;
		exit(0);
	}

	if (siteSummaryFile != "" && _inputXMLfilename == ""){
		cout << "You have enabled sitewise summary mode. Please specify an input xml file with -xml" << endl;
        cout << "Use -h for help" << endl;
		exit(0);
	}
	
	
	// Initialise the thermodynamic parameter table
	FreeEnergy::init_BP_parameters();
	
	if (!isWASM){
		Settings::init();
		currentModel = new Model();
		Settings::activatePolymerase("RNAP");
		Settings::sampleAll();
		Settings::initSequences();
	}


	if (_inputXMLfilename != ""){
		char* filename = new char[_inputXMLfilename.length() + 1];
		strcpy(filename, _inputXMLfilename.c_str());
		bool succ = XMLparser::parseXMLFromFilename(filename, nullptr);
		delete [] filename;
		if (!succ) exit(1);

	}

	Settings::sampleAll();
	currentSequence->initRateTable(); // Ensure that the current sequence's translocation rate cache is up to date
	currentSequence->initRNAunfoldingTable();
	SimulatorPthread::init(); 
	_GUI_PLOTS->init();
	if (PrimerType == "ssRNA") vRNA_init(complementSequence.c_str());


	
	 // If no arguments then exit now
    if (argc == 1) {
    	
    	cout << "Please enter command line arguments to start Simpol" << endl;
        cout << "Use -h for help" << endl;
    	exit(0);
    }


    //Settings::print();

    //return 1;

	// Perform MCMC
	if (doMCMC){

        if (_outputFilename != "") cout << "Saving to " << _outputFilename << endl;
		MCMC::initMCMC(false, true);
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
		else if (!_printSummary && statesPostBurnin.size() > 0) cout << "Sampling new data using posterior distribution " << _inputLogFileName << endl;
		else cout << "Sampling new data using session specified in " << _inputXMLfilename << endl;
		BayesianCalculations::sampleFromPosterior(statesPostBurnin);
	}


	// Read in log file and print a summary to the terminal
	else if (_printSummary){
		vector<PosteriorDistributionSample*> statesPostBurnin = BayesianCalculations::loadLogFile(_inputLogFileName, _chiSqthreshold_min);
		BayesianCalculations::printModelFrequencies(statesPostBurnin);

		if (_marginalModel) BayesianCalculations::printMarginalGeometricMedians(statesPostBurnin);
		else BayesianCalculations::getGeometricMedian(statesPostBurnin, true, true);
	}
    
    
    // Sitewise summaries
    else if (fastaInFile != "" && siteSummaryFile != ""){
    
    
        // Posterior distribution (.log) or prior distribution (.xml)
        vector<PosteriorDistributionSample*> posteriorDistribution(0);
        if (_inputLogFileName != "") posteriorDistribution = BayesianCalculations::loadLogFile(_inputLogFileName, _chiSqthreshold_min);
        if (posteriorDistribution.size() > 0) cout << "Performing sitewise summary using posterior distribution " << _inputLogFileName << endl;
        else cout << "Performing sitewise summary using session specified in " << _inputXMLfilename << endl;
    
    
        // Perform the sitewise summary
        BayesianCalculations::performSitewiseSummary(posteriorDistribution, fastaInFile, siteSummaryFile);
    
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