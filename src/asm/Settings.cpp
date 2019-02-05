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
#include "SimPol_vRNA_interface.h"

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
#include <deque>

#include <stdio.h>
#include <string.h>

using namespace std;


// Constants
const double INF = 1e16;
const double _RT = 0.6156;
const double _kBT = 1.380649e-23 * 310;
const double _preExp = 1e6;	
const double _PI = 3.14159265359;	
const int _nBasesToTranscribeInit = 4;
const int _N_THRESHOLDS_ROC_CURVE = 100;


const double _midpointModelConstant = -14.37;
const double _HIGIConstant = -15.96;
const double _HIGUConstant = -11.26;
const double _HUGIConstant = -13.52;
const double _HUGUConstant = -8.819;
const double _absoluteModelConstant = 0;


// Command line arguments
string _outputFilename = "";
string _inputXMLfilename = "";
string _inputLogFileName = "";
string _plotFolderName = "";
string _inputFastaFileName = "";
string _inputTreeFileName = "";
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
double burnin = 10; 
int logEvery = 100;
int N_THREADS = 1;
bool _RUNNING_ABC = false;
double _RABC_epsilon = 0;
double _RABC_quantile = 0;
bool _RABC_useEpsilon = true;


// Chunking
string chunk_string = "";


// Experimental data
list<ExperimentalData*> experiments;
int _numExperimentalObservations = 0;
bool _RECORD_PAUSE_TIMES = false;



// Thead mutex lock
pthread_mutex_t MUTEX_LOCK_VRNA; 


// Models
deque<Model*> modelsToEstimate;
Model* currentModel = new Model();
bool _sampleModels = false;


// Parameters
Parameter* NTPconc = new Parameter("NTPconc", false, "inclusive", " [NTP] (\u03bcM)", "Cellular concentration of NTP");
Parameter* ATPconc = new Parameter("ATPconc", false, "inclusive", " [ATP] (\u03bcM)", "Cellular concentration of ATP");
Parameter* CTPconc = new Parameter("CTPconc", false, "inclusive", " [CTP] (\u03bcM)", "Cellular concentration of CTP");
Parameter* GTPconc = new Parameter("GTPconc", false, "inclusive", " [GTP] (\u03bcM)", "Cellular concentration of GTP");
Parameter* UTPconc = new Parameter("UTPconc", false, "inclusive", " [UTP] (\u03bcM)", "Cellular concentration of UTP");
Parameter* FAssist = new Parameter("FAssist", false, "false", "Force  (pN)", "Assisting force applied to the polymerase during single-molecule experiments.");
Parameter* haltPosition = new Parameter("haltPosition", true, "exclusive", "Halt position (nt)", "Position where the polymerase is halted prior to the start of the experiment.");


Parameter* hybridLen = new Parameter("hybridLen", true, "exclusive", "Hybrid length (bp)", "Number of base pairs inside the polymerase", "h (bp)");
Parameter* bubbleLeft = new Parameter("bubbleLeft", true, "inclusive", "Bubble length left (bp)", "Number of unpaired template bases 3\u2032 of the hybrid", "\u03B2_{1} (bp)");
Parameter* bubbleRight = new Parameter("bubbleRight", true, "inclusive", "Bubble length right (bp)", "Number of unpaired template bases 5\u2032 of the hybrid", "\u03B2_{2} (bp)");

Parameter* GDagSlide = new Parameter("GDagSlide", false, "false", "\u0394G\u2020\U0001D70F", "Gibbs energy barrier height of translocation", "\u0394G_{\U0001D70F}^{\u2020}  (k_{B}T)");
Parameter* DGPost = new Parameter("DGPost", false, "false", "\u0394G\U0001D70F1", "Gibbs energy added on to posttranslocated ground state", "\u0394G_{\U0001D70F1}  (k_{B}T)");
Parameter* barrierPos = new Parameter("barrierPos", false, "false", "Transition state position  (\u212B)", "Position of translocation transition state", "\u03B4_{1}");
Parameter* arrestTime = new Parameter("arrestTime", false, "inclusive", "Arrest timeout  (s)", "Time from the start until transcription is arrested. Set to zero to prevent arrests.");
Parameter* kCat = new Parameter("kCat", false, "inclusive", "Rate of catalysis (s\u207B\u00B9)", "Rate constant of catalysing bound NTP", "k_{cat}  (s^{\u22121\u2009})");
Parameter* Kdiss = new Parameter("Kdiss", false, "exclusive", "KD (\u03bcM)", "Dissociation constant of NTP",  "K_{D}  (\u03bcM)");
Parameter* RateBind = new Parameter("RateBind", false, "inclusive", "Rate of binding  (\u03bcM\u207B\u00B9 s\u207B\u00B9)", "Second order rate constant of binding the correct NTP", "k_{bind} (\u03bcM^{\u22121} s^{\u22121\u2009})");

Parameter* RateActivate = new Parameter("RateActivate", false, "inclusive", "Rate of activation (s\u207B\u00B9)", "Rate constant of polymerase leaving the intermediate state", "k_[A]  (s^[\u22121\u2009])");
Parameter* RateDeactivate = new Parameter("RateDeactivate", false, "inclusive", "Rate of inactivation (s\u207B\u00B9)", "Rate constant of polymerase entering the intermediate state", "k_[U]  (s^[\u22121\u2009])");
Parameter* deltaGDaggerHybridDestabil = new Parameter("deltaGDaggerHybridDestabil", false, "false", "\u0394G\u2020\u03C0", "Gibbs energy barrier of hybrid destabilisation, which causes catalytic inactivation.");
Parameter* deltaGDaggerBacktrack = new Parameter("deltaGDaggerBacktrack", false, "false", "\u0394G\u2020\U0001D70F-", "Additive Gibbs energy barrier height of backtracking. Added onto the value of \u0394G\u2020\U0001D70F.", "\u0394G_{\U0001D70F-}^{\u2020}  (k_{B}T)");
Parameter* DGHyperDag = new Parameter("DGHyperDag", false, "false", "\u0394G\u2020\U0001D70F+", "Additive Gibbs energy barrier height of hypertranslocation. Added onto the value of \u0394G\u2020\U0001D70F.", "\u0394G_{\U0001D70F+}^{\u2020}  (k_{B}T)");



