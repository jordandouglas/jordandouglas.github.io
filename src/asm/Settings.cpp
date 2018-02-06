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


#include "Settings.h"
#include "Model.h"
#include "ExperimentalData.h"
#include "TranslocationRatesCache.h"



#include <locale> 
#include <random>
#include <string>
#include <iostream>
#include <vector>
#include <sstream>
#include <iterator>
#include <numeric>
#include <math.h>
#include <cmath>
#include <list>

using namespace std;


// Constants
const int INF = 100000000;
const double _RT = 0.6156;
const double _kBT = 1.380649e-23 * 310;
const double _preExp = 1e6;	
const double _PI = 3.14159265359;	


// Command line arguments
string outputFilename = "";
string inputXMLfilename = "";
bool isWASM = false;



// Sequence information
int ntrials_sim = 1000;
map<string, Sequence*> sequences;
Sequence* currentSequence;
string seqID = "";
string templateSequence = "";
string complementSequence = "";
string TemplateType = "dsDNA";
string PrimerType = "ssRNA";


// ABC settings
string inferenceMethod = "MCMC";
int ntrials_abc = 2000000;
int testsPerData = 32;
int _testsPerData_preburnin = -1; // Number of trials per datapoint prior to achieving burnin
double _chiSqthreshold_min = 10;
double _chiSqthreshold_0 = 1000;
double _chiSqthreshold_gamma = 0.999;
int burnin = 10; 
int logEvery = 100;
int N_THREADS = 1;


// Experimental data
list<ExperimentalData> experiments;
int _numExperimentalObservations = 0;


// Models
list<Model> modelsToEstimate;
Model* currentModel = new Model();


// Parameters
Parameter* NTPconc = new Parameter("NTPconc", false, "inclusive", "[NTP] (\u03bcM)", "Cellular concentration of NTP");
Parameter* ATPconc = new Parameter("ATPconc", false, "inclusive", "[ATP] (\u03bcM)", "Cellular concentration of ATP");
Parameter* CTPconc = new Parameter("CTPconc", false, "inclusive", "[CTP] (\u03bcM)", "Cellular concentration of CTP");
Parameter* GTPconc = new Parameter("GTPconc", false, "inclusive", "[GTP] (\u03bcM)", "Cellular concentration of GTP");
Parameter* UTPconc = new Parameter("UTPconc", false, "inclusive", "[UTP] (\u03bcM)", "Cellular concentration of UTP");
Parameter* FAssist = new Parameter("FAssist", false, "false", "Force  (pN)", "Assisting force applied to the polymerase during single-molecule experiments.");

Parameter* hybridLen = new Parameter("hybridLen", true, "exclusive", "Hybrid length (bp)", "Number of base pairs inside the polymerase");
Parameter* bubbleLeft = new Parameter("bubbleLeft", true, "exclusive", "Bubble length left (bp)", "Number of unpaired template bases 3' of the hybrid");
Parameter* bubbleRight = new Parameter("bubbleRight", true, "exclusive", "Bubble length right (bp)", "Number of unpaired template bases 5' of the hybrid");

Parameter* GDagSlide = new Parameter("GDagSlide", false, "false", "\u0394\u0394G\u2020t", "Free energy barrier height of translocation");
Parameter* DGPost = new Parameter("DGPost", false, "false", "\u0394\u0394Gt1", "Free energy added on to posttranslocated ground state");
Parameter* barrierPos = new Parameter("barrierPos", false, "false", "Barrier height position  (\u212B)", "Position of translocation intermediate state");
Parameter* arrestTime = new Parameter("arrestTime", false, "inclusive", "Arrest timeout  (s)", "Maximum pause duration before the simulation is arrested. Set to zero to prevent arrests.");
Parameter* kCat = new Parameter("kCat", false, "inclusive", "Rate of catalysis (s\u207B\u00B9)", "Rate constant of catalysing bound NTP");
Parameter* Kdiss = new Parameter("Kdiss", false, "exclusive", "KD (\u03bcM)", "Dissociation constant of NTP");
Parameter* RateBind = new Parameter("RateBind", false, "inclusive", "Rate of binding  (\u03bcM\u207B\u00B9 s\u207B\u00B9)", "Second order rate constant of binding the correct NTP");

