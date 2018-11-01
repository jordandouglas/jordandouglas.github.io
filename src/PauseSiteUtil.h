
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


#ifndef PAUSESITEUTIL_H
#define PAUSESITEUTIL_H


#include "Sequence.h"
#include "MultipleSequenceAlignment.h"
#include "Settings.h"


#include <string>
#include <vector>
#include <list>

using namespace std;

// Contains information on a set of experimental observations
class PauseSiteUtil {

    static double TCC_THRESHOLD;


    public:

        // Write the sequence to a file
        static void writeSequenceToFile(string filename, Sequence* seq);

        // Write the pause sites to a file
        static void writePauseSitesToFile(string filename, Sequence* seq, vector<vector<double>> timesToCatalysis);

        // Write this generations pause information to a file
        static void writePauseSiteToFile(string filename, int nmutsToNoSelectivePressure, double medianPauseSite, double standardError);

        // Identify which sites in the selected sequences are pause sites, by comparing to a standard
        static vector<bool>* identifyPauseSites(Sequence* seq, vector<vector<double>> timesToCatalysis);

        // Evidence that each site is a pause site
        static vector<int> calculateEvidence(MultipleSequenceAlignment* MSA);



};

#endif