Parameter* RateCleave = new Parameter("RateCleave", false, "inclusive", "Rate of cleavage (s\u207B\u00B9)", "Rate constant of cleaving the dangling 3\u2032 end of the nascent strand when backtracked", "k_[cleave]  (s^[\u22121\u2009])");
Parameter* CleavageLimit = new Parameter("CleavageLimit", true, "inclusive", "Cleavage limit (nt)", "Maximum number of backtracked nucleotides which can be cleaved. Set to 0 to have no upper limit.", "\u03BB_[cleave]  (nt)");


Parameter* rnaFoldDistance = new Parameter("rnaFoldDistance", true, "inclusive", "Fold distance (nt)", "Number of nucleotides upstream from the polymerase which cannot fold");


Parameter* upstreamCurvatureCoeff = new Parameter("upstreamCurvatureCoeff", false, "false", "3\u2032 DNA curvature coeff.", "Change in free energy of translocation associated with DNA upstream from the hybrid, per degree of curvature", "\u0394G_{3\u2032bend}  (k_{B}T)");
Parameter* downstreamCurvatureCoeff = new Parameter("downstreamCurvatureCoeff", false, "false", "5\u2032 DNA curvature coeff.", "Change in free energy of translocation associated with DNA downstream from the hybrid, per degree of curvature", "\u0394G_{5\u2032bend}  (k_{B}T)");
Parameter* upstreamWindow = new Parameter("upstreamWindow", true, "exclusive", "3\u2032 DNA curvature window", "Window size to calculate the upstream DNA curvature", "3\u2032 bend window (bp)");
Parameter* downstreamWindow = new Parameter("downstreamWindow", true, "exclusive", "5\u2032 DNA curvature window", "Window size to calculate the downstream DNA curvature", "5\u2032 bend window (bp)");



Parameter* proposalWidth = new Parameter("proposalWidth", false, "exclusive", "Proposal width", "Scale width of MCMC proposals, relative to the width of the prior distribution.");


vector<Parameter*> Settings::paramList(28); // Number of parameters

CRandomMersenne* Settings::SFMT;


// User interface information
bool _USING_GUI = false;
bool _GUI_STOP = false;
bool _needToReinitiateAnimation = false;
bool _GUI_simulating = false;
bool _applyingReactionsGUI = false;
bool _showRNAfold_GUI = false;
bool _GUI_user_applying_reaction = false;
int _currentLoggedPosteriorDistributionID = -1;
string _animationSpeed = "medium";
Simulator* _interfaceSimulator; // The simulator object being used by the GUI
State* _currentStateGUI; // The current state displayed on the GUI and used in all GUI simulations
chrono::system_clock::time_point _interfaceSimulation_startTime = chrono::system_clock::now();
SlippageLandscapes* _slippageLandscapesToSendToDOM;
ostringstream _ABCoutputToPrint;
list<PosteriorDistributionSample*> _GUI_posterior;
map<int, list<PosteriorDistributionSample*>> _gelPosteriorDistributions; // All posterior distributions for gel calibrations
Plots* _GUI_PLOTS;


