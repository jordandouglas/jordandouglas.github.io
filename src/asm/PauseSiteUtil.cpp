﻿/* 
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

#include <iostream>
#include <string>


using namespace std;


double PauseSiteUtil::TCC_THRESHOLD = 3; // Mean time to catalysis (s) required to classify this as a pause site


// Identify which sites in the selected sequences are pause sites, by comparing to a standard
vector<bool>* PauseSiteUtil::identifyPauseSites(Sequence* seq, vector<double> timesToCatalysis) {
    
    string MSAsequence = seq->get_MSAsequence();
    vector<bool>* isPauseSite = new vector<bool>();
    isPauseSite->resize(MSAsequence.size());


    cout << "identifyPauseSites " << MSAsequence.size() << "," << isPauseSite->size() << "," << timesToCatalysis.size() << endl;

    // Which sites in the ALIGNED sequence are pause sites?
    int non_aligned_index = 0;
    for (int alignment_index = 0; alignment_index < isPauseSite->size(); alignment_index++){


        // Gaps cannot be pause sites
        string nt = MSAsequence.substr(alignment_index, 1);
        if (nt == "-") isPauseSite->at(alignment_index) = false;

        else {

            if (non_aligned_index >= timesToCatalysis.size()){
                cout << "ERROR: non_aligned_index >= timesToCatalysis.size(): " << non_aligned_index << "<=" << timesToCatalysis.size() << endl;
                exit(0);
            }


            // Pause site if time-to-catalysis exceeds a threshold
            double TTC = timesToCatalysis.at(non_aligned_index);
            isPauseSite->at(alignment_index) = TTC > PauseSiteUtil::TCC_THRESHOLD;
            non_aligned_index ++;


        }



    }

    return isPauseSite;
    
    
}




 vector<int> PauseSiteUtil::calculateEvidence(MultipleSequenceAlignment* MSA){


    vector<vector<bool>*> pauseSites = MSA->get_pauseSitesInAlignment();

    // Scale from 0 to 3 of evidence strength
    vector<int> evidence(MSA->get_nsites());
    

    for (int alignment_index = 0; alignment_index < MSA->get_nsites(); alignment_index++){


        


        // Calculate phylogenetically weighted evidence that this site is a pause site
        double evidenceAtSite = 0;
        for (int sequence_index = 0;  sequence_index < MSA->get_nseqs(); sequence_index++){


            //cout << "alignment_index " << alignment_index << " sequence_index " << sequence_index << endl;
            Sequence* seq = MSA->getSequenceAtIndex(sequence_index);

            if (pauseSites.at(sequence_index) == nullptr || pauseSites.at(sequence_index) == NULL) continue;

            if (pauseSites.at(sequence_index)->at(alignment_index)) {
                evidenceAtSite += seq->get_weight();
            }
        }

        evidenceAtSite = evidenceAtSite; // /MSA->get_nseqs();
        evidence.at(alignment_index) = evidenceAtSite < 0.5 ? 0 : evidenceAtSite < 1 ? 1 : 2;

    }



    return evidence;


 }

