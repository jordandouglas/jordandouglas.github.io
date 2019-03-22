
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
#include "SimulatorPthread.h"

#include <regex>
#include <algorithm>
#include <locale> 
#include <string> 
#include <fstream>


using namespace std;

MultipleSequenceAlignment::MultipleSequenceAlignment(){

    this->currentSequenceForSimulation = 0;
    this->initialisedSimulator = false;
    this->isAlignment = false;
    this->relativeTimePerLengths.resize(0);
    this->NBC_evidence_per_site.resize(0);
    this->finishedPauser = false;

}

// Get the number of sequences in the alignment
int MultipleSequenceAlignment::get_nseqs(){
    return this->alignment.size();
}

// Get the number of sites in the alignment. If not an alignment, return max number of sites
int MultipleSequenceAlignment::get_nsites(){
    return this->nsites;
}



// Parse the .fasta 
string MultipleSequenceAlignment::parseFromFastaFile(string filename){

    ifstream fastaFile;
    string line = "";
    fastaFile.open(filename);

    // Create a string which contains all the lines in the file, where each line is concatenated with a |
    // The reason I am using ` instead of \n is because of the difficulties in parsing \n from JavaScript to WebAssembly
    string fasta = "";
    if(fastaFile.is_open()) {

         while(getline(fastaFile, line)){
            fasta += line + "`";
         }

    }

    else {

        cout << "Cannot parse file " << filename << endl;
        exit(0);

    }



    // Parse the contents
    return this->parseFromFasta(fasta);




}

