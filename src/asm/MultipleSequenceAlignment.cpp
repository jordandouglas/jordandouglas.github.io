﻿
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





#include "PauseSiteUtil.h"
#include "MultipleSequenceAlignment.h"
#include "Settings.h"


#include <regex>
#include <algorithm>
#include <locale> 
#include <string> 

using namespace std;

MultipleSequenceAlignment::MultipleSequenceAlignment(){

    this->currentSequenceForSimulation = 0;
    initialisedSimulator = false;
    this->pauseSitesInAlignment.resize(0);

}

// Get the number of sequences in the alignment
int MultipleSequenceAlignment::get_nseqs(){
    return this->alignment.size();
}

// Get the number of sites in the alignment
int MultipleSequenceAlignment::get_nsites(){
    return this->nsites;
}


// Parse the list of sequences in the alignment from a fasta string
// Returns an error message if there are any problems
string MultipleSequenceAlignment::parseFromFasta(string fasta){

    this->clear();

    cout << "Parsing .fasta " << fasta << endl;


    vector<string> fasta_split = Settings::split(fasta, '|'); // | used a line break


    string currentAccession = "";
    string currentSequenceStr = "";

    list<Sequence*> alignment_list;



    // Parse the fasta 
    for (int i = 0; i < fasta_split.size(); i++) {

        string line = Settings::trim(fasta_split.at(i));
        if (line.size() == 0) continue;

        //cout << "line:" << line << endl;
        

        // New sequence
        if (line.substr(0, 1) == ">"){

            // Create the sequence object for the lines we just parsed
            if (currentSequenceStr != ""){

                Sequence* currentSeq = new Sequence(currentAccession, currentSequenceStr);
                alignment_list.push_back(currentSeq);
                currentSequenceStr = "";
            }
           
           currentAccession = line;
        }


        // Parse sequence
        else {

            if (currentAccession != ""){

                // Check that sequence has A,C,G,T,U,- only
                std::transform(line.begin(), line.end(), line.begin(), ::toupper);


                string x = "ACGTUBBBBBCAU--";
                std::regex pattern ("[ACGTU-]");
                string seqNoACGTU = std::regex_replace (line, pattern, "");


                if (seqNoACGTU.size() != 0) {
                    return "ERROR: please ensure that the alignment contains only nucleotide characters (A,C,G,T,U,-)";
                }

                currentSequenceStr += line;


            } else {

                return "ERROR: line " + to_string(i) + " does not have a name. Please ensure the file is in .fasta format.";
            }


        }
       
    }


    // Create the sequence object for the lines we just parsed
    if (currentSequenceStr != ""){

        Sequence* currentSeq = new Sequence(currentAccession, currentSequenceStr);
       alignment_list.push_back(currentSeq);
        currentSequenceStr = "";
    }
           


    // Convert alignment from list to vector
    vector<Sequence*> temp { std::begin(alignment_list), std::end(alignment_list) };
    this->alignment = temp;
    alignment_list.clear();



    if (this->alignment.size() == 0) {
        return "ERROR: the alignment needs at least one sequence";
    }




    // Ensure that all sequences have same length
    this->nsites = this->alignment.at(0)->get_nsitesMSA();
    for (int i = 1; i < this->alignment.size(); i ++){

        
        if (this->alignment.at(i)->get_nsitesMSA() != this->nsites)  {
            return "ERROR: " + this->alignment.at(i)->getID() + " does not have a consistent length. " + to_string(this->alignment.at(i)->get_nsitesMSA()) + " != " + to_string(this->nsites) + ".";
        }

    }

    fasta_split.clear();



    // Create the pause sites double vector
    this->pauseSitesInAlignment.resize(this->alignment.size());
    for (int i = 0; i < this->pauseSitesInAlignment.size(); i ++){

        this->pauseSitesInAlignment.at(i) = new vector<bool>();
        this->pauseSitesInAlignment.at(i)->resize(this->nsites);

        for (int j = 0; j < this->nsites; j ++){
            this->pauseSitesInAlignment.at(i)->at(j) = false;
        }
    }


    return "";

}

// Returns a JSON string of the alignment
string MultipleSequenceAlignment::toJSON(){

    string JSON = "{'alignment':{"; 

     for (int i = 0; i < this->alignment.size(); i ++){

        Sequence* seq = this->alignment.at(i);
        JSON += seq->toJSON();
        if (i < this->alignment.size()-1) JSON += ",";

    }

    JSON += "},";
    JSON += "'nseqs':" + to_string(this->alignment.size()) + ",";
    JSON += "'nsites':" + to_string(this->nsites) + "}";

    return JSON;

}