// PhyloPause
MultipleSequenceAlignment* _PP_multipleSequenceAlignment;
PhyloTree* _PP_tree;
bool _USING_PHYLOPAUSE = false;

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
	haltPosition->setDistributionParameter("fixedDistnVal", 14)->setDistributionParameter("lowerVal", 14);



	hybridLen->setDistributionParameter("fixedDistnVal", 9);
	bubbleLeft->setDistributionParameter("fixedDistnVal", 2);
	bubbleRight->setDistributionParameter("fixedDistnVal", 1);

	GDagSlide->setDistributionParameter("fixedDistnVal", 9)->setDistributionParameter("uniformDistnLowerVal", 9)->setDistributionParameter("uniformDistnUpperVal", 15);
	DGPost->setDistributionParameter("fixedDistnVal", 0);
	barrierPos->setDistributionParameter("fixedDistnVal", 1.7);
	barrierPos->setDistributionParameter("upperVal", 3.4);

	kCat->setDistributionParameter("fixedDistnVal", 30)->setDistributionParameter("lognormalMeanVal", 3.454)->setDistributionParameter("lognormalSdVal", 0.587);
	Kdiss->setDistributionParameter("fixedDistnVal", 35);
	RateBind->setDistributionParameter("fixedDistnVal", 0.5);

	arrestTime->setDistributionParameter("fixedDistnVal", 0);
	proposalWidth->setDistributionParameter("proposalWidth", 0);



	RateActivate->setDistributionParameter("fixedDistnVal", 0.1);
	RateDeactivate->setDistributionParameter("fixedDistnVal", 0.05);
	deltaGDaggerHybridDestabil->setDistributionParameter("fixedDistnVal", -1);
	deltaGDaggerBacktrack->setDistributionParameter("fixedDistnVal", 0);
	DGHyperDag->setDistributionParameter("fixedDistnVal", 0);
	RateCleave->setDistributionParameter("fixedDistnVal", 0);
	CleavageLimit->setDistributionParameter("fixedDistnVal", 10);


	upstreamCurvatureCoeff->setDistributionParameter("fixedDistnVal", 0);
	downstreamCurvatureCoeff->setDistributionParameter("fixedDistnVal", 0);
	upstreamWindow->setDistributionParameter("fixedDistnVal", 12);
	downstreamWindow->setDistributionParameter("fixedDistnVal", 12);


	rnaFoldDistance->setDistributionParameter("fixedDistnVal", 8);


	upstreamCurvatureCoeff->hide();
	downstreamCurvatureCoeff->hide();
	upstreamWindow->hide();
	downstreamWindow->hide();



	
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
	paramList.at(19) = deltaGDaggerHybridDestabil;
	paramList.at(20) = deltaGDaggerBacktrack;
	paramList.at(21) = rnaFoldDistance;
	paramList.at(22) = CleavageLimit;


	//paramList.at(19) = upstreamCurvatureCoeff;
	//paramList.at(20) = downstreamCurvatureCoeff;
	paramList.at(23) = upstreamWindow;
	paramList.at(24) = downstreamWindow;
	paramList.at(25) = haltPosition;
	paramList.at(26) = DGHyperDag;

	paramList.at(27) = proposalWidth;



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
	ecoliPol->setParameter(hybridLen->clone()->setDistributionParameter("fixedDistnVal", 9));
	ecoliPol->setParameter(bubbleLeft->clone()->setDistributionParameter("fixedDistnVal", 2));
	ecoliPol->setParameter(bubbleRight->clone()->setDistributionParameter("fixedDistnVal", 1));

	// S. cerevisiae parameters
	yeastPol->setParameter(GDagSlide->clone()->setDistributionParameter("fixedDistnVal", 8.536));
	yeastPol->setParameter(DGPost->clone()->setDistributionParameter("fixedDistnVal", -4.323));
	yeastPol->setParameter(barrierPos->clone()->setDistributionParameter("fixedDistnVal", 2.889));
	yeastPol->setParameter(kCat->clone()->setDistributionParameter("fixedDistnVal", 29.12));
	yeastPol->setParameter(Kdiss->clone()->setDistributionParameter("fixedDistnVal", 72));
	yeastPol->setParameter(hybridLen->clone()->setDistributionParameter("fixedDistnVal", 10));
	yeastPol->setParameter(bubbleLeft->clone()->setDistributionParameter("fixedDistnVal", 1));
	yeastPol->setParameter(bubbleRight->clone()->setDistributionParameter("fixedDistnVal", 1));

	// T7 parameters
	T7pol->setParameter(DGPost->clone()->setDistributionParameter("fixedDistnVal", -4.709));
	T7pol->setParameter(kCat->clone()->setDistributionParameter("fixedDistnVal", 127.3));
	T7pol->setParameter(Kdiss->clone()->setDistributionParameter("fixedDistnVal", 105));
	T7pol->setParameter(hybridLen->clone()->setDistributionParameter("fixedDistnVal", 8));
	T7pol->setParameter(bubbleLeft->clone()->setDistributionParameter("fixedDistnVal", 1));
	T7pol->setParameter(bubbleRight->clone()->setDistributionParameter("fixedDistnVal", 1));


	// Choose the default model settings
	ecoliPol->setModel((new Model())->set_assumeTranslocationEquilibrium(false)->set_assumeBindingEquilibrium(false)->set_allowGeometricCatalysis(false));
	yeastPol->setModel((new Model())->set_assumeTranslocationEquilibrium(false)->set_assumeBindingEquilibrium(true)->set_allowGeometricCatalysis(false));
	T7pol->setModel((new Model())->set_assumeTranslocationEquilibrium(true)->set_assumeBindingEquilibrium(true)->set_allowGeometricCatalysis(false));


	_polymerases.at(0) = ecoliPol;
	_polymerases.at(1) = yeastPol;
	_polymerases.at(2) = T7pol;


	// Activate the Ecoli RNAP as the default
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
	deltaGDaggerHybridDestabil = paramList.at(19);
	deltaGDaggerBacktrack = paramList.at(20);
	rnaFoldDistance = paramList.at(21);
	CleavageLimit = paramList.at(22);
	upstreamWindow = paramList.at(23);
	downstreamWindow = paramList.at(24);

	haltPosition = paramList.at(25);
	DGHyperDag = paramList.at(26);


	proposalWidth = paramList.at(27);



	/*
	upstreamCurvatureCoeff = paramList.at(19);
	downstreamCurvatureCoeff = paramList.at(20);
	upstreamWindow = paramList.at(21);
	downstreamWindow = paramList.at(22);
	*/



}