vector<Parameter*> Settings::paramList(16);

CRandomMersenne* Settings::SFMT;


// User interface information
bool stop = false;
bool needToReinitiateAnimation = false;
Simulator* interfaceSimulator; // The simulator object being used by the GUI
chrono::system_clock::time_point interfaceSimulation_startTime = chrono::system_clock::now();


void Settings::init(){


	// Create mersenne twister
	random_device rd; 
	SFMT = new CRandomMersenne(rd());


	// Set the parameters to their default values
	NTPconc->setDistributionParameter("fixedDistnVal", 1000);
	ATPconc->setDistributionParameter("fixedDistnVal", 3152)->hide();
	CTPconc->setDistributionParameter("fixedDistnVal", 278)->hide();
	GTPconc->setDistributionParameter("fixedDistnVal", 468)->hide();
	UTPconc->setDistributionParameter("fixedDistnVal", 567)->hide();
	FAssist->setDistributionParameter("fixedDistnVal", 0);

	hybridLen->setDistributionParameter("fixedDistnVal", 9);
	bubbleLeft->setDistributionParameter("fixedDistnVal", 2);
	bubbleRight->setDistributionParameter("fixedDistnVal", 1);

	GDagSlide->setDistributionParameter("fixedDistnVal", 9)->setDistributionParameter("uniformDistnLowerVal", 9)->setDistributionParameter("uniformDistnUpperVal", 15);
	DGPost->setDistributionParameter("fixedDistnVal", 0);
	barrierPos->setDistributionParameter("fixedDistnVal", 1.7);
	barrierPos->setDistributionParameter("upperVal", 3.4);

	kCat->setDistributionParameter("fixedDistnVal", 30)->setDistributionParameter("lognormalMeanVal", 3.454)->setDistributionParameter("lognormalSdVal", 0.587);
	Kdiss->setDistributionParameter("fixedDistnVal", 35);
	RateBind->setDistributionParameter("fixedDistnVal", 250);

	arrestTime->setDistributionParameter("fixedDistnVal", 600);


	
	// Populate the list of parameters
	paramList.at(0) = NTPconc;
	paramList.at(1) = ATPconc;
	paramList.at(2) = CTPconc;
	paramList.at(3) = GTPconc;
	paramList.at(4) = UTPconc;
	paramList.at(5) = FAssist;

	paramList.at(6) = hybridLen;
	paramList.at(7) = bubbleLeft;
	paramList.at(8) = bubbleRight;
	paramList.at(9) = GDagSlide;
	paramList.at(10) = DGPost;
	paramList.at(11) = barrierPos;
	paramList.at(12) = arrestTime;
	paramList.at(13) = kCat;
	paramList.at(14) = Kdiss;
	paramList.at(15) = RateBind;


	// Create sequence objects
	Sequence* seq = new Sequence("Buchnera aphidicola murC1 EU274658", "dDNA", "ssRNA", "GGAAGACTATTAGGTCTTTAATATCGTCGATTTTTTTTTTGTAAGGATATGATAATTCTCGACTTTA");
	sequences[seq->getID()] = seq;

	seq = new Sequence("E.coli lacZ gene GU063697", "dDNA", "ssRNA", "TACTTTCGACCGATGTCCTTCCGGTCTGCGCTTAATAAAAACTACCGCAATTGAGCCGCAAAGTAGACACCACGTTGCCCGCGACCCAGCCAATGCCGGTCCTGTCAGCAAACGGCAGACTTAAACTGGACTCGCGTAAAAATGCGCGGCCTCTTTTGGCGGAGCGCCACTACCACGACGCGACCTCACTGCCGTCAATAGACCTTCTAGTCCTATACACCGCCTACTCGCCGTAAAAGGCACTGCAGAGCAACGACGTATTTGGCTGATGTGTTTAGTCGCTAAAGGTACAACGGTGAGCGAAATTACTACTAAAGTCGGCGCGACATGACCTCCGACTTCAAGTCTACACGCCGCTCAACGCACTGATGGATGCCCATTGTCAAAGAAATACCGTCCCACTTTGCGTCCAGCGGTCGCCGTGGCGCGGAAAGCCGCCACTTTAATAGCTACTCGCACCACCAATACGGCTAGCGCAGTGTGATGCAGACTTGCAGCTTTTGGGCTTTGACACCTC");
	sequences[seq->getID()] = seq;

	seq = new Sequence("E.coli rpoB KP670789", "dDNA", "ssRNA", "TACCAAATGAGGATATGGCTCTTTTTTGCATAAGCATTCCTAAAACCATTTGCAGGTGTTCAAGACCTACATGGAATAGAGGAAAGATAGGTCGAACTGAGCAAAGTCTTTAAATAGCTCGTTCTAGGACTTCCCGTCATACCAGACCTTCGACGAAAGGCAAGGCATAAGGGCTAAGTCTCGATGTCGCCATTAAGGCTCGACGTTATGCAGTCGATGGCGGAACCGCTTGGCCACAAACTGCAGGTCCTTACAGTTTAGGCACCGCACTGGATAAGGCGTGGCGACGCGCAATTTGACGCAGACCACTAGATACTCGCGCTTCGCGGCCTTCCGTGGCATTTTCTGTAATTTCTTGTTCTTCAGATGTACCCGCTTTAAGGCGAGTACTGTCTGTTGCCATGGAAACAATAGTTGCCATGACTCGCACAATAGCAAAGGGTCGACGTGGCATCAGGCCCGCAGAAGAAACTGAGGCTGTTTCCATTTTGGGTGAGAAGCCCATTTCACGACATATTGCGCGCATAGTAGGGAATGGCACCAAGGACCGACCTGAAGCTTAAGCTAGGCTTCCTGTTGGACAAGCATGCATAGCTGGCAGCGGCATTTGACGGACGCTGGTAGTAAGACGCGCGGGACTTGATGTGGTGTCTCGTCTAGGAGCTGGACAAGAAACTTTTTCAATAGAAACTTTAGGCACTATTGTTCGACGTCTACCTTGACCACGGCCTTGCGGACGCACCACTTTGGCGTAGAAAACTGTAGCTTCGATTGCCATTTCACATGCATCTTTTTCCGGCGGCATAGTGACGCGCGGTGTAAGCGGTCGACCTTTTTCTGCTGCAGTTTGACTAGCTTCAGGGCCAACTCATGTAGCGTCCATTTCACCAACGATTTCTGATATAACTACTCAGATGGCCGCTCGACTAGACGCGTCGCTTGTACCTCGACTCGGACCTAGACGACCGATTCGACTCGGTCAGACCAGTGTTCGCATAGCTTTGCGACAAGTGGTTGCTAGACCTAGTGCCGGGTATATAGAGACTTTGGAATGCACAGCTGGGTTGATTGCTGGCAGACTCGCGTGACCATCTTTAGATGGCGTACTACGCGGGACCGCTCGGCGGCTGAGCACTTCGTCGACTTTCGGACAAGCTCTTGGACAAGAAGAGGCTTCTGGCAATACTGAACAGACGCCAACCAGCATACTTCAAGTTGGCAAGAGACGACGCGCTTCTTTAGCTTCCAAGGCCATAGGACTCGTTTCTGCTGTAGTAACTACAATACTTTTTCGAGTAGCTATAGGCATTGCCATTTCCGCTTCAGCTACTATAGCTGGTGGAGCCGTTGGCAGCATAGGCAAGGCAACCGCTTTACCGCCTTTTGGTCAAGGCGCAACCGGACCATGCACATCTCGCACGCCACTTTCTCGCAGACAGAGACCCGCTAGACCTATGGGACTACGGTGTCCTATACTAGTTGCGGTTCGGCTAAAGGCGTCGTCACTTTCTCAAGAAGCCAAGGTCGGTCGACAGAGTCAAATACCTGGTCTTGTTGGGCGACAGACTCTAATGCGTGTTTGCAGCATAGAGGCGTGAGCCGGGTCCGCCAGACTGGGCACTTGCACGTCCGAAGCTTCAAGCTCTGCATGTGGGCTGAGTGATGCCAGCGCATACAGGTTAGCTTTGGGGACTTCCAGGCTTGTAGCCAGACTAGTTGAGAGACAGGCACATGCGTGTCTGATTGCTTATGCCGAAGGAACTCTGAGGCATAGCATTTCACTGGCTGCCACAACATTGACTGCTTTAAGTGATGGACAGACGATAGCTTCTTCCGTTGATGCAATAGCGGGTCCGCTTGAGGTTGAACCTACTTCTTCCGGTGAAGCATCTTCTGGACCATTGAACGGCATCGTTTCCGCTTAGGTCGAACAAGTCGGCGCTGGTCCAACTGATGTACCTGCATAGGTGGGTCGTCCACCATAGGCAGCCACGCAGGGACTAGGGCAAGGACCTTGTGCTACTGCGGTTGGCACGTAACTACCCACGCTTGTACGTTGCAGTCCGGCAAGGCTGAGACGCGCGACTATTCGGCGACCAACCATGACCATACCTTGCACGACAACGGCAACTGAGGCCACATTGACGCCATCGATTTGCACCACCACAGCAAGTCATGCACCTACGAAGGGCATAGCAATAGTTTCAATTGCTTCTGCTCTACATAGGCCCACTTCGTCCATAGCTGTAGATGTTGGACTGGTTTATGTGGGCAAGATTGGTCTTGTGGACATAGTTGGTCTACGGCACACACAGAGACCCACTTGGCCAACTTGCACCGCTGCACGACCGTCTGCCAGGCAGGTGGCTGGAGCCACTTGACCGCGAACCAGTCTTGTACGCGCATCGCAAGTACGGCACCTTACCAATGTTGAAGCTTCTGAGGTAGGAGCATAGGCTCGCACAACAAGTCCTTCTGGCAAAGTGGTGGTAGGTGTAAGTCCTTGACCGCACACACAGGGCACTGTGGTTCGACCCAGGCCTTCTCTAGTGGCGACTGTAGGGCTTGCACCCACTTCGACGCGAGAGGTTTGACCTACTTAGGCCATAGCAAATGTAACCACGCCTTCACTGGCCACCGCTGTAAGACCAACCATTCCATTGCGGCTTTCCACTTTGAGTCGACTGGGGTCTTCTTTTTGACGACGCACGCTAGAAGCCACTCTTTCGGAGACTGCAATTTCTGAGAAGAGACGCGCATGGTTTGCCACATAGGCCATGCCAATAGCTGCAAGTCCAGAAATGAGCGCTACCGCATCTTTTTCTGTTTGCACGCGACCTTTAGCTTCTTTACGTCGAGTTTGTCCGCTTCTTTCTGGACAGACTTCTTGACGTCTAGGAGCTTCGCCCAGACAAGTCGGCATAGGCACGACACGACCATCGGCCACCGCAACTTCGACTCTTCGAGCTGTTTGACGGCGCGCTAGCGACCGACCTCGACCCGGACTGTCTGCTTCTCTTTGTTTTAGTCGACCTTGTCGACCGACTCGTCATACTGCTTGACTTTGTGCTCAAGCTCTTCTTTGAGCTTCGCTTTGCGGCGTTTTAGTGGGTCCCGCTGCTAGACCGTGGCCCGCACGACTTCTAACAATTCCATATAGACCGCCAATTTGCGGCATAGGTCGGACCACTGTTCTACCGTCCAGCAGTGCCATTGTTCCCACATTAAAGATTCTAGTTGGGCTAGCTTCTATACGGAATGCTACTTTTGCCATGCGGCCATCTGTAGCATGACTTGGGCGACCCGCATGGCAGAGCATACTTGTAGCCAGTCTAGGAGCTTTGGGTGGACCCATACCGACGCTTTCCATAGCCGCTGTTCTAGTTGCGGTACGACTTTGTCGTCGTTCTTCAGCGCTTTGACGCGCTTAAGTAGGTCGCACGCATGCTAGACCCGCGACTGCAAGCAGTCTTTCAACTGGACTCATGGAAGTCGCTACTTCTTCAATACGCAGACCGACTTTTGGACGCGTTTCCATACGGTTAGCGTTGCGGCCACAAGCTGCCACGCTTTCTTCGTCTTTAATTTCTCGACGACTTTGAACCGCTGGACGGCTGAAGGCCAGTCTAGGCGGACATGCTACCAGCGTGACCACTTGTCAAGCTCGCAGGCCATTGGCAACCAATGTACATGTACGACTTTGACTTGGTGGACCAGCTGCTGTTCTACGTGCGCGCAAGGTGGCCAAGAATGTCGGACCAATGAGTCGTCGGCGACCCACCATTCCGTGTCAAGCCACCAGTCGCAAAGCCCCTCTACCTTCACACCCGCGACCTTCGTATGCCGCGTCGTATGTGGGACGTCCTTTACGAGTGGCAATTCAGACTACTGCACTTGCCAGCATGGTTCTACATATTTTTGTAGCACCTGCCGTTGGTAGTCTACCTCGGCCCGTACGGTCTTAGGAAGTTGCATAACAACTTTCTCTAAGCAAGCGACCCATAGTTGTAGCTTGACCTTCTGCTCATT");
	sequences[seq->getID()] = seq;

	setSequence("Buchnera aphidicola murC1 EU274658");


}


