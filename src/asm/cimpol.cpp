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
#include "FreeEnergy.h"
#include "TranslocationRatesCache.h"
#include "MCMC.h"
#include "SimulatorPthread.h"



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
				-MCMC: perform MCMC instead of simulating (default false)
				-i <filename>: load in an xml file
				-o <filename>: log file to write to
				-nthreads <n>: number of threads to split simulations over (default 1)
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
		
		else if(arg == "-i" && i+1 < argc) {
			i++;
			inputXMLfilename = string(argv[i]);
			//char filename[] = "/home/jdou557/Documents/Cimpol/SimpolC/SimpolC/about/Examples/benchmark.xml";
			//char filename[] = "/home/jdou557/Documents/Cimpol/SimpolC/SimpolC/models12.xml";

		}
		
		
		else if(arg == "-o" && i+1 < argc) {
			i++;
			outputFilename = string(argv[i]);
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
	
	
	// Initialise the thermodynamic parameter table
	FreeEnergy::init_BP_parameters();
	
	if (!isWASM){
		Settings::init();
		currentModel = new Model();
		Settings::sampleAll();
	}


	if (inputXMLfilename != ""){
		char* filename = new char[inputXMLfilename.length() + 1];
		strcpy(filename, inputXMLfilename.c_str());
		bool succ = XMLparser::parseXMLFromFilename(filename);
		delete [] filename;
		if (!succ) exit(1);
		
		
	}
	
	Settings::sampleAll();
	SimulatorPthread::init();
    
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
		MCMC::beginMCMC();
	}
	
	// Just simulate
	else{
   		double velocity = SimulatorPthread::performNSimulations(ntrials_sim, true);
		cout << "Mean velocity: " << velocity << "bp/s" << endl;
   	}

	
	auto endTime = std::chrono::system_clock::now();
	std::chrono::duration<double> elapsed_seconds = endTime-startTime;
	cout << "Time elapsed: " << elapsed_seconds.count() << "s" << endl;


   return 0;

}







