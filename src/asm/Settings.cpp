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
#include <algorithm>
#include <sstream>
#include <iterator>
#include <numeric>
#include <math.h>
#include <cmath>
#include <list>

#include <stdio.h>
#include <string.h>

using namespace std;


// Constants
const int INF = 100000000;
const double _RT = 0.6156;
const double _kBT = 1.380649e-23 * 310;
const double _preExp = 1e6;	
const double _PI = 3.14159265359;	
const int _nBasesToTranscribeInit = 4;


// Command line arguments
string outputFilename = "";
string inputXMLfilename = "";
string _inputLogFileName = "";
string _plotFolderName = "";
bool isWASM = false;
bool _resumeFromLogfile = false;
bool _printSummary = false;
bool _sampleFromLikelihood = false;
bool _marginalModel = false;


// Sequence information
int ntrials_sim = 1000;
map<string, Sequence*> sequences;
Sequence* currentSequence;
string _seqID = "";
string templateSequence = "";
string complementSequence = "";
string TemplateType = "dsDNA";
string PrimerType = "ssRNA";
TranslocationRatesCache* _translocationRatesCache;
vector<Polymerase*> _polymerases;
string _currentPolymerase;


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
Parameter* NTPconc = new Parameter("NTPconc", false, "inclusive", " [NTP] (\u03bcM)", "Cellular concentration of NTP");
Parameter* ATPconc = new Parameter("ATPconc", false, "inclusive", " [ATP] (\u03bcM)", "Cellular concentration of ATP");
Parameter* CTPconc = new Parameter("CTPconc", false, "inclusive", " [CTP] (\u03bcM)", "Cellular concentration of CTP");
Parameter* GTPconc = new Parameter("GTPconc", false, "inclusive", " [GTP] (\u03bcM)", "Cellular concentration of GTP");
Parameter* UTPconc = new Parameter("UTPconc", false, "inclusive", " [UTP] (\u03bcM)", "Cellular concentration of UTP");
Parameter* FAssist = new Parameter("FAssist", false, "false", "Force  (pN)", "Assisting force applied to the polymerase during single-molecule experiments.");

Parameter* hybridLen = new Parameter("hybridLen", true, "exclusive", "Hybrid length (bp)", "Number of base pairs inside the polymerase", "h (bp)");
Parameter* bubbleLeft = new Parameter("bubbleLeft", true, "exclusive", "Bubble length left (bp)", "Number of unpaired template bases 3\u2032 of the hybrid", "\u03B2_{1} (bp)");
Parameter* bubbleRight = new Parameter("bubbleRight", true, "exclusive", "Bubble length right (bp)", "Number of unpaired template bases 5\u2032 of the hybrid", "\u03B2_{2} (bp)");

Parameter* GDagSlide = new Parameter("GDagSlide", false, "false", "\u0394G\u2020\U0001D70F", "Free energy barrier height of translocation", "\u0394G_{\U0001D70F}^{\u2020}  (k_{B}T)");
Parameter* DGPost = new Parameter("DGPost", false, "false", "\u0394G\U0001D70F1", "Free energy added on to posttranslocated ground state", "\u0394G_{\U0001D70F1}  (k_{B}T)");
Parameter* barrierPos = new Parameter("barrierPos", false, "false", "Barrier height position  (\u212B)", "Position of translocation intermediate state", "\u03B4_{1}");
Parameter* arrestTime = new Parameter("arrestTime", false, "inclusive", "Arrest timeout  (s)", "Maximum pause duration before the simulation is arrested. Set to zero to prevent arrests.");
Parameter* kCat = new Parameter("kCat", false, "inclusive", "Rate of catalysis (s\u207B\u00B9)", "Rate constant of catalysing bound NTP", "k_{cat}  (s^{\u22121\u2009})");
Parameter* Kdiss = new Parameter("Kdiss", false, "exclusive", "KD (\u03bcM)", "Dissociation constant of NTP",  "K_{D}  (\u03bcM)");
Parameter* RateBind = new Parameter("RateBind", false, "inclusive", "Rate of binding  (\u03bcM\u207B\u00B9 s\u207B\u00B9)", "Second order rate constant of binding the correct NTP", "k_{bind} (\u03bcM^{\u22121} s^{\u22121\u2009})");