bool Settings::setSequence(string seqID){

	if (sequences.find(seqID) == sequences.end()) return false;
	currentSequence = sequences[seqID];
	seqID = currentSequence->getID();
	templateSequence = currentSequence->get_templateSequence();
	complementSequence = currentSequence->get_complementSequence();
	TemplateType = currentSequence->get_templateType();
	PrimerType = currentSequence->get_primerType();


    // Build the rates table
   	TranslocationRatesCache::buildTranslocationRateTable(); 
   	TranslocationRatesCache::buildBacktrackRateTable();

	return true;

}


// Loads the current settings into a JSON string for use by javascript
string Settings::toJSON(){

	string parametersJSON = "";
	parametersJSON += "seq:{seqID:" + seqID + ",seq:" + templateSequence + ",template:" + TemplateType + ",primer:" + PrimerType + "},";
	parametersJSON += "model:{" + currentModel->getJSON() + "},";
	parametersJSON += "N:" + to_string(ntrials_sim) + ",";
	parametersJSON += "speed:hidden";

	return parametersJSON;

}

void Settings::print(){

	cout << "\n---Settings---" << endl;
	cout << seqID << "; TemplateType: " << TemplateType << "; PrimerType: " << PrimerType << endl;
	cout << complementSequence << endl;
	cout << templateSequence << endl << endl;

	// Print all models
	cout << "Models:" << endl;
	for (list<Model>::iterator it = modelsToEstimate.begin(); it != modelsToEstimate.end(); ++it){
		(*it).print();
	}

	// Print parameters
	cout << "Parameters:" << endl;

	if (currentModel->get_useFourNTPconcentrations()){
		ATPconc->print();
		CTPconc->print();
		GTPconc->print();
		UTPconc->print();
	}
	else NTPconc->print();
	FAssist->print();

	hybridLen->print();
	bubbleLeft->print();
	bubbleRight->print();
	GDagSlide->print();
	DGPost->print();
	barrierPos->print();

	arrestTime->print();
	kCat->print();
	Kdiss->print();
	RateBind->print();


	cout << endl << endl;



	cout << "ABC settings: ntrials = " << ntrials_abc << "; testsPerData = " << testsPerData << "; testsPerData_preburnin = " << _testsPerData_preburnin << "; _chiSqthreshold_min = " << _chiSqthreshold_min << "; _chiSqthreshold_0 = " << _chiSqthreshold_0 << "; _chiSqthreshold_gamma = " << _chiSqthreshold_gamma << "; burnin = " << burnin << "; logEvery = " << logEvery << endl;
	for (list<ExperimentalData>::iterator it=experiments.begin(); it != experiments.end(); ++it){
    	(*it).print();
    }


	cout << "--------------\n" << endl;

}



