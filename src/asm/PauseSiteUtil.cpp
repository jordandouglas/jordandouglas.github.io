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


#include "PauseSiteUtil.h"

#include <fstream>
#include <sstream>
#include <iostream>
#include <string>


using namespace std;


double PauseSiteUtil::TCC_THRESHOLD = 3; // Mean time to catalysis (s) required to classify this as a pause site



void PauseSiteUtil::writeSequenceToFile(string filename, Sequence* seq) {


    if (filename == "") return;

    // Attempt to open up file. Append
    ofstream outputFile;
    outputFile.open(filename, ios_base::app);
    if (!outputFile.is_open()) {
        cout << "Cannot open file " << filename << endl;
        exit(0);
    }
    outputFile.precision(4);
    outputFile.setf(ios::fixed);
    outputFile.setf(ios::showpoint); 

   
    outputFile << ">" << seq->getID() << "\n";
    outputFile << seq->get_complementSequence() << "\n";

   
    outputFile.close();

}




void PauseSiteUtil::writePauseSitesToFile(string filename, Sequence* seq, vector<vector<double>> timesToCatalysis) {


    if (filename == "") return;

    // Attempt to open up file. Append
    ofstream outputFile;
    outputFile.open(filename, ios_base::app);
    if (!outputFile.is_open()) {
        cout << "Cannot open file " << filename << endl;
        exit(0);
    }
    outputFile.precision(4);
    outputFile.setf(ios::fixed);
    outputFile.setf(ios::showpoint); 

   
    outputFile << seq->getID() << "\n";

    for (int i = 0; i < timesToCatalysis.size(); i ++){

        outputFile << timesToCatalysis.at(i).at(2) << "(" << timesToCatalysis.at(i).at(3) << ")";
        if (i < timesToCatalysis.size() - 1) outputFile << ",";
    }

    outputFile << endl;
   
    outputFile.close();

}



void PauseSiteUtil::writePauseSiteToFile(string filename, int nmutsToNoSelectivePressure, double medianPauseSite, double standardError) {


    if (filename == "") return;

    // Attempt to open up file. Append
    ofstream outputFile;
    outputFile.open(filename, ios_base::app);
    if (!outputFile.is_open()) {
        cout << "Cannot open file " << filename << endl;
        exit(0);
    }
    outputFile.precision(4);
    outputFile.setf(ios::fixed);
    outputFile.setf(ios::showpoint); 
    outputFile << nmutsToNoSelectivePressure << ":" << medianPauseSite << "(" << standardError << "),";
    outputFile.close();

}

