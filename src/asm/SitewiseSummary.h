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

#ifndef SITEWISESUMMARY_H
#define SITEWISESUMMARY_H


#include "Sequence.h"

#include <string>
#include <vector>
#include <list>


using namespace std;


// Similar to Plots, contains information on each site to perform a sitewise summary of a single Sequence
class SitewiseSummary{


    int ntrialsElapsed;
    Sequence* sequence;
    vector<int> RNA_ratchet_site; // In how many simulations did there exist an RNA blockade which ratcheted the polymerase into elongation, at this site?
    vector<bool> RNA_ratchet_site_declared; // Has the site been declared this trial?
    
    vector<int> RNA_induced_hypertranslocation_arrest; // In how many simulations did there exist an RNA blockade which induced a hypertranslocation arrest, at this site?
    vector<bool> RNA_induced_hypertranslocation_arrest_declared; // Has the site been declared this trial?
    
    
    public:
        SitewiseSummary(Sequence* sequence);
        void clear();
        void nextTrial(); // Reset declarations for trial
        void declare_ratchet_at_site(int site);
        vector<double> get_ratchet_prob();
        void declare_RNA_arrest_at_site(int site);
        vector<double> get_RNA_arrest_prob();

};

#endif