void Settings::initSequences(){

	// Create sequence objects
	Sequence* seq = new Sequence("Buchnera aphidicola murC1 EU274658", "dDNA", "ssRNA", "GGAAGACTATTAGGTCTTTAATATCGTCGATTTTTTTTTTGTAAGGATATGATAATTCTCGACTTTA");
	sequences[seq->getID()] = seq;

	seq = new Sequence("E.coli lacZ gene GU063697", "dDNA", "ssRNA", "TACTTTCGACCGATGTCCTTCCGGTCTGCGCTTAATAAAAACTACCGCAATTGAGCCGCAAAGTAGACACCACGTTGCCCGCGACCCAGCCAATGCCGGTCCTGTCAGCAAACGGCAGACTTAAACTGGACTCGCGTAAAAATGCGCGGCCTCTTTTGGCGGAGCGCCACTACCACGACGCGACCTCACTGCCGTCAATAGACCTTCTAGTCCTATACACCGCCTACTCGCCGTAAAAGGCACTGCAGAGCAACGACGTATTTGGCTGATGTGTTTAGTCGCTAAAGGTACAACGGTGAGCGAAATTACTACTAAAGTCGGCGCGACATGACCTCCGACTTCAAGTCTACACGCCGCTCAACGCACTGATGGATGCCCATTGTCAAAGAAATACCGTCCCACTTTGCGTCCAGCGGTCGCCGTGGCGCGGAAAGCCGCCACTTTAATAGCTACTCGCACCACCAATACGGCTAGCGCAGTGTGATGCAGACTTGCAGCTTTTGGGCTTTGACACCTC");
	sequences[seq->getID()] = seq;

	seq = new Sequence("E.coli rpoB KP670789", "dDNA", "ssRNA", "TACCAAATGAGGATATGGCTCTTTTTTGCATAAGCATTCCTAAAACCATTTGCAGGTGTTCAAGACCTACATGGAATAGAGGAAAGATAGGTCGAACTGAGCAAAGTCTTTAAATAGCTCGTTCTAGGACTTCCCGTCATACCAGACCTTCGACGAAAGGCAAGGCATAAGGGCTAAGTCTCGATGTCGCCATTAAGGCTCGACGTTATGCAGTCGATGGCGGAACCGCTTGGCCACAAACTGCAGGTCCTTACAGTTTAGGCACCGCACTGGATAAGGCGTGGCGACGCGCAATTTGACGCAGACCACTAGATACTCGCGCTTCGCGGCCTTCCGTGGCATTTTCTGTAATTTCTTGTTCTTCAGATGTACCCGCTTTAAGGCGAGTACTGTCTGTTGCCATGGAAACAATAGTTGCCATGACTCGCACAATAGCAAAGGGTCGACGTGGCATCAGGCCCGCAGAAGAAACTGAGGCTGTTTCCATTTTGGGTGAGAAGCCCATTTCACGACATATTGCGCGCATAGTAGGGAATGGCACCAAGGACCGACCTGAAGCTTAAGCTAGGCTTCCTGTTGGACAAGCATGCATAGCTGGCAGCGGCATTTGACGGACGCTGGTAGTAAGACGCGCGGGACTTGATGTGGTGTCTCGTCTAGGAGCTGGACAAGAAACTTTTTCAATAGAAACTTTAGGCACTATTGTTCGACGTCTACCTTGACCACGGCCTTGCGGACGCACCACTTTGGCGTAGAAAACTGTAGCTTCGATTGCCATTTCACATGCATCTTTTTCCGGCGGCATAGTGACGCGCGGTGTAAGCGGTCGACCTTTTTCTGCTGCAGTTTGACTAGCTTCAGGGCCAACTCATGTAGCGTCCATTTCACCAACGATTTCTGATATAACTACTCAGATGGCCGCTCGACTAGACGCGTCGCTTGTACCTCGACTCGGACCTAGACGACCGATTCGACTCGGTCAGACCAGTGTTCGCATAGCTTTGCGACAAGTGGTTGCTAGACCTAGTGCCGGGTATATAGAGACTTTGGAATGCACAGCTGGGTTGATTGCTGGCAGACTCGCGTGACCATCTTTAGATGGCGTACTACGCGGGACCGCTCGGCGGCTGAGCACTTCGTCGACTTTCGGACAAGCTCTTGGACAAGAAGAGGCTTCTGGCAATACTGAACAGACGCCAACCAGCATACTTCAAGTTGGCAAGAGACGACGCGCTTCTTTAGCTTCCAAGGCCATAGGACTCGTTTCTGCTGTAGTAACTACAATACTTTTTCGAGTAGCTATAGGCATTGCCATTTCCGCTTCAGCTACTATAGCTGGTGGAGCCGTTGGCAGCATAGGCAAGGCAACCGCTTTACCGCCTTTTGGTCAAGGCGCAACCGGACCATGCACATCTCGCACGCCACTTTCTCGCAGACAGAGACCCGCTAGACCTATGGGACTACGGTGTCCTATACTAGTTGCGGTTCGGCTAAAGGCGTCGTCACTTTCTCAAGAAGCCAAGGTCGGTCGACAGAGTCAAATACCTGGTCTTGTTGGGCGACAGACTCTAATGCGTGTTTGCAGCATAGAGGCGTGAGCCGGGTCCGCCAGACTGGGCACTTGCACGTCCGAAGCTTCAAGCTCTGCATGTGGGCTGAGTGATGCCAGCGCATACAGGTTAGCTTTGGGGACTTCCAGGCTTGTAGCCAGACTAGTTGAGAGACAGGCACATGCGTGTCTGATTGCTTATGCCGAAGGAACTCTGAGGCATAGCATTTCACTGGCTGCCACAACATTGACTGCTTTAAGTGATGGACAGACGATAGCTTCTTCCGTTGATGCAATAGCGGGTCCGCTTGAGGTTGAACCTACTTCTTCCGGTGAAGCATCTTCTGGACCATTGAACGGCATCGTTTCCGCTTAGGTCGAACAAGTCGGCGCTGGTCCAACTGATGTACCTGCATAGGTGGGTCGTCCACCATAGGCAGCCACGCAGGGACTAGGGCAAGGACCTTGTGCTACTGCGGTTGGCACGTAACTACCCACGCTTGTACGTTGCAGTCCGGCAAGGCTGAGACGCGCGACTATTCGGCGACCAACCATGACCATACCTTGCACGACAACGGCAACTGAGGCCACATTGACGCCATCGATTTGCACCACCACAGCAAGTCATGCACCTACGAAGGGCATAGCAATAGTTTCAATTGCTTCTGCTCTACATAGGCCCACTTCGTCCATAGCTGTAGATGTTGGACTGGTTTATGTGGGCAAGATTGGTCTTGTGGACATAGTTGGTCTACGGCACACACAGAGACCCACTTGGCCAACTTGCACCGCTGCACGACCGTCTGCCAGGCAGGTGGCTGGAGCCACTTGACCGCGAACCAGTCTTGTACGCGCATCGCAAGTACGGCACCTTACCAATGTTGAAGCTTCTGAGGTAGGAGCATAGGCTCGCACAACAAGTCCTTCTGGCAAAGTGGTGGTAGGTGTAAGTCCTTGACCGCACACACAGGGCACTGTGGTTCGACCCAGGCCTTCTCTAGTGGCGACTGTAGGGCTTGCACCCACTTCGACGCGAGAGGTTTGACCTACTTAGGCCATAGCAAATGTAACCACGCCTTCACTGGCCACCGCTGTAAGACCAACCATTCCATTGCGGCTTTCCACTTTGAGTCGACTGGGGTCTTCTTTTTGACGACGCACGCTAGAAGCCACTCTTTCGGAGACTGCAATTTCTGAGAAGAGACGCGCATGGTTTGCCACATAGGCCATGCCAATAGCTGCAAGTCCAGAAATGAGCGCTACCGCATCTTTTTCTGTTTGCACGCGACCTTTAGCTTCTTTACGTCGAGTTTGTCCGCTTCTTTCTGGACAGACTTCTTGACGTCTAGGAGCTTCGCCCAGACAAGTCGGCATAGGCACGACACGACCATCGGCCACCGCAACTTCGACTCTTCGAGCTGTTTGACGGCGCGCTAGCGACCGACCTCGACCCGGACTGTCTGCTTCTCTTTGTTTTAGTCGACCTTGTCGACCGACTCGTCATACTGCTTGACTTTGTGCTCAAGCTCTTCTTTGAGCTTCGCTTTGCGGCGTTTTAGTGGGTCCCGCTGCTAGACCGTGGCCCGCACGACTTCTAACAATTCCATATAGACCGCCAATTTGCGGCATAGGTCGGACCACTGTTCTACCGTCCAGCAGTGCCATTGTTCCCACATTAAAGATTCTAGTTGGGCTAGCTTCTATACGGAATGCTACTTTTGCCATGCGGCCATCTGTAGCATGACTTGGGCGACCCGCATGGCAGAGCATACTTGTAGCCAGTCTAGGAGCTTTGGGTGGACCCATACCGACGCTTTCCATAGCCGCTGTTCTAGTTGCGGTACGACTTTGTCGTCGTTCTTCAGCGCTTTGACGCGCTTAAGTAGGTCGCACGCATGCTAGACCCGCGACTGCAAGCAGTCTTTCAACTGGACTCATGGAAGTCGCTACTTCTTCAATACGCAGACCGACTTTTGGACGCGTTTCCATACGGTTAGCGTTGCGGCCACAAGCTGCCACGCTTTCTTCGTCTTTAATTTCTCGACGACTTTGAACCGCTGGACGGCTGAAGGCCAGTCTAGGCGGACATGCTACCAGCGTGACCACTTGTCAAGCTCGCAGGCCATTGGCAACCAATGTACATGTACGACTTTGACTTGGTGGACCAGCTGCTGTTCTACGTGCGCGCAAGGTGGCCAAGAATGTCGGACCAATGAGTCGTCGGCGACCCACCATTCCGTGTCAAGCCACCAGTCGCAAAGCCCCTCTACCTTCACACCCGCGACCTTCGTATGCCGCGTCGTATGTGGGACGTCCTTTACGAGTGGCAATTCAGACTACTGCACTTGCCAGCATGGTTCTACATATTTTTGTAGCACCTGCCGTTGGTAGTCTACCTCGGCCCGTACGGTCTTAGGAAGTTGCATAACAACTTTCTCTAAGCAAGCGACCCATAGTTGTAGCTTGACCTTCTGCTCATT");
	sequences[seq->getID()] = seq;

	seq = new Sequence("HIV-1 LTR WT", "dsDNA", "ssRNA", "CCCAGAGAGACCAATCTGGTCTAGACTCGGACCCTCGAGAGACCGATCGATCCCTTGGGTGACGAATTCGGAGTTATTTCGAACGTACGGACGTCTCC");
	sequences[seq->getID()] = seq;

	seq = new Sequence("lambda tR1", "dsDNA", "ssRNA", "TTTTTTTTACCTTAAGGTGGTGTGGGTGTGTGGGTGTGGGTGTGTGGTGTGGGTGTGGTGTGGGTGTGTGGTGTGGGTGTGGTGTGGTGTGGGCCCATGGGTTTTAATTTGGTGTGGATACCACATACGTAAATAAACGTATGTAAGTTAGTTAACAATAGATTCCTTTATGAATGTATACCAAGCACGTTTGTTTGCGTTGCTCCGAGATGCTTAG");
	sequences[seq->getID()] = seq;

	seq = new Sequence("Haemoglobin subunit &beta; 100bp", "ssDNA", "dsDNA", "TGTAAACGAAGACTGTGTTGACACAAGTGATCGTTGGAGTTTGTCTGTGGTACCACGTAGACTGAGGACTCCTCTTCAGACGGCAATGACGGGACACCCC");
	sequences[seq->getID()] = seq;

	seq = new Sequence("Human Huntingtin poly(Q) region", "ssDNA", "dsDNA", "CAGGAAGGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTCGTTGTCGGCGG");
	sequences[seq->getID()] = seq;


	setSequence("Buchnera aphidicola murC1 EU274658");

}