// Parse the list of sequences in the alignment from a fasta string. Optionally, sequences have pause sites specified
// Returns an error message if there are any problems
// Example:
//      >seq1|pausesites=(2,6,18-20)
//      AGCGTTAGGCGATTCGGGAAATGCGATTG
//      >seq2
//      ATTCGGGATCATCGAT 
string MultipleSequenceAlignment::parseFromFasta(string fasta){

    this->finishedPauser = false;
    this->clear();
    this->isAlignment = false;
    //cout << "Parsing .fasta " << fasta << endl;


    vector<string> fasta_split = Settings::split(fasta, '`'); // ` used as line break


    string currentAccession = "";
    string currentSequenceStr = "";
    list<int> currentSeqPauseSites;
    vector<string> accession_split;

    list<Sequence*> alignment_list;
    
    
    std::regex nucleotide_pattern ("[ACGTU-]");
    std::regex gap_pattern ("[-]");

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
                if (currentSeqPauseSites.size()) {
                    string err = currentSeq->set_known_pauseSites(currentSeqPauseSites);
                    if (err != "") return err;
                }
                
                // Check that sequence id is unique
                for (list<Sequence*>::iterator it = alignment_list.begin(); it != alignment_list.end(); ++ it){
                    if (currentSeq->getID() == (*it)->getID()){
                        return "ERROR: ensure that all sequences have unique identifiers. " + currentSeq->getID() + " = " + (*it)->getID();
                    }
                }
                
                
                alignment_list.push_back(currentSeq);
                currentSequenceStr = "";
            }
           
           
           // Split the line into an accession and optionally a list of known pause sites
           accession_split = Settings::split(line, '|'); 
           currentSeqPauseSites.clear();
           currentAccession = accession_split.at(0);
           
           if (accession_split.size() > 1){
                
                // Extract the numbers out of pattern eg. pausesites=(20, 40, 50-55)
                string pauseSitesMatch = "pausesites=(";
                string afterAccession = Settings::trim(accession_split.at(1)); 
                
                if (afterAccession.size() > pauseSitesMatch.size() + 1 && afterAccession.substr(0, pauseSitesMatch.size()) == pauseSitesMatch){
                    
                    // Contents inside the brackets. Split by ,
                    string innerBrackets = afterAccession.substr(pauseSitesMatch.size());
                    
                    accession_split = Settings::split(innerBrackets, ')'); 
                    innerBrackets = accession_split.at(0);
                    
                    // Split inner contents by , to get indices
                    accession_split = Settings::split(innerBrackets, ','); 
                    
                    for (int pos = 0; pos < accession_split.size(); pos ++){
                    
                        string trimmedBit = Settings::trim(accession_split.at(pos)); 
                        string seqNoDash = std::regex_replace (trimmedBit, gap_pattern, "");
                        
                        // An integer eg. 10
                        if (seqNoDash.size() == trimmedBit.size()){
                            
                            
                            
                            int num = stoi(trimmedBit);
                            
                            
                            if (num <= 0) return "ERROR: could not parse pause site: " + trimmedBit + " for " + currentAccession;
                            currentSeqPauseSites.push_back(num);
                        
                        }
                        
                        // A range of integers eg. 50-52
                        else {
                            
                            vector<string> range_split = Settings::split(trimmedBit, '-');
                            if (range_split.size() != 2 || range_split.at(0) == "" || range_split.at(1) == "")  return "ERROR: could not parse pause sites: " + trimmedBit + " for " + currentAccession;
                            int num1 = stoi(range_split.at(0));
                            int num2 = stoi(range_split.at(1));
                            if (num1 <= 0 || num2 <= 0 || num1 >= num2)  return "ERROR: could not parse pause sites: " + trimmedBit + " for " + currentAccession;
                            for (int num = num1; num <= num2; num ++) {
                                currentSeqPauseSites.push_back(num);
                            }
                            
                        }
                    
                    }                
                }
           
           }
        }


        // Parse sequence
        else {

            if (currentAccession != ""){

                // Check that sequence has A,C,G,T,U,- only
                std::transform(line.begin(), line.end(), line.begin(), ::toupper);

                
                
                string seqNoACGTU = std::regex_replace (line, nucleotide_pattern, "");


                if (seqNoACGTU.size() != 0) {
                    return "ERROR: please ensure that the alignment contains only nucleotide characters (A,C,G,T,U,-)";
                }

                currentSequenceStr += line;
                
                
                // Check if there are any gaps
                string seqNoGaps = std::regex_replace (line, gap_pattern, "");
                if (seqNoGaps.size() < line.size()) this->isAlignment = true;
                


            } else {

                return "ERROR: line " + to_string(i) + " does not have a name. Please ensure the file is in .fasta format.";
            }


        }
       
    }


    // Create the sequence object for the lines we just parsed
    if (currentSequenceStr != ""){

        Sequence* currentSeq = new Sequence(currentAccession, currentSequenceStr);
        if (currentSeqPauseSites.size()) {
            string err = currentSeq->set_known_pauseSites(currentSeqPauseSites);
            if (err != "") return err;
        }
        
        
        // Check that sequence id is unique
        for (list<Sequence*>::iterator it = alignment_list.begin(); it != alignment_list.end(); ++ it){
            if (currentSeq->getID() == (*it)->getID()){
                return "ERROR: ensure that all sequences have unique identifiers. " + currentSeq->getID() + " = " + (*it)->getID();
            }
        }
        
        
        alignment_list.push_back(currentSeq);
        currentSequenceStr = "";
    }
           


    // Convert alignment from list to vector
    vector<Sequence*> temp { std::begin(alignment_list), std::end(alignment_list) };
    this->alignment = temp;
    alignment_list.clear();





   if (this->alignment.size() == 0) {
        return "ERROR: the alignment needs at least one sequence.";
    }




    // Ensure that if this is an alignment (contains a "-") then all sequences have same length
    
    if (this->isAlignment){
        this->nsites = this->alignment.at(0)->get_nsitesMSA();
        for (int i = 1; i < this->alignment.size(); i ++){

            
            if (this->alignment.at(i)->get_nsitesMSA() != this->nsites)  {
                return "Multiple sequence alignment ERROR: " + this->alignment.at(i)->getID() + " does not have the same length as the previous sequences in the alignment. " + to_string(this->alignment.at(i)->get_nsitesMSA()) + " != " + to_string(this->nsites) + ".";
            }

        }
    }else {
    
    
        // Set nsites to the maximum number of sites across the sequences
        this->nsites = 0;
        for (int i = 0; i < this->alignment.size(); i ++){
            int seq_len = this->alignment.at(i)->get_nsitesMSA();
            if (seq_len > this->nsites) this->nsites = seq_len;
        }
    }

    fasta_split.clear();

    

    // Create the vector of mean time per length in each sequence
    this->relativeTimePerLengths.resize(this->alignment.size());
    this->NBC_evidence_per_site.resize(this->alignment.size());
    

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
    JSON += "'isAlignment':" + string(isAlignment ? "true" : "false") + ",";
    JSON += "'nsites':" + to_string(this->nsites) + "}";

    return JSON;

}


