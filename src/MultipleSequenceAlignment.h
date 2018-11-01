

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
#include "Plots.h"
#include "PhyloTree.h"


#include <string>
#include <list>
#include <vector>

using namespace std;

class MultipleSequenceAlignment{


    vector<Sequence*> alignment;
    vector<vector<bool>*> pauseSitesInAlignment;
    int nsites;
    int currentSequenceForSimulation;
    bool initialisedSimulator;
    

    public:
        MultipleSequenceAlignment();
        int get_nseqs();
        int get_nsites();
        string parseFromFasta(string fasta);
        string parseFromFastaFile(string filename);
        string toJSON();
        void clear();
        void PhyloPause();
        void PhyloPause_GUI(Simulator* simulator, int* result);
        string getCurrentSequence();
        string pauseSites_toJSON();
        vector<vector<bool>*> get_pauseSitesInAlignment();
        Sequence* getSequenceAtIndex(int index);
        void calculateLeafWeights(PhyloTree* tree);
        string treeTipNamesAreConsistentWithMSA(PhyloTree* tree); // Check that the leaf sequence names are the same as those in the multiple sequence alignment
        


};



#endif
