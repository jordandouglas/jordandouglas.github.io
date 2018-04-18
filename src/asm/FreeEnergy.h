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


#ifndef FREEENERGY_H
#define FREEENERGY_H

#include "State.h"

#include <string>
#include <vector>
#include <list>
#include <map>

using namespace std;


class FreeEnergy{

	private:
		static map<std::string, double> basepairingEnergy;
		static vector<string> getHybridString(State* s);
		static vector<string> getHybridStringOfTranscriptionBubble(int leftmostTemplatePos, int rightmostTemplatePos, int leftmostComplementPos, int rightmostComplementPos);
		static vector<string> getHybridIntermediateString(vector<string> hybridStrings1, vector<string> hybridStrings2, int leftTemplate1, int leftNascent1, int leftTemplate2, int leftNascent2);
		static list<string> getBasePairs(string templateString, string nascentString, int leftT, int leftN);
		static double getHybridFreeEnergy(string templateString, string nascentString, string templateType, string nascentType);
		static double getFreeEnergyOfTranscriptionBubbleHybridString(string templateString, string complementString, string templateType);

	public:
		static double getFreeEnergyOfHybrid(State* s);
		static double getFreeEnergyOfTranscriptionBubble(State* s);
		static double getFreeEnergyOfIntermediateState(State* state1, State* state2);
		static double getFreeEnergyOfTranscriptionBubbleIntermediate(State* state1, State* state2);
		static void init_BP_parameters();

		static void calculateMeanTranslocationEquilibriumConstant(double* results);

};


#endif