double Settings::rexp(double rate){
	return -log(runif()) / rate;
}


double Settings::runif(){
	return SFMT->Random();
}


double Settings::wrap(double x, double a, double b){
	return fmod((x - a),(b - a)) + a;
}


// Normal PDF
double Settings::getNormalDensity(double x, double mu, double sigma, double lowerVal, double upperVal){

	// If there is an upper/lower limit will need to renormalise
	double normaliseBy = 1;
	if (lowerVal != -INFINITY) normaliseBy -= Settings::getNormalCDF(lowerVal, mu, sigma);
	if (upperVal !=  INFINITY) normaliseBy -= Settings::getNormalCDF(upperVal, mu, sigma);

	double density = 1 / (sqrt(2 * _PI * sigma * sigma)) * exp(-(x-mu) * (x-mu) / (2 * sigma * sigma));
	return density / normaliseBy;
}


// Normal CDF
double Settings::getNormalCDF(double x, double mu, double sigma){
	return 0.5 * (1 - erf(-(x-mu)/(sigma*sqrt(2))));
}


/*
// Lognormal PDF
double Settings::getLognormalDensity(double x, double mu, double sigma, double lowerVal, double upperVal){

	// If there is an upper/lower limit will need to renormalise
	double normaliseBy = 1;
	if (lowerVal < 0) normaliseBy -= Settings::getNormalCDF(lowerVal, mu, sigma);
	if (upperVal !=  INFINITY) normaliseBy -= Settings::getNormalCDF(upperVal, mu, sigma);

	double density = 1 / (sqrt(2 * _PI * sigma * sigma)) * exp(-(x-mu) * (x-mu) / (2 * sigma * sigma));
	return density / normaliseBy;

}

// Lognormal CDF
double Settings::getLognormalCDF(double x, double mu, double sigma){
	return 0.5 + 0.5 * erf( (log(x) - mu) / (sqrt(2) * sigma) ); 
}
*/

