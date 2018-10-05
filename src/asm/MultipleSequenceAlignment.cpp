
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
#include "PhyloTreeNode.h"
#include "Eigen/Dense"
#include "SimulatorResultSummary.h"
#include "SimulatorPthread.h"

#include <regex>
#include <algorithm>
#include <locale> 
#include <string> 
#include <fstream>


using namespace std;
using Eigen::MatrixXd;

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



// Parse the .fasta 
string MultipleSequenceAlignment::parseFromFastaFile(string filename){

    
    ifstream fastaFile;
    string line = "";
    fastaFile.open(filename);

    // Create a string which contains all the lines in the file, where each line is concatenated with a |
    // The reason I am using | instead of \n is because of the difficulties in parsing \n from JavaScript to WebAssembly
    string fasta = "";
    if(fastaFile.is_open()) {

         while(getline(fastaFile, line)){
            fasta += line + "|";
         }

    }

    else {

        cout << "Cannot parse file " << filename << endl;
        exit(0);

    }



    // Parse the contents
    return this->parseFromFasta(fasta);




}

// Parse the list of sequences in the alignment from a fasta string
// Returns an error message if there are any problems
string MultipleSequenceAlignment::parseFromFasta(string fasta){

    this->clear();

    //cout << "Parsing .fasta " << fasta << endl;


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



    // Set the default weight of each sequence to 1/nseqs
    for (int i = 0; i < this->alignment.size(); i ++){
        this->alignment.at(i)->set_weight(1.0 / this->alignment.size());
    }



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
void MultipleSequenceAlignment::PhyloPause(){

   

    bool timeoutReached = false;
    for (currentSequenceForSimulation = 0; currentSequenceForSimulation < this->alignment.size(); currentSequenceForSimulation++){


        Sequence* currentSeq = this->alignment.at(currentSequenceForSimulation);

        // Initialise the simulator
            
        
        this->initialisedSimulator = true;

        cout << "Starting sequence " << (currentSequenceForSimulation + 1) << " out of " << this->alignment.size() << endl;

        // Activate the sequence
        Plots::deletePlotData(_currentStateGUI, true, true, true, true, true, true);
        Settings::setSequence(currentSeq);


        // Reinitialise plot data every time sequence changes
        Plots::init(); 


        // Perform multi-threaded simulation
        SimulatorResultSummary* simulationResults = SimulatorPthread::performNSimulations(ntrials_sim, false);

           
            
      
        vector<bool>* isPauseSite = PauseSiteUtil::identifyPauseSites(currentSeq, Plots::getTimeToCatalysisPerSite());
        this->pauseSitesInAlignment.at(currentSequenceForSimulation) = isPauseSite;

        // Clear the rate table to liberate memory
        currentSeq->deconstructRateTable();


        // Print to file?
        if (_outputFilename != ""){
            PauseSiteUtil::writePauseSitesToFile(_outputFilename, currentSeq, Plots::getTimeToCatalysisPerSite());
        }

        //this->initialisedSimulator = false;
    }



}







// Perform simulations on each sequence in the alignment. GUI only
void MultipleSequenceAlignment::PhyloPause_GUI(Simulator* simulator, int* result){

   

    bool timeoutReached = false;
    double simulator_result[3];
    for (currentSequenceForSimulation; currentSequenceForSimulation < this->alignment.size(); currentSequenceForSimulation++){


        Sequence* currentSeq = this->alignment.at(currentSequenceForSimulation);

        // Initialise the simulator
        if (!this->initialisedSimulator) {
            
            
            this->initialisedSimulator = true;

            //cout << "Starting " << ntrials_sim << " for sequence " << currentSeq->getID() << endl;
            cout << "Starting sequence " << (currentSequenceForSimulation + 1) << " out of " << this->alignment.size() << endl;

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



vector<vector<bool>*> MultipleSequenceAlignment::get_pauseSitesInAlignment(){
    return this->pauseSitesInAlignment;
}


Sequence* MultipleSequenceAlignment::getSequenceAtIndex(int index){
    return this->alignment.at(index);
}




// Check that the leaf sequence names are the same as those in the multiple sequence alignment
string MultipleSequenceAlignment::treeTipNamesAreConsistentWithMSA(PhyloTree* tree){

    vector<PhyloTreeNode*> leaves = tree->getLeaves();

    if (leaves.size() != this->get_nseqs()) return "ERROR: different number of tips in tree and multiple sequence alignment.";

    for (int leafIndex = 0; leafIndex < leaves.size(); leafIndex ++){


        //leaves.at(leafIndex)->print();

        string accession = leaves.at(leafIndex)->getID();

        // Check that this leaf is on the MSA
        bool leafIsInAlignment = false;
        for (int seqIndex = 0; seqIndex < this->get_nseqs(); seqIndex ++){

            Sequence* seq = this->getSequenceAtIndex(seqIndex);
            if (seq->getID().substr(1) == accession){
                leaves.at(leafIndex)->setSequence(seq);
                leafIsInAlignment = true;
                break;
            }

        }

        // Does not match a sequence -> return error
        if (!leafIsInAlignment) return "ERROR: leaf " + accession + " is not in the multiple sequence alignment.";


    }


    return "";

}
       

// Calculate the information weight of each sequence in the aligment, using a tree
void MultipleSequenceAlignment::calculateLeafWeights(PhyloTree* tree){



    vector<PhyloTreeNode*> leaves = tree->getLeaves();
    vector<PhyloTreeNode*> leaves_ordered(leaves.size());


    // Sort the leaves list into the same order as the rows of the MSA
    for (int seqIndex = 0; seqIndex < this->get_nseqs(); seqIndex ++){

        // Find the matching node
        Sequence* seq = this->getSequenceAtIndex(seqIndex);
        PhyloTreeNode* match = nullptr;
        for (int leafIndex = 0; leafIndex < leaves.size(); leafIndex ++){

            string accession = leaves.at(leafIndex)->getID();
            if (seq->getID().substr(1) == accession){
                match = leaves.at(leafIndex);
                break;
            }

        }

        if (match == nullptr) {
            cout << "ERROR: cannot find " << seq->getID().substr(1) << " in the tree" << endl;
            exit(0);
        }


        leaves_ordered.at(seqIndex) = match;


    }



    // Calculate distance between each leaf and the root
    vector<double> distanceToRoot(this->get_nseqs());
    for (int i = 0; i < distanceToRoot.size(); i ++){
        distanceToRoot.at(i) = leaves_ordered.at(i)->getDistanceToRoot();
        //cout << "Distance from " << this->getSequenceAtIndex(i)->getID() << " to root " << distanceToRoot.at(i) << endl;
    }



    // Build a pairwise correlation matrix
    MatrixXd correlation(this->get_nseqs(), this->get_nseqs());
    for (int i = 0; i < this->get_nseqs(); i ++){
        for (int j = 0; j < this->get_nseqs(); j ++){
            correlation(i,j) = 1;
        }
    }

    //cout << correlation << endl;

    // Calculate the distance between each pair of nodes' MRCA and the root
    for (int i = 0; i < this->get_nseqs(); i ++){

        for (int j = i+1; j < this->get_nseqs(); j ++){

            // Find the MRCA of these two leaves
            PhyloTreeNode* mrca = tree->getMRCA(leaves_ordered.at(i), leaves_ordered.at(j));


            // Calculate distance between this node and the root
            double distance_ij = mrca->getDistanceToRoot();


            // Correlation = shared distance^2 / (distance1 * distance2)
            correlation(i,j) = (distance_ij * distance_ij) / (distanceToRoot.at(i) * distanceToRoot.at(j));
            correlation(j,i) = correlation(i,j);

        }


    }



    // The weight of sequence i is the sum of all entries in row i of the inverse of the correlation matrix
    MatrixXd correlation_inverse = correlation.inverse();
    //cout << correlation_inverse << endl;

    for (int i = 0; i < this->get_nseqs(); i ++){

        double weight_i = 0;
        for (int j = 0; j < this->get_nseqs(); j ++){
            weight_i += correlation_inverse(i,j);
        }


        this->alignment.at(i)->set_weight(weight_i);

    }


} 