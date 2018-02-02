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


#include <iostream>
#include <string>
#include <random>
#include <map>
#include <chrono>
#include <ctime>
//#include <unistd.h>

using namespace std;



/* Optional arguments: 
				-MCMC: perform MCMC instead of simulating (default false)
				-i <filename>: load in an xml file
				-o <filename>: log file to write to
*/
int main(int argc, char** argv) { 

	
    cout << "Starting Simpol_cpp" << endl;

	
	auto startTime = std::chrono::system_clock::now();
    Settings::init();
	FreeEnergy::init_BP_parameters(); // Initialise the thermodynamic parameter table
    currentModel = new Model();


	// Parse arguments
	bool doMCMC = false;
	for (int i = 1; i < argc; i ++){
		
		string arg = string(argv[i]);
		if (arg == "-MCMC") doMCMC = true;
		
		else if(arg == "-i" && i+1 < argc) {
			i++;
			char* filename = argv[i];
			//char filename[] = "/home/jdou557/Documents/Cimpol/SimpolC/SimpolC/about/Examples/benchmark.xml";
			//char filename[] = "/home/jdou557/Documents/Cimpol/SimpolC/SimpolC/models12.xml";

			bool succ = XMLparser::parseXMLFromFilename(filename);
		}
		
		
		else if(arg == "-o" && i+1 < argc) {
			i++;
			outputFilename = string(argv[i]);
		}
		
		else {
			cout << "Invalid command line arguments" << endl;
			exit(0);
		}
		
	}
	
    Settings::sampleAll();
    //complementSequence = Settings::complementSeq(templateSequence, TemplateType.substr(2) == "RNA");


    // Build the rates table
   	TranslocationRatesCache::buildTranslocationRateTable(); 
   	TranslocationRatesCache::buildBacktrackRateTable();


	
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

	   	Simulator* sim = new Simulator();
	   	State* initialState = new State(true);
	   	sim->perform_N_Trials(ntrials_sim, initialState, true);

   	}

	
	auto endTime = std::chrono::system_clock::now();
	std::chrono::duration<double> elapsed_seconds = endTime-startTime;
	cout << "Time elapsed: " << elapsed_seconds.count() << "s" << endl;


   return 0;

}



