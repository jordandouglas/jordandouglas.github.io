
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


#ifndef EVOLUTION_SIMULATOR_H
#define EVOLUTION_SIMULATOR_H




#include "Sequence.h"

#include <string>
#include <vector>
#include <list>

using namespace std;

// For simulating mutations (natural selection or neutral evolution) in a sequence over time, and checking the pause duration of a site during evolution
class EvolutionSimulator {

    
    static vector<double> getPauseTime(Sequence* seq, int pauseSite);

    public:

       static void simulateEvolution(Sequence* seq, int pauseSite, int nGenerations, int nLineages, double transitionTransversionRatio, string outputFile);
       static void generateSequencesWithPauseSite(double pauseThreshold, int seqLen, int pauseSite, int nattempts, string outputFile);


};
#endif