void Settings::updateParameterVisibilities(){
	
	// How many NTP concentrations to use
	if (currentModel->get_useFourNTPconcentrations()){
		NTPconc->hide();
		ATPconc->show();
		CTPconc->show();
		GTPconc->show();
		UTPconc->show();
	}else{
		NTPconc->show();
		ATPconc->hide();
		CTPconc->hide();
		GTPconc->hide();
		UTPconc->hide();
	}
	
	
	
	// Translocation at equilibrium?
	if (currentModel->get_assumeTranslocationEquilibrium()){
		barrierPos->hide();
	}else{
		barrierPos->show();
	}
	
	// Binding at equilibrium?
	if (currentModel->get_assumeBindingEquilibrium()){
		RateBind->hide();
	}else{
		RateBind->show();
	}
	
}

string Settings::complementSeq(string orig, bool toRNA){

	locale loc;
	string complement = "";
	for (std::string::size_type i = 0; i<orig.length(); ++i){

		
		char nt = orig[i];
		nt = toupper(nt, loc);
		string nt_str = string(1, nt);
		complement += nt_str == "C" ? "G" : nt_str == "G" ? "C" : (nt_str == "U" || nt_str == "T") ? "A" : (nt_str == "A" && !toRNA) ? "T" : (nt_str == "A" && toRNA) ? "U" : "X";

		//+= Base.equals("C") ? "G" : Base.equals("G") ? "C" : (Base.equals("U") || Base.equals("T")) ? "A" : 
			//(Base.equals("A") && !toRNA) ? "T" : 
			//(Base.equals("A") && toRNA) ? "U" :"X";
	}

	//cout << complement << endl;
	return complement;
		
}



