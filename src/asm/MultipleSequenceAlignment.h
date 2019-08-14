

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



#ifndef MSA_H
#define MSA_H

#include "Sequence.h"
#include "Simulator.h"
#include "BayesClassifier.h"
#include "Plots.h"
#include "SimulatorResultSummary.h"
#include "PosteriorDistributionSample.h"

#include <string>
#include <list>
#include <vector>

using namespace std;

class MultipleSequenceAlignment{


    vector<Sequence*> alignment;
    vector<vector<double>> relativeTimePerLengths;
    vector<vector<double>> NBC_evidence_per_site;
    int nsites; // Is it an alignment or just a series of sequences?
    int currentSequenceForSimulation;
    bool initialisedSimulator;
    bool isAlignment; // Is it an alignment or just a series of sequences?
    bool finishedPauser;
    SimulatorResultSummary* current_sequence_summary;

    public:
        MultipleSequenceAlignment();
        int get_nseqs();
        int get_nsites();
        string parseFromFasta(string fasta);
        string parseFromFastaFile(string filename);
        string toJSON();
        void clear();
        void Pauser(BayesClassifier* bayes_classifier, PosteriorDistributionSample* simpol_AUC_calculator, PosteriorDistributionSample* nbc_AUC_calculator);
        void Pauser_GUI(Simulator* simulator, BayesClassifier* bayes_classifier, PosteriorDistributionSample* simpol_AUC_calculator, PosteriorDistributionSample* nbc_AUC_calculator, int* result);
        string getCurrentSequence();
        void classify();
        vector<vector<double>> get_relativeTimePerLengths();
        Sequence* getSequenceAtIndex(int index);
        
        
        void printPauserToFile(string file);
        string getPauserAsString();
        


};



#endif