Parameter* RateActivate = new Parameter("kA", false, "inclusive", "Rate of activation (s\u207B\u00B9)", "Rate constant of polymerase leaving the catalytically unactive state", "k_[A]  (s^[\u22121\u2009])");
Parameter* RateDeactivate = new Parameter("kU", false, "inclusive", "Rate of inactivation (s\u207B\u00B9)", "Rate constant of polymerase entering the catalytically unactive state", "k_[cleave]  (s^[\u22121\u2009])");
Parameter* RateCleave = new Parameter("RateCleave", false, "inclusive", "Rate of cleavage (s\u207B\u00B9)", "Rate constant of cleaving the dangling 3\u2032 end of the nascent strand when backtracked", "k_[cleave]  (s^[\u22121\u2009])");


vector<Parameter*> Settings::paramList(19);

CRandomMersenne* Settings::SFMT;


// User interface information
bool _USING_GUI = false;
bool _GUI_STOP = false;
bool _needToReinitiateAnimation = false;
bool _GUI_simulating = false;
bool _applyingReactionsGUI = false;
bool _showRNAfold_GUI = false;
bool _GUI_user_applying_reaction = false;
string _animationSpeed = "medium";
Simulator* _interfaceSimulator; // The simulator object being used by the GUI
State* _currentStateGUI; // The current state displayed on the GUI and used in all GUI simulations
chrono::system_clock::time_point _interfaceSimulation_startTime = chrono::system_clock::now();
SlippageLandscapes* _slippageLandscapesToSendToDOM;



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
	FAssist->setDistributionParameter("fixedDistnVal", 0)->setDistributionParameter("uniformDistnLowerVal", -30)->setDistributionParameter("uniformDistnUpperVal", 30);

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

	RateActivate->setDistributionParameter("fixedDistnVal", 4);
	RateDeactivate->setDistributionParameter("fixedDistnVal", 0.1);
	RateCleave->setDistributionParameter("fixedDistnVal", 0);


	
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
	paramList.at(16) = RateActivate;
	paramList.at(17) = RateDeactivate;
	paramList.at(18) = RateCleave;



	// Create the polymerase objects
	initPolymerases();


}