void Settings::clearParameterHardcodings(){

	NTPconc->stopHardcoding();
	ATPconc->stopHardcoding();
	CTPconc->stopHardcoding();
	GTPconc->stopHardcoding();
	UTPconc->stopHardcoding();

	hybridLen->stopHardcoding();
	bubbleLeft->stopHardcoding();
	bubbleRight->stopHardcoding();
	GDagSlide->stopHardcoding();
	DGPost->stopHardcoding();
	barrierPos->stopHardcoding();
	FAssist->stopHardcoding();
	arrestTime->stopHardcoding();
	kCat->stopHardcoding();
	Kdiss->stopHardcoding();
	RateBind->stopHardcoding();

}


// Samples all parameters
void Settings::sampleAll(){

	// Sample all model parameters
	NTPconc->sample();
	ATPconc->sample();
	CTPconc->sample();
	GTPconc->sample();
	UTPconc->sample();

	hybridLen->sample();
	bubbleLeft->sample();
	bubbleRight->sample();
	GDagSlide->sample();
	DGPost->sample();
	barrierPos->sample();
	FAssist->sample();
	arrestTime->sample();
	kCat->sample();
	Kdiss->sample();
	RateBind->sample();


	// Samples a model
	sampleModel();


}


Parameter* Settings::getParameterByName(string paramID){

	if (paramID == "NTPconc") return NTPconc;
	if (paramID == "ATPconc") return ATPconc;
	if (paramID == "CTPconc") return CTPconc;
	if (paramID == "NTPconc") return NTPconc;
	if (paramID == "GTPconc") return GTPconc;
	if (paramID == "FAssist") return FAssist;

	if (paramID == "hybridLen") return hybridLen;
	if (paramID == "bubbleLeft") return bubbleLeft;
	if (paramID == "bubbleRight") return bubbleRight;
	if (paramID == "GDagSlide") return GDagSlide;
	if (paramID == "DGPost") return DGPost;
	if (paramID == "barrierPos") return barrierPos;
	if (paramID == "arrestTime") return arrestTime;
	if (paramID == "kCat") return kCat;
	if (paramID == "Kdiss") return Kdiss;
	if (paramID == "RateBind") return RateBind;

	return nullptr;
}