bool Settings::setSequence(string seqID){

	if (sequences.find(seqID) == sequences.end()) return false;
    Settings::setSequence(sequences[seqID]); 
	return true;

}



void Settings::setSequence(Sequence* seq){


    currentSequence = seq;

    _seqID = currentSequence->getID();
    templateSequence = currentSequence->get_templateSequence();
    complementSequence = currentSequence->get_complementSequence();
    TemplateType = currentSequence->get_templateType();
    PrimerType = currentSequence->get_primerType();

    currentSequence->initRateTable();
    currentSequence->initRNAunfoldingTable();
    _translocationRatesCache = currentSequence->getRatesCache();

    //currentSequence->print();


    if (PrimerType == "ssRNA") vRNA_init(Settings::complementSeq(templateSequence, true).c_str());


}



Sequence* Settings::getSequence(string seqID){

	if (sequences.find(seqID) == sequences.end()) return nullptr;
	return sequences[seqID];

}





// Instruct all sequences to rebuild their translocation rate cache next time requested
void Settings::resetRateTables(){

	for(std::map<string, Sequence*>::iterator iter = sequences.begin(); iter != sequences.end(); ++iter){
		Sequence* seq = iter->second;
		seq->flagForRateTableRebuilding();
	}
	
}


// Instruct all sequences to rebuild their unfolding barrier cache next time requested
void Settings::resetUnfoldingTables(){

	for(std::map<string, Sequence*>::iterator iter = sequences.begin(); iter != sequences.end(); ++iter){
		Sequence* seq = iter->second;
		seq->flagForUnfoldingTableRebuilding();
	}
	
}