void Settings::initPolymerases(){


	_polymerases.resize(3);

	Polymerase* ecoliPol = new Polymerase("RNAP", "Escherichia coli RNAP", "dsDNA", "ssRNA");
	Polymerase* yeastPol = new Polymerase("polII", "Saccharomyces cerevisiae RNAP II", "dsDNA", "ssRNA");
	Polymerase* T7pol = new Polymerase("T7pol", "Bacteriophage T7 RNAP", "dsDNA", "ssRNA");


	// Use the default parameters for each polymerase unless specified otherwise
	ecoliPol->setParameters(Settings::getParamListClone());
	yeastPol->setParameters(Settings::getParamListClone());
	T7pol->setParameters(Settings::getParamListClone());

	// E. coli parameters
	ecoliPol->setParameter(GDagSlide->clone()->setDistributionParameter("fixedDistnVal", 9.079));
	ecoliPol->setParameter(DGPost->clone()->setDistributionParameter("fixedDistnVal", -2.007));
	ecoliPol->setParameter(barrierPos->clone()->setDistributionParameter("fixedDistnVal", 2.838));
	ecoliPol->setParameter(kCat->clone()->setDistributionParameter("fixedDistnVal", 25.56));
	ecoliPol->setParameter(Kdiss->clone()->setDistributionParameter("fixedDistnVal", 1.8));
	ecoliPol->setParameter(RateBind->clone()->setDistributionParameter("fixedDistnVal", 0.5448));

	// S. cerevisiae parameters
	yeastPol->setParameter(GDagSlide->clone()->setDistributionParameter("fixedDistnVal", 8.536));
	yeastPol->setParameter(DGPost->clone()->setDistributionParameter("fixedDistnVal", -4.323));
	yeastPol->setParameter(barrierPos->clone()->setDistributionParameter("fixedDistnVal", 2.889));
	yeastPol->setParameter(kCat->clone()->setDistributionParameter("fixedDistnVal", 29.12));
	yeastPol->setParameter(Kdiss->clone()->setDistributionParameter("fixedDistnVal", 72));

	// T7 parameters
	T7pol->setParameter(DGPost->clone()->setDistributionParameter("fixedDistnVal", -4.709));
	T7pol->setParameter(kCat->clone()->setDistributionParameter("fixedDistnVal", 127.3));
	T7pol->setParameter(Kdiss->clone()->setDistributionParameter("fixedDistnVal", 105));


	// Choose the default model settings
	ecoliPol->setModel((new Model())->set_assumeTranslocationEquilibrium(false)->set_assumeBindingEquilibrium(false)->set_allowGeometricCatalysis(false));
	yeastPol->setModel((new Model())->set_assumeTranslocationEquilibrium(false)->set_assumeBindingEquilibrium(true)->set_allowGeometricCatalysis(false));
	T7pol->setModel((new Model())->set_assumeTranslocationEquilibrium(true)->set_assumeBindingEquilibrium(true)->set_allowGeometricCatalysis(false));


	_polymerases.at(0) = ecoliPol;
	_polymerases.at(1) = yeastPol;
	_polymerases.at(2) = T7pol;


	// Activate the E. coli polymerase as the default
	if (_currentPolymerase == "") Settings::activatePolymerase("RNAP");

}


// Activate the selected RNA polymerase
void Settings::activatePolymerase(string polymeraseID){

	cout << "Activating " << polymeraseID << endl;
	for (int i = 0; i < _polymerases.size(); i ++){
		if (_polymerases.at(i)->getID() == polymeraseID){
			_polymerases.at(i)->activatePolymerase();
			_currentPolymerase = polymeraseID;
			return;
		}
	}

	cout << "ERROR: Cannot find polymerase " << polymeraseID << endl;
	exit(0);

}


// TODO: Does not yet recursively clone instances of the Parameters
vector<Parameter*> Settings::getParamListClone(){

	vector<Parameter*> paramListClone(paramList.size());
	for (int i = 0; i < paramList.size(); i ++){
		Parameter* paramClone = paramList.at(i)->clone();
		paramListClone.at(i) = paramClone;
	}

	return paramListClone;

}


void Settings::setParameterList(vector<Parameter*> params){


	Settings::paramList = params;

	// Populate the list of parameters
	NTPconc = paramList.at(0);
	ATPconc = paramList.at(1);
	CTPconc = paramList.at(2);
	GTPconc = paramList.at(3);
	UTPconc = paramList.at(4);
	FAssist = paramList.at(5);

	hybridLen = paramList.at(6);
	bubbleLeft = paramList.at(7);
	bubbleRight = paramList.at(8);
	GDagSlide = paramList.at(9);
	DGPost = paramList.at(10);
	barrierPos = paramList.at(11);
	arrestTime = paramList.at(12);
	kCat = paramList.at(13);
	Kdiss = paramList.at(14);
	RateBind = paramList.at(15);
	RateActivate = paramList.at(16);
	RateDeactivate = paramList.at(17);
	RateCleave = paramList.at(18);



}