// Returns a JSON string of double array of pause sites
string MultipleSequenceAlignment::pauseSites_toJSON(){



    // Return an object of lists  acc:[site1, site2, ...]
    // Where each element refers to the pause sites in that sequence

    string JSON = "{"; 

    for (int i = 0; i < this->pauseSitesInAlignment.size(); i ++){

        string accession = this->alignment.at(i)->getID();
        string pauseSitesThisAccession_JSON = "";

        for (int j = 0; j < this->nsites; j ++){

            if (this->pauseSitesInAlignment.at(i)->at(j)){
                pauseSitesThisAccession_JSON += to_string(j+1) + ",";
            }
        }

        // Pause sites exist -> ass to JSON string 
        if (pauseSitesThisAccession_JSON.size() > 0) {
            if (pauseSitesThisAccession_JSON.substr(pauseSitesThisAccession_JSON.length()-1, 1) == ",") pauseSitesThisAccession_JSON = pauseSitesThisAccession_JSON.substr(0, pauseSitesThisAccession_JSON.length() - 1);
            JSON += "'" + accession + "':[" + pauseSitesThisAccession_JSON + "],"; 
          }

    }


    // Remove trailing comma
    if (JSON.substr(JSON.length()-1, 1) == ",") JSON = JSON.substr(0, JSON.length() - 1);
    JSON += "}";

    cout << "pauseSites_toJSON " << JSON << endl;

    return JSON;

}



// Clears the MSA and deletes the sequences
void MultipleSequenceAlignment::clear(){

    this->alignment.clear();
    this->currentSequenceForSimulation = 0;
    this->initialisedSimulator = false;

    for (int i = 0; i < this->pauseSitesInAlignment.size(); i ++){
        this->pauseSitesInAlignment.at(i)->clear();
        delete this->pauseSitesInAlignment.at(i);
    }
    this->pauseSitesInAlignment.clear();
    this->pauseSitesInAlignment.resize(0);

}



// Get the sequence ID currently being simulated
string MultipleSequenceAlignment::getCurrentSequence(){

    if (this->currentSequenceForSimulation >= this->alignment.size()) return this->alignment.at(this->alignment.size()-1)->getID();
    return this->alignment.at(this->currentSequenceForSimulation)->getID();

}

// Perform simulations on each sequence in the alignment
void MultipleSequenceAlignment::PhyloPause(Simulator* simulator, int* result){

   

    bool timeoutReached = false;
    double simulator_result[3];
    for (currentSequenceForSimulation; currentSequenceForSimulation < this->alignment.size(); currentSequenceForSimulation++){


        Sequence* currentSeq = this->alignment.at(currentSequenceForSimulation);

        // Initialise the simulator
        if (!this->initialisedSimulator) {
            
            
            this->initialisedSimulator = true;

            cout << "Starting " << ntrials_sim << " for sequence " << currentSeq->getID() << endl;

            // Activate the sequence
            Plots::deletePlotData(_currentStateGUI, true, true, true, true, true, true);
            Settings::setSequence(currentSeq);

        
            Plots::init(); // Reinitialise plot data every time sequence changes


            if (_USING_GUI){
                delete _currentStateGUI;
                _currentStateGUI = new State(true, true);
            }


            // Prepare for simulating
            simulator->initialise_GUI_simulation(ntrials_sim, 1000);

            // Start the simulations for this sequence
            simulator->perform_N_Trials_and_stop_GUI(simulator_result);


        }


        else {

            // Resume the simulation from a previously initialised simulator
            simulator->resume_trials_GUI(simulator_result);

        }

        //cout << "Velocity " << simulator_result[0] << endl;


        timeoutReached = simulator_result[2] == 0;
        if (timeoutReached) {

            // 1st element = nseqs complete, 
            // 2nd element = ntrials complete in this sequence
            // 3rd element = 1 if finished, 0 if not
            result[0] = currentSequenceForSimulation;
            result[1] = simulator->getNtrialsCompleted_GUI();
            result[2] = 0;
            return;
        }   


        // Sequence completed. Save the TTC information and move on to the next sequence
        vector<bool>* isPauseSite = PauseSiteUtil::identifyPauseSites(currentSeq, Plots::getTimeToCatalysisPerSite());
        this->pauseSitesInAlignment.at(currentSequenceForSimulation) = isPauseSite;

        // Clear the rate table to liberate memory
        currentSeq->deconstructRateTable();

        this->initialisedSimulator = false;
    }



    // All simulations have been performed on all sequences
    result[0] = currentSequenceForSimulation;
    result[1] = simulator->getNtrialsCompleted_GUI();
    result[2] = 1; // Done


}