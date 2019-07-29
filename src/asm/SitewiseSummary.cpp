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


#include "SitewiseSummary.h"

#include <iostream>
#include <vector>
#include <list>
#include <string>
#include <map>


using namespace std;

SitewiseSummary::SitewiseSummary(Sequence* sequence){

    this->ntrialsElapsed = 0;
    this->sequence = sequence;
    this->RNA_ratchet_site.resize(sequence->get_templateSequence().size());
    this->RNA_ratchet_site_declared.resize(sequence->get_templateSequence().size());
    this->RNA_induced_hypertranslocation_arrest.resize(sequence->get_templateSequence().size());
    this->RNA_induced_hypertranslocation_arrest_declared.resize(sequence->get_templateSequence().size());
    
    // Set counts to zero and declarations as or false
    for (int i = 0; i < this->RNA_ratchet_site.size(); i ++){
        this->RNA_ratchet_site.at(i) = 0;
        this->RNA_ratchet_site_declared.at(i) = 0;
        this->RNA_induced_hypertranslocation_arrest.at(i) = 0;
        this->RNA_induced_hypertranslocation_arrest_declared.at(i) = 0;
        
    }
    

}



// Upon beginning a new trial, set all site declarations to false so that we don't increment a count 2x in one trial
void SitewiseSummary::nextTrial(){
    this->ntrialsElapsed ++;
    for (int i = 0; i < this->RNA_ratchet_site_declared.size(); i ++){
        this->RNA_ratchet_site_declared.at(i) = 0;
        this->RNA_induced_hypertranslocation_arrest_declared.at(i) = 0;
    }
}


// Increment the count at this site, unless it has already been declared this trial
void SitewiseSummary::declare_ratchet_at_site(int site){
    if (!this->RNA_ratchet_site_declared.at(site-1)) {
    
        //cout << "RNA ratchet at len " << site << endl;
    
        this->RNA_ratchet_site.at(site-1) = this->RNA_ratchet_site.at(site-1) + 1;
        this->RNA_ratchet_site_declared.at(site-1) = 1;
    }

}


// Increment the count at this site, unless it has already been declared this trial
void SitewiseSummary::declare_RNA_arrest_at_site(int site){

    //cout << "RNA blockade induced arrest at len " << site << endl;

    if (!this->RNA_induced_hypertranslocation_arrest_declared.at(site-1)) {
        this->RNA_induced_hypertranslocation_arrest.at(site-1) = this->RNA_induced_hypertranslocation_arrest.at(site-1) + 1;
        this->RNA_induced_hypertranslocation_arrest_declared.at(site-1) = 1;
    }

}


// Get the probability of each site having a ratchet
vector<double> SitewiseSummary::get_ratchet_prob(){

    vector<double> probabilities(this->RNA_ratchet_site.size());
    
    for (int i = 0; i < probabilities.size(); i ++){
        probabilities.at(i) = 1.0 * this->RNA_ratchet_site.at(i) / this->ntrialsElapsed;
    }
    
    return probabilities;

}



// Get the probability of each site having an RNA blockade induced hypertranslocation arrest
vector<double> SitewiseSummary::get_RNA_arrest_prob(){

    vector<double> probabilities(this->RNA_induced_hypertranslocation_arrest.size());

    for (int i = 0; i < probabilities.size(); i ++){
        probabilities.at(i) = 1.0 * this->RNA_induced_hypertranslocation_arrest.at(i) / this->ntrialsElapsed;
    }
    
    return probabilities;
    
}



// Clears all vectors
void SitewiseSummary::clear(){
    this->RNA_ratchet_site.clear();
    this->RNA_induced_hypertranslocation_arrest.clear();
}