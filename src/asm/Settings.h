
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

#include "Model.h"
#include "ExperimentalData.h"
#include "randomc/randomc.h"
#include "Sequence.h"
#include "Simulator.h"

#include <random>
#include <string>
#include <list>
#include <chrono>
#include <ctime>
#include <thread>


using namespace std;


// Constants
extern const double _RT;
extern const double _kBT;
extern const double _preExp;
extern const double _PI;
extern const int INF;



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


// Command line arguments
extern string inputXMLfilename;
extern string outputFilename;
extern bool isWASM;
extern bool _resumeFromLogfile;

// ABC information
extern string inferenceMethod;
extern int ntrials_abc;
extern int testsPerData;
extern int _testsPerData_preburnin;
extern double _chiSqthreshold_min;
extern double _chiSqthreshold_0;
extern double _chiSqthreshold_gamma;
extern int burnin; // Percentage
extern int logEvery;
extern int N_THREADS;


// Experimental data
extern list<ExperimentalData> experiments;
extern int _numExperimentalObservations;

// Model
extern list<Model> modelsToEstimate;
extern Model* currentModel;


// User interface information
extern bool stop;
extern bool needToReinitiateAnimation;
extern Simulator* interfaceSimulator; // The simulator object being used by the GUI
extern chrono::system_clock::time_point interfaceSimulation_startTime; // The start time of the GUI simulation



// Parameters
extern Parameter *NTPconc;
extern Parameter *ATPconc;
extern Parameter *CTPconc;
extern Parameter *GTPconc;
extern Parameter *UTPconc;
extern Parameter *FAssist;

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





class Settings{

	private:

		// RNG
    	static CRandomMersenne* SFMT;
	

	public:
		static void init();
		static void print();
		static string complementSeq(string orig, bool toRNA);

		static void updateParameterVisibilities();
		static void clearParameterHardcodings();
		static void sampleAll();
		static void sampleModel();
		static void setModel(string modelID);
		static Parameter* getParameterByName(string paramID);
		static vector<Parameter*> paramList;
		static string toJSON();
		static bool setSequence(string seqID);

	

		// Utilities
		static vector<string> split(const std::string& s, char delimiter);
    	static double rexp(double rate);
    	static double runif();
    	static double wrap(double x, double a, double b);
    	static double getNormalDensity(double x, double mu, double sigma, double lowerVal, double upperVal); // Normal PDF
    	static double getNormalCDF(double x, double mu, double sigma);	// Normal CDF
    	//static double getLognormalDensity(double x, double mu, double sigma, double lowerVal, double upperVal); // Lognormal PDF
    	//static double getLognormalCDF(double x, double mu, double sigma);	// Lognormal CDF



};



#endif
