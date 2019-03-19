

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



#include "Sequence.h"
#include "Settings.h"
#include <algorithm>

using namespace std;

Sequence::Sequence(string seqID, string TemplateType, string PrimerType, string templateSequence){

	this->seqID = seqID;
	this->nascent_RNA = PrimerType.substr(2) == "RNA";
	this->template_RNA = TemplateType.substr(2) == "RNA";
	this->nascent_SS = PrimerType.substr(0,2) == "ss";
	this->template_SS = TemplateType.substr(0,2) == "ss";

	this->templateSequence = this->correctSequence(templateSequence, this->template_RNA);
	if (!this->template_SS) this->complementSequence = Settings::complementSeq(this->templateSequence, this->template_RNA);
	else this->complementSequence = "";

	this->rateTableBuilt = false;
	this->RNAunfoldingTableBuilt = false;
	this->translocationRatesCache = new TranslocationRatesCache();

    this->MSAsequence = "";
    this->nsitesMSA = 0;
}

// MSA sequence (gaps allowed)
Sequence::Sequence(string seqID, string MSAsequence){

    this->seqID = seqID;
    this->nascent_RNA = true;
    this->template_RNA = false;
    this->nascent_SS = true;
    this->template_SS = false;

    this->MSAsequence = MSAsequence;

    // The sequence parsed is the nascent sequence not the template sequence
    this->complementSequence = this->correctSequence(MSAsequence, this->template_RNA);
    this->templateSequence = Settings::complementSeq(this->complementSequence, this->template_RNA);

    this->rateTableBuilt = false;
    this->RNAunfoldingTableBuilt = false;
    this->translocationRatesCache = new TranslocationRatesCache();

    this->nsitesMSA = this->MSAsequence.size();

}


// Instruct the sequence to rebuild the rate table next time requested
void Sequence::flagForRateTableRebuilding(){
	this->rateTableBuilt = false;
}

// Instruct the sequence to rebuild the RNA unfolding table next time requested
void Sequence::flagForUnfoldingTableRebuilding(){
	this->RNAunfoldingTableBuilt = false;
}




// Initialise the translocation rates table for this sequence
void Sequence::initRateTable(){

	if (this->rateTableBuilt) return;
	//cout << "Initialising rate tables for " << seqID << endl;
	this->translocationRatesCache->initTranslocationRates(this->templateSequence);
	Settings::renormaliseParameters();
   	this->rateTableBuilt = true;
}


// Delete the rate table for this sequence to clear some memory
void Sequence::deconstructRateTable(){
    if (!this->rateTableBuilt) return;
    this->translocationRatesCache->clear();
    this->flagForRateTableRebuilding();
}

void Sequence::clear(){
    this->translocationRatesCache->clear();
    delete this->translocationRatesCache;

}


// Initialise the RNA unfolding barrier heights table for this sequence
void Sequence::initRNAunfoldingTable(){

	if (this->RNAunfoldingTableBuilt) return;
	//cout << "Initialising unfolding tables for " << seqID << endl;
	
	this->translocationRatesCache->buildUpstreamRNABlockadeTable(this->templateSequence); 
   	this->translocationRatesCache->buildDownstreamRNABlockadeTable(this->templateSequence);
   	this->RNAunfoldingTableBuilt = true;
}


// Get the mean translocation barrier height for this sequence
double Sequence::getMeanTranslocationBarrierHeight(){
	return this->translocationRatesCache->get_meanGibbsEnergyBarrier();
}


// Remove newlines and gaps from sequence and replace A with U (if RNA) or U with A (if DNA), and any non matches with X
string Sequence::correctSequence(string seq, bool isRNA){
	if (isRNA) replace(seq.begin(), seq.end(), 'T', 'U');
	else replace(seq.begin(), seq.end(), 'U', 'T');
	seq.erase(remove(seq.begin(), seq.end(), '\n'), seq.end());
    seq.erase(remove(seq.begin(), seq.end(), '-'), seq.end());
	return seq;
}


string Sequence::toJSON(){
	string nascentType = string(this->nascent_SS ? "ss" : "ds") + string(this->nascent_RNA ? "RNA" : "DNA");
	string templateType = string(this->template_SS ? "ss" : "ds") + string(this->template_RNA ? "RNA" : "DNA");
	string parametersJSON = "'" + seqID  + "':{'seq':'" + this->templateSequence + "','template':'" + templateType + "','primer':'" + nascentType + "','MSAsequence':'" + this->MSAsequence + "'";
    
    if (this->true_pauseSites.size() > 0){
        
        parametersJSON += ",'true_pauseSites':[";
        for (int i = 0; i < this->true_pauseSites.size(); i ++){
             parametersJSON += to_string(this->true_pauseSites.at(i));
             if (i < this->true_pauseSites.size() - 1) parametersJSON += ",";
        }
        
        parametersJSON += "]";
    
    }
    
    parametersJSON += "}";
    return parametersJSON;
}


void Sequence::print(){
	string nascentType = string(this->nascent_SS ? "ss" : "ds") + string(this->nascent_RNA ? "RNA" : "DNA");
	string templateType = string(this->template_SS ? "ss" : "ds") + string(this->template_RNA ? "RNA" : "DNA");
	cout << this->seqID << "; TemplateType: " << templateType << "; PrimerType: " << nascentType << endl;
	cout << this->complementSequence << endl;
	cout << this->templateSequence << endl << endl;
}

TranslocationRatesCache* Sequence::getRatesCache(){
	return this->translocationRatesCache;
}

string Sequence::getID(){
	return this->seqID;
}

string Sequence::get_templateSequence(){
	return this->templateSequence;
}
string Sequence::get_complementSequence(){
	return this->complementSequence;
}


string Sequence::get_templateType(){
	string templateType = string(this->template_SS ? "ss" : "ds") + string(this->template_RNA ? "RNA" : "DNA");
	return templateType;
}

void Sequence::setID(string id){
    this->seqID = id;
}


string Sequence::get_primerType(){
	string nascentType = string(this->nascent_SS ? "ss" : "ds") + string(this->nascent_RNA ? "RNA" : "DNA");
	return nascentType;
}



bool Sequence::nascentIsRNA(){
	return this->nascent_RNA;
}
bool Sequence::templateIsRNA(){
	return this->template_RNA;
}
bool Sequence::nascentIsSS(){
	return this->nascent_SS;
}
bool Sequence::templateIsSS(){
	return this->template_SS;
}


int Sequence::get_nsitesMSA(){
    return this->nsitesMSA;
}

string Sequence::get_MSAsequence(){
    return this->MSAsequence;
}




// Set the true known locations of pause sites. Return an error if there are problems
string Sequence::set_true_pauseSites(list<int> pauses){

    vector<int> temp{ std::begin(pauses), std::end(pauses) };
    this->true_pauseSites = temp;
    sort(this->true_pauseSites.begin(), this->true_pauseSites.end()); 
    for (int i = 0; i < this->true_pauseSites.size(); i ++ ){
        int pauseSite = this->true_pauseSites.at(i);
        if (pauseSite <= 0 || pauseSite > this->templateSequence.size()) return "ERROR: pause site " + to_string(pauseSite) + " is out of range for " + this->seqID;    
    }
    
    return "";

}