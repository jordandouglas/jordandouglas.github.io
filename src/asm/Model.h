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


#ifndef MODEL_H
#define MODEL_H



#include "Parameter.h"
#include <string>
#include <map>

using namespace std;




class Model{

	string id;
	double modelPrior;
	bool allowBacktracking;
	bool allowHypertranslocation;
	bool allowInactivation;
	bool allowBacktrackWithoutInactivation;
	bool deactivateUponMisincorporation;
	bool allowGeometricCatalysis;
	bool allowmRNAfolding;
	bool allowMisincorporation;
	bool useFourNTPconcentrations;
	bool assumeBindingEquilibrium;
	bool assumeTranslocationEquilibrium;
	string currentTranslocationModel;
	int NTPbindingNParams;
	//bool modelIsActive;

	// Are any parameter values hardcoded when this model is active?
	map<string, double> parameterHardcodings;

	// Some parameters have multiple instances
	map<string, int> parameterInstanceMappings;


	public:

		Model();
		Model* clone();
		string toJSON();
		void print();
		void setID(string id);
		string getID();
		void addParameterHardcoding(string paramID, string value);
		void activateModel();
		void setPriorProb(double val);
		double getPriorProb();
		void addParameterInstanceMapping(string paramID, int instanceNum);
		


		// Model settings
		Model* set_allowBacktracking(bool val);
		bool get_allowBacktracking();
		Model* set_allowHypertranslocation(bool val);
		bool get_allowHypertranslocation();
		Model* set_allowInactivation(bool val);
		bool get_allowInactivation();
		Model* set_allowBacktrackWithoutInactivation(bool val);
		bool get_allowBacktrackWithoutInactivation();
		Model* set_deactivateUponMisincorporation(bool val);
		bool get_deactivateUponMisincorporation();
		Model* set_allowGeometricCatalysis(bool val);
		bool get_allowGeometricCatalysis();
		Model* set_allowmRNAfolding(bool val);
		bool get_allowmRNAfolding();
		Model* set_allowMisincorporation(bool val);
		bool get_allowMisincorporation();
		Model* set_useFourNTPconcentrations(bool val);
		bool get_useFourNTPconcentrations();
		Model* set_assumeBindingEquilibrium(bool val);
		bool get_assumeBindingEquilibrium();
		Model* set_assumeTranslocationEquilibrium(bool val);
		bool get_assumeTranslocationEquilibrium();
		Model* set_currentTranslocationModel(string val);
		string get_currentTranslocationModel();
		Model* set_NTPbindingNParams(int val);
		int get_NTPbindingNParams();



};



#endif