list<PosteriorDistributionSample*> Settings::getPosteriorDistributionByID(int id){

	if (id == 0) return _GUI_posterior;

	if (_gelPosteriorDistributions.find(id) == _gelPosteriorDistributions.end()) {
		list<PosteriorDistributionSample*> emptyList;
		return emptyList;
	}
	return _gelPosteriorDistributions[id];

}


void Settings::addToPosteriorDistribution(int id, PosteriorDistributionSample* obj){

	if (id == 0){
		_GUI_posterior.push_back(obj);
		return;
	}

	if (_gelPosteriorDistributions.find(id) == _gelPosteriorDistributions.end()) return;
	_gelPosteriorDistributions[id].push_back(obj);

}





// Loads the current settings into a JSON string for use by javascript
string Settings::toJSON(){

	string parametersJSON = "";
	parametersJSON += "'seq':{'seqID':'" + _seqID + "','seq':'" + templateSequence + "','template':'" + TemplateType + "','primer':'" + PrimerType + "'},";
	parametersJSON += "'model':{" + currentModel->toJSON() + "},";
	parametersJSON += "'N':" + to_string(ntrials_sim) + ",";
	parametersJSON += "'speed':'" + _animationSpeed + "',";
    
    
    if (_GUI_PLOTS) parametersJSON += "'plots':" + _GUI_PLOTS->getPlotDataAsJSON() + ",";


	parametersJSON += "'polymerases':{";
	for (int i = 0; i < _polymerases.size(); i ++){
		parametersJSON += _polymerases.at(i)->toJSON();
		if (i < _polymerases.size()-1) parametersJSON += ",";
	}
	parametersJSON += "}, 'currentPolymerase':'" + _currentPolymerase + "',";


	// ABC
	parametersJSON += "'ABC_EXPERIMENTAL_DATA':{";
	parametersJSON += "'inferenceMethod':'" + inferenceMethod + "',";
	parametersJSON += "'ntrials':" + to_string(ntrials_abc) + ",";
	parametersJSON += "'testsPerData':" + to_string(testsPerData) + ",";

	parametersJSON += "'burnin':" + to_string(burnin) + ",";
	parametersJSON += "'logEvery':" + to_string(logEvery) + ",";
	parametersJSON += "'chiSqthreshold_min':" + to_string(_chiSqthreshold_min) + ",";
	parametersJSON += "'chiSqthreshold_0':" + to_string(_chiSqthreshold_0) + ",";
	parametersJSON += "'chiSqthreshold_gamma':" + to_string(_chiSqthreshold_gamma) + ",";

		// Experimental data
		parametersJSON += "'fits':{";


		for (list<ExperimentalData*>::iterator it = experiments.begin(); it != experiments.end(); ++it){
			parametersJSON += (*it)->toJSON();
			parametersJSON += ",";
		}	

		if (parametersJSON.substr(parametersJSON.length()-1, 1) == ",") parametersJSON = parametersJSON.substr(0, parametersJSON.length() - 1);
		parametersJSON += "}";
	parametersJSON += "}";



	// Iterate through all models to estimate (except for the default model)
	if (modelsToEstimate.size() > 0){

		parametersJSON += ",'modelsToEstimate':[";

		for (deque<Model*>::iterator it = modelsToEstimate.begin(); it != modelsToEstimate.end(); ++it){
			if ((*it)->getID() == "default" || (*it)->getID() == "-1") continue;
			parametersJSON += "{'id':" + (*it)->getID() + ",";
			parametersJSON += "'weight':" + to_string((*it)->getPriorProb()) + ",";
			parametersJSON += "'description':{" + (*it)->toJSON_compact() + "}},";
		} 

		if (parametersJSON.substr(parametersJSON.length()-1, 1) == ",") parametersJSON = parametersJSON.substr(0, parametersJSON.length() - 1);
		parametersJSON += "]";
	}

	return parametersJSON;

}

