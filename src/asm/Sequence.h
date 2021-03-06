﻿
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


#ifndef SEQUENCE_H
#define SEQUENCE_H

#include "TranslocationRatesCache.h"

#include <random>
#include <string>
#include <list>

using namespace std;

class Sequence{


	string seqID;
	string templateSequence;
	string complementSequence;
	bool nascent_RNA;
	bool template_RNA;
	bool nascent_SS;
	bool template_SS;
	string correctSequence(string seq, bool isRNA);
	TranslocationRatesCache* translocationRatesCache;
	bool rateTableBuilt;
	bool RNAunfoldingTableBuilt;

    // Pauser
    int nsitesMSA;
    string MSAsequence;
    vector<int> known_pauseSites;
    vector<int> simpol_pauseSites;
    vector<int> nbc_pauseSites;
    bool pauser_finished;
    

	public:
		Sequence(string seqID, string TemplateType, string PrimerType, string templateSequence); // Normal sequence (ACGTU only)
        Sequence(string seqID, string MSAsequence); // MSA sequence (gaps allowed)
		string get_templateSequence();
		string get_complementSequence();
		string getID();
        void setID(string id);
		TranslocationRatesCache* getRatesCache();
		void initRateTable();
		void initRNAunfoldingTable();
        int get_nsitesMSA();

		void flagForRateTableRebuilding();
		void flagForUnfoldingTableRebuilding();


		double getMeanTranslocationBarrierHeight();
		bool nascentIsRNA();
		bool nascentIsSS();
		bool templateIsRNA();
		bool templateIsSS();
		string get_templateType();
		string get_primerType();

		string toJSON();
		void print();
        string get_MSAsequence();
        void deconstructRateTable();
        void clear();
        
        
        
        // Pauser
        string set_known_pauseSites(list<int> pauses);
        void set_simpol_pauseSites(list<int> pauses);
        void set_nbc_pauseSites(list<int> pauses);
        vector<int> get_known_pauseSites();
        vector<int> get_simpol_pauseSites();
        vector<int> get_nbc_pauseSites();
        void flag_pauser_finished(bool setTo);

};

#endif