void Settings::initSequences(){

	// Create sequence objects
	Sequence* seq = new Sequence("Buchnera aphidicola murC1 EU274658", "dDNA", "ssRNA", "GGAAGACTATTAGGTCTTTAATATCGTCGATTTTTTTTTTGTAAGGATATGATAATTCTCGACTTTA");
	sequences[seq->getID()] = seq;

	seq = new Sequence("E.coli lacZ gene GU063697", "dDNA", "ssRNA", "TACTTTCGACCGATGTCCTTCCGGTCTGCGCTTAATAAAAACTACCGCAATTGAGCCGCAAAGTAGACACCACGTTGCCCGCGACCCAGCCAATGCCGGTCCTGTCAGCAAACGGCAGACTTAAACTGGACTCGCGTAAAAATGCGCGGCCTCTTTTGGCGGAGCGCCACTACCACGACGCGACCTCACTGCCGTCAATAGACCTTCTAGTCCTATACACCGCCTACTCGCCGTAAAAGGCACTGCAGAGCAACGACGTATTTGGCTGATGTGTTTAGTCGCTAAAGGTACAACGGTGAGCGAAATTACTACTAAAGTCGGCGCGACATGACCTCCGACTTCAAGTCTACACGCCGCTCAACGCACTGATGGATGCCCATTGTCAAAGAAATACCGTCCCACTTTGCGTCCAGCGGTCGCCGTGGCGCGGAAAGCCGCCACTTTAATAGCTACTCGCACCACCAATACGGCTAGCGCAGTGTGATGCAGACTTGCAGCTTTTGGGCTTTGACACCTC");
	sequences[seq->getID()] = seq;

	seq = new Sequence("E.coli rpoB KP670789", "dDNA", "ssRNA", "TACCAAATGAGGATATGGCTCTTTTTTGCATAAGCATTCCTAAAACCATTTGCAGGTGTTCAAGACCTACATGGAATAGAGGAAAGATAGGTCGAACTGAGCAAAGTCTTTAAATAGCTCGTTCTAGGACTTCCCGTCATACCAGACCTTCGACGAAAGGCAAGGCATAAGGGCTAAGTCTCGATGTCGCCATTAAGGCTCGACGTTATGCAGTCGATGGCGGAACCGCTTGGCCACAAACTGCAGGTCCTTACAGTTTAGGCACCGCACTGGATAAGGCGTGGCGACGCGCAATTTGACGCAGACCACTAGATACTCGCGCTTCGCGGCCTTCCGTGGCATTTTCTGTAATTTCTTGTTCTTCAGATGTACCCGCTTTAAGGCGAGTACTGTCTGTTGCCATGGAAACAATAGTTGCCATGACTCGCACAATAGCAAAGGGTCGACGTGGCATCAGGCCCGCAGAAGAAACTGAGGCTGTTTCCATTTTGGGTGAGAAGCCCATTTCACGACATATTGCGCGCATAGTAGGGAATGGCACCAAGGACCGACCTGAAGCTTAAGCTAGGCTTCCTGTTGGACAAGCATGCATAGCTGGCAGCGGCATTTGACGGACGCTGGTAGTAAGACGCGCGGGACTTGATGTGGTGTCTCGTCTAGGAGCTGGACAAGAAACTTTTTCAATAGAAACTTTAGGCACTATTGTTCGACGTCTACCTTGACCACGGCCTTGCGGACGCACCACTTTGGCGTAGAAAACTGTAGCTTCGATTGCCATTTCACATGCATCTTTTTCCGGCGGCATAGTGACGCGCGGTGTAAGCGGTCGACCTTTTTCTGCTGCAGTTTGACTAGCTTCAGGGCCAACTCATGTAGCGTCCATTTCACCAACGATTTCTGATATAACTACTCAGATGGCCGCTCGACTAGACGCGTCGCTTGTACCTCGACTCGGACCTAGACGACCGATTCGACTCGGTCAGACCAGTGTTCGCATAGCTTTGCGACAAGTGGTTGCTAGACCTAGTGCCGGGTATATAGAGACTTTGGAATGCACAGCTGGGTTGATTGCTGGCAGACTCGCGTGACCATCTTTAGATGGCGTACTACGCGGGACCGCTCGGCGGCTGAGCACTTCGTCGACTTTCGGACAAGCTCTTGGACAAGAAGAGGCTTCTGGCAATACTGAACAGACGCCAACCAGCATACTTCAAGTTGGCAAGAGACGACGCGCTTCTTTAGCTTCCAAGGCCATAGGACTCGTTTCTGCTGTAGTAACTACAATACTTTTTCGAGTAGCTATAGGCATTGCCATTTCCGCTTCAGCTACTATAGCTGGTGGAGCCGTTGGCAGCATAGGCAAGGCAACCGCTTTACCGCCTTTTGGTCAAGGCGCAACCGGACCATGCACATCTCGCACGCCACTTTCTCGCAGACAGAGACCCGCTAGACCTATGGGACTACGGTGTCCTATACTAGTTGCGGTTCGGCTAAAGGCGTCGTCACTTTCTCAAGAAGCCAAGGTCGGTCGACAGAGTCAAATACCTGGTCTTGTTGGGCGACAGACTCTAATGCGTGTTTGCAGCATAGAGGCGTGAGCCGGGTCCGCCAGACTGGGCACTTGCACGTCCGAAGCTTCAAGCTCTGCATGTGGGCTGAGTGATGCCAGCGCATACAGGTTAGCTTTGGGGACTTCCAGGCTTGTAGCCAGACTAGTTGAGAGACAGGCACATGCGTGTCTGATTGCTTATGCCGAAGGAACTCTGAGGCATAGCATTTCACTGGCTGCCACAACATTGACTGCTTTAAGTGATGGACAGACGATAGCTTCTTCCGTTGATGCAATAGCGGGTCCGCTTGAGGTTGAACCTACTTCTTCCGGTGAAGCATCTTCTGGACCATTGAACGGCATCGTTTCCGCTTAGGTCGAACAAGTCGGCGCTGGTCCAACTGATGTACCTGCATAGGTGGGTCGTCCACCATAGGCAGCCACGCAGGGACTAGGGCAAGGACCTTGTGCTACTGCGGTTGGCACGTAACTACCCACGCTTGTACGTTGCAGTCCGGCAAGGCTGAGACGCGCGACTATTCGGCGACCAACCATGACCATACCTTGCACGACAACGGCAACTGAGGCCACATTGACGCCATCGATTTGCACCACCACAGCAAGTCATGCACCTACGAAGGGCATAGCAATAGTTTCAATTGCTTCTGCTCTACATAGGCCCACTTCGTCCATAGCTGTAGATGTTGGACTGGTTTATGTGGGCAAGATTGGTCTTGTGGACATAGTTGGTCTACGGCACACACAGAGACCCACTTGGCCAACTTGCACCGCTGCACGACCGTCTGCCAGGCAGGTGGCTGGAGCCACTTGACCGCGAACCAGTCTTGTACGCGCATCGCAAGTACGGCACCTTACCAATGTTGAAGCTTCTGAGGTAGGAGCATAGGCTCGCACAACAAGTCCTTCTGGCAAAGTGGTGGTAGGTGTAAGTCCTTGACCGCACACACAGGGCACTGTGGTTCGACCCAGGCCTTCTCTAGTGGCGACTGTAGGGCTTGCACCCACTTCGACGCGAGAGGTTTGACCTACTTAGGCCATAGCAAATGTAACCACGCCTTCACTGGCCACCGCTGTAAGACCAACCATTCCATTGCGGCTTTCCACTTTGAGTCGACTGGGGTCTTCTTTTTGACGACGCACGCTAGAAGCCACTCTTTCGGAGACTGCAATTTCTGAGAAGAGACGCGCATGGTTTGCCACATAGGCCATGCCAATAGCTGCAAGTCCAGAAATGAGCGCTACCGCATCTTTTTCTGTTTGCACGCGACCTTTAGCTTCTTTACGTCGAGTTTGTCCGCTTCTTTCTGGACAGACTTCTTGACGTCTAGGAGCTTCGCCCAGACAAGTCGGCATAGGCACGACACGACCATCGGCCACCGCAACTTCGACTCTTCGAGCTGTTTGACGGCGCGCTAGCGACCGACCTCGACCCGGACTGTCTGCTTCTCTTTGTTTTAGTCGACCTTGTCGACCGACTCGTCATACTGCTTGACTTTGTGCTCAAGCTCTTCTTTGAGCTTCGCTTTGCGGCGTTTTAGTGGGTCCCGCTGCTAGACCGTGGCCCGCACGACTTCTAACAATTCCATATAGACCGCCAATTTGCGGCATAGGTCGGACCACTGTTCTACCGTCCAGCAGTGCCATTGTTCCCACATTAAAGATTCTAGTTGGGCTAGCTTCTATACGGAATGCTACTTTTGCCATGCGGCCATCTGTAGCATGACTTGGGCGACCCGCATGGCAGAGCATACTTGTAGCCAGTCTAGGAGCTTTGGGTGGACCCATACCGACGCTTTCCATAGCCGCTGTTCTAGTTGCGGTACGACTTTGTCGTCGTTCTTCAGCGCTTTGACGCGCTTAAGTAGGTCGCACGCATGCTAGACCCGCGACTGCAAGCAGTCTTTCAACTGGACTCATGGAAGTCGCTACTTCTTCAATACGCAGACCGACTTTTGGACGCGTTTCCATACGGTTAGCGTTGCGGCCACAAGCTGCCACGCTTTCTTCGTCTTTAATTTCTCGACGACTTTGAACCGCTGGACGGCTGAAGGCCAGTCTAGGCGGACATGCTACCAGCGTGACCACTTGTCAAGCTCGCAGGCCATTGGCAACCAATGTACATGTACGACTTTGACTTGGTGGACCAGCTGCTGTTCTACGTGCGCGCAAGGTGGCCAAGAATGTCGGACCAATGAGTCGTCGGCGACCCACCATTCCGTGTCAAGCCACCAGTCGCAAAGCCCCTCTACCTTCACACCCGCGACCTTCGTATGCCGCGTCGTATGTGGGACGTCCTTTACGAGTGGCAATTCAGACTACTGCACTTGCCAGCATGGTTCTACATATTTTTGTAGCACCTGCCGTTGGTAGTCTACCTCGGCCCGTACGGTCTTAGGAAGTTGCATAACAACTTTCTCTAAGCAAGCGACCCATAGTTGTAGCTTGACCTTCTGCTCATT");
	sequences[seq->getID()] = seq;

	seq = new Sequence("HIV-1 LTR WT", "dsDNA", "ssRNA", "CCCAGAGAGACCAATCTGGTCTAGACTCGGACCCTCGAGAGACCGATCGATCCCTTGGGTGACGAATTCGGAGTTATTTCGAA");
	sequences[seq->getID()] = seq;

	seq = new Sequence("HIV-1 LTR 50", "dsDNA", "ssRNA", "CCCAGAGAGACCAATCTGGTCTAGACTCGGACCCTCGAGAGACCGATCGATCCCTTGGGTGACGGCAAAAAAGCGATTTCGAA");
	sequences[seq->getID()] = seq;

	seq = new Sequence("HIV-1 LTR 52", "dsDNA", "ssRNA", "CCCAGAGAGACCAATCTGGTCTAGACTCGGACCCTCGAGAGACCGATCGATCCCTTGGGTGACGGCTTTTTTGCGATTTCGAA");
	sequences[seq->getID()] = seq;

	seq = new Sequence("Haemoglobin subunit &beta; 100bp", "ssDNA", "dsDNA", "TGTAAACGAAGACTGTGTTGACACAAGTGATCGTTGGAGTTTGTCTGTGGTACCACGTAGACTGAGGACTCCTCTTCAGACGGCAATGACGGGACACCCC");
	sequences[seq->getID()] = seq;

	seq = new Sequence("Human Huntingtin poly(Q) region", "ssDNA", "dsDNA", "CAGGAAGGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTTGTCGGCGG");
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

	currentSequence->initRateTable();
	_translocationRatesCache = currentSequence->getRatesCache();

	return true;

}