// Sample a model (may be the same model -> to avoid dealing with hastings ratio)
void Settings::sampleModel(){


	// Delete any parameter hardcodings
	Settings:clearParameterHardcodings();

	double runifNum = Settings::runif();
	double cumsum = 0;
	//if (modelsToEstimate.size() > 1 && currentModel->getID() != "-1") cumsum += currentModel->getPriorProb();

	for (list<Model>::iterator it = modelsToEstimate.begin(); it != modelsToEstimate.end(); ++it){
		//if (modelsToEstimate.size() > 1 && (*it).getID() == currentModel->getID()) continue; // Ensure that current model is not sampled
		cumsum += (*it).getPriorProb();
		if (runifNum < cumsum){
			(*it).activateModel(); // Apply new parameter hardcodings and other model settings
			currentModel = &(*it);
			//cout << "Sampled model " << currentModel->getID() << endl;
			break;
		}
	}



}


void Settings::setModel(string modelID){

	for (list<Model>::iterator it = modelsToEstimate.begin(); it != modelsToEstimate.end(); ++it){
		if ((*it).getID() == modelID) {
			currentModel = &(*it);
			break;
		}
	}

}




vector<std::string> Settings::split(const std::string& s, char delimiter){
   std::vector<std::string> tokens;
   std::string token;
   std::istringstream tokenStream(s);
   while (std::getline(tokenStream, token, delimiter))
   {
      tokens.push_back(token);
   }
   return tokens;
}