// Updates the sequences in the alignment by adding pause sites to them
void MultipleSequenceAlignment::classify(){
    
    cout << "Classifying" << endl;
    for (int i = 0; i < this->relativeTimePerLengths.size(); i ++){
        
        string accession = this->alignment.at(i)->getID();
        int seq_len = this->relativeTimePerLengths.at(i).size();
        
        
        // SimPol and NBC 
        list<int> simpol_pauseSites_list;
        list<int> nbc_pauseSites_list;
        for (int j = 1; j < seq_len; j ++){
        
        
            //cout << "SIMPOL " << i << "," << j << ": " << this->relativeTimePerLengths.at(i).at(j) << endl;
        
            // Simpol
            if (this->relativeTimePerLengths.at(i).at(j) / _simpol_max_evidence >= _simpol_evidence_threshold) {
                simpol_pauseSites_list.push_back(j);
            }
            
            //cout << "NBC " << i << "," << j << ": " << this->NBC_evidence_per_site.at(i).at(j) << endl;
            
            
            // NBC. Evidence has been pre-normalised into [0,1]
            if (this->NBC_evidence_per_site.at(i).at(j) >= _nbc_evidence_threshold) {
                nbc_pauseSites_list.push_back(j);
            }
            
            
        }
        
        this->alignment.at(i)->set_simpol_pauseSites(simpol_pauseSites_list);
        this->alignment.at(i)->set_nbc_pauseSites(nbc_pauseSites_list);

    }


}



// Clears the MSA and deletes the sequences
void MultipleSequenceAlignment::clear(){

    this->alignment.clear();
    this->currentSequenceForSimulation = 0;
    this->initialisedSimulator = false;
    
    
    // Clear SimPol simulation evidence
    for (int i = 0; i < this->relativeTimePerLengths.size(); i ++){
        this->relativeTimePerLengths.at(i).clear();
    }
    this->relativeTimePerLengths.clear();
    this->relativeTimePerLengths.resize(0);
    
    
    // Clear NBC evidence
    for (int i = 0; i < this->NBC_evidence_per_site.size(); i ++){
        this->NBC_evidence_per_site.at(i).clear();
    }
    this->NBC_evidence_per_site.clear();
    this->NBC_evidence_per_site.resize(0);    
    
    

}



// Get the sequence ID currently being simulated
string MultipleSequenceAlignment::getCurrentSequence(){

    if (this->currentSequenceForSimulation >= this->alignment.size()) return this->alignment.at(this->alignment.size()-1)->getID();
    return this->alignment.at(this->currentSequenceForSimulation)->getID();

}





// Perform simulations on each sequence in the alignment
void MultipleSequenceAlignment::Pauser(BayesClassifier* bayes_classifier){

    // Initialise simulator
    Plots* simulator_plots = new Plots();
    Simulator* simulator = new Simulator(simulator_plots);
    State* initialState;
    
    
    // Iterate through sequences
    for (; currentSequenceForSimulation < this->alignment.size(); currentSequenceForSimulation++){


        Sequence* currentSeq = this->alignment.at(currentSequenceForSimulation);
        SimulatorResultSummary* sequence_summary = new SimulatorResultSummary(ntrials_sim);

        
        // Naive Bayes classifier for sequence first
        vector<double> NBC_seq = bayes_classifier->get_evidence_per_site(currentSeq, _nbc_min_evidence, _nbc_max_evidence);
        this->NBC_evidence_per_site.at(currentSequenceForSimulation) = NBC_seq;
        
        

        cout << "Starting " << ntrials_sim << " for sequence " << currentSeq->getID() << endl;
        cout << "Starting sequence " << (currentSequenceForSimulation + 1) << " out of " << this->alignment.size() << endl;

        // Activate the sequence
        simulator_plots->clear();
        Settings::setSequence(currentSeq);


        // Reinitialise plot data every time sequence changes
        simulator_plots->init();
        
        
        // Simulate
        initialState = new State(true);
        simulator->perform_N_Trials(sequence_summary, initialState, false);
        

        // Simualtion completed. Save the time per length information and move on to the next sequence
        sequence_summary->add_proportionOfTimePerLength(simulator_plots->getProportionOfTimePerLength());
        sequence_summary->compute_meanRelativeTimePerLength();
        this->relativeTimePerLengths.at(currentSequenceForSimulation) = sequence_summary->get_meanRelativeTimePerLength();
        
        
        // Recompute the maximum evidence, so we can normalise
        for (int i = 1; i < this->relativeTimePerLengths.at(currentSequenceForSimulation).size(); i ++){
            double relativeTime = this->relativeTimePerLengths.at(currentSequenceForSimulation).at(i);
            if (relativeTime > _simpol_max_evidence) _simpol_max_evidence = relativeTime;
        }
        

        // Clear the rate table to liberate memory
        currentSeq->deconstructRateTable();
        sequence_summary->clear();
        delete sequence_summary;

    }
    
    delete initialState;
    simulator_plots->clear();
    delete simulator_plots;
    delete simulator;
    this->finishedPauser = true;

}