// Instruct all sequences to rebuild their translocation rate cache next time requested
void Settings::resetRateTables(){

	for(std::map<string, Sequence*>::iterator iter = sequences.begin(); iter != sequences.end(); ++iter){
		Sequence* seq = iter->second;
		seq->flagForRateTableRebuilding();
	}
	
}



// Loads the current settings into a JSON string for use by javascript
string Settings::toJSON(){

	string parametersJSON = "";
	parametersJSON += "'seq':{'seqID':'" + _seqID + "','seq':'" + templateSequence + "','template':'" + TemplateType + "','primer':'" + PrimerType + "'},";
	parametersJSON += "'model':{" + currentModel->toJSON() + "},";
	parametersJSON += "'N':" + to_string(ntrials_sim) + ",";
	parametersJSON += "'speed':'" + _animationSpeed + "',";


	parametersJSON += "'polymerases':{";
	for (int i = 0; i < _polymerases.size(); i ++){
		parametersJSON += _polymerases.at(i)->toJSON();
		if (i < _polymerases.size()-1) parametersJSON += ",";
	}
	parametersJSON += "}, 'currentPolymerase':'" + _currentPolymerase + "'";


	return parametersJSON;

}

void Settings::print(){

	cout << "\n---Settings---" << endl;
	cout << _seqID << "; TemplateType: " << TemplateType << "; PrimerType: " << PrimerType << endl;
	cout << complementSequence << endl;
	cout << templateSequence << endl << endl;

	// Print all models
	cout << "Models:" << endl;
	for (list<Model>::iterator it = modelsToEstimate.begin(); it != modelsToEstimate.end(); ++it){
		(*it).print();
	}


	cout << "Current model" << endl;
	currentModel->print();


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

	RateActivate->print();
	RateDeactivate->print();
	RateCleave->print();

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



	// Activation allowed?
	if (currentModel->get_allowInactivation()){
		RateActivate->show();
		RateDeactivate->show();
	}else{
		RateActivate->hide();
		RateDeactivate->hide();
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
	RateActivate->stopHardcoding();
	RateDeactivate->stopHardcoding();
	RateCleave->stopHardcoding();

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
	RateActivate->sample();
	RateDeactivate->sample();
	RateCleave->sample();


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
	if (paramID == "kA") return RateActivate;
	if (paramID == "kU") return RateDeactivate;
	if (paramID == "RateCleave") return RateCleave;

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


bool Settings::strIsNumber(const string& s){
	if (s == "") return false;
    return( strspn( s.c_str(), "-.0123456789" ) == s.size() );
}





// Insert an element into the right position of a sorted vector of integers
void Settings::sortedPush(std::vector<int> &cont, int value) {
    std::vector<int>::iterator it = std::lower_bound( cont.begin(), cont.end(), value, std::less<int>() ); // Increasing order
    cont.insert( it, value ); // insert before iterator it
}


// Insert an element into the right position of a sorted vector of doubles
void Settings::sortedPush(std::vector<double> &cont, double value) {
    std::vector<double> ::iterator it = std::lower_bound( cont.begin(), cont.end(), value, std::less<double>() ); // Increasing order
    cont.insert(it, value); // insert before iterator it
}


int Settings::indexOf(deque<int> arr, int val){
	for (int i = 0; i < arr.size(); i ++){
		if (arr.at(i) == val) return i;
	}
	return -1;
}