void Settings::print(){

	cout << "\n---Settings---" << endl;
	cout << _seqID << "; TemplateType: " << TemplateType << "; PrimerType: " << PrimerType << endl;
	cout << complementSequence << endl;
	cout << templateSequence << endl << endl;

	// Print all models
	cout << "Models:" << endl;
	for (deque<Model*>::iterator it = modelsToEstimate.begin(); it != modelsToEstimate.end(); ++it){
		(*it)->print();
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
	haltPosition->print();

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
	CleavageLimit->print();
	deltaGDaggerHybridDestabil->print();
	DGHyperDag->print();
	deltaGDaggerBacktrack->print();

	upstreamCurvatureCoeff->print();
	downstreamCurvatureCoeff->print();
	upstreamWindow->print();
	downstreamWindow->print();
	rnaFoldDistance->print();


	cout << endl << endl;



	cout << "ABC settings: ntrials = " << ntrials_abc << "; testsPerData = " << testsPerData << "; testsPerData_preburnin = " << _testsPerData_preburnin << "; _chiSqthreshold_min = " << _chiSqthreshold_min << "; _chiSqthreshold_0 = " << _chiSqthreshold_0 << "; _chiSqthreshold_gamma = " << _chiSqthreshold_gamma << "; burnin = " << burnin << "; logEvery = " << logEvery << endl;
	for (list<ExperimentalData*>::iterator it=experiments.begin(); it != experiments.end(); ++it){
    	(*it)->print();
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

	if (!_USING_GUI) return;

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



	// Inactivation allowed?
	if (currentModel->get_allowInactivation()){

		RateActivate->show();
		if (currentModel->get_currentInactivationModel() == "sequenceIndependent"){
			RateDeactivate->show();
			deltaGDaggerHybridDestabil->hide();
		}
		else if (currentModel->get_currentInactivationModel() == "hybridDestabilisation"){
			deltaGDaggerHybridDestabil->show();
			RateDeactivate->hide();
		}
	}else{
		RateActivate->hide();
		RateDeactivate->hide();
		deltaGDaggerHybridDestabil->hide();
	}


	// Backtracking allowed?
	if (currentModel->get_allowBacktracking() || currentModel->get_currentBacksteppingModel_int() == -1){
		deltaGDaggerBacktrack->show();
	}else{
		deltaGDaggerBacktrack->hide();
	}


	// Hypertranslocation
		if (currentModel->get_allowHypertranslocation()){
		DGHyperDag->show();
	}else{
		DGHyperDag->hide();
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

	for (int i = 0; i < Settings::paramList.size(); i ++){
		Settings::paramList.at(i)->stopHardcoding();
	}

}


// Samples all parameters
void Settings::sampleAll(){

	// Sample all model parameters
	for (int i = 0; i < Settings::paramList.size(); i ++){
		Settings::paramList.at(i)->sample();
	}

	// Samples a model
	sampleModel();

      

}


// Recomputes any normalisation terms in any parameters
void Settings::renormaliseParameters(){

	for (int i = 0; i < Settings::paramList.size(); i ++){
		Settings::paramList.at(i)->recomputeNormalisationTerms();
	}

}



Parameter* Settings::getParameterByName(string paramID){

	if (paramID == "NTPconc") return NTPconc;
	if (paramID == "ATPconc") return ATPconc;
	if (paramID == "CTPconc") return CTPconc;
	if (paramID == "GTPconc") return GTPconc;
	if (paramID == "UTPconc") return UTPconc;
	if (paramID == "FAssist") return FAssist;
	if (paramID == "haltPosition") return haltPosition;


	if (paramID == "hybridLen") return hybridLen;
	if (paramID == "bubbleLeft") return bubbleLeft;
	if (paramID == "bubbleRight") return bubbleRight;
	if (paramID == "GDagSlide") return GDagSlide;
	if (paramID == "DGPost") return DGPost;
	if (paramID == "barrierPos") return barrierPos;
	if (paramID == "arrestTime") return arrestTime;
	if (paramID == "proposalWidth") return proposalWidth;
	if (paramID == "kCat") return kCat;
	if (paramID == "Kdiss") return Kdiss;
	if (paramID == "RateBind") return RateBind;
	if (paramID == "RateActivate") return RateActivate;
	if (paramID == "RateDeactivate") return RateDeactivate;
	if (paramID == "RateCleave") return RateCleave;
	if (paramID == "CleavageLimit") return CleavageLimit;
	if (paramID == "deltaGDaggerHybridDestabil") return deltaGDaggerHybridDestabil;
	if (paramID == "deltaGDaggerBacktrack") return deltaGDaggerBacktrack;
	if (paramID == "DGHyperDag") return DGHyperDag;
	if (paramID == "upstreamCurvatureCoeff") return upstreamCurvatureCoeff;
	if (paramID == "downstreamCurvatureCoeff") return downstreamCurvatureCoeff;
	if (paramID == "upstreamWindow") return upstreamWindow;
	if (paramID == "downstreamWindow") return downstreamWindow;
	if (paramID == "rnaFoldDistance") return rnaFoldDistance;





	return nullptr;
}




// Sample a model (may be the same model -> to avoid dealing with hastings ratio)
void Settings::sampleModel(){


	if (!_sampleModels) return;

	// Delete any parameter hardcodings
	Settings:clearParameterHardcodings();


	// Calculate model weight sum
	double weightSum = 0;
	for (deque<Model*>::iterator it = modelsToEstimate.begin(); it != modelsToEstimate.end(); ++it){
		weightSum += (*it)->getPriorProb();
	}

	double runifNum = Settings::runif() * weightSum;
	double cumsum = 0;
	//if (modelsToEstimate.size() > 1 && currentModel->getID() != "-1") cumsum += currentModel->getPriorProb();

	for (deque<Model*>::iterator it = modelsToEstimate.begin(); it != modelsToEstimate.end(); ++it){
		//if (modelsToEstimate.size() > 1 && (*it).getID() == currentModel->getID()) continue; // Ensure that current model is not sampled
		cumsum += (*it)->getPriorProb();
		if (runifNum < cumsum){
			Settings::setModel((*it)->getID());
			//cout << "Sampled model " << currentModel->getID() << endl;
			break;
		}
	}

}


void Settings::setModel(string modelID){


	Settings::clearParameterHardcodings();

	for (deque<Model*>::iterator it = modelsToEstimate.begin(); it != modelsToEstimate.end(); ++it){
		if ((*it)->getID() == modelID) {
			currentModel = (*it);
			//cout << "Setting model to model " << modelID << endl;
			break;
		}
	}


	// Activate this model
	currentModel->activateModel();
	Settings::updateParameterVisibilities();
	currentSequence->initRateTable(); // Ensure that the current sequence's translocation rate cache is up to date
	currentSequence->initRNAunfoldingTable();

}



// Deletes the model and removes its entry from the list
void Settings::deleteModel(string modelID){

	if (modelID == "default") return;
	if (modelID == currentModel->getID()) {
		//cout << "Resetting to default because we need to delete " << modelID << endl;
		Settings::setModel("default");
	}
	for (deque<Model*>::iterator it = modelsToEstimate.begin(); it != modelsToEstimate.end(); ++it){
		if ((*it)->getID() == modelID){
			(*it)->clear();
			delete (*it);
			modelsToEstimate.erase(it);
			break;
		}
	}


}



// Parse the model described in the string and add it to the list of models
void Settings::parseModel(string modelID, double modelWeight, string modelDescription){


	bool isCurrentModel = modelID == currentModel->getID();

	// Reset the model to the default model and then the model description will specifiy changes from the default model
	Settings::deleteModel(modelID);
	Model* newModel = currentModel->clone();
	newModel->setID(modelID);
	newModel->setPriorProb(modelWeight >= 0 ? modelWeight : 0);
	modelsToEstimate.push_back(newModel);
	//newModel = Settings::getModel(modelID);
	//newModel->setPriorProb(modelWeight);

	if (isCurrentModel) Settings::setModel(modelID);



	// Update the model settings
	vector<string> modelSettings = Settings::split(string(modelDescription), ',');
	for (int i = 0; i < modelSettings.size(); i ++){


		vector<string> tokens = Settings::split(modelSettings.at(i), '=');
		if (tokens.size() != 2) continue;


		string setting = tokens.at(0);
		string val = tokens.at(1);

		//cout << setting << "=" << val << endl; 


		// Model setting
		if (setting == "allowBacktracking") newModel->set_allowBacktracking(val == "true");
		else if (setting == "allowHypertranslocation") newModel->set_allowHypertranslocation(val == "true");
		else if (setting == "allowInactivation") newModel->set_allowInactivation(val == "true");
		else if (setting == "allowGeometricCatalysis") newModel->set_allowGeometricCatalysis(val == "true");
		else if (setting == "subtractMeanBarrierHeight") newModel->set_subtractMeanBarrierHeight(val == "true");
		else if (setting == "allowDNAbending") newModel->set_allowDNAbending(val == "true");
		else if (setting == "allowmRNAfolding") newModel->set_allowmRNAfolding(val == "true");
		else if (setting == "allowMisincorporation") newModel->set_allowMisincorporation(val == "true");
		else if (setting == "useFourNTPconcentrations") newModel->set_useFourNTPconcentrations(val == "true");
		else if (setting == "NTPbindingNParams") newModel->set_NTPbindingNParams(atoi(val.c_str()));
		else if (setting == "currentTranslocationModel") newModel->set_currentTranslocationModel(val);
		else if (setting == "currentBacksteppingModel") newModel->set_currentBacksteppingModel(val);
		else if (setting == "currentRNABlockadeModel") newModel->set_currentRNABlockadeModel(val);
		else if (setting == "currentInactivationModel") newModel->set_currentInactivationModel(val);
		else if (setting == "assumeBindingEquilibrium") newModel->set_assumeBindingEquilibrium(val == "true");
		else if (setting == "assumeTranslocationEquilibrium") newModel->set_assumeTranslocationEquilibrium(val == "true");


		// Parameter hardcoding
		else if (Settings::getParameterByName(setting) != nullptr){
			newModel->addParameterHardcoding(setting, val);
		}

		tokens.clear();

	}


	modelSettings.clear();



}



Model* Settings::getModel(string modelID){

	for (deque<Model*>::iterator it = modelsToEstimate.begin(); it != modelsToEstimate.end(); ++it){
		if ((*it)->getID() == modelID) {
			return (*it);
		}
	}

	return nullptr;

}


bool Settings::checkIfModelExists(string modelID){

	for (deque<Model*>::iterator it = modelsToEstimate.begin(); it != modelsToEstimate.end(); ++it){
		if ((*it)->getID() == modelID) return true;
	}
	return false;

}







vector<int> Settings::split_int(const std::string& s, char delimiter){
	cout << "Splitting " << s << endl;
	std::vector<int> tokens;
	std::string token;
	std::istringstream tokenStream(s);
	while (std::getline(tokenStream, token, delimiter))
	{
		if (Settings::strIsNumber(token)) tokens.push_back(stoi(token));
	}
	cout << "Done s" << endl;
	return tokens;
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

// Trim a string (copy)
string Settings::trim(string s){

    // Right trim
    s.erase(s.begin(), std::find_if(s.begin(), s.end(), [](int ch) {
        return !std::isspace(ch);
    }));

    // Left trim
    s.erase(std::find_if(s.rbegin(), s.rend(), [](int ch) {
        return !std::isspace(ch);
    }).base(), s.end());

    return s;

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


// Add a state into the posterior distribution, such that the list is sorted in increasing order of X2
void Settings::sortedPush_posterior(std::list<PosteriorDistributionSample*> &cont, PosteriorDistributionSample* state) {


    if (cont.size() > 0) for (list<PosteriorDistributionSample*>::iterator it = cont.begin(); it != cont.end(); ++ it){
    
        double chiSq_list = (*it)->get_chiSquared();
        if (chiSq_list > state->get_chiSquared()){
            cont.insert(it, state);
            return;
        }
    
    }
    
    cont.push_back(state);

}


int Settings::indexOf(deque<int> arr, int val){
	for (int i = 0; i < arr.size(); i ++){
		if (arr.at(i) == val) return i;
	}
	return -1;
}