// Perform simulations on each sequence in the alignment. GUI only
void MultipleSequenceAlignment::Pauser_GUI(Simulator* simulator, BayesClassifier* bayes_classifier, int* result){

    
    bool timeoutReached = false;
    double simulator_result[3];
    for (; currentSequenceForSimulation < this->alignment.size(); currentSequenceForSimulation++){
    
    
        Sequence* currentSeq = this->alignment.at(currentSequenceForSimulation);
        
        // Initialise the simulator
        if (!this->initialisedSimulator) {
        
        
            
            // Naive Bayes classifier for sequence first
            vector<double> NBC_seq = bayes_classifier->get_evidence_per_site(currentSeq, _nbc_min_evidence, _nbc_max_evidence);
            this->NBC_evidence_per_site.at(currentSequenceForSimulation) = NBC_seq;
        
            
            
            this->initialisedSimulator = true;

            cout << "Beginning " << ntrials_sim << " simulations for " << currentSeq->getID().substr(0) << endl;
            cout << "Starting sequence " << (currentSequenceForSimulation + 1) << " out of " << this->alignment.size() << endl;

            // Activate the sequence
            simulator->getPlots()->clear();
            Settings::setSequence(currentSeq);


            //if (_USING_GUI){
                //delete _currentStateGUI;
                //_currentStateGUI = new State(true, false);
           // }
            
            simulator->getPlots()->init(); // Reinitialise plot data every time sequence changes
            
            
            // Prepare for simulating
            this->current_sequence_summary = new SimulatorResultSummary(ntrials_sim);
            simulator->initialise_GUI_simulation(this->current_sequence_summary, 1000);
            
            
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
        
        

        // Sequence completed. Save the time per length information and move on to the next sequence
        this->current_sequence_summary->add_proportionOfTimePerLength(simulator->getPlots()->getProportionOfTimePerLength());
        this->current_sequence_summary->compute_meanRelativeTimePerLength();
        
        this->relativeTimePerLengths.at(currentSequenceForSimulation) = this->current_sequence_summary->get_meanRelativeTimePerLength();
        
        
        // Recompute the maximum evidence, so we can normalise
        for (int i = 1; i < this->relativeTimePerLengths.at(currentSequenceForSimulation).size(); i ++){
            double relativeTime = this->relativeTimePerLengths.at(currentSequenceForSimulation).at(i);
            if (relativeTime > _simpol_max_evidence) _simpol_max_evidence = relativeTime;
        }
        
        

        // Clear the rate table to liberate memory
        currentSeq->deconstructRateTable();
        this->current_sequence_summary->clear();

        this->initialisedSimulator = false;
    }



    // All simulations have been performed on all sequences
    result[0] = currentSequenceForSimulation;
    result[1] = simulator->getNtrialsCompleted_GUI();
    result[2] = 1; // Done
    this->finishedPauser = true;


}



vector<vector<double>> MultipleSequenceAlignment::get_relativeTimePerLengths(){
    return this->relativeTimePerLengths;
}


Sequence* MultipleSequenceAlignment::getSequenceAtIndex(int index){
    return this->alignment.at(index);
}


// Print the Pauser results to a file
void MultipleSequenceAlignment::printPauserToFile(string file){

    // Get the output string and replace | with \n
    string str_pipes = this->getPauserAsString();
    vector<string> lines = Settings::split(this->getPauserAsString(), '|');
    string str_linebreaks = "";
    for (int i = 0; i < lines.size(); i ++) str_linebreaks += lines.at(i) + "\n";
    
    
    cout << "Writing to file " << file << endl;
    //cout << str_pipes << endl;
    
    // Write to file
    ofstream myfile;
    myfile.open(file);
    if (myfile.is_open()) {
        myfile << str_linebreaks << endl;
        myfile.close();
    }
    else {
        cout << "Error opening file " << file << endl;
        exit(0);
    }

}


// Return the results as a string. To allow parsing in JSON, uses '|' as a line break.
string MultipleSequenceAlignment::getPauserAsString(){


    if (!this->finishedPauser) return "";
    
    
    string output = "";
    
    
    // Report the evidence per site per sequence for each classifier
    output += "Sequence,Classifier,EvidencePerSite|";
    for (int i = 0; i < this->alignment.size(); i ++){
    
        Sequence* seq = this->alignment.at(i);
        int seq_len = this->relativeTimePerLengths.at(i).size();
        
        
        //cout << "i " << i << 
        
        // SimPol classifier
        output += seq->getID().substr(1) + ",simpol,";
        for (int j = 1; j < seq_len; j ++){
            output += to_string(this->relativeTimePerLengths.at(i).at(j));
            if (j < seq_len - 1) output += ",";
            
        }
        output += "|";
    
    
        // NB classifier
        output += seq->getID().substr(1) + ",nbc, ";
        for (int j = 1; j < seq_len; j ++){
            output += to_string(this->NBC_evidence_per_site.at(i).at(j));
            if (j < seq_len - 1) output += ",";
        }
        output += "|";
    
    }
    
    
    //cout << "output " << output << endl;
    return output;



}