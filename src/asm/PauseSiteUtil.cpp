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



