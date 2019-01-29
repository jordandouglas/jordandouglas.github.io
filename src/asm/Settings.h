
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


#ifndef SETTINGS_H
#define SETTINGS_H


#include "Plots.h"
#include "Model.h"
#include "ExperimentalData.h"
#include "randomc/randomc.h"
#include "Sequence.h"
#include "Simulator.h"
#include "Polymerase.h"
#include "SlippageLandscapes.h"
#include "PosteriorDistributionSample.h"
#include "MultipleSequenceAlignment.h"
#include "PhyloTree.h"


#include <random>
#include <string>
#include <list>
#include <chrono>
#include <ctime>
#include <thread>
#include <sstream>
#include <thread>

using namespace std;


// Constants
extern const double _RT;
extern const double _kBT;
extern const double _preExp;
extern const double _PI;
extern const double INF;
extern const int _nBasesToTranscribeInit;
extern const int _N_THRESHOLDS_ROC_CURVE;


// Translocation model constants. 
// These terms are subtracted from the translocation barrier height of the respective model when normalising
// Calculated using the rpob gene with transcription bubble 9/1/1
extern const double _midpointModelConstant;
extern const double _HIGIConstant;
extern const double _HIGUConstant;
extern const double _HUGIConstant;
extern const double _HUGUConstant;
extern const double _absoluteModelConstant;


// Sequence information
extern int ntrials_sim;
extern string _seqID;
extern string templateSequence;
extern string complementSequence;
extern string TemplateType;
extern string PrimerType;
extern TranslocationRatesCache* _translocationRatesCache;
extern map<string, Sequence*> sequences;
extern Sequence* currentSequence;
extern vector<Polymerase*> _polymerases;
extern string _currentPolymerase;



// Command line arguments
extern string _inputXMLfilename;
extern string _outputFilename;
extern string _inputLogFileName;
extern string _plotFolderName;
extern string _inputFastaFileName;
extern string _inputTreeFileName;
extern bool isWASM;
extern bool _resumeFromLogfile;
extern bool _printSummary;
extern bool _sampleFromLikelihood;
extern bool _marginalModel;


// ABC information
extern string inferenceMethod;
extern int ntrials_abc;
extern int testsPerData;
extern int _testsPerData_preburnin;
extern double _chiSqthreshold_min;
extern double _chiSqthreshold_0;
extern double _chiSqthreshold_gamma;
extern double burnin; // Percentage
extern int logEvery;
extern int N_THREADS;
extern bool _RUNNING_ABC;


// Experimental data
extern list<ExperimentalData*> experiments;
extern int _numExperimentalObservations;
extern bool _RECORD_PAUSE_TIMES;


// Thead mutex lock
extern pthread_mutex_t MUTEX_LOCK_VRNA; 


// Model
extern deque<Model*> modelsToEstimate;
extern Model* currentModel;
extern bool _sampleModels; 


// User interface information
extern bool _USING_GUI;
extern bool _GUI_STOP;
extern bool _needToReinitiateAnimation;
extern bool _GUI_simulating;
extern bool _applyingReactionsGUI;
extern bool _showRNAfold_GUI;
extern bool _GUI_user_applying_reaction; // Whether or not the user is applying a reaction manually
extern int _currentLoggedPosteriorDistributionID;
extern string _animationSpeed;
extern Simulator* _interfaceSimulator; // The simulator object being used by the GUI
extern State* _currentStateGUI; // The current state displayed on the GUI and used in all GUI simulations
extern chrono::system_clock::time_point _interfaceSimulation_startTime; // The start time of the GUI simulation
extern SlippageLandscapes* _slippageLandscapesToSendToDOM;
extern ostringstream _ABCoutputToPrint;
extern list<PosteriorDistributionSample*> _GUI_posterior;
extern map<int, list<PosteriorDistributionSample*>> _gelPosteriorDistributions; // All posterior distributions for gel calibrations
extern Plots* _GUI_PLOTS;

// PhyloPause
extern MultipleSequenceAlignment* _PP_multipleSequenceAlignment;
extern PhyloTree* _PP_tree;
extern bool _USING_PHYLOPAUSE;

// Parameters
extern Parameter *NTPconc;
extern Parameter *ATPconc;
extern Parameter *CTPconc;
extern Parameter *GTPconc;
extern Parameter *UTPconc;
extern Parameter *FAssist;
extern Parameter *haltPosition;

extern Parameter *hybridLen;
extern Parameter *bubbleLeft;
extern Parameter *bubbleRight;

extern Parameter *GDagSlide;
extern Parameter *DGPost;
extern Parameter* barrierPos;

extern Parameter *arrestTime;
extern Parameter *kCat;
extern Parameter *Kdiss;
extern Parameter *RateBind;

extern Parameter *RateActivate;
extern Parameter *RateDeactivate;
extern Parameter *deltaGDaggerHybridDestabil;
extern Parameter *deltaGDaggerBacktrack;
extern Parameter *DGHyperDag;

extern Parameter *RateCleave;
extern Parameter *CleavageLimit;

extern Parameter *upstreamCurvatureCoeff;
extern Parameter *downstreamCurvatureCoeff;
extern Parameter *upstreamWindow;
extern Parameter *downstreamWindow;

extern Parameter* rnaFoldDistance;

extern Parameter* proposalWidth;



class Settings{

	private:

		// RNG
    	static CRandomMersenne* SFMT;
    	static void initPolymerases();
	

	public:
		static void init();
		static void initSequences();
		static void print();
		static string complementSeq(string orig, bool toRNA);

		static void activatePolymerase(string polymeraseID);
		static void updateParameterVisibilities();
		static void clearParameterHardcodings();
		static void setParameterList(vector<Parameter*> params);
		static void sampleAll();
		static void sampleModel();
		static void setModel(string modelID);
		static void deleteModel(string modelID);
		static Model* getModel(string modelID);
		static bool checkIfModelExists(string modelID);
		static Parameter* getParameterByName(string paramID);
		static vector<Parameter*> paramList;
		static vector<Parameter*> getParamListClone();
		static string toJSON();
		static bool setSequence(string seqID);
        static void setSequence(Sequence* seq);
		static Sequence* getSequence(string seqID);
		static void resetRateTables();
		static void resetUnfoldingTables();
		static list<PosteriorDistributionSample*> getPosteriorDistributionByID(int fitID);
		static void addToPosteriorDistribution(int fitID, PosteriorDistributionSample* obj);
		static void parseModel(string modelID, double modelWeight, string modelDescription);
	

		// Utilities
		static vector<string> split(const std::string& s, char delimiter);
		static vector<int> split_int(const std::string& s, char delimiter);
		static bool strIsNumber(const string& s);
    	static double rexp(double rate);
    	static double runif();
    	static double wrap(double x, double a, double b);
    	static double getNormalDensity(double x, double mu, double sigma, double lowerVal, double upperVal); // Normal PDF
    	static double getNormalCDF(double x, double mu, double sigma);	// Normal CDF
    	//static double getLognormalDensity(double x, double mu, double sigma, double lowerVal, double upperVal); // Lognormal PDF
    	//static double getLognormalCDF(double x, double mu, double sigma);	// Lognormal CDF

    	static void sortedPush(std::vector<int> &cont, int value);
    	static void sortedPush(std::vector<double> &cont, double value);
    	static int indexOf(deque<int> arr, int val);
        static string trim(string str);

    	static void renormaliseParameters();

};



#endif
