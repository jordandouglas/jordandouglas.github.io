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
#include "../../../src/asm/SimulatorPthread.h"
#include "../../../src/asm/BayesianCalculations.h"
#include "../../../src/asm/SimPol_vRNA_interface.h"
#include "../../../src/asm/SimulatorResultSummary.h"
#include "../../../src/asm/MultipleSequenceAlignment.h"
#include "../../../src/asm/BayesClassifier.h"


#include <iostream>
#include <string>
#include <random>
#include <vector>
#include <map>
#include <chrono>
#include <ctime>
#include <thread>
#include <fstream>
#include <sstream>

using namespace std;




/* Arguments: 
                -h: help
                -o <filename>: file to print the results to (REQUIRED)
                -fasta <filename>: load in a .fasta alignment file (REQUIRED)
                -xml <filename>: load in an .xml SimPol session file (optional)
                -nbc <filename>: load in an NBC parameters file (optional)
*/


int main(int argc, char** argv) { 

    
    cout << "Starting Pauser" << endl;
    _USING_PAUSER = true;
    _RECORD_PAUSE_TIMES = true;
    auto startTime = std::chrono::system_clock::now();
    _animationSpeed = "hidden";

    // Parse arguments
    bool doMCMC = false;
    string nbcInputFileName = "";
    bool printHelp = false;
    for (int i = 1; i < argc; i ++){
    
        string arg = string(argv[i]);

        if(arg == "-xml" && i+1 < argc) {
            i++;
            _inputXMLfilename = string(argv[i]);
        }
        
        
        else if(arg == "-h") {
            printHelp = true;
        }
        
        else if(arg == "-fasta" && i+1 < argc) {
            i++;
           _inputFastaFileName = string(argv[i]);
        }


        else if(arg == "-o" && i+1 < argc) {
            i++;
            _outputFilename = string(argv[i]);
        }
        
        
        else if(arg == "-nbc" && i+1 < argc) {
            i++;
            nbcInputFileName = string(argv[i]);
        }

       
       /*
        else if(arg == "-nthreads" && i+1 < argc) {
            i++;
            N_THREADS = atoi(argv[i]);
        }
        */

        else {
            cout << "Invalid command line argument: " << arg << endl;
            printHelp = true;
        }
        
    }
    
    
    if (printHelp){
    
        
        string tabs = "\t\t";
        cout << "----------------------------------------" << endl;
        cout << "USAGE: bash pauser.sh -fasta path/to/sequences.fasta -o path/to/output.csv" << endl;
        cout << tabs << "where sequences.fasta is the file containing sequences, and output.csv the file to save the results to." << endl;
        cout << "Optional arguments:" << endl;
        cout << tabs << "-h: Help." << endl;
        cout << tabs << "-xml session.xml: Load the specified SimPol session in .xml format. If unspecified, will load the default session at pauser/pauser.xml. " << endl;
        cout << tabs << "-nbc params.txt: Load the specified naive Bayes classifier parameters. If unspecified, will load the default session at pauser/NBC_pauser.txt." << endl;
        
        cout << "For more information see http://www.polymerase.nz/pauser/about/" << endl;
        
        cout << "----------------------------------------" << endl;
    
        if ( argc > 1) exit(0);
        
    }
    
    

    // Initialise the thermodynamic parameter table
    FreeEnergy::init_BP_parameters();
    

    Settings::init();
    currentModel = new Model();
    Settings::activatePolymerase("RNAP");
    Settings::sampleAll();
    Settings::initSequences();
    
    

    if (_inputFastaFileName == ""){
        cout << "Sequence .fasta file was not specified. Please specify the file to begin." << endl;
        cout << "Use -h for help" << endl;
        exit(0);
    }
    
    
    
    if (nbcInputFileName == ""){
        cout << "Naive Bayes .csv file was not specified. Please specify the file to begin." << endl;
        cout << "Use -h for help" << endl;
        exit(0);
    }
    
    
    
    if (_outputFilename == ""){
        cout << "Output .csv file was not specified. Please specify the file to begin." << endl;
        cout << "Use -h for help" << endl;
        exit(0);
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
    //_GUI_PLOTS->init();
    if (PrimerType == "ssRNA") vRNA_init(complementSequence.c_str());
    
    


    // Erase all contents of the output file so we can append to the end of it
    if (_outputFilename != ""){
        ofstream* outputFile = new ofstream(_outputFilename);
        if (!outputFile->is_open()) {
            cout << "Cannot open file " << _outputFilename << endl;
            exit(0);
        }

        (*outputFile) << "";
        outputFile->close();
    }



    // Load in the alignment
    _PP_multipleSequenceAlignment = new MultipleSequenceAlignment();
    string errorMsg = _PP_multipleSequenceAlignment->parseFromFastaFile(_inputFastaFileName);

    if (errorMsg != "") {
        cout << errorMsg << endl;
        exit(1);
    }
    cout << "Alignment successfully parsed." << endl;
    
    
    
    // Load in the NBC parameters
    BayesClassifier* bayes_classifier = new BayesClassifier();
    bayes_classifier->loadFromFile(nbcInputFileName);
    vector<double> min_max = bayes_classifier->get_min_max_evidence();
    _nbc_min_evidence = min_max.at(0);
    _nbc_max_evidence = min_max.at(1);
    

    // Begin Pauser
    cout << "Beginning Pauser" << endl;
    _PP_multipleSequenceAlignment->Pauser(bayes_classifier);

    
    
    // Print to file
    _PP_multipleSequenceAlignment->printPauserToFile(_outputFilename);


    auto endTime = std::chrono::system_clock::now();
    std::chrono::duration<double> elapsed_seconds = endTime-startTime;
    cout << "Done! Time elapsed: " << elapsed_seconds.count() << "s" << endl;

    return